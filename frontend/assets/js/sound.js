/**
 * SKYO — Paisaje Sonoro Espacial "Deep Liquid Glass" (Web Audio API, 0 KB)
 * Diseño acústico cinematográfico, armónico y sutil:
 *  - Reverb convolucional estéreo aterciopelada generada localmente (sin picos metálicos).
 *  - Vuelo orbital con sub-bajo limpio, pad armónico en Re sus2 y paneo espacial discreto.
 *  - Micro-tactos ópticos de cristal en coherencia tonal para exploración e IR SPHEREx.
 */

const MUTE_KEY = 'skyo_sound_muted';

let ctx = null;
let masterGain = null;
let dryBus = null;
let reverbBus = null;
let subFilter = null;
let noiseBuffer = null;
let isMutedState = false;
let flightNodes = null;
let lastUiCueTime = 0;
let listenersBound = false;
const cueCooldowns = new Map();

try {
  isMutedState = localStorage.getItem(MUTE_KEY) === '1';
} catch {
  isMutedState = false;
}

function getAudioCtor() {
  return window.AudioContext || window.webkitAudioContext || null;
}

function createWarmSaturationCurve(amount = 0.14) {
  const n = 256;
  const curve = new Float32Array(n);
  const k = amount * 6;
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = k > 0 ? ((1 + k) * x) / (1 + k * Math.abs(x)) : x;
  }
  return curve;
}

const WARM_SATURATION_CURVE = createWarmSaturationCurve(0.12);

function buildCosmosImpulse(ac, seconds = 2.05) {
  const len = Math.floor(ac.sampleRate * seconds);
  const ir = ac.createBuffer(2, len, ac.sampleRate);
  for (let chIdx = 0; chIdx < 2; chIdx++) {
    const data = ir.getChannelData(chIdx);
    let lp = 0;
    const damp = 0.14; // Atenuación progresiva de agudos (~cámara espacial cálida)
    for (let i = 0; i < len; i++) {
      const t = i / len;
      const env = Math.sin(Math.min(1, t * 28) * Math.PI * 0.5) * Math.pow(1 - t, 2.75);
      const raw = (Math.random() * 2 - 1) * env;
      lp += damp * (raw - lp);
      data[i] = lp * 0.42;
    }
  }
  return ir;
}

function ensureContext() {
  if (ctx) return ctx;
  const Ctor = getAudioCtor();
  if (!Ctor) return null;
  try {
    ctx = new Ctor();

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 20;
    comp.ratio.value = 3.2;
    comp.attack.value = 0.012;
    comp.release.value = 0.24;

    // Limitador de brillo alto para evitar estridencia en portátiles y auriculares
    const warmthFilter = ctx.createBiquadFilter();
    warmthFilter.type = 'lowpass';
    warmthFilter.frequency.value = 4800;
    warmthFilter.Q.value = 0.5;

    masterGain = ctx.createGain();
    masterGain.gain.value = isMutedState ? 0 : 0.78;

    dryBus = ctx.createGain();
    dryBus.gain.value = 0.85;

    const reverbPreDelay = ctx.createDelay(0.1);
    reverbPreDelay.delayTime.value = 0.018;

    const convolver = ctx.createConvolver();
    convolver.buffer = buildCosmosImpulse(ctx, 2.05);

    const reverbReturn = ctx.createGain();
    reverbReturn.gain.value = 0.58;

    reverbBus = ctx.createGain();
    reverbBus.gain.value = 1;

    // Filtro específico para sub-bajos limpios
    subFilter = ctx.createBiquadFilter();
    subFilter.type = 'lowpass';
    subFilter.frequency.value = 220;
    subFilter.Q.value = 0.55;

    dryBus.connect(warmthFilter);
    subFilter.connect(warmthFilter);
    reverbBus.connect(reverbPreDelay);
    reverbPreDelay.connect(convolver);
    convolver.connect(reverbReturn);
    reverbReturn.connect(warmthFilter);

    warmthFilter.connect(comp);
    comp.connect(masterGain);
    masterGain.connect(ctx.destination);

    // Búfer de ruido marrón/sub-sónico ultra filtrado (sin siseo blanco)
    const len = Math.floor(ctx.sampleRate * 2.2);
    noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const ch = noiseBuffer.getChannelData(0);
    let brown = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      brown = (brown + 0.018 * white) / 1.018;
      ch[i] = Math.max(-1, Math.min(1, brown * 2.6));
    }

    if (!listenersBound) {
      listenersBound = true;
      document.addEventListener('visibilitychange', () => {
        if (!ctx) return;
        if (document.hidden) {
          stopFlightAudio();
          ctx.suspend().catch(() => {});
        } else if (!isMutedState && ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }
      });
    }
  } catch {
    ctx = null;
  }
  return ctx;
}

