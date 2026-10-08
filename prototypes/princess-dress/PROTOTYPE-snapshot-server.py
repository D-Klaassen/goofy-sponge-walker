import http.server,base64,json,os
class H(http.server.SimpleHTTPRequestHandler):
    def do_POST(self):
        d=json.loads(self.rfile.read(int(self.headers['Content-Length'])))
        open(os.path.join('shots',d['name']),'wb').write(base64.b64decode(d['data'].split(',')[1]))
        self.send_response(200);self.send_header('Access-Control-Allow-Origin','*');self.end_headers();self.wfile.write(b'ok')
    def do_OPTIONS(self):
        self.send_response(200);self.send_header('Access-Control-Allow-Origin','*');self.send_header('Access-Control-Allow-Headers','*');self.end_headers()
os.makedirs('shots',exist_ok=True)
http.server.ThreadingHTTPServer(('127.0.0.1',8791),H).serve_forever()
