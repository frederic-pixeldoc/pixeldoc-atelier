'use strict';
/* ---- Tarifs render ---- */
function renderTarifs(){
  const td=document.getElementById('tbl-diag');
  if(td) td.innerHTML=TARIFS_DIAG.map(r=>`<tr><td class="code">${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td class="num">${r[3]>0?fmtEUR(r[3]):'<em class="note">Gratuit</em>'}</td><td class="note">${r[4]}</td></tr>`).join('');
  const tr=document.getElementById('tbl-rep');
  if(tr) tr.innerHTML=TARIFS_REP.map(r=>`<tr><td class="code">${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td class="num">${r[3]>0?fmtEUR(r[3]):'<em class="note">Devis</em>'}</td><td class="note">${r[4]}</td></tr>`).join('');
  const tf=document.getElementById('tbl-forf');
  if(tf) tf.innerHTML=FORFAITS.map(r=>`<tr><td class="code">${r[0]}</td><td><strong>${r[1]}</strong></td><td class="note">${r[2]}</td><td class="num">${fmtEUR(r[3])}</td><td>${r[4]}</td></tr>`).join('');
}

function exportTarifsPDF(){
  const {jsPDF}=window.jspdf;
  const doc=new jsPDF();
  const p=getProfil();
  let y=15;
  doc.setFontSize(16); doc.setFont(undefined,'bold');
  doc.text(p.pf_nom||'PixelDoc',14,y); y+=7;
  doc.setFontSize(10); doc.setFont(undefined,'normal');
  doc.text('Grille tarifaire — '+(vatPhrase(p)||'régime de TVA à renseigner dans Profil'),14,y); y+=10;
  const sect=(title,rows)=>{
    doc.setFontSize(12); doc.setFont(undefined,'bold');
    doc.setFillColor(15,42,74); doc.setTextColor(255);
    doc.rect(14,y-4,182,7,'F'); doc.text(title,16,y+1); y+=8;
    doc.setTextColor(0); doc.setFontSize(9); doc.setFont(undefined,'normal');
    rows.forEach(r=>{
      if(y>275){doc.addPage(); y=15;}
      doc.setFont(undefined,'bold'); doc.text(r[0],14,y);
      doc.setFont(undefined,'normal');
      doc.text(doc.splitTextToSize(r[1],110),28,y);
      doc.text(r[2],140,y);
      doc.text(r[3]>0?(r[3]+' €').replace('.',','):'Devis',172,y,{align:'right'});
      y+=6;
    });
    y+=3;
  };
  sect('DIAGNOSTIC & DÉPANNAGE',TARIFS_DIAG);
  sect('RÉPARATION & POSE COMPOSANTS',TARIFS_REP);
  sect('FORFAITS & MAINTENANCE',FORFAITS);
  doc.setFontSize(8); doc.setTextColor(102);
  doc.text('Tarifs HT indicatifs. Devis personnalisé pour interventions complexes. Pièces facturées séparément.',14,290);
  doc.save('PixelDoc_Tarifs.pdf');
  toast('✅ Grille tarifaire PDF exportée');
}

