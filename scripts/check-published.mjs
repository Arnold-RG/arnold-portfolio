// Served-file privacy check for the arnold-portfolio Pages site.
// Run from the repo root: node scripts/check-published.mjs [dir]
// (dir defaults to the repo root; CI passes the assembled _site). Needs
// pdftotext from poppler-utils and qpdf --qdf. Exits 1 if any served file contains the
// personal phone number, a private name, or a local file path.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// Default-deny: every file is scanned as text unless it is a known binary.
// PDFs are read through pdftotext and decompressed with qpdf --qdf.
const BINARY = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".ico", ".bmp", ".tif", ".tiff",
  ".woff", ".woff2", ".ttf", ".otf", ".eot",
  ".mp3", ".mp4", ".webm", ".ogg", ".wav", ".mov",
  ".zip", ".gz", ".br", ".7z",
]);
// Not served: tooling and CI config. Skipped only at the top level of the repo
// root; any folder of these names deeper down is scanned. When a given dir
// (like _site) is scanned, only a top-level .git is skipped.
// _site is the assembled build artifact (CI scans it directly).
const REPO_SKIP = new Set([".git", "node_modules", "scripts", ".github", "_site"]);
const DIR_SKIP = new Set([".git"]);

const personalPhone = /(\+?48)?[\s().\/-]*575[\s().\/-]*217[\s().\/-]*930/;
const personalTel = /tel:\+?48/i;
// Any tel: URI (not only those already written as tel:+48). A leading
// letter is excluded so words like "hotel:" are not flagged.
const anyTel = /(?<![A-Za-z])tel:/i;
// Phone-like +48 numbers (country code plus at least two digits).
const plus48Phone = /\+48[\s().\/-]*\d{2,}/;
const NAMED_ENTITIES = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: "\u00a0", plus: "+", colon: ":",
  sol: "/", lpar: "(", rpar: ")", period: ".", hyphen: "-", dash: "-", ndash: "\u2013", mdash: "\u2014",
  minus: "\u2212", comma: ",", num: "#", semi: ";", equals: "=", lowbar: "_", shy: "\u00ad",
  zwsp: "\u200b", zwj: "\u200d", zwnj: "\u200c", nobreak: "\u2060", thinsp: "\u2009", ensp: "\u2002",
  emsp: "\u2003", numsp: "\u2007", puncsp: "\u2008", hairsp: "\u200a", bsol: "\\",
};

const codePoint = (hex) => {
  const n = parseInt(hex, 16);
  return n <= 0x10ffff ? String.fromCodePoint(n) : "";
};

