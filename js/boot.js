'use strict';
/* ==================== START ==================== */



/* ==================== ACCESSIBILITÉ ==================== */
function a11yEnhance(root){
  (root||document).querySelectorAll('.nav-item,.key,.lock-link').forEach(el=>{
    if(el.dataset.a11y) return; el.dataset.a11y='1';
    el.setAttribute('role','button'); el.tabIndex=0;
    el.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); el.click(); } });
  });
  (root||document).querySelectorAll('.fg > label:not([for])').forEach(l=>{
    const f=l.parentElement.querySelector('input[id],select[id],textarea[id]');
    if(f) l.setAttribute('for',f.id);
  });
  document.querySelectorAll('.modal-overlay,.modal-bg,.modal').forEach(m=>{ if(m.classList.contains('modal')){m.setAttribute('role','dialog');m.setAttribute('aria-modal','true');} });
}
document.addEventListener('DOMContentLoaded',()=>a11yEnhance());

// Les scripts différés (Chart.js, jsPDF) sont chargés avant DOMContentLoaded
document.addEventListener('DOMContentLoaded', boot);

// Demande au navigateur de ne pas effacer les données de l'appli quand l'espace disque manque.
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
