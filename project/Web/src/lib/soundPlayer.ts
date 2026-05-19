// Play lung sounds using audio files
let ctx: AudioContext | null = null;
const getCtx = () => {
  if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  return ctx;
};

type Stop = () => void;

interface Recipe {
  fileUrl: string;
}

const recipes: Record<string, Recipe> = {
  vesicular: { fileUrl: "/audio/vesicular%20breath.m4a" },
  normal: { fileUrl: "/audio/vesicular%20breath.m4a" },
  bronchial: { fileUrl: "/audio/Bronchial%20breath%20sound.m4a" },
  bronchovesicular: { fileUrl: "/audio/Bronchovesicular%20sound.m4a" },
  stridor: { fileUrl: "/audio/Stridor%20sound.m4a" },
  wheezing: { fileUrl: "/audio/Wheezing%20sound.m4a" },
  rhonchi: { fileUrl: "/audio/Ronchi%20sound.m4a" },
  fineCrackles: { fileUrl: "/audio/Crackles%20fine%20sound.m4a" },
  coarseCrackles: { fileUrl: "/audio/Crackles%20coarse%20sound.m4a" },
  pleuralRub: { fileUrl: "/audio/Pleural%20rub%20sound.m4a" },
  squawks: { fileUrl: "/audio/Squawk%20sound.m4a" },
};

const bufferCache: Record<string, AudioBuffer> = {};

export const playSound = (key: keyof typeof recipes, onEnded?: () => void): Stop => {
  const c = getCtx();
  if (c.state === "suspended") c.resume();
  const master = c.createGain();
  master.gain.value = 0.9;
  master.connect(c.destination);
  const r = recipes[key];

  let src: AudioBufferSourceNode | null = null;
  let stopTimeout: number;

  const handleEnd = () => {
    try { master.disconnect(); } catch { }
    if (onEnded) onEnded();
  };

  const startPlaying = (buffer: AudioBuffer) => {
    src = c.createBufferSource();
    src.buffer = buffer;
    src.connect(master);
    src.start();
    src.onended = handleEnd;
  };

  if (bufferCache[r.fileUrl]) {
    startPlaying(bufferCache[r.fileUrl]);
  } else {
    fetch(r.fileUrl)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.arrayBuffer();
      })
      .then(data => c.decodeAudioData(data))
      .then(buffer => {
        bufferCache[r.fileUrl] = buffer;
        startPlaying(buffer);
      })
      .catch(err => {
        console.error("Error loading or playing audio file:", err);
        handleEnd();
      });
  }

  return () => {
    if (src) {
      src.onended = null;
      try { src.stop(); } catch { }
    }
    handleEnd();
  };
};

export type SoundKey = keyof typeof recipes;

