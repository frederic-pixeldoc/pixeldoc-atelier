'use strict';
/* ==================== DATA ==================== */
let repairs = JSON.parse(localStorage.getItem('pd3_repairs') || '[]');
let stock   = JSON.parse(localStorage.getItem('pd3_stock')   || '[]');
let photos  = [];
let editId  = null;
let editSId = null;
let curFilter = 'all';
let curSearch = '';
let chart   = null;

/* PIN */
// Code par défaut : seule son empreinte (PBKDF2) est dans le code, jamais le code lui-même.
const DEF_PIN_H = 'v1:150000:8468a4707856bfd931c791f7a0da2fed:76e01fb6dbe05c1f23719f713f92cf067db721eef60d8654ccaaba6bd7572038';
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

