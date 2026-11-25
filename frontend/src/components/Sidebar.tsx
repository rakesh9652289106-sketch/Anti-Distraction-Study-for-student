'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';

export default function Sidebar() {
  const pathname = usePathname();
  const { settings, startTimer, isTimerRunning, pauseTimer } = useApp();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: 'dashboard', shortcut: '⌘1' },
    { name: 'Smart Planner', path: '/planner', icon: 'calendar_today', shortcut: '⌘2' },
    { name: 'Analytics & Focus', path: '/analytics', icon: 'analytics', shortcut: '⌘3' },
    { name: 'Virtual Rooms', path: '/rooms', icon: 'groups', badge: 'Live' },
    { name: 'Rewards & Shop', path: '/rewards', icon: 'military_tech' },
    { name: 'Academic Search', path: '/search', icon: 'search' },
    { name: 'Support Desk', path: '/support', icon: 'support_agent' },
    { name: 'Settings', path: '/settings', icon: 'settings' }
  ];

  const adminItems = [
    { name: 'Pulse Hub', path: '/admin/pulse', icon: 'monitoring' },
    { name: 'Infrastructure', path: '/admin/monitor', icon: 'dns' }
  ];

  return (
    <nav className="fixed left-0 top-0 h-screen w-64 flex flex-col py-5 px-3 bg-surface/85 backdrop-blur-2xl border-r border-outline-variant/30 text-on-surface shadow-xs z-50 overflow-y-auto">
      {/* Brand Header */}
      <div className="flex items-center gap-3 mb-6 px-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-secondary to-secondary/60 text-on-secondary flex items-center justify-center shadow-md shadow-secondary/20">
          <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
            psychology
          </span>
        </div>
        <div>
          <h1 className="font-bold text-base text-primary tracking-tight leading-tight">
            {settings?.uiConfig?.brandingName || 'FocusFlow'}
          </h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></span>
            <span className="text-[11px] font-semibold text-secondary tracking-wide uppercase">AI Study Guard</span>
          </div>
        </div>
      </div>

      {/* Start / Pause Session Quick Card */}
      <button
        type="button"
        onClick={isTimerRunning ? pauseTimer : startTimer}
        className={`w-full font-bold text-xs py-2.5 px-3 rounded-xl mb-5 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-98 ${
          isTimerRunning
            ? 'bg-amber-500/15 border border-amber-500/30 text-amber-500 hover:bg-amber-500/25 shadow-amber-500/10'
            : 'bg-primary hover:bg-primary/90 text-on-primary shadow-primary/20'
        }`}
      >
        <span className="material-symbols-outlined text-base">
          {isTimerRunning ? 'pause_circle' : 'play_circle'}
        </span>
        <span>{isTimerRunning ? 'Pause Session' : 'Start Focus Session'}</span>
      </button>

      {/* Streak & Level Micro-Card */}
      <div className="mb-5 mx-1 p-3 rounded-xl bg-surface-container-low/80 border border-outline-variant/20">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="flex items-center gap-1 font-bold text-amber-600">
            <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
              local_fire_department
            </span>
            {settings.currentStreak} Day Streak
          </span>
          <span className="text-[10px] font-bold text-on-surface-variant bg-surface-container px-1.5 py-0.5 rounded">
            Level 3
          </span>
        </div>
        <div className="w-full bg-surface-variant h-1.5 rounded-full overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500 to-secondary h-full w-3/4 rounded-full"></div>
        </div>
        <div className="flex justify-between items-center mt-1 text-[9.5px] text-slate-800 dark:text-slate-200 font-bold">
          <span>750 / 1000 XP</span>
          <span>Next: Focus Master</span>
        </div>
      </div>

      {/* Primary Navigation */}
      <div className="flex-1 flex flex-col gap-0.5 mb-4">
        <span className="text-[10px] uppercase font-black text-slate-900 dark:text-slate-200 px-3 mb-1 tracking-wider">
          Workspace
        </span>
        {navItems.map(item => {
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center justify-between px-3 py-2 rounded-xl transition-all active:scale-98 text-xs font-bold ${
                isActive
                  ? 'bg-secondary/15 text-secondary font-black border border-secondary/30 shadow-2xs'
                  : 'text-slate-900 dark:text-slate-100 hover:text-primary hover:bg-surface-container'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className={`material-symbols-outlined text-[19px] ${isActive ? 'text-secondary' : 'text-slate-700 dark:text-slate-300'}`}>
                  {item.icon}
                </span>
                <span>{item.name}</span>
              </div>
              {item.badge ? (
                <span className="text-[9px] font-black uppercase tracking-wider bg-secondary/20 text-secondary px-1.5 py-0.5 rounded-full animate-pulse">
                  {item.badge}
                </span>
              ) : item.shortcut ? (
                <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 hidden xl:inline">
                  {item.shortcut}
                </span>
              ) : null}
            </Link>
          );
        })}

        {/* System Control Navigation Section */}
        <span className="text-[10px] uppercase font-black text-slate-900 dark:text-slate-200 px-3 mt-4 mb-1 tracking-wider">
          Admin Portal
        </span>
        {adminItems.map(item => {
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all active:scale-98 text-xs font-bold ${
                isActive
                  ? 'bg-secondary/15 text-secondary font-black border border-secondary/30'
                  : 'text-slate-900 dark:text-slate-100 hover:text-primary hover:bg-surface-container'
              }`}
            >
              <span className={`material-symbols-outlined text-[19px] ${isActive ? 'text-secondary' : 'text-slate-700 dark:text-slate-300'}`}>
                {item.icon}
              </span>
              <span>{item.name}</span>
            </Link>
          );
        })}
      </div>
      
      {/* Footer System Status */}
      <div className="pt-3 border-t border-outline-variant/20 px-2 flex items-center justify-between text-[11px] text-on-surface-variant/60">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
          FocusFlow v2.5 Pro
        </span>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('toggle-command-palette'))}
          className="hover:text-primary font-mono text-[10px] bg-surface-container px-1 rounded border border-outline-variant/30"
          title="Open Quick Search (Ctrl+K)"
        >
          ⌘K
        </button>
      </div>
    </nav>
  );
}
