'use strict';
function buildPrestSelect(){
  const sel=document.getElementById('fPrest'); if(!sel) return;
  const opt=arr=>arr.map(r=>`<option value="${r[3]}|${r[1]}">${r[0]} — ${r[1]} (${r[3]>0?r[3]+' €':'devis'})</option>`).join('');
  sel.innerHTML='<option value="">— Choisir ou laisser libre —</option>'+
    '<optgroup label="Diagnostic / dépannage">'+opt(TARIFS_DIAG)+'</optgroup>'+
    '<optgroup label="Réparation atelier">'+opt(TARIFS_REP)+'</optgroup>'+
    '<optgroup label="Forfaits">'+opt(FORFAITS)+'</optgroup>';
}
let _addTasks = [];
function onPrestChange(){
  const sel=document.getElementById('fPrest'); if(!sel.value) return;
  const [pr,lib]=sel.value.split('|');
  const prNum = parseFloat(pr) || 0;
  if (prNum <= 0) { sel.value=''; return; }
  _addTasks.push({lib, pr: prNum});
  renderAddTasks();
  sel.value = '';
}
function renderAddTasks(){
  const cont = document.getElementById('fTasksList');
  if (!cont) return;
  if (_addTasks.length === 0) {
    cont.innerHTML = '<div style="color:var(--dim);font-size:11px;text-align:center;padding:8px;background:var(--surface2);border-radius:6px;border:1px dashed var(--border)">Aucune prestation sélectionnée — choisis dans la liste ou saisis le prix manuellement</div>';
  } else {
    cont.innerHTML = _addTasks.map((t,i)=>`
      <div style="display:flex;justify-content:space-between;align-items:center;padding:7px 10px;background:var(--surface2);border:1px solid var(--border);border-radius:6px;margin-bottom:4px;font-size:12px;gap:8px">
        <span style="flex:1;color:var(--text)">${escH(t.lib)}</span>
        <strong style="color:var(--accent);font-family:var(--display);white-space:nowrap">${t.pr.toFixed(2)} €</strong>
        <button type="button" onclick="rmAddTask(${i})" style="background:none;border:none;color:var(--accent3);cursor:pointer;font-size:16px;padding:0 4px">×</button>
      </div>`).join('') +
      `<div style="display:flex;justify-content:space-between;padding:7px 10px;background:rgba(110,231,183,0.1);border:1px solid var(--accent);border-radius:6px;margin-top:6px;font-size:13px;font-weight:700">
        <span>Total prestations</span>
        <span style="color:var(--accent);font-family:var(--display)">${PDCalc.sumEUR(_addTasks.map(t=>t.pr)).toFixed(2)} €</span>
      </div>`;
  }
  // Auto-remplit le champ Prix avec le total combiné
  recalcAddTotal();
}
function rmAddTask(i){
  _addTasks.splice(i,1);
  renderAddTasks();
}
function resetAddTasks(){
  _addTasks = [];
  renderAddTasks();
  recalcAddTotal();
}

/* === PIÈCES UTILISÉES (stock + libre) === */
let _addParts = [];

function buildPartsSelect(){
  const sel = document.getElementById('fParts');
  if (!sel) return;
  let opts = '<option value="">+ Ajouter une pièce…</option>';
  opts += '<optgroup label="Saisie libre">';
  opts += '<option value="__libre__">✏️ Saisir une pièce libre (nom + prix)</option>';
  opts += '</optgroup>';
  if (Array.isArray(stock) && stock.length > 0) {
    opts += '<optgroup label="Depuis ton stock">';
    stock.forEach(s => {
      const ico = (typeof CE !== 'undefined' && CE[s.cat]) ? CE[s.cat] : '📦';
      const dispo = (s.qty > 0) ? '' : ' — RUPTURE';
      opts += `<option value="${s.id}">${ico} ${escH(s.nom)} — ${(parseFloat(s.pv)||0).toFixed(2)} €${dispo}</option>`;
    });
    opts += '</optgroup>';
  }
  sel.innerHTML = opts;
}

function onPartsChange(){
  const sel = document.getElementById('fParts');
  if (!sel || !sel.value) return;
  if (sel.value === '__libre__') {
    sel.value = '';
    document.getElementById('plNom').value = '';
    document.getElementById('plPrix').value = '';
    openM('partLibreModal');
    setTimeout(() => document.getElementById('plNom').focus(), 80);
    return;
  }
  const s = stock.find(x => x.id === sel.value);
  if (!s) { sel.value = ''; return; }
  _addParts.push({ nom: s.nom, pr: parseFloat(s.pv) || 0, ref: s.id });
  renderAddParts();
  recalcAddTotal();
  sel.value = '';
}

function confirmPartLibre() {
  const nom = document.getElementById('plNom').value.trim();
  const pr  = parseFloat(document.getElementById('plPrix').value) || 0;
  if (!nom) { toast('❌ Nom de la pièce requis'); document.getElementById('plNom').focus(); return; }
  if (pr <= 0) { toast('❌ Prix invalide (doit être > 0)'); document.getElementById('plPrix').focus(); return; }
  _addParts.push({ nom, pr, ref: 'libre' });
  renderAddParts();
  recalcAddTotal();
  closeM('partLibreModal');
  toast('✅ Pièce libre ajoutée');
}

function renderAddParts(){
  const cont = document.getElementById('fPartsList');
  if (!cont) return;
  if (_addParts.length === 0) {
    cont.innerHTML = '<div style="color:var(--dim);font-size:11px;text-align:center;padding:8px;background:var(--surface2);border-radius:6px;border:1px dashed var(--border)">Aucune pièce — pioche dans ton stock ou clique « Pièce libre »</div>';
  } else {
    cont.innerHTML = _addParts.map((p,i)=>`
      <div style="display:flex;justify-content:space-between;align-items:center;padding:7px 10px;background:var(--surface2);border:1px solid var(--border);border-radius:6px;margin-bottom:4px;font-size:12px;gap:8px">
        <span style="flex:1;color:var(--text)">📦 ${escH(p.nom)}${p.ref==='libre'?' <em style="color:var(--dim);font-size:10px">(libre)</em>':''}</span>
        <strong style="color:var(--accent4);font-family:var(--display);white-space:nowrap">${p.pr.toFixed(2)} €</strong>
        <button type="button" onclick="rmAddPart(${i})" style="background:none;border:none;color:var(--accent3);cursor:pointer;font-size:16px;padding:0 4px">×</button>
      </div>`).join('') +
      `<div style="display:flex;justify-content:space-between;padding:7px 10px;background:rgba(96,165,250,0.1);border:1px solid var(--accent4);border-radius:6px;margin-top:6px;font-size:13px;font-weight:700">
        <span>Total pièces</span>
        <span style="color:var(--accent4);font-family:var(--display)">${PDCalc.sumEUR(_addParts.map(p=>p.pr)).toFixed(2)} €</span>
      </div>`;
  }
}

function rmAddPart(i){
  _addParts.splice(i, 1);
  renderAddParts();
  recalcAddTotal();
}

function resetAddParts(){
  _addParts = [];
  renderAddParts();
}

/* Recalcul du total combiné (Prestations + Pièces) → champ Prix */
function recalcAddTotal(){
  const total = PDCalc.sumEUR([..._addTasks.map(t=>t.pr), ..._addParts.map(p=>p.pr)]);
  const pi = document.getElementById('fPrix');
  if (pi && total > 0) pi.value = total.toFixed(2);
}

