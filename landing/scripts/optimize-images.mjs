/**
 * Recompresses every JPEG under public/ in place: max 1600px wide, mozjpeg
 * quality 78. Run after adding images:  npm run images:optimize
 *
 * Needed because the site is served through Vercel "services" (vercel.json),
 * where Next's /_next/image optimizer isn't available - so images ship as
 * they are in the repo (next.config.mjs sets images.unoptimized).
 * Files that are already small enough are left untouched.
 */

import sharp from "sharp";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const ROOT = new URL("../public/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const MAX_WIDTH = 1600;

async function* jpegs(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) yield* jpegs(p);
    else if (/\.jpe?g$/i.test(entry.name)) yield p;
  }
}

let before = 0, after = 0;
for await (const file of jpegs(ROOT)) {
  const input = await readFile(file);
  const output = await sharp(input)
    .rotate()
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .jpeg({ quality: 78, mozjpeg: true, progressive: true })
    .toBuffer();
  before += input.length;
  if (output.length < input.length * 0.9) {
    await writeFile(file, output);
    after += output.length;
    console.log(`${file.replace(ROOT, "")}: ${Math.round(input.length / 1024)} KB -> ${Math.round(output.length / 1024)} KB`);
  } else {
    after += input.length;
  }
}
console.log(`total: ${Math.round(before / 1024)} KB -> ${Math.round(after / 1024)} KB`);
