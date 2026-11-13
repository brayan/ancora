import { createServer } from "node:http";
import { stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const require = createRequire(import.meta.url);
const runtimeRoot = path.dirname(require.resolve("pyodide/package.json"));
const port = Number(process.env.RUNNER_PORT ?? 3001);
const appOrigin = process.env.APP_ORIGIN ?? "http://127.0.0.1:3000";
const runnerOrigin = `http://127.0.0.1:${port}`;
if (
  !Number.isInteger(port) ||
  port < 1024 ||
  port > 65535 ||
  !/^http:\/\/127\.0\.0\.1:\d{4,5}$/.test(appOrigin) ||
  appOrigin === runnerOrigin
)
  throw new Error("Use distinct loopback app/runner origins.");

const files = new Map([
  ["/", ["index.html", "text/html"]],
  ["/broker.mjs", ["broker.mjs", "text/javascript"]],
  ["/worker.mjs", ["worker.mjs", "text/javascript"]],
  ["/protocol.mjs", ["protocol.mjs", "text/javascript"]],
  ["/harness.py", ["harness.py", "text/plain"]],
]);
const runtimeFiles = new Map([
  ["pyodide.mjs", "text/javascript"],
  ["pyodide.asm.mjs", "text/javascript"],
  ["pyodide.asm.wasm", "application/wasm"],
  ["python_stdlib.zip", "application/zip"],
  ["pyodide-lock.json", "application/json"],
]);
const policy = `default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self'; worker-src 'self'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors ${appOrigin}`;

const server = createServer(async (request, response) => {
  response.setHeader("Content-Security-Policy", policy);
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  response.setHeader("Referrer-Policy", "no-referrer");
  if (
    request.headers.host !== `127.0.0.1:${port}` ||
    (request.headers.origin &&
      ![appOrigin, runnerOrigin].includes(request.headers.origin))
  ) {
    response.writeHead(403).end();
    return;
  }
  if (!["GET", "HEAD"].includes(request.method)) {
    response.writeHead(405, { Allow: "GET, HEAD" }).end();
    return;
  }
  const url = new URL(request.url, runnerOrigin);
  if (url.search || url.hash) {
    response.writeHead(404).end();
    return;
  }
  if (url.pathname === "/config.mjs") {
    response.writeHead(200, {
      "Content-Type": "text/javascript",
      "Cache-Control": "no-store",
    });
    response.end(
      request.method === "HEAD"
        ? undefined
        : `export const APP_ORIGIN = ${JSON.stringify(appOrigin)};`,
    );
    return;
  }

  const runtimeName = url.pathname.startsWith("/runtime/")
    ? url.pathname.slice(9)
    : null;
  const staticFile = files.get(url.pathname);
  const runtimeType = runtimeFiles.get(runtimeName);
  if (!staticFile && !runtimeType) {
    response.writeHead(404).end();
    return;
  }
  const filename = runtimeType
    ? path.join(runtimeRoot, runtimeName)
    : path.join(appRoot, "runner", staticFile[0]);
  try {
    const metadata = await stat(filename);
    response.writeHead(200, {
      "Content-Type": runtimeType ?? staticFile[1],
      "Content-Length": metadata.size,
      "Cache-Control": runtimeType ? "public, max-age=3600" : "no-store",
    });
    if (request.method === "HEAD") response.end();
    else {
      const stream = createReadStream(filename);
      stream.on("error", () => response.destroy());
      stream.pipe(response);
    }
  } catch {
    response.writeHead(503).end();
  }
});

// No request logging: URLs and bodies can contain private submitted code.
server.listen(port, "127.0.0.1", () =>
  process.stdout.write(`Ancora static runner: ${runnerOrigin}\n`),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => server.close(() => process.exit(0)));
