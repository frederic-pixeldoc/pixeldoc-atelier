'use strict';
/* ---- Profil ---- */
function getProfil(){return JSON.parse(localStorage.getItem('pd3_profil')||'{}');}
function loadProfil(){
  const p=getProfil();
  ['pf_nom','pf_stat','pf_adr','pf_tel','pf_mail','pf_siren','pf_siret','pf_rne','pf_rm','pf_med','pf_site'].forEach(k=>{
    const el=document.getElementById(k); if(el && p[k]!==undefined) el.value=p[k];
  });
}
function saveProfil(){
  const p={};
  ['pf_nom','pf_stat','pf_adr','pf_tel','pf_mail','pf_siren','pf_siret','pf_rne','pf_rm','pf_med','pf_site'].forEach(k=>{
    const el=document.getElementById(k); if(el) p[k]=el.value;
  });
  localStorage.setItem('pd3_profil',JSON.stringify(p));
  toast('✅ Profil enregistré');
}

