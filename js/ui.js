'use strict';
/* ==================== PHOTOS ==================== */
function compressImage(dataURL, maxPx, quality) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      let w = img.width, h = img.height;
      if (w > maxPx || h > maxPx) {
        if (w >= h) { h = Math.round(h * maxPx / w); w = maxPx; }
        else        { w = Math.round(w * maxPx / h); h = maxPx; }
      }
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(c.toDataURL('image/jpeg', quality));
    };
    img.src = dataURL;
  });
}
function addFiles(files) {
  Array.from(files).forEach(f => {
    if (!f.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = async e => {
      const compressed = await compressImage(e.target.result, 800, 0.7);
      photos.push(compressed);
      renderPrev();
    };
    reader.readAsDataURL(f);
  });
}
function onDragOver(e){e.preventDefault();document.getElementById('dropZone').classList.add('drag');}
function onDragLeave(){document.getElementById('dropZone').classList.remove('drag');}
function onDrop(e){e.preventDefault();document.getElementById('dropZone').classList.remove('drag');addFiles(e.dataTransfer.files);}
function renderPrev(){
  document.getElementById('prevGrid').innerHTML=photos.map((p,i)=>`<div class="prev-item"><img src="${p}" alt="Aperçu de la photo ajoutée"><button class="prev-rm" aria-label="Retirer la photo" onclick="rmPhoto(${i})">✕</button></div>`).join('');
}
function rmPhoto(i){photos.splice(i,1);renderPrev();}

/* ==================== LIGHTBOX ==================== */
function openLB(e,src){e.stopPropagation();document.getElementById('lbImg').src=src;document.getElementById('lb').classList.add('open');}
function closeLB(){document.getElementById('lb').classList.remove('open');}

/* ==================== MODALS ==================== */
function openM(id){document.getElementById(id).classList.add('open');}
function closeM(id){document.getElementById(id).classList.remove('open');}
document.querySelectorAll('.overlay').forEach(o=>o.addEventListener('click',e=>{if(e.target===o)o.classList.remove('open');}));

/* ==================== TOAST ==================== */
function toast(msg){
  const t=document.getElementById('toast');
  t.textContent=msg;t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),3000);
}

