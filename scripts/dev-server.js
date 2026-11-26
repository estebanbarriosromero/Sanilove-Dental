const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const dotenv = require("dotenv");

const root = path.resolve(__dirname, "..");
const envFile = [".env.development.local", ".env"]
  .map((file) => path.join(root, file))
  .find((file) => fs.existsSync(file));
if (envFile) dotenv.config({ path: envFile });

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mp4": "video/mp4",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp"
};
const maxBodyBytes = 1024 * 1024;

function jsonResponse(res) {
  res.status = (status) => {
    res.statusCode = status;
    return res;
  };
  res.json = (value) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(value));
    return res;
  };
}

async function parseBody(req) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > maxBodyBytes) throw new Error("Request body exceeds 1 MB.");
    chunks.push(chunk);
  }
  if (!bytes) return undefined;
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new Error("Request body must be valid JSON.");
  }
}

async function handleApi(req, res, pathname) {
  const route = decodeURIComponent(pathname.slice("/api/".length)).replace(/\/+$/, "");
  if (!route || !/^[a-zA-Z0-9_/-]+$/.test(route) || route.split("/").includes("..")) {
    res.statusCode = 404;
    return res.json({ error: "API route not found." });
  }

  const handlerPath = path.resolve(root, "api", `${route}.js`);
  if (!handlerPath.startsWith(path.resolve(root, "api") + path.sep) || !fs.existsSync(handlerPath)) {
    res.statusCode = 404;
    return res.json({ error: "API route not found." });
  }

  req.body = await parseBody(req);
  req.headers.origin ||= `http://${req.headers.host || "localhost:3000"}`;
  jsonResponse(res);
  const handler = require(handlerPath);
  await handler(req, res);
  if (!res.writableEnded) res.end();
}

async function handleRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || "localhost:3000"}`);
  if (url.pathname.startsWith("/api/")) {
    try {
      await handleApi(req, res, url.pathname);
    } catch (error) {
      console.error("Local API error:", error.message);
      if (!res.writableEnded) {
        jsonResponse(res);
        const configError = /DATABASE_URL|SESSION_SECRET|ADMIN_PASSWORD/.test(error.message);
        const invalidRequest = error.message.includes("1 MB") || error.message.includes("valid JSON");
        res.statusCode = invalidRequest ? 400 : configError ? 503 : 500;
        res.json({ error: configError ? error.message : "Internal server error." });
      }
    }
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.statusCode = 405;
    return res.end("Method not allowed.");
  }
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    res.statusCode = 400;
    return res.end("Bad request.");
  }
  if (pathname.split(/[\\/]+/).some((part) => part.startsWith(".")) || pathname.includes("node_modules")) {
    res.statusCode = 404;
    return res.end("Not found.");
  }

  const relativePath = pathname === "/" ? "index.html" : pathname.slice(1);
  let filePath = path.resolve(root, relativePath);
  if (filePath !== root && !filePath.startsWith(root + path.sep)) {
    res.statusCode = 403;
    return res.end("Forbidden.");
  }
  try {
    if (fs.statSync(filePath).isDirectory()) filePath = path.join(filePath, "index.html");
    const file = await fs.promises.readFile(filePath);
    res.setHeader("Content-Type", contentTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.statusCode = 200;
    return res.end(req.method === "HEAD" ? undefined : file);
  } catch {
    res.statusCode = 404;
    return res.end("Not found.");
  }
}

const port = Number(process.env.PORT) || 3000;
const server = http.createServer((req, res) => {
  handleRequest(req, res).catch((error) => {
    console.error("Local server error:", error.message);
    if (!res.writableEnded) {
      res.statusCode = 500;
      res.end("Internal server error.");
    }
  });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Sanilove Dental running at http://localhost:${port}`);
});
