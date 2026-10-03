import '@fontsource/cinzel/latin-400.css';
import '@fontsource/cinzel/latin-600.css';
import '@fontsource/cinzel/latin-700.css';
import '@fontsource/eb-garamond/latin-400.css';
import '@fontsource/eb-garamond/latin-500.css';
import '@fontsource/eb-garamond/latin-500-italic.css';
import '@fontsource/eb-garamond/greek-500.css';
import '@fontsource/gfs-didot/greek-400.css';
import '@fontsource/gfs-didot/latin-400.css';
import '@fontsource/jost/latin-400.css';
import '@fontsource/jost/latin-500.css';
import '@fontsource/jost/latin-600.css';
import './styles/main.css';

import { Player } from './engine/player.js';
import { audio } from './engine/audio.js';
import { laurel } from './art/scenery.js';

const params = Object.fromEntries(new URLSearchParams(location.search));

// ---- paper grain (generated once, shared by every overlay) ----
function makeGrain() {
  const s = 256;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const x = c.getContext('2d');
  const img = x.createImageData(s, s);
  for (let i = 0; i < s * s; i++) {
    const a = Math.random();
    img.data[i * 4] = 96; img.data[i * 4 + 1] = 70; img.data[i * 4 + 2] = 40;
    img.data[i * 4 + 3] = a < 0.5 ? 0 : Math.floor(a * a * 70);
  }
  x.putImageData(img, 0, 0);
  // soft blotches + fibres, wrapped for seamless tiling
  const wrap = (fn) => { for (const dx of [-s, 0, s]) for (const dy of [-s, 0, s]) { x.save(); x.translate(dx, dy); fn(); x.restore(); } };
  for (let i = 0; i < 26; i++) {
    const px = Math.random() * s, py = Math.random() * s, r = 18 + Math.random() * 40;
    wrap(() => { const g = x.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, 'rgba(120,84,44,.07)'); g.addColorStop(1, 'rgba(120,84,44,0)'); x.fillStyle = g; x.fillRect(px - r, py - r, r * 2, r * 2); });
  }
  x.strokeStyle = 'rgba(100,72,40,.16)'; x.lineWidth = 0.6;
  for (let i = 0; i < 70; i++) {
    const px = Math.random() * s, py = Math.random() * s, a = Math.random() * 6.28, l = 4 + Math.random() * 14;
    wrap(() => { x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + Math.cos(a) * l * 0.6 + 2, py + Math.sin(a) * l * 0.6, px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke(); });
  }
  document.documentElement.style.setProperty('--grain', `url(${c.toDataURL('image/png')})`);
}
makeGrain();

// ---- decorative laurels on the title screen ----
const lau = (id, flip) => {
  document.getElementById(id).innerHTML = laurel({ x: flip > 0 ? 0 : 68, y: 0, s: 1, flip, c: '#5E6A3A' });
};
lau('laurelL', 1); lau('laurelR', -1);

const player = new Player({ audio, params });
window.__player = player;

(async () => {
  if (params.ui === '0') document.getElementById('app').dataset.ui = 'hide';
  if (params.c) {
    await player.goTo(Math.max(0, +params.c - 1), { play: params.paused !== '1', curtain: false, at: +params.t || 0 });
    if (params.ui === '0') document.getElementById('app').dataset.ui = 'hide';
  } else {
    await player.showTitle();
  }
  document.getElementById('app').dataset.ready = '1';
})();
