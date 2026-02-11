import json
import yt_dlp
from urllib.parse import parse_qs, urlparse

def handler(request):
    query = parse_qs(urlparse(request.path).query)
    video_id = query.get('v', [None])[0]

    if not video_id:
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'Missing video id'}),
            'headers': {'Content-Type': 'application/json'}
        }

    ydl_opts = {
        'dump_single_json': True,
        'quiet': True,
        'no_warnings': True,
        'no_check_certificate': True,
        'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'referer': 'https://www.youtube.com/',
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(f"https://www.youtube.com/watch?v={video_id}", download=False)
            
            subtitles = info.get('automatic_captions', {}) or info.get('subtitles', {})
            
            # Find any English-related key
            en_keys = [k for k in subtitles.keys() if k.startswith('en')]
            en_subs = None
            for key in en_keys:
                en_subs = subtitles.get(key)
                if en_subs:
                    break
            
            if not en_subs:
                 # Fallback to any available if no English
                 if subtitles:
                     en_subs = next(iter(subtitles.values()))
                 else:
                     raise Exception("No subtitles found at all")

            # Prefer json3
            sub_track = next((s for s in en_subs if s.get('ext') == 'json3'), en_subs[0])
            
            return {
                'statusCode': 200,
                'body': json.dumps({
                    'ext': sub_track.get('ext'),
                    'url': sub_track.get('url')
                }),
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            }

    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)}),
            'headers': {'Content-Type': 'application/json'}
        }
