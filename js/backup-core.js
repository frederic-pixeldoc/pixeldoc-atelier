/* Sauvegarde / restauration / migration — logique pure, sans DOM.
   Chargé par le navigateur (window.PDBackup) et par les tests Node.

   Format du fichier (schéma 2) :
     { _app:'pixeldoc-atelier', _schema:2, _date:ISO, _checksum:'sha256:…', data:{ repairs, stock, profil, recon, hyp, seq } }
   Le code PIN n'est volontairement PAS exporté. Le schéma 1 (anciennes sauvegardes : clés pd3_* à plat, sans contrôle) reste lisible. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PDBackup = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const APP = 'pixeldoc-atelier';
  const SCHEMA = 2;                  // schéma des fichiers de sauvegarde ET des données du navigateur
  const BACKUP_DELAY_DAYS = 7;

  /* JSON à clés triées : même contenu = même texte = même empreinte. */
  function canonical(v) {
    if (Array.isArray(v)) return '[' + v.map(canonical).join(',') + ']';
    if (v && typeof v === 'object') return '{' + Object.keys(v).sort().filter(k => v[k] !== undefined).map(k => JSON.stringify(k) + ':' + canonical(v[k])).join(',') + '}';
    return JSON.stringify(v);
  }

  /* Empreinte SHA-256 (WebCrypto). Sans WebCrypto (contexte non sécurisé) : repli cyrb53, moins robuste mais détecte une corruption. */
  async function checksum(text) {
    const c = typeof globalThis !== 'undefined' ? globalThis.crypto : null;
    if (c && c.subtle) {
      const h = await c.subtle.digest('SHA-256', new TextEncoder().encode(text));
      return 'sha256:' + [...new Uint8Array(h)].map(x => x.toString(16).padStart(2, '0')).join('');
    }
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < text.length; i++) {
      const ch = text.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return 'cyrb53:' + (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
  }

  /* Migration d'une réparation : ajoute les champs manquants, ne supprime ni ne réécrit aucune valeur existante. */
  function migrateRepair(r) {
    const o = { ...r };
    if (o.id === undefined || o.id === null || o.id === '') return o;       // l'absence d'identifiant est signalée par la validation
    o.id = String(o.id);
    if (!Array.isArray(o.tasks)) o.tasks = [];
    if (!Array.isArray(o.parts)) o.parts = [];
    if (!Array.isArray(o.photos)) o.photos = [];
    if (!o.status) o.status = 'waiting';
    if (!o.payment) o.payment = 'pending';
    return o;
  }
  function migrateStockItem(s) {
    const o = { ...s };
    if (o.id !== undefined && o.id !== null) o.id = String(o.id);
    o.qty = Number.isFinite(+o.qty) ? Math.trunc(+o.qty) : 0;
    o.min = Number.isFinite(+o.min) ? Math.trunc(+o.min) : 0;
    return o;
  }

  const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/;      // les identifiants sont insérés dans des attributs HTML : caractères sûrs uniquement
  const isObj = v => v && typeof v === 'object' && !Array.isArray(v);

  /* Valide et normalise un bloc de données (schéma 2). Renvoie la liste d'erreurs bloquantes. */
  function validateData(d) {
    const errors = [];
    if (!isObj(d)) return ['Contenu de sauvegarde absent ou illisible'];
    if (!Array.isArray(d.repairs)) errors.push('Liste des réparations absente');
    if (!Array.isArray(d.stock)) errors.push('Liste du stock absente');
    if (d.profil !== undefined && !isObj(d.profil)) errors.push('Profil illisible');
    if (d.recon !== undefined && !Array.isArray(d.recon)) errors.push('Catalogue reconditionné illisible');
    if (d.hyp !== undefined && !isObj(d.hyp)) errors.push('Hypothèses illisibles');
    if (d.seq !== undefined && (!isObj(d.seq) || Object.values(d.seq).some(v => !Number.isInteger(v) || v < 0))) errors.push('Compteurs de numérotation illisibles');
    if (errors.length) return errors;
    const seen = new Set();
    d.repairs.forEach((r, i) => {
      if (!isObj(r) || r.id === undefined || r.id === null || r.id === '') errors.push(`Réparation n°${i + 1} sans identifiant`);
      else if (!SAFE_ID.test(String(r.id))) errors.push(`Identifiant de réparation invalide : ${String(r.id).slice(0, 30)}`);
      else if (seen.has(String(r.id))) errors.push(`Identifiant de réparation en double : ${r.id}`);
      else seen.add(String(r.id));
    });
    const seenS = new Set();
    d.stock.forEach((s, i) => {
      if (!isObj(s) || s.id === undefined || s.id === null || s.id === '') errors.push(`Pièce n°${i + 1} sans identifiant`);
      else if (!SAFE_ID.test(String(s.id))) errors.push(`Identifiant de pièce invalide : ${String(s.id).slice(0, 30)}`);
      else if (seenS.has(String(s.id))) errors.push(`Identifiant de pièce en double : ${s.id}`);
      else seenS.add(String(s.id));
    });
    const nos = new Set();
    d.repairs.forEach(r => { if (isObj(r) && r.invNo) { if (nos.has(r.invNo)) errors.push(`Numéro de facture en double : ${r.invNo}`); nos.add(r.invNo); } });
    return errors;
  }

  function normalizeData(d) {
    return {
      repairs: d.repairs.map(migrateRepair),
      stock: d.stock.map(migrateStockItem),
      profil: d.profil || {},
      recon: d.recon || [],
      hyp: d.hyp || {},
      seq: d.seq || {},
    };
  }

  /* Schéma 1 → données du schéma 2. Les compteurs ne figuraient pas dans l'ancien format : ils seront
     reconstruits depuis les numéros de facture présents dans les réparations. */
  function fromV1(o) {
    return {
      repairs: o.pd3_repairs || [], stock: o.pd3_stock || [], profil: o.pd3_profil || {},
      recon: Array.isArray(o.pd3_recon) ? o.pd3_recon : [], hyp: o.pd3_hyp || {}, seq: {},
    };
  }

  /* Construit le contenu d'un fichier de sauvegarde. */
  async function buildBackup(data, now) {
    const body = normalizeData({ repairs: [], stock: [], ...data });
    return { _app: APP, _schema: SCHEMA, _date: (now || new Date()).toISOString(), _checksum: await checksum(canonical(body)), data: body };
  }

  /* Lit, contrôle et migre le texte d'un fichier. Ne modifie rien : renvoie { ok, errors, warnings, data, schema, counts }. */
  async function parseBackup(text) {
    const res = { ok: false, errors: [], warnings: [], data: null, schema: null, date: null, counts: null };
    let o;
    try { o = JSON.parse(text); } catch { res.errors.push('Fichier illisible : ce n\'est pas du JSON valide (fichier tronqué ou corrompu ?)'); return res; }
    if (!isObj(o)) { res.errors.push('Ce fichier ne ressemble pas à une sauvegarde PixelDoc'); return res; }
    let data;
    if (o._schema === undefined && (o._version === 1 || o.pd3_repairs || o.pd3_stock)) {
      res.schema = 1; res.date = o._date || null;
      res.warnings.push('Ancienne sauvegarde (schéma 1) : elle n\'a pas de contrôle d\'intégrité, vérifiez les chiffres après restauration.');
      data = fromV1(o);
    } else if (o._app === APP && Number.isInteger(o._schema)) {
      res.schema = o._schema; res.date = o._date || null;
      if (o._schema > SCHEMA) { res.errors.push(`Cette sauvegarde vient d'une version plus récente de l'appli (schéma ${o._schema}) : mettez l'appli à jour avant de la restaurer.`); return res; }
      data = o.data;
      if (!o._checksum) res.warnings.push('Sauvegarde sans empreinte : intégrité non vérifiable.');
      else if (isObj(data)) {
        const algo = String(o._checksum).split(':')[0];
        const got = await checksum(canonical(data));
        if (got.split(':')[0] === algo && got !== o._checksum) { res.errors.push('Contrôle d\'intégrité échoué : le fichier a été modifié ou est corrompu. Il n\'a pas été restauré.'); return res; }
        if (got.split(':')[0] !== algo) res.warnings.push(`Empreinte ${algo} non vérifiable sur ce navigateur.`);
      }
    } else { res.errors.push('Ce fichier ne ressemble pas à une sauvegarde PixelDoc'); return res; }
    const errs = validateData(data);
    if (errs.length) { res.errors.push(...errs); return res; }
    res.data = normalizeData(data);
    res.counts = { repairs: res.data.repairs.length, stock: res.data.stock.length, invoices: res.data.repairs.filter(r => r.invNo).length };
    res.ok = true;
    return res;
  }

  /* Rappel : le dernier export date-t-il de plus de `delay` jours (ou n'a jamais eu lieu) alors qu'il y a des données ? */
  function backupStatus({ lastBackup, hasData, snoozeUntil, now, delay }) {
    const t = now === undefined ? Date.now() : now, d = delay === undefined ? BACKUP_DELAY_DAYS : delay;
    const last = lastBackup ? new Date(lastBackup).getTime() : NaN;
    const days = isNaN(last) ? null : Math.max(0, Math.floor((t - last) / 86400000));
    return { days, due: !!hasData && (days === null || days >= d) && t > (+snoozeUntil || 0) };
  }

  /* Migration des données du navigateur (clés pd3_*) vers le schéma courant.
     store = { get(k), set(k,v) }. Additive et idempotente : les nouvelles valeurs sont calculées d'abord,
     écrites ensuite, et ramenées à l'état précédent si une écriture échoue. */
  function migrateStore(store) {
    const from = +store.get('pd3_schema') || 1;
    if (from >= SCHEMA) return { migrated: false, from };
    const writes = {};
    ['pd3_repairs', 'pd3_stock'].forEach(k => {
      const raw = store.get(k); if (raw === null || raw === undefined) return;
      let arr; try { arr = JSON.parse(raw); } catch { return; }          // contenu illisible : on n'y touche pas
      if (!Array.isArray(arr)) return;
      writes[k] = JSON.stringify(arr.map(k === 'pd3_repairs' ? migrateRepair : migrateStockItem));
    });
    writes.pd3_schema = String(SCHEMA);
    const before = {}, done = [];
    try { Object.keys(writes).forEach(k => { before[k] = store.get(k); store.set(k, writes[k]); done.push(k); }); }
    catch (e) { done.forEach(k => { if (before[k] !== null && before[k] !== undefined) store.set(k, before[k]); }); return { migrated: false, from, error: e }; }
    return { migrated: true, from };
  }

  return { APP, SCHEMA, BACKUP_DELAY_DAYS, canonical, checksum, migrateRepair, validateData, buildBackup, parseBackup, backupStatus, migrateStore };
});
