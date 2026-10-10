'use strict';
/* ==================== PAYMENTS PAGE ==================== */
function renderPayments() {
  const done = repairs.filter(r=>r.status==='done');
  const paid   = done.filter(r=>r.payment==='paid');
  const unpaid = done.filter(r=>r.payment!=='paid');
  const tPaid   = paid.reduce((a,r)=>a+(+r.prix||0),0);
  const tUnpaid = unpaid.reduce((a,r)=>a+(+r.prix||0),0);

  document.getElementById('payStats').innerHTML=`
    <div class="stat c1"><div class="stat-ico">✅</div><div class="stat-val">${tPaid.toFixed(0)}€</div><div class="stat-lbl">Encaissé</div></div>
    <div class="stat c4"><div class="stat-ico">⏳</div><div class="stat-val">${tUnpaid.toFixed(0)}€</div><div class="stat-lbl">À encaisser</div></div>
    <div class="stat c2"><div class="stat-ico">📋</div><div class="stat-val">${unpaid.length}</div><div class="stat-lbl">Factures en attente</div></div>
    <div class="stat c3"><div class="stat-ico">💶</div><div class="stat-val">${(tPaid+tUnpaid).toFixed(0)}€</div><div class="stat-lbl">Total facturable</div></div>
  `;

  const rowHtml = r => {
    const py = r.payment||'pending';
    return `<div class="pay-row">
      <div class="pay-info">
        <div class="pay-name">${r.prenom} ${r.nom}</div>
        <div class="pay-dev">${r.appareil||'—'} · ${new Date(r.date).toLocaleDateString('fr-FR')}</div>
      </div>
      <div class="pay-amt">${r.prix?r.prix+'€':'—'}</div>
      <div class="pay-acts">
        <span class="pay-badge ${PC[py]}">${PL[py]}</span>
        ${py!=='paid'?`<button class="btn btn-green btn-xs" onclick="markPaid('${r.id}')">Encaisser ✓</button>`:''}
        <button class="btn btn-blue btn-xs" onclick="genInvoice('${r.id}')">🧾 PDF</button>
      </div>
    </div>`;
  };

  document.getElementById('unpaidPanel').innerHTML = unpaid.length
    ? unpaid.map(rowHtml).join('')
    : '<p style="padding:14px 0;font-size:13px;color:var(--dim)">Aucune facture en attente 🎉</p>';

  document.getElementById('paidPanel').innerHTML = paid.length
    ? paid.map(rowHtml).join('')
    : '<p style="padding:14px 0;font-size:13px;color:var(--dim)">Aucun paiement enregistré</p>';
}

function markPaid(id) {
  const r = repairs.find(r=>r.id===id);
  if (!r) return;
  r.payment = 'paid'; SR();
  renderDashStats(); renderChart(); renderRepairs(); renderPayments(); renderDone(); updateBadges();
  toast('✅ Paiement encaissé !');
}

