#!/usr/bin/env python3
"""Dev server for TradeLab: python serve.py [port]

Same as `python -m http.server` but sends Cache-Control: no-store so the
browser never serves stale JS/CSS while you edit. Production hosting
(GitHub Pages etc.) sets proper cache headers on its own.
"""
import sys
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def handle_one_request(self):
        # The browser opens several sockets for the page's ~10 scripts and drops
        # them as soon as it has what it needs. On Windows those aborts surface as
        # ConnectionAbortedError/ConnectionResetError and would otherwise print a
        # traceback per request; they are normal, so swallow them.
        try:
            super().handle_one_request()
        except (ConnectionAbortedError, ConnectionResetError, BrokenPipeError):
            self.close_connection = True

    def log_message(self, fmt, *args):
        sys.stderr.write('%s %s\n' % (self.log_date_time_string(), fmt % args))


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 4173
    print(f'TradeLab dev server: http://127.0.0.1:{port} (Ctrl+C to stop)')
    # Threading: a single-threaded HTTPServer serialises requests, so the parallel
    # script loads on first paint stall and time out.
    ThreadingHTTPServer(('127.0.0.1', port), NoCacheHandler).serve_forever()
