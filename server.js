const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

function readData() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8') || '[]'); }
  catch { return []; }
}
function writeData(arr) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(arr, null, 2));
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function serveFile(req, res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const type = MIME[ext] || 'application/octet-stream';
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': type });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  if (req.method === 'POST' && req.url === '/submit') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const record = JSON.parse(body);
        const entries = readData();
        record.time = record.time || new Date().toISOString();
        entries.push(record);
        writeData(entries);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, total: entries.length }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
    return;
  }

  if (req.method === 'GET' && req.url === '/data') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(readData()));
    return;
  }

  if (req.method === 'DELETE' && req.url === '/data') {
    writeData([]);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (req.method === 'POST' && req.url === '/capture') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const record = JSON.parse(body);
        const entries = readData();
        // Find existing user record or create new one
        const existingIdx = entries.findIndex(e => e.email === record.email && e.name === record.name);
        const captureRecord = {
          name: record.name,
          email: record.email,
          phone: record.phone,
          collegeId: record.collegeId,
          image: record.image,
          time: record.time || new Date().toISOString()
        };
        if (existingIdx >= 0) {
          entries[existingIdx] = { ...entries[existingIdx], ...captureRecord };
        } else {
          entries.push(captureRecord);
        }
        writeData(entries);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, total: entries.length }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
    return;
  }

  // Serve static files from / (root)
  if (req.method === 'GET') {
    let urlPath = req.url;
    if (urlPath === '/' || urlPath === '/index.html') {
      serveFile(req, res, path.join(__dirname, 'index.html'));
      return;
    }
    if (urlPath === '/admin' || urlPath === '/admin.html') {
      serveFile(req, res, path.join(__dirname, 'admin.html'));
      return;
    }
    if (urlPath === '/feedback' || urlPath === '/feedback.html') {
      serveFile(req, res, path.join(__dirname, 'feedback.html'));
      return;
    }
    if (urlPath === '/success' || urlPath === '/success.html') {
      serveFile(req, res, path.join(__dirname, 'success.html'));
      return;
    }
    // Any other static file
    const filePath = path.join(__dirname, urlPath);
    if (fs.existsSync(filePath)) {
      serveFile(req, res, filePath);
      return;
    }
  }

  res.writeHead(404); res.end('not found');
});

server.listen(PORT, () => {
  console.log('Server running at: http://localhost:' + PORT);
  console.log('  QR generator:   http://localhost:' + PORT + '/');
  console.log('  Feedback form:  http://localhost:' + PORT + '/feedback');
  console.log('  Admin dashboard: http://localhost:' + PORT + '/admin');
  console.log('  Scary page:     http://localhost:' + PORT + '/success');
});