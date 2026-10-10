import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const C = createRequire(import.meta.url)('../js/calc.js');

test('toCents : virgule, point, flottants piégeux, invalide', () => {
  assert.equal(C.toCents('12,5'), 1250);
  assert.equal(C.toCents('12.50'), 1250);
  assert.equal(C.toCents(1.005), 101);          // 1.005 * 100 = 100.49999… en flottant
  assert.equal(C.toCents(0.1 + 0.2), 30);
  assert.equal(C.toCents(''), 0);
  assert.equal(C.toCents('abc'), 0);
  assert.equal(C.toCents(null), 0);
  assert.equal(C.toCents(-2.675), -268);
  assert.equal(C.toCents(1e-7), 0);
});

test('TVA 8,5 % La Réunion : cas concrets', () => {
  assert.equal(C.DEFAULT_VAT_RATE, 8.5);
  assert.equal(C.vatCents(10000, 8.5), 850);    // 100,00 € HT → 8,50 €
  assert.equal(C.vatCents(4500, 8.5), 383);     // 45 € → 3,825 → 3,83
  assert.equal(C.vatCents(3333, 8.5), 283);     // 33,33 → 2,83305 → 2,83
  assert.equal(C.vatCents(0, 8.5), 0);
  assert.equal(C.vatCents(10000, 2.1), 210);    // taux réduit
});

test('TTC → HT : HT + TVA = TTC exactement', () => {
  const s = C.splitTTC(10850, 8.5);
  assert.deepEqual(s, { ht: 10000, tva: 850, ttc: 10850 });
  for (const ttc of [1, 99, 1234, 99999]) { const r = C.splitTTC(ttc, 8.5); assert.equal(r.ht + r.tva, ttc); }
});

test('ligne : quantité décimale et arrondi', () => {
  assert.equal(C.lineTotal(3, 1999), 5997);
  assert.equal(C.lineTotal(1.5, 4500), 6750);   // 1,5 h à 45 €
  assert.equal(C.lineTotal(0.1, 1999), 200);    // 199,9 → 200
});

test('remises : pourcentage, fixe, plafonnées', () => {
  assert.equal(C.discountCents(20000, { type: 'percent', value: 10 }), 2000);
  assert.equal(C.discountCents(3333, { type: 'percent', value: 15 }), 500);   // 499,95 → 500
  assert.equal(C.discountCents(5000, { type: 'fixed', value: '12,50' }), 1250);
  assert.equal(C.discountCents(1000, { type: 'fixed', value: 50 }), 1000);    // plafonnée au montant
  assert.equal(C.discountCents(1000, { type: 'percent', value: 150 }), 1000);
  assert.equal(C.discountCents(1000, { type: 'fixed', value: -5 }), 0);
  assert.equal(C.discountCents(1000, null), 0);
});

test('document en franchise de TVA : total = somme des lignes', () => {
  const d = C.computeDocument({ lines: [{ unit: '35' }, { unit: '40' }, { unit: '45.10' }], vat: { mode: 'franchise' }, deposit: '20' });
  assert.equal(d.ht, 12010); assert.equal(d.tva, 0); assert.equal(d.ttc, 12010);
  assert.equal(d.due, 10010); assert.equal(d.mode, 'franchise');
});

test('document assujetti, prix saisis HT, remise 10 % et acompte', () => {
  const d = C.computeDocument({
    lines: [{ qty: 1, unit: 45 }, { qty: 2, unit: '19,99' }],
    discount: { type: 'percent', value: 10 },
    vat: { mode: 'assujetti', rate: 8.5, basis: 'HT' }, deposit: 20,
  });
  assert.equal(d.subtotal, 8498);               // 45 + 39,98 = 84,98
  assert.equal(d.discount, 850);                // 8,498 → 8,50
  assert.equal(d.ht, 7648);
  assert.equal(d.tva, 650);                     // 76,48 × 8,5 % = 6,5008
  assert.equal(d.ttc, 8298);
  assert.equal(d.due, 6298);
  assert.equal(d.ht + d.tva, d.ttc);
});

test('document assujetti, prix saisis TTC', () => {
  const d = C.computeDocument({ lines: [{ unit: 108.5 }], vat: { mode: 'assujetti', rate: 8.5, basis: 'TTC' } });
  assert.deepEqual([d.ht, d.tva, d.ttc], [10000, 850, 10850]);
});

test('acompte supérieur au total : plafonné et signalé, reste à payer jamais négatif', () => {
  const d = C.computeDocument({ lines: [{ unit: 50 }], vat: { mode: 'franchise' }, deposit: 80 });
  assert.equal(d.deposit, 5000); assert.equal(d.due, 0); assert.equal(d.depositExceeds, true);
});

test('somme de nombreuses lignes à 0,10 € : pas de dérive de flottants', () => {
  const d = C.computeDocument({ lines: Array.from({ length: 100 }, () => ({ unit: 0.1 })), vat: { mode: 'franchise' } });
  assert.equal(d.ttc, 1000);
});

test('écart prix convenu / lignes', () => {
  assert.equal(C.priceGap(12000, 11000), -1000);
  assert.equal(C.priceGap(12000, 12000), 0);
  assert.equal(C.priceGap(12000, 12550), 550);
});

test('formatEUR', () => {
  assert.equal(C.formatEUR(12000), '120 €');
  assert.equal(C.formatEUR(12050), '120,50 €');
  assert.equal(C.formatEUR(5), '0,05 €');
  assert.equal(C.formatEUR(-1250), '-12,50 €');
  assert.equal(C.formatEUR(12000, true), '120,00 €');
});
