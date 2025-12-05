
export function base64ToUint8Array(base64: string): Uint8Array {
  try {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  } catch (e) {
    console.error("Base64 decoding failed:", e);
    return new Uint8Array(0);
  }
}

let audioContext: AudioContext | null = null;
let currentSource: AudioBufferSourceNode | null = null;

// Simple string queue
export interface AudioTask {
    type: 'audio' | 'silence';
    data?: string;     // for audio (base64)
    duration?: number; // for silence (ms)
    rate?: number;     // playback rate (0.5 ~ 2.0)
}

let audioQueue: AudioTask[] = [];
let isPlaying = false;
let isProcessingNext = false; 
let onPlayStateChange: ((isPlaying: boolean) => void) | null = null;
let onAudioError: ((error: string) => void) | null = null;

export const setPlayStateCallback = (callback: (isPlaying: boolean) => void) => {
  onPlayStateChange = callback;
};

export const setAudioErrorCallback = (callback: (error: string) => void) => {
  onAudioError = callback;
};

// Initialize or get AudioContext
export const getAudioContext = async (sampleRate = 24000) => {
  if (!audioContext) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioContext = new AudioContextClass({ sampleRate });
  }
  return audioContext;
};

// Diagnostic helper
export const getAudioContextState = () => {
  return audioContext?.state || 'none';
};

// Explicitly resume/init audio context (Call this on user interactions like Click/Touch)
export const initAudioContext = async () => {
    try {
        const ctx = await getAudioContext();
        if (ctx) {
            if (ctx.state === 'suspended') {
                await ctx.resume();
            }
            
            // MOBILE UNLOCK TRICK:
            // Play a tiny silent buffer. This is required on Android/iOS to "warm up" the audio engine.
            const buffer = ctx.createBuffer(1, 1, 24000);
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(ctx.destination);
            source.start(0);
        }
    } catch (e) {
        console.error("Audio warm-up failed", e);
    }
}

// Helper to wait for context to be running
const waitForAudioContextRunning = async (ctx: AudioContext, timeoutMs = 2000): Promise<boolean> => {
  if ((ctx.state as any) === 'running') return true;
  
  const startTime = Date.now();
  
  // Try to resume immediately
  try { await ctx.resume(); } catch(e) {}
  
  while ((ctx.state as any) !== 'running') {
      if (Date.now() - startTime > timeoutMs) {
          return false;
      }
      try { await ctx.resume(); } catch(e) {}
      await new Promise(resolve => setTimeout(resolve, 100)); // check every 100ms
  }
  return true;
};

// Reset context only if strictly necessary
export const resetAudioContext = async () => {
  try {
    stopAudio();
    clearAudioQueue();
    if (audioContext) {
      try {
        await audioContext.close();
      } catch (e) { /* ignore */ }
      audioContext = null;
    }
  } catch (e) {
    console.error("Failed to reset audio context:", e);
  }
};

const setPlayingState = (state: boolean) => {
  if (isPlaying !== state) {
    isPlaying = state;
    if (onPlayStateChange) {
      onPlayStateChange(state);
    }
  }
};

export const isAudioPlaying = () => {
  return isPlaying;
};

export const stopAudio = () => {
  if (currentSource) {
    try {
      currentSource.stop();
      currentSource.disconnect();
    } catch (e) { /* ignore */ }
    currentSource = null;
  }
  setPlayingState(false);
  isProcessingNext = false;
};

export const clearAudioQueue = () => {
  audioQueue = [];
  stopAudio();
};

// Add explicit silence task
export const enqueueSilence = (durationMs: number) => {
    audioQueue.push({ type: 'silence', duration: durationMs });
    if (!isPlaying && !isProcessingNext) {
        playNext();
    }
}

// Add audio task
export const enqueueAudio = (base64Data: string, playbackRate: number = 1.0) => {
  audioQueue.push({ type: 'audio', data: base64Data, rate: playbackRate });
  if (!isPlaying && !isProcessingNext) {
    playNext();
  }
};

const playNext = async () => {
  if (audioQueue.length === 0) {
    setPlayingState(false);
    isProcessingNext = false;
    return;
  }

  if (isProcessingNext) return;
  isProcessingNext = true;

  const task = audioQueue[0];

  try {
    const ctx = await getAudioContext();
    
    // Safety check for null context
    if (!ctx) throw new Error("AudioContext not available");

    // --- STRICT STATE VERIFICATION ---
    const isRunning = await waitForAudioContextRunning(ctx, 1500); 

    if (!isRunning) {
         console.warn(`AudioContext failed to start (State: ${ctx.state}). Aborting.`);
         throw new Error("오디오 장치를 시작할 수 없습니다.");
    }

    // Check if queue is still valid
    if (audioQueue.length === 0) {
        setPlayingState(false);
        isProcessingNext = false;
        return;
    }

    // Remove from queue
    audioQueue.shift();
    
    // HANDLE SILENCE TASK
    if (task.type === 'silence') {
        setPlayingState(true); // Treat silence as playing
        setTimeout(() => {
            isProcessingNext = false;
            playNext();
        }, task.duration || 500);
        return;
    }

    // HANDLE AUDIO TASK
    const base64Audio = task.data || "";
    const bytes = base64ToUint8Array(base64Audio);
    
    if (bytes.length === 0) {
        console.warn("Empty audio buffer detected, skipping.");
        isProcessingNext = false;
        playNext();
        return;
    }

    const dataInt16 = new Int16Array(bytes.buffer);
    const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
    const channelData = buffer.getChannelData(0);
    
    for (let i = 0; i < dataInt16.length; i++) {
      channelData[i] = dataInt16[i] / 32768.0;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    
    // Apply playback rate if specified
    if (task.rate && task.rate !== 1.0) {
        source.playbackRate.value = task.rate;
    }

    source.onended = () => {
      if (currentSource === source) {
         currentSource = null;
      }
      isProcessingNext = false;
      playNext(); 
    };

    currentSource = source;
    source.start(0);
    
    setPlayingState(true); 

  } catch (error: any) {
    console.error("Error playing audio chunk:", error);
    setPlayingState(false);
    isProcessingNext = false;
    audioQueue = []; 
    if (onAudioError) onAudioError(error.message || "오디오 재생 오류");
  }
};
