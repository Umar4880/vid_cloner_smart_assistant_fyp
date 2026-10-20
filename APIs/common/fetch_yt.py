import youtube_transcript_api
print(f"DEBUG: Library location: {youtube_transcript_api.__file__}")

from youtube_transcript_api import YouTubeTranscriptApi
import re

def extract_video_id(url):
    # Regex to find the 11-character video ID
    print('url is ', url)
    pattern = r"(?:v=|\/)([0-9A-Za-z_-]{11}).*"
    match = re.search(pattern, url)
    return match.group(1) if match else None

def get_yt_transcript(url, languages=None):
    video_id = extract_video_id(url)

    if not video_id:
        return "Invalid YouTube URL"

    try:
        # Use an instance and pass languages as a list
        ytt = YouTubeTranscriptApi()
        if languages is None:
            languages = ['ur', 'hi', 'en']

        transcript_list = ytt.fetch(video_id, languages=languages)

        # Get language code if available
        lang = getattr(transcript_list, 'language_code', None)

        # Normalize items: they may be dicts or objects with .text
        segments = []
        for item in transcript_list:
            if isinstance(item, dict):
                segments.append(item.get('text', ''))
            else:
                segments.append(getattr(item, 'text', str(item)))

        full_transcript = ' '.join(segments).strip()
        return full_transcript if full_transcript else f"No transcript found (lang={lang})"

    except Exception as e:
        return f"Error: {str(e)}"

if __name__ == "__main__":
    import argparse
    import os
    from youtube_transcript_api.proxies import WebshareProxyConfig, GenericProxyConfig
    from requests import Session

    parser = argparse.ArgumentParser(description="Test YouTube transcript fetching with optional proxies")
    parser.add_argument("url", nargs="?", default="https://www.youtube.com/watch?v=FuqNluMTIR8", help="YouTube URL to fetch")
    parser.add_argument("--webshare", help="Use Webshare proxy in form username:password", default=os.environ.get("WEBSHARE_CRED"))
    parser.add_argument("--generic-proxy", help="Use generic http/https proxy URLs in form http://user:pass@host:port,https://user:pass@host:port", default=os.environ.get("GENERIC_PROXY"))
    args = parser.parse_args()

    session = None
    if args.webshare:
        userpass = args.webshare.split(":", 1)
        if len(userpass) != 2:
            print("Invalid --webshare value. Expected username:password")
            raise SystemExit(2)
        webshare_cfg = WebshareProxyConfig(proxy_username=userpass[0], proxy_password=userpass[1])
        ytt = YouTubeTranscriptApi(proxy_config=webshare_cfg)
        # Use the ytt instance directly
        try:
            fetched = ytt.fetch(extract_video_id(args.url), languages=["ur", "hi", "en"])
            # Print normalized transcript
            segments = [s.get('text') if isinstance(s, dict) else getattr(s, 'text', str(s)) for s in fetched]
            print("\n".join(segments))
        except Exception as e:
            print(f"Error: {e}")
        raise SystemExit(0)

    if args.generic_proxy:
        # Expect two comma-separated proxies: http,https or single http
        http_proxy, _, https_proxy = (args.generic_proxy + ",").split(",", 2)
        session = Session()
        proxies = {}
        if http_proxy:
            proxies['http'] = http_proxy
        if https_proxy:
            proxies['https'] = https_proxy
        session.proxies.update(proxies)
        ytt = YouTubeTranscriptApi(http_client=session)
        try:
            fetched = ytt.fetch(extract_video_id(args.url), languages=["ur", "hi", "en"])
            segments = [s.get('text') if isinstance(s, dict) else getattr(s, 'text', str(s)) for s in fetched]
            print("\n".join(segments))
        except Exception as e:
            print(f"Error: {e}")
        raise SystemExit(0)

    # No proxy: normal path
    print(get_yt_transcript(args.url))