/* ---- Viabilité ---- */
function getHyp(){
  const h={};
  Object.keys(DEFAULT_HYP).forEach(k=>{
    const el=document.getElementById(k);
    h[k]=el?(parseFloat(el.value)||0):DEFAULT_HYP[k];
  });
  return h;
}
function saveHyp(){localStorage.setItem('pd3_hyp',JSON.stringify(getHyp()));}
function loadHyp(){
  const h=JSON.parse(localStorage.getItem('pd3_hyp')||'{}');
  Object.entries(DEFAULT_HYP).forEach(([k,v])=>{
    const el=document.getElementById(k); if(!el) return;
    el.value=(h[k]!==undefined)?h[k]:v;
    el.addEventListener('input',()=>{saveHyp(); recalcViab();});
  });
}
function resetHyp(){
  if(!confirm('Réinitialiser toutes les hypothèses ?')) return;
  localStorage.removeItem('pd3_hyp');
  loadHyp(); recalcViab();
  toast('↺ Hypothèses réinitialisées');
}
function recalcViab(){
  const h=getHyp();
  const fixes = h.hp_conso*h.hp_kwh + h.hp_abo + h.hp_inet + h.hp_tel + h.hp_rcp +
                h.hp_log + h.hp_cpt + h.hp_car + h.hp_mkt + h.hp_cns + h.hp_mut +
                h.hp_dom/12 + h.hp_cfe/12;
  const mix=h.hp_mix/100;
  const tx = mix*h.hp_uv/100 + (1-mix)*h.hp_us/100 + mix*h.hp_iv/100 + (1-mix)*h.hp_is/100;
  const charges = h.hp_ca*tx;
  const rav = h.hp_ca - charges - fixes;
  const seuil = (1-tx) > 0 ? fixes/(1-tx) : 0;
  const mn = h.hp_ca>0 ? rav/h.hp_ca : 0;
  const setVal = (id,v)=>{const e=document.getElementById(id); if(e) e.textContent=v;};
  setVal('r_fixes',fmtEUR(fixes));
  setVal('r_charges',fmtEUR(charges));
  setVal('r_rav',fmtEUR(rav));
  setVal('r_taux',fmtPct(tx*100));
  setVal('r_seuil',fmtEUR(seuil));
  setVal('r_mn',fmtPct(mn*100));
  const ravBox=document.getElementById('r_rav_box');
  if(ravBox){ravBox.classList.remove('good','bad','warn'); ravBox.classList.add(rav<0?'bad':(rav<400?'warn':'good'));}
  const seuilBox=document.getElementById('r_seuil_box');
  if(seuilBox){seuilBox.classList.remove('good','bad','warn'); seuilBox.classList.add(h.hp_ca>=seuil?'good':(h.hp_ca>=seuil*0.8?'warn':'bad'));}
  const scenarios=[600,1000,1500,2000,2500,3500,5000];
  const tbl=scenarios.map(ca=>{
    const u=ca*(mix*h.hp_uv/100+(1-mix)*h.hp_us/100);
    const i=ca*(mix*h.hp_iv/100+(1-mix)*h.hp_is/100);
    const r=ca-u-i-fixes;
    const pct=ca>0?r/ca:0;
    const color = r<0?'var(--accent3)':(r<400?'var(--accent2)':'var(--accent)');
    return `<tr><td><strong>${fmtEUR(ca)}</strong></td><td class="num">${fmtEUR(u)}</td><td class="num">${fmtEUR(i)}</td><td class="num">${fmtEUR(fixes)}</td><td class="num" style="color:${color};font-weight:700">${fmtEUR(r)}</td><td class="num">${fmtPct(pct*100)}</td></tr>`;
  }).join('');
  const tb=document.getElementById('tbl-scn'); if(tb) tb.innerHTML=tbl;
}

/* ---- Reconditionné ---- */
function loadRecon(){const s=JSON.parse(localStorage.getItem('pd3_recon')||'null'); return s||RECON_DEFAULT.slice();}
function saveRecon(arr){localStorage.setItem('pd3_recon',JSON.stringify(arr));}
function renderRecon(){
  const arr=loadRecon();
  const body=document.getElementById('tbl-rc'); if(!body) return;
  let totA=0,totV=0,totM=0;
  body.innerHTML=arr.map((r,i)=>{
    const m=r[5]-r[3]-r[4]; const p=r[5]>0?m/r[5]*100:0;
    totA+=r[3]; totV+=r[5]; totM+=m;
    return `<tr><td class="code">${r[0]}</td><td><strong>${r[1]}</strong></td><td class="note">${r[2]}</td><td class="num">${fmtEUR(r[3])}</td><td class="num">${fmtEUR(r[4])}</td><td class="num">${fmtEUR(r[5])}</td><td class="num marge">${fmtEUR(m)}</td><td class="num marge">${fmtPct(p)}</td><td><button class="btn btn-danger btn-xs" onclick="delRecon(${i})">×</button></td></tr>`;
  }).join('');
  const avgM = arr.length?totM/arr.length:0;
  const tf=document.getElementById('tf-rc');
  if(tf) tf.innerHTML=`<tr style="border-top:2px solid var(--accent);font-weight:700"><td colspan="3"><strong>${arr.length} machines</strong></td><td class="num">${fmtEUR(totA)}</td><td></td><td class="num">${fmtEUR(totV)}</td><td class="num marge">${fmtEUR(totM)} (moy ${fmtEUR(avgM)})</td><td></td><td></td></tr>`;
}
function addRecon(){
  const ref=document.getElementById('rc_ref').value.trim();
  const gamme=document.getElementById('rc_gamme').value;
  const spec=document.getElementById('rc_spec').value.trim();
  const a=parseFloat(document.getElementById('rc_a').value)||0;
  const p=parseFloat(document.getElementById('rc_p').value)||0;
  const v=parseFloat(document.getElementById('rc_v').value)||0;
  if(!ref||!spec||v<=0){toast('⚠️ Référence, specs et prix de vente requis'); return;}
  const arr=loadRecon(); arr.push([ref,gamme,spec,a,p,v]);
  saveRecon(arr); renderRecon();
  ['rc_ref','rc_spec','rc_a','rc_p','rc_v'].forEach(id=>document.getElementById(id).value='');
  toast('✅ Machine ajoutée');
}
function delRecon(i){
  if(!confirm('Supprimer cette machine du catalogue ?')) return;
  const arr=loadRecon(); arr.splice(i,1); saveRecon(arr); renderRecon();
}

