// 两只老虎：完整旋律（C 大调）。每个元素是音高和拍数，最后一拍稍作延长。
const SONG = [
  [261.63, 1], [293.66, 1], [329.63, 1], [261.63, 1],
  [261.63, 1], [293.66, 1], [329.63, 1], [261.63, 1],
  [329.63, 1], [349.23, 1], [392, 2],
  [329.63, 1], [349.23, 1], [392, 2],
  [392, 1], [440, 1], [392, 1], [349.23, 1], [329.63, 1], [261.63, 1],
  [392, 1], [440, 1], [392, 1], [349.23, 1], [329.63, 1], [261.63, 1],
  [261.63, 1], [392, 1], [261.63, 2],
  [261.63, 1], [392, 1], [261.63, 2],
] as const;

const BEAT_SECONDS = 0.28;

let context: AudioContext | null = null;

/** A soft, complete 8-bit rendition of "两只老虎", synthesized locally. */
export function playBitChime(volume = 1): () => void {
  context ??= new AudioContext();
  const audioContext = context;
  if (audioContext.state === 'suspended') void audioContext.resume();
  const start = audioContext.currentTime;
  const master = audioContext.createGain();
  const songDuration = SONG.reduce((total, [, beats]) => total + beats * BEAT_SECONDS, 0);
  master.gain.setValueAtTime(0.0001, start);
  // 提高整体响度，让提醒音在正常系统音量下更容易听见。
  const level = Math.max(0, Math.min(1, volume));
  if (level === 0) return () => undefined;
  master.gain.exponentialRampToValueAtTime(0.35 * level, start + 0.05);
  master.gain.setValueAtTime(0.35 * level, start + songDuration - 0.18);
  master.gain.exponentialRampToValueAtTime(0.0001, start + songDuration);
  master.connect(audioContext.destination);

  let elapsed = 0;
  const oscillators = SONG.map(([frequency, beats]) => {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const noteStart = start + elapsed;
    const noteDuration = beats * BEAT_SECONDS;
    elapsed += noteDuration;
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(frequency, noteStart);
    gain.gain.setValueAtTime(0.0001, noteStart);
    gain.gain.exponentialRampToValueAtTime(0.36, noteStart + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + noteDuration - 0.03);
    oscillator.connect(gain).connect(master);
    oscillator.start(noteStart);
    oscillator.stop(noteStart + noteDuration);
    return oscillator;
  });

  return () => {
    oscillators.forEach((oscillator) => {
      try { oscillator.stop(); } catch { /* already stopped */ }
    });
    master.disconnect();
  };
}

export function primeAudio(): void {
  context ??= new AudioContext();
  if (context.state === 'suspended') void context.resume();
}
