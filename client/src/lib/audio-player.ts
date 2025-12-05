
export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private queue: ArrayBuffer[] = [];
  private isPlaying: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        this.audioContext = new AudioContext();
      }
    }
  }

  async play(buffer: ArrayBuffer) {
    if (!this.audioContext) return;

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    this.queue.push(buffer);
    this.processQueue();
  }

  private async processQueue() {
    if (this.isPlaying || this.queue.length === 0 || !this.audioContext) return;

    this.isPlaying = true;
    const buffer = this.queue.shift()!;

    try {
      const audioBuffer = await this.audioContext.decodeAudioData(buffer.slice(0));
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      
      source.onended = () => {
        this.isPlaying = false;
        this.processQueue();
      };

      source.start(0);
    } catch (e) {
      console.error("Audio playback failed", e);
      this.isPlaying = false;
      this.processQueue();
    }
  }

  stop() {
    if (this.audioContext) {
       this.audioContext.close().then(() => {
           const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
           this.audioContext = new AudioContext();
       });
    }
    this.queue = [];
    this.isPlaying = false;
  }
}

export const audioPlayer = new AudioPlayer();
