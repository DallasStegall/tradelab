#!/usr/bin/env python3
"""Dev server for TradeLab: python serve.py [port]

Same as `python -m http.server` but sends Cache-Control: no-store so the
browser never serves stale JS/CSS while you edit. Production hosting
(GitHub Pages etc.) sets proper cache headers on its own.
"""
import sys
from http.server import HTTPServer, SimpleHTTPRequestHandler


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 4173
    print(f'TradeLab dev server: http://127.0.0.1:{port} (Ctrl+C to stop)')
    HTTPServer(('127.0.0.1', port), NoCacheHandler).serve_forever()
