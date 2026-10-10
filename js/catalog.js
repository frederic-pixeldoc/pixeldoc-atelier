'use strict';
/* ==================== TARIFS / OUTILS MÉTIER (v4) ==================== */
const TARIFS_DIAG = [
  ["DG-01","Diagnostic complet en atelier","30-60 min",35,"Offert si réparation acceptée"],
  ["DG-02","Diagnostic + rapport écrit","45 min",45,"Inclut bilan composants"],
  ["DG-03","Audit & reprise PC client (rachat)","30 min",0,"Gratuit · Estimation seulement"],
  ["DP-01","Dépannage à domicile zone 1 (0-15 km)","1h",60,"Forfait + 1h MO"],
  ["DP-02","Dépannage à domicile zone 2 (15-30 km)","1h",80,"Forfait + 1h MO"],
  ["DP-03","Dépannage à domicile zone 3 (>30 km)","1h",100,"Frais km au-delà à valider"],
  ["MO-01","Taux horaire atelier","1h",45,"Tranches de 30 min"],
  ["MO-02","Taux horaire à domicile","1h",55,"Tranches de 30 min"],
];
const TARIFS_REP = [
  ["RP-01","Pose SSD 256-512 Go (clone OS inclus)","45 min",40,"SSD 35-55 €"],
  ["RP-02","Pose SSD 1 To (clone OS inclus)","1h",50,"SSD ~75 €"],
  ["RP-03","Ajout/remplacement RAM","20 min",25,"RAM 25-60 €"],
  ["RP-04","Remplacement alimentation PC fixe","1h",55,"Alim 40-90 €"],
  ["RP-05","Remplacement ventilateur CPU + pâte","45 min",45,"Ventirad 25-50 €"],
  ["RP-06","Remplacement ventilateur portable + pâte","1h30",75,"Ventirad 20-40 €"],
  ["RP-07","Remplacement batterie portable","30 min",35,"Batterie 40-90 €"],
  ["RP-08","Remplacement écran portable","1h30",85,"Dalle 70-180 €"],
  ["RP-09","Remplacement clavier portable","1h",65,"Clavier 25-70 €"],
  ["RP-10","Réparation prise charge à souder","1h30",75,"Connecteur 5-15 €"],
  ["RP-11","Nettoyage + pâte thermique PC fixe","1h",60,"—"],
  ["RP-12","Nettoyage complet portable (démontage)","1h30",80,"—"],
  ["RP-13","Réinstallation Windows 10/11 + drivers","1h30",70,"Licence séparée"],
  ["RP-14","Désinfection malwares / virus","1h-2h",70,"Antivirus client"],
  ["RP-15","Optimisation système","45 min",40,"—"],
  ["RP-16","Sauvegarde de données (≤500 Go)","1h",40,"Disque externe à part"],
  ["RP-17","Récupération données disque sain (≤1 To)","1-2h",60,"—"],
  ["RP-18","Récupération données disque endommagé","Devis",0,"Selon état"],
  ["RP-19","Installation & configuration PC (domicile)","1h",45,"+ déplacement"],
  ["RP-20","Configuration box / réseau / Wi-Fi","45 min",40,"+ déplacement"],
];
const FORFAITS = [
  ["FF-01","Maintenance préventive Particulier","Nettoyage + pâte + check disque + maj + sauvegarde",80,"1×/an"],
  ["FF-02","Maintenance préventive Pro","Idem + bilan sécurité + rapport",110,"1×/an"],
  ["FF-03","Contrat assistance Particulier","1h support distant + 1 intervention/an",180,"Annuel"],
  ["FF-04","Contrat PME 5 postes","Maint. annuelle 5 postes + support distant",480,"Annuel"],
  ["FF-05","Initiation 1h domicile","Découverte Windows / mail / sécurité / sauvegarde",35,"Par séance"],
  ["FF-06","Pack initiation 5h","5 séances 1h à domicile",150,"Pack"],
];
const RECON_DEFAULT = [
  ["PC-B1","Bureautique entrée","i3 6-7e, 8 Go, SSD 256, Win 11",90,25,250],
  ["PC-B2","Bureautique standard","i5 6-7e, 8 Go, SSD 256, Win 11",130,25,320],
  ["PC-B3","Bureautique pro","i5 8e+, 16 Go, SSD 512, Win 11 Pro",180,35,420],
  ["PC-M1","Multimédia","i5 8e+, 16 Go, SSD 512, GPU intégré",220,35,480],
  ["PC-M2","Multimédia + GPU","i5 8e+, 16 Go, SSD 512, GTX 1050/1650",320,45,640],
  ["PC-G1","Gaming entrée","i5 9e+, 16 Go, SSD 512, GTX 1660 / RX 580",420,50,780],
  ["PC-G2","Gaming intermédiaire","i7, 16 Go, SSD 1 To, RTX 2060/3050",560,60,980],
  ["PT-B1","Portable bureautique","i5 7e+, 8 Go, SSD 256, écran 14-15\"",140,30,380],
  ["PT-B2","Portable bureau pro","i5 8e+, 16 Go, SSD 512, FHD",200,35,480],
  ["PT-G1","Portable gaming","i7 + GTX 1650/1660Ti, 16 Go, SSD 512",380,45,750],
];
const DEFAULT_HYP = {
  hp_kwh:0.2516, hp_conso:150, hp_abo:12.49, hp_inet:45, hp_tel:25,
  hp_rcp:25, hp_log:30, hp_cpt:12, hp_car:15, hp_mkt:30, hp_cns:20,
  hp_mut:50, hp_dom:12, hp_cfe:350,
  hp_uv:12.3, hp_us:21.2, hp_iv:1.0, hp_is:1.7, hp_mix:40, hp_ca:1800
};
let quote = [];

/* ---- formatters ---- */
const fmtEUR = n => (Number(n)||0).toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';
const fmtPct = n => (Number(n)||0).toLocaleString('fr-FR',{maximumFractionDigits:1})+' %';

