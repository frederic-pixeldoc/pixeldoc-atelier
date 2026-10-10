'use strict';
/* ==================== NUMÉROTATION & FORMATS DES DOCUMENTS ==================== */
// Une facture doit avoir un numéro unique, chronologique et sans trou : il est attribué une seule fois
// à la première génération, puis conservé dans la réparation (jamais renuméroté, date d'émission figée).
const SEQ_FIELD = { inv: 'invNo', bon: 'bonNo' };            // champ de la réparation qui porte le numéro
function nextSeq(kind) {
  const y = new Date().getFullYear(), k = `pd3_seq_${kind}_${y}`;
  // le plus grand numéro déjà présent dans les données est pris en compte (reprise après restauration)
  const r = PDDocs.nextNumber('', y, localStorage.getItem(k), repairs.map(x => x[SEQ_FIELD[kind]]));
  localStorage.setItem(k, String(r.counter));
  return r.number.slice(1);                                    // « 2026-001 »
}
function docNo(r, kind, prefix) {
  const f = kind + 'No';
  if (!r[f]) { r[f] = `${prefix}-${nextSeq(kind)}`; if (kind === 'inv') r.invDate = new Date().toISOString(); SR(); }
  return r[f];
}
const pdfEUR = n => PDCalc.formatEUR(PDCalc.toCents(n));
const escH = t => String(t ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* ==================== INVOICE PDF (mentions légales selon le régime de TVA du Profil) ==================== */
/* Lignes de la facture + totaux, calculés en centimes (PDCalc). Le prix convenu (champ « Prix ») reste la référence :
   s'il diffère de la somme des lignes détaillées, l'écart apparaît en clair (remise ou ajustement) pour que les totaux soient justes. */
function buildInvoiceModel(r, vat) {
  const tasks = Array.isArray(r.tasks) ? r.tasks : [], parts = Array.isArray(r.parts) ? r.parts : [];
  const lines = [
    ...tasks.map(t => ({ section: 'task', label: t.lib || 'Prestation', unit: t.pr || 0, qty: 1 })),
    ...parts.map(p => ({ section: 'part', label: p.nom || 'Pièce', unit: p.pr || 0, qty: 1 })),
  ];
  const hasPrice = r.prix !== undefined && r.prix !== null && String(r.prix).trim() !== '';
  if (!lines.length) lines.push({ section: 'generic', label: 'Réparation informatique', unit: r.prix || 0, qty: 1 });
  else if (hasPrice) {
    const gap = PDCalc.priceGap(PDCalc.sumCents(lines.map(l => PDCalc.lineTotal(l.qty, PDCalc.toCents(l.unit)))), PDCalc.toCents(r.prix));
    if (gap !== 0) lines.push({ section: 'adjust', label: gap < 0 ? 'Remise commerciale' : 'Ajustement / frais divers', unit: PDCalc.fromCents(gap), qty: 1 });
  }
  return PDCalc.computeDocument({ lines, vat, deposit: r.acompte });
}

function genInvoice(id) {
  const r=repairs.find(r=>r.id===id);
  if(!r){toast('❌ Réparation introuvable');return;}
  if(!(window.jspdf && window.jspdf.jsPDF)){toast('❌ Bibliothèque PDF non chargée (connexion nécessaire au premier lancement)');return;}

  const profil = getProfil();
  const ph = (k,d)=> (profil[k] && profil[k].trim()) ? profil[k] : (d||'');

  // Régime de TVA : jamais supposé. Contrôles faits AVANT d'attribuer un numéro (un numéro attribué ne peut plus être retiré).
  const vat = vatSettings(profil);
  if (!vat) { toast('⚠️ Choisis d\'abord le régime de TVA dans « Profil entreprise »'); return; }
  const model = buildInvoiceModel(r, vat);
  const issues = PDDocs.checkMentions(profil, { kind:'facture', number:'F-0000-000', issueDate:new Date().toISOString(), serviceDate:r.date,
                                                clientName:`${r.prenom||''} ${r.nom||''}`, totals:{ht:model.ht, tva:model.tva, ttc:model.ttc} });
  const errs = issues.filter(i=>i.level==='error');
  if (errs.length && !confirm('Mentions obligatoires manquantes sur la facture :\n\n• ' + errs.map(i=>i.msg).join('\n• ') + '\n\nGénérer quand même ?')) return;
  if (model.depositExceeds && !confirm('L\'acompte est supérieur au total de la facture. Générer quand même (reste à payer : 0 €) ?')) return;
  toast('📄 Génération de la facture...');

  const {jsPDF}=window.jspdf;
  const doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
  const W=210,H=297,mL=20,mR=20,cW=W-mL-mR;

  // Header background
  doc.setFillColor(15,17,23);
  doc.rect(0,0,W,50,'F');

  // Accent line
  doc.setFillColor(110,231,183);
  doc.rect(0,50,W,2,'F');

  // Logo
  doc.setFont('helvetica','bold');
  doc.setFontSize(28);doc.setTextColor(255,255,255);
  doc.text('Pixel',mL,30);
  doc.setTextColor(110,231,183);
  doc.text('Doc',mL+24,30);
  doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(100,116,139);
  doc.text('RÉPARATION · TUTORIELS · RECONDITIONNÉS',mL,38);
  if (ph('pf_site')) doc.text(ph('pf_site'),mL,44);

  // Facture title
  const num = docNo(r, 'inv', 'F');
  doc.setFont('helvetica','bold');doc.setFontSize(22);doc.setTextColor(255,255,255);
  doc.text('FACTURE',W-mR,30,{align:'right'});
  doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(100,116,139);
  doc.text(`N° ${num}`,W-mR,38,{align:'right'});
  doc.text(`Date : ${new Date(r.invDate||Date.now()).toLocaleDateString('fr-FR')} · Prestation : ${new Date(r.date).toLocaleDateString('fr-FR')}`,W-mR,44,{align:'right'});

  let y=62;

  // Client + Atelier boxes
  const bw=(cW-8)/2;
  doc.setFillColor(26,29,39);
  doc.roundedRect(mL,y,bw,44,3,3,'F');
  doc.roundedRect(mL+bw+8,y,bw,44,3,3,'F');

  // Client
  doc.setFont('helvetica','bold');doc.setFontSize(7);doc.setTextColor(100,116,139);
  doc.text('CLIENT',mL+6,y+8);
  doc.setFont('helvetica','bold');doc.setFontSize(12);doc.setTextColor(226,232,240);
  doc.text(`${r.prenom} ${r.nom}`,mL+6,y+18);
  doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(100,116,139);
  if(r.tel) doc.text(`Tél : ${r.tel}`,mL+6,y+26);
  if(r.email) doc.text(`Email : ${r.email}`,mL+6,y+33);

  // Atelier (depuis Profil)
  const x2=mL+bw+14;
  doc.setFont('helvetica','bold');doc.setFontSize(7);doc.setTextColor(100,116,139);
  doc.text('ATELIER',x2,y+8);
  doc.setFont('helvetica','bold');doc.setFontSize(11);doc.setTextColor(226,232,240);
  doc.text(ph('pf_nom','PixelDoc'),x2,y+16);
  doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(100,116,139);
  let yA = y+22;
  if(ph('pf_adr')){doc.text(ph('pf_adr'),x2,yA); yA+=4;}
  if(ph('pf_tel')||ph('pf_mail')){doc.text(`${ph('pf_tel')}${ph('pf_tel')&&ph('pf_mail')?' · ':''}${ph('pf_mail')}`,x2,yA); yA+=4;}
  if(ph('pf_siret')){doc.text(`SIRET ${ph('pf_siret')}`,x2,yA); yA+=4;}
  doc.text(`Entrée : ${new Date(r.date).toLocaleDateString('fr-FR')}`,x2,yA);
  y+=54;

  // Appareil
  doc.setFillColor(34,38,58);
  doc.roundedRect(mL,y,cW,14,3,3,'F');
  doc.setFont('helvetica','bold');doc.setFontSize(8);doc.setTextColor(110,231,183);
  doc.text('APPAREIL',mL+6,y+6);
  doc.setFont('helvetica','normal');doc.setFontSize(10);doc.setTextColor(226,232,240);
  doc.text(r.appareil||'—',mL+36,y+6);
  y+=22;

  // Table header
  doc.setFont('helvetica','bold');doc.setFontSize(8);doc.setTextColor(100,116,139);
  doc.text(vat.mode==='assujetti' ? `DESCRIPTION PRESTATION (${vat.basis})` : 'DESCRIPTION PRESTATION',mL,y);
  doc.text('MONTANT',W-mR,y,{align:'right'});
  y+=4;doc.setDrawColor(42,47,69);doc.line(mL,y,W-mR,y);y+=8;

  // ── Lignes de prestation (main d'œuvre, pièces, écart éventuel) ──
  const pdfRow = (label, cents, bgRGB, colRGB, big) => {
    if (y > 228) { doc.addPage(); y = 20; }
    doc.setFillColor(...bgRGB); doc.rect(mL, y-4, cW, big?14:12, 'F');
    doc.setFont('helvetica','normal'); doc.setFontSize(big?11:9.5); doc.setTextColor(226,232,240);
    doc.text(String(label).substring(0, 62), mL+5, y+3);
    doc.setFont('helvetica','bold'); doc.setTextColor(...colRGB);
    doc.text(PDCalc.formatEUR(cents), W-mR-5, y+3, {align:'right'});
    y+= big?16:13;
  };
  const sect = (title, section, bg, col) => {
    const ls = model.lines.filter(l=>l.section===section); if (!ls.length) return;
    if (y > 228) { doc.addPage(); y = 20; }
    doc.setFont('helvetica','bold'); doc.setFontSize(7.5); doc.setTextColor(100,116,139);
    if (title) { doc.text(title, mL+5, y); y+=5; }
    ls.forEach(l => pdfRow(l.label, l.cents, bg, col, section==='generic'));
    y+=3;
  };
  sect("MAIN D'ŒUVRE", 'task', [26,29,39], [110,231,183]);
  sect('PIÈCES', 'part', [34,38,58], [96,165,250]);
  sect('', 'generic', [26,29,39], [110,231,183]);
  sect('AJUSTEMENT', 'adjust', [26,29,39], [245,158,11]);
  y+=2;

  // Détail travaux
  if(r.probleme){
    doc.setFont('helvetica','italic');doc.setFontSize(8);doc.setTextColor(100,116,139);
    const lines=doc.splitTextToSize(`Travaux : ${r.probleme}`,cW-10);
    doc.text(lines.slice(0,4),mL+5,y);
    y+=(Math.min(lines.length,4)*5)+5;
  }

  if (y > 215) { doc.addPage(); y = 20; }
  // Totaux : HT / TVA / TTC si assujetti ; total unique si franchise en base
  const tot = (label, cents, bold) => {
    doc.setFont('helvetica', bold?'bold':'normal'); doc.setFontSize(9); doc.setTextColor(100,116,139);
    doc.text(label, W-mR-70, y); doc.text(PDCalc.formatEUR(cents, true), W-mR-5, y, {align:'right'}); y+=6;
  };
  doc.setDrawColor(42,47,69);doc.line(mL,y-3,W-mR,y-3);y+=3;
  if (model.mode==='assujetti') {
    tot('Total HT', model.ht);
    tot(`TVA ${String(model.rate).replace('.',',')} %`, model.tva);
    tot('Total TTC', model.ttc, true);
  }
  if (model.deposit>0) tot('Acompte déjà versé', -model.deposit);
  y+=4;

  // Total box
  doc.setFillColor(110,231,183);
  doc.roundedRect(W-mR-62,y-5,62,20,3,3,'F');
  doc.setFont('helvetica','bold');doc.setFontSize(8);doc.setTextColor(15,17,23);
  doc.text('TOTAL À PAYER',W-mR-58,y+3);
  doc.setFontSize(15);
  doc.text(PDCalc.formatEUR(model.due),W-mR-5,y+11,{align:'right'});
  y+=28;

  // Statut paiement
  const pyColors={paid:[110,231,183],pending:[248,113,113],partial:[245,158,11]};
  const pyTexts={paid:'Facture payée',pending:'En attente de règlement',partial:'Acompte reçu - solde à régler'};
  const pyC=pyColors[r.payment||'pending'];
  doc.setFillColor(pyC[0],pyC[1],pyC[2]);
  doc.roundedRect(mL,y-5,cW/2,14,3,3,'F');
  doc.setFont('helvetica','bold');doc.setFontSize(9);doc.setTextColor(15,17,23);
  doc.text(pyTexts[r.payment||'pending'],mL+5,y+4);
  y+=20;

  // Mentions légales
  if (y > H-70) { doc.addPage(); y = 20; }
  const mentions = [
    vat.mode==='assujetti' ? PDDocs.mentionAssujetti(vat.rate) + (ph('pf_tvaintra') ? ` N° TVA intracommunautaire : ${ph('pf_tvaintra')}.` : '')
                           : PDDocs.MENTION_FRANCHISE,
    ...(ph('pf_rne')||ph('pf_rm') ? [`${ph('pf_rne')?'RNE '+ph('pf_rne'):''}${ph('pf_rne')&&ph('pf_rm')?' · ':''}${ph('pf_rm')?'RM '+ph('pf_rm'):''}`] : []),
    "Paiement à réception. Pas d'escompte pour paiement anticipé. Garantie main d'œuvre 3 mois. Pièces neuves : garantie constructeur (2 ans).",
    'Garantie légale de conformité 2 ans (art. L217-3 et s. C. conso) et garantie des vices cachés (art. 1641 C. civ.).',
    "Sauvegarde recommandée AVANT intervention. PixelDoc n'est pas responsable de la perte de données non sauvegardées.",
    ph('pf_med') ? `Médiation conso : ${ph('pf_med').slice(0,90)}` : 'Médiation conso : à désigner (art. L611-1 C. conso).',
    'Pénalités retard pro : 3× taux légal + 40 € indemnité (art. L441-10, D441-5 C. com.).',
  ];
  doc.setFillColor(26,29,39);
  doc.roundedRect(mL,y,cW,12+mentions.length*5,3,3,'F');
  doc.setFont('helvetica','bold');doc.setFontSize(8);doc.setTextColor(100,116,139);
  doc.text('Mentions légales',mL+6,y+7);
  doc.setFont('helvetica','normal');doc.setFontSize(6.5);
  mentions.forEach((m,i)=>doc.text(m,mL+6,y+13+i*5));

  // Footer
  doc.setFillColor(15,17,23);
  doc.rect(0,H-16,W,16,'F');
  doc.setFillColor(110,231,183);
  doc.rect(0,H-16,3,16,'F');
  doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(100,116,139);
  doc.text(`${ph('pf_nom','PixelDoc')} — Réparation informatique`+ (ph('pf_siret')?` · SIRET ${ph('pf_siret')}`:''),W/2,H-6,{align:'center'});

  doc.save(`Facture-${num}-${String(r.nom||'client').replace(/\W+/g,'_')}.pdf`);
  toast('✅ Facture PDF générée !');
}

/* ==================== EXPORT CSV ==================== */
function exportCSV() {
  const h=['ID','Prénom','Nom','Téléphone','Email','Appareil','Problème','Statut','Prix','Paiement','Acompte','Date','Notes'];
  const rows=repairs.map(r=>[
    r.id,r.prenom||'',r.nom||'',r.tel||'',r.email||'',r.appareil||'',
    (r.probleme||'').replace(/"/g,"'"),SL[r.status]||r.status,
    r.prix||'0',PL[r.payment||'pending'],r.acompte||'0',
    new Date(r.date).toLocaleDateString('fr-FR'),(r.notes||'').replace(/"/g,"'")
  ]);
  const csv=[h,...rows].map(row=>row.map(c=>`"${c}"`).join(';')).join('\n');
  const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;
  a.download=`PixelDoc-export-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();URL.revokeObjectURL(url);
  toast(`📥 Export CSV : ${repairs.length} réparation(s)`);
}

