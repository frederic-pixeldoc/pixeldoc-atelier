// Test de fumée navigateur : charge l'appli, déverrouille avec le PIN fourni, parcourt les pages.
// Usage : [PD_PIN=xxxx] node tests/smoke.mjs http://localhost:8080/
import { playwright, unlock } from './helpers.mjs';
const pw = playwright(); const { chromium } = pw;
const url = process.argv[2] || 'http://localhost:8080/';
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const p = await b.newPage();
const errs = [];
p.on('pageerror', e => errs.push('pageerror: ' + e.message));
p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) errs.push('console: ' + m.text()); });
await p.goto(url);
await unlock(p);
const pages = await p.$$eval('.nav-item', n => n.length);
for (let i = 0; i < pages; i++) { await p.locator('.nav-item').nth(i).click(); await p.waitForTimeout(100); }
const nbCards = await p.evaluate(() => repairs.length + '/' + stock.length);
console.log('pages:', pages, 'repairs/stock:', nbCards);
console.log(errs.length ? errs.join('\n') : 'OK : aucune erreur JS');
await b.close();
process.exit(errs.length ? 1 : 0);
