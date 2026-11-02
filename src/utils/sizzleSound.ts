// Procedural Web Audio synthesizer for realistic hot cast-iron takoyaki sizzle ("xèo xèo")

let sharedAudioCtx: AudioContext | null = null;
let sharedNoiseBuffer: AudioBuffer | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!sharedAudioCtx) {
    const AudioCtxClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtxClass) {
      sharedAudioCtx = new AudioCtxClass();
    }
  }
  if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {
      // Ignore autoplay restriction errors until user interacts
    });
  }
  return sharedAudioCtx;
}

function getNoiseBuffer(ctx: AudioContext): AudioBuffer {
  if (sharedNoiseBuffer && sharedNoiseBuffer.sampleRate === ctx.sampleRate) {
    return sharedNoiseBuffer;
  }
  const duration = 1.2;
  const bufferSize = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  // Create sizzling texture with micro-crackles
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    // Occasional sharp oil droplet pop
    const pop = Math.random() < 0.015 ? (Math.random() * 2 - 1) * 2.4 : 1;
    data[i] = Math.max(-1, Math.min(1, white * pop));
  }

  sharedNoiseBuffer = buffer;
  return buffer;
}

export function playTakoyakiSizzle(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const duration = 0.55;

    // 1. Main "Xèo xèo" sizzling steam/oil layer (bandpass + highpass filtered noise)
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = getNoiseBuffer(ctx);

    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(3400, now);
    bandpass.frequency.exponentialRampToValueAtTime(2200, now + duration);
    bandpass.Q.setValueAtTime(0.85, now);

    const highshelf = ctx.createBiquadFilter();
    highshelf.type = 'highshelf';
    highshelf.frequency.setValueAtTime(4800, now);
    highshelf.gain.setValueAtTime(6, now);

    const sizzleGain = ctx.createGain();
    sizzleGain.gain.setValueAtTime(0.001, now);
    // Quick crisp attack ("xèo")
    sizzleGain.gain.linearRampToValueAtTime(0.11, now + 0.035);
    // Secondary wave ("xèo...")
    sizzleGain.gain.setValueAtTime(0.095, now + 0.14);
    sizzleGain.gain.linearRampToValueAtTime(0.125, now + 0.21);
    // Smooth warm tail fade
    sizzleGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noiseSource.connect(bandpass);
    bandpass.connect(highshelf);
    highshelf.connect(sizzleGain);
    sizzleGain.connect(ctx.destination);

    noiseSource.start(now, Math.random() * 0.4, duration);
    noiseSource.stop(now + duration);

    // 2. Subtle crisp oil bubble pops on the hot cast-iron mold
    const popTimes = [0.02, 0.09, 0.19, 0.28];
    popTimes.forEach((offset) => {
      if (Math.random() > 0.85) return;
      const popOsc = ctx.createOscillator();
      const popGain = ctx.createGain();
      const popFilter = ctx.createBiquadFilter();

      popFilter.type = 'bandpass';
      const freq = 1400 + Math.random() * 1800;
      popFilter.frequency.setValueAtTime(freq, now + offset);
      popFilter.Q.setValueAtTime(3.5, now + offset);

      popOsc.type = 'triangle';
      popOsc.frequency.setValueAtTime(freq, now + offset);
      popOsc.frequency.exponentialRampToValueAtTime(freq * 0.45, now + offset + 0.025);

      popGain.gain.setValueAtTime(0.0001, now + offset);
      popGain.gain.linearRampToValueAtTime(0.035, now + offset + 0.004);
      popGain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.028);

      popOsc.connect(popFilter);
      popFilter.connect(popGain);
      popGain.connect(ctx.destination);

      popOsc.start(now + offset);
      popOsc.stop(now + offset + 0.03);
    });
  } catch {
    // Ignore audio context errors if browser blocks audio before interaction
  }
}