export function isSoundMuted() {
  return isMutedState;
}

export function setSoundMuted(muted) {
  isMutedState = Boolean(muted);
  try {
    localStorage.setItem(MUTE_KEY, isMutedState ? '1' : '0');
  } catch {
    // Almacenamiento bloqueado
  }
  if (masterGain && ctx) {
    const now = ctx.currentTime;
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.setTargetAtTime(isMutedState ? 0 : 0.78, now, 0.04);
  }
  if (isMutedState) {
    stopFlightAudio();
  } else {
    unlockAudio();
  }
  return isMutedState;
}

export function unlockAudio() {
  if (isMutedState) return false;
  const ac = ensureContext();
  if (!ac) return false;
  if (ac.state === 'suspended') {
    ac.resume().catch(() => {});
  }
  return true;
}

function connectPanned(ac, node, pan, reverbSend = 0.28) {
  let target = node;
  if (typeof ac.createStereoPanner === 'function' && Math.abs(pan) > 0.01) {
    const panner = ac.createStereoPanner();
    panner.pan.value = Math.max(-0.75, Math.min(0.75, pan));
    node.connect(panner);
    target = panner;
  }
  target.connect(dryBus);
  if (reverbSend > 0 && reverbBus) {
    const send = ac.createGain();
    send.gain.value = reverbSend;
    target.connect(send);
    send.connect(reverbBus);
  }
}

/**
 * Voz óptica "Liquid Glass": ataque sedoso sin chasquidos, cuerpo puro
 * y opcionalmente un micro-armónico de octava que aporta tacto vítreo.
 */
function playGlassVoice({
  freq,
  freqEnd = null,
  duration = 0.22,
  attack = 0.012,
  delay = 0,
  gainPeak = 0.032,
  pan = 0,
  reverb = 0.34,
  overtoneGain = 0.18
}) {
  if (isMutedState || document.hidden) return;
  const ac = ensureContext();
  if (!ac || !dryBus) return;
  if (ac.state === 'suspended') ac.resume().catch(() => {});

  const t0 = ac.currentTime + delay;
  const amp = ac.createGain();
  amp.gain.setValueAtTime(0.0001, t0);
  amp.gain.linearRampToValueAtTime(gainPeak, t0 + attack);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

  const osc = ac.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(Math.max(28, freq), t0);
  if (freqEnd && freqEnd !== freq) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(28, freqEnd), t0 + duration);
  }
  osc.connect(amp);

  let overOsc = null;
  if (overtoneGain > 0) {
    overOsc = ac.createOscillator();
    overOsc.type = 'sine';
    overOsc.frequency.setValueAtTime(Math.min(6200, freq * 2.002), t0);
    const overAmp = ac.createGain();
    overAmp.gain.setValueAtTime(0.0001, t0);
    overAmp.gain.linearRampToValueAtTime(gainPeak * overtoneGain, t0 + Math.min(0.01, attack));
    overAmp.gain.exponentialRampToValueAtTime(0.0001, t0 + Math.min(duration * 0.45, 0.14));
    overOsc.connect(overAmp);
    connectPanned(ac, overAmp, pan, reverb * 0.6);
    overOsc.start(t0);
    overOsc.stop(t0 + duration + 0.04);
  }

  connectPanned(ac, amp, pan, reverb);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

/**
 * Pulso sub-gravedad cinematográfico (sin frecuencias nasales).
 */
