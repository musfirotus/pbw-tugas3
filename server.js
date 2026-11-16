/* =========================================================
   server.js - server statis kecil untuk `npm run dev`
   Aplikasi memuat JSON dan template dengan fetch, jadi harus
   dibuka lewat http:// (bukan file://). File ini hanya memakai
   modul bawaan Node, sehingga tidak perlu `npm install`.
   Port bisa diganti: PORT=3000 npm run dev
   ========================================================= */

var http = require('http');
var fs = require('fs');
var path = require('path');

var ROOT = __dirname;
var PORT = Number(process.env.PORT) || 5173;

var JENIS = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.ico':  'image/x-icon'
};

var server = http.createServer(function (req, res) {
  var alamat = decodeURIComponent(req.url.split('?')[0]);
  if (alamat.endsWith('/')) alamat += 'index.html';

  // Tolak path yang keluar dari folder proyek (misal /../../)
  var file = path.join(ROOT, path.normalize(alamat));
  if (file.indexOf(ROOT) !== 0) {
    res.writeHead(403);
    return res.end('Dilarang');
  }

  fs.readFile(file, function (err, isi) {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Tidak ditemukan: ' + alamat);
    }
    res.writeHead(200, {
      'Content-Type': JENIS[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    res.end(isi);
  });
});

server.on('error', function (err) {
  if (err.code === 'EADDRINUSE') {
    console.error('Port ' + PORT + ' sedang dipakai. Coba port lain:');
    console.error('  PowerShell : $env:PORT=3000; npm run dev');
    console.error('  Git Bash   : PORT=3000 npm run dev');
  } else {
    console.error(err.message);
  }
  process.exit(1);
});

server.listen(PORT, function () {
  console.log('SITTA Vue berjalan di http://localhost:' + PORT);
  console.log('Tekan Ctrl+C untuk berhenti.');
});
