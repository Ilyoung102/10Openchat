
export type AudioPlayerCallback = (isPlaying: boolean) => void;

export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private queue: ArrayBuffer[] = [];
  private isPlaying: boolean = false;
  private currentSource: AudioBufferSourceNode | null = null;
  private onPlayStateChange: AudioPlayerCallback | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        this.audioContext = new AudioContext();
      }
    }
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
      console.error("Audio playback failed", e);
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
