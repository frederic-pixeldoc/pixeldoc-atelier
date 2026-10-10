/* Règles des documents (devis / factures) — fonctions pures : numérotation et contrôle des mentions obligatoires.
   Chargé par le navigateur (window.PDDocs) et par les tests Node. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PDDocs = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const MENTION_FRANCHISE = 'TVA non applicable, article 293 B du CGI.';
  const mentionAssujetti = rate => `TVA au taux de ${String(rate).replace('.', ',')} %.`;

  /* Numérotation chronologique continue, une séquence par type de document et par année : « F-2026-001 ».
     counter : dernier numéro attribué (stocké), existing : numéros déjà présents dans les données.
     On repart toujours du plus grand numéro connu, pour ne jamais réutiliser ni sauter un numéro après une restauration. */
  function nextNumber(prefix, year, counter, existing) {
    const re = new RegExp(`-${year}-(\\d+)$`);
    let n = Number(counter) || 0;
    (existing || []).forEach(x => { const m = String(x || '').match(re); if (m) n = Math.max(n, +m[1]); });
    n += 1;
    return { counter: n, number: `${prefix}-${year}-${String(n).padStart(3, '0')}` };
  }

  /* Trous dans une série de numéros d'une année (liste de « F-2026-003 »…) → numéros manquants. */
  function findGaps(numbers, year) {
    const re = new RegExp(`-${year}-(\\d+)$`);
    const ns = numbers.map(x => (String(x).match(re) || [])[1]).filter(Boolean).map(Number).sort((a, b) => a - b);
    const gaps = [];
    for (let i = 1; i <= (ns[ns.length - 1] || 0); i++) if (!ns.includes(i)) gaps.push(i);
    return gaps;
  }

  /* SIREN / SIRET : 9 / 14 chiffres, clé de Luhn (la Poste, SIREN 356000000, fait exception pour le SIRET). */
  function luhn(d) {
    let s = 0;
    for (let i = 0; i < d.length; i++) {
      let x = +d[d.length - 1 - i];
      if (i % 2) { x *= 2; if (x > 9) x -= 9; }
      s += x;
    }
    return s % 10 === 0;
  }
  const digits = v => String(v || '').replace(/\s/g, '');
  const isValidSiren = v => /^\d{9}$/.test(digits(v)) && luhn(digits(v));
  const isValidSiret = v => /^\d{14}$/.test(digits(v)) && (luhn(digits(v)) || digits(v).startsWith('356000000'));

  const isDate = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v) && !isNaN(new Date(v).getTime());

  /* Contrôle des mentions obligatoires d'une facture ou d'un devis.
     profil : champs du Profil (pf_*) ; d : { kind:'facture'|'devis', number, issueDate, serviceDate, clientName, totals }
     Renvoie une liste { level:'error'|'warn', code, msg } ; liste vide = rien à signaler. */
  function checkMentions(profil, d) {
    const p = profil || {}, out = [];
    const add = (level, code, msg) => out.push({ level, code, msg });
    const has = k => !!(p[k] && String(p[k]).trim());
    const regime = p.pf_tva;
    if (!has('pf_nom')) add('error', 'seller-name', 'Nom ou dénomination de l\'atelier (Profil)');
    if (!has('pf_adr')) add('error', 'seller-address', 'Adresse de l\'atelier (Profil)');
    if (!has('pf_siret') && !has('pf_siren')) add('error', 'seller-id', 'SIRET ou SIREN (Profil)');
    else if (has('pf_siret') ? !isValidSiret(p.pf_siret) : !isValidSiren(p.pf_siren)) add('warn', 'seller-id-format', 'SIRET/SIREN : format ou clé de contrôle invalide (Profil)');
    if (!has('pf_rne') && !has('pf_rm')) add('warn', 'seller-register', 'Immatriculation (RNE ou répertoire des métiers) (Profil)');
    if (regime !== 'franchise' && regime !== 'assujetti') add('error', 'vat-regime', 'Régime de TVA non choisi (Profil)');
    if (regime === 'assujetti') {
      if (!(Number(p.pf_tvarate) > 0)) add('error', 'vat-rate', 'Taux de TVA (Profil)');
      if (!has('pf_tvaintra')) add('error', 'vat-number', 'Numéro de TVA intracommunautaire (Profil)');
    }
    if (d) {
      if (!/^[A-Z]+-\d{4}-\d{3,}$/.test(d.number || '')) add('error', 'number', 'Numéro de document au format PRÉFIXE-AAAA-NNN');
      if (!isDate(d.issueDate)) add('error', 'issue-date', 'Date d\'émission');
      if (d.kind === 'facture' && !isDate(d.serviceDate)) add('warn', 'service-date', 'Date de la prestation');
      if (!d.clientName || !String(d.clientName).trim()) add('error', 'client-name', 'Nom du client');
      const t = d.totals;
      if (t && t.ht + t.tva !== t.ttc) add('error', 'totals', 'Totaux incohérents (HT + TVA ≠ TTC)');
    }
    return out;
  }

  return { MENTION_FRANCHISE, mentionAssujetti, nextNumber, findGaps, isValidSiren, isValidSiret, checkMentions };
});
