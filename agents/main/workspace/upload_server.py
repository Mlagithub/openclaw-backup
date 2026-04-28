#!/usr/bin/env python3
import http.server
import socketserver
import os

PORT = 8888
UPLOAD_DIR = "/home/one/.openclaw/agents/main/workspace"

class UploadHandler(http.server.SimpleHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        file_data = self.rfile.read(content_length)
        
        filepath = os.path.join(UPLOAD_DIR, 'photo_from_phone.jpg')
        with open(filepath, 'wb') as f:
            f.write(file_data)
        
        self.send_response(200)
        self.send_header('Content-type', 'text/plain')
        self.end_headers()
        self.wfile.write(b'OK')
        print(f"File saved: {filepath}", flush=True)

with socketserver.TCPServer(("", PORT), UploadHandler) as httpd:
    print(f"Server listening on port {PORT}", flush=True)
    httpd.handle_request()