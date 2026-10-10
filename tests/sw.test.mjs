import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const sw = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const assets = [...sw.match(/const ASSETS = \[([\s\S]*?)\];/)[1].matchAll(/'([^']+)'/g)].map(m => m[1]);

test('tous les fichiers locaux chargés par index.html sont précachés par le service worker', () => {
  const refs = [...html.matchAll(/(?:src|href)="((?:js|css)\/[^"]+|manifest\.webmanifest|apple-touch-icon\.png)"/g)].map(m => m[1]);
  assert.ok(refs.length > 20);
  for (const f of refs) { assert.ok(assets.includes(f), `${f} absent de ASSETS dans sw.js`); }
});
test('tous les fichiers précachés existent', () => {
  for (const f of assets) if (f !== './') assert.ok(fs.existsSync(new URL('../' + f, import.meta.url)), `${f} introuvable`);
});
test('le cache est versionné', () => {
  assert.match(sw, /const VERSION = 'v\d+'/);
});
test('scripts externes : intégrité (SRI) obligatoire', () => {
  const ext = [...html.matchAll(/<script[^>]+src="https:[^>]*>/g)].map(m => m[0]);
  assert.ok(ext.length >= 2);
  for (const t of ext) assert.match(t, /integrity="sha512-/, t);
});
test('aucun script en ligne dans index.html (prépare une politique CSP stricte)', () => {
  assert.equal([...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>/g)].length, 0);
});
