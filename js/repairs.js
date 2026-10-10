'use strict';
/* ==================== ADD/EDIT REPAIR ==================== */
function openAdd() {
  resetAddTasks();
  resetAddParts();
  buildPartsSelect();
  editId = null; photos = [];
  document.getElementById('prevGrid').innerHTML = '';
  document.getElementById('addTitle').textContent = 'Nouveau client';
  ['fPrenom','fNom','fTel','fEmail','fAppareil','fProbleme','fNotes'].forEach(i=>document.getElementById(i).value='');
  document.getElementById('fPrix').value='';
  document.getElementById('fAcompte').value='';
  document.getElementById('fRestitution').value='';
  document.getElementById('fStatut').value='waiting';
  document.getElementById('fPayment').value='pending';
  openM('addModal'); closeSB();
}
function openEdit(id) {
  resetAddTasks();
  resetAddParts();
  buildPartsSelect();
  const _r = repairs.find(r => r.id === id);
  if (_r && Array.isArray(_r.tasks) && _r.tasks.length) {
    _addTasks = JSON.parse(JSON.stringify(_r.tasks));
    renderAddTasks();
  }
  if (_r && Array.isArray(_r.parts) && _r.parts.length) {
    _addParts = JSON.parse(JSON.stringify(_r.parts));
    renderAddParts();
  }
  recalcAddTotal();
  const r = repairs.find(r=>r.id===id);
  if (!r) return;
  editId = id; photos = [...(r.photos||[])];
  document.getElementById('addTitle').textContent = 'Modifier la réparation';
  document.getElementById('fPrenom').value=r.prenom||'';
  document.getElementById('fNom').value=r.nom||'';
  document.getElementById('fTel').value=r.tel||'';
  document.getElementById('fEmail').value=r.email||'';
  document.getElementById('fAppareil').value=r.appareil||'';
  document.getElementById('fProbleme').value=r.probleme||'';
  document.getElementById('fNotes').value=r.notes||'';
  document.getElementById('fPrix').value=r.prix||'';
  document.getElementById('fAcompte').value=r.acompte||'';
  document.getElementById('fRestitution').value=r.restitution||'';
  document.getElementById('fStatut').value=r.status||'waiting';
  document.getElementById('fPayment').value=r.payment||'pending';
  renderPrev(); openM('addModal');
}
function saveRepair() {
  const prenom=document.getElementById('fPrenom').value.trim();
  const nom=document.getElementById('fNom').value.trim();
  if (!prenom&&!nom) { toast('❌ Renseignez au moins le nom'); return; }
  const r = {
    id:editId||Date.now().toString(), prenom, nom,
    tel:document.getElementById('fTel').value.trim(),
    email:document.getElementById('fEmail').value.trim(),
    appareil:document.getElementById('fAppareil').value.trim(),
    probleme:document.getElementById('fProbleme').value.trim(),
    notes:document.getElementById('fNotes').value.trim(), tasks: JSON.parse(JSON.stringify(_addTasks)), parts: JSON.parse(JSON.stringify(_addParts)),
    prix:document.getElementById('fPrix').value,
    acompte:document.getElementById('fAcompte').value,
    restitution:document.getElementById('fRestitution').value||null,
    status:document.getElementById('fStatut').value,
    payment:document.getElementById('fPayment').value,
    photos:[...photos],
    date:editId?repairs.find(r=>r.id===editId)?.date||new Date().toISOString():new Date().toISOString()
  };
  if (editId) {
    const prev=repairs.find(x=>x.id===editId);
    if(prev&&prev.stockDecremented) r.stockDecremented=true; // ne pas re-décrémenter
    const i=repairs.findIndex(x=>x.id===editId); if(i!==-1)repairs[i]=r;
  }
  else repairs.unshift(r);
  if(r.status==='done'&&!r.stockDecremented) decrementPartsStock(r);
  SR(); refreshAll(); renderStock(); closeM('addModal'); toast('✅ Réparation enregistrée !'); photos=[];
}