// Decode HTML entities (numeric and named), JS/JSON escapes (\uXXXX, \u{...},
// \xNN), and percent-encodes, repeatedly so layered encodings are caught too.
function decode(text) {
  let prev;
  let out = text;
  do {
    prev = out;
    out = out
      .replace(/&#x([0-9a-f]+);?/gi, (_, hex) => codePoint(hex))
      .replace(/&#(\d+);?/g, (_, dec) => (Number(dec) <= 0x10ffff ? String.fromCodePoint(Number(dec)) : ""))
      .replace(/&([a-z]+);/gi, (m, name) => NAMED_ENTITIES[name.toLowerCase()] ?? m)
      .replace(/\\u\{([0-9a-f]+)\}/gi, (_, hex) => codePoint(hex))
      .replace(/\\u([0-9a-f]{4})/gi, (_, hex) => codePoint(hex))
      .replace(/\\x([0-9a-f]{2})/gi, (_, hex) => codePoint(hex))
      .replace(/%([0-9a-f]{2})/gi, (_, hex) => {
        try {
          return decodeURIComponent(`%${hex}`);
        } catch {
          return `%${hex}`;
        }
      });
  } while (out !== prev);
  return out;
}

// Drop soft hyphens and zero-width characters; map Unicode dashes and spaces to
// plain ones.
function normalize(text) {
  return text
    .replace(/[\u00ad\u200b-\u200d\u2060\ufeff]/g, "")
    .replace(/[\u2010-\u2015\u2212\u2043\ufe58\ufe63\uff0d]/g, "-")
    .replace(/[\u00a0\u1680\u2000-\u200a\u202f\u205f\u3000]/g, " ");
}

const stripTags = (text) => text.replace(/<[^>]*>/g, "");

// The decoding pipeline shared by the phone, name, and path checks.
function textVariants(text) {
  const decoded = normalize(decode(text));
  return [text, decoded, stripTags(text), stripTags(decoded), normalize(decode(stripTags(text)))];
}

function hasPhone(text) {
  return textVariants(text).some(
    (t) =>
      personalPhone.test(t) ||
      personalTel.test(t) ||
      anyTel.test(t) ||
      plus48Phone.test(t),
  );
}

// PDFs: visible text via pdftotext, plus decompressed objects via
// qpdf --qdf (annotations, /URI values, and stream text). Missing
// tools fail closed (ENOENT).
function pdfScanText(path) {
  const visible = execFileSync("pdftotext", [path, "-"], { encoding: "utf8" });
  const qdf = execFileSync(
    "qpdf",
    ["--qdf", "--object-streams=disable", path, "-"],
    { encoding: "latin1", maxBuffer: 64 * 1024 * 1024 },
  );
  const uris = [];
  const uriRe = /\/URI\s*\(((?:\\.|[^\\)])*)\)/g;
  let m;
  while ((m = uriRe.exec(qdf))) uris.push(m[1].replace(/\\([()\\])/g, "$1"));
  const streams = [];
  const streamRe = /stream\r?\n([\s\S]*?)\nendstream/g;
  while ((m = streamRe.exec(qdf))) streams.push(m[1]);
  return [visible, qdf, ...uris, ...streams].join("\n");
}

function fileText(path) {
  if (extname(path).toLowerCase() !== ".pdf") return readFileSync(path, "utf8");
  return pdfScanText(path);
}

// Private-name scan: the private org name, the night alias and the banned
// public alias (flexible whitespace), all case-insensitive. Built from pieces
// so this file does not contain the literals.
const privateName = new RegExp(["Ar", "nova"].join(""), "i");
const privateAlias = new RegExp(["at", "eck"].join(""), "i");
const publicAlias = new RegExp(
  [
    ["King", "Whisper"].join(""),
    ["King", "Whisper"].join("-"),
    ["King", "Whisper"].join("\\s+"),
  ].join("|"),
  "i",
);
// Company identifiers on a personal portfolio, built from pieces so this
// file does not contain the literals. A leading word boundary on the short
// name avoids matching place names that only contain it as a suffix.
const companyShort = new RegExp("\\b" + ["vi", "ra"].join(""), "i");
const companyAlt = new RegExp(["an", "vi", "ra"].join(""), "i");

const hasName = (text) =>
  textVariants(text).some(
    (t) =>
      privateName.test(t) ||
      privateAlias.test(t) ||
      publicAlias.test(t) ||
      companyShort.test(t) ||
      companyAlt.test(t),
  );

// Local file paths. Personal dirs and file:// URLs are caught anywhere.
// [\\/]+ accepts escaped C:\\Users forms. System dirs are flagged only
// outside href/src values. Matched against textVariants.
const localPath = new RegExp(
  [
    String.raw`file:\/\/`,
    String.raw`(?<![\w?])[A-Za-z]:[\\/]+Users[\\/]+`,
    String.raw`(?:^|[^\w.\-])\/(?:home|Users|workspace|root|mnt)\/`,
    String.raw`(?:^|\s|(?<!\b(?:href|src)\s*=\s*)["'\`(])\/(?:opt|tmp|usr|var)\/`,
  ].join("|"),
  "m",
);

const hasLocalPath = (text) => textVariants(text).some((t) => localPath.test(t));

export function privacyProblems(scanRoot, { repoRoot = true } = {}) {
  // Normalize (no trailing slash) so the top-level skip matches the root itself.
  const root = resolve(scanRoot);
  const found = [];
  const topSkip = repoRoot ? REPO_SKIP : DIR_SKIP;

  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      if (dir === root && topSkip.has(name)) continue;
      const path = join(dir, name);
      const rel = relative(root, path).split(sep).join("/");
      if (hasName(rel)) found.push(`${rel}: path contains a private name`);
      if (statSync(path).isDirectory()) {
        walk(path);
        continue;
      }
      if (BINARY.has(extname(path).toLowerCase())) continue;
      const text = fileText(path);
      if (hasName(text)) found.push(`${rel}: contains a private name`);
      if (hasPhone(text)) found.push(`${rel}: contains the personal phone number`);
      const ext = extname(path).toLowerCase();
      if (ext !== ".pdf" && hasLocalPath(text)) found.push(`${rel}: contains a local file path`);
    }
  };

  if (existsSync(root)) walk(root);
  return found;
}

function run() {
  const repo = fileURLToPath(new URL("..", import.meta.url));
  const root = resolve(repo, process.argv[2] ?? ".");
  const label = relative(repo, root).split(sep).join("/") || ".";
  const found = privacyProblems(root, { repoRoot: root === resolve(repo) });
  if (found.length) {
    console.error(found.join("\n"));
    process.exit(1);
  }
  console.log(`published check passed (${label}; phone; names; paths)`);
}

export { hasPhone, hasName, fileText, pdfScanText, textVariants, personalPhone, anyTel, plus48Phone, publicAlias };

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run();
}
