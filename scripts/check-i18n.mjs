// scripts/check-i18n.mjs — `npm run check:i18n`
// For every app file that uses a translation catalog (`*.i18n.ts`, see
// lib/translate.ts), lists:
//   1. t("…") keys missing from one of the catalog's languages (en, ja, es, he);
//   2. French-looking text still written straight into the JSX, outside
//      t() — accented words between tags, or a quoted French string in a
//      prop — so a screen can't quietly stay half-translated.
// Exit code 1 when anything is missing. Needs Node 22.6+ (it imports the
// .ts catalogs directly).

import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = resolve(dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1")), "..");

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (name === "node_modules" || name.startsWith(".")) return [];
    return statSync(path).isDirectory() ? files(path) : /\.(tsx|ts)$/.test(name) ? [path] : [];
  });
}

const stripComments = (source) =>
  source
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'`])\/\/.*$/gm, "$1");

// Read a string literal the way JavaScript does (  included).
const unquote = (literal) =>
  literal.startsWith('"')
    ? JSON.parse(literal)
    : JSON.parse(`"${literal.slice(1, -1).replace(/\\'/g, "'").replace(/"/g, '\\"')}"`);

let problems = 0;
for (const file of [...files(join(ROOT, "app")), ...files(join(ROOT, "lib"))]) {
  const source = readFileSync(file, "utf8");
  const imported = [...source.matchAll(/import\s+\{\s*([A-Z_]+)\s*\}\s+from\s+"((?:\.\.?\/)+[\w/.-]+\.i18n|@\/[\w/.-]+\.i18n)"/g)];
  if (!imported.length) continue;

  const catalogs = [];
  for (const [, name, from] of imported) {
    const path = from.startsWith("@/") ? join(ROOT, `${from.slice(2)}.ts`) : join(dirname(file), `${from}.ts`);
    const module = await import(pathToFileURL(path).href);
    catalogs.push(module[name]);
  }
  const has = (lang, key) => catalogs.some((catalog) => key in catalog[lang]);

  const code = stripComments(source);
  const keys = [...code.matchAll(/\bt\(\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g)].map((m) => unquote(m[1]));
  const missing = [...new Set(keys)].filter((key) => ["en", "ja", "es", "he"].some((lang) => !has(lang, key)));

  // Text between tags with a French accent or apostrophe-word, not inside {…}.
  const loose = [...code.matchAll(/>\s*([^<>{}\n]*[A-Za-zÀ-ÿ][^<>{}\n]*)\s*</g)]
    .map((m) => m[1].trim())
    .filter((text) => /[À-ÿ]|&apos;|\b(le|la|les|des|une?|vous|votre|pour|avec|sur)\b/i.test(text) && !/^[\W\d]+$/.test(text));
  const props = [...code.matchAll(/\b(?:placeholder|aria-label|title|alt|label)="([^"]*[À-ÿ][^"]*)"/g)].map((m) => m[1]);

  if (process.argv.includes("--verbose")) {
    console.log(`${file.slice(ROOT.length + 1)}: ${new Set(keys).size} keys checked`);
  }
  if (missing.length || loose.length || props.length) {
    problems += missing.length + loose.length + props.length;
    console.log(`\n${file.slice(ROOT.length + 1)}`);
    for (const key of missing) console.log(`  missing translation: ${JSON.stringify(key)}`);
    for (const text of loose) console.log(`  untranslated text:   ${JSON.stringify(text.slice(0, 100))}`);
    for (const text of props) console.log(`  untranslated prop:   ${JSON.stringify(text)}`);
  }
}

console.log(problems ? `\n${problems} problem(s).` : "All translated screens are complete.");
process.exit(problems ? 1 : 0);
