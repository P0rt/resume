import { createServer } from "node:http";
import { promises as fs } from "node:fs";
import path from "node:path";

const root = path.resolve("dist");
const port = Number(process.env.PORT || 3000);
const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".xml": "application/xml; charset=utf-8",
};

createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
    const relative = pathname.endsWith("/") ? `${pathname}index.html` : pathname;
    const filename = path.resolve(root, `.${relative}`);
    if (!filename.startsWith(`${root}${path.sep}`)) throw new Error("Invalid path");
    const body = await fs.readFile(filename);
    response.writeHead(200, { "Content-Type": types[path.extname(filename)] || "application/octet-stream" });
    response.end(body);
  } catch (error) {
    try {
      response.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
      response.end(await fs.readFile(path.join(root, "404.html")));
    } catch (fallbackError) {
      response.end("Not found");
    }
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`Local site: http://127.0.0.1:${port}`);
});
