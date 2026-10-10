'use strict';
/* ---- Profil ---- */
function getProfil(){return JSON.parse(localStorage.getItem('pd3_profil')||'{}');}
function loadProfil(){
  const p=getProfil();
  ['pf_nom','pf_stat','pf_adr','pf_tel','pf_mail','pf_siren','pf_siret','pf_rne','pf_rm','pf_med','pf_site','pf_tva','pf_tvarate','pf_tvaintra','pf_prixbase'].forEach(k=>{
    const el=document.getElementById(k); if(el && p[k]!==undefined) el.value=p[k];
  });
}
function saveProfil(){
  const p={};
  ['pf_nom','pf_stat','pf_adr','pf_tel','pf_mail','pf_siren','pf_siret','pf_rne','pf_rm','pf_med','pf_site','pf_tva','pf_tvarate','pf_tvaintra','pf_prixbase'].forEach(k=>{
    const el=document.getElementById(k); if(el) p[k]=el.value;
  });
  localStorage.setItem('pd3_profil',JSON.stringify(p));
  toast('✅ Profil enregistré');
}


// Premier choix « assujetti » : propose le taux normal en vigueur à La Réunion (modifiable).
function onTvaRegimeChange(){
  const r=document.getElementById('pf_tvarate'), s=document.getElementById('pf_tva');
  if(s.value==='assujetti' && r && !r.value) r.value=PDCalc.DEFAULT_VAT_RATE;
}
/* Mention de TVA en une phrase pour les documents (texte brut). */
function vatPhrase(p){
  const v=vatSettings(p);
  if(!v) return null;
  return v.mode==='franchise' ? 'TVA non applicable, art. 293 B du CGI' : `TVA au taux de ${String(v.rate).replace('.',',')} %, prix ${v.basis==='TTC'?'TTC':'HT'}`;
}
/* Paramètres de TVA du profil → objet attendu par PDCalc.computeDocument ; null si le régime n'a pas été choisi. */
function vatSettings(p){
  p=p||getProfil();
  if(p.pf_tva==='franchise') return {mode:'franchise'};
  if(p.pf_tva==='assujetti') return {mode:'assujetti', rate:parseFloat(p.pf_tvarate)||0, basis:p.pf_prixbase==='TTC'?'TTC':'HT'};
  return null;
}
