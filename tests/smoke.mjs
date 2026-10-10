// Test de fumée navigateur : charge l'appli, déverrouille avec le PIN fourni, parcourt les pages.
// Usage : PD_PIN=xxxx node tests/smoke.mjs http://localhost:8080/
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch { pw = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright'); }
const { chromium } = pw;
const url = process.argv[2] || 'http://localhost:8080/';
const pin = process.env.PD_PIN;
if (!pin) { console.error('PD_PIN requis'); process.exit(2); }
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const p = await b.newPage();
const errs = [];
p.on('pageerror', e => errs.push('pageerror: ' + e.message));
p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) errs.push('console: ' + m.text()); });
await p.goto(url);
for (const d of pin) await p.click(`.key:text-is("${d}")`);
await p.waitForFunction(() => document.getElementById('lockScreen').classList.contains('hidden'), null, { timeout: 10000 });
const pages = await p.$$eval('.nav-item', n => n.length);
for (let i = 0; i < pages; i++) { await p.locator('.nav-item').nth(i).click(); await p.waitForTimeout(100); }
const nbCards = await p.evaluate(() => repairs.length + '/' + stock.length);
console.log('pages:', pages, 'repairs/stock:', nbCards);
console.log(errs.length ? errs.join('\n') : 'OK : aucune erreur JS');
await b.close();
process.exit(errs.length ? 1 : 0);
