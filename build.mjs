#!/usr/bin/env node
// Kinetic build: src/index.html + the files it includes  ->  dash.html (the one file you deploy).
// Zero dependencies. Usage:  node build.mjs [--version 1.0.0] [--out dash.html] [--check]
//   --version  override the version (default: contents of the VERSION file)
//   --out      output path (default: dash.html)
//   --check    build in memory and exit 1 if the output file on disk differs (used by CI)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const arg = (n, d) => { const i = process.argv.indexOf("--" + n); return i > -1 ? process.argv[i + 1] : d; };
const SRC = path.join(root, "src");
const version = (arg("version") || fs.readFileSync(path.join(root, "VERSION"), "utf8")).trim();
const outFile = path.resolve(root, arg("out", "dash.html"));

if (!/^\d+\.\d+\.\d+(\.\d+)?$/.test(version)) { console.error(`Bad version "${version}" (expected MAJOR.MINOR.PATCH or MAJOR.MINOR.PATCH.FIX, e.g. 1.0.0 or 1.0.0.1)`); process.exit(2); }

// A line that is exactly   <!-- @include some/file.ext -->   is replaced by that file's contents, verbatim.
const INC = /^<!-- @include (\S+) -->$/;
function expand(file, trail = []) {
  if (trail.includes(file)) throw new Error("include loop: " + [...trail, file].join(" -> "));
  const text = fs.readFileSync(path.join(SRC, file), "utf8");
  return text.split("\n").map(line => {
    const m = INC.exec(line);
    if (!m) return line;
    const body = expand(m[1], [...trail, file]);
    return body.endsWith("\n") ? body.slice(0, -1) : body;   // the line's own newline stays
  }).join("\n");
}

const out = expand("index.html").split("{{VERSION}}").join(version);

if (process.argv.includes("--check")) {
  const disk = fs.existsSync(outFile) ? fs.readFileSync(outFile, "utf8") : "";
  if (disk !== out) { console.error(`${path.relative(root, outFile)} is out of date - run: node build.mjs`); process.exit(1); }
  console.log(`${path.relative(root, outFile)} is up to date (v${version}, ${out.length} bytes)`);
} else {
  fs.writeFileSync(outFile, out);
  console.log(`built ${path.relative(root, outFile)}  v${version}  ${out.length} bytes`);
}
