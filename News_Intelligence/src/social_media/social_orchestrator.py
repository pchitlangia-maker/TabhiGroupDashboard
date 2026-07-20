import os
import sys
import pandas as pd
from apify_client import ApifyClient
from dotenv import load_dotenv
from openai import OpenAI

# Add src parent folder to python path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# 1. Load environment variables FIRST to ensure API keys are populated
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), ".env"))

from config.settings import BASE_DIR
from src.utils import logger

# 2. Initialize OpenAI client directly
openai_client = OpenAI(
    base_url=os.getenv("OLLAMA_BASE_URL", "https://ollama.com/v1"),
    api_key=os.getenv("OLLAMA_API_KEY")
)
llm_model = os.getenv("MODEL_NAME", "gpt-oss:20b-cloud")

# Import platform scrapers
from src.social_media.x_scraper import scrape_x
from src.social_media.instagram_scraper import scrape_instagram
from src.social_media.linkedin_scraper import scrape_linkedin
from src.social_media.youtube_scraper import scrape_youtube

# Import LLM insights engine
from src.social_media.insights_engine import analyze_post_with_llm, analyze_video_with_llm

# Config Paths
COMPETITORS_EXCEL_PATH = os.path.join(BASE_DIR, "input", "competitors.xlsx")
RUBRIC_EXCEL_PATH = os.path.join(BASE_DIR, "config", "scoring_rubric.xlsx")
OUTPUT_EXCEL_PATH = os.path.join(os.path.dirname(BASE_DIR), "News_Dashboard", "data", "social_media_posts.xlsx")

APIFY_API_TOKEN = os.getenv("APIFY_API_KEY") or "apify_api_VJxWA3U9RTuHIkQWlAcnK9sxWyXvmo1TubK1"
# Target handles map
COMPETITOR_HANDLES = {
    "Navan": {
        "x": "navan", "instagram": "getnavan", "linkedin": "navan", "youtube": "GetNavan"
    },
    "TravelPerk": {
        "x": "perkdotcom", "instagram": "perkdotcom", "linkedin": "travelperk", "youtube": "perk.global"
    },
    "SAP Concur": {
        "x": "SAPConcur", "instagram": "sapconcur", "linkedin": "sap-concur", "youtube": "SAPConcur"
    },
    "Ramp": {
        "x": "tryramp", "instagram": "tryramp", "linkedin": "ramp-card", "youtube": "Ramp"
    },
    "Brex": {
        "x": "brexhq", "instagram": "brex", "linkedin": "brex", "youtube": "BrexHQ"
    },
    "AirBnb": {
        "x": "Airbnb", "instagram": "airbnb", "linkedin": "airbnb", "youtube": "Airbnb"
    },
    "TripGenie": {
        "x": "Tripcom", "instagram": "trip", "linkedin": "trip.com", "youtube": "Trip.com"
    },
    "Expedia": {
        "x": "Expedia", "instagram": "expedia", "linkedin": "expedia", "youtube": "Expedia"
    },
    "Booking.com": {
        "x": "bookingcom", "instagram": "bookingcom", "linkedin": "booking.com", "youtube": "bookingcom"
    },
    "Centrav": {
        "x": "Centrav", "instagram": "centrav", "linkedin": "centrav-inc-", "youtube": "Centrav"
    },
    "Picasso Travel": {
        "x": "PicassoTravel", "instagram": "picassotravel", "linkedin": "picasso-travel", "youtube": None
    },
    "Sky Bird Travel": {
        "x": "SkyBirdTravel", "instagram": "skybirdtravel", "linkedin": "sky-bird-travel-&-tours", "youtube": None
    },
    "GTT Global": {
        "x": "GTTGlobal", "instagram": None, "linkedin": "gttglobal", "youtube": None
    },
    "Downtown Travel": {
        "x": "DowntownTravel", "instagram": None, "linkedin": "downtown-travel", "youtube": None
    },
    "Expedia TAAP": {
        "x": "ExpediaGroup", "instagram": None, "linkedin": "expediataap", "youtube": None
    },
    "Booking.com for Travel Agents": {
        "x": "bookingcom", "instagram": None, "linkedin": "booking-com-partner-services", "youtube": None
    },
    "Priceline Partner Network": {
        "x": "priceline", "instagram": None, "linkedin": "priceline-partner-network", "youtube": None
    }
}

