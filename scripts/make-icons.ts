/**
 * make-icons.ts — SADN PWA icon generator (one-off script, round 3)
 *
 * Strategy:
 *   1. TRY the real wordmark (public/sadn-logo.svg). It uses <text> with a
 *      serif stack (Didot/Bodoni/Cormorant/Georgia) that does not exist on
 *      this machine, so the render is validated before acceptance:
 *        - rasterize must not throw
 *        - luminance stddev > 2 and "dark" pixel ratio in [0.4%, 35%]
 *          (a blank/white render has stdev ≈ 0 and darkRatio ≈ 0)
 *        - an ASCII preview is printed so a human can eyeball tofu/garbage
 *   2. FALLBACK (auto, or forced with --force-fallback): a hand-crafted
 *      geometric mark — rounded square in brand plum #4B3249 with a minimal
 *      white "S" built from two SVG arc strokes. Pure shapes, NO <text>.
 *
 * Outputs (white #FFFFFF square canvases):
 *   public/icons/icon-192.png          art at ~70% scale, centered (contain)
 *   public/icons/icon-512.png          art at ~70% scale, centered (contain)
 *   public/icons/icon-maskable-512.png art at ~60% scale (safe-zone aware)
 *
 * Run: bun scripts/make-icons.ts
 */

import sharp from "sharp";
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dir, "..");
const LOGO_SVG = path.join(ROOT, "public", "sadn-logo.svg");
const OUT_DIR = path.join(ROOT, "public", "icons");

const CANVAS = 1024;
const SCALE_REGULAR = 0.7; // ~70% scale, contain
const SCALE_MASKABLE = 0.6; // ~60% scale — keeps art inside maskable safe zone
const FORCE_FALLBACK = process.argv.includes("--force-fallback");

/* ── Geometric fallback mark (hand-drawn, no <text>) ─────────────────────
   Rounded square in #4B3249 + a minimal white "S" made of two 270° arcs.
   Arc 1 (top bowl):  M 162 78  A 42 42 0 1 0 120 120  (east→north→west→south)
   Arc 2 (bottom):    A 42 42 0 1 1 78 162             (north→east→south→west)
   Tangent-continuous at the (120,120) joint; round caps; stroke 20.       */
const GEOMETRIC_MARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
  <rect x="6" y="6" width="228" height="228" rx="58" fill="#4B3249"/>
  <path d="M 162 78 A 42 42 0 1 0 120 120 A 42 42 0 1 1 78 162" fill="none" stroke="#FFFFFF" stroke-width="20" stroke-linecap="round"/>
