from datetime import datetime, timedelta
from src.social_media.media import extract_text_from_image, transcribe_video

def scrape_x(client, username, limit=5):
    """Scrapes Twitter/X posts using kaitoeasyapi/twitter-x-data-tweet-scraper-pay-per-result-cheapest."""
    print(f"Running scraper for X (@{username})...")
    yesterday = datetime.now() - timedelta(days=1)
    since_date = yesterday.strftime("%Y-%m-%d")
    run_input = {
        "searchTerms": [f"from:{username} since:{since_date}"],
        "maxItems": limit,
    }
    
    try:
        run = client.actor("kaitoeasyapi/twitter-x-data-tweet-scraper-pay-per-result-cheapest").call(run_input=run_input)
        run_status = run.get("status")
        if run_status != "SUCCEEDED":
            print(f"⚠️ Warning: X run finished with status '{run_status}'.")
        
        raw_items = list(client.dataset(run.get("defaultDatasetId")).iterate_items())
        print(f"✅ Successfully retrieved {len(raw_items)} posts from X (@{username}).")
        
        processed_posts = []
        for item in raw_items:
            media_list = item.get("media", [])
            image_url = None
            video_url = None
            for m in media_list:
                if isinstance(m, dict):
                    if m.get("type") == "photo" and not image_url:
                        image_url = m.get("media_url_https") or m.get("media_url")
                    elif m.get("type") in ["video", "animated_gif"] and not video_url:
                        variants = m.get("video_info", {}).get("variants", [])
                        mp4_variants = [v for v in variants if v.get("content_type") == "video/mp4"]
                        if mp4_variants:
                            video_url = max(mp4_variants, key=lambda x: x.get("bitrate", 0)).get("url")

            image_text = extract_text_from_image(image_url) if image_url else ""
            video_transcript = transcribe_video(video_url) if video_url else ""

            processed_posts.append({
                "Competitor": username,
                "Platform": "X (Twitter)",
                "Author/Handle": item.get("twitter-handle") or item.get("username") or username,
                "Date Created": item.get("createdAt") or item.get("date"),
                "Post Text": item.get("fullText") or item.get("text"),
                "Likes": item.get("likeCount") or item.get("favoriteCount") or 0,
                "Retweets/Reposts": item.get("retweetCount") or 0,
                "Replies": item.get("replyCount") or 0,
                "Image URL": image_url or "",
                "Image Text": image_text,
                "Video URL": video_url or "",
                "Video Transcript": video_transcript,
                "Post URL": item.get("url") or item.get("link")
            })
        return processed_posts
    except Exception as e:
        print(f"❌ Error scraping X: {str(e)}")
        return []