def run_social_pipeline():
    logger.info("=========================================")
    logger.info("Starting Competitor Social Media Pipeline")
    logger.info("=========================================")
    
    # 1. Load Dynamic Categories
    logger.info(f"Loading dynamic categories from '{RUBRIC_EXCEL_PATH}'...")
    try:
        df_rubric = pd.read_excel(RUBRIC_EXCEL_PATH, sheet_name="Category_Weights")
        categories_list = df_rubric["Category"].dropna().str.strip().tolist()
        logger.info(f"Loaded {len(categories_list)} categories: {categories_list}")
    except Exception as e:
        logger.error(f"Error reading scoring_rubric.xlsx: {str(e)}")
        return

    # 2. Load Competitors List
    logger.info(f"Loading competitors configuration from '{COMPETITORS_EXCEL_PATH}'...")
    try:
        df_competitors = pd.read_excel(COMPETITORS_EXCEL_PATH, sheet_name="Competitors")
        logger.info(f"Loaded {len(df_competitors)} competitors.")
    except Exception as e:
        logger.error(f"Error reading competitors.xlsx: {str(e)}")
        return

    apify_client = ApifyClient(APIFY_API_TOKEN)
    logger.info(f"🤖 Using active LLM connection with model {llm_model}...")

    limit_per_platform = 5
    combined_posts = []

    def is_within_24_hours(date_str):
        if not date_str:
            return False
        try:
            post_dt = pd.to_datetime(date_str).tz_localize(None)
            cutoff = pd.Timestamp.now().tz_localize(None) - pd.Timedelta(days=1)
            return post_dt >= cutoff
        except Exception:
            return True  # Fallback to True to avoid skipping in case of parsing errors

    # 3. Iterate and Scrape
    for idx, row in df_competitors.iterrows():
        competitor_name = row["Competitor"]
        base_company = row["Base"]
        
        logger.info(f"Processing Competitor [{competitor_name}] competing with [{base_company}]")
        
        handles = COMPETITOR_HANDLES.get(competitor_name)
        if not handles:
            logger.warn(f"Handles not configured for '{competitor_name}'. Skipping.")
            continue
            
        try:
            raw_posts = []
            
            # Scrape X/Twitter
            if handles.get("x"):
                x_posts = scrape_x(apify_client, username=handles["x"], limit=limit_per_platform)
                for p in x_posts:
                    p["Platform"] = "X (Twitter)"
                    raw_posts.append(p)
                    
            # Scrape Instagram
            if handles.get("instagram"):
                insta_posts = scrape_instagram(apify_client, username=handles["instagram"], limit=limit_per_platform)
                for p in insta_posts:
                    p["Platform"] = "Instagram"
                    raw_posts.append(p)
                    
            # Scrape LinkedIn
            if handles.get("linkedin"):
                linkedin_url = f"https://www.linkedin.com/company/{handles['linkedin']}"
                li_posts = scrape_linkedin(apify_client, company_url=linkedin_url, limit=limit_per_platform)
                for p in li_posts:
                    p["Platform"] = "LinkedIn"
                    raw_posts.append(p)
                    
            # Scrape YouTube
            if handles.get("youtube"):
                yt_videos = scrape_youtube(apify_client, channel_handle=handles["youtube"], limit=limit_per_platform)
                for p in yt_videos:
                    p["Platform"] = "YouTube"
                    raw_posts.append(p)
                    
            # Filter posts for past 24 hours
            filtered_raw_posts = []
            for post in raw_posts:
                date_str = post.get("Date Created") or post.get("timestamp") or post.get("date")
                if is_within_24_hours(date_str):
                    filtered_raw_posts.append(post)
            
            logger.info(f"Filtered down to {len(filtered_raw_posts)} posts from the last 24 hours (originally {len(raw_posts)}).")
            
            # LLM Insights Engine
            if filtered_raw_posts:
                logger.info(f"Generating LLM Insights for {competitor_name} ({len(filtered_raw_posts)} entries)...")
                for post in filtered_raw_posts:
                    platform = post["Platform"]
                    post_text = post.get("Post Text") or ""
                    image_url = post.get("Image URL") or ""
                    image_text = post.get("Image Text") or ""
                    video_url = post.get("Video URL") or ""
                    
                    if platform == "YouTube":
                        video_title = post_text.split("\n\n")[0]
                        ai_insights = analyze_video_with_llm(
                            openai_client=openai_client,
                            model_name=llm_model,
                            video_url=video_url,
                            video_title=video_title,
                            categories_list=categories_list
                        )
                        video_transcript = ai_insights.get("transcript", "")
                    else:
                        video_transcript = post.get("Video Transcript") or ""
                        ai_insights = analyze_post_with_llm(
                            openai_client=openai_client,
                            model_name=llm_model,
                            platform=platform,
                            competitor=competitor_name,
                            post_text=post_text,
                            image_text=image_text,
                            video_transcript=video_transcript,
                            categories_list=categories_list
                        )

                    # Consolidate standard structure
                    combined_posts.append({
                        "Base_Company": base_company,
                        "Competitor": competitor_name,
                        "Platform": platform,
                        "Author/Handle": post.get("Author/Handle") or "",
                        "Date Created": post.get("Date Created") or post.get("timestamp") or "",
                        "Post Text": post_text,
                        "Image URL": image_url,
                        "Image Text": image_text,
                        "Video URL": video_url,
                        "Video Transcript": video_transcript,
                        "Post URL": post.get("Post URL") or "",
                        "Sentiment": ai_insights.get("sentiment", "Neutral"),
                        "Category": ai_insights.get("category", "General Industry News"),
                        "Alert Level": ai_insights.get("alert_level", "Low"),
                        "AI Summary": ai_insights.get("summary", "Failed to analyze post.")
                    })
        except Exception as e:
            logger.error(f"❌ Error processing competitor '{competitor_name}': {str(e)}")

    # 4. Save results to Excel sheet
    logger.info(f"Writing results to '{OUTPUT_EXCEL_PATH}'...")
    write_to_excel_safe(OUTPUT_EXCEL_PATH, combined_posts)

