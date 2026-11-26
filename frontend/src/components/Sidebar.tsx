'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';

const ADMIN_EMAIL = 'rakesh9652289106@gmail.com';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { settings, sessions, startTimer, isTimerRunning, pauseTimer, isSidebarCollapsed, toggleSidebar } = useApp();
  const [isAdminUser, setIsAdminUser] = useState(false);

  useEffect(() => {
    const checkAdminEmail = () => {
      const emails = [
        localStorage.getItem('student_user_email'),
        localStorage.getItem('staff_user_email'),
        localStorage.getItem('student_google_verified_email'),
        localStorage.getItem('staff_google_verified_email')
      ].map(e => (e || '').trim().toLowerCase());
      setIsAdminUser(emails.includes(ADMIN_EMAIL));
    };
    checkAdminEmail();
    window.addEventListener('focusflow-profile-updated', checkAdminEmail);
    return () => window.removeEventListener('focusflow-profile-updated', checkAdminEmail);
  }, [pathname]);

  const totalXp = (sessions?.length || 0) * 50 + (settings?.focusCoins || 0);
  const currentLevel = Math.floor(totalXp / 250) + 1;
  const xpInLevel = totalXp % 250;
  const xpPercent = Math.min(100, Math.round((xpInLevel / 250) * 100));

  const handleLogout = () => {
    sessionStorage.removeItem('student_authenticated');
    localStorage.removeItem('student_authenticated');
    sessionStorage.removeItem('staff_authenticated');
    localStorage.removeItem('staff_authenticated');
    sessionStorage.removeItem('admin_authenticated');
    router.push('/login');
  };

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
    <nav className={`fixed left-0 top-0 h-screen flex flex-col py-4 bg-surface/85 backdrop-blur-2xl border-r border-outline-variant/30 text-on-surface shadow-xs z-50 overflow-y-auto transition-all duration-300 ${
      isSidebarCollapsed ? 'w-16 px-2 items-center' : 'w-64 px-3'
    }`}>
      {/* Brand Header + Collapse/Expand Toggle */}
      <div className={`flex items-center mb-5 w-full ${isSidebarCollapsed ? 'flex-col gap-2' : 'justify-between px-2'}`}>
        <div className={`flex items-center gap-3 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
          <button
            type="button"
            onClick={toggleSidebar}
            title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            className="w-9 h-9 rounded-xl bg-gradient-to-tr from-secondary to-secondary/60 text-on-secondary flex items-center justify-center shadow-md shadow-secondary/20 shrink-0 cursor-pointer hover:brightness-110 transition-all"
          >
            <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              psychology
            </span>
          </button>
          {!isSidebarCollapsed && (
            <div>
              <h1 className="font-bold text-base text-primary tracking-tight leading-tight">
                {settings?.uiConfig?.brandingName || 'FocusFlow'}
              </h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></span>
                <span className="text-[11px] font-semibold text-secondary tracking-wide uppercase">AI Study Guard</span>
              </div>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={toggleSidebar}
          title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors cursor-pointer shrink-0"
        >
          <span className="material-symbols-outlined text-[18px]">
            {isSidebarCollapsed ? 'chevron_right' : 'chevron_left'}
          </span>
        </button>
      </div>

      {/* Start / Pause Session Quick Card */}
      <button
        type="button"
        onClick={isTimerRunning ? pauseTimer : startTimer}
        title={isTimerRunning ? 'Pause Session' : 'Start Focus Session'}
        className={`w-full font-bold text-xs py-2.5 rounded-xl mb-4 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-98 ${
          isSidebarCollapsed ? 'px-0' : 'px-3'
        } ${
          isTimerRunning
            ? 'bg-amber-500/15 border border-amber-500/30 text-amber-500 hover:bg-amber-500/25 shadow-amber-500/10'
            : 'bg-primary hover:bg-primary/90 text-on-primary shadow-primary/20'
        }`}
      >
        <span className="material-symbols-outlined text-base">
          {isTimerRunning ? 'pause_circle' : 'play_circle'}
        </span>
        {!isSidebarCollapsed && <span>{isTimerRunning ? 'Pause Session' : 'Start Focus Session'}</span>}
      </button>

      {/* Streak & Level Micro-Card */}
      {!isSidebarCollapsed ? (
        <div className="mb-5 mx-1 p-3 rounded-xl bg-surface-container-low/80 border border-outline-variant/20">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="flex items-center gap-1 font-bold text-amber-600">
              <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                local_fire_department
              </span>
              {settings.currentStreak} Day Streak
            </span>
            <span className="text-[10px] font-bold text-on-surface-variant bg-surface-container px-1.5 py-0.5 rounded">
              Level {currentLevel}
            </span>
          </div>
          <div className="w-full bg-surface-variant h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-amber-500 to-secondary h-full rounded-full transition-all duration-500"
              style={{ width: `${xpPercent}%` }}
            ></div>
          </div>
          <div className="flex justify-between items-center mt-1 text-[9.5px] text-on-surface font-bold">
            <span>{xpInLevel} / 250 XP</span>
            <span>Next: Level {currentLevel + 1}</span>
          </div>
        </div>
      ) : (
        <div
          className="mb-4 w-10 h-10 rounded-xl bg-surface-container-low/80 border border-outline-variant/20 flex flex-col items-center justify-center text-amber-600"
          title={`${settings.currentStreak} Day Streak • Level ${currentLevel} (${xpInLevel}/250 XP)`}
        >
          <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            local_fire_department
          </span>
          <span className="text-[9px] font-black leading-none">{settings.currentStreak}</span>
        </div>
      )}

      {/* Primary Navigation */}
      <div className="flex-1 flex flex-col gap-1 mb-4 w-full">
        {!isSidebarCollapsed && (
          <span className="text-[10px] uppercase font-black text-on-surface-variant px-3 mb-1 tracking-wider">
            Workspace
          </span>
        )}
        {navItems.map(item => {
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              title={item.name}
              className={`flex items-center rounded-xl transition-all active:scale-98 text-xs font-bold ${
                isSidebarCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2'
              } ${
                isActive
                  ? 'bg-secondary/15 text-secondary font-black border border-secondary/30 shadow-2xs'
                  : 'text-on-surface hover:text-primary hover:bg-surface-container'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className={`material-symbols-outlined text-[20px] ${isActive ? 'text-secondary' : 'text-on-surface-variant'}`}>
                  {item.icon}
                </span>
                {!isSidebarCollapsed && <span>{item.name}</span>}
              </div>
              {!isSidebarCollapsed && (
                item.badge ? (
                  <span className="text-[9px] font-black uppercase tracking-wider bg-secondary/20 text-secondary px-1.5 py-0.5 rounded-full animate-pulse">
                    {item.badge}
                  </span>
                ) : item.shortcut ? (
                  <span className="text-[10px] font-mono font-bold text-on-surface-variant/70 hidden xl:inline">
                    {item.shortcut}
                  </span>
                ) : null
              )}
            </Link>
          );
        })}

        {/* System Control Navigation Section (Only visible to authorized admin) */}
        {isAdminUser && (
          <>
            {!isSidebarCollapsed && (
              <span className="text-[10px] uppercase font-black text-on-surface-variant px-3 mt-4 mb-1 tracking-wider">
                Admin Portal
              </span>
            )}
            {adminItems.map(item => {
              const isActive = pathname === item.path;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  title={item.name}
                  className={`flex items-center gap-2.5 rounded-xl transition-all active:scale-98 text-xs font-bold ${
                    isSidebarCollapsed ? 'justify-center p-2.5' : 'px-3 py-2'
                  } ${
                    isActive
                      ? 'bg-secondary/15 text-secondary font-black border border-secondary/30'
                      : 'text-on-surface hover:text-primary hover:bg-surface-container'
                  }`}
                >
                  <span className={`material-symbols-outlined text-[20px] ${isActive ? 'text-secondary' : 'text-on-surface-variant'}`}>
                    {item.icon}
                  </span>
                  {!isSidebarCollapsed && <span>{item.name}</span>}
                </Link>
              );
            })}
          </>
        )}
      </div>
      
      {/* Logout Button */}
      <div className="pt-2 pb-2 w-full">
        <button
          type="button"
          onClick={handleLogout}
          title="Logout"
          className={`w-full flex items-center gap-2.5 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all cursor-pointer active:scale-98 ${
            isSidebarCollapsed ? 'justify-center p-2.5' : 'px-3 py-2'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          {!isSidebarCollapsed && <span>Logout</span>}
        </button>
      </div>

      {/* Footer System Status */}
      {!isSidebarCollapsed ? (
        <div className="pt-3 border-t border-outline-variant/20 px-2 flex items-center justify-between text-[11px] text-on-surface-variant/60 w-full">
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
      ) : (
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('toggle-command-palette'))}
          className="mt-1 hover:text-primary font-mono text-[10px] bg-surface-container px-1.5 py-1 rounded border border-outline-variant/30 cursor-pointer"
          title="Open Quick Search (Ctrl+K)"
        >
          ⌘K
        </button>
      )}
    </nav>
  );
}
