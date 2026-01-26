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
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(f"https://www.youtube.com/watch?v={video_id}", download=False)
            
            subtitles = info.get('automatic_captions', {}) or info.get('subtitles', {})
            en_subs = subtitles.get('en') or subtitles.get('en-orig') or subtitles.get('en-US')
            
            if not en_subs:
                 raise Exception("No English subtitles found")

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
