from http.server import BaseHTTPRequestHandler, HTTPServer
import json

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps({
            "workload": "lift-and-shift",
            "status": "ok",
            "path": self.path
        }).encode())

if __name__ == "__main__":
    HTTPServer(("0.0.0.0", 3000), Handler).serve_forever()