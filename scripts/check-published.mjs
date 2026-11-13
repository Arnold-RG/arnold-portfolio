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
// Any +48 number (country code plus at least two digits) is disallowed.
const plus48Phone = /\+48[\s().\/-]*\d{2,}/;
// The public Hamwe office number is the only telephone that may appear,
// including as a tel: URI.
const officeDigits = ["250", "794", "607", "518"].join("");
const officeTelSource =
  "(?:tel:\\s*)?\\+?" + ["250", "794", "607", "518"].join("[\\s().\\/-]*");
// In JS/HTML/text, tel: counts only when a real phone pattern follows
// (so React's tel:!0 and template tel:${...} are ignored).
const telThenPhone = /(?<![A-Za-z])tel:\s*(?:\+|\(\s*\+?|\d)/i;

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

function stripOffice(text) {
  return text.replace(new RegExp(officeTelSource, "gi"), " ");
}

function officeIn(fragment) {
  return fragment.replace(/\D/g, "") === officeDigits;
}

function hasDisallowedTelUri(text) {
  const re = /\/URI\s*\(((?:\\.|[^\\)])*)\)/g;
  let m;
  while ((m = re.exec(text))) {
    const uri = m[1].replace(/\\([()\\])/g, "$1").trim();
    if (/^tel:/i.test(uri) && !officeIn(uri)) return true;
  }
  return false;
}

function hasPhone(text, { pdf = false } = {}) {
  return textVariants(text).some((t) => {
    const rest = stripOffice(t);
    if (personalPhone.test(rest) || personalTel.test(rest) || plus48Phone.test(rest)) {
      return true;
    }
    if (pdf) return hasDisallowedTelUri(t);
    return telThenPhone.test(rest);
  });
}

// Published-output email scan: the only allowed personal address is
// the public resume address. Consumer-mail domains otherwise fail.
// Organisation addresses and obvious placeholders / library strings
// are left alone.
const allowedPersonalEmail = ["rurangwaarnold", "32", "@gmail.com"].join("");
const personalMailDomains = new RegExp(
  "@(?:" +
    [
      "gmail", "googlemail", "yahoo", "ymail", "hotmail", "outlook",
      "live", "msn", "icloud", "me", "mac", "protonmail", "proton",
      "aol", "gmx", "zoho", "yandex", "mail",
    ].join("|") +
    ")\\.(?:com|me|ru|de|co\\.\\w{2})\\b",
  "i",
);
const placeholderEmail = new RegExp(
  "^(?:you|user|name|foo|bar|test|someone|placeholder)@|@(?:example\\.(?:com|org|net)|email\\.com|test\\.com|localhost|invalid)\\b",
  "i",
);
const emailFinder = /(?:mailto:)?([A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,})/g;

function foundEmails(text) {
  const out = [];
  for (const variant of textVariants(text)) {
    const re = new RegExp(emailFinder.source, "gi");
    let m;
    while ((m = re.exec(variant))) out.push({ raw: m[0], email: m[1].toLowerCase() });
  }
  return out;
}

function isLibraryOrPlaceholder(email, raw) {
  if (placeholderEmail.test(email)) return true;
  if (/@[A-Za-z0-9.\-]+\/[A-Za-z]/.test(raw)) return true;
  if (/@\d/.test(email) && !email.includes(".")) return true;
  return false;
}

function isPersonalMail(email) {
  const at = email.lastIndexOf("@");
  if (at < 0) return false;
  return personalMailDomains.test("@" + email.slice(at + 1));
}

function hasDisallowedEmail(text) {
  for (const { raw, email } of foundEmails(text)) {
    if (email === allowedPersonalEmail.toLowerCase()) continue;
    if (isLibraryOrPlaceholder(email, raw)) continue;
    if (isPersonalMail(email)) return true;
    if (/^mailto:/i.test(raw) && email !== allowedPersonalEmail.toLowerCase()) {
      // mailto: to a personal-looking address already returned above;
      // mailto: to an org address is allowed.
      continue;
    }
  }
  return false;
}

function allowedOrgEmails(text) {
  const orgs = new Set();
  for (const { email } of foundEmails(text)) {
    if (email === allowedPersonalEmail.toLowerCase()) continue;
    if (isLibraryOrPlaceholder(email, email)) continue;
    if (!isPersonalMail(email)) orgs.add(email);
  }
  return [...orgs].sort();
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
// Older company identifiers, built from pieces so this file does not
// contain the literals. The public studio name (the short form) is allowed
// on this official portfolio, where it is a featured public project. The
// alternate form stays blocked.
const companyAlt = new RegExp(["an", "vi", "ra"].join(""), "i");

const hasName = (text) =>
  textVariants(text).some(
    (t) =>
      privateName.test(t) ||
      privateAlias.test(t) ||
      publicAlias.test(t) ||
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
      const ext = extname(path).toLowerCase();
      if (BINARY.has(ext)) continue;
      const text = fileText(path);
      if (hasName(text)) found.push(`${rel}: contains a private name`);
      if (hasPhone(text, { pdf: ext === ".pdf" })) found.push(`${rel}: contains the personal phone number`);
      if (hasDisallowedEmail(text)) found.push(`${rel}: contains a disallowed email address`);
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

export { hasPhone, hasName, hasDisallowedEmail, fileText, pdfScanText, textVariants, personalPhone, plus48Phone, telThenPhone, publicAlias, allowedOrgEmails, allowedPersonalEmail };

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run();
}
