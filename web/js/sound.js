const STORAGE_KEY = 'boxdroll:sound';

// Every melodic note comes from C major pentatonic so overlapping sounds stay consonant.
const REVEAL_NOTES = [79, 81, 84, 86, 88, 91, 93];
const WIN_NOTES = [72, 76, 79, 84];

let context = null;
let output = null;
let noiseBuffer = null;
let enabled = readSavedSetting();

const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);

function readSavedSetting() {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'off';
  } catch {
    return true;
  }
}

function saveSetting() {
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off');
  } catch {
    // Storage is blocked in some private modes; the choice just won't persist.
  }
}

function createContext() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) {
    return;
  }

  // Mix with whatever else is playing (music, podcasts) instead of pausing it on iOS.
  if (navigator.audioSession) {
    navigator.audioSession.type = 'ambient';
  }

  context = new AudioContext();

  const compressor = context.createDynamicsCompressor();
  compressor.connect(context.destination);
  output = context.createGain();
  output.gain.value = 0.6;
  output.connect(compressor);

  noiseBuffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
  const samples = noiseBuffer.getChannelData(0);
  for (let i = 0; i < samples.length; i++) {
    samples[i] = Math.random() * 2 - 1;
  }

  // Older iOS only unlocks output once a sound starts inside the gesture itself.
  const silence = context.createBufferSource();
  silence.buffer = context.createBuffer(1, 1, context.sampleRate);
  silence.connect(context.destination);
  silence.start(0);
}

// Browsers only allow audio after a user gesture, and iOS suspends it again after
// backgrounding, so every gesture makes sure the context exists and is running.
function unlock() {
  if (!context) {
    createContext();
  }
  if (context && context.state !== 'running') {
    context.resume().catch(() => {});
  }
}

for (const type of ['pointerdown', 'pointerup', 'touchend', 'keydown', 'click']) {
  window.addEventListener(type, unlock, { capture: true, passive: true });
}

const canPlay = () => enabled && context && context.state !== 'closed';

function envelope(start, end, volume) {
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);
  gain.connect(output);
  return gain;
}

function voice({ type = 'square', note, slideTo, at = 0, duration, volume, cutoff = 4000 }) {
  const start = context.currentTime + at;
  const end = start + duration;

  const oscillator = context.createOscillator();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(note, start);
  if (slideTo) {
    oscillator.frequency.exponentialRampToValueAtTime(slideTo, end);
  }

  // Squares straight from the oscillator are harsh; rounding off the top keeps them 8-bit but soft.
  const filter = context.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = cutoff;

  oscillator.connect(filter);
  filter.connect(envelope(start, end, volume));
  oscillator.start(start);
  oscillator.stop(end + 0.02);
}

function noise({ at = 0, duration, volume, frequency }) {
  const start = context.currentTime + at;
  const end = start + duration;

  const source = context.createBufferSource();
  source.buffer = noiseBuffer;

  const filter = context.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = frequency;

  source.connect(filter);
  filter.connect(envelope(start, end, volume));
  source.start(start);
  source.stop(end + 0.02);
}

export function isSoundOn() {
  return enabled;
}

export function setSoundOn(on) {
  enabled = on;
  saveSetting();
}

// Pulling the slot machine lever: a latch click, a falling clunk and the catch.
export function lever() {
  if (!canPlay()) {
    return;
  }
  noise({ duration: 0.03, volume: 0.3, frequency: 2600 });
  voice({ note: 220, slideTo: 70, duration: 0.14, volume: 0.35, cutoff: 1500 });
  noise({ at: 0.08, duration: 0.04, volume: 0.2, frequency: 1400 });
}

// One click per title crossing the payline, getting lower and weightier as the reel slows.
export function tick(progress) {
  if (!canPlay()) {
    return;
  }
  const settling = progress ** 3;
  voice({
    note: 1800 - 900 * settling,
    duration: 0.012 + 0.03 * settling,
    volume: 0.035 + 0.09 * settling,
    cutoff: 3200,
  });
}

// Confetti pop and a quick rising arpeggio that lands with the payline flash.
export function win() {
  if (!canPlay()) {
    return;
  }
  noise({ duration: 0.09, volume: 0.18, frequency: 4200 });
  for (const [index, midi] of WIN_NOTES.entries()) {
    const isLast = index === WIN_NOTES.length - 1;
    voice({
      note: hz(midi),
      at: 0.02 + index * 0.07,
      duration: isLast ? 0.4 : 0.09,
      volume: 0.13,
      cutoff: 3500,
    });
  }
  voice({ type: 'triangle', note: hz(96), at: 0.23, duration: 0.45, volume: 0.07 });
}

// Each pixelation step of the poster climbs a note, then a soft chime when it turns sharp.
export function reveal(step, steps) {
  if (!canPlay()) {
    return;
  }
  if (step < steps) {
    const midi = REVEAL_NOTES[Math.round((step / (steps - 1)) * (REVEAL_NOTES.length - 1))];
    voice({ type: 'triangle', note: hz(midi), duration: 0.07, volume: 0.09 });
    return;
  }
  voice({ type: 'triangle', note: hz(96), duration: 0.4, volume: 0.08 });
  voice({ type: 'sine', note: hz(100), at: 0.03, duration: 0.45, volume: 0.05 });
}

// A low "nuh-uh" in time with the input shake.
export function error() {
  if (!canPlay()) {
    return;
  }
  voice({ note: hz(57), duration: 0.09, volume: 0.18, cutoff: 1400 });
  voice({ note: hz(50), slideTo: hz(48), at: 0.11, duration: 0.18, volume: 0.18, cutoff: 1400 });
}

export function blip() {
  if (!canPlay()) {
    return;
  }
  voice({ note: hz(84), duration: 0.03, volume: 0.07 });
  voice({ note: hz(91), at: 0.04, duration: 0.05, volume: 0.07 });
}
