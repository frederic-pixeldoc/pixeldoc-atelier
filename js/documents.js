'use strict';
/* ==================== NUMÉROTATION & FORMATS DES DOCUMENTS ==================== */
// Une facture doit avoir un numéro unique, chronologique et sans trou : il est attribué une seule fois
// à la première génération, puis conservé dans la réparation (jamais renuméroté, date d'émission figée).
function nextSeq(kind) {
  const y = new Date().getFullYear(), k = `pd3_seq_${kind}_${y}`;
  let n = +localStorage.getItem(k) || 0;
  const re = new RegExp(`-${y}-(\\d+)$`);                     // reprise après restauration d'une sauvegarde
  repairs.forEach(r => { const m = ((kind==='inv' ? r.invNo : kind==='bon' ? r.bonNo : '') || '').match(re); if (m) n = Math.max(n, +m[1]); });
  n += 1; localStorage.setItem(k, String(n));
  return `${y}-${String(n).padStart(3, '0')}`;
}
function docNo(r, kind, prefix) {
  const f = kind + 'No';
  if (!r[f]) { r[f] = `${prefix}-${nextSeq(kind)}`; if (kind === 'inv') r.invDate = new Date().toISOString(); SR(); }
  return r[f];
}
const pdfEUR = n => { const x = Math.round((+n || 0) * 100) / 100; return (Number.isInteger(x) ? String(x) : x.toFixed(2).replace('.', ',')) + ' €'; };
const escH = t => String(t ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* ==================== INVOICE PDF (v4 — mentions légales conformes) ==================== */
function genInvoice(id) {
  const r=repairs.find(r=>r.id===id);
  if(!r){toast('❌ Réparation introuvable');return;}
  toast('📄 Génération de la facture...');

  const profil = getProfil();
  const ph = (k,d)=> (profil[k] && profil[k].trim()) ? profil[k] : (d||'');

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
  doc.text('DESCRIPTION PRESTATION',mL,y);
  doc.text('MONTANT',W-mR,y,{align:'right'});
  y+=4;doc.setDrawColor(42,47,69);doc.line(mL,y,W-mR,y);y+=8;

  // ── Lignes de prestation (tâches + pièces ou fallback générique) ──
  const rTasks = Array.isArray(r.tasks) && r.tasks.length > 0 ? r.tasks : [];
  const rParts = Array.isArray(r.parts) && r.parts.length > 0 ? r.parts : [];

  if (rTasks.length === 0 && rParts.length === 0) {
    // Fallback : ligne générique si aucune prestation n'a été saisie
    doc.setFillColor(26,29,39); doc.rect(mL,y-5,cW,14,'F');
    doc.setFont('helvetica','normal'); doc.setFontSize(11); doc.setTextColor(226,232,240);
    doc.text('Réparation informatique', mL+5, y+3);
    doc.setFont('helvetica','bold'); doc.setTextColor(110,231,183);
    doc.text(pdfEUR(r.prix), W-mR-5, y+3, {align:'right'});
    y+=16;
  } else {
    // Fonction utilitaire pour afficher une ligne de détail
    const pdfRow = (label, montant, bgRGB, colRGB) => {
      if (y > 228) { doc.addPage(); y = 20; }
      doc.setFillColor(...bgRGB); doc.rect(mL, y-4, cW, 12, 'F');
      doc.setFont('helvetica','normal'); doc.setFontSize(9.5); doc.setTextColor(226,232,240);
      doc.text(String(label).substring(0, 62), mL+5, y+3);
      doc.setFont('helvetica','bold'); doc.setTextColor(...colRGB);
      doc.text(pdfEUR(montant), W-mR-5, y+3, {align:'right'});
      y+=13;
    };
    // Section main d'œuvre
    if (rTasks.length > 0) {
      doc.setFont('helvetica','bold'); doc.setFontSize(7.5); doc.setTextColor(100,116,139);
      doc.text("MAIN D'ŒUVRE", mL+5, y); y+=5;
      rTasks.forEach(t => pdfRow(t.lib||'Prestation', t.pr||0, [26,29,39], [110,231,183]));
    }
    // Section pièces
    if (rParts.length > 0) {
      if (rTasks.length > 0) y+=3;
      doc.setFont('helvetica','bold'); doc.setFontSize(7.5); doc.setTextColor(100,116,139);
      doc.text('PIÈCES', mL+5, y); y+=5;
      rParts.forEach(p => pdfRow(p.nom||'Pièce', p.pr||0, [34,38,58], [96,165,250]));
    }
    y+=5;
  }

  // Détail travaux
  if(r.probleme){
    doc.setFont('helvetica','italic');doc.setFontSize(8);doc.setTextColor(100,116,139);
    const lines=doc.splitTextToSize(`Travaux : ${r.probleme}`,cW-10);
    doc.text(lines.slice(0,4),mL+5,y);
    y+=(Math.min(lines.length,4)*5)+5;
  }

  // Acompte
  if(r.acompte&&+r.acompte>0){
    doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(100,116,139);
    doc.text(`Acompte déjà versé`,mL+5,y);
    doc.text(`- ${pdfEUR(r.acompte)}`,W-mR-5,y,{align:'right'});
    y+=8;
  }

  doc.setDrawColor(42,47,69);doc.line(mL,y,W-mR,y);y+=10;

  // Total box
  const totalDue=r.prix?(+r.prix-(+r.acompte||0)):0;
  doc.setFillColor(110,231,183);
  doc.roundedRect(W-mR-62,y-5,62,20,3,3,'F');
  doc.setFont('helvetica','bold');doc.setFontSize(8);doc.setTextColor(15,17,23);
  doc.text('TOTAL À PAYER',W-mR-58,y+3);
  doc.setFontSize(15);
  doc.text(pdfEUR(totalDue),W-mR-5,y+11,{align:'right'});
  y+=28;

  // Statut paiement
  const pyColors={paid:[110,231,183],pending:[248,113,113],partial:[245,158,11]};
  const pyTexts={paid:'✅ Facture payée',pending:'⏳ En attente de règlement',partial:'🔶 Acompte reçu — solde à régler'};
  const pyC=pyColors[r.payment||'pending'];
  doc.setFillColor(pyC[0],pyC[1],pyC[2]);
  doc.roundedRect(mL,y-5,cW/2,14,3,3,'F');
  doc.setFont('helvetica','bold');doc.setFontSize(9);doc.setTextColor(15,17,23);
  doc.text(pyTexts[r.payment||'pending'],mL+5,y+4);
  y+=20;

  // Mentions légales conformes (v4)
  doc.setFillColor(26,29,39);
  doc.roundedRect(mL,y,cW,42,3,3,'F');
  doc.setFont('helvetica','bold');doc.setFontSize(8);doc.setTextColor(100,116,139);
  doc.text('Mentions légales',mL+6,y+7);
  doc.setFont('helvetica','normal');doc.setFontSize(6.5);
  doc.text('Micro-entreprise — TVA non applicable, article 293 B du CGI.',mL+6,y+13);
  doc.text("Paiement à réception. Garantie main d'œuvre 3 mois. Pièces neuves : garantie constructeur (2 ans).",mL+6,y+18);
  doc.text('Garantie légale de conformité 2 ans (art. L217-3 et s. C. conso) et garantie des vices cachés (art. 1641 C. civ.).',mL+6,y+23);
  doc.text("Sauvegarde recommandée AVANT intervention. PixelDoc n'est pas responsable de la perte de données non sauvegardées.",mL+6,y+28);
  if(ph('pf_med')) doc.text(`Médiation conso : ${ph('pf_med').slice(0,90)}`,mL+6,y+33);
  else doc.text('Médiation conso : à désigner (art. L611-1 C. conso).',mL+6,y+33);
  doc.text('Pénalités retard pro : 3× taux légal + 40 € indemnité (art. L441-10, D441-5 C. com.).',mL+6,y+38);

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

