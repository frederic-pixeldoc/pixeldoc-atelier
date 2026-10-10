'use strict';
/* ==================== BADGES ==================== */
function updateBadges() {
  const urg = repairs.filter(r => r.status === 'urgent').length;
  const unp = repairs.filter(r => r.status === 'done' && r.payment !== 'paid').length;
  const low = stock.filter(s => s.qty <= s.min).length;
  const ub = document.getElementById('urgBadge');
  const pb = document.getElementById('unpaidBadge');
  const lb = document.getElementById('lowBadge');
  ub.style.display = urg > 0 ? '' : 'none'; ub.textContent = urg;
  pb.style.display = unp > 0 ? '' : 'none'; pb.textContent = unp;
  lb.style.display = low > 0 ? '' : 'none';
}

/* ==================== DASHBOARD STATS ==================== */
function renderDashStats() {
  const prog = repairs.filter(r => r.status === 'progress').length;
  const wait = repairs.filter(r => r.status === 'waiting').length;
  const done = repairs.filter(r => r.status === 'done').length;
  const enc  = repairs.filter(r => r.status === 'done' && r.payment === 'paid').map(r => r.prix).reduce((a,v) => a+PDCalc.toCents(v), 0) / 100;
  document.getElementById('dashStats').innerHTML = `
    <div class="stat c1"><div class="stat-ico">🔧</div><div class="stat-val">${prog+wait}</div><div class="stat-lbl">En cours</div></div>
    <div class="stat c2"><div class="stat-ico">⏳</div><div class="stat-val">${wait}</div><div class="stat-lbl">En attente</div></div>
    <div class="stat c3"><div class="stat-ico">✅</div><div class="stat-val">${done}</div><div class="stat-lbl">Terminées</div></div>
    <div class="stat c4"><div class="stat-ico">💶</div><div class="stat-val">${enc.toFixed(0)}€</div><div class="stat-lbl">Encaissé</div></div>
  `;
}

/* ==================== CHART ==================== */
function renderChart() {
  const labels=[], daily=[], cumul=[];
  const now = new Date();
  let run = 0;
  for (let i=29;i>=0;i--) {
    const d = new Date(now); d.setDate(d.getDate()-i);
    labels.push(d.toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'}));
    const v = repairs.filter(r=>r.payment==='paid'&&r.prix&&new Date(r.date).toDateString()===d.toDateString()).map(r=>r.prix).reduce((a,v)=>a+PDCalc.toCents(v),0)/100;
    daily.push(v); run+=v; cumul.push(run);
  }
  const total = PDCalc.sumEUR(repairs.filter(r=>r.payment==='paid').map(r=>r.prix));
  document.getElementById('chartTotal').textContent = `Encaissé : ${total.toFixed(0)} €`;
  const ctx = document.getElementById('revChart').getContext('2d');
  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type:'line',
    data:{labels,datasets:[
      {label:'Encaissé cumulé (€)',data:cumul,borderColor:'#6ee7b7',backgroundColor:'rgba(110,231,183,0.07)',borderWidth:2.5,pointRadius:2,pointHoverRadius:5,tension:0.4,fill:true},
      {label:'Encaissé / jour (€)',data:daily,borderColor:'#60a5fa',backgroundColor:'rgba(96,165,250,0.03)',borderWidth:1.5,pointRadius:1,tension:0.4,fill:false,borderDash:[4,3]}
    ]},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{labels:{color:'#64748b',font:{size:11},boxWidth:12}},
        tooltip:{backgroundColor:'#1a1d27',borderColor:'#2a2f45',borderWidth:1,titleColor:'#e2e8f0',bodyColor:'#64748b',
          callbacks:{label:ctx=>` ${ctx.dataset.label}: ${ctx.parsed.y.toFixed(0)} €`}}},
      scales:{
        x:{ticks:{color:'#64748b',font:{size:10},maxTicksLimit:8},grid:{color:'rgba(42,47,69,0.5)'}},
        y:{ticks:{color:'#64748b',font:{size:10},callback:v=>v+'€'},grid:{color:'rgba(42,47,69,0.5)'}}
      }}
  });
}

/* ==================== RESTITUTION BADGE ==================== */
function restBadge(r) {
  if (!r.restitution || r.status === 'done') return '';
  const now = new Date(); now.setHours(0,0,0,0);
  const d   = new Date(r.restitution); d.setHours(0,0,0,0);
  const ms  = d - now;
  if (ms < 0)        return `<span class="rbadge rb-late">🔴 En retard · ${d.toLocaleDateString('fr-FR')}</span>`;
  if (ms < 86400000) return `<span class="rbadge rb-soon">🟠 Restitution dans &lt;24h · ${d.toLocaleDateString('fr-FR')}</span>`;
  return `<span style="font-size:11px;color:var(--dim)">📅 Restitution le ${d.toLocaleDateString('fr-FR')}</span>`;
}

