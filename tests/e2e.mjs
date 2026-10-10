// Test bout-en-bout dans un vrai navigateur : TVA, factures, sauvegarde/restauration, rappel.
// Usage : [PD_PIN=xxxx] node tests/e2e.mjs http://localhost:8080/
import fs from 'fs';
import { playwright, unlock } from './helpers.mjs';
const pw = playwright(); const { chromium } = pw;
const url = process.argv[2] || 'http://localhost:8080/';
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const ctx = await b.newContext({ acceptDownloads: true });
const p = await ctx.newPage();
const errs = [], dialogs = [];
p.on('pageerror', e => errs.push(e.message));
let dialogAnswer = true;
p.on('dialog', d => { dialogs.push(d.message()); dialogAnswer ? d.accept() : d.dismiss(); });
let fail = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fail++; };

await p.goto(url);
ok(/Créez/.test(await p.textContent('#lockHeading')), 'premier lancement : création du code PIN demandée (pas de code par défaut)');
await unlock(p);
await p.evaluate(() => lockApp());
for (const d of '1108') await p.click(`.key:text-is("${d}")`);
await p.waitForTimeout(1500);
ok(await p.evaluate(() => !document.getElementById('lockScreen').classList.contains('hidden')), 'ancien code par défaut 1108 refusé');
await unlock(p);
await p.waitForFunction(() => window.jspdf && window.Chart, null, { timeout: 15000 });

// 1. Régime de TVA non choisi : pas de facture, pas de numéro consommé
await p.evaluate(() => genInvoice('4'));
ok(await p.evaluate(() => !repairs.find(r => r.id === '4').invNo), 'sans régime de TVA : aucune facture ni numéro attribué');

// 2. Profil complet en franchise
await p.evaluate(() => {
  const set = (k, v) => { document.getElementById(k).value = v; };
  set('pf_nom', 'Atelier Test'); set('pf_adr', '1 rue Exemple, 97400 Saint-Denis'); set('pf_siret', '73282932000074'); set('pf_rne', 'RNE-TEST');
  set('pf_tva', 'franchise'); saveProfil();
});
const [dl1] = await Promise.all([p.waitForEvent('download'), p.evaluate(() => genInvoice('4'))]);
const inv1 = await p.evaluate(() => repairs.find(r => r.id === '4').invNo);
ok(/^F-\d{4}-001$/.test(inv1), 'première facture : ' + inv1);
ok(dl1.suggestedFilename().startsWith('Facture-' + inv1), 'PDF téléchargé : ' + dl1.suggestedFilename());
const [dl2] = await Promise.all([p.waitForEvent('download'), p.evaluate(() => genInvoice('6'))]);
ok(await p.evaluate(() => /-002$/.test(repairs.find(r => r.id === '6').invNo)), 'deuxième facture : numéro suivant sans trou');
await p.evaluate(() => genInvoice('4'));
ok(await p.evaluate((n) => repairs.find(r => r.id === '4').invNo === n, inv1), 'régénérer ne change pas le numéro');

// 3. Facture non supprimable
dialogs.length = 0; await p.evaluate(() => delRepair('4'));
ok(await p.evaluate(() => !!repairs.find(r => r.id === '4')) && /ne peut pas être supprimée/.test(dialogs.join()), 'réparation facturée : suppression refusée');

// 4. Assujetti : modèle de facture avec TVA 8,5 %
const m = await p.evaluate(() => {
  document.getElementById('pf_tva').value = 'assujetti'; onTvaRegimeChange(); saveProfil();
  return buildInvoiceModel({ prix: '100', acompte: '20', tasks: [{ lib: 'MO', pr: 60 }], parts: [{ nom: 'SSD', pr: 50 }] }, vatSettings());
});
ok(m.ht === 10000 && m.tva === 850 && m.ttc === 10850 && m.due === 8850 && m.lines.at(-1).label === 'Remise commerciale', `assujetti 8,5 % : HT ${m.ht / 100} TVA ${m.tva / 100} TTC ${m.ttc / 100}, reste ${m.due / 100}, écart prix → remise`);
ok(await p.evaluate(() => document.getElementById('pf_tvarate').value) === '8.5', 'taux proposé par défaut : 8,5');

// 5. Sauvegarde : fichier daté, schéma, empreinte ; rappel
await p.evaluate(() => { localStorage.removeItem('pd3_last_backup'); repairs.push({ id: '999', prenom: 'Réel', nom: 'Test', status: 'waiting', payment: 'pending', date: new Date().toISOString() }); SR(); updateBackupBanner(); });
ok(await p.evaluate(() => getComputedStyle(document.getElementById('backupBanner')).display) === 'flex', 'rappel affiché sans sauvegarde');
const [dlb] = await Promise.all([p.waitForEvent('download'), p.evaluate(() => exportBackup())]);
const path = '/tmp/claude-0/e2e-backup.json'; await dlb.saveAs(path);
const f = JSON.parse(fs.readFileSync(path, 'utf8'));
ok(/^pixeldoc-backup-\d{4}-\d{2}-\d{2}-\d{2}h\d{2}\.json$/.test(dlb.suggestedFilename()), 'nom de fichier daté : ' + dlb.suggestedFilename());
ok(f._schema === 2 && /^sha256:/.test(f._checksum) && f.data.repairs.length === 7 && f.data.seq && Object.keys(f.data.seq).length > 0, 'fichier : schéma 2, empreinte, compteurs de numérotation');
ok(!JSON.stringify(f).includes('pd3_pin'), 'le PIN n\'est pas exporté');
ok(await p.evaluate(() => getComputedStyle(document.getElementById('backupBanner')).display) === 'none', 'rappel masqué après sauvegarde');
await p.evaluate(() => localStorage.setItem('pd3_last_backup', new Date(Date.now() - 8 * 86400000).toISOString()) || updateBackupBanner());
ok(await p.evaluate(() => getComputedStyle(document.getElementById('backupBanner')).display) === 'flex', 'rappel de nouveau affiché après 8 jours');

// 6. Restauration : fichier altéré refusé sans rien changer ; fichier sain restaure
f.data.repairs[0].prix = '99999'; fs.writeFileSync('/tmp/claude-0/e2e-bad.json', JSON.stringify(f));
const before = await p.evaluate(() => localStorage.getItem('pd3_repairs'));
dialogs.length = 0;
await p.setInputFiles('input[type=file][accept=".json"]', '/tmp/claude-0/e2e-bad.json'); await p.waitForTimeout(400);
ok(/intégrité/.test(dialogs.join()) && (await p.evaluate(() => localStorage.getItem('pd3_repairs'))) === before, 'fichier altéré : refusé, données intactes');
await p.evaluate(() => { repairs = repairs.filter(r => r.id !== '999'); SR(); localStorage.removeItem('pd3_seq_inv_' + new Date().getFullYear()); });
dialogs.length = 0;
const dlSafety = p.waitForEvent('download');
await p.setInputFiles('input[type=file][accept=".json"]', path); await p.waitForTimeout(800);
ok((await dlSafety).suggestedFilename().startsWith('pixeldoc-avant-restauration'), 'copie de sécurité téléchargée avant restauration');
ok(await p.evaluate(() => !!repairs.find(r => r.id === '999') && localStorage.getItem('pd3_schema') === '2'), 'restauration : données revenues');
ok(await p.evaluate(() => localStorage.getItem('pd3_seq_inv_' + new Date().getFullYear()) === '2'), 'restauration : compteur de factures rétabli');

console.log(errs.length ? 'ERREURS JS : ' + errs.join(' | ') : 'aucune erreur JS');
await b.close();
process.exit(fail || errs.length ? 1 : 0);
