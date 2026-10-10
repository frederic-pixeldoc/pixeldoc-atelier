/* Calculs de montants — fonctions pures (aucun accès au DOM ni au stockage).
   Tous les montants sont manipulés en CENTIMES (entiers) pour éviter les erreurs de flottants ;
   les arrondis sont « au plus proche, demi vers le haut en valeur absolue » (règle usuelle de facturation).
   Chargé par le navigateur (window.PDCalc) et par les tests Node (require). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PDCalc = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* Taux de TVA en vigueur à La Réunion (art. 296 CGI) — source : impots.gouv.fr,
     « Quels sont les différents taux de TVA applicables dans les DOM ? ». À revérifier à chaque évolution légale. */
  const VAT_RATES_REUNION = { normal: 8.5, reduit: 2.1 };
  const DEFAULT_VAT_RATE = VAT_RATES_REUNION.normal;

  /* Division entière arrondie au plus proche, les demi s'éloignant de zéro. */
  function roundDiv(n, d) {
    const s = (n < 0) !== (d < 0) ? -1 : 1;
    return s * Math.floor((2 * Math.abs(n) + Math.abs(d)) / (2 * Math.abs(d)));
  }

  /* Euros (nombre ou texte « 12,5 » / « 12.50 ») → centimes entiers. Valeur invalide → 0. */
  function toCents(v) {
    if (v === null || v === undefined || v === '') return 0;
    const s = typeof v === 'number' ? String(v) : String(v).trim().replace(/\s/g, '').replace(',', '.');
    const n = Number(s);
    if (!isFinite(n)) return 0;
    const a = Math.abs(n), t = String(a);
    const c = /e/i.test(t) ? Math.round(a * 100) : Math.round(Number(t + 'e2'));   // 1.005 → 101 (et non 100)
    return n < 0 ? -c : c;
  }
  const fromCents = c => c / 100;
  const sumCents = list => list.reduce((s, c) => s + c, 0);
  /* Somme exacte d'une liste de montants en euros (nombres ou textes) → euros. */
  const sumEUR = list => fromCents(sumCents(list.map(toCents)));

  /* Taux (en %) → points de base entiers (8,5 % → 850). */
  const bp = rate => Math.round((Number(rate) || 0) * 100);

  /* TVA sur un montant HT. */
  const vatCents = (htCents, ratePct) => roundDiv(htCents * bp(ratePct), 10000);
  /* HT à partir d'un TTC : la TVA est le complément, de sorte que HT + TVA = TTC exactement. */
  function splitTTC(ttcCents, ratePct) {
    const ht = roundDiv(ttcCents * 10000, 10000 + bp(ratePct));
    return { ht, tva: ttcCents - ht, ttc: ttcCents };
  }

  /* Total d'une ligne : quantité (décimale possible, ex. 1,5 h) × prix unitaire en centimes. */
  const lineTotal = (qty, unitCents) => roundDiv(unitCents * Math.round((Number(qty) || 0) * 1000), 1000);

  /* Remise : {type:'percent', value:10} ou {type:'fixed', value:'5,00'} → montant de la remise en centimes,
     jamais négatif ni supérieur au montant remisé. */
  function discountCents(amountCents, d) {
    if (!d || amountCents <= 0) return 0;
    let r;
    if (d.type === 'percent') r = roundDiv(amountCents * Math.min(10000, Math.max(0, bp(d.value))), 10000);
    else r = Math.max(0, toCents(d.value));
    return Math.min(amountCents, r);
  }

  /* Calcul complet d'un document (devis / facture).
     opts.lines    : [{ qty, unit }]   unit en euros (nombre ou texte)
     opts.discount : remise globale (voir discountCents) ou null
     opts.vat      : { mode:'franchise' } ou { mode:'assujetti', rate:8.5, basis:'HT'|'TTC' }
     opts.deposit  : acompte déjà versé, en euros
     Un seul taux de TVA par document. */
  function computeDocument(opts) {
    const vat = opts.vat || {};
    const lines = (opts.lines || []).map(l => ({ ...l, cents: lineTotal(l.qty === undefined ? 1 : l.qty, toCents(l.unit)) }));
    const subtotal = sumCents(lines.map(l => l.cents));
    const discount = discountCents(subtotal, opts.discount);
    const net = subtotal - discount;
    let ht, tva, ttc;
    if (vat.mode === 'assujetti') {
      if (vat.basis === 'TTC') ({ ht, tva, ttc } = splitTTC(net, vat.rate));
      else { ht = net; tva = vatCents(net, vat.rate); ttc = ht + tva; }
    } else { ht = net; tva = 0; ttc = net; }              // franchise en base : pas de TVA
    const deposit = Math.min(Math.max(0, toCents(opts.deposit)), Math.max(0, ttc));
    return {
      lines, subtotal, discount, ht, tva, ttc, deposit,
      depositExceeds: toCents(opts.deposit) > ttc,
      due: ttc - deposit,
      mode: vat.mode === 'assujetti' ? 'assujetti' : 'franchise',
      rate: vat.mode === 'assujetti' ? Number(vat.rate) || 0 : 0,
    };
  }

  /* Écart entre le prix convenu (champ « Prix ») et la somme des lignes détaillées :
     > 0 = supplément à faire apparaître, < 0 = remise à faire apparaître, 0 = cohérent. */
  const priceGap = (linesCents, agreedCents) => agreedCents - linesCents;

  /* Affichage : « 120 € » / « 120,50 € » (sans séparateur de milliers : la police PDF standard n'a pas l'espace insécable). */
  function formatEUR(cents, alwaysDecimals) {
    const neg = cents < 0, a = Math.abs(cents), e = Math.floor(a / 100), c = a % 100;
    const body = (c === 0 && !alwaysDecimals) ? String(e) : `${e},${String(c).padStart(2, '0')}`;
    return (neg ? '-' : '') + body + ' €';
  }

  return { VAT_RATES_REUNION, DEFAULT_VAT_RATE, roundDiv, toCents, fromCents, sumCents, sumEUR, vatCents, splitTTC,
           lineTotal, discountCents, computeDocument, priceGap, formatEUR };
});