def write_to_excel_safe(output_file, combined_data):
    if not combined_data:
        logger.warn("⚠️ Warning: No new social media posts were fetched in this run. Bypassing write to protect existing data!")
        return
    try:
        # 1. Load existing data if file exists
        if os.path.exists(output_file):
            try:
                df_existing = pd.read_excel(output_file, sheet_name="Social_Media_Insights")
                existing_keys = set(df_existing["Post URL"].dropna().astype(str).str.strip().tolist())
            except Exception:
                df_existing = pd.DataFrame()
                existing_keys = set()
        else:
            df_existing = pd.DataFrame()
            existing_keys = set()

        # 2. Filter out duplicates based on Post URL
        new_unique_data = []
        for item in combined_data:
            post_url = str(item.get("Post URL", "")).strip()
            if not post_url or post_url not in existing_keys:
                new_unique_data.append(item)
                if post_url:
                    existing_keys.add(post_url)
        
        if not new_unique_data:
            logger.info("ℹ️ All fetched posts are already present in the database. No new records to append.")
            return

        # 3. Concatenate and save
        df_new = pd.DataFrame(new_unique_data)
        df_final = pd.concat([df_existing, df_new], ignore_index=True)
        
        desired_columns = [
            "Base_Company", "Competitor", "Platform", "Author/Handle", "Date Created",
            "Post Text", "Image URL", "Image Text", "Video URL", "Video Transcript",
            "Post URL", "Sentiment", "Category", "Alert Level", "AI Summary"
        ]
        df_final = df_final.reindex(columns=desired_columns)
        
        with pd.ExcelWriter(output_file, engine="openpyxl") as writer:
            df_final.to_excel(writer, sheet_name="Social_Media_Insights", index=False)
            logger.info(f"Successfully appended {len(new_unique_data)} new rows to sheet: Social_Media_Insights (Total rows: {len(df_final)})")
        logger.info("Competitor Social Media Pipeline completed successfully.")
    except PermissionError:
        fallback_file = output_file.replace(".xlsx", "_new.xlsx")
        logger.warn(f"Permission denied writing to '{output_file}'. Writing to fallback: '{fallback_file}'")
        write_to_excel_safe(fallback_file, combined_data)
    except Exception as e:
        logger.error(f"Error writing to Excel file: {str(e)}")

if __name__ == "__main__":
    run_social_pipeline()
