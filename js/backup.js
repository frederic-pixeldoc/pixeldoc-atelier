'use strict';
/* ==================== RAPPEL DE SAUVEGARDE ==================== */
const BACKUP_DELAY_DAYS = 7;
function updateBackupBanner() {
  const el = document.getElementById('backupBanner'); if (!el) return;
  // données de démonstration (créées par seedData) : rien à sauvegarder
  const demoOnly = repairs.every(r => /^[1-6]$/.test(r.id)) && stock.every(x => /^s[1-7]$/.test(x.id));
  const nb = demoOnly ? 0 : repairs.length + stock.length;
  const last = localStorage.getItem('pd3_last_backup');
  const snooze = +localStorage.getItem('pd3_backup_snooze') || 0;
  const days = last ? Math.floor((Date.now() - new Date(last).getTime()) / 86400000) : null;
  const due = nb > 0 && (days === null || days >= BACKUP_DELAY_DAYS) && Date.now() > snooze;
  el.style.display = due ? 'flex' : 'none';
  if (due) {
    document.getElementById('backupBannerTxt').innerHTML = (days === null
      ? '<strong>Aucune sauvegarde faite.</strong> '
      : `<strong>Dernière sauvegarde il y a ${days} jour${days > 1 ? 's' : ''}.</strong> `)
      + `Tes ${repairs.length} réparation${repairs.length > 1 ? 's' : ''} et ${stock.length} pièce${stock.length > 1 ? 's' : ''} ne sont que sur cet appareil : si le navigateur est réinitialisé ou le téléphone perdu, ils disparaissent.`;
  }
  const info = document.getElementById('backupInfo');
  if (info && last && !info.textContent) info.textContent = `Dernière sauvegarde exportée : ${new Date(last).toLocaleString('fr-FR')}`;
}
function snoozeBackup() {
  try { localStorage.setItem('pd3_backup_snooze', String(Date.now() + 86400000)); } catch(e) {}
  updateBackupBanner();
}

/* ==================== BACKUP / RESTAURATION ==================== */
function exportBackup() {
  const ts = new Date().toISOString().slice(0,19).replace(/[-:T]/g,(c)=>c==='-'?'-':c===':'?'-':' ').trim().replace(' ','-');
  const data = {
    _version: 1,
    _date: new Date().toISOString(),
    pd3_repairs: JSON.parse(localStorage.getItem('pd3_repairs') || '[]'),
    pd3_stock:   JSON.parse(localStorage.getItem('pd3_stock')   || '[]'),
    pd3_profil:  JSON.parse(localStorage.getItem('pd3_profil')  || '{}'),
    pd3_recon:   JSON.parse(localStorage.getItem('pd3_recon')   || '[]'),
    pd3_hyp:     JSON.parse(localStorage.getItem('pd3_hyp')     || '{}'),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `pixeldoc-backup-${ts}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  const info = document.getElementById('backupInfo');
  if (info) info.textContent = `Dernière sauvegarde exportée : ${new Date().toLocaleString('fr-FR')}`;
  try { localStorage.setItem('pd3_last_backup', new Date().toISOString()); localStorage.removeItem('pd3_backup_snooze'); } catch(e) {}
  updateBackupBanner();
  toast('✅ Sauvegarde exportée');
}

function importBackup(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    let data;
    try { data = JSON.parse(e.target.result); }
    catch { toast('❌ Fichier JSON invalide'); input.value=''; return; }
    // Vérification minimale de structure
    if (!data.pd3_repairs && !data.pd3_stock && !data.pd3_profil) {
      toast('❌ Ce fichier ne ressemble pas à une sauvegarde PixelDoc'); input.value=''; return;
    }
    const confirmed = confirm(
      `Restaurer la sauvegarde du ${data._date ? new Date(data._date).toLocaleString('fr-FR') : 'date inconnue'} ?\n\nToutes les données actuelles seront remplacées. Cette action est irréversible.`
    );
    if (!confirmed) { input.value=''; return; }
    try {
      if (data.pd3_repairs) localStorage.setItem('pd3_repairs', JSON.stringify(data.pd3_repairs));
      if (data.pd3_stock)   localStorage.setItem('pd3_stock',   JSON.stringify(data.pd3_stock));
      if (data.pd3_profil)  localStorage.setItem('pd3_profil',  JSON.stringify(data.pd3_profil));
      if (data.pd3_recon)   localStorage.setItem('pd3_recon',   JSON.stringify(data.pd3_recon));
      if (data.pd3_hyp)     localStorage.setItem('pd3_hyp',     JSON.stringify(data.pd3_hyp));
    } catch(err) {
      toast('❌ Échec de la restauration : stockage insuffisant'); input.value=''; return;
    }
    // Recharger l'app depuis les nouvelles données
    repairs = JSON.parse(localStorage.getItem('pd3_repairs') || '[]');
    stock   = JSON.parse(localStorage.getItem('pd3_stock')   || '[]');
    refreshAll();
    renderStock();
    loadProfil();
    input.value='';
    const info = document.getElementById('backupInfo');
    if (info) info.textContent = `Restauration effectuée le ${new Date().toLocaleString('fr-FR')}`;
    try { localStorage.setItem('pd3_last_backup', data._date || new Date().toISOString()); } catch(e) {}
    updateBackupBanner();
    toast('✅ Données restaurées avec succès');
  };
  reader.readAsText(file);
}

