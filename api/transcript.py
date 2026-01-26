from http.server import BaseHTTPRequestHandler
import json
import yt_dlp
from urllib.parse import parse_qs, urlparse

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        query = parse_qs(urlparse(self.path).query)
        video_id = query.get('v', [None])[0]

        if not video_id:
            self.send_response(400)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': 'Missing video id'}).encode())
            return

        ydl_opts = {
            'dump_single_json': True,
            'quiet': True,
            'no_warnings': True,
        }

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(f"https://www.youtube.com/watch?v={video_id}", download=False)
                
                subtitles = info.get('automatic_captions', {}) or info.get('subtitles', {})
                en_subs = subtitles.get('en') or subtitles.get('en-orig') or subtitles.get('en-US')
                
                if not en_subs:
                     raise Exception("No English subtitles found")

                # Prefer json3
                sub_track = next((s for s in en_subs if s['ext'] == 'json3'), en_subs[0])
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({
                    'ext': sub_track['ext'],
                    'url': sub_track['url']
                }).encode())

        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(e)}).encode())