/* ==================== STOCK PAGE ==================== */
function renderStock() {
  const low  = stock.filter(s=>s.qty<=s.min).length;
  const val  = stock.reduce((a,s)=>a+(s.qty*(+s.pa||0)),0);
  const tot  = stock.reduce((a,s)=>a+s.qty,0);

  document.getElementById('stockStats').innerHTML=`
    <div class="stat c1"><div class="stat-ico">📦</div><div class="stat-val">${stock.length}</div><div class="stat-lbl">Références</div></div>
    <div class="stat c4"><div class="stat-ico">⚠️</div><div class="stat-val">${low}</div><div class="stat-lbl">Stock bas</div></div>
    <div class="stat c3"><div class="stat-ico">💶</div><div class="stat-val">${val.toFixed(0)}€</div><div class="stat-lbl">Valeur stock</div></div>
    <div class="stat c2"><div class="stat-ico">🏷️</div><div class="stat-val">${tot}</div><div class="stat-lbl">Pièces totales</div></div>
  `;
  document.getElementById('sCount').textContent = `${stock.length} référence${stock.length>1?'s':''}`;

  if (!stock.length) {
    document.getElementById('stockGrid').innerHTML=`<div class="empty"><div class="empty-ico">📦</div><div class="empty-title">Stock vide</div><div class="empty-sub">Ajoutez vos premières pièces détachées</div></div>`;
    return;
  }

  document.getElementById('stockGrid').innerHTML = stock.map(s => {
    const max  = Math.max(s.min*3,1);
    const pct  = Math.min(100,(s.qty/max)*100);
    const qcls = s.qty<=0?'qty-low':s.qty<=s.min?'qty-med':'qty-ok';
    const bcol = s.qty<=0?'#f87171':s.qty<=s.min?'#f59e0b':'#6ee7b7';
    return `
    <div class="scard">
      <div class="scard-top">
        <div>
          <div class="scard-name">${CE[s.cat]||'📦'} ${s.nom}</div>
          <div class="scard-cat">${s.cat}</div>
        </div>
        <div class="scard-acts">
          <button class="qbtn" onclick="openStockEdit('${s.id}')" title="Modifier" aria-label="Modifier">✏️</button>
          <button class="qbtn" aria-label="Supprimer" onclick="delStock('${s.id}')" style="color:var(--accent3)" title="Supprimer">🗑️</button>
        </div>
      </div>
      <div class="scard-qty ${qcls}">${s.qty} <span style="font-size:13px;font-weight:400;color:var(--dim)">en stock</span></div>
      ${s.qty<=s.min?'<div class="scard-alert">⚠️ Stock bas — commander !</div>':''}
      <div class="scard-bar"><div class="scard-fill" style="width:${pct}%;background:${bcol}"></div></div>
      <div class="qty-ctrl">
        <button class="qbtn" aria-label="Retirer une unité" onclick="adjQty('${s.id}',-1)">−</button>
        <span class="qty-display">${s.qty}</span>
        <button class="qbtn" aria-label="Ajouter une unité" onclick="adjQty('${s.id}',+1)">+</button>
      </div>
      ${s.pa||s.pv?`<div class="scard-prices">Achat: ${s.pa||0}€ · Vente: ${s.pv||0}€</div>`:''}
      ${s.ref?`<div class="scard-ref">Réf: ${s.ref}</div>`:''}
    </div>`;
  }).join('');
  updateBadges();
}

function openStockAdd() {
  editSId = null;
  document.getElementById('stockTitle').textContent = 'Nouvelle pièce';
  ['sNom','sRef'].forEach(i=>document.getElementById(i).value='');
  document.getElementById('sCat').value = 'Stockage';
  document.getElementById('sQty').value = 0;
  document.getElementById('sMin').value = 2;
  document.getElementById('sPa').value = '';
  document.getElementById('sPv').value = '';
  openM('stockModal');
}
function openStockEdit(id) {
  const s = stock.find(s=>s.id===id);
  if (!s) return;
  editSId = id;
  document.getElementById('stockTitle').textContent = 'Modifier la pièce';
  document.getElementById('sNom').value = s.nom||'';
  document.getElementById('sCat').value = s.cat||'Stockage';
  document.getElementById('sQty').value = s.qty||0;
  document.getElementById('sMin').value = s.min||2;
  document.getElementById('sPa').value  = s.pa||'';
  document.getElementById('sPv').value  = s.pv||'';
  document.getElementById('sRef').value = s.ref||'';
  openM('stockModal');
}
function saveStock() {
  const nom = document.getElementById('sNom').value.trim();
  if (!nom) { toast('❌ Nom requis'); return; }
  const item = {
    id: editSId || Date.now().toString(), nom,
    cat: document.getElementById('sCat').value,
    qty: parseInt(document.getElementById('sQty').value)||0,
    min: parseInt(document.getElementById('sMin').value)||2,
    pa:  document.getElementById('sPa').value,
    pv:  document.getElementById('sPv').value,
    ref: document.getElementById('sRef').value.trim()
  };
  if (editSId) { const i=stock.findIndex(s=>s.id===editSId); if(i!==-1) stock[i]=item; }
  else stock.unshift(item);
  SS(); renderStock(); closeM('stockModal'); toast('✅ Pièce enregistrée !');
}
function delStock(id) {
  if (!confirm('Supprimer cette pièce ?')) return;
  stock = stock.filter(s=>s.id!==id);
  SS(); renderStock(); toast('🗑️ Pièce supprimée');
}
function adjQty(id, d) {
  const s = stock.find(s=>s.id===id);
  if (s) { s.qty = Math.max(0, s.qty+d); SS(); renderStock(); }
}

/* Décrémente le stock pour les pièces utilisées dans une réparation.
   N'agit qu'une seule fois (flag r.stockDecremented). */
function decrementPartsStock(r) {
  if (r.stockDecremented || !Array.isArray(r.parts) || r.parts.length === 0) return;
  r.parts.forEach(p => {
    if (p.ref === 'libre') return; // pièce saisie librement, pas dans le stock
    const s = stock.find(x => x.id === p.ref);
    if (s) s.qty = Math.max(0, s.qty - 1);
  });
  r.stockDecremented = true;
  SS();
}

