from __future__ import annotations

import argparse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from dashboard import DashboardFilters, render_dashboard
from data_source import FixtureDataSource

LOOPBACKS={"127.0.0.1","localhost","::1"}

def assert_loopback(host: str) -> None:
    if host not in LOOPBACKS:
        raise ValueError("A6 repository preview may bind only to loopback")

class Handler(BaseHTTPRequestHandler):
    source: FixtureDataSource
    def do_GET(self):
        parsed=urlparse(self.path)
        if parsed.path not in {"/","/dashboard"}:
            self.send_error(404); return
        q=parse_qs(parsed.query)
        f=DashboardFilters(**{k:(q.get(k,[None])[0] or None) for k in DashboardFilters.__dataclass_fields__})
        body=render_dashboard(self.source.snapshot(),f).encode("utf-8")
        self.send_response(200); self.send_header("Content-Type","text/html; charset=utf-8"); self.send_header("Cache-Control","no-store"); self.send_header("X-Robots-Tag","noindex, nofollow"); self.end_headers(); self.wfile.write(body)
    def _deny(self): self.send_error(405,"A6 dashboard is read-only")
    do_POST=_deny; do_PUT=_deny; do_PATCH=_deny; do_DELETE=_deny
    def log_message(self, format, *args): pass

def main():
    p=argparse.ArgumentParser(); p.add_argument("--host",default="127.0.0.1"); p.add_argument("--port",type=int,default=8765); p.add_argument("--fixture",default=str(Path(__file__).parent/"fixtures"/"dashboard-fixture.json")); args=p.parse_args()
    assert_loopback(args.host)
    Handler.source=FixtureDataSource(args.fixture)
    server=ThreadingHTTPServer((args.host,args.port),Handler)
    print(f"A6 read-only fixture dashboard: http://{args.host}:{args.port}/")
    server.serve_forever()
if __name__=="__main__": main()
