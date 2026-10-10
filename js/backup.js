'use strict';
/* ==================== SAUVEGARDE / RESTAURATION ====================
   La logique (format, empreinte, validation, migration, délai de rappel) est dans backup-core.js (testée).
   Ce fichier ne fait que lire/écrire le navigateur et l'interface. */
const BACKUP_DELAY_DAYS = PDBackup.BACKUP_DELAY_DAYS;
const DATA_KEYS = { repairs:'pd3_repairs', stock:'pd3_stock', profil:'pd3_profil', recon:'pd3_recon', hyp:'pd3_hyp' };
const SEQ_RE = /^pd3_seq_(.+)$/;

function lsJSON(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch(e) { return d; } }
function seqKeys() { const r = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (SEQ_RE.test(k)) r.push(k); } return r; }

/* Données actuelles (le code PIN n'est jamais exporté). */
function collectData() {
  const seq = {}; seqKeys().forEach(k => { seq[k.match(SEQ_RE)[1]] = parseInt(localStorage.getItem(k), 10) || 0; });
  return { repairs: lsJSON('pd3_repairs', []), stock: lsJSON('pd3_stock', []), profil: lsJSON('pd3_profil', {}),
           recon: lsJSON('pd3_recon', []), hyp: lsJSON('pd3_hyp', {}), seq };
}
function fileStamp() {
  const d = new Date(), p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}-${p(d.getHours())}h${p(d.getMinutes())}`;
}
async function downloadBackup(prefix) {
  const file = await PDBackup.buildBackup(collectData());
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(file, null, 2)], {type:'application/json'}));
  a.download = `${prefix}-${fileStamp()}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  return file;
}

/* ---- Rappel ---- */
function updateBackupBanner() {
  const el = document.getElementById('backupBanner'); if (!el) return;
  // données de démonstration (créées par seedData) : rien à sauvegarder
  const demoOnly = repairs.every(r => /^[1-6]$/.test(r.id)) && stock.every(x => /^s[1-7]$/.test(x.id));
  const last = localStorage.getItem('pd3_last_backup');
  const st = PDBackup.backupStatus({ lastBackup: last, hasData: !demoOnly && repairs.length + stock.length > 0,
                                     snoozeUntil: localStorage.getItem('pd3_backup_snooze') });
  el.style.display = st.due ? 'flex' : 'none';
  if (st.due) {
    document.getElementById('backupBannerTxt').innerHTML = (st.days === null
      ? '<strong>Aucune sauvegarde faite.</strong> '
      : `<strong>Dernière sauvegarde il y a ${st.days} jour${st.days > 1 ? 's' : ''}.</strong> `)
      + `Tes ${repairs.length} réparation${repairs.length > 1 ? 's' : ''} et ${stock.length} pièce${stock.length > 1 ? 's' : ''} ne sont que sur cet appareil : si le navigateur est réinitialisé ou le téléphone perdu, ils disparaissent.`;
  }
  const info = document.getElementById('backupInfo');
  if (info && last && !info.textContent) info.textContent = `Dernière sauvegarde exportée : ${new Date(last).toLocaleString('fr-FR')}`;
}
function snoozeBackup() {
  try { localStorage.setItem('pd3_backup_snooze', String(Date.now() + 86400000)); } catch(e) {}
  updateBackupBanner();
}

/* ---- Export ---- */
async function exportBackup() {
  let file;
  try { file = await downloadBackup('pixeldoc-backup'); }
  catch(e) { toast('❌ Sauvegarde impossible : ' + e.message); return; }
  const info = document.getElementById('backupInfo');
  if (info) info.textContent = `Dernière sauvegarde exportée : ${new Date().toLocaleString('fr-FR')} (${file.data.repairs.length} réparations, ${file.data.stock.length} pièces)`;
  try { localStorage.setItem('pd3_last_backup', new Date().toISOString()); localStorage.removeItem('pd3_backup_snooze'); } catch(e) {}
  updateBackupBanner();
  toast('✅ Sauvegarde exportée');
}

/* ---- Import : tout est contrôlé AVANT d'écrire quoi que ce soit ; en cas d'échec d'écriture, l'état précédent est rétabli ---- */
async function importBackup(input) {
  const f = input.files[0]; input.value = '';
  if (!f) return;
  let res;
  try { res = await PDBackup.parseBackup(await f.text()); }
  catch(e) { toast('❌ Lecture du fichier impossible'); return; }
  if (!res.ok) { alert('Restauration annulée — rien n\'a été modifié.\n\n• ' + res.errors.join('\n• ')); return; }
  const c = res.counts;
  const msg = `Restaurer la sauvegarde du ${res.date ? new Date(res.date).toLocaleString('fr-FR') : 'date inconnue'} ?\n\n`
    + `Contenu : ${c.repairs} réparation(s) dont ${c.invoices} facturée(s), ${c.stock} pièce(s).\n`
    + `Actuellement dans l'appli : ${repairs.length} réparation(s), ${stock.length} pièce(s).\n\n`
    + (res.warnings.length ? '⚠ ' + res.warnings.join('\n⚠ ') + '\n\n' : '')
    + 'Les données actuelles seront remplacées. Une copie de sécurité des données actuelles sera d\'abord téléchargée.';
  if (!confirm(msg)) return;
  try { await downloadBackup('pixeldoc-avant-restauration'); } catch(e) { if (!confirm('La copie de sécurité a échoué. Restaurer quand même ?')) return; }

  const touched = [...Object.values(DATA_KEYS), ...seqKeys(), 'pd3_schema'];
  const before = {}; touched.forEach(k => { before[k] = localStorage.getItem(k); });
  try {
    seqKeys().forEach(k => localStorage.removeItem(k));
    Object.entries(DATA_KEYS).forEach(([n, k]) => localStorage.setItem(k, JSON.stringify(res.data[n])));
    Object.entries(res.data.seq).forEach(([n, v]) => localStorage.setItem('pd3_seq_' + n, String(v)));
    localStorage.setItem('pd3_schema', String(PDBackup.SCHEMA));
  } catch(err) {
    seqKeys().forEach(k => localStorage.removeItem(k));
    touched.forEach(k => { try { if (before[k] === null) localStorage.removeItem(k); else localStorage.setItem(k, before[k]); } catch(e) {} });
    toast('❌ Échec de la restauration (stockage insuffisant) : tes données n\'ont pas été modifiées'); return;
  }
  repairs = lsJSON('pd3_repairs', []); stock = lsJSON('pd3_stock', []);
  refreshAll(); renderStock(); loadProfil(); renderRecon(); loadHyp(); recalcViab(); buildPartsSelect();
  const info = document.getElementById('backupInfo');
  if (info) info.textContent = `Restauration effectuée le ${new Date().toLocaleString('fr-FR')}`;
  try { localStorage.setItem('pd3_last_backup', res.date || new Date().toISOString()); localStorage.removeItem('pd3_backup_snooze'); } catch(e) {}
  updateBackupBanner();
  toast('✅ Données restaurées avec succès');
}
