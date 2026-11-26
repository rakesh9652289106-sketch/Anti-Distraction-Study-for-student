'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import AssistantSidebar from '@/components/AssistantSidebar';
import CommandPalette from '@/components/CommandPalette';

export default function MainLayoutWrapper({ children }: { children: React.ReactNode }) {
  const {
    settings,
    isAssistantOpen,
    setIsAssistantOpen,
    isSidebarCollapsed,
    isTabSwitchModalOpen,
    tabSwitchCount,
    resumeAfterTabSwitch,
    dismissTabSwitchModal,
    timerMinutes,
    timerSeconds,
    activeTaskTitle
  } = useApp();
  const pathname = usePathname();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const isBypassShell = pathname?.startsWith('/admin') || pathname?.startsWith('/login') || pathname?.startsWith('/teacher') || pathname?.startsWith('/staff');

  useEffect(() => {
    if (!isBypassShell) {
      const isAuthenticated = 
        sessionStorage.getItem('student_authenticated') === 'true' ||
        localStorage.getItem('student_authenticated') === 'true';
      if (!isAuthenticated) {
        router.push('/login');
      } else {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, [isBypassShell, router, pathname]);

  // Global command palette listener
  useEffect(() => {
    const handleToggle = () => setIsCommandPaletteOpen(prev => !prev);
    window.addEventListener('toggle-command-palette', handleToggle);
    return () => window.removeEventListener('toggle-command-palette', handleToggle);
  }, []);

  const themeClass = settings?.uiConfig?.theme || 'slate';
  const densityClass = settings?.uiConfig?.density || 'comfort';
  const isDark = themeClass === 'cyberpunk' || themeClass === 'midnight' || (settings?.uiConfig?.theme?.includes('dark') ?? false);

  // Must be called unconditionally before any early returns
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-[36px] text-secondary">
          sync
        </span>
      </div>
    );
  }

  if (isBypassShell) {
    return (
      <main className="w-full min-h-screen relative z-10">
        {children}
        <CommandPalette
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
        />
      </main>
    );
  }
  
  return (
    <>
      <div className={`flex min-h-screen theme-${themeClass} ${isDark ? 'dark' : ''} density-${densityClass} bg-background text-on-surface transition-all duration-300`}>
        {/* Ambient Background Glows — themed via CSS variables */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[55%] h-[55%] rounded-full blur-[150px]" style={{ background: 'color-mix(in srgb, var(--color-secondary) 10%, transparent)' }}></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[55%] h-[55%] rounded-full blur-[150px]" style={{ background: 'color-mix(in srgb, var(--color-tertiary) 10%, transparent)' }}></div>
          <div className="absolute top-[35%] right-[25%] w-[35%] h-[35%] rounded-full blur-[120px]" style={{ background: 'color-mix(in srgb, var(--color-primary) 5%, transparent)' }}></div>
        </div>

        {/* Sidebar Navigation */}
        <Sidebar />

        {/* Main Content Area */}
        <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${
          isSidebarCollapsed ? 'pl-16' : 'pl-64'
        } ${
          isAssistantOpen ? 'pr-80' : 'pr-0'
        }`}>
          <Header />
          <main className="flex-1 p-md relative z-10 max-w-container-max w-full mx-auto mt-16 bg-background text-on-surface">
            {children}
          </main>
        </div>

        {/* Assistant Panel */}
        <AssistantSidebar isOpen={isAssistantOpen} onClose={() => setIsAssistantOpen(false)} />

        {/* Universal Command Palette */}
        <CommandPalette
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
        />

        {/* Floating Toggle Button */}
        {!isAssistantOpen && (
          <button
            onClick={() => setIsAssistantOpen(true)}
            className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-secondary text-on-secondary shadow-2xl flex items-center justify-center z-40 cursor-pointer transition-all duration-300 hover:scale-110 hover:-translate-y-1 hover:shadow-secondary/30 active:scale-95 animate-pulse"
            title="Open AI Assistant"
          >
            <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              smart_toy
            </span>
          </button>
        )}
      </div>

      {/* Tab Switch & Site Exit Protection Modal (Mounted outside flex container to guarantee full viewport width) */}
      {isTabSwitchModalOpen && (
        <div 
          className="fixed inset-0 top-0 left-0 w-screen h-screen bg-slate-950/85 backdrop-blur-md z-[99999] flex items-center justify-center p-4 font-sans"
          style={{ width: '100vw', height: '100vh', position: 'fixed', top: 0, left: 0 }}
        >
          <div 
            className="bg-surface border-2 border-amber-500/70 rounded-2xl p-6 sm:p-7 shadow-2xl space-y-4 text-center text-on-surface"
            style={{ width: '100%', maxWidth: '480px', minWidth: '320px' }}
          >
            <div className="w-16 h-16 rounded-full bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center mx-auto text-amber-500 shadow-inner">
              <span className="material-symbols-outlined text-3xl animate-bounce">tab_close</span>
            </div>
            <div>
              <span className="inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                Anti-Distraction Protection Active
              </span>
              <h3 className="text-lg font-black text-on-surface mt-2 leading-snug">
                Study Session Paused (Tab Switched / Left Site)
              </h3>
              <p className="text-xs text-on-surface-variant font-medium mt-1.5 leading-relaxed">
                Your session timer was automatically stopped when you switched tabs or navigated away. FocusFlow only counts study time while you are actively on this site!
              </p>
            </div>

            <div className="p-3.5 bg-surface-container rounded-xl text-left border border-outline-variant/30 text-xs space-y-2">
              <div className="flex justify-between items-center font-bold">
                <span className="text-on-surface-variant">Active Task:</span>
                <span className="text-on-surface font-mono truncate max-w-[220px]">{activeTaskTitle}</span>
              </div>
              <div className="flex justify-between items-center font-bold">
                <span className="text-on-surface-variant">Session Time Left:</span>
                <span className="text-primary font-mono">{String(timerMinutes).padStart(2, '0')}:{String(timerSeconds).padStart(2, '0')}</span>
              </div>
              <div className="flex justify-between items-center font-bold">
                <span className="text-on-surface-variant">Off-Site Pauses:</span>
                <span className="text-amber-600 font-mono">{tabSwitchCount} times</span>
              </div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={dismissTabSwitchModal}
                className="flex-1 py-2.5 px-4 bg-surface-container hover:bg-surface-container-high text-on-surface font-bold text-xs rounded-xl transition-all cursor-pointer border border-outline-variant/40"
              >
                Keep Paused
              </button>
              <button
                type="button"
                onClick={resumeAfterTabSwitch}
                className="flex-1 py-2.5 px-4 bg-secondary hover:brightness-110 text-white font-black text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm font-bold">play_arrow</span>
                Resume Study Session
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
