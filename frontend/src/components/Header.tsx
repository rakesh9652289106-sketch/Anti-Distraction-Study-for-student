'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';

export default function Header() {
  const {
    timerMinutes,
    timerSeconds,
    activeTaskTitle,
    settings,
    updateSettings,
    isTimerRunning
  } = useApp();

  const toggleStudyMode = () => {
    updateSettings({ studyMode: !settings.studyMode });
  };

  const formattedTime = `${timerMinutes.toString().padStart(2, '0')}:${timerSeconds.toString().padStart(2, '0')}`;

  return (
    <header className="fixed top-0 right-0 left-64 flex items-center justify-between px-gutter bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl h-16 border-b border-outline-variant/20 z-40 transition-colors">
      {/* Session / Active Status */}
      <div className="flex items-center gap-sm">
        <span
          className={`material-symbols-outlined transition-all ${
            isTimerRunning ? 'text-secondary animate-pulse' : 'text-slate-400'
          }`}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          local_fire_department
        </span>
        <span className="font-semibold text-label-md text-primary">
          Session: {formattedTime}
        </span>
        <span className="text-outline-variant px-xs">|</span>
        <span className="text-label-md text-on-surface-variant max-w-[300px] truncate">
          Active Task: <strong className="text-primary font-medium">{activeTaskTitle}</strong>
        </span>
      </div>

      {/* Control Actions / Score */}
      <div className="flex items-center gap-md">
        {/* Study Mode Toggle */}
        <div
          onClick={toggleStudyMode}
          className="flex items-center gap-xs cursor-pointer hover:opacity-95 select-none bg-surface-container-low px-sm py-1.5 rounded-full border border-outline-variant/20 hover:border-outline-variant/60 transition-all active:scale-95"
        >
          <span className="text-label-sm text-on-surface-variant font-semibold">
            {settings.studyMode ? 'Study Mode On' : 'Study Mode Off'}
          </span>
          <div
            className={`w-8 h-4 rounded-full relative transition-colors duration-300 ${
              settings.studyMode ? 'bg-secondary' : 'bg-surface-variant'
            }`}
          >
            <div
              className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all duration-300 ${
                settings.studyMode ? 'left-4.5' : 'left-0.5'
              }`}
            ></div>
          </div>
        </div>

        {/* Focus Score */}
        <div className="flex items-center gap-xs font-semibold text-label-md text-secondary bg-secondary/10 px-sm py-1.5 rounded-full border border-secondary/20">
          <span className="material-symbols-outlined text-sm font-bold">radar</span>
          <span>Focus Score: {settings.focusScore}</span>
        </div>

        {/* Focus Coins */}
        <div className="flex items-center gap-xs font-semibold text-label-md text-amber-600 bg-amber-500/10 px-sm py-1.5 rounded-full border border-amber-500/20">
          <span className="material-symbols-outlined text-sm font-bold">payments</span>
          <span>{settings.focusCoins} Coins</span>
        </div>
      </div>
    </header>
  );
}
