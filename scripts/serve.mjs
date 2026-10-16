import { handleApi } from "../worker.js";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, sep, extname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("../", import.meta.url)));
const port = Number(process.env.PORT || 4173);
const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
};

createServer(async (request, response) => {
  try {
    const url = new URL(request.url, "http://localhost");
    if(url.pathname.startsWith("/api/")) {
      const requestUrl = new URL(request.url, "http://"+request.headers.host);
      const init = { method:request.method, headers:request.headers };
      if(request.method!=="GET" && request.method!=="HEAD") { init.body=request; init.duplex="half"; }
      const result = await handleApi(new Request(requestUrl,init));
      response.writeHead(result.status,Object.fromEntries(result.headers));
      response.end(Buffer.from(await result.arrayBuffer())); return;
    }
    const pathname = decodeURIComponent(url.pathname);
    const requestedPath = pathname.endsWith("/") ? pathname + "index.html" : extname(pathname) ? pathname : pathname + ".html";
    const path = resolve(root, "." + requestedPath);
    const type = mime[extname(path)];
    // Serve only frontend file types; never expose Git metadata or local scripts.
    if (!path.startsWith(root + sep) || !type || requestedPath.split("/").some((part) => part.startsWith("."))) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }
    const data = await readFile(path);
    response.writeHead(200, { "Content-Type": type, "Cache-Control": "no-cache" });
    response.end(request.method === "HEAD" ? undefined : data);
  } catch (error) {
    response.writeHead(error.code === "ENOENT" ? 404 : 400);
    response.end("Unable to serve this file");
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`LOCALINGO is ready at http://localhost:${port}`);
});