/* ==================== RENDER CARDS ==================== */
function renderRecent() {
  const list = [...repairs].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,6);
  renderGrid('recentGrid', list);
}
function renderRepairs() {
  let list = [...repairs];
  if (curFilter !== 'all') list = list.filter(r => r.status === curFilter);
  if (curSearch) {
    const q = curSearch.toLowerCase();
    list = list.filter(r => [r.prenom,r.nom,r.appareil,r.probleme].some(f=>(f||'').toLowerCase().includes(q)));
  }
  const ord = {urgent:0,progress:1,waiting:2,done:3};
  list.sort((a,b)=>(ord[a.status]||2)-(ord[b.status]||2));
  document.getElementById('rCount').textContent = `${list.length} réparation${list.length>1?'s':''}`;
  renderGrid('repairsGrid', list);
}
function renderDone() {
  const list = repairs.filter(r=>r.status==='done').sort((a,b)=>new Date(b.date)-new Date(a.date));
  renderGrid('doneGrid', list);
}

function renderGrid(id, list) {
  const g = document.getElementById(id);
  if (!g) return;
  if (!list.length) {
    g.innerHTML=`<div class="empty"><div class="empty-ico">🔧</div><div class="empty-title">Aucune réparation</div><div class="empty-sub">Cliquez sur "+ Nouveau client" pour commencer</div></div>`;
    return;
  }
  g.innerHTML = list.map(r => {
    const py = r.payment||'pending';
    const ph = (r.photos||[]).length;
    const photoHtml = ph>0 ? `<div class="photos-row">
      ${r.photos.slice(0,3).map(p=>`<img class="photo-mini" src="${p}" onclick="openLB(event,'${p}')" alt="Photo de l'appareil">`).join('')}
      ${ph>3?`<div class="more-photos">+${ph-3}</div>`:''}
    </div>` : '';
    return `
    <div class="rcard" onclick="openDet('${r.id}')">
      <div class="rcard-top">
        <div class="rcard-device">
          <div class="thumb">${r.photos&&r.photos[0]?`<img src="${r.photos[0]}" alt="Photo de l'appareil" loading="lazy">`:' 💻'}</div>
          <div>
            <div class="dev-name">${escH(r.appareil||'Appareil inconnu')}</div>
            <div class="dev-client">${escH(r.prenom)} ${escH(r.nom)}</div>
          </div>
        </div>
        <span class="sbadge ${SC[r.status]}">${SE[r.status]} ${SL[r.status]}</span>
      </div>
      <div class="rcard-body">
        ${photoHtml}
        <div class="rcard-prob">${escH((r.probleme||'Aucune description').substring(0,85))}${(r.probleme||'').length>85?'…':''}</div>
        ${restBadge(r) ? `<div class="rcard-rest">${restBadge(r)}</div>` : ''}
        <div class="rcard-meta">
          <span class="meta-item">📅 ${new Date(r.date).toLocaleDateString('fr-FR')}</span>
          <span class="pay-badge ${PC[py]}">${PL[py]}</span>
        </div>
      </div>
      <div class="rcard-foot">
        <div class="card-price">${r.prix?r.prix+'€':'—'}</div>
        <div class="card-acts" onclick="event.stopPropagation()">
          <select class="status-sel" onchange="chgStatus('${r.id}',this.value)">
            <option value="waiting" ${r.status==='waiting'?'selected':''}>⏳</option>
            <option value="progress" ${r.status==='progress'?'selected':''}>🔧</option>
            <option value="urgent" ${r.status==='urgent'?'selected':''}>🚨</option>
            <option value="done" ${r.status==='done'?'selected':''}>✅</option>
          </select>
          <button class="btn btn-danger btn-sm" aria-label="Supprimer la réparation" onclick="event.stopPropagation();delRepair('${r.id}')">🗑️</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

/* ==================== FILTERS / SEARCH ==================== */
function setFilter(f, el) {
  curFilter = f;
  document.querySelectorAll('.pill').forEach(p => p.classList.remove('on'));
  el.classList.add('on');
  renderRepairs();
}
function onSearch(v) { curSearch = v; renderRepairs(); }

