import { createRequire } from 'module';
const require = createRequire(import.meta.url);
export function playwright() {
  try { return require('playwright'); } catch { return require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright'); }
}
const typePin = async (p, pin) => { for (const d of pin) await p.click(`.key:text-is("${d}")`); };
const heading = p => p.textContent('#lockHeading');
/* Déverrouille l'appli. Au premier lancement (aucun PIN défini), crée d'abord le code puis se connecte avec. */
export async function unlock(p, pin = process.env.PD_PIN || '2580') {
  if (/Créez/.test(await heading(p))) {
    await typePin(p, pin);
    await p.waitForFunction(() => /Confirmez/.test(document.getElementById('lockHeading').textContent));
    await typePin(p, pin);
    await p.waitForFunction(() => /Code modifié/.test(document.getElementById('lockHeading').textContent));
  }
  await typePin(p, pin);
  await p.waitForFunction(() => document.getElementById('lockScreen').classList.contains('hidden'), null, { timeout: 10000 });
}