function chgStatus(id, s) {
  const r=repairs.find(r=>r.id===id);
  if(r){
    r.status=s;
    if(s==='done'&&!r.stockDecremented) decrementPartsStock(r);
    SR(); refreshAll(); renderStock(); toast(`Statut : ${SL[s]}`);
  }
}
function delRepair(id) {
  if(!confirm('Supprimer cette réparation ?'))return;
  repairs=repairs.filter(r=>r.id!==id);
  SR();refreshAll();toast('🗑️ Réparation supprimée');
}

function refreshAll() {
  renderDashStats(); renderChart(); renderRecent();
  renderRepairs(); renderPayments(); renderDone(); updateBadges();
}

/* ==================== DETAIL MODAL ==================== */
function openDet(id) {
  const r=repairs.find(r=>r.id===id);
  if(!r)return;
  const py=r.payment||'pending';
  const isDone=r.status==='done';
  document.getElementById('detTitle').textContent=`${r.prenom} ${r.nom}`;
  document.getElementById('detBody').innerHTML=`
    <div class="det-sec">
      <div class="det-sec-title">Photos (${(r.photos||[]).length})</div>
      <div class="det-photos">
        ${(r.photos||[]).length>0
          ? r.photos.map(p=>`<div class="det-photo" onclick="openLB(event,'${p}')"><img src="${p}" alt="Photo de l'appareil" loading="lazy"></div>`).join('')
          : '<div class="det-photo">📷</div><div style="grid-column:2/-1;display:flex;align-items:center;font-size:12px;color:var(--dim)">Aucune photo</div>'
        }
      </div>
    </div>
    <div class="det-sec">
      <div class="det-sec-title">Informations client</div>
      <div class="det-row"><span class="lbl">Appareil</span><span class="val">${r.appareil||'—'}</span></div>
      <div class="det-row"><span class="lbl">Téléphone</span><span class="val">${r.tel||'—'}</span></div>
      <div class="det-row"><span class="lbl">Email</span><span class="val">${r.email||'—'}</span></div>
      <div class="det-row"><span class="lbl">Date entrée</span><span class="val">${new Date(r.date).toLocaleDateString('fr-FR',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</span></div>
      <div class="det-row"><span class="lbl">Statut</span><span class="val"><span class="sbadge ${SC[r.status]}">${SE[r.status]} ${SL[r.status]}</span></span></div>
      <div class="det-row"><span class="lbl">Prix</span><span class="val" style="color:var(--accent);font-family:var(--display);font-size:18px">${r.prix?r.prix+' €':'—'}</span></div>
      <div class="det-row">
        <span class="lbl">Paiement</span>
        <span class="val" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <span class="pay-badge ${PC[py]}">${PL[py]}</span>
          ${py!=='paid'?`<button class="btn btn-green btn-xs" onclick="markPaid('${r.id}');closeM('detModal')">Encaisser ✓</button>`:''}
        </span>
      </div>
      ${r.acompte&&+r.acompte>0?`<div class="det-row"><span class="lbl">Acompte versé</span><span class="val">${r.acompte} €</span></div>`:''}
    </div>
    <div class="det-sec">
      <div class="det-sec-title">Problème décrit</div>
      <p style="font-size:13px;color:var(--dim);line-height:1.6;background:var(--surface2);padding:10px 12px;border-radius:8px">${r.probleme||'Aucune description'}</p>
    </div>
    ${r.notes?`<div class="det-sec"><div class="det-sec-title">Notes internes 🔒</div><p style="font-size:13px;color:var(--accent2);line-height:1.6;background:rgba(245,158,11,0.08);padding:10px 12px;border-radius:8px;border:1px solid rgba(245,158,11,0.15)">${r.notes}</p></div>`:''}
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px">
      <button class="btn btn-ghost" style="flex:1" onclick="openEdit('${r.id}');closeM('detModal')">✏️ Modifier</button>
      <button class="btn btn-purple" onclick="printBon('${r.id}')">🖨️ Fiche de réception</button>
      ${isDone?`<button class="btn btn-blue" onclick="genInvoice('${r.id}')">🧾 Facture PDF</button>`:''}
      <button class="btn btn-danger btn-sm" onclick="delRepair('${r.id}');closeM('detModal')">🗑️</button>
    </div>
  `;
  openM('detModal');
}

