import os
import sys
from datetime import datetime, timedelta

# Add project root to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config.settings import BASE_DIR
from src.utils import logger, initialize_directories, is_within_past_months, resolve_google_news_url
from src.excel_handler import (
    load_rss_feeds, load_search_queries, load_competitor_brands, read_existing_urls, append_news_articles
)
from src.rss_reader import aggregate_all_feeds
from src.keyword_matcher import KeywordMatcher
from src.deduplicator import Deduplicator
from src.article_scraper import scrape_articles_parallel
from src.ai_placeholders import ExecutiveSummaryGenerator

def run_pipeline():
    logger.info("=========================================")
    logger.info("Starting News Intelligence Data Pipeline")
    logger.info("=========================================")
    
    # 1. Initialize Directories
    initialize_directories(BASE_DIR)
    
    # 2. Load Inputs
    feeds = load_rss_feeds()  # Static RSS feeds (Skift, etc.)
    queries = load_search_queries()  # Competitor queries mapping
    brand_map = load_competitor_brands()  # Competitor brand mapping
    if not queries:
        logger.error("No competitor search queries loaded. Exiting pipeline.")
        return
        
    # Calculate start date for 24 hours cutoff
    cutoff_date = datetime.now() - timedelta(days=1)
    cutoff_date_str = cutoff_date.strftime("%Y-%m-%d")
    logger.info(f"Targeting competitor news published after: {cutoff_date_str}")
    
    # 3. Dynamically generate Google News Search RSS feeds for all competitor queries
    import urllib.parse
    dynamic_feeds = []
    feed_id_counter = len(feeds) + 1
    
    for competitor, q_list in queries.items():
        for query_item, q_type in q_list:
            # Construct Google News RSS query with date filter
            # Format: "Query string" after:YYYY-MM-DD
            gnews_query = f'"{query_item}" after:{cutoff_date_str}'
            encoded_query = urllib.parse.quote(gnews_query)
            rss_url = f"https://news.google.com/rss/search?q={encoded_query}&hl=en-US&gl=US&ceid=US:en"
            
            dynamic_feeds.append({
                "Feed_ID": feed_id_counter,
                "Feed_Name": f"Google News Search - {competitor} ({query_item})",
                "RSS_URL": rss_url,
                "Category": "Travel Search",
                "Active": "Yes"
            })
            feed_id_counter += 1
            
    logger.info(f"Generated {len(dynamic_feeds)} dynamic Google News RSS feeds for competitor queries.")
    
    # Combine static and dynamic feeds
    all_feeds = feeds + dynamic_feeds
    
    # 4. Aggregate all RSS articles
    all_raw_articles = aggregate_all_feeds(all_feeds)
    total_found = len(all_raw_articles)
    if total_found == 0:
        logger.info("No articles found in any RSS feeds. Pipeline completed.")
        return
        
    # Apply date filtering: Keep articles from the past 24 hours only
    def is_within_past_24_hours(date_val_str):
        if not date_val_str:
            return False
        try:
            dt = datetime.strptime(date_val_str, "%Y-%m-%d %H:%M:%S")
            return dt >= cutoff_date
        except Exception:
            return True  # Fallback to True so we don't accidentally skip in case of parsing errors
            
    filtered_articles = [art for art in all_raw_articles if is_within_past_24_hours(art["Published_Date"])]
    total_filtered = len(filtered_articles)
    logger.info(f"Filtered {total_filtered} articles within past 24 hours from {total_found} total raw articles.")
    
    if total_filtered == 0:
        logger.info("No articles found within the 24-hour window. Pipeline completed.")
        return
        
    # 5. Competitor Matching / Filtering
    logger.info("Running competitor keyword matching...")
    matcher = KeywordMatcher(queries)
    
    # Normalize keys in brand map to lowercase for case-insensitive lookup
    normalized_brand_map = {k.lower(): v for k, v in brand_map.items()}
    
    matched_articles = []
    for art in filtered_articles:
        comp, queries_matched = matcher.match_article(art["Title"], art["Summary"])
        if comp:
            # Create a copy and inject competitor metadata
            matched_art = art.copy()
            matched_art["Competitor"] = comp
            matched_art["Matched_Query"] = queries_matched
            
            # Resolve Google News redirect URL BEFORE deduplication
            raw_url = matched_art.get("Article_URL", "")
            if raw_url and "news.google.com" in raw_url:
                try:
                    resolved_url = resolve_google_news_url(raw_url)
                    if resolved_url:
                        matched_art["Article_URL"] = resolved_url
                except Exception as e:
                    logger.debug(f"Failed to resolve URL {raw_url} during pre-dedup: {e}")
            
            # Map competitor names to their respective target brands (Base)
            comps_list = [c.strip() for c in comp.split(",")]
            matched_brands = []
            for c in comps_list:
                brand = normalized_brand_map.get(c.lower())
                if brand and brand not in matched_brands:
                    matched_brands.append(brand)
            # Default fallback to Miraee if somehow no brand matches
            target_brand_str = ", ".join(matched_brands) if matched_brands else "Miraee"
            matched_art["Target_Brand"] = target_brand_str
            
            matched_articles.append(matched_art)
            
    total_matched = len(matched_articles)
    logger.info(f"Matched {total_matched} articles out of {total_filtered} filtered articles.")
    
    if total_matched == 0:
        logger.info("No articles matched competitor criteria. Pipeline completed.")
        return
        
    # 6. Deduplication
    existing_urls = read_existing_urls()
    dedup = Deduplicator(existing_urls)
    
    new_articles = dedup.filter_new_articles(matched_articles)
    total_new = len(new_articles)
    total_skipped = total_matched - total_new
    
    logger.info(f"New unique articles to scrape: {total_new} (Skipped duplicates: {total_skipped})")
    
    if total_new == 0:
        logger.info("No new unique articles to scrape in this run. Pipeline completed.")
        return
        
    # 7. Scraping Full Article Content
    scraped_articles = scrape_articles_parallel(new_articles)
    
    # 8. Enrich with AI Features (Topic, Sentiment, Threat Level, Actions, Summary)
    logger.info("Enriching articles with AI intelligence classification...")
    summary_gen = ExecutiveSummaryGenerator()
    
    enriched_articles = []
    for art in scraped_articles:
        body = art.get("News_Body", "")
        title = art.get("Title", "")
        comp = art.get("Competitor", "")
        

        
        # 2. Sentiment (Left blank for LLM to fill)
        art["Sentiment"] = ""
        

        
        # 4. Executive Summary of Article
        summary = summary_gen.generate_article_summary(title, body)
        art["Executive_Summary"] = summary
        
        # 5. Default Scoring (Rubrics logic removed)
        art["Criticality_Score"] = 0
        art["Priority_Tier"] = "Tier 4 - Low"
        
        enriched_articles.append(art)
        
    # 9. Write to Excel Database
    append_news_articles(enriched_articles)

    # Summary Log
    logger.info("=========================================")
    logger.info("Pipeline Run Summary:")
    logger.info(f" - Static Feeds: {len(feeds)}, Dynamic Feeds: {len(dynamic_feeds)}")
    logger.info(f" - Total Raw Articles Found: {total_found}")
    logger.info(f" - 24-Hour Filtered Articles: {total_filtered}")
    logger.info(f" - Articles Matched Competitors: {total_matched}")
    logger.info(f" - Articles Skipped (Duplicates): {total_skipped}")
    logger.info(f" - Articles Enriched & Appended: {len(enriched_articles)}")
    logger.info("Pipeline completed successfully.")
    logger.info("=========================================")

if __name__ == "__main__":
    run_pipeline()

