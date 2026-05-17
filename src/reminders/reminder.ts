let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (audioContext) return audioContext;
  try {
    audioContext = new AudioContext();
    return audioContext;
  } catch {
    return null;
  }
}

export async function playBeep(): Promise<boolean> {
  const ctx = getAudioContext();
  if (!ctx) return false;

  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch {
      return false;
    }
  }

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.frequency.value = 880;
    osc.type = 'sine';
    gain.gain.value = 0.3;

    const now = ctx.currentTime;
    osc.start(now);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    osc.stop(now + 0.3);

    return true;
  } catch {
    return false;
  }
}

export async function vibrate(): Promise<boolean> {
  if (!navigator.vibrate) return false;
  try {
    navigator.vibrate([200, 100, 200]);
    return true;
  } catch {
    return false;
  }
}

export async function notifyRestComplete(): Promise<{ soundOk: boolean; vibrateOk: boolean }> {
  const [soundOk, vibrateOk] = await Promise.all([playBeep(), vibrate()]);
  return { soundOk, vibrateOk };
}