function playSubSwell({ freqStart = 68, freqEnd = 36.71, duration = 0.55, delay = 0, gainPeak = 0.16, pan = 0 }) {
  if (isMutedState || document.hidden) return;
  const ac = ensureContext();
  if (!ac || !subFilter) return;

  const t0 = ac.currentTime + delay;
  const osc = ac.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freqStart, t0);
  osc.frequency.exponentialRampToValueAtTime(freqEnd, t0 + duration);

  // Segundo armónico muy tibio para que suene lleno incluso en altavoces de laptop
  const warmOsc = ac.createOscillator();
  warmOsc.type = 'sine';
  warmOsc.frequency.setValueAtTime(freqStart * 2, t0);
  warmOsc.frequency.exponentialRampToValueAtTime(freqEnd * 2, t0 + duration);

  const shaper = ac.createWaveShaper();
  shaper.curve = WARM_SATURATION_CURVE;

  const env = ac.createGain();
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.linearRampToValueAtTime(gainPeak, t0 + 0.045);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

  const warmGain = ac.createGain();
  warmGain.gain.value = 0.28;

  osc.connect(shaper);
  warmOsc.connect(warmGain);
  warmGain.connect(shaper);
  shaper.connect(env);

  if (typeof ac.createStereoPanner === 'function' && Math.abs(pan) > 0.01) {
    const p = ac.createStereoPanner();
    p.pan.setValueAtTime(Math.max(-0.5, Math.min(0.5, pan)), t0);
    env.connect(p);
    p.connect(subFilter);
  } else {
    env.connect(subFilter);
  }

  osc.start(t0);
  warmOsc.start(t0);
  osc.stop(t0 + duration + 0.06);
  warmOsc.stop(t0 + duration + 0.06);
}

/**
 * Acorde holográfico al acoplarse KRYO-9 dentro del módulo guía (#ha).
 */
function playDockingHarmonic() {
  if (isMutedState || document.hidden) return;
  // Re sus2 (D4 - A4 - E5 - A5) etéreo, flotando en la reverb espacial
  const chord = [
    { f: 293.66, delay: 0.0, dur: 1.05, gain: 0.044, over: 0.16 },
    { f: 440.0, delay: 0.06, dur: 0.96, gain: 0.040, over: 0.20 },
    { f: 659.25, delay: 0.12, dur: 0.88, gain: 0.034, over: 0.24 }
  ];
  for (const n of chord) {
    playGlassVoice({
      freq: n.f,
      duration: n.dur,
      attack: 0.042,
      delay: n.delay,
      gainPeak: n.gain,
      pan: 0.28,
      reverb: 0.62,
      overtoneGain: n.over
    });
  }
  playSubSwell({ freqStart: 58, freqEnd: 36.71, duration: 0.46, delay: 0.02, gainPeak: 0.14, pan: 0.2 });
}

