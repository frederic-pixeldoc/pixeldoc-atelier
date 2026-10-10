'use strict';
/* ==================== INIT APP ==================== */
function initApp() {
  updatePinBanner();
  updateBackupBanner();
  renderDashStats();
  renderChart();
  renderRecent();
  renderRepairs();
  renderPayments();
  renderStock();
  updateBadges();
  // v4 modules
  loadProfil();
  loadHyp();
  recalcViab();
  renderTarifs();
  renderRecon();
  buildQuoteSelect();
  buildPrestSelect();
  renderQuote();
  const dvd = document.getElementById('dv_date');
  if (dvd && !dvd.value) dvd.value = new Date().toISOString().slice(0,10);
}

/* ==================== SIDEBAR ==================== */
function toggleSB() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sbOverlay').classList.toggle('open');
}
function closeSB() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sbOverlay').classList.remove('open');
}

/* ==================== PAGES ==================== */
function showPage(p, el) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  el.classList.add('active');
  document.querySelectorAll('.page').forEach(s => s.classList.remove('active'));
  const tgt = document.getElementById('page-'+p); if (tgt) tgt.classList.add('active');
  if (p === 'done')     renderDone();
  if (p === 'payments') renderPayments();
  if (p === 'stock')    renderStock();
  if (p === 'repairs')  renderRepairs();
  if (p === 'tarifs')   renderTarifs();
  if (p === 'devis')    { buildQuoteSelect(); renderQuote(); if(!document.getElementById('dv_date').value) document.getElementById('dv_date').value=new Date().toISOString().slice(0,10); }
  if (p === 'viab')     recalcViab();
  if (p === 'recon')    renderRecon();
  if (p === 'profil')   loadProfil();
  closeSB();
}

