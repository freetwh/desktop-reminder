const NOTES = [659.25, 783.99, 987.77, 783.99, 880, 1046.5, 987.77, 783.99];

let context: AudioContext | null = null;

/** A soft three-second 8-bit chime, synthesized locally with no media dependency. */
export function playBitChime(): () => void {
  context ??= new AudioContext();
  const audioContext = context;
  const start = audioContext.currentTime;
  const master = audioContext.createGain();
  master.gain.setValueAtTime(0.0001, start);
  master.gain.exponentialRampToValueAtTime(0.12, start + 0.05);
  master.gain.setValueAtTime(0.12, start + 2.65);
  master.gain.exponentialRampToValueAtTime(0.0001, start + 2.98);
  master.connect(audioContext.destination);

  const oscillators = NOTES.map((frequency, index) => {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const noteStart = start + index * 0.36;
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(frequency, noteStart);
    gain.gain.setValueAtTime(0.0001, noteStart);
    gain.gain.exponentialRampToValueAtTime(0.36, noteStart + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.28);
    oscillator.connect(gain).connect(master);
    oscillator.start(noteStart);
    oscillator.stop(Math.min(noteStart + 0.3, start + 3));
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
