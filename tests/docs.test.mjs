import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const D = createRequire(import.meta.url)('../js/docs-core.js');

test('numérotation : première facture de l\'année', () => {
  assert.deepEqual(D.nextNumber('F', 2026, 0, []), { counter: 1, number: 'F-2026-001' });
});
test('numérotation : continue, sans saut ni doublon', () => {
  let c = 0; const seen = [];
  for (let i = 0; i < 12; i++) { const r = D.nextNumber('F', 2026, c, seen); c = r.counter; seen.push(r.number); }
  assert.equal(seen[11], 'F-2026-012');
  assert.deepEqual(D.findGaps(seen, 2026), []);
});
test('numérotation : après restauration, reprend après le plus grand numéro existant', () => {
  assert.equal(D.nextNumber('F', 2026, 0, ['F-2026-007', 'F-2026-003']).number, 'F-2026-008');
});
test('numérotation : une nouvelle année repart à 001, les anciens numéros ne comptent pas', () => {
  assert.equal(D.nextNumber('F', 2027, 0, ['F-2026-044']).number, 'F-2027-001');
});
test('numérotation : détection de trou (facture supprimée)', () => {
  assert.deepEqual(D.findGaps(['F-2026-001', 'F-2026-002', 'F-2026-004'], 2026), [3]);
});

test('SIREN / SIRET : clé de Luhn', () => {
  assert.equal(D.isValidSiren('732 829 320'), true);      // SIREN d'exemple valide (Luhn)
  assert.equal(D.isValidSiren('732829321'), false);
  assert.equal(D.isValidSiret('73282932000074'), true);
  assert.equal(D.isValidSiret('73282932000075'), false);
  assert.equal(D.isValidSiret('123'), false);
});

const profilOK = { pf_nom: 'Atelier Test', pf_adr: '1 rue Exemple, 97400 Saint-Denis', pf_siret: '73282932000074', pf_rne: 'x', pf_tva: 'franchise' };
const docOK = { kind: 'facture', number: 'F-2026-001', issueDate: '2026-10-10', serviceDate: '2026-10-09', clientName: 'Client Test', totals: { ht: 100, tva: 0, ttc: 100 } };
const codes = (p, d) => D.checkMentions(p, d).map(x => x.code);

test('mentions : facture complète en franchise → rien à signaler', () => {
  assert.deepEqual(D.checkMentions(profilOK, docOK), []);
});
test('mentions : régime TVA non choisi = erreur (rien n\'est supposé)', () => {
  assert.ok(codes({ ...profilOK, pf_tva: '' }, docOK).includes('vat-regime'));
});
test('mentions : assujetti sans n° de TVA intracommunautaire ni taux = erreurs', () => {
  const c = codes({ ...profilOK, pf_tva: 'assujetti' }, docOK);
  assert.ok(c.includes('vat-number') && c.includes('vat-rate'));
  assert.deepEqual(codes({ ...profilOK, pf_tva: 'assujetti', pf_tvarate: '8.5', pf_tvaintra: 'FR12345678901' }, docOK), []);
});
test('mentions : identité vendeur, client, date, numéro, totaux', () => {
  assert.ok(codes({ pf_tva: 'franchise' }, docOK).includes('seller-name'));
  assert.ok(codes({ pf_tva: 'franchise' }, docOK).includes('seller-address'));
  assert.ok(codes({ pf_tva: 'franchise' }, docOK).includes('seller-id'));
  const bad = { ...docOK, number: 'FACT1', issueDate: '', clientName: ' ', totals: { ht: 100, tva: 8, ttc: 100 } };
  const c = codes(profilOK, bad);
  for (const k of ['number', 'issue-date', 'client-name', 'totals']) assert.ok(c.includes(k), k);
});
test('mentions : un devis n\'exige pas de date de prestation', () => {
  assert.ok(!codes(profilOK, { ...docOK, kind: 'devis', number: 'DV-2026-001', serviceDate: undefined }).includes('service-date'));
});
