'use strict';
/* ==================== PRINT BON DE RÉPARATION ==================== */
function printBon(id) {
  // id = null : fiche de réception vierge, à remplir à la main
  const r = id ? repairs.find(r => r.id === id) : null;
  if (id && !r) return;
  const P = getProfil(), pv = k => escH((P[k] || '').trim());
  const num = r ? docNo(r, 'bon', 'BR') : '';
  const dateStr = new Date().toLocaleDateString('fr-FR', {day:'numeric', month:'long', year:'numeric'});
  const blank = (w = '100%') => `<span class="ln" style="min-width:${w}">&nbsp;</span>`;
  const val = (v, w) => v ? `<strong>${escH(v)}</strong>` : blank(w);
  const css = `
    @page{size:A4;margin:12mm}
    *{box-sizing:border-box}
    body{font-family:Arial,sans-serif;color:#111;margin:0;font-size:9.5pt;line-height:1.35}
    h1{margin:0;font-size:20pt;letter-spacing:-1px} h1 span{color:#10b981}
    .tag{font-size:7pt;color:#666;letter-spacing:2.5px;text-transform:uppercase;margin-top:2px}
    .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #111;padding-bottom:8px;margin-bottom:10px}
    .head-r{text-align:right} .head-r h2{font-size:15pt;text-transform:uppercase;margin:0} .head-r p{font-size:8.5pt;color:#555;margin:2px 0 0}
    .co{font-size:7.5pt;color:#555;margin-top:5px}
    .g2{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px}
    .box{border:1px solid #ccc;border-radius:5px;padding:7px 9px;margin-bottom:8px;break-inside:avoid}
    .g2 .box{margin-bottom:0}
    .lb{font-size:6.5pt;font-weight:700;color:#777;letter-spacing:1.8px;text-transform:uppercase;margin-bottom:4px}
    .ln{display:inline-block;border-bottom:1px solid #999;height:13px;vertical-align:bottom}
    .row{margin:3px 0} .cb{display:inline-block;margin-right:12px;white-space:nowrap}
    .big{font-size:15pt;font-weight:900;color:#0b8f67}
    .sig{display:flex;gap:10px;margin-top:8px}
    .sig .box{flex:1;height:62px}
    .small{font-size:7pt;color:#666;line-height:1.5;margin-top:6px}
    .fine{background:#f6f6f6;border-radius:5px;padding:6px 9px;font-size:7pt;color:#555;line-height:1.5;margin-top:8px}`;
  const cb = t => `<span class="cb">☐ ${t}</span>`;
  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Fiche de réception ${escH(num)}</title><style>${css}</style></head><body>
    <div class="head">
      <div><h1>Pixel<span>Doc</span></h1><div class="tag">Réparation · Maintenance · Reconditionnés</div>
        <div class="co">${pv('pf_nom') || 'PixelDoc'}${pv('pf_tel') ? ' · ' + pv('pf_tel') : ''}${pv('pf_mail') ? ' · ' + pv('pf_mail') : ''}${pv('pf_siret') ? '<br>SIRET ' + pv('pf_siret') : ''}${pv('pf_site') ? ' · ' + pv('pf_site') : ''}</div></div>
      <div class="head-r"><h2>Fiche de réception</h2><p>N° ${num ? escH(num) : blank('90px')}</p><p>Date du dépôt : ${r ? new Date(r.date).toLocaleDateString('fr-FR') : blank('90px')}</p></div>
    </div>
    <div class="g2">
      <div class="box"><div class="lb">Client</div>
        <div class="row">Nom : ${r ? '<strong>' + escH((r.prenom || '') + ' ' + (r.nom || '')) + '</strong>' : blank('210px')}</div>
        <div class="row">Tél : ${val(r && r.tel, '120px')}</div>
        <div class="row">E-mail : ${val(r && r.email, '190px')}</div></div>
      <div class="box"><div class="lb">Appareil</div>
        <div class="row">Marque / modèle : ${val(r && r.appareil, '150px')}</div>
        <div class="row">N° de série : ${blank('150px')}</div>
        <div class="row">Restitution prévue : ${r && r.restitution ? '<strong>' + new Date(r.restitution).toLocaleDateString('fr-FR') + '</strong>' : blank('100px')}</div></div>
    </div>
    <div class="box"><div class="lb">Panne décrite par le client</div>${r && r.probleme ? escH(r.probleme).replace(/\n/g,'<br>') : blank() + '<br>' + blank()}</div>
    <div class="box"><div class="lb">État de l'appareil à la réception</div>
      <div class="row">${cb('Rayures / éraflures')}${cb('Coque ou écran fissuré')}${cb('Touches manquantes')}${cb('Traces de choc ou de liquide')}${cb('Vis / scellés manquants')}</div>
      <div class="row">L'appareil s'allume : ${cb('oui')}${cb('non')} &nbsp; Observations : ${blank('55%')}</div></div>
    <div class="g2">
      <div class="box"><div class="lb">Accessoires remis</div>
        <div class="row">${cb('Chargeur')}${cb('Batterie')}${cb('Sac')}</div><div class="row">${cb('Souris')}${cb('Câble(s)')}${cb('Autre :')} ${blank('60px')}</div></div>
      <div class="box"><div class="lb">Accès à l'appareil</div>
        <div class="row">Mot de passe / code : ${blank('110px')}</div>
        <div class="small" style="margin-top:3px">À ne noter que si nécessaire à l'intervention ; il ne sera utilisé que pour la réparation.</div></div>
    </div>
    <div class="box"><div class="lb">Données du client</div>
      <div class="row">${cb('J\'ai effectué une sauvegarde de mes données')}</div>
      <div class="row">${cb('Je n\'ai pas de sauvegarde : je comprends qu\'une intervention peut entraîner une perte de données dont l\'atelier ne peut être tenu responsable')}</div></div>
    <div class="g2">
      <div class="box"><div class="lb">Devis estimé</div>
        <div class="big">${r && r.prix ? pdfEUR(r.prix) : 'À définir'}</div>
        <div class="row" style="font-size:8pt">${r && +r.acompte > 0 ? 'Acompte versé : <strong>' + pdfEUR(r.acompte) + '</strong>' : 'Acompte versé : ' + blank('60px') + ' €'}</div></div>
      <div class="box"><div class="lb">Accord sur les travaux</div>
        <div class="row" style="font-size:8.5pt">J'autorise les travaux jusqu'à ${blank('50px')} € sans nouvel accord. Au-delà, un nouveau devis me sera soumis.</div></div>
    </div>
    <div class="sig">
      <div class="box"><div class="lb">Signature du client — « lu et approuvé »</div></div>
      <div class="box"><div class="lb">Pour PixelDoc</div><div class="small">${pv('pf_nom') || 'Frédéric Bartholo'}<br>Le ${dateStr}</div></div>
    </div>
    <div class="fine"><strong>Conditions.</strong> Micro-entreprise, TVA non applicable, art. 293 B du CGI. Garantie main d'œuvre 3 mois sur la panne traitée ; garanties légales inchangées. L'atelier informera le client de la fin des travaux : l'appareil est à retirer sans délai. À défaut de retrait après mise en demeure, l'atelier pourra appliquer les dispositions légales relatives aux objets abandonnés.
      <br><strong>Données personnelles.</strong> Les informations de cette fiche servent uniquement à la réparation, à la facturation et au suivi de garantie ; elles sont conservées 3 ans après la dernière intervention (10 ans pour les pièces comptables). Droit d'accès, de rectification et d'effacement : ${pv('pf_mail') || 'voir mentions légales'}.</div>
  </body></html>`;

  const w = window.open('', '_blank', 'width=800,height=1000');
  if (w) {
    w.document.write(html); w.document.close();
    w.onload = () => { w.print(); };
  } else {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:800px;height:1000px;';
    document.body.appendChild(iframe);
    iframe.contentDocument.write(html); iframe.contentDocument.close();
    iframe.contentWindow.onload = () => { iframe.contentWindow.print(); setTimeout(() => document.body.removeChild(iframe), 1000); };
  }
  toast('🖨️ Fiche de réception envoyée à l\'impression');
}

