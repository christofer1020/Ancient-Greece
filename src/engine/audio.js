// Procedural soundscape — no audio files. Everything is synthesised with WebAudio:
// ambient beds (sea, wind, crowd, fire, night), a generative lyre in Greek modes, frame drums,
// and one-shot cues triggered from the chapter timelines.

const MODES = {
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  hijaz: [0, 1, 4, 5, 7, 8, 10],
};

// Mood per chapter index (-1 = title, 'end' = end card)
const MOODS = {
  '-1': { root: 293.66, mode: 'dorian', bpm: 52, density: 0.5, drone: 0.05, sea: 0.45, wind: 0.08, birds: 0.5, crowd: 0, fire: 0, drums: 0, night: 0 },
  0: { root: 293.66, mode: 'dorian', bpm: 50, density: 0.45, drone: 0.05, sea: 0.7, wind: 0.1, birds: 0.8, crowd: 0.05, fire: 0, drums: 0, night: 0 },
  1: { root: 220, mode: 'dorian', bpm: 58, density: 0.5, drone: 0.08, sea: 0, wind: 0.34, birds: 0, crowd: 0, fire: 0, drums: 0, night: 0, storm: 1 },
  2: { root: 293.66, mode: 'mixolydian', bpm: 74, density: 0.62, drone: 0.04, sea: 0.1, wind: 0.05, birds: 0.35, crowd: 0.5, fire: 0, drums: 0, night: 0 },
  3: { root: 293.66, mode: 'dorian', bpm: 66, density: 0.5, drone: 0.07, sea: 0, wind: 0.12, birds: 0.1, crowd: 0.1, fire: 0.1, drums: 0.5, night: 0 },
  4: { root: 329.63, mode: 'phrygian', bpm: 84, density: 0.4, drone: 0.09, sea: 0.25, wind: 0.2, birds: 0, crowd: 0.1, fire: 0.2, drums: 0.9, night: 0 },
  5: { root: 293.66, mode: 'dorian', bpm: 54, density: 0.5, drone: 0.05, sea: 0, wind: 0.08, birds: 0.5, crowd: 0.22, fire: 0, drums: 0, night: 0 },
  6: { root: 329.63, mode: 'hijaz', bpm: 80, density: 0.5, drone: 0.08, sea: 0, wind: 0.2, birds: 0, crowd: 0.1, fire: 0, drums: 0.7, night: 0 },
  7: { root: 293.66, mode: 'dorian', bpm: 46, density: 0.42, drone: 0.07, sea: 0.4, wind: 0.1, birds: 0.2, crowd: 0, fire: 0, drums: 0, night: 0.5 },
  end: { root: 293.66, mode: 'dorian', bpm: 40, density: 0.25, drone: 0.08, sea: 0.25, wind: 0.05, birds: 0, crowd: 0, fire: 0, drums: 0, night: 0.8 },
};

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.paused = false;
    this.wanted = -1;
    this.mood = null;
    this.beds = {};
    this.step = 0;
    this.deg = 4;
    this.nextT = 0;
    this.nextBird = 0;
    this.nextCrack = 0;
    this.nextClink = 0;
    this.timer = null;
  }

  // ---------------------------------------------------------------- setup
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { this.ctx = new AC({ latencyHint: 'playback' }); } catch { return; }
    const c = this.ctx;
    this.master = c.createGain();
    this.master.gain.value = this.muted ? 0 : 0.8;
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 3.5; comp.attack.value = 0.01; comp.release.value = 0.3;
    this.master.connect(comp); comp.connect(c.destination);

    // reverb
    this.verb = c.createConvolver();
    this.verb.buffer = this.makeIR(2.8, 2.6);
    this.verbIn = c.createGain(); this.verbIn.gain.value = 0.55;
    this.verbOut = c.createGain(); this.verbOut.gain.value = 0.9;
    this.verbIn.connect(this.verb); this.verb.connect(this.verbOut); this.verbOut.connect(this.master);
    // dry bus & echo
    this.dry = c.createGain(); this.dry.gain.value = 1; this.dry.connect(this.master);
    this.echo = c.createDelay(1.5); this.echo.delayTime.value = 0.46;
    const fb = c.createGain(); fb.gain.value = 0.32;
    const echoLP = c.createBiquadFilter(); echoLP.type = 'lowpass'; echoLP.frequency.value = 2200;
    this.echo.connect(echoLP); echoLP.connect(fb); fb.connect(this.echo);
    echoLP.connect(this.verbIn);
    this.echoIn = c.createGain(); this.echoIn.gain.value = 0.28; this.echoIn.connect(this.echo);

    // noise sources
    this.white = this.noise('white'); this.pink = this.noise('pink'); this.brown = this.noise('brown');
    this.buildBeds();
    this.timer = setInterval(() => this.tick(), 30);
    this.nextT = c.currentTime + 0.2;
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) this.ctx.suspend(); else if (!this.paused) this.ctx.resume();
    });
    this.applyMood(this.wanted);
  }

  makeIR(sec, decay) {
    const c = this.ctx, len = Math.floor(c.sampleRate * sec);
    const buf = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay) * (i < 2000 ? i / 2000 : 1);
    }
    return buf;
  }

  noise(kind) {
    const c = this.ctx, len = c.sampleRate * 4;
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (kind === 'white') d[i] = w;
      else if (kind === 'pink') {
        b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
        b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926;
      } else { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
    }
    return buf;
  }

  loopNoise(buf) {
    const s = this.ctx.createBufferSource();
    s.buffer = buf; s.loop = true; s.loopStart = 0; s.loopEnd = buf.duration;
    s.start(0, Math.random() * 3);
    return s;
  }

  buildBeds() {
    const c = this.ctx;
    const mk = (src, type, f, q, g = 0) => {
      const flt = c.createBiquadFilter(); flt.type = type; flt.frequency.value = f; flt.Q.value = q;
      const gain = c.createGain(); gain.gain.value = g;
      src.connect(flt); flt.connect(gain); gain.connect(this.dry);
      return { flt, gain, src };
    };
    // sea: pink noise, low-passed, with slow swell
    const sea = mk(this.loopNoise(this.pink), 'lowpass', 700, 0.4);
    const swell = c.createOscillator(); swell.frequency.value = 0.11;
    const swellG = c.createGain(); swellG.gain.value = 260;
    swell.connect(swellG); swellG.connect(sea.flt.frequency); swell.start();
    const swell2 = c.createOscillator(); swell2.frequency.value = 0.07;
    const sg2 = c.createGain(); sg2.gain.value = 0.06; swell2.connect(sg2); sg2.connect(sea.gain.gain); swell2.start();
    this.beds.sea = sea;
    // wind
    const wind = mk(this.loopNoise(this.pink), 'bandpass', 520, 0.9);
    const wl = c.createOscillator(); wl.frequency.value = 0.19; const wg = c.createGain(); wg.gain.value = 200; wl.connect(wg); wg.connect(wind.flt.frequency); wl.start();
    this.beds.wind = wind;
    // crowd murmur: band-passed noise with syllabic modulation
    const crowd = mk(this.loopNoise(this.pink), 'bandpass', 780, 0.6);
    const cm = c.createOscillator(); cm.frequency.value = 3.3; const cmg = c.createGain(); cmg.gain.value = 0.35; const cmOff = c.createGain(); cmOff.gain.value = 0;
    cm.connect(cmg); cmg.connect(crowd.gain.gain); cm.start();
    this.beds.crowd = crowd;
    // fire: crackling is scheduled; this is the soft roar
    const fire = mk(this.loopNoise(this.brown), 'bandpass', 380, 0.5);
    this.beds.fire = fire;
    // storm rumble
    const rumble = mk(this.loopNoise(this.brown), 'lowpass', 140, 0.7);
    this.beds.rumble = rumble;
    // night: crickets (pulsed high sines) via oscillator + LFO gating
    const cr = c.createOscillator(); cr.type = 'sine'; cr.frequency.value = 4300;
    const crg = c.createGain(); crg.gain.value = 0;
    const gate = c.createOscillator(); gate.type = 'square'; gate.frequency.value = 7.2;
    const gateG = c.createGain(); gateG.gain.value = 0.5;
    const gateOff = c.createConstantSource ? c.createConstantSource() : null;
    cr.connect(crg); gate.connect(gateG); gateG.connect(crg.gain); cr.start(); gate.start();
    const crOut = c.createGain(); crOut.gain.value = 0; crg.connect(crOut); crOut.connect(this.dry);
    this.beds.night = { gain: crOut };
    // drone: two detuned voices a fifth apart
    const dr = c.createGain(); dr.gain.value = 0; const drF = c.createBiquadFilter(); drF.type = 'lowpass'; drF.frequency.value = 900;
    dr.connect(drF); drF.connect(this.dry); drF.connect(this.verbIn);
    this.droneVoices = [0, 7].map((semi, i) => {
      const o = c.createOscillator(); o.type = i ? 'sine' : 'triangle'; o.frequency.value = 146.83 * Math.pow(2, semi / 12) * (i ? 0.5 : 1); o.detune.value = i * 5;
      const g = c.createGain(); g.gain.value = i ? 0.5 : 1; o.connect(g); g.connect(dr); o.start();
      return o;
    });
    const dl = c.createOscillator(); dl.frequency.value = 0.05; const dlg = c.createGain(); dlg.gain.value = 300; dl.connect(dlg); dlg.connect(drF.frequency); dl.start();
    this.beds.drone = { gain: dr };
  }

  // ---------------------------------------------------------------- state
  setMuted(m) {
    this.muted = m;
    if (!this.ctx) return;
    this.master.gain.cancelScheduledValues(this.ctx.currentTime);
    this.master.gain.setTargetAtTime(m ? 0 : this.paused ? 0.32 : 0.8, this.ctx.currentTime, 0.12);
  }
  pauseSoft() {
    this.paused = true;
    if (!this.ctx || this.muted) return;
    this.master.gain.setTargetAtTime(0.28, this.ctx.currentTime, 0.2);
  }
  resume() {
    this.paused = false;
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.nextT = Math.max(this.nextT, this.ctx.currentTime + 0.1);
    if (!this.muted) this.master.gain.setTargetAtTime(0.8, this.ctx.currentTime, 0.2);
  }

  setChapter(i) {
    this.wanted = i;
    this.paused = false;
    if (this.ctx) this.applyMood(i);
  }

  applyMood(i) {
    if (!this.ctx) return;
    const m = MOODS[i] || MOODS[-1];
    this.mood = m;
    const t = this.ctx.currentTime, k = 1.1;
    const set = (bed, v, scale = 1) => bed && bed.gain.gain.setTargetAtTime(v * scale, t, k);
    set(this.beds.sea, m.sea, 0.16);
    set(this.beds.wind, m.wind, 0.2);
    set(this.beds.crowd, m.crowd, 0.2);
    set(this.beds.fire, m.fire, 0.16);
    set(this.beds.rumble, m.storm ? 0.5 : 0, 0.28);
    set(this.beds.night, m.night, 0.02);
    set(this.beds.drone, m.drone, 1);
    this.droneVoices.forEach((o, idx) => o.frequency.setTargetAtTime((m.root / 2) * (idx ? 1.5 * 0.5 * 2 : 1), t, 1.4));
    this.step = 0;
    this.master.gain.setTargetAtTime(this.muted ? 0 : 0.8, t, 0.2);
  }

  // ---------------------------------------------------------------- scheduler
  tick() {
    const c = this.ctx;
    if (!c || c.state !== 'running' || !this.mood) return;
    const m = this.mood, now = c.currentTime;
    if (this.paused || this.muted) { this.nextT = Math.max(this.nextT, now + 0.1); return; }
    const beat = 60 / m.bpm;
    while (this.nextT < now + 0.25) {
      this.musicStep(this.nextT, m, beat);
      this.nextT += beat / 2;
    }
    if (m.birds > 0 && now > this.nextBird) { this.chirp(now + 0.02, m.birds); this.nextBird = now + 1.2 + Math.random() * (5 - m.birds * 3); }
    if (m.fire > 0 && now > this.nextCrack) { this.crack(now + 0.01, m.fire); this.nextCrack = now + 0.08 + Math.random() * 0.5; }
    if (m.crowd > 0.3 && now > this.nextClink) { this.clink(now + 0.01); this.nextClink = now + 0.8 + Math.random() * 3; }
  }

  freq(deg, m) {
    const sc = MODES[m.mode];
    const oct = Math.floor(deg / 7), d = ((deg % 7) + 7) % 7;
    return m.root * Math.pow(2, (sc[d] + 12 * oct) / 12);
  }

  musicStep(t, m, beat) {
    const s = this.step++;
    const strong = s % 8 === 0;
    // drums
    if (m.drums > 0) {
      const pat = m.drums > 0.8 ? [1, 0, 0, 1, 0, 1, 0, 0] : [1, 0, 0, 0, 0, 1, 0, 0];
      if (pat[s % 8]) this.drum(t, 0.5 * m.drums + (strong ? 0.25 : 0));
    }
    // lyre
    if (Math.random() < m.density * (s % 2 === 0 ? 1 : 0.6)) {
      const r = Math.random();
      this.deg += r < 0.4 ? 1 : r < 0.75 ? -1 : r < 0.88 ? 2 : -2;
      if (this.deg > 11) this.deg -= 3; if (this.deg < 0) this.deg += 3;
      if (strong) this.deg = [0, 2, 4][Math.floor(Math.random() * 3)] + 2;
      this.pluck(t, this.freq(this.deg, m), 0.2 + (strong ? 0.06 : 0));
      if (strong || Math.random() < 0.12) this.pluck(t + 0.012, this.freq(this.deg + 4, m), 0.1);
    }
    if (s % 16 === 0) this.pluck(t, this.freq(-7, m), 0.16, 2.4); // low anchor note
  }

  // ---------------------------------------------------------------- voices
  pluck(t, f, vel = 0.2, dur = 1.5) {
    const c = this.ctx;
    const o1 = c.createOscillator(), o2 = c.createOscillator();
    o1.type = 'triangle'; o2.type = 'sine'; o1.frequency.value = f; o2.frequency.value = f * 2.002;
    const flt = c.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.setValueAtTime(3600, t); flt.frequency.exponentialRampToValueAtTime(700, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    const g2 = c.createGain(); g2.gain.value = 0.35;
    o1.connect(flt); o2.connect(g2); g2.connect(flt); flt.connect(g);
    g.connect(this.dry); g.connect(this.verbIn); g.connect(this.echoIn);
    o1.start(t); o2.start(t); o1.stop(t + dur + 0.1); o2.stop(t + dur + 0.1);
  }

  drum(t, vel = 0.5) {
    const c = this.ctx;
    const o = c.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.16);
    const g = c.createGain(); g.gain.setValueAtTime(vel, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    o.connect(g); g.connect(this.dry); g.connect(this.verbIn);
    o.start(t); o.stop(t + 0.55);
    const n = c.createBufferSource(); n.buffer = this.white;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 1.2;
    const ng = c.createGain(); ng.gain.setValueAtTime(vel * 0.3, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    n.connect(f); f.connect(ng); ng.connect(this.dry); n.start(t, Math.random() * 2, 0.1);
  }

  chirp(t, lvl) {
    const c = this.ctx;
    const base = 2600 + Math.random() * 2200, n = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      const o = c.createOscillator(); o.type = 'sine';
      const st = t + i * 0.11;
      o.frequency.setValueAtTime(base, st); o.frequency.exponentialRampToValueAtTime(base * (Math.random() > 0.5 ? 1.5 : 0.7), st + 0.07);
      const g = c.createGain(); g.gain.setValueAtTime(0, st); g.gain.linearRampToValueAtTime(0.035 * lvl, st + 0.012); g.gain.exponentialRampToValueAtTime(0.0005, st + 0.09);
      o.connect(g); g.connect(this.dry); g.connect(this.verbIn);
      o.start(st); o.stop(st + 0.12);
    }
  }

  crack(t, lvl) {
    const c = this.ctx;
    const n = c.createBufferSource(); n.buffer = this.white;
    const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 2500 + Math.random() * 2500;
    const g = c.createGain(); g.gain.setValueAtTime(0.06 * lvl * (0.4 + Math.random()), t); g.gain.exponentialRampToValueAtTime(0.0005, t + 0.02 + Math.random() * 0.03);
    n.connect(f); f.connect(g); g.connect(this.dry); n.start(t, Math.random() * 3, 0.08);
  }

  clink(t) {
    const c = this.ctx;
    const f0 = 1500 + Math.random() * 1500;
    [1, 2.7].forEach((m, i) => {
      const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f0 * m;
      const g = c.createGain(); g.gain.setValueAtTime(0.02 / (i + 1), t); g.gain.exponentialRampToValueAtTime(0.0003, t + 0.3);
      o.connect(g); g.connect(this.dry); g.connect(this.verbIn); o.start(t); o.stop(t + 0.35);
    });
  }

  // ---------------------------------------------------------------- one-shot cues
  cue(name) {
    const c = this.ctx;
    if (!c || this.muted || this.paused || c.state !== 'running') return;
    const t = c.currentTime + 0.02;
    const burst = (dur, type, f, q, vol, attack = 0.01, dest = this.dry) => {
      const n = c.createBufferSource(); n.buffer = this.white;
      const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
      const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0004, t + dur);
      n.connect(fl); fl.connect(g); g.connect(dest); g.connect(this.verbIn); n.start(t, Math.random() * 2, dur + 0.1);
      return { fl, g };
    };
    switch (name) {
      case 'thunder': {
        const b = this.brown, n = c.createBufferSource(); n.buffer = b;
        const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.setValueAtTime(900, t); fl.frequency.exponentialRampToValueAtTime(90, t + 3.2);
        const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.9, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0008, t + 4.5);
        n.connect(fl); fl.connect(g); g.connect(this.dry); g.connect(this.verbIn); n.start(t, Math.random() * 2, 4.6);
        burst(0.18, 'highpass', 3000, 0.7, 0.35, 0.002);
        break;
      }
      case 'chime': {
        [880, 1320, 1760, 2349].forEach((f, i) => {
          const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f * (this.mood ? this.mood.root / 293.66 : 1);
          const g = c.createGain(); g.gain.setValueAtTime(0, t + i * 0.08); g.gain.linearRampToValueAtTime(0.07 / (i + 1), t + i * 0.08 + 0.01); g.gain.exponentialRampToValueAtTime(0.0003, t + 3.2);
          o.connect(g); g.connect(this.dry); g.connect(this.verbIn); o.start(t + i * 0.08); o.stop(t + 3.3);
        });
        break;
      }
      case 'birds': case 'gull': {
        for (let i = 0; i < 4; i++) this.chirp(t + i * 0.4, 1.4);
        break;
      }
      case 'whinny': {
        const o = c.createOscillator(); o.type = 'sawtooth';
        o.frequency.setValueAtTime(520, t); o.frequency.linearRampToValueAtTime(980, t + 0.25); o.frequency.exponentialRampToValueAtTime(320, t + 1.1);
        const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1400; f.Q.value = 2.5;
        const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.1, t + 0.06); g.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
        const vib = c.createOscillator(); vib.frequency.value = 22; const vg = c.createGain(); vg.gain.value = 24; vib.connect(vg); vg.connect(o.frequency); vib.start(t); vib.stop(t + 1.3);
        o.connect(f); f.connect(g); g.connect(this.dry); g.connect(this.verbIn); o.start(t); o.stop(t + 1.3);
        break;
      }
      case 'murmur': burst(3.5, 'bandpass', 800, 0.6, 0.05, 1.2); break;
      case 'applause': {
        for (let i = 0; i < 26; i++) { const tt = t + i * 0.13 + Math.random() * 0.08; const n = c.createBufferSource(); n.buffer = this.white; const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1400 + Math.random() * 2200; f.Q.value = 0.8; const g = c.createGain(); g.gain.setValueAtTime(0.06, tt); g.gain.exponentialRampToValueAtTime(0.0004, tt + 0.14); n.connect(f); f.connect(g); g.connect(this.dry); g.connect(this.verbIn); n.start(tt, Math.random() * 3, 0.16); }
        break;
      }
      case 'clash': {
        burst(0.4, 'bandpass', 2400, 1.5, 0.22, 0.002);
        [1, 2.76, 5.4].forEach((m, i) => { const o = c.createOscillator(); o.type = 'square'; o.frequency.value = 520 * m; const g = c.createGain(); g.gain.setValueAtTime(0.03, t); g.gain.exponentialRampToValueAtTime(0.0005, t + 0.5); o.connect(g); g.connect(this.dry); o.start(t); o.stop(t + 0.55); });
        this.drum(t, 0.7);
        break;
      }
      case 'thump': this.drum(t, 0.85); break;
      case 'horn': {
        const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(164, t); o.frequency.linearRampToValueAtTime(196, t + 0.4);
        const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(300, t); f.frequency.linearRampToValueAtTime(1500, t + 0.5); f.frequency.linearRampToValueAtTime(500, t + 2.2);
        const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.16, t + 0.3); g.gain.setValueAtTime(0.16, t + 1.5); g.gain.exponentialRampToValueAtTime(0.001, t + 2.6);
        o.connect(f); f.connect(g); g.connect(this.dry); g.connect(this.verbIn); o.start(t); o.stop(t + 2.7);
        break;
      }
      case 'ram': {
        this.drum(t, 1);
        burst(0.5, 'bandpass', 380, 1.2, 0.5, 0.003);
        for (let i = 0; i < 4; i++) { const tt = t + 0.5 + i * 0.35; this.drum(tt, 0.6); }
        break;
      }
      case 'fire': {
        for (let i = 0; i < 30; i++) this.crack(t + i * 0.07 + Math.random() * 0.1, 1.6);
        burst(2.8, 'bandpass', 420, 0.6, 0.12, 0.6);
        break;
      }
      case 'gallop': {
        for (let i = 0; i < 20; i++) { const tt = t + i * 0.135; const v = 0.12 * (1 - i / 26); const o = c.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(150, tt); o.frequency.exponentialRampToValueAtTime(60, tt + 0.08); const g = c.createGain(); g.gain.setValueAtTime(v, tt); g.gain.exponentialRampToValueAtTime(0.001, tt + 0.12); o.connect(g); g.connect(this.dry); o.start(tt); o.stop(tt + 0.14); }
        break;
      }
      default: break;
    }
  }
}

export const audio = new AudioEngine();
