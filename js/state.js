'use strict';
/* ==================== DATA ==================== */
// Migration des données du navigateur vers le schéma courant (additive, annulée si une écriture échoue).
try { PDBackup.migrateStore({ get: k => localStorage.getItem(k), set: (k, v) => localStorage.setItem(k, v) }); } catch(e) {}
// Lecture sûre : un contenu illisible n'est jamais écrasé, il est mis de côté sous une autre clé.
function loadList(key) {
  const raw = localStorage.getItem(key);
  if (raw === null) return [];
  try { const v = JSON.parse(raw); if (Array.isArray(v)) return v; } catch(e) {}
  try { localStorage.setItem(key + '_illisible_' + Date.now(), raw); } catch(e) {}
  setTimeout(() => alert('⚠ Les données « ' + key + ' » sont illisibles. Une copie brute a été conservée dans le navigateur ; restaurez une sauvegarde.'), 500);
  return [];
}
let repairs = loadList('pd3_repairs');
let stock   = loadList('pd3_stock');
let photos  = [];
let editId  = null;
let editSId = null;
let curFilter = 'all';
let curSearch = '';
let chart   = null;

/* PIN */
let pinBuf = '';
let pinMode = 'login'; // login | setup_new | setup_confirm
let newPin  = '';

/* ==================== PERSIST ==================== */
function showQuotaBanner() {
  document.getElementById('quotaBanner').style.display = 'block';
}
function SR() {
  try { localStorage.setItem('pd3_repairs', JSON.stringify(repairs)); }
  catch(e) { if(e.name==='QuotaExceededError'||e.name==='NS_ERROR_DOM_QUOTA_REACHED') showQuotaBanner(); }
}
function SS() {
  try { localStorage.setItem('pd3_stock', JSON.stringify(stock)); }
  catch(e) { if(e.name==='QuotaExceededError'||e.name==='NS_ERROR_DOM_QUOTA_REACHED') showQuotaBanner(); }
}

/* ==================== STATUS MAPS ==================== */
const SL = {waiting:'En attente',progress:'En cours',done:'Terminée',urgent:'Urgent'};
const SC = {waiting:'sw',progress:'sp',done:'sd',urgent:'su'};
const SE = {waiting:'⏳',progress:'🔧',done:'✅',urgent:'🚨'};
const PL = {paid:'✅ Payé',pending:'⏳ Attente',partial:'🔶 Acompte'};
const PC = {paid:'pay-paid',pending:'pay-pending',partial:'pay-partial'};
const CE = {Stockage:'💾',RAM:'🧠',Clavier:'⌨️',Batterie:'🔋',Écran:'🖥️',Alimentation:'⚡',Connectique:'🔌',Autre:'📦'};

