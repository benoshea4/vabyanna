#!/usr/bin/env node
/**
 * Injects components/header.html and components/footer.html into every page in
 * public/, replacing the existing <header class="header"> / <footer class="footer">
 * block in place and re-indenting to match the surrounding markup.
 *
 * The pages in public/ are the deployed artifact -- Cloudflare Pages serves them
 * as-is, with no build step. So this script rewrites them and the result is
 * committed. Edit the components, run `node tools/build-components.js`, commit
 * the regenerated pages. Run with --check to verify pages are in sync without
 * writing (exits non-zero if they have drifted).
 *
 * 404.html is a deliberate special case, see PAGES below.
 */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const pub = path.join(root, 'public');

const PAGES = [
  { file: 'index.html' },
  { file: 'about.html' },
  { file: 'services.html' },
  { file: 'pricing.html' },
  { file: 'contact.html' },
  { file: 'privacy-policy.html' },
  { file: 'cookie-policy.html' },
  // 404.html is served by Cloudflare Pages for any not-found path, and the
  // browser keeps the requested URL (e.g. /a/b/c). Relative links would resolve
  // against that path and break, so its markup uses root-relative hrefs. Its
  // header is also intentionally minimal -- logo only, no nav -- so it is not
  // generated from the shared header component.
  { file: '404.html', skipHeader: true, rootRelative: true },
];

/** Replace the block for `tag`, re-indented to the depth it currently sits at. */
function replaceBlock(src, tag, cls, component, file) {
  const re = new RegExp(
    `\\n([ \\t]*)<${tag} class="${cls}">\\n[\\s\\S]*?\\n\\1</${tag}>`
  );
  const m = src.match(re);
  if (!m) throw new Error(`${file}: no <${tag} class="${cls}"> block found`);
  const indent = m[1];
  const body = component
    .replace(/\n+$/, '')
    .split('\n')
    .map((line) => (line.length ? indent + line : line))
    .join('\n');
  return src.replace(re, '\n' + body);
}

/** 404 is served from arbitrary paths, so its links must be root-relative. */
function toRootRelative(html) {
  return html.replace(/(href|src)="(?!\/|https?:|mailto:|#|data:)([^"]+)"/g,
    (_, attr, url) => `${attr}="/${url === 'index.html' ? '' : url}"`);
}

const header = fs.readFileSync(path.join(root, 'components/header.html'), 'utf8');
const footer = fs.readFileSync(path.join(root, 'components/footer.html'), 'utf8');

const check = process.argv.includes('--check');
let changed = 0;

for (const page of PAGES) {
  const file = path.join(pub, page.file);
  const before = fs.readFileSync(file, 'utf8');
  let after = before;

  if (!page.skipHeader) {
    const c = page.rootRelative ? toRootRelative(header) : header;
    after = replaceBlock(after, 'header', 'header', c, page.file);
  }
  const f = page.rootRelative ? toRootRelative(footer) : footer;
  after = replaceBlock(after, 'footer', 'footer', f, page.file);

  if (after !== before) {
    changed++;
    if (check) {
      console.error(`out of sync: ${page.file}`);
    } else {
      fs.writeFileSync(file, after);
      console.log(`updated: ${page.file}`);
    }
  }
}

if (check && changed) {
  console.error(`\n${changed} page(s) out of sync. Run: node tools/build-components.js`);
  process.exit(1);
}
console.log(check ? 'all pages in sync' : `done (${changed} page(s) changed)`);
