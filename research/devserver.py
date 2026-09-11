"""开发服务器：多线程 + no-cache 头，避免单线程请求排队导致的加载卡顿。"""
import http.server, sys

class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        super().end_headers()
    def log_message(self, *a):
        pass

if __name__ == '__main__':
    import functools, os
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8932
    root = sys.argv[2] if len(sys.argv) > 2 else os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    handler = functools.partial(H, directory=root)
    server = http.server.ThreadingHTTPServer(('0.0.0.0', port), handler)
    server.serve_forever()
