from src.social_media.media import extract_text_from_image, transcribe_video

def scrape_instagram(client, username, limit=5):
    """Scrapes Instagram posts using apify/instagram-scraper."""
    print(f"Running scraper for Instagram (@{username})...")
    run_input = {
        "directUrls": [f"https://www.instagram.com/{username}/"],
        "resultsLimit": limit,
    }
    
    try:
        run = client.actor("apify/instagram-scraper").call(run_input=run_input)
        run_status = run.get("status")
        if run_status != "SUCCEEDED":
            print(f"⚠️ Warning: Instagram run finished with status '{run_status}'.")
        
        raw_items = list(client.dataset(run.get("defaultDatasetId")).iterate_items())
        print(f"✅ Successfully retrieved {len(raw_items)} posts from Instagram (@{username}).")
        
        processed_posts = []
        import pandas as pd
        for item in raw_items:
            timestamp = item.get("timestamp")
            if timestamp:
                try:
                    dt = pd.to_datetime(timestamp).tz_localize(None)
                    cutoff = pd.Timestamp.now().tz_localize(None) - pd.Timedelta(days=1)
                    if dt < cutoff:
                        print("Reached Instagram post older than 24 hours. Stopping scraper loop.")
                        break
                except Exception:
                    pass

            image_url = item.get("displayUrl")
            video_url = item.get("videoUrl")

            image_text = extract_text_from_image(image_url) if image_url else ""
            video_transcript = transcribe_video(video_url) if video_url else ""

            processed_posts.append({
                "Competitor": username,
                "Platform": "Instagram",
                "Author/Handle": username,
                "Date Created": item.get("timestamp"),
                "Post Text": item.get("caption"),
                "Likes": item.get("likesCount", 0),
                "Comments": item.get("commentsCount", 0),
                "Image URL": image_url or "",
                "Image Text": image_text,
                "Video URL": video_url or "",
                "Video Transcript": video_transcript,
                "Post URL": item.get("url")
            })
        return processed_posts
    except Exception as e:
        print(f"❌ Error scraping Instagram: {str(e)}")
        return []
