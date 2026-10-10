'use strict';
/* ==================== SEED DATA ==================== */
// Données de démonstration 100 % fictives (aucune donnée client réelle ne doit jamais être mise dans le dépôt).
function seedData() {
  if (repairs.length > 0) return;
  const now=Date.now();
  repairs=[
    {id:'1',prenom:'Démo',nom:'Client 1',tel:'0692 00 00 01',email:'client1@example.invalid',appareil:'Packard Bell TK85',probleme:'PC très lent au démarrage (10 min). Ralentissements constants lors de l\'utilisation quotidienne.',notes:'HDD à remplacer par SSD — diagnostique RAM OK [Devis: DG-01 35€ + RP-01 40€ MO + SSD 45€ = 120€]',prix:'120',acompte:'0',status:'progress',payment:'pending',photos:[],date:new Date(now-3*86400000).toISOString()},
    {id:'2',prenom:'Démo',nom:'Client 2',tel:'0692 00 00 02',email:'client2@example.invalid',appareil:'HP Pavilion 15',probleme:'Écran qui clignote et devient noir par intermittence. Problème aléatoire.',notes:'Tester drivers GPU en premier [Devis: DG-01 35€ + RP-15 Optim 40€ = 75€]',prix:'75',acompte:'0',status:'waiting',payment:'pending',photos:[],date:new Date(now-86400000).toISOString()},
    {id:'3',prenom:'Démo',nom:'Client 3',tel:'0692 00 00 03',email:'client3@example.invalid',appareil:'Asus VivoBook 15',probleme:'Clavier défaillant — touches A, Z, E ne répondent plus du tout.',notes:'Commander clavier de remplacement AZERTY [Devis: DG-01 35€ + RP-09 65€ MO + clavier 35€ = 135€]',prix:'135',acompte:'20',status:'urgent',payment:'partial',photos:[],date:new Date(now).toISOString()},
    {id:'4',prenom:'Démo',nom:'Client 4',tel:'',email:'client4@example.invalid',appareil:'Dell Inspiron 15',probleme:'Réinstallation Windows 10 suite à BSOD répétés. Client souhaite un PC propre.',notes:'RAM testée OK — Windows réinstallé proprement avec tous les drivers [Devis: RP-13 70€ forfait]',prix:'70',acompte:'0',status:'done',payment:'paid',photos:[],date:new Date(now-7*86400000).toISOString()},
    {id:'5',prenom:'Démo',nom:'Client 5',tel:'0692 00 00 05',email:'client5@example.invalid',appareil:'Lenovo ThinkPad E14',probleme:'Batterie HS — autonomie réduite à moins de 20 minutes.',notes:'Batterie commandée sur iFixit — 35€ [Devis: RP-07 35€ MO + batterie 40€ = 75€]',prix:'75',acompte:'0',status:'done',payment:'pending',photos:[],date:new Date(now-14*86400000).toISOString()},
    {id:'6',prenom:'Démo',nom:'Client 6',tel:'0692 00 00 06',email:'',appareil:'Acer Aspire 5',probleme:'Récupération de données urgente — Windows corrompu après coupure de courant.',notes:'Données récupérées avec Recuva — tout OK [Devis: RP-17 60€ + supplément urgence 30€ = 90€]',prix:'90',acompte:'0',status:'done',payment:'paid',photos:[],date:new Date(now-20*86400000).toISOString()},
  ];
  SR();

  if (!stock.length) {
    stock=[
      {id:'s1',nom:'SSD 2.5" SATA 240Go',cat:'Stockage',qty:4,min:2,pa:'25',pv:'45',ref:'Kingston A400'},
      {id:'s2',nom:'SSD M.2 NVMe 500Go',cat:'Stockage',qty:1,min:2,pa:'40',pv:'70',ref:'Samsung 980'},
      {id:'s3',nom:'RAM DDR4 8Go 3200MHz',cat:'RAM',qty:3,min:2,pa:'18',pv:'35',ref:'Crucial Ballistix'},
      {id:'s4',nom:'Pâte thermique Arctic MX-4',cat:'Autre',qty:2,min:1,pa:'6',pv:'12',ref:'4g tube'},
      {id:'s5',nom:'Batterie Packard Bell EasyNote',cat:'Batterie',qty:0,min:1,pa:'22',pv:'45',ref:'MZ35 / TK85'},
      {id:'s6',nom:'Clavier AZERTY HP 15',cat:'Clavier',qty:1,min:1,pa:'15',pv:'35',ref:'HP 250 G7'},
      {id:'s7',nom:'Câble HDMI 1.5m',cat:'Connectique',qty:5,min:2,pa:'4',pv:'10',ref:'Générique'},
    ];
    SS();
  }
}


