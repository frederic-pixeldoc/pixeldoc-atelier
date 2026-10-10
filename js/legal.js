'use strict';
/* ---- Documents légaux (viewer) ---- */
const LEGAL_TEXTS = {
  mentions: { title:'Mentions légales', html:`
    <h2>Mentions légales</h2>
    <h3>1. Éditeur</h3>
    <p><strong>{NOM}</strong> — {STAT}<br>{ADR}<br>Tél : {TEL} · {MAIL}<br>SIREN {SIREN} · SIRET {SIRET}<br>RNE {RNE} · RM {RM}<br>{TVA}.</p>
    <h3>2. Hébergement</h3>
    <p>Site hébergé par Netlify, Inc. — 512 2nd Street, Suite 200, San Francisco, CA 94107, USA.</p>
    <h3>3. Activités</h3>
    <p>Réparation et maintenance d'ordinateurs, diagnostic et dépannage à domicile/atelier, vente de matériel reconditionné, conseil et formation.</p>
    <h3>4. Propriété intellectuelle</h3>
    <p>Tout le contenu du site (textes, logo, photos) est protégé. Reproduction interdite sans autorisation (art. L335-2 CPI).</p>
    <h3>5. Données personnelles</h3>
    <p>Voir Politique de confidentialité (RGPD).</p>
    <h3>6. Médiation</h3>
    <p>Médiateur conso : <strong>{MED}</strong> (art. L611-1 et s. C. conso).</p>` },
  cgv: { title:'CGV', html:`<h2>Conditions Générales de Vente</h2>
    <p><em>Document complet disponible (.docx fourni par PixelDoc), accepté par le client lors du devis.</em></p>
    <p><strong>Articles principaux :</strong></p>
    <ol><li>Objet et champ d'application</li><li>Devis et commande (validité 30 j, acompte 30 % > 100 €)</li>
    <li>Prix et TVA : {TVA}</li><li>Modalités de paiement</li>
    <li>Délais et exécution</li><li>Réception et restitution du matériel</li>
    <li><strong>Sauvegarde des données — responsabilité limitée</strong></li>
    <li>Droit de rétractation (vente à distance, 14 j)</li>
    <li>Garanties (légale 2 ans + commerciale)</li><li>Données personnelles (RGPD)</li>
    <li>Force majeure</li><li>Médiation</li><li>Droit français applicable</li></ol>` },
  garantie: { title:'Conditions de garantie', html:`<h2>Conditions de garantie</h2>
    <h3>Garantie légale de conformité (art. L217-3 et s. C. conso)</h3>
    <p>24 mois à compter de la délivrance. Présomption d'antériorité du défaut. Choix réparation/remplacement.</p>
    <h3>Garantie légale des vices cachés (art. 1641 C. civ.)</h3>
    <p>2 ans à compter de la découverte du vice.</p>
    <h3>Garantie commerciale PixelDoc</h3>
    <ul><li><strong>MO réparation :</strong> 3 mois sur récidive de la panne traitée</li>
    <li><strong>Pièces neuves :</strong> garantie constructeur (2 ans), suivi SAV par PixelDoc</li>
    <li><strong>PC reconditionné :</strong> 6 mois pièces et MO, en plus de la garantie légale</li></ul>
    <h3>Exclusions</h3>
    <p>Mauvaise utilisation, chocs/liquides, surtensions, usure normale, malware introduit après livraison, données client.</p>
    <h3>Mention obligatoire (art. L217-15 C. conso)</h3>
    <p><em>« Le consommateur dispose d'un délai de deux ans à compter de la délivrance du bien pour obtenir la mise en œuvre de la garantie légale de conformité… »</em></p>` },
  rgpd: { title:'Politique de confidentialité (RGPD)', html:`<h2>Politique de confidentialité</h2>
    <h3>Responsable du traitement</h3><p>{NOM}, {ADR} — {MAIL}</p>
    <h3>Données collectées</h3>
    <ul><li>Nom, prénom</li><li>Adresse, e-mail, téléphone</li><li>Modèle/n° série/panne</li><li>Facturation</li></ul>
    <h3>Finalités</h3><p>Exécution contrat, obligations comptables (10 ans), SAV, communications avec consentement.</p>
    <h3>Durées</h3><p>Facturation : 10 ans · Photos/notes techniques : 3 ans · Prospects : 3 ans · Cookies : 13 mois max.</p>
    <h3>Vos droits</h3><p>Accès, rectification, effacement, opposition, portabilité, limitation, retrait du consentement. Réclamation : CNIL (cnil.fr). Pour exercer : <strong>{MAIL}</strong></p>` },
  affichage: { title:'Affichage atelier (obligatoire)', html:`
    <h2>Affichage obligatoire en atelier</h2>
    <p style="font-size:12px;color:#666"><em>À imprimer en A4 et à afficher visiblement à l'accueil.</em></p>
    <h2 style="text-align:center">{NOM}</h2>
    <p style="text-align:center">{STAT}<br>{ADR}<br>{TEL} · {MAIL}<br>SIREN {SIREN} · SIRET {SIRET}</p>
    <h3>Tarifs principaux ({TVA})</h3>
    <ul><li>Diagnostic atelier : <strong>35 €</strong> (offert si réparation acceptée)</li>
    <li>Diagnostic + rapport écrit : <strong>45 €</strong></li>
    <li>Taux horaire atelier : <strong>45 €/h</strong></li>
    <li>Dépannage à domicile : <strong>60 €</strong> à <strong>100 €</strong> selon zone</li>
    <li>Pose SSD : <strong>40 €</strong> · Nettoyage complet PC : <strong>60 €</strong> · Réinstallation Windows : <strong>70 €</strong></li></ul>
    <h3>Mode de paiement</h3><p>Espèces · Virement · CB.</p>
    <h3>Médiation conso</h3><p><strong>{MED}</strong> — saisine gratuite (art. L611-1 C. conso).</p>
    <h3>Devis obligatoire ≥ 25 € (art. R111-1 C. conso, arrêté 24 janvier 2017)</h3>
    <h3>Garantie légale de conformité — 2 ans</h3><p>Tout consommateur bénéficie de la garantie légale (art. L217-3 C. conso) pour 24 mois.</p>` }
};
function injectProfil(html){
  const p=getProfil();
  const sub=(k,d)=> (p[k]||d) ? escH(p[k]||d) : '<span class="ph-warn">⚠ à compléter</span>';
  return html
    .replaceAll('{NOM}',sub('pf_nom'))
    .replaceAll('{STAT}',sub('pf_stat','Entrepreneur individuel — micro-entreprise'))
    .replaceAll('{ADR}',sub('pf_adr')).replaceAll('{TEL}',sub('pf_tel'))
    .replaceAll('{MAIL}',sub('pf_mail')).replaceAll('{SIREN}',sub('pf_siren'))
    .replaceAll('{SIRET}',sub('pf_siret')).replaceAll('{RNE}',sub('pf_rne'))
    .replaceAll('{RM}',sub('pf_rm','—')).replaceAll('{MED}',sub('pf_med'))
    .replaceAll('{TVA}',escH(vatPhrase(p)||'')||'<span class="ph-warn">⚠ régime de TVA à choisir dans Profil</span>');
}
function openLegal(key){
  const t=LEGAL_TEXTS[key]; if(!t) return;
  document.getElementById('lv-title').textContent=t.title;
  document.getElementById('lv-body').innerHTML=injectProfil(t.html);
  document.getElementById('legal-viewer').style.display='block';
  document.getElementById('legal-viewer').scrollIntoView({behavior:'smooth'});
}


