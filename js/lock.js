'use strict';
/* ==================== BOOT ==================== */
function boot() {
  seedData();
  showLock();
}

/* ==================== LOCK ==================== */
function pinIsSet() { return !!(localStorage.getItem('pd3_pin_h') || localStorage.getItem('pd3_pin')); }
function showLock() {
  document.getElementById('lockScreen').classList.remove('hidden');
  pinBuf = ''; newPin = '';
  // Aucun code par défaut (il serait lisible dans le dépôt public) : au premier lancement, on crée son code.
  if (!pinIsSet()) { pinMode = 'setup_new'; setLockUI('Créez votre code PIN','Choisissez un code à 4 chiffres pour verrouiller l\'atelier','🔑'); }
  else { pinMode = 'login'; setLockUI('Accès sécurisé','Entrez votre code PIN à 4 chiffres','🔐'); }
  document.getElementById('pinErr').textContent = '';
  renderDots();
}

function lockApp() { showLock(); }

function setLockUI(h,s,ico) {
  document.getElementById('lockHeading').textContent = h;
  document.getElementById('lockSub').textContent = s;
  document.getElementById('lockIcon').textContent = ico;
}

function kp(d) {
  if (pinBuf.length >= 4) return;
  pinBuf += d;
  renderDots();
  if (pinBuf.length === 4) setTimeout(validatePin, 180);
}

function kd() { pinBuf = pinBuf.slice(0,-1); renderDots(); }

function renderDots() {
  for (let i=0;i<4;i++) {
    const el = document.getElementById('d'+i);
    el.classList.toggle('filled', i < pinBuf.length);
    el.classList.remove('error');
  }
}

/* ---- Sécurité du PIN : haché (PBKDF2), blocage après essais ratés, changement soumis à l'ancien code ---- */
const PIN_ITER = 150000;
const hex = buf => [...new Uint8Array(buf)].map(x => x.toString(16).padStart(2,'0')).join('');
async function pinDerive(pin, saltHex, iter) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  const salt = Uint8Array.from(saltHex.match(/../g).map(h => parseInt(h, 16)));
  return hex(await crypto.subtle.deriveBits({name:'PBKDF2', hash:'SHA-256', salt, iterations:iter}, key, 256));
}
async function pinStore(pin) {
  if (!(window.crypto && crypto.subtle)) { localStorage.setItem('pd3_pin', pin); localStorage.removeItem('pd3_pin_h'); return; }
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
  localStorage.setItem('pd3_pin_h', `v1:${PIN_ITER}:${salt}:${await pinDerive(pin, salt, PIN_ITER)}`);
  localStorage.removeItem('pd3_pin');
}
async function pinCheck(pin) {
  const h = localStorage.getItem('pd3_pin_h');
  const hasCrypto = window.crypto && crypto.subtle;
  if (h && hasCrypto) {
    const [, it, salt, want] = h.split(':');
    return (await pinDerive(pin, salt, +it)) === want;
  }
  const plain = localStorage.getItem('pd3_pin');
  if (plain) {
    const ok = pin === plain;
    if (ok && hasCrypto) await pinStore(pin);                    // ancien PIN en clair : remplacé par son empreinte
    return ok;
  }
  return false;                                                    // aucun code défini : on n'arrive ici qu'en mode création (voir showLock)
}
function pinIsDefault() { return false; }   // le code par défaut n'est plus public : plus de bannière d'alerte
function pinWaitSeconds() {
  try { const f = JSON.parse(localStorage.getItem('pd3_pin_fail') || '{}'); return Math.max(0, Math.ceil(((f.until || 0) - Date.now()) / 1000)); }
  catch(e) { return 0; }
}
function pinFailed() {
  let f = {}; try { f = JSON.parse(localStorage.getItem('pd3_pin_fail') || '{}'); } catch(e) {}
  f.n = (f.n || 0) + 1;
  if (f.n % 5 === 0) f.until = Date.now() + Math.min(300, 30 * Math.pow(2, f.n / 5 - 1)) * 1000;
  localStorage.setItem('pd3_pin_fail', JSON.stringify(f));
}
function pinOk() { localStorage.removeItem('pd3_pin_fail'); }
function pinTooSimple(p) { return p === '1234' || /^(\d)\1{3}$/.test(p); }

async function validatePin() {
  if (pinMode === 'login' || pinMode === 'setup_old') {
    const wait = pinWaitSeconds();
    if (wait > 0) { pinError(`Trop d'essais — réessayez dans ${wait} s`); return; }
    if (await pinCheck(pinBuf)) {
      pinOk();
      if (pinMode === 'login') {
        document.getElementById('lockScreen').classList.add('hidden');
        initApp();
      } else {
        pinBuf = ''; pinMode = 'setup_new'; renderDots();
        setLockUI('Nouveau code PIN','Choisissez un nouveau code à 4 chiffres','🔑');
        document.getElementById('pinErr').textContent = '';
      }
    } else {
      pinFailed();
      const w = pinWaitSeconds();
      pinError(w > 0 ? `Trop d'essais — réessayez dans ${w} s` : 'Code incorrect — réessayez');
    }
  } else if (pinMode === 'setup_new') {
    if (pinTooSimple(pinBuf)) { pinError('Code trop simple (1234, 1111…) — choisissez-en un autre'); return; }
    newPin = pinBuf; pinBuf = ''; pinMode = 'setup_confirm';
    renderDots();
    setLockUI('Confirmez le PIN','Entrez à nouveau votre nouveau code','🔑');
    document.getElementById('pinErr').textContent = '';
  } else if (pinMode === 'setup_confirm') {
    if (pinBuf === newPin) {
      await pinStore(pinBuf);
      pinBuf = ''; pinMode = 'login';
      renderDots();
      setLockUI('Code modifié !','Entrez votre nouveau code pour accéder','✅');
      document.getElementById('pinErr').textContent = '';
      toast('✅ Code PIN mis à jour !');
    } else {
      pinError('Les codes ne correspondent pas');
      pinMode = 'setup_new'; newPin = '';
    }
  }
}

function pinError(msg) {
  document.getElementById('pinErr').textContent = msg;
  for (let i=0;i<4;i++) document.getElementById('d'+i).classList.add('error');
  const w = document.querySelector('.lock-wrap');
  w.classList.add('shake');
  setTimeout(() => { w.classList.remove('shake'); pinBuf=''; renderDots(); }, 500);
}

function startPinSetup() {
  pinBuf = ''; newPin = ''; pinMode = 'setup_old';
  renderDots();
  setLockUI('Code actuel','Entrez votre code actuel pour pouvoir le changer','🔑');
  document.getElementById('pinErr').textContent = '';
}
function changePinFromApp() { lockApp(); startPinSetup(); }
function updatePinBanner() {
  const el = document.getElementById('pinBanner'); if (!el) return;
  el.style.display = (pinIsDefault() && !sessionStorage.getItem('pd3_pin_snooze')) ? 'flex' : 'none';
}
function snoozePin() { sessionStorage.setItem('pd3_pin_snooze', '1'); updatePinBanner(); }

/* Keyboard support */
document.addEventListener('keydown', e => {
  if (document.getElementById('lockScreen').classList.contains('hidden')) return;
  if (e.key >= '0' && e.key <= '9') kp(e.key);
  if (e.key === 'Backspace') kd();
});

