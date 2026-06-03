'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';

export default function Sidebar() {
  const pathname = usePathname();
  const { startTimer, isTimerRunning, pauseTimer } = useApp();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: 'dashboard' },
    { name: 'Planner', path: '/planner', icon: 'calendar_today' },
    { name: 'Analytics', path: '/analytics', icon: 'analytics' },
    { name: 'Virtual Rooms', path: '/rooms', icon: 'groups' },
    { name: 'Rewards', path: '/rewards', icon: 'military_tech' },
    { name: 'Search Hub', path: '/search', icon: 'search' },
    { name: 'Help Desk', path: '/support', icon: 'support_agent' },
    { name: 'Settings', path: '/settings', icon: 'settings' }
  ];

  const adminItems = [
    { name: 'Pulse Dashboard', path: '/admin/pulse', icon: 'monitoring' },
    { name: 'Infrastructure', path: '/admin/monitor', icon: 'dns' }
  ];

  return (
    <nav className="fixed left-0 top-0 h-screen w-64 flex flex-col py-md px-sm bg-surface/80 backdrop-blur-xl border-r border-outline-variant/30 shadow-sm z-50 overflow-y-auto">
      {/* Brand Header */}
      <div className="flex items-center gap-sm mb-lg px-sm">
        <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center">
          <span className="material-symbols-outlined font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>
            psychology
          </span>
        </div>
        <div>
          <h1 className="font-bold text-headline-md text-primary leading-tight">FocusFlow</h1>
          <p className="text-label-sm text-on-surface-variant font-medium">Productivity Engine</p>
        </div>
      </div>

      {/* Start / Pause Session Button */}
      <button
        onClick={isTimerRunning ? pauseTimer : startTimer}
        className={`w-full font-semibold text-label-md py-sm rounded-lg mb-lg transition-all flex items-center justify-center gap-xs cursor-pointer ${
          isTimerRunning
            ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-500/20'
            : 'bg-primary hover:bg-primary/90 text-on-primary shadow-md shadow-primary/20'
        }`}
      >
        <span className="material-symbols-outlined">
          {isTimerRunning ? 'pause' : 'play_arrow'}
        </span>
        {isTimerRunning ? 'Pause Session' : 'Start Session'}
      </button>

      {/* Primary Navigation */}
      <div className="flex-1 flex flex-col gap-xs mb-md">
        <span className="text-xs uppercase font-bold text-on-surface-variant/50 px-sm mb-xs tracking-wider">
          Student Modules
        </span>
        {navItems.map(item => {
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center gap-sm px-sm py-sm rounded-lg transition-all active:scale-98 ${
                isActive
                  ? 'text-primary font-bold border-r-4 border-secondary bg-surface-container-low'
                  : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-low/50 font-medium'
              }`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span className="text-label-md">{item.name}</span>
            </Link>
          );
        })}

        {/* Admin Navigation Section */}
        <span className="text-xs uppercase font-bold text-on-surface-variant/50 px-sm mt-md mb-xs tracking-wider">
          System Control
        </span>
        {adminItems.map(item => {
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center gap-sm px-sm py-sm rounded-lg transition-all active:scale-98 ${
                isActive
                  ? 'text-primary font-bold border-r-4 border-secondary bg-surface-container-low'
                  : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-low/50 font-medium'
              }`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span className="text-label-md">{item.name}</span>
            </Link>
          );
        })}
      </div>
      
      {/* Footer copyright or streak counter */}
      <div className="pt-sm border-t border-outline-variant/10 text-center text-xs text-on-surface-variant/40">
        AI Study Sentinel v1.0
      </div>
    </nav>
  );
}