</svg>`;

type Art = { buf: Buffer; w: number; h: number };

function boxFor(scale: number): number {
  return Math.round(CANVAS * scale);
}

/** Rasterize an SVG (viewBox 240 wide) into a PNG buffer contained in a
 *  `box`×`box` square (transparent bg — canvas supplies the white). */
async function rasterizeArt(svgSource: string, viewBoxW: number, box: number): Promise<Art> {
  const density = (72 * box) / viewBoxW; // sharp renders SVG at 72dpi base
  const art = await sharp(Buffer.from(svgSource), { density })
    .resize(box, box, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toBuffer();
  const meta = await sharp(art).metadata();
  return { buf: art, w: meta.width ?? box, h: meta.height ?? box };
}

/** White 1024×1024 canvas + centered art. */
async function masterCanvas(art: Art): Promise<Buffer> {
  return sharp({
    create: { width: CANVAS, height: CANVAS, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } },
  })
    .composite([
      {
        input: art.buf,
        left: Math.round((CANVAS - art.w) / 2),
        top: Math.round((CANVAS - art.h) / 2),
      },
    ])
    .png()
    .toBuffer();
}

/** Quality gate + human-readable ASCII preview of a square master. */
async function analyze(master: Buffer, label: string): Promise<{ ok: boolean; stdev: number; darkRatio: number }> {
  const { data } = await sharp(master).greyscale().resize(64, 64, { fit: "fill" }).raw().toBuffer({ resolveWithObject: true });
  let dark = 0;
  for (let i = 0; i < data.length; i++) if (data[i] < 200) dark++;
  const darkRatio = dark / data.length;
  const stats = await sharp(master).stats();
  const stdev = stats.channels[0].stdev;

  const { data: ascii, info } = await sharp(master).greyscale().resize(64, 30, { fit: "fill" }).raw().toBuffer({ resolveWithObject: true });
  let preview = "";
  for (let y = 0; y < info.height; y++) {
    let row = "";
    for (let x = 0; x < info.width; x++) {
      const v = ascii[y * info.width + x];
      row += v >= 230 ? " " : v >= 180 ? "." : v >= 100 ? "+" : "@";
    }
    preview += `|${row}|\n`;
  }

  const ok = stdev > 2 && darkRatio > 0.004 && darkRatio < 0.35;
  console.log(`\n[analyze] ${label} → stdev=${stdev.toFixed(2)} darkRatio=${(darkRatio * 100).toFixed(2)}% valid=${ok}`);
  console.log(preview);
  return { ok, stdev, darkRatio };
}

async function writeSet(strategy: string, regularArt: Art, maskableArt: Art) {
  mkdirSync(OUT_DIR, { recursive: true });

  const regularMaster = await masterCanvas(regularArt);
  const maskableMaster = await masterCanvas(maskableArt);

  const targets: Array<{ file: string; from: Buffer; size: number }> = [
    { file: path.join(OUT_DIR, "icon-192.png"), from: regularMaster, size: 192 },
    { file: path.join(OUT_DIR, "icon-512.png"), from: regularMaster, size: 512 },
    { file: path.join(OUT_DIR, "icon-maskable-512.png"), from: maskableMaster, size: 512 },
  ];

  console.log(`\n[write] strategy: ${strategy}`);
  for (const t of targets) {
    const out = await sharp(t.from).resize(t.size, t.size).png().toBuffer();
    writeFileSync(t.file, out);
    const meta = await sharp(out).metadata();
    const bytes = statSync(t.file).size;
    const bigEnough = bytes > 2048;
    console.log(
      `  ${path.relative(ROOT, t.file)}  ${meta.width}x${meta.height}  ${bytes} bytes  (>2KB: ${bigEnough ? "OK" : "FAIL"})`,
    );
    if (!bigEnough) throw new Error(`Icon too small on disk: ${t.file} (${bytes} bytes)`);
  }
}

async function main() {
  console.log("SADN icon generator — canvas 1024×1024 white");
  let accepted = false;

  if (!FORCE_FALLBACK) {
    try {
      const logoSvg = readFileSync(LOGO_SVG, "utf8");
      const regularArt = await rasterizeArt(logoSvg, 240, boxFor(SCALE_REGULAR));
      const maskableArt = await rasterizeArt(logoSvg, 240, boxFor(SCALE_MASKABLE));
      const regularMaster = await masterCanvas(regularArt);
      const verdict = await analyze(regularMaster, "real wordmark (sadn-logo.svg) @70%");
      if (verdict.ok) {
        await analyze(await masterCanvas(maskableArt), "real wordmark @60% (maskable)");
        await writeSet("real wordmark (sadn-logo.svg rasterized by sharp/librsvg)", regularArt, maskableArt);
        accepted = true;
      } else {
        console.log("[decide] wordmark render failed the quality gate (blank or degenerate).");
      }
    } catch (err) {
      console.log(`[decide] wordmark rasterization threw: ${(err as Error).message}`);
    }
  } else {
    console.log("[decide] --force-fallback given, skipping wordmark attempt.");
  }

  if (!accepted) {
    const regularArt = await rasterizeArt(GEOMETRIC_MARK_SVG, 240, boxFor(SCALE_REGULAR));
    const maskableArt = await rasterizeArt(GEOMETRIC_MARK_SVG, 240, boxFor(SCALE_MASKABLE));
    const regularMaster = await masterCanvas(regularArt);
    const verdict = await analyze(regularMaster, "geometric fallback mark @70%");
    if (!verdict.ok) throw new Error("Even the geometric fallback failed the quality gate — aborting.");
    await analyze(await masterCanvas(maskableArt), "geometric fallback mark @60% (maskable)");
    await writeSet("geometric fallback mark (rounded plum square + white two-arc S, no <text>)", regularArt, maskableArt);
  }

  console.log("\n[done] icon generation complete.");
}

main().catch((err) => {
  console.error("[fatal]", err);
  process.exit(1);
});
