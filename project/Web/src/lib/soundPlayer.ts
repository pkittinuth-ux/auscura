// Synthesize lung-like sounds using Web Audio API (no asset needed)
let ctx: AudioContext | null = null;
const getCtx = () => {
  if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  return ctx;
};

type Stop = () => void;

const noiseBuffer = (duration: number) => {
  const c = getCtx();
  const buf = c.createBuffer(1, c.sampleRate * duration, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buf;
};

interface Recipe {
  duration: number;
  build: (c: AudioContext, dest: AudioNode) => void;
}

const recipes: Record<string, Recipe> = {
  vesicular: {
    duration: 4,
    build: (c, dest) => {
      // soft breath: filtered noise modulated
      const src = c.createBufferSource();
      src.buffer = noiseBuffer(4);
      const filter = c.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 220;
      filter.Q.value = 0.8;
      const gain = c.createGain();
      gain.gain.value = 0;
      // breath envelope: in (1.2s) out (0.8s) repeated
      const t0 = c.currentTime;
      for (let i = 0; i < 2; i++) {
        const s = t0 + i * 2;
        gain.gain.setValueAtTime(0, s);
        gain.gain.linearRampToValueAtTime(0.35, s + 0.8);
        gain.gain.linearRampToValueAtTime(0.2, s + 1.2);
        gain.gain.linearRampToValueAtTime(0, s + 2);
      }
      src.connect(filter).connect(gain).connect(dest);
      src.start();
      src.stop(t0 + 4);
    },
  },
  normal: {
    duration: 4,
    build: (c, dest) => recipes.vesicular.build(c, dest),
  },
  bronchial: {
    duration: 4,
    build: (c, dest) => {
      const src = c.createBufferSource();
      src.buffer = noiseBuffer(4);
      const filter = c.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 700;
      filter.Q.value = 1.5;
      const gain = c.createGain();
      gain.gain.value = 0;
      const t0 = c.currentTime;
      for (let i = 0; i < 2; i++) {
        const s = t0 + i * 2;
        gain.gain.setValueAtTime(0, s);
        gain.gain.linearRampToValueAtTime(0.4, s + 0.4);
        gain.gain.linearRampToValueAtTime(0.35, s + 0.6);
        gain.gain.linearRampToValueAtTime(0, s + 1.8);
      }
      src.connect(filter).connect(gain).connect(dest);
      src.start();
      src.stop(t0 + 4);
    },
  },
  stridor: {
    duration: 3,
    build: (c, dest) => {
      const osc = c.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.value = 900;
      const lfo = c.createOscillator();
      lfo.frequency.value = 6;
      const lfoGain = c.createGain();
      lfoGain.gain.value = 80;
      lfo.connect(lfoGain).connect(osc.frequency);
      const gain = c.createGain();
      gain.gain.value = 0;
      const t0 = c.currentTime;
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(0.18, t0 + 0.3);
      gain.gain.linearRampToValueAtTime(0.18, t0 + 2.5);
      gain.gain.linearRampToValueAtTime(0, t0 + 3);
      osc.connect(gain).connect(dest);
      osc.start();
      lfo.start();
      osc.stop(t0 + 3);
      lfo.stop(t0 + 3);
    },
  },
  wheezing: {
    duration: 4,
    build: (c, dest) => {
      const osc = c.createOscillator();
      osc.type = "sine";
      osc.frequency.value = 600;
      const osc2 = c.createOscillator();
      osc2.type = "sine";
      osc2.frequency.value = 750;
      const gain = c.createGain();
      gain.gain.value = 0;
      const t0 = c.currentTime;
      for (let i = 0; i < 2; i++) {
        const s = t0 + i * 2 + 1.0;
        gain.gain.setValueAtTime(0, s);
        gain.gain.linearRampToValueAtTime(0.18, s + 0.2);
        gain.gain.linearRampToValueAtTime(0.18, s + 0.7);
        gain.gain.linearRampToValueAtTime(0, s + 1);
      }
      osc.connect(gain);
      osc2.connect(gain);
      gain.connect(dest);
      osc.start();
      osc2.start();
      osc.stop(t0 + 4);
      osc2.stop(t0 + 4);
    },
  },
  rhonchi: {
    duration: 4,
    build: (c, dest) => {
      const src = c.createBufferSource();
      src.buffer = noiseBuffer(4);
      const filter = c.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 180;
      filter.Q.value = 4;
      const gain = c.createGain();
      gain.gain.value = 0;
      const lfo = c.createOscillator();
      lfo.frequency.value = 5;
      const lfoGain = c.createGain();
      lfoGain.gain.value = 0.15;
      const t0 = c.currentTime;
      gain.gain.setValueAtTime(0.2, t0);
      lfo.connect(lfoGain).connect(gain.gain);
      src.connect(filter).connect(gain).connect(dest);
      src.start();
      lfo.start();
      src.stop(t0 + 4);
      lfo.stop(t0 + 4);
    },
  },
  fineCrackles: {
    duration: 3.5,
    build: (c, dest) => {
      const t0 = c.currentTime;
      // many tiny pops
      for (let i = 0; i < 60; i++) {
        const when = t0 + Math.random() * 3;
        const buf = noiseBuffer(0.03);
        const src = c.createBufferSource();
        src.buffer = buf;
        const filter = c.createBiquadFilter();
        filter.type = "highpass";
        filter.frequency.value = 1500;
        const gain = c.createGain();
        gain.gain.setValueAtTime(0.0, when);
        gain.gain.linearRampToValueAtTime(0.25, when + 0.005);
        gain.gain.linearRampToValueAtTime(0, when + 0.03);
        src.connect(filter).connect(gain).connect(dest);
        src.start(when);
        src.stop(when + 0.03);
      }
    },
  },
  coarseCrackles: {
    duration: 3.5,
    build: (c, dest) => {
      const t0 = c.currentTime;
      for (let i = 0; i < 25; i++) {
        const when = t0 + Math.random() * 3;
        const buf = noiseBuffer(0.08);
        const src = c.createBufferSource();
        src.buffer = buf;
        const filter = c.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 600;
        const gain = c.createGain();
        gain.gain.setValueAtTime(0.0, when);
        gain.gain.linearRampToValueAtTime(0.45, when + 0.01);
        gain.gain.linearRampToValueAtTime(0, when + 0.08);
        src.connect(filter).connect(gain).connect(dest);
        src.start(when);
        src.stop(when + 0.08);
      }
    },
  },
  pleuralRub: {
    duration: 4,
    build: (c, dest) => {
      const src = c.createBufferSource();
      src.buffer = noiseBuffer(4);
      const filter = c.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 350;
      filter.Q.value = 2;
      const gain = c.createGain();
      const t0 = c.currentTime;
      gain.gain.value = 0;
      for (let i = 0; i < 2; i++) {
        const s = t0 + i * 2;
        gain.gain.setValueAtTime(0, s);
        gain.gain.linearRampToValueAtTime(0.3, s + 0.4);
        gain.gain.linearRampToValueAtTime(0, s + 0.9);
        gain.gain.linearRampToValueAtTime(0.25, s + 1.1);
        gain.gain.linearRampToValueAtTime(0, s + 1.6);
      }
      src.connect(filter).connect(gain).connect(dest);
      src.start();
      src.stop(t0 + 4);
    },
  },
  squawks: {
    duration: 3,
    build: (c, dest) => {
      const t0 = c.currentTime;
      for (let i = 0; i < 4; i++) {
        const when = t0 + i * 0.7 + 0.2;
        const osc = c.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(800, when);
        osc.frequency.exponentialRampToValueAtTime(1400, when + 0.18);
        const gain = c.createGain();
        gain.gain.setValueAtTime(0, when);
        gain.gain.linearRampToValueAtTime(0.2, when + 0.02);
        gain.gain.linearRampToValueAtTime(0, when + 0.2);
        osc.connect(gain).connect(dest);
        osc.start(when);
        osc.stop(when + 0.22);
      }
    },
  },
};

export const playSound = (key: keyof typeof recipes): Stop => {
  const c = getCtx();
  if (c.state === "suspended") c.resume();
  const master = c.createGain();
  master.gain.value = 0.9;
  master.connect(c.destination);
  const r = recipes[key];
  r.build(c, master);
  const timeout = window.setTimeout(() => master.disconnect(), (r.duration + 0.2) * 1000);
  return () => {
    clearTimeout(timeout);
    try { master.disconnect(); } catch {}
  };
};

export type SoundKey = keyof typeof recipes;