export function startFlightAudio() {
  if (isMutedState || document.hidden) return;
  const ac = ensureContext();
  if (!ac || !dryBus) return;
  if (ac.state === 'suspended') ac.resume().catch(() => {});

  stopFlightAudio();

  if (window.__skyReducedMotion) {
    playGlassVoice({ freq: 293.66, duration: 0.48, attack: 0.03, gainPeak: 0.024, reverb: 0.55 });
    playGlassVoice({ freq: 440.0, duration: 0.52, attack: 0.04, delay: 0.05, gainPeak: 0.02, reverb: 0.55 });
    return;
  }

  const now = ac.currentTime;

  // Ignición gravitacional limpia + destello inicial muy delicado en quinta
  playSubSwell({ freqStart: 68, freqEnd: 36.71, duration: 0.62, gainPeak: 0.26, pan: 0.22 });
  playGlassVoice({ freq: 293.66, duration: 0.72, attack: 0.055, gainPeak: 0.040, pan: 0.28, reverb: 0.58, overtoneGain: 0.14 });
  playGlassVoice({ freq: 440.0, duration: 0.78, attack: 0.075, delay: 0.06, gainPeak: 0.036, pan: 0.28, reverb: 0.62, overtoneGain: 0.16 });

  const panner = typeof ac.createStereoPanner === 'function' ? ac.createStereoPanner() : null;
  const busGain = ac.createGain();
  busGain.gain.setValueAtTime(0.0001, now);
  busGain.gain.linearRampToValueAtTime(1, now + 0.14);

  if (panner) {
    panner.pan.setValueAtTime(0.28, now);
    busGain.connect(panner);
    panner.connect(dryBus);
    if (reverbBus) {
      const send = ac.createGain();
      send.gain.value = 0.52;
      panner.connect(send);
      send.connect(reverbBus);
    }
  } else {
    busGain.connect(dryBus);
    if (reverbBus) {
      const send = ac.createGain();
      send.gain.value = 0.52;
      busGain.connect(send);
      send.connect(reverbBus);
    }
  }

  // Pad orbital sedoso en quinta abierta (D2 + A2 + E3 + detune coral) tras pasa-bajos cálido
  const padFilter = ac.createBiquadFilter();
  padFilter.type = 'lowpass';
  padFilter.frequency.setValueAtTime(340, now);
  padFilter.Q.value = 0.65; // Sin resonancia nasal

  const padGain = ac.createGain();
  padGain.gain.setValueAtTime(0.0001, now);
  padGain.gain.linearRampToValueAtTime(0.09, now + 0.16);
  padFilter.connect(padGain);
  padGain.connect(busGain);

  const freqs = [
    { f: 73.42, detune: -4, type: 'sine' },    // D2 fundamental cálida
    { f: 73.42, detune: 4, type: 'sine' },     // D2 ancho estéreo analógico
    { f: 110.0, detune: 2, type: 'sine' },     // A2 quinta abierta
    { f: 164.81, detune: -3, type: 'sine' },   // E3 novena flotante
    { f: 220.0, detune: 0, type: 'triangle' }  // A3 suave color armónico tras lowpass
  ];

  const oscs = freqs.map(({ f, detune, type }) => {
    const o = ac.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f, now);
    if (detune) o.detune.setValueAtTime(detune, now);
    o.connect(padFilter);
    o.start(now);
    return { o, baseF: f };
  });

  // Brisa gravitacional sub-sónica (solo graves/medios bajos < 360 Hz, cero estática)
  let airSrc = null;
  let airFilter = null;
  let airGain = null;
  if (noiseBuffer) {
    airSrc = ac.createBufferSource();
    airSrc.buffer = noiseBuffer;
    airSrc.loop = true;

    airFilter = ac.createBiquadFilter();
    airFilter.type = 'lowpass';
    airFilter.frequency.setValueAtTime(190, now);
    airFilter.Q.value = 0.6;

    airGain = ac.createGain();
    airGain.gain.setValueAtTime(0.0001, now);
    airGain.gain.linearRampToValueAtTime(0.024, now + 0.18);

    airSrc.connect(airFilter);
    airFilter.connect(airGain);
    airGain.connect(busGain);
    airSrc.start(now);
  }

  flightNodes = {
    panner,
    busGain,
    padFilter,
    padGain,
    oscs,
    airSrc,
    airFilter,
    airGain,
    playedDockChord: false
  };
}

export function updateFlightAudio(progress, speed = 0, ndcX = 0) {
  if (!flightNodes || !ctx || isMutedState) return;
  const now = ctx.currentTime;
  const p = Math.max(0, Math.min(1, progress));
  const spd = Math.max(0, Math.min(1.4, speed));

  // Seguimiento espacial sutil sin cruzar bruscamente de oído a oído
  if (flightNodes.panner) {
    const panVal = Math.max(-0.55, Math.min(0.55, ndcX * 0.52));
    flightNodes.panner.pan.setTargetAtTime(panVal, now, 0.06);
  }

  // Respiración armónica con el arco de velocidad (sin pitidos Doppler estridentes)
  const pitchLift = 1 + spd * 0.045 - Math.max(0, p - 0.72) * 0.05;
  for (const item of flightNodes.oscs) {
    item.o.frequency.setTargetAtTime(item.baseF * pitchLift, now, 0.06);
  }

  flightNodes.padFilter.frequency.setTargetAtTime(320 + spd * 540, now, 0.07);

  const envelope = p > 0.72 ? Math.max(0.0001, 1 - (p - 0.72) / 0.24) : 1;
  flightNodes.padGain.gain.setTargetAtTime((0.068 + spd * 0.048) * envelope, now, 0.06);

  if (flightNodes.airFilter && flightNodes.airGain) {
    flightNodes.airFilter.frequency.setTargetAtTime(160 + spd * 210, now, 0.07);
    flightNodes.airGain.gain.setTargetAtTime((0.020 + spd * 0.032) * envelope, now, 0.06);
  }

  if (!flightNodes.playedDockChord && p >= 0.78) {
    flightNodes.playedDockChord = true;
    playDockingHarmonic();
  }

  if (p >= 0.98) {
    stopFlightAudio();
  }
}

