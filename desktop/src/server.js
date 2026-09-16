"use strict";

/**
 * Boots the app's own Next.js server inside the desktop app.
 *
 * Running the real server locally — rather than bundling a static client and
 * talking to a remote API — means everything keeps working unchanged: session
 * cookies stay same-origin, there is no CORS, the Node-only export path
 * (pdfkit, epub-gen-memory) runs as it always has, and the Claude Agent SDK
 * runs natively inside the API route with no IPC bridge.
 */

const { fork } = require("node:child_process");
const net = require("node:net");
const path = require("node:path");

/** An OS-assigned free port, so two copies never collide. */
function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

/** Polls until the server answers, so the window never loads a dead port. */
async function waitForServer(url, { timeoutMs = 30000, signal } = {}) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    if (signal?.aborted) throw new Error("Startup aborted");
    try {
      const res = await fetch(url, { method: "GET" });
      if (res.ok || res.status === 307 || res.status === 401) return;
    } catch {
      // Not listening yet.
    }
    if (Date.now() > deadline) {
      throw new Error(`The app server did not start within ${timeoutMs / 1000}s`);
    }
    await new Promise((r) => setTimeout(r, 150));
  }
}

/**
 * @param {object} opts
 * @param {string} opts.serverDir  directory containing Next's standalone server.js
 * @param {object} opts.config     persisted per-install config
 * @param {(line: string) => void} [opts.onLog]
 */
async function startServer({ serverDir, config, onLog = () => {} }) {
  const port = await findFreePort();
  // Absolute: fork() resolves a relative entry against `cwd`, which is the
  // server directory itself — a relative path would resolve twice.
  const root = path.resolve(serverDir);
  const entry = path.join(root, "server.js");

  const child = fork(entry, [], {
    cwd: root,
    stdio: ["ignore", "pipe", "pipe", "ipc"],
    env: {
      ...process.env,
      NODE_ENV: "production",
      PORT: String(port),
      HOSTNAME: "127.0.0.1",
      // Tells the app it's running inside the desktop shell, which is what
      // unlocks the Claude subscription provider.
      INKDROP_DESKTOP: "1",
      DATABASE_URL: config.databaseUrl || process.env.DATABASE_URL || "",
      DATABASE_SSL: config.databaseSsl ? "true" : "false",
      AUTH_SECRET: config.authSecret,
      ENCRYPTION_KEY: config.encryptionKey,
      AUTH_URL: `http://127.0.0.1:${port}`,
      AUTH_TRUST_HOST: "true",
    },
  });

  child.stdout?.on("data", (d) => onLog(String(d).trimEnd()));
  child.stderr?.on("data", (d) => onLog(String(d).trimEnd()));

  const url = `http://127.0.0.1:${port}`;
  const exited = new Promise((_, reject) => {
    child.once("exit", (code) =>
      reject(new Error(`The app server exited early (code ${code}).`))
    );
  });

  // Whichever settles first: a live server, or a crashed child.
  await Promise.race([waitForServer(`${url}/api/health`), exited]);

  return { child, url, port };
}

module.exports = { startServer, findFreePort, waitForServer };
