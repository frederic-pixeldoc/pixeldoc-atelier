import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const B = createRequire(import.meta.url)('../js/backup-core.js');

const sample = () => ({
  repairs: [{ id: '1', nom: 'Test', prix: '50', invNo: 'F-2026-001' }, { id: '2', nom: 'Test2', tasks: [{ lib: 'x', pr: 1 }] }],
  stock: [{ id: 's1', nom: 'SSD', qty: '3', min: 1 }],
  profil: { pf_nom: 'Atelier' }, recon: [], hyp: {}, seq: { inv_2026: 1 },
});

test('aller-retour : export puis import redonne les mêmes données', async () => {
  const f = await B.buildBackup(sample());
  const r = await B.parseBackup(JSON.stringify(f));
  assert.equal(r.ok, true, r.errors.join());
  assert.equal(r.counts.repairs, 2); assert.equal(r.counts.invoices, 1);
  assert.equal(r.data.repairs[0].nom, 'Test'); assert.equal(r.data.seq.inv_2026, 1);
  assert.equal(r.data.stock[0].qty, 3);                   // « 3 » → 3 (migration)
  assert.deepEqual(r.warnings, []);
});

test('intégrité : une modification du contenu est détectée et refusée', async () => {
  const f = await B.buildBackup(sample());
  f.data.repairs[0].prix = '5000';
  const r = await B.parseBackup(JSON.stringify(f));
  assert.equal(r.ok, false); assert.match(r.errors[0], /intégrité/);
});

test('fichier tronqué / non JSON / étranger', async () => {
  const f = JSON.stringify(await B.buildBackup(sample()));
  assert.equal((await B.parseBackup(f.slice(0, f.length - 40))).ok, false);
  assert.equal((await B.parseBackup('pas du json')).ok, false);
  assert.equal((await B.parseBackup('{"hello":1}')).ok, false);
  assert.equal((await B.parseBackup('[]')).ok, false);
});

test('schéma plus récent que l\'appli : refusé avec message clair', async () => {
  const r = await B.parseBackup(JSON.stringify({ _app: B.APP, _schema: 99, data: {} }));
  assert.equal(r.ok, false); assert.match(r.errors[0], /plus récente/);
});

test('ancienne sauvegarde (schéma 1) : migrée, avec avertissement', async () => {
  const v1 = { _version: 1, _date: '2026-01-01T00:00:00Z', pd3_repairs: [{ id: 7, nom: 'Ancien' }], pd3_stock: [], pd3_profil: { pf_nom: 'A' }, pd3_recon: [], pd3_hyp: {} };
  const r = await B.parseBackup(JSON.stringify(v1));
  assert.equal(r.ok, true); assert.equal(r.schema, 1);
  assert.equal(r.data.repairs[0].id, '7'); assert.deepEqual(r.data.repairs[0].parts, []);
  assert.equal(r.warnings.length, 1);
});

test('identifiants ou numéros de facture en double : refusé', async () => {
  const d = sample(); d.repairs.push({ id: '1' });
  assert.equal((await B.parseBackup(JSON.stringify(await B.buildBackup(d)))).ok, false);
  const e = sample(); e.repairs[1].invNo = 'F-2026-001';
  assert.equal((await B.parseBackup(JSON.stringify(await B.buildBackup(e)))).ok, false);
});

test('rappel de sauvegarde : seuil de 7 jours', () => {
  const now = Date.parse('2026-10-10T12:00:00Z'), day = 86400000;
  const st = (lastBackup, extra = {}) => B.backupStatus({ lastBackup, hasData: true, now, ...extra });
  assert.equal(st(null).due, true);
  assert.equal(st(new Date(now - 6 * day).toISOString()).due, false);
  assert.equal(st(new Date(now - 7 * day).toISOString()).due, true);
  assert.equal(st(new Date(now - 30 * day).toISOString(), { snoozeUntil: now + 1000 }).due, false);
  assert.equal(B.backupStatus({ lastBackup: null, hasData: false, now }).due, false);
});

function fakeStore(init, failOn) {
  const m = new Map(Object.entries(init));
  return { m, get: k => (m.has(k) ? m.get(k) : null), set: (k, v) => { if (k === failOn) throw new Error('quota'); m.set(k, v); } };
}

test('migration locale : ajoute les champs manquants sans rien perdre, idempotente', () => {
  const s = fakeStore({ pd3_repairs: JSON.stringify([{ id: 1, prenom: 'A', prix: '12', custom: 'garde-moi' }]), pd3_stock: '[]' });
  assert.equal(B.migrateStore(s).migrated, true);
  const r = JSON.parse(s.get('pd3_repairs'))[0];
  assert.equal(r.custom, 'garde-moi'); assert.equal(r.prix, '12'); assert.deepEqual(r.photos, []); assert.equal(r.id, '1');
  assert.equal(s.get('pd3_schema'), String(B.SCHEMA));
  assert.equal(B.migrateStore(s).migrated, false);
});

test('migration locale : contenu illisible laissé intact', () => {
  const s = fakeStore({ pd3_repairs: '{corrompu', pd3_stock: '[]' });
  B.migrateStore(s);
  assert.equal(s.get('pd3_repairs'), '{corrompu');
});

test('migration locale : échec d\'écriture → retour à l\'état précédent', () => {
  const orig = JSON.stringify([{ id: 1 }]);
  const s = fakeStore({ pd3_repairs: orig, pd3_stock: '[]' }, 'pd3_stock');
  const r = B.migrateStore(s);
  assert.equal(r.migrated, false);
  assert.equal(s.get('pd3_repairs'), orig);
  assert.equal(s.get('pd3_schema'), null);
});

test('sécurité : identifiant contenant du code HTML/JS refusé à l\'import', async () => {
  const d = sample(); d.repairs[0].id = "1');alert(1);('";
  const r = await B.parseBackup(JSON.stringify(await B.buildBackup(d)));
  assert.equal(r.ok, false); assert.match(r.errors[0], /invalide/);
});
