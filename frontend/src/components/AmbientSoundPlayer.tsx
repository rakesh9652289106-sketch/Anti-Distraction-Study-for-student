'use client';

import React, { useState, useEffect, useRef } from 'react';
import { soundscapeEngine, SOUNDSCAPE_OPTIONS, SoundscapeType } from '@/lib/soundscapes';

export default function AmbientSoundPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSound, setCurrentSound] = useState<SoundscapeType>('rain');
  const [volume, setVolume] = useState(0.5);
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const togglePlay = () => {
    if (isPlaying) {
      soundscapeEngine.stop();
      setIsPlaying(false);
    } else {
      soundscapeEngine.play(currentSound);
      setIsPlaying(true);
    }
  };

  const handleSelectSound = (sound: SoundscapeType) => {
    setCurrentSound(sound);
    if (isPlaying) {
      soundscapeEngine.play(sound);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    soundscapeEngine.setVolume(val);
  };

  const activeOption = SOUNDSCAPE_OPTIONS.find(s => s.id === currentSound) || SOUNDSCAPE_OPTIONS[0];

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger Button in Header */}
      <div className="flex items-center gap-1 bg-surface-container-low/90 hover:bg-surface-container border border-outline-variant/30 rounded-full px-2.5 py-1 transition-all shadow-xs">
        <button
          onClick={togglePlay}
          type="button"
          className={`w-6 h-6 rounded-full flex items-center justify-center transition-all cursor-pointer ${
            isPlaying
              ? 'bg-secondary text-white shadow-xs animate-pulse'
              : 'text-on-surface-variant hover:text-primary'
          }`}
          title={isPlaying ? 'Pause Ambient Soundscape' : 'Play Ambient Soundscape'}
        >
          <span className="material-symbols-outlined text-[16px]">
            {isPlaying ? 'pause' : 'play_arrow'}
          </span>
        </button>

        <button
          onClick={() => setIsOpen(!isOpen)}
          type="button"
          className="flex items-center gap-1.5 px-1 py-0.5 text-xs font-semibold text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
          title="Choose focus soundscape"
        >
          <span className="material-symbols-outlined text-[15px] text-secondary">
            {activeOption.icon}
          </span>
          <span className="hidden sm:inline max-w-[100px] truncate">{activeOption.name}</span>
          <span className="material-symbols-outlined text-[14px] text-outline">
            {isOpen ? 'expand_less' : 'expand_more'}
          </span>
        </button>
      </div>

      {/* Floating Soundscape Selector Popover */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-outline-variant/30 rounded-2xl p-3 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20 mb-2">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-secondary text-sm">headphones</span>
              <span className="text-xs font-bold text-primary">Focus Soundscapes</span>
            </div>
            <span className="text-[10px] font-semibold text-secondary uppercase tracking-wider bg-secondary/10 px-2 py-0.5 rounded-full">
              Procedural Web Audio
            </span>
          </div>

          {/* Sound options list */}
          <div className="space-y-1 mb-3">
            {SOUNDSCAPE_OPTIONS.map(opt => {
              const isSelected = opt.id === currentSound;
              return (
                <button
                  key={opt.id}
                  onClick={() => {
                    handleSelectSound(opt.id);
                    if (!isPlaying) {
                      soundscapeEngine.play(opt.id);
                      setIsPlaying(true);
                    }
                  }}
                  className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-secondary/10 border border-secondary/30 text-primary font-bold'
                      : 'hover:bg-surface-container-low text-on-surface-variant hover:text-primary border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                      isSelected ? 'bg-secondary text-white' : 'bg-surface-variant text-on-surface-variant'
                    }`}>
                      <span className="material-symbols-outlined text-[16px]">{opt.icon}</span>
                    </div>
                    <div>
                      <div className="text-xs">{opt.name}</div>
                      <div className="text-[10px] text-on-surface-variant/70 font-normal leading-tight">
                        {opt.description}
                      </div>
                    </div>
                  </div>
                  {isSelected && isPlaying && (
                    <div className="flex items-center gap-0.5">
                      <span className="w-1 h-3 bg-secondary rounded-full animate-bounce"></span>
                      <span className="w-1 h-4 bg-secondary rounded-full animate-bounce [animation-delay:0.15s]"></span>
                      <span className="w-1 h-2 bg-secondary rounded-full animate-bounce [animation-delay:0.3s]"></span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Volume slider */}
          <div className="pt-2 border-t border-outline-variant/20 flex items-center gap-2">
            <span className="material-symbols-outlined text-xs text-on-surface-variant">volume_down</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={handleVolumeChange}
              className="flex-1 accent-secondary h-1.5 bg-surface-variant rounded-lg cursor-pointer"
            />
            <span className="material-symbols-outlined text-xs text-on-surface-variant">volume_up</span>
            <span className="text-[10px] font-mono text-on-surface-variant w-7 text-right">
              {Math.round(volume * 100)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
