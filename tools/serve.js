// Minimal static file server for local use and Playwright. No dependencies.
// Usage: node tools/serve.js [port]
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const port = Number(process.argv[2]) || 4173;
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".woff2": "font/woff2",
  ".svg": "image/svg+xml",
};
// Only these top-level entries are public; node_modules, tests and tools stay private.
const PUBLIC = new Set(["index.html", "css", "js", "data", "assets"]);

const server = http.createServer((req, res) => {
  let urlPath;
  try {
    urlPath = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  } catch (err) {
    res.writeHead(400).end("Bad request");
    return;
  }
  if (urlPath.includes("\0")) {
    res.writeHead(400).end("Bad request");
    return;
  }
  const rel = path.normalize(urlPath === "/" ? "index.html" : urlPath.replace(/^[/\\]+/, ""));
  const top = rel.split(path.sep)[0];
  const file = path.join(root, rel);
  if (rel.startsWith("..") || !PUBLIC.has(top) || !file.startsWith(root)) {
    res.writeHead(404).end("Not found");
    return;
  }
  fs.readFile(file, (err, body) => {
    if (err) {
      res.writeHead(404).end("Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream" });
    res.end(body);
  });
});

server.listen(port, "127.0.0.1", () => {
  process.stdout.write(`Serving on http://127.0.0.1:${port}\n`);
});
