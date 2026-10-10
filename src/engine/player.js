// The player: chapter state machine, curtain (chapter page) choreography, captions, timeline, menu.
import gsap from 'gsap';
import { CHAPTERS, ICONS, TOTAL } from '../data/chapters.js';
import { Scene } from './scene.js';
import { clamp } from '../art/util.js';
import { THUMBS } from '../data/thumbs.js';

// Storage can be missing or throw (private windows, sandboxed frames), so it is only ever a convenience.
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* ignore */ } },
};

const $ = (id) => document.getElementById(id);
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const N = CHAPTERS.length;

export class Player {
  constructor({ audio, params }) {
    this.audio = audio;
    this.params = params;
    this.app = $('app');
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.el = {
      host: $('sceneHost'), fx: $('fx'), flash: $('flash'),
      play: $('btnPlay'), prev: $('btnPrev'), next: $('btnNext'), replay: $('btnReplay'), cc: $('btnCC'), sound: $('btnSound'), full: $('btnFull'),
      timeline: $('timeline'), segs: $('tlSegments'), tip: $('tlTip'), time: $('timeText'),
      captions: $('captions'), capText: $('captionText'),
      chipLetter: $('chipLetter'), chipKicker: $('chipKicker'), chipTitle: $('chipTitle'),
      curtain: $('curtain'), panel: $('curtainPanel'),
      cpLetter: $('cpLetter'), cpKicker: $('cpKicker'), cpTitle: $('cpTitle'), cpRule: $('cpRule'), cpSub: $('cpSub'), cpIcon: $('cpIcon'),
      menu: $('menu'), grid: $('menuGrid'),
    };
    this.idx = -1;           // -1 = title screen
    this.state = 'title';    // title | curtain | playing | paused | ended
    this.userPaused = false;
    this.scene = null;
    this.master = null;
    this.curTl = null;
    this.nav = 0;
    this.scrub = null;
    this.capKey = -2;
    this.lastUI = {};
    this.captionsOn = params.cc !== '0';
    this.soundOn = params.sound === '0' ? false : (store.get('ag.sound') !== '0');
    this.uiHideTimer = null;
    this.advancing = false;

    gsap.set(this.el.panel, { xPercent: -105 });
    this.buildTimeline();
    this.buildMenu();
    this.bind();
    this.layout();
    this.syncButtons();
    this.syncInert();
    gsap.ticker.add(this.tick);
    addEventListener('resize', () => this.layout());
    document.addEventListener('visibilitychange', () => { if (document.hidden && this.state === 'playing') this.pause(); });
  }

  // ------------------------------------------------------------------ build UI
  buildTimeline() {
    CHAPTERS.forEach((ch, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'seg'; b.dataset.i = i; b.style.flexGrow = ch.duration;
      b.setAttribute('aria-label', `Chapter ${ch.n}: ${ch.title}`);
      b.tabIndex = -1;
      b.innerHTML = `<span class="seg-node"><svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[ch.id]}</svg></span><span class="seg-track"><span class="seg-fill"></span></span>`;
      this.el.segs.appendChild(b);
    });
    this.segEls = [...this.el.segs.children];
    this.fills = this.segEls.map((s) => s.querySelector('.seg-fill'));
  }

