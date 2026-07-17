from src.social_media.media import extract_text_from_image, transcribe_video

def scrape_linkedin(client, company_url, limit=5):
    """Scrapes LinkedIn company posts using harvestapi/linkedin-company-posts."""
    competitor_name = company_url.split("/company/")[-1].strip("/")
    print(f"Running scraper for LinkedIn ({competitor_name})...")
    
    run_input = {
        "targetUrls": [company_url],
        "maxPosts": limit,
    }
    
    try:
        run = client.actor("harvestapi/linkedin-company-posts").call(run_input=run_input)
        run_status = run.get("status")
        if run_status != "SUCCEEDED":
            print(f"⚠️ Warning: LinkedIn run finished with status '{run_status}'.")
        
        raw_items = list(client.dataset(run.get("defaultDatasetId")).iterate_items())
        print(f"✅ Successfully retrieved {len(raw_items)} posts from LinkedIn ({competitor_name}).")
        
        processed_posts = []
        import pandas as pd
        for item in raw_items:
            posted_at = item.get("postedAt", {})
            date_created = posted_at.get("date") or item.get("date")
            if date_created:
                try:
                    dt = pd.to_datetime(date_created).tz_localize(None)
                    cutoff = pd.Timestamp.now().tz_localize(None) - pd.Timedelta(days=1)
                    if dt < cutoff:
                        print("Reached LinkedIn post older than 24 hours. Stopping scraper loop.")
                        break
                except Exception:
                    pass

            author = item.get("author", {}).get("name") or competitor_name
            
            engagement = item.get("engagement", {})
            likes = engagement.get("likes") or item.get("likesCount") or 0
            comments = engagement.get("comments") or item.get("commentsCount") or 0
            shares = engagement.get("shares") or 0
            
            posted_at = item.get("postedAt", {})
            date_created = posted_at.get("date") or item.get("date")
            
            url = item.get("linkedinUrl") or item.get("socialContent", {}).get("shareUrl") or item.get("url")
            text = item.get("content") or item.get("text") or "[No Text]"
            
            # Extract images
            image_url = None
            images_list = item.get("postImages", [])
            if images_list and isinstance(images_list, list):
                first_img = images_list[0]
                if isinstance(first_img, dict):
                    image_url = first_img.get("url")
                elif isinstance(first_img, str):
                    image_url = first_img
                    
            # Extract videos
            video_url = item.get("postVideo", {}).get("videoUrl") if isinstance(item.get("postVideo"), dict) else None

            image_text = extract_text_from_image(image_url) if image_url else ""
            video_transcript = transcribe_video(video_url) if video_url else ""

            processed_posts.append({
                "Competitor": competitor_name,
                "Platform": "LinkedIn",
                "Author/Handle": author,
                "Date Created": date_created,
                "Post Text": text,
                "Likes": likes,
                "Comments": comments,
                "Shares": shares,
                "Image URL": image_url or "",
                "Image Text": image_text,
                "Video URL": video_url or "",
                "Video Transcript": video_transcript,
                "Post URL": url
            })
        return processed_posts
    except Exception as e:
        print(f"❌ Error scraping LinkedIn: {str(e)}")
        return []
