#!/usr/bin/env node
/* eslint-disable no-console -- command line report */
/**
 * WCAG 2.x contrast check for the Estheros themes.
 *
 * Reads src/shared/theme/themes/*.css, resolves the color tokens of each theme and prints the
 * contrast ratio of the text tokens over the background tokens. Exits with code 1 when a
 * required pair is below its minimum.
 *
 * Usage: node scripts/contrast-check.mjs [--markdown]
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const themesDir = join(root, "src", "shared", "theme", "themes");

const BACKGROUNDS = ["--bg", "--bg-elevated", "--surface"];

/** [foreground, background, minimum ratio, required] */
const PAIRS = [
  ...BACKGROUNDS.flatMap((bg) => [
    ["--text", bg, 4.5, true],
    ["--text-muted", bg, 4.5, true],
  ]),
  ["--on-accent", "--accent", 4.5, true],
  ["--on-accent", "--accent-hover", 4.5, true],
  // Informative: state colors are used for short text such as overdue dates.
  ["--danger", "--bg", 4.5, false],
  ["--danger", "--surface", 4.5, false],
  ["--success", "--surface", 4.5, false],
  ["--warning", "--surface", 4.5, false],
  ["--accent", "--surface", 3, false],
];

function parseTheme(css) {
  const tokens = {};
  for (const match of css.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    tokens[match[1]] = match[2].trim();
  }
  return tokens;
}

function parseColor(value) {
  const hex = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = [...h].map((c) => c + c).join("");
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
      a: 1,
    };
  }
  const rgb = value.match(/^rgba?\(([^)]+)\)$/i);
  if (rgb) {
    const [r, g, b, a = "1"] = rgb[1].split(",").map((part) => part.trim());
    return { r: Number(r), g: Number(g), b: Number(b), a: Number(a) };
  }
  throw new Error(`Unsupported color value: ${value}`);
}

/** Composites a translucent color over an opaque base. */
function flatten(color, base) {
  const { a } = color;
  return {
    r: color.r * a + base.r * (1 - a),
    g: color.g * a + base.g * (1 - a),
    b: color.b * a + base.b * (1 - a),
    a: 1,
  };
}

function luminance({ r, g, b }) {
  const [R, G, B] = [r, g, b].map((channel) => {
    const v = channel / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function contrast(fg, bg) {
  const l1 = luminance(fg);
  const l2 = luminance(bg);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

const markdown = process.argv.includes("--markdown");
const files = readdirSync(themesDir).filter((file) => file.endsWith(".css"));
let failures = 0;

for (const file of files) {
  const name = file.replace(/\.css$/, "");
  const tokens = parseTheme(readFileSync(join(themesDir, file), "utf8"));
  const windowBg = parseColor(tokens["--bg"]);
  const resolve = (token) => {
    if (!tokens[token]) throw new Error(`${name}: missing ${token}`);
    return flatten(parseColor(tokens[token]), windowBg);
  };

  console.log(
    markdown
      ? `\n#### ${name}\n\n| Texto | Fondo | Ratio | Mínimo | Estado |\n|---|---|---|---|---|`
      : `\n${name}`,
  );
  for (const [fgToken, bgToken, min, required] of PAIRS) {
    const bg = resolve(bgToken);
    const fg = flatten(parseColor(tokens[fgToken]), bg);
    const ratio = contrast(fg, bg);
    const ok = ratio >= min;
    if (!ok && required) failures += 1;
    const status = ok ? "ok" : required ? "FAIL" : "info";
    if (markdown) {
      console.log(`| \`${fgToken}\` | \`${bgToken}\` | ${ratio.toFixed(2)} | ${min} | ${status} |`);
    } else {
      console.log(
        `  ${status.padEnd(4)} ${fgToken.padEnd(12)} on ${bgToken.padEnd(14)} ${ratio.toFixed(2).padStart(5)} (min ${min})`,
      );
    }
  }
}

if (failures > 0) {
  console.error(`\n${failures} required pair(s) below the minimum contrast.`);
  process.exit(1);
}
console.log("\nAll required pairs pass.");
