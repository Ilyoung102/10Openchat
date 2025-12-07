const audioContext = typeof window !== 'undefined' 
  ? new (window.AudioContext || (window as any).webkitAudioContext)() 
  : null;

export const playWakeSound = () => {
  if (!audioContext) return;
  
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }

  const oscillator1 = audioContext.createOscillator();
  const oscillator2 = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  const filter = audioContext.createBiquadFilter();
  
  oscillator1.connect(filter);
  oscillator2.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(2000, audioContext.currentTime);
  filter.frequency.exponentialRampToValueAtTime(500, audioContext.currentTime + 0.3);
  
  oscillator1.frequency.setValueAtTime(1200, audioContext.currentTime);
  oscillator1.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.15);
  oscillator1.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.25);
  
  oscillator2.frequency.setValueAtTime(1800, audioContext.currentTime);
  oscillator2.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.15);
  oscillator2.frequency.exponentialRampToValueAtTime(900, audioContext.currentTime + 0.25);
  
  oscillator1.type = 'sine';
  oscillator2.type = 'sine';
  
  gainNode.gain.setValueAtTime(0.8, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.5, audioContext.currentTime + 0.08);
  gainNode.gain.exponentialRampToValueAtTime(0.3, audioContext.currentTime + 0.15);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.35);
  
  oscillator1.start(audioContext.currentTime);
  oscillator2.start(audioContext.currentTime);
  oscillator1.stop(audioContext.currentTime + 0.35);
  oscillator2.stop(audioContext.currentTime + 0.35);
};
