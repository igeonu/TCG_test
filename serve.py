"""Rune Duel 개발 서버 : game/ 폴더를 캐시 없이(no-store) 제공합니다.
수정한 JS·CSS가 새로고침만으로 바로 반영되도록 브라우저 캐시를 끕니다.
사용법 : python serve.py [포트]   (기본 5173)
"""
import functools, http.server, os, sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 5173
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'game')


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, max-age=0')
        super().end_headers()


if __name__ == '__main__':
    handler = functools.partial(NoCacheHandler, directory=ROOT)
    with http.server.ThreadingHTTPServer(('127.0.0.1', PORT), handler) as httpd:
        print(f'Serving HTTP on http://localhost:{PORT}/ (no-cache)', flush=True)
        httpd.serve_forever()
