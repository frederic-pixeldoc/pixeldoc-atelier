import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read = f => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');

test('index.html : meta robots noindex, nofollow', () => {
  assert.match(read('index.html'), /<meta name="robots" content="noindex, nofollow">/);
});
test('netlify.toml : en-tête X-Robots-Tag sur tout le site', () => {
  const t = read('netlify.toml');
  assert.match(t, /for = "\/\*"[\s\S]*?X-Robots-Tag = "noindex, nofollow"/);
});
test('robots.txt : Disallow: /', () => {
  assert.match(read('robots.txt'), /^User-agent: \*\s*\nDisallow: \/\s*$/m);
});
test('le <title> reste inchangé (contrôle automatique quotidien)', () => {
  assert.match(read('index.html'), /<title>PixelDoc — Atelier v4<\/title>/);
});
