'use strict';
/* ---- Devis ---- */
function buildQuoteSelect(){
  const sel=document.getElementById('dv_sel'); if(!sel) return;
  const opt=arr=>arr.map(r=>`<option value="${r[3]}|${r[1]}">${r[0]} — ${r[1]} (${r[3]>0?r[3]+' €':'devis'})</option>`).join('');
  sel.innerHTML='<option value="">— Choisir dans la grille —</option>'+
    '<optgroup label="Diagnostic / dépannage">'+opt(TARIFS_DIAG)+'</optgroup>'+
    '<optgroup label="Réparation atelier">'+opt(TARIFS_REP)+'</optgroup>'+
    '<optgroup label="Forfaits">'+opt(FORFAITS)+'</optgroup>';
  sel.onchange=()=>{
    if(!sel.value) return;
    const [pr,lib]=sel.value.split('|');
    document.getElementById('dv_pr').value=parseFloat(pr)||0;
    document.getElementById('dv_lib').value=lib;
  };
}
function addLineQuote(){
  const lib=document.getElementById('dv_lib').value.trim();
  const pr=parseFloat(document.getElementById('dv_pr').value)||0;
  const qt=parseInt(document.getElementById('dv_qt').value)||1;
  if(!lib||pr<0){toast('⚠️ Désignation et prix requis'); return;}
  quote.push({lib,pr,qt});
  ['dv_lib','dv_pr'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('dv_qt').value=1;
  document.getElementById('dv_sel').value='';
  renderQuote();
}
function rmLine(i){quote.splice(i,1); renderQuote();}
function renderQuote(){
  const c=document.getElementById('quote-lines'); if(!c) return;
  if(quote.length===0){c.innerHTML='<div class="quote-empty">Aucune ligne pour le moment. Pioche dans la grille ou ajoute une désignation libre.</div>';}
  else{c.innerHTML=quote.map((l,i)=>`<div class="quote-line"><div class="qt">${l.lib}</div><div class="qq">×${l.qt}</div><div class="qp">${fmtEUR(l.pr*l.qt)}</div><div class="qd"><button onclick="rmLine(${i})">×</button></div></div>`).join('');}
  const tot=quote.reduce((s,l)=>s+l.pr*l.qt,0);
  const t=document.getElementById('dv_total'); if(t) t.textContent=fmtEUR(tot);
}
function resetQuote(){quote=[]; renderQuote(); ['dv_nom','dv_tel','dv_mail','dv_adr','dv_num'].forEach(id=>{const e=document.getElementById(id); if(e) e.value='';}); toast('🗑️ Devis réinitialisé');}

function genQuotePDF(){
  if(quote.length===0){toast('⚠️ Aucune ligne au devis'); return;}
  const p=getProfil();
  const {jsPDF}=window.jspdf;
  const doc=new jsPDF();
  const sym=s=>s||'';
  let y=15;
  doc.setFontSize(14); doc.setFont(undefined,'bold');
  doc.text(sym(p.pf_nom)||'[Nom à renseigner dans Profil]',14,y); y+=6;
  doc.setFontSize(9); doc.setFont(undefined,'normal');
  if(p.pf_adr){doc.text(p.pf_adr,14,y); y+=4;}
  doc.text(`Tél : ${sym(p.pf_tel)}  ·  ${sym(p.pf_mail)}`,14,y); y+=4;
  doc.text(`SIREN ${sym(p.pf_siren)}  ·  SIRET ${sym(p.pf_siret)}`,14,y); y+=4;
  if(p.pf_rne){doc.text(`RNE ${p.pf_rne}`,14,y); y+=4;}
  if(p.pf_rm){doc.text(`RM ${p.pf_rm}`,14,y); y+=4;}
  doc.text('TVA non applicable, art. 293 B du CGI',14,y); y+=8;
  doc.setFontSize(18); doc.setFont(undefined,'bold');
  doc.setFillColor(15,17,23); doc.setTextColor(255);
  doc.rect(14,y,182,10,'F');
  doc.setFillColor(110,231,183); doc.rect(14,y+10,182,1,'F');
  let num=document.getElementById('dv_num').value;
  if(!num){ num='DV-'+nextSeq('devis'); document.getElementById('dv_num').value=num; }
  doc.text(`DEVIS ${num}`,18,y+7);
  doc.setTextColor(0); y+=15;
  const date=document.getElementById('dv_date').value || new Date().toISOString().slice(0,10);
  const dateFR = date.match(/^\d{4}-\d{2}-\d{2}$/)?date.split('-').reverse().join('/'):date;
  doc.setFontSize(10); doc.text(`Date : ${dateFR}`,14,y); doc.text('Validité : 30 jours',150,y); y+=8;
  doc.setFontSize(11); doc.setFont(undefined,'bold');
  doc.text('Client',14,y); y+=5;
  doc.setFont(undefined,'normal'); doc.setFontSize(10);
  doc.text(document.getElementById('dv_nom').value||'—',14,y); y+=5;
  if(document.getElementById('dv_adr').value){doc.text(document.getElementById('dv_adr').value,14,y); y+=5;}
  if(document.getElementById('dv_tel').value){doc.text(document.getElementById('dv_tel').value,14,y); y+=5;}
  y+=4;
  doc.setFillColor(220); doc.setFont(undefined,'bold');
  doc.rect(14,y-4,182,7,'F'); doc.text('Désignation',16,y+1);
  doc.text('Qté',130,y+1,{align:'right'}); doc.text('PU HT',158,y+1,{align:'right'}); doc.text('Total HT',194,y+1,{align:'right'});
  y+=8; doc.setFont(undefined,'normal'); doc.setFontSize(9);
  let tot=0;
  quote.forEach(l=>{
    if(y>250){doc.addPage(); y=20;}
    const lines=doc.splitTextToSize(l.lib,110); doc.text(lines,16,y);
    doc.text(String(l.qt),130,y,{align:'right'});
    doc.text(l.pr.toFixed(2).replace('.',',')+' €',158,y,{align:'right'});
    const lt=l.qt*l.pr; tot+=lt;
    doc.text(lt.toFixed(2).replace('.',',')+' €',194,y,{align:'right'});
    y+=Math.max(5,lines.length*4);
  });
  y+=4; doc.setFont(undefined,'bold'); doc.setFontSize(11);
  doc.text(`TOTAL HT : ${tot.toFixed(2).replace('.',',')} €`,194,y,{align:'right'}); y+=10;
  doc.setFontSize(8); doc.setFont(undefined,'normal'); doc.setTextColor(102);
  if(y>240){doc.addPage(); y=20;}
  const mentions = [
    'TVA non applicable, art. 293 B du CGI.',
    "Devis valable 30 jours. Bon pour accord requis. Acompte 30% pour pièces > 100 € HT.",
    "Garantie commerciale main d'œuvre 3 mois. Pièces neuves : garantie constructeur.",
    "Reconditionné : garantie commerciale 6 mois + légale conformité 2 ans (art. L217-3 C. conso).",
    "Sauvegarde des données client recommandée AVANT intervention. Voir CGV remises.",
    p.pf_med ? `Médiation conso : ${p.pf_med}` : 'Médiation conso : à désigner avant diffusion.',
    'Le client reconnaît avoir pris connaissance des CGV.',
    '',
    'Bon pour accord (date, signature) :'
  ];
  mentions.forEach(m=>{ if(y>285){doc.addPage(); y=20;} const ll=doc.splitTextToSize(m,182); doc.text(ll,14,y); y+=ll.length*3.5+1; });
  doc.save(`Devis_${num.replace(/\W/g,'_')}.pdf`);
  toast('✅ Devis PDF exporté');
}

