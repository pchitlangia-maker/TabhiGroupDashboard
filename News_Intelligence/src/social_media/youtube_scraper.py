def scrape_youtube(client, channel_handle, limit=5):
    """Scrapes YouTube video metadata and links from a channel using streamers/youtube-scraper."""
    clean_handle = channel_handle if channel_handle.startswith("@") else f"@{channel_handle}"
    channel_url = f"https://www.youtube.com/{clean_handle}/videos"
    print(f"Running scraper for YouTube ({clean_handle})...")
    
    run_input = {
        "startUrls": [{"url": channel_url}],
        "maxResults": limit,
        "maxResultsShorts": 0,
        "maxResultStreams": 0,
    }
    
    try:
        run = client.actor("streamers/youtube-scraper").call(run_input=run_input)
        run_status = run.get("status")
        if run_status != "SUCCEEDED":
            print(f"⚠️ Warning: YouTube run finished with status '{run_status}'.")
        
        raw_items = list(client.dataset(run.get("defaultDatasetId")).iterate_items())
        print(f"✅ Successfully retrieved {len(raw_items)} videos from YouTube ({clean_handle}).")
        
        processed_videos = []
        import pandas as pd
        for item in raw_items:
            date_created = item.get("date") or item.get("uploadedAt")
            if date_created:
                try:
                    dt = pd.to_datetime(date_created).tz_localize(None)
                    cutoff = pd.Timestamp.now().tz_localize(None) - pd.Timedelta(days=1)
                    if dt < cutoff:
                        print("Reached YouTube video older than 24 hours. Stopping scraper loop.")
                        break
                except Exception:
                    pass

            processed_videos.append({
                "Competitor": channel_handle,
                "Platform": "YouTube",
                "Author/Handle": item.get("channelName") or clean_handle,
                "Date Created": item.get("date") or item.get("uploadedAt"),
                "Post Text": item.get("title", "") + "\n\n" + item.get("description", ""),
                "Likes": item.get("likes") or item.get("likeCount") or 0,
                "Views": item.get("viewCount") or 0,
                "Comments": item.get("commentsCount") or 0,
                "Video URL": item.get("url") or "",
                "Post URL": item.get("url") or ""
            })
        return processed_videos
    except Exception as e:
        print(f"❌ Error scraping YouTube: {str(e)}")
        return []
