'use client';

import React, { useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { soundscapeEngine, SOUNDSCAPE_OPTIONS } from '@/lib/soundscapes';

interface ZenModeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ZenModeModal({ isOpen, onClose }: ZenModeModalProps) {
  const {
    timerMinutes,
    timerSeconds,
    isTimerRunning,
    startTimer,
    pauseTimer,
    timerMode,
    activeTaskTitle,
    activeTaskId,
    toggleTaskCompleted,
    settings
  } = useApp();

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const workTime = settings.pomodoroWorkTime;
  const breakTime = settings.pomodoroBreakTime;
  const totalSeconds = timerMode === 'work' ? workTime * 60 : breakTime * 60;
  const currentSeconds = timerMinutes * 60 + timerSeconds;
  const progressFraction = totalSeconds > 0 ? (totalSeconds - currentSeconds) / totalSeconds : 0;
  const dashOffset = 283 - progressFraction * 283;

  const isSoundPlaying = soundscapeEngine.getIsPlaying();
  const currentSound = soundscapeEngine.getCurrentSoundscape() || 'rain';
  const currentSoundOption = SOUNDSCAPE_OPTIONS.find(s => s.id === currentSound) || SOUNDSCAPE_OPTIONS[0];

  const handleToggleSound = () => {
    if (isSoundPlaying) {
      soundscapeEngine.stop();
    } else {
      soundscapeEngine.play(currentSound);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between p-8 bg-[#070b14]/95 backdrop-blur-2xl text-white select-none animate-in fade-in duration-300">
      {/* Top Bar: Active Task & Exit */}
      <div className="w-full max-w-4xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
            Zen Focus Sanctuary
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-xs text-slate-400">
            {timerMode === 'work' ? 'Deep Work Session' : 'Restorative Break'}
          </span>
        </div>

        <button
          onClick={onClose}
          type="button"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-sm">fullscreen_exit</span>
          Exit Zen Mode <kbd className="font-mono text-[10px] text-slate-500 ml-1">ESC</kbd>
        </button>
      </div>

      {/* Center: Glowing Clock & Active Task */}
      <div className="flex flex-col items-center justify-center my-auto space-y-8">
        {/* Large Minimalist Circular Timer */}
        <div className="relative w-88 h-88 sm:w-96 sm:h-96 flex items-center justify-center">
          <svg className="absolute inset-0 w-full h-full drop-shadow-[0_0_35px_rgba(16,185,129,0.25)]" viewBox="0 0 100 100">
            <circle
              className="text-slate-800/60"
              cx="50"
              cy="50"
              fill="none"
              r="45"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <circle
              className="text-emerald-400 progress-ring__circle transition-all duration-1000"
              cx="50"
              cy="50"
              fill="none"
              r="45"
              stroke="currentColor"
              strokeDasharray="283"
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              strokeWidth="3"
            />
          </svg>

          {/* Clock Center */}
          <div className="flex flex-col items-center justify-center z-10 text-center">
            <span className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-400/80 mb-2">
              {timerMode === 'work' ? 'Cognitive Immersion' : 'Breath & Recharge'}
            </span>
            <span className="text-6xl sm:text-7xl font-light tracking-tight font-mono text-white mb-3">
              {timerMinutes.toString().padStart(2, '0')}:{timerSeconds.toString().padStart(2, '0')}
            </span>
            
            <button
              onClick={isTimerRunning ? pauseTimer : startTimer}
              className={`px-5 py-2 rounded-full font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-lg active:scale-95 ${
                isTimerRunning
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                  : 'bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400'
              }`}
            >
              <span className="material-symbols-outlined text-base">
                {isTimerRunning ? 'pause' : 'play_arrow'}
              </span>
              {isTimerRunning ? 'Pause Session' : 'Resume Flow'}
            </button>
          </div>
        </div>

        {/* Focused Task Card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 max-w-md w-full flex items-center justify-between backdrop-blur-md">
          <div className="flex items-center gap-3 overflow-hidden">
            <span className="material-symbols-outlined text-emerald-400">task_alt</span>
            <div className="truncate">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Current Target</p>
              <p className="text-sm font-semibold text-white truncate">
                {activeTaskTitle || 'No target selected — Deep focus on self-directed study'}
              </p>
            </div>
          </div>
          {activeTaskId && (
            <button
              onClick={() => toggleTaskCompleted(activeTaskId)}
              className="px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 text-xs font-bold rounded-lg cursor-pointer whitespace-nowrap"
            >
              Complete
            </button>
          )}
        </div>
      </div>

      {/* Bottom Bar: Soundscape Quick Controls & Mindful Advice */}
      <div className="w-full max-w-4xl flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/10 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleSound}
            className={`px-3 py-1.5 rounded-full border text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all ${
              isSoundPlaying
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-sm">
              {isSoundPlaying ? 'volume_up' : 'volume_off'}
            </span>
            <span>{currentSoundOption.name}</span>
          </button>
          <span className="text-[11px] text-slate-500">
            {isSoundPlaying ? 'Soundscape Active' : 'Sound Muted'}
          </span>
        </div>

        <p className="italic text-center text-slate-400 text-xs">
          &ldquo;Focus is a muscle. The more you eliminate small distractions, the deeper your comprehension.&rdquo;
        </p>
      </div>
    </div>
  );
}
