/** Export checked-in platform icons using electron-builder's own icon toolset. */
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(new URL("../desktop/package.json", import.meta.url));
const { convertIcon } = require("app-builder-lib/out/util/iconConverter.js");
const root = path.resolve("desktop/build/icons");
for (const format of ["ico", "icns", "set"]) {
  const result = await convertIcon({
    sources: [path.join(root, format === "set" ? "icon.icns" : "icon.png")], fallbackSources: [], roots: [root], format,
    outDir: format === "set" ? path.join(root, "png") : root,
  });
  if (!result.icons.length || result.isFallback) throw new Error(`Could not export ${format} icons`);
  console.log(`Exported ${format} icons`);
}
