const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8765;
const ROOT = 'f:/Gravity-Projects/Yesil-Panel';

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.json': 'application/json'
};

const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];
  let filePath = path.join(ROOT, urlPath === '/' ? 'index.html' : urlPath);
  
  // Security check to prevent directory traversal
  if (!filePath.startsWith(path.normalize(ROOT))) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'text/plain';

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }

    res.writeHead(200, { 
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*' 
    });
    
    const stream = fs.createReadStream(filePath);
    stream.on('error', (streamErr) => {
      console.error('Stream error:', streamErr);
      if (!res.headersSent) {
        res.writeHead(500);
        res.end('Internal Server Error');
      } else {
        res.end();
      }
    });
    stream.pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
