import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const output = join(root, "docs", "images", "workbench-overview.png");
const port = 4173;
const base = `http://127.0.0.1:${port}`;
const npm = process.platform === "win32" ? "npm.cmd" : "npm";

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      stdio: "inherit",
      env: process.env,
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} exited with ${code}`));
    });
  });
}

async function waitForServer(timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(base);
      if (response.ok) return;
    } catch {
      // Server not ready yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for ${base}`);
}

let server;
try {
  await run(npm, ["run", "build"]);
  server = spawn(
    npm,
    [
      "run",
      "preview",
      "--",
      "--host",
      "127.0.0.1",
      "--port",
      String(port),
      "--strictPort",
    ],
    {
      cwd: root,
      stdio: "inherit",
      env: process.env,
      detached: process.platform !== "win32",
    },
  );
  await waitForServer();

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 1,
    });
    await page.goto(base, { waitUntil: "networkidle" });
    await page.waitForSelector(".map canvas", {
      state: "visible",
      timeout: 15000,
    });
    await page.waitForFunction(
      () => !document.body.innerText.includes("正在加载模拟图层"),
      undefined,
      { timeout: 15000 },
    );
    await page.waitForTimeout(600);
    await mkdir(dirname(output), { recursive: true });
    await page.screenshot({ path: output, fullPage: true });
    console.log(`Wrote ${output}`);
  } finally {
    await browser.close();
  }
} finally {
  if (server) {
    if (process.platform === "win32") server.kill();
    else {
      try {
        process.kill(-server.pid, "SIGTERM");
      } catch {
        server.kill("SIGTERM");
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
    if (!server.killed) {
      try {
        server.kill("SIGKILL");
      } catch {
        // Already gone.
      }
    }
  }
}