export function playPaperBoxOpenSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // 1. Crisp cardboard tongue tab un-tuck ("bật nắp hộp giấy")
    const tabOsc = ctx.createOscillator();
    const tabGain = ctx.createGain();
    tabOsc.type = 'triangle';
    tabOsc.frequency.setValueAtTime(280, now);
    tabOsc.frequency.exponentialRampToValueAtTime(95, now + 0.065);

    tabGain.gain.setValueAtTime(0.001, now);
    tabGain.gain.linearRampToValueAtTime(0.42, now + 0.008);
    tabGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    tabOsc.connect(tabGain);
    tabGain.connect(ctx.destination);
    tabOsc.start(now);
    tabOsc.stop(now + 0.075);

    // 2. Crisp Kraft Paper Lid Rustle & Crease Fold ("sột soạt" mở nắp bìa)
    const rustleDuration = 0.45;
    const rustleSource = ctx.createBufferSource();
    rustleSource.buffer = getNoiseBuffer(ctx);

    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(1100, now + 0.015);
    bandpass.frequency.linearRampToValueAtTime(2400, now + 0.16);
    bandpass.frequency.exponentialRampToValueAtTime(1300, now + rustleDuration);
    bandpass.Q.setValueAtTime(0.9, now);

    const lowshelf = ctx.createBiquadFilter();
    lowshelf.type = 'lowshelf';
    lowshelf.frequency.setValueAtTime(420, now);
    lowshelf.gain.setValueAtTime(7, now);

    const rustleGain = ctx.createGain();
    rustleGain.gain.setValueAtTime(0.001, now);
    rustleGain.gain.linearRampToValueAtTime(0.36, now + 0.045);
    rustleGain.gain.setValueAtTime(0.24, now + 0.14);
    rustleGain.gain.linearRampToValueAtTime(0.38, now + 0.22);
    rustleGain.gain.exponentialRampToValueAtTime(0.001, now + rustleDuration);

    rustleSource.connect(bandpass);
    bandpass.connect(lowshelf);
    lowshelf.connect(rustleGain);
    rustleGain.connect(ctx.destination);

    rustleSource.start(now + 0.01, 0.08, rustleDuration);
    rustleSource.stop(now + 0.01 + rustleDuration);

    // 3. Warm steam puff escaping when the hot box opens ("phù..." hơi nóng bốc lên)
    const steamStart = now + 0.12;
    const steamDuration = 0.55;
    const steamSource = ctx.createBufferSource();
    steamSource.buffer = getNoiseBuffer(ctx);

    const steamFilter = ctx.createBiquadFilter();
    steamFilter.type = 'bandpass';
    steamFilter.frequency.setValueAtTime(1800, steamStart);
    steamFilter.frequency.exponentialRampToValueAtTime(900, steamStart + steamDuration);
    steamFilter.Q.setValueAtTime(0.65, steamStart);

    const steamGain = ctx.createGain();
    steamGain.gain.setValueAtTime(0.001, steamStart);
    steamGain.gain.linearRampToValueAtTime(0.18, steamStart + 0.09);
    steamGain.gain.exponentialRampToValueAtTime(0.001, steamStart + steamDuration);

    steamSource.connect(steamFilter);
    steamFilter.connect(steamGain);
    steamGain.connect(ctx.destination);

    steamSource.start(steamStart, 0.3, steamDuration);
    steamSource.stop(steamStart + steamDuration);

    // 4. Soft cardboard settle thud as the open lid rests back
    const settleTime = now + 0.26;
    const settleOsc = ctx.createOscillator();
    const settleGain = ctx.createGain();
    settleOsc.type = 'sine';
    settleOsc.frequency.setValueAtTime(150, settleTime);
    settleOsc.frequency.exponentialRampToValueAtTime(62, settleTime + 0.09);

    settleGain.gain.setValueAtTime(0.001, settleTime);
    settleGain.gain.linearRampToValueAtTime(0.28, settleTime + 0.012);
    settleGain.gain.exponentialRampToValueAtTime(0.001, settleTime + 0.095);

    settleOsc.connect(settleGain);
    settleGain.connect(ctx.destination);
    settleOsc.start(settleTime);
    settleOsc.stop(settleTime + 0.1);
  } catch {
    // Ignore audio context errors
  }
}

export function playPaperBoxCloseSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // 1. Paper lid folding down swoosh/rustle
    const rustleDuration = 0.28;
    const rustleSource = ctx.createBufferSource();
    rustleSource.buffer = getNoiseBuffer(ctx);

    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(1900, now);
    bandpass.frequency.exponentialRampToValueAtTime(850, now + rustleDuration);
    bandpass.Q.setValueAtTime(1.1, now);

    const rustleGain = ctx.createGain();
    rustleGain.gain.setValueAtTime(0.001, now);
    rustleGain.gain.linearRampToValueAtTime(0.28, now + 0.05);
    rustleGain.gain.exponentialRampToValueAtTime(0.001, now + rustleDuration);

    rustleSource.connect(bandpass);
    bandpass.connect(rustleGain);
    rustleGain.connect(ctx.destination);

    rustleSource.start(now, 0.2, rustleDuration);
    rustleSource.stop(now + rustleDuration);

    // 2. Cardboard flap tucking shut ("bụp" nhẹ khi gài nắp hộp)
    const tuckTime = now + 0.18;
    const tuckOsc = ctx.createOscillator();
    const tuckGain = ctx.createGain();
    tuckOsc.type = 'triangle';
    tuckOsc.frequency.setValueAtTime(165, tuckTime);
    tuckOsc.frequency.exponentialRampToValueAtTime(68, tuckTime + 0.075);

    tuckGain.gain.setValueAtTime(0.001, tuckTime);
    tuckGain.gain.linearRampToValueAtTime(0.34, tuckTime + 0.01);
    tuckGain.gain.exponentialRampToValueAtTime(0.001, tuckTime + 0.08);

    tuckOsc.connect(tuckGain);
    tuckGain.connect(ctx.destination);
    tuckOsc.start(tuckTime);
    tuckOsc.stop(tuckTime + 0.085);
  } catch {
    // Ignore audio context errors
  }
}

