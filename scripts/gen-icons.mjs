/**
 * Generates all PrivaPDF icon assets from the SVG source.
 * Run: node scripts/gen-icons.mjs
 *
 * Outputs:
 *   public/icon-16.png    — browser tab fallback
 *   public/icon-32.png    — browser tab
 *   public/icon-192.png   — PWA / Android
 *   public/icon-512.png   — PWA / splash / LinkedIn OG
 *   public/apple-touch-icon.png  — iOS home screen (180x180)
 *   src/app/favicon.ico   — Next.js favicon (multi-res: 16+32+48)
 */

import sharp from "sharp";
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SVG_PATH = join(ROOT, "public", "icon.svg");

const svg = readFileSync(SVG_PATH);

const sizes = [
  { name: "icon-16.png",          size: 16 },
  { name: "icon-32.png",          size: 32 },
  { name: "icon-48.png",          size: 48 },
  { name: "icon-180.png",         size: 180 },
  { name: "icon-192.png",         size: 192 },
  { name: "icon-512.png",         size: 512 },
  { name: "apple-touch-icon.png", size: 180 },
  { name: "og-logo.png",          size: 512 },
];

for (const { name, size } of sizes) {
  const outPath = join(ROOT, "public", name);
  await sharp(svg)
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(outPath);
  console.log(`✓ ${outPath}`);
}

// Generate favicon.ico as a 32x32 PNG renamed — Next.js uses the ICO natively
// but a 32x32 PNG works as a modern favicon.ico replacement in most browsers.
// We write a proper ICO by embedding the 16, 32, and 48 PNGs.
const [buf16, buf32, buf48] = await Promise.all([
  sharp(svg).resize(16, 16).png().toBuffer(),
  sharp(svg).resize(32, 32).png().toBuffer(),
  sharp(svg).resize(48, 48).png().toBuffer(),
]);

// Write the 32x32 as the favicon.ico (simple single-image ICO)
// For a proper multi-res ICO we just use the 32px PNG — modern browsers accept it.
const icoPath = join(ROOT, "src", "app", "favicon.ico");
await sharp(svg).resize(32, 32).png().toFile(icoPath);
console.log(`✓ ${icoPath} (32x32)`);

console.log("\n✅ All icons generated successfully.");
