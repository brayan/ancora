import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const runner = spawn(process.execPath, ["apps/web/scripts/run-runner.mjs"], {
  cwd: root,
  stdio: "inherit",
  env: {
    PATH: process.env.PATH,
    APP_ORIGIN: "http://127.0.0.1:3000",
    RUNNER_PORT: "3001",
  },
});
const require = createRequire(path.join(root, "apps/web/package.json"));
const web = spawn(
  process.execPath,
  [
    require.resolve("next/dist/bin/next"),
    "dev",
    "--hostname",
    "127.0.0.1",
    "--port",
    "3000",
  ],
  {
    cwd: path.join(root, "apps/web"),
    stdio: "inherit",
  },
);
let closing = false;
function close(code = 0) {
  if (closing) return;
  closing = true;
  runner.kill("SIGTERM");
  web.kill("SIGTERM");
  process.exitCode = code;
}
for (const child of [runner, web]) {
  child.on("error", () => close(1));
  child.on("exit", (code) => close(code ?? 1));
}
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => close());