export function stopFlightAudio() {
  if (!flightNodes || !ctx) {
    flightNodes = null;
    return;
  }
  const nodes = flightNodes;
  flightNodes = null;
  const now = ctx.currentTime;
  try {
    nodes.busGain.gain.cancelScheduledValues(now);
    nodes.busGain.gain.setTargetAtTime(0.0001, now, 0.045);
    const stopAt = now + 0.26;
    for (const item of nodes.oscs) item.o.stop(stopAt);
    if (nodes.airSrc) nodes.airSrc.stop(stopAt);
  } catch {
    // Nodos ya detenidos
  }
}

export function playUiCue(kind = 'click') {
  if (isMutedState || document.hidden) return;
  const nowMs = performance.now();
  const prevMs = cueCooldowns.get(kind) || 0;
  if (nowMs - prevMs < 70 || nowMs - lastUiCueTime < 35) return;
  cueCooldowns.set(kind, nowMs);
  lastUiCueTime = nowMs;

  if (kind === 'band_short') {
    // Brillo infrarrojo cercano (E5 sutil en vidrio, sin glissando)
    playGlassVoice({ freq: 659.25, duration: 0.22, attack: 0.008, gainPeak: 0.042, pan: 0.12, reverb: 0.34, overtoneGain: 0.24 });
  } else if (kind === 'band_long') {
    // Resonancia infrarroja profunda (A3 cálida + quinta tibia)
    playGlassVoice({ freq: 220.0, duration: 0.30, attack: 0.012, gainPeak: 0.056, pan: 0.12, reverb: 0.38, overtoneGain: 0.14 });
    playGlassVoice({ freq: 329.63, duration: 0.26, attack: 0.016, delay: 0.025, gainPeak: 0.032, pan: 0.12, reverb: 0.38, overtoneGain: 0.10 });
  } else if (kind === 'epoch' || kind === 'blink') {
    // Micro-clic óptico discreto en consola
    playGlassVoice({ freq: kind === 'blink' ? 523.25 : 440.0, duration: 0.095, attack: 0.005, gainPeak: 0.036, pan: 0, reverb: 0.22, overtoneGain: 0.18 });
  } else if (kind === 'select') {
    // Enfoque suave sobre objeto celeste
    playGlassVoice({ freq: 392.0, duration: 0.22, attack: 0.010, gainPeak: 0.038, pan: 0, reverb: 0.36, overtoneGain: 0.15 });
    playGlassVoice({ freq: 587.33, duration: 0.26, attack: 0.014, delay: 0.035, gainPeak: 0.028, pan: 0, reverb: 0.40, overtoneGain: 0.12 });
  } else if (kind === 'candidate' || kind === 'mission') {
    // Díada armónica contemplativa (D4 - A4 - E5), nunca arpegio arcade
    playGlassVoice({ freq: 293.66, duration: 0.72, attack: 0.028, delay: 0, gainPeak: 0.046, pan: 0.22, reverb: 0.58, overtoneGain: 0.12 });
    playGlassVoice({ freq: 440.0, duration: 0.76, attack: 0.032, delay: 0.065, gainPeak: 0.040, pan: 0.24, reverb: 0.60, overtoneGain: 0.14 });
    playGlassVoice({ freq: 659.25, duration: 0.80, attack: 0.036, delay: 0.13, gainPeak: 0.032, pan: 0.26, reverb: 0.64, overtoneGain: 0.16 });
  } else if (kind === 'guide') {
    // Pulso breve de diálogo de KRYO-9
    playGlassVoice({ freq: 440.0, duration: 0.18, attack: 0.008, delay: 0, gainPeak: 0.036, pan: 0.26, reverb: 0.36, overtoneGain: 0.16 });
    playGlassVoice({ freq: 659.25, duration: 0.24, attack: 0.012, delay: 0.045, gainPeak: 0.032, pan: 0.26, reverb: 0.40, overtoneGain: 0.16 });
  } else {
    playGlassVoice({ freq: 440.0, duration: 0.09, attack: 0.005, gainPeak: 0.032, reverb: 0.22, overtoneGain: 0.14 });
  }
}