  buildMenu() {
    CHAPTERS.forEach((ch, i) => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'mcard'; b.dataset.i = i;
      b.innerHTML = `
        <span class="mcard-img"><img src="${THUMBS[ch.id]}" alt="" loading="lazy" onerror="this.remove()"><span class="mcard-letter">${ch.letter}</span><span class="mcard-now">Now playing</span></span>
        <span class="mcard-body"><span class="mcard-kicker">${ch.kicker}</span><span class="mcard-title">${ch.title}</span><span class="mcard-sub">${ch.sub}</span><span class="mcard-dur">${fmt(ch.duration)} min</span></span>`;
      b.addEventListener('click', () => this.goTo(i));
      li.appendChild(b);
      this.el.grid.appendChild(li);
    });
    this.cards = [...this.el.grid.querySelectorAll('.mcard')];
  }

  bind() {
    // A mouse/touch click (detail > 0) must not leave the button focused, or Space would re-press it instead of play/pause.
    const on = (id, fn) => $(id).addEventListener('click', (e) => { this.audio.unlock(); if (e.detail) e.currentTarget.blur(); fn(e); });
    on('btnBegin', () => this.goTo(0));
    on('btnIntroMenu', (e) => this.openMenu(e));
    on('btnPlay', () => this.togglePlay());
    on('btnPrev', () => this.goTo(Math.max(0, this.idx - 1)));
    on('btnNext', () => this.next());
    on('btnReplay', () => this.replay());
    on('btnCC', () => this.setCaptions(!this.captionsOn));
    on('btnSound', () => this.setSound(!this.soundOn));
    on('btnFull', () => this.toggleFull());
    on('btnMenuTop', (e) => this.openMenu(e));
    on('btnMenuClose', () => this.closeMenu());
    on('btnHome', () => this.goTitle());
    on('btnEndReplay', () => this.goTo(0));
    on('btnEndMenu', (e) => this.openMenu(e));
    this.el.menu.addEventListener('click', (e) => { if (e.target === this.el.menu) this.closeMenu(); });
    if (!document.fullscreenEnabled) this.el.full.style.display = 'none';

    // stage click toggles play when in chapter mode
    $('stage').addEventListener('click', () => {
      this.audio.unlock();
      if (this.state === 'playing' || this.state === 'paused') this.togglePlay();
    });

    // timeline interactions
    const tl = this.el.timeline;
    tl.addEventListener('pointerdown', (e) => {
      this.audio.unlock();
      const seg = e.target.closest('.seg');
      if (!seg) return;
      const i = +seg.dataset.i;
      if (i === this.idx && (this.state === 'playing' || this.state === 'paused' || this.state === 'ended')) {
        this.scrub = { i, wasPlaying: this.state === 'playing' };
        if (this.scrub.wasPlaying) this.pause(true);
        tl.setPointerCapture(e.pointerId);
        this.scrubTo(e);
      } else this.goTo(i);
    });
    tl.addEventListener('pointermove', (e) => {
      if (this.scrub) this.scrubTo(e);
      this.showTip(e);
    });
    const endScrub = () => { if (!this.scrub) return; const w = this.scrub.wasPlaying; this.scrub = null; if (w) this.play(); };
    tl.addEventListener('pointerup', endScrub);
    tl.addEventListener('pointercancel', endScrub);
    tl.addEventListener('pointerleave', () => this.el.tip.classList.remove('on'));
    tl.addEventListener('keydown', (e) => {
      if (this.idx < 0) return;
      const t = this.master ? this.master.time() : 0;
      if (e.key === 'ArrowRight') { this.seek(t + 5); e.preventDefault(); e.stopPropagation(); }
      else if (e.key === 'ArrowLeft') { this.seek(t - 5); e.preventDefault(); e.stopPropagation(); }
      else if (e.key === 'Home') { this.seek(0); e.preventDefault(); }
      else if (e.key === 'End') { this.seek(CHAPTERS[this.idx].duration - 1); e.preventDefault(); }
    });

    // keyboard
    addEventListener('keydown', (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      this.audio.unlock();
      this.poke();
      const k = e.key;
      if (this.menuOpen) { if (k === 'Escape') { this.closeMenu(); e.preventDefault(); } return; }
      if (k === ' ' || k === 'k' || k === 'K') {
        // let a keyboard-focused button handle its own Space; a mouse-focused one must not swallow play/pause
        const ae = document.activeElement;
        if (k === ' ' && ae && ae.tagName === 'BUTTON') return;
        e.preventDefault();
        if (this.state === 'title') this.goTo(0); else this.togglePlay();
      } else if (k === 'ArrowRight') { if (this.idx >= 0) this.next(); }
      else if (k === 'ArrowLeft') { if (this.idx >= 0) this.goTo(Math.max(0, this.idx - 1)); }
      else if (k === 'm' || k === 'M') this.setSound(!this.soundOn);
      else if (k === 'c' || k === 'C') this.setCaptions(!this.captionsOn);
      else if (k === 'f' || k === 'F') this.toggleFull();
      else if (k === 'r' || k === 'R') { if (this.idx >= 0) this.replay(); }
      else if (k === 'Escape') { if (document.fullscreenElement) document.exitFullscreen(); }
      else if (/^[1-8]$/.test(k)) this.goTo(+k - 1);
    });

    // idle UI
    ['pointermove', 'pointerdown', 'touchstart'].forEach((ev) => addEventListener(ev, () => this.poke(), { passive: true }));
  }

  poke() {
    if (this.app.dataset.ui !== 'show') this.app.dataset.ui = 'show';
    clearTimeout(this.uiHideTimer);
    if (this.params.ui === '0') return;
    this.uiHideTimer = setTimeout(() => {
      if (this.state === 'playing' && !this.menuOpen && !this.el.timeline.matches(':hover') && !document.querySelector('.player :focus-visible')) this.app.dataset.ui = 'hide';
    }, 3600);
  }

  layout() {
    const r = innerWidth / innerHeight;
    this.app.dataset.layout = r < 0.95 ? 'portrait' : 'landscape';
    this.scene?.size(); this.scene?.sizeFx();
    if (this.scene) { this.scene.size(); this.scene.dirty = true; }
  }

  // ------------------------------------------------------------------ scenes
  async loadModule(i) {
    const mod = await (i < 0 ? import('../scenes/intro.js') : CHAPTERS[i].load());
    if (mod.preload) await mod.preload(); // asset-driven chapters decode their art before mounting
    return mod;
  }

  /** Fetch a chapter's module and art in the background. */
  warm(i) { if (CHAPTERS[i]) CHAPTERS[i].load().then((m) => m.preload?.()).catch(() => {}); }

  mount(i, mod) {
    this.scene?.destroy();
    const sc = new Scene(this.el.host, { id: i < 0 ? 'intro' : CHAPTERS[i].id, reduced: this.reduced });
    sc.attachFx(this.el.fx, this.el.flash);
    sc.audio = this.audio;
    sc.cue = (name, at, arg) => { sc.tl.call(() => this.audio.cue(name, arg), null, at); };
    this.el.fx.getContext('2d').clearRect(0, 0, this.el.fx.width, this.el.fx.height);
    this.scene = sc;
    mod.build(sc, i < 0 ? null : CHAPTERS[i]);
    if (i >= 0) sc.end(CHAPTERS[i].duration);
    this.master = sc.tl;
    this.master.time(0, true);
    sc.size(); sc.sizeFx();
    sc.frame(0, false);
    this.idx = i;
    this.advancing = false;
    this.capKey = -2;
    this.setCaption(null, true);
    this.setChapterChrome(i);
    if (i >= 0) this.warm(i + 1); // warm next
  }

  setChapterChrome(i) {
    if (i < 0) return;
    const ch = CHAPTERS[i];
    this.el.chipLetter.textContent = ch.letter;
    this.el.chipKicker.textContent = ch.kicker;
    this.el.chipTitle.textContent = ch.title;
    this.segEls.forEach((s, k) => { s.classList.toggle('current', k === i); s.classList.toggle('done', k < i); });
    this.cards.forEach((c, k) => c.classList.toggle('current', k === i));
    document.title = 'Ancient Greece';
  }

  // ------------------------------------------------------------------ navigation
  /** Start the intro scene (title screen). */
  async showTitle() {
    const token = this.nav;
    const mod = await this.loadModule(-1);
    if (token !== this.nav) return; // the visitor already navigated away while the title loaded
    this.mount(-1, mod);
    this.master.play();
    this.state = 'title';
    this.warm(0);
    this.idx = -1;
    document.title = 'Ancient Greece';
    this.syncButtons();
    this.audio.setChapter(-1);
  }

  async goTitle() {
    if (this.state === 'title') return;
    const token = ++this.nav;
    this.closeMenu(false); this.hideEnd();
    const loading = this.loadModule(-1);
    this.curTl?.kill();
    this.audio.setChapter(-1);
    this.setState('curtain');
    this.fillCurtain(null);
    const tl = this.curTl = gsap.timeline();
    this.curtainIn(tl);
    const mod = await loading; // the curtain covers the stage while the scene loads
    if (token !== this.nav) return;
    tl.call(() => { this.mount(-1, mod); this.master.play(); }, null, '>');
    tl.add(() => {}, '+=0.35');
    this.curtainOut(tl);
    tl.call(() => { this.setState('title'); this.curTl = null; this.app.dataset.curtain = ''; }, null, '>');
    if (!tl.paused()) tl.play(tl.time()); // re-activate if the curtain-in already finished while loading
  }

  /** Go to chapter i. opts: { play, curtain, at } */
  async goTo(i, { play = true, curtain = true, at = 0 } = {}) {
    i = clamp(i, 0, N - 1);
    const token = ++this.nav;
    this.closeMenu(false); this.hideEnd();
    // start fetching now; with the curtain, the cover slides in at once and the chapter loads behind it,
    // so a click is never left unanswered on a slow network
    const loading = this.loadModule(i);
    if (!curtain) {
      const mod = await loading;
      if (token !== this.nav) return;
      this.curTl?.kill();
      this.userPaused = !play;
      this.audio.setChapter(i);
      this.mount(i, mod);
      this.master.time(at, true);
      this.scene.frame(0, false);
      this.setState(play ? 'playing' : 'paused');
      if (play) this.master.play();
      this.setSound(this.soundOn, true);
      return;
    }

    this.curTl?.kill();
    this.userPaused = !play;
    this.audio.setChapter(i);
    const ch = CHAPTERS[i];
    this.setState('curtain');
    this.fillCurtain(ch);
    const tl = this.curTl = gsap.timeline();
    this.curtainIn(tl);
    const mod = await loading;
    if (token !== this.nav) return;
    // swap scene under the cover
    tl.call(() => {
      this.mount(i, mod);
      this.master.pause();
    }, null, '>');
    // title reveal (all positions relative to the 'rev' label so the tweens overlap)
    const E = this.el;
    tl.addLabel('rev', '>+0.05');
    tl.fromTo(E.cpLetter, { opacity: 0, scale: 1.12 }, { opacity: 1, scale: 1, duration: 2.6, ease: 'power2.out' }, 'rev');
    tl.fromTo(E.cpKicker, { opacity: 0, y: 14, letterSpacing: '0.9em' }, { opacity: 1, y: 0, letterSpacing: '0.6em', duration: 1.2, ease: 'power3.out' }, 'rev+=0.1');
    tl.fromTo(E.cpTitle, { opacity: 0, y: 26, filter: 'blur(8px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.3, ease: 'power3.out' }, 'rev+=0.25');
    tl.fromTo(E.cpRule, { clipPath: 'inset(0 50% 0 50%)' }, { clipPath: 'inset(0 0% 0 0%)', duration: 1.1, ease: 'power2.inOut' }, 'rev+=0.6');
    tl.fromTo(E.cpSub, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 1.1, ease: 'power3.out' }, 'rev+=0.85');
    tl.fromTo(E.cpIcon, { opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1, duration: 0.9, ease: 'back.out(2)' }, 'rev+=1.1');
    tl.addLabel('out', 'rev+=3.1');
    tl.call(() => {
      this.master.time(at, true);
      this.setState(play ? 'playing' : 'paused');
      if (play) this.master.play();
      this.setSound(this.soundOn, true);
    }, null, 'out');
    this.curtainOut(tl, 'out');
    tl.call(() => { this.curTl = null; this.app.dataset.curtain = ''; }, null, '>');
    if (this.reduced) tl.timeScale(1.4);
    if (!tl.paused()) tl.play(tl.time()); // re-activate if the curtain-in already finished while loading
  }

  curtainIn(tl) {
    const E = this.el;
    const wasOn = this.app.dataset.curtain === 'on';
    const cur = gsap.getProperty(E.panel, 'xPercent');
    this.app.dataset.curtain = 'on';
    tl.set([E.cpLetter, E.cpKicker, E.cpTitle, E.cpRule, E.cpSub, E.cpIcon], { opacity: 0 }, 0);
    if (wasOn && !this.reduced && cur > -100 && cur < 100) tl.to(E.panel, { xPercent: 0, duration: 0.5, ease: 'power2.out' }, 0);
    else if (this.reduced) tl.fromTo(E.panel, { xPercent: 0, opacity: 0 }, { opacity: 1, duration: 0.7, ease: 'none' }, 0);
    else tl.fromTo(E.panel, { xPercent: -105, opacity: 1 }, { xPercent: 0, duration: 1.05, ease: 'power3.inOut' }, 0);
  }
  curtainOut(tl, at = '>') {
    const E = this.el;
    if (this.reduced) tl.to(E.panel, { opacity: 0, duration: 0.7, ease: 'none' }, at);
    else tl.to(E.panel, { xPercent: 105, duration: 1.05, ease: 'power3.inOut' }, at);
  }

  fillCurtain(ch) {
    const E = this.el;
    if (!ch) { E.cpLetter.textContent = ''; E.cpKicker.textContent = ''; E.cpTitle.textContent = ''; E.cpSub.textContent = ''; E.cpIcon.innerHTML = ''; return; }
    E.cpLetter.textContent = ch.letter;
    E.cpKicker.textContent = ch.kicker;
    E.cpTitle.textContent = ch.title;
    E.cpSub.textContent = ch.sub;
    E.cpIcon.innerHTML = ICONS[ch.id];
  }

  next() {
    if (this.idx < 0) return this.goTo(0);
    if (this.idx >= N - 1) { if (this.state !== 'curtain') this.showEnd(); return; }
    this.goTo(this.idx + 1);
  }

  replay() {
    if (this.idx < 0 || this.state === 'curtain') return;
    this.hideEnd();
    this.seek(0);
    this.userPaused = false;
    this.setState('playing');
    this.master.play();
    this.audio.setChapter(this.idx);
  }

  // ------------------------------------------------------------------ transport
  setState(s) {
    this.state = s;
    this.syncButtons();
    this.syncInert();
  }

  syncButtons() {
    const playing = this.state === 'playing' || (this.state === 'curtain' && !this.userPaused);
    this.app.dataset.state = this.state === 'title' ? 'title' : 'chapter';
    this.app.dataset.playing = String(playing);
    this.el.play.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    this.el.cc.setAttribute('aria-pressed', String(this.captionsOn));
    this.el.sound.setAttribute('aria-pressed', String(this.soundOn));
    this.app.dataset.captions = this.captionsOn ? 'on' : 'off';
    this.el.prev.disabled = this.idx <= 0;
    this.el.prev.style.opacity = this.idx <= 0 ? '.4' : '';
  }

  get running() {
    return this.state === 'playing' || this.state === 'title' || this.state === 'ended' || (this.state === 'curtain' && !this.userPaused);
  }

  play() {
    if (this.state === 'ended') return this.replay();
    if (this.state === 'curtain') { this.userPaused = false; this.curTl?.play(); this.syncButtons(); this.audio.resume(); return; }
    if (this.state === 'paused' || this.state === 'playing') {
      this.userPaused = false;
      this.setState('playing');
      this.master?.play();
      this.audio.resume();
    }
  }

  pause(silent = false) {
    if (this.state === 'curtain') { this.userPaused = true; this.curTl?.pause(); this.syncButtons(); return; }
    if (this.state === 'playing') {
      this.userPaused = true;
      this.setState('paused');
      this.master?.pause();
      if (!silent) this.audio.pauseSoft();
    }
  }

  togglePlay() {
    if (this.state === 'title') return this.goTo(0);
    if (this.state === 'ended') return this.replay();
    if (this.state === 'curtain') { this.userPaused ? this.play() : this.pause(); return; }
    this.state === 'playing' ? this.pause() : this.play();
  }

  seek(t) {
    if (!this.master || this.idx < 0) return;
    const D = CHAPTERS[this.idx].duration;
    t = clamp(t, 0, D - 0.05);
    this.master.time(t, true);
    this.advancing = false;
    if (this.state === 'ended') { this.hideEnd(); this.setState(this.userPaused ? 'paused' : 'playing'); }
    this.scene.frame(0, false);
    this.capKey = -2;
    this.updateUI(true);
  }

  scrubTo(e) {
    const seg = this.segEls[this.scrub.i];
    const r = seg.getBoundingClientRect();
    const k = clamp((e.clientX - r.left) / r.width, 0, 1);
    this.seek(k * CHAPTERS[this.idx].duration);
  }

  showTip(e) {
    const seg = e.target.closest ? e.target.closest('.seg') : null;
    const tip = this.el.tip;
    if (!seg) { tip.classList.remove('on'); return; }
    const ch = CHAPTERS[+seg.dataset.i];
    tip.innerHTML = `<small>${ch.kicker}</small>${ch.title}`;
    const tr = this.el.timeline.getBoundingClientRect();
    const half = tip.offsetWidth / 2;
    tip.style.left = clamp(e.clientX - tr.left, half, tr.width - half) + 'px';
    tip.classList.add('on');
  }

  setCaptions(on) { this.captionsOn = on; this.syncButtons(); }
  setSound(on, quiet = false) {
    this.soundOn = on;
    store.set('ag.sound', on ? '1' : '0');
    this.audio.setMuted(!on);
    this.syncButtons();
  }
  toggleFull() {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen?.().catch(() => {});
  }

  openMenu(e) {
    // only a keyboard-opened menu hands focus back on close; after a mouse click, Space must stay play/pause
    this.menuOpener = e && e.detail === 0 ? document.activeElement : null;
    this.menuOpen = true; this.app.dataset.menu = 'open'; this.el.menu.setAttribute('aria-hidden', 'false');
    this.menuPrev = this.state === 'playing';
    if (this.menuPrev) this.pause(true);
    this.syncInert();
    const cur = this.cards[Math.max(0, this.idx)];
    cur?.focus({ preventScroll: true });
    cur?.scrollIntoView({ block: 'nearest' });
  }
  closeMenu(resume = true) {
    if (!this.menuOpen) return;
    this.menuOpen = false; this.app.dataset.menu = ''; this.el.menu.setAttribute('aria-hidden', 'true');
    this.syncInert();
    if (resume && this.menuPrev && this.state === 'paused') this.play();
    this.menuPrev = false;
    // hand focus back to whatever opened the menu (unless we are navigating away)
    const o = this.menuOpener; this.menuOpener = null;
    if (resume && o && o.isConnected && !o.closest('[inert]')) o.focus({ preventScroll: true });
  }

  showEnd() {
    if (this.state === 'ended') return;
    this.setState('ended');
    this.app.dataset.end = 'on';
    this.syncInert();
    this.audio.setChapter('end');
    setTimeout(() => { if (this.app.dataset.end === 'on' && !this.menuOpen) $('btnEndReplay').focus({ preventScroll: true }); }, 120);
  }
  hideEnd() {
    if (this.app.dataset.end !== 'on') return;
    this.app.dataset.end = '';
    this.syncInert();
    if ($('endcard').contains(document.activeElement)) $('btnPlay').focus({ preventScroll: true });
  }

  /** Everything that is covered or invisible must also be unreachable by keyboard and screen readers. */
  syncInert() {
    const menu = !!this.menuOpen, end = this.app.dataset.end === 'on', title = this.state === 'title';
    const set = (el, v) => { if (el && el.inert !== v) el.inert = v; };
    set($('topbar'), menu || end || title);
    set($('player'), menu || end || title);
    set($('intro'), menu || !title);
    set($('endcard'), menu || !end);
  }

  // ------------------------------------------------------------------ captions
  setCaption(text, instant = false) {
    const cont = this.el.captions, p = this.el.capText;
    if (!text) {
      if (instant) { p.textContent = ''; cont.classList.remove('out'); } else if (p.textContent) cont.classList.add('out');
      return;
    }
    cont.classList.remove('out');
    p.textContent = '';
    const words = text.split(' ');
    words.forEach((w, i) => {
      const s = document.createElement('span');
      s.className = 'w'; s.style.setProperty('--i', i); s.textContent = w + (i < words.length - 1 ? ' ' : '');
      p.appendChild(s);
    });
  }

  // ------------------------------------------------------------------ frame loop
  tick = (time, deltaTime) => {
    const dt = Math.min(deltaTime / 1000, 0.1);
    const sc = this.scene;
    if (sc) {
      const animate = this.running;
      if (animate || sc.dirty || this.master?.isActive()) sc.frame(animate ? dt : 0, animate);
    }
    this.updateUI();
    // chapter flow
    if (this.state === 'playing' && this.master && this.idx >= 0) {
      const D = CHAPTERS[this.idx].duration, t = this.master.time();
      if (this.idx < N - 1) {
        if (!this.advancing && t >= D - 1.15) { this.advancing = true; this.goTo(this.idx + 1); }
      } else if (t >= D - 2.6 && this.app.dataset.end !== 'on') this.showEnd();
    }
  };

  updateUI(force = false) {
    if (this.idx < 0 || !this.master) { return; }
    const ch = CHAPTERS[this.idx];
    const t = this.state === 'curtain' ? (this.master.time()) : this.master.time();
    // progress
    let elapsed = 0;
    for (let i = 0; i < this.idx; i++) elapsed += CHAPTERS[i].duration;
    elapsed += Math.min(t, ch.duration);
    const key = Math.round(t * 30) + ':' + this.idx;
    if (key !== this.lastUI.key || force) {
      this.lastUI.key = key;
      this.fills.forEach((f, i) => {
        const p = i < this.idx ? 1 : i === this.idx ? clamp(t / ch.duration, 0, 1) : 0;
        if (f._p !== p) { f.style.transform = `scaleX(${p.toFixed(4)})`; f._p = p; }
      });
      const txt = `${fmt(elapsed)} / ${fmt(TOTAL)}`;
      if (txt !== this.lastUI.txt) { this.el.time.textContent = txt; this.lastUI.txt = txt; }
      const pct = Math.round((elapsed / TOTAL) * 100);
      if (pct !== this.lastUI.pct) { this.el.timeline.setAttribute('aria-valuenow', pct); this.el.timeline.setAttribute('aria-valuetext', `${ch.title}, ${fmt(t)} of ${fmt(ch.duration)}`); this.lastUI.pct = pct; }
    }
    // captions
    if (this.state !== 'curtain') {
      let k = -1;
      for (let i = 0; i < ch.captions.length; i++) { const c = ch.captions[i]; if (t >= c.t && t < c.t + c.d) { k = i; break; } }
      if (k !== this.capKey) { this.capKey = k; this.setCaption(k >= 0 ? ch.captions[k].text : null); }
    } else if (this.capKey !== -1) { this.capKey = -1; this.setCaption(null, true); }
  }
}
