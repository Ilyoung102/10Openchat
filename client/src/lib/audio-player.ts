
export type AudioPlayerCallback = (isPlaying: boolean) => void;
export type AudioMode = 'normal' | 'smarttv';

export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private queue: ArrayBuffer[] = [];
  private isPlaying: boolean = false;
  private currentSource: AudioBufferSourceNode | null = null;
  private onPlayStateChange: AudioPlayerCallback | null = null;
  private mode: AudioMode = 'normal';

  constructor() {
    this.initAudioContext();
  }

  private initAudioContext() {
    if (typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        try {
          if (this.mode === 'smarttv') {
            this.audioContext = new AudioContextClass({ sampleRate: 48000 });
            console.log('[AudioPlayer] Smart TV mode: AudioContext at 48kHz');
          } else {
            this.audioContext = new AudioContextClass();
            console.log('[AudioPlayer] Normal mode: AudioContext at default rate');
          }
          console.log('[AudioPlayer] Actual sample rate:', this.audioContext.sampleRate);
        } catch (e) {
          console.error('[AudioPlayer] Failed to create AudioContext with options, using default:', e);
          this.audioContext = new AudioContextClass();
        }
      }
    }
  }

  setMode(newMode: AudioMode) {
    if (this.mode === newMode) return;
    
    console.log(`[AudioPlayer] Switching mode: ${this.mode} -> ${newMode}`);
    
    this.stop();
    
    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch (e) {
        console.warn('[AudioPlayer] Error closing old context:', e);
      }
      this.audioContext = null;
    }
    
    this.mode = newMode;
    this.initAudioContext();
  }

  getMode(): AudioMode {
    return this.mode;
  }

  getSampleRate(): number {
    return this.audioContext?.sampleRate || 0;
  }

  setOnPlayStateChange(callback: AudioPlayerCallback | null) {
    this.onPlayStateChange = callback;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  async play(buffer: ArrayBuffer) {
    if (!this.audioContext) return;

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    this.queue.push(buffer);
    this.processQueue();
  }

  private notifyPlayState(playing: boolean) {
    if (this.onPlayStateChange) {
      this.onPlayStateChange(playing);
    }
  }

  private async processQueue() {
    if (this.isPlaying || this.queue.length === 0 || !this.audioContext) return;

    this.isPlaying = true;
    this.notifyPlayState(true);
    const buffer = this.queue.shift()!;

    try {
      const audioBuffer = await this.audioContext.decodeAudioData(buffer.slice(0));
      console.log(`[AudioPlayer] Decoded: ${audioBuffer.sampleRate}Hz, ${audioBuffer.duration.toFixed(2)}s, ${audioBuffer.numberOfChannels}ch`);
      
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      
      this.currentSource = source;
      
      source.onended = () => {
        this.currentSource = null;
        this.isPlaying = false;
        if (this.queue.length === 0) {
          this.notifyPlayState(false);
        }
        this.processQueue();
      };

      source.start(0);
    } catch (e) {
      console.error("[AudioPlayer] Audio playback failed", e);
      this.currentSource = null;
      this.isPlaying = false;
      this.notifyPlayState(false);
      this.processQueue();
    }
  }

  stop() {
    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch (e) {
        // Already stopped
      }
      this.currentSource = null;
    }
    this.queue = [];
    this.isPlaying = false;
    this.notifyPlayState(false);
  }
}

export const audioPlayer = new AudioPlayer();

if (typeof window !== 'undefined') {
  const savedMode = localStorage.getItem('audioMode') as AudioMode | null;
  if (savedMode === 'smarttv') {
    audioPlayer.setMode('smarttv');
  }
}
