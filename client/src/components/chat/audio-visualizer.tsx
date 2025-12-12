import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { audioPlayer } from '@/lib/audio-player';
import { cn } from '@/lib/utils';

interface AudioVisualizerProps {
  isPlaying: boolean;
  className?: string;
}

export const AudioVisualizer = ({ isPlaying, className }: AudioVisualizerProps) => {
  const [levels, setLevels] = useState<number[]>(Array(16).fill(0));
  const animationRef = useRef<number | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);

  useEffect(() => {
    if (!isPlaying) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      setLevels(Array(16).fill(0));
      return;
    }

    const analyser = audioPlayer.getAnalyser();
    if (!analyser) return;

    if (!dataArrayRef.current) {
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
    }

    const updateLevels = () => {
      if (!analyser || !dataArrayRef.current) return;
      
      analyser.getByteFrequencyData(dataArrayRef.current);
      
      const newLevels: number[] = [];
      const step = Math.floor(dataArrayRef.current.length / 16);
      
      for (let i = 0; i < 16; i++) {
        const start = i * step;
        let sum = 0;
        for (let j = start; j < start + step && j < dataArrayRef.current.length; j++) {
          sum += dataArrayRef.current[j];
        }
        const avg = sum / step;
        newLevels.push(Math.min(100, (avg / 255) * 100));
      }
      
      setLevels(newLevels);
      animationRef.current = requestAnimationFrame(updateLevels);
    };

    animationRef.current = requestAnimationFrame(updateLevels);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isPlaying]);

  if (!isPlaying) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={cn(
        "flex items-end justify-center gap-[3px] h-12 px-4 py-2 bg-black/60 backdrop-blur-xl rounded-2xl border border-primary/30",
        className
      )}
      data-testid="audio-visualizer"
    >
      {levels.map((level, i) => (
        <motion.div
          key={i}
          className="w-1.5 rounded-full bg-gradient-to-t from-primary via-cyan-400 to-white"
          style={{
            height: `${Math.max(4, level * 0.4)}px`,
          }}
          animate={{
            height: `${Math.max(4, level * 0.4)}px`,
            opacity: 0.5 + (level / 200),
          }}
          transition={{
            duration: 0.05,
            ease: "linear"
          }}
        />
      ))}
    </motion.div>
  );
};

export const FloatingAudioVisualizer = ({ isPlaying }: { isPlaying: boolean }) => {
  if (!isPlaying) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-32 left-1/2 -translate-x-1/2 z-50"
    >
      <div className="relative">
        <div className="absolute -inset-1 bg-gradient-to-r from-primary to-accent rounded-2xl blur opacity-50" />
        <AudioVisualizer isPlaying={isPlaying} className="relative" />
      </div>
    </motion.div>
  );
};

export const InlineAudioVisualizer = ({ isPlaying }: { isPlaying: boolean }) => {
  const [levels, setLevels] = useState<number[]>(Array(8).fill(0));
  const animationRef = useRef<number | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);

  useEffect(() => {
    if (!isPlaying) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      setLevels(Array(8).fill(0));
      return;
    }

    const analyser = audioPlayer.getAnalyser();
    if (!analyser) return;

    if (!dataArrayRef.current) {
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
    }

    const updateLevels = () => {
      if (!analyser || !dataArrayRef.current) return;
      
      analyser.getByteFrequencyData(dataArrayRef.current);
      
      const newLevels: number[] = [];
      const step = Math.floor(dataArrayRef.current.length / 8);
      
      for (let i = 0; i < 8; i++) {
        const start = i * step;
        let sum = 0;
        for (let j = start; j < start + step && j < dataArrayRef.current.length; j++) {
          sum += dataArrayRef.current[j];
        }
        const avg = sum / step;
        newLevels.push(Math.min(100, (avg / 255) * 100));
      }
      
      setLevels(newLevels);
      animationRef.current = requestAnimationFrame(updateLevels);
    };

    animationRef.current = requestAnimationFrame(updateLevels);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isPlaying]);

  if (!isPlaying) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, width: 0 }}
      animate={{ opacity: 1, width: 'auto' }}
      exit={{ opacity: 0, width: 0 }}
      className="flex items-end justify-center gap-[3px] h-8 px-3 py-1.5 bg-primary/20 rounded-lg overflow-hidden"
      data-testid="inline-audio-visualizer"
    >
      {levels.map((level, i) => (
        <motion.div
          key={i}
          className="w-1.5 rounded-full bg-gradient-to-t from-primary via-cyan-400 to-white"
          style={{
            height: `${Math.max(4, level * 0.25)}px`,
          }}
          animate={{
            height: `${Math.max(4, level * 0.25)}px`,
          }}
          transition={{
            duration: 0.05,
            ease: "linear"
          }}
        />
      ))}
    </motion.div>
  );
};
