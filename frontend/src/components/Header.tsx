'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import AmbientSoundPlayer from './AmbientSoundPlayer';

export default function Header() {
  const router = useRouter();
  const {
    timerMinutes,
    timerSeconds,
    activeTaskTitle,
    settings,
    updateSettings,
    isTimerRunning
  } = useApp();

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [userStatus, setUserStatus] = useState<'deep_work' | 'break' | 'available'>('deep_work');
  const userMenuRef = useRef<HTMLDivElement>(null);

  const toggleStudyMode = () => {
    updateSettings({ studyMode: !settings.studyMode });
  };

  const handleOpenCommandPalette = () => {
    window.dispatchEvent(new CustomEvent('toggle-command-palette'));
  };

  const handleLogout = () => {
    sessionStorage.removeItem('student_authenticated');
    localStorage.removeItem('student_authenticated');
    router.push('/login');
  };

  // Close profile dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formattedTime = `${timerMinutes.toString().padStart(2, '0')}:${timerSeconds.toString().padStart(2, '0')}`;

  return (
    <header className="fixed top-0 right-0 left-64 flex items-center justify-between px-6 bg-white/80 dark:bg-[#0c1322]/80 backdrop-blur-xl h-16 border-b border-outline-variant/20 z-40 transition-colors">
      {/* Left: Session Clock & Command Palette search shortcut */}
      <div className="flex items-center gap-4">
        {/* Active Session Indicator */}
        <div className="flex items-center gap-2">
          <span
            className={`material-symbols-outlined text-lg transition-all ${
              isTimerRunning ? 'text-secondary animate-pulse' : 'text-slate-400'
            }`}
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            local_fire_department
          </span>
          <span className="font-mono font-bold text-xs text-primary bg-surface-container-low px-2 py-1 rounded-md border border-outline-variant/20">
            {formattedTime}
          </span>
          <span className="text-outline-variant/40 hidden md:inline">|</span>
          <span className="hidden md:flex items-center gap-1.5 text-xs text-on-surface-variant max-w-[260px] truncate">
            <span className="text-outline">Focus:</span>
            <strong className="text-primary font-semibold truncate">
              {activeTaskTitle || 'Autonomous Study'}
            </strong>
          </span>
        </div>

        {/* Command Palette Trigger Button */}
        <button
          type="button"
          onClick={handleOpenCommandPalette}
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-surface-container-low/70 hover:bg-surface-container border border-outline-variant/30 rounded-xl text-xs text-on-surface-variant/80 hover:text-primary transition-all cursor-pointer shadow-2xs"
          title="Open Command Palette (Ctrl+K or Cmd+K)"
        >
          <span className="material-symbols-outlined text-sm">search</span>
          <span className="font-medium">Quick Actions...</span>
          <kbd className="font-mono text-[10px] font-bold bg-surface-container-highest text-on-surface-variant px-1.5 py-0.5 rounded border border-outline-variant/30">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right Controls: Ambient Player, Study Mode, Coins & Profile */}
      <div className="flex items-center gap-3">
        {/* Ambient Soundscape Synthesizer */}
        <AmbientSoundPlayer />

        {/* Study Mode Toggle */}
        <button
          type="button"
          onClick={toggleStudyMode}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all cursor-pointer text-xs font-semibold select-none active:scale-95 ${
            settings.studyMode
              ? 'bg-secondary/10 border-secondary/40 text-secondary'
              : 'bg-surface-container-low border-outline-variant/30 text-on-surface-variant hover:text-primary'
          }`}
          title="Toggle Distraction Shield Study Mode"
        >
          <span className="material-symbols-outlined text-sm">
            {settings.studyMode ? 'shield' : 'shield_with_heart'}
          </span>
          <span className="hidden lg:inline">
            {settings.studyMode ? 'Study Mode ON' : 'Study Mode OFF'}
          </span>
        </button>

        {/* Focus Score pill */}
        <div className="hidden sm:flex items-center gap-1 text-xs font-bold text-secondary bg-secondary/10 px-2.5 py-1 rounded-full border border-secondary/20">
          <span className="material-symbols-outlined text-sm">radar</span>
          <span>{settings.focusScore}</span>
        </div>

        {/* Focus Coins pill */}
        <div className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
          <span className="material-symbols-outlined text-sm">payments</span>
          <span>{settings.focusCoins}</span>
        </div>

        {/* User Profile Avatar with Dropdown */}
        <div className="relative" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-1.5 pl-1 pr-1.5 py-1 rounded-full hover:bg-surface-container transition-colors cursor-pointer"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-secondary to-emerald-400 text-white font-bold text-xs flex items-center justify-center shadow-xs">
              S
            </div>
            <span className={`w-2 h-2 rounded-full ${
              userStatus === 'deep_work' ? 'bg-secondary animate-pulse' : userStatus === 'break' ? 'bg-sky-400' : 'bg-slate-400'
            }`}></span>
          </button>

          {/* User Menu Dropdown */}
          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-[#0c1322] border border-outline-variant/30 rounded-2xl p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-2 border-b border-outline-variant/20 mb-1">
                <p className="text-xs font-bold text-primary">Student Account</p>
                <p className="text-[11px] text-on-surface-variant truncate">student@focusflow.edu</p>
              </div>

              {/* Status Picker */}
              <div className="px-3 py-1 text-[10px] font-bold text-outline uppercase tracking-wider">
                Current Status
              </div>
              <div className="space-y-0.5 mb-2">
                <button
                  onClick={() => setUserStatus('deep_work')}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs cursor-pointer ${
                    userStatus === 'deep_work' ? 'bg-secondary/10 text-secondary font-bold' : 'hover:bg-surface-container text-on-surface-variant'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-secondary"></span>
                  Deep Work (Focusing)
                </button>
                <button
                  onClick={() => setUserStatus('break')}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs cursor-pointer ${
                    userStatus === 'break' ? 'bg-sky-500/10 text-sky-500 font-bold' : 'hover:bg-surface-container text-on-surface-variant'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                  Taking a Break
                </button>
                <button
                  onClick={() => setUserStatus('available')}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs cursor-pointer ${
                    userStatus === 'available' ? 'bg-slate-500/10 text-slate-400 font-bold' : 'hover:bg-surface-container text-on-surface-variant'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                  Available
                </button>
              </div>

              <div className="pt-1 border-t border-outline-variant/20">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer font-semibold"
                >
                  <span className="material-symbols-outlined text-sm">logout</span>
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
