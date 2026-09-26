// Web Audio Tactile Synthesizer for NexusChat Reasoning Controls

export type AudioStyle = 'mechanical' | 'bubble' | 'muted';
export type HapticFeedbackType = 'off' | 'major' | 'preset' | 'subtle';

let audioCtx: AudioContext | null = null;

export function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

// Play Mechanical Click Profile (crisp high-pass transient + decayed tone)
export function playMechanicalSound(type: HapticFeedbackType, freqOverride?: number): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  if (type === 'off') {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.04);

    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.045);
    return;
  }

  if (type === 'major' || type === 'preset') {
    [0, 0.016].forEach((delay, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'sine';
      const baseFreq = idx === 0 ? 1200 : 1450;
      osc.frequency.setValueAtTime(baseFreq, now + delay);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.35, now + delay + 0.018);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1250, now + delay);
      filter.Q.setValueAtTime(4.0, now + delay);

      gain.gain.setValueAtTime(0.2, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.02);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + delay);
      osc.stop(now + delay + 0.024);
    });
    return;
  }

  // Standard mechanical detent snap
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  const f = freqOverride || 960;
  osc.type = 'sine';
  osc.frequency.setValueAtTime(f, now);
  osc.frequency.exponentialRampToValueAtTime(f * 0.32, now + 0.014);

  filter.type = 'highpass';
  filter.frequency.setValueAtTime(600, now);

  gain.gain.setValueAtTime(0.14, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.018);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.022);
}

// Play Soft Bubble Profile (rising frequency sinewave chirp with resonant pop envelope)
export function playBubbleSound(type: HapticFeedbackType, freqOverride?: number): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  let startFreq = 420;
  let peakFreq = 980;
  let duration = 0.07;

  if (type === 'major' || type === 'preset') {
    startFreq = 480;
    peakFreq = 1250;
    duration = 0.09;
  } else if (type === 'off') {
    startFreq = 380;
    peakFreq = 220; // downward bloop
    duration = 0.08;
  } else if (freqOverride) {
    startFreq = 350 + (freqOverride / 32768) * 300;
    peakFreq = startFreq * 2.2;
  }

  osc.type = 'sine';
  osc.frequency.setValueAtTime(startFreq, now);
  osc.frequency.exponentialRampToValueAtTime(peakFreq, now + duration * 0.45);
  osc.frequency.exponentialRampToValueAtTime(peakFreq * 0.8, now + duration);

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(2200, now);
  filter.Q.setValueAtTime(1.8, now);

  gain.gain.setValueAtTime(0.01, now);
  gain.gain.linearRampToValueAtTime(0.24, now + duration * 0.2);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + duration + 0.01);
}

export function playHapticFeedback(
  style: AudioStyle,
  type: HapticFeedbackType,
  freqOverride?: number
): void {
  if (style === 'muted') return;
  try {
    if (style === 'bubble') {
      playBubbleSound(type, freqOverride);
    } else {
      playMechanicalSound(type, freqOverride);
    }
  } catch {
    // Silently tolerate restricted audio environments
  }
}
