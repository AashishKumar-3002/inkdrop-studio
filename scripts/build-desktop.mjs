/**
 * Assembles the desktop bundle.
 *
 * Next's `output: "standalone"` emits a server that expects `.next/static`
 * and `public/` to sit beside it — the build does not copy them itself. The
 * Dockerfile does this by hand too; this script is the desktop equivalent,
 * so `npm run desktop` and `docker build` can't drift apart.
 */
import { cp, rm, access } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";

const root = process.cwd();
const standalone = path.join(root, ".next", "standalone");

async function exists(p) {
  try {
    await access(p, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

if (!(await exists(path.join(standalone, "server.js")))) {
  console.error(
    "No standalone build found. Run `npm run build` first (next.config.ts sets output: 'standalone')."
  );
  process.exit(1);
}

for (const [from, to] of [
  [path.join(root, ".next", "static"), path.join(standalone, ".next", "static")],
  [path.join(root, "public"), path.join(standalone, "public")],
]) {
  await rm(to, { recursive: true, force: true });
  await cp(from, to, { recursive: true });
  console.log(`copied ${path.relative(root, from)} -> ${path.relative(root, to)}`);
}

// The Agent SDK is an optional dependency, so Next's standalone tracer may
// not have pulled it in. Subscription mode needs it present at runtime.
const sdk = path.join(root, "node_modules", "@anthropic-ai", "claude-agent-sdk");
const sdkDest = path.join(standalone, "node_modules", "@anthropic-ai", "claude-agent-sdk");
if ((await exists(sdk)) && !(await exists(sdkDest))) {
  await cp(sdk, sdkDest, { recursive: true });
  console.log("copied @anthropic-ai/claude-agent-sdk into the standalone bundle");
}

console.log("desktop bundle ready");
