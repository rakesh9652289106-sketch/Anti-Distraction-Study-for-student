'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import AssistantSidebar from '@/components/AssistantSidebar';

export default function MainLayoutWrapper({ children }: { children: React.ReactNode }) {
  const { settings, isAssistantOpen, setIsAssistantOpen } = useApp();
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith('/admin');

  if (isAdminRoute) {
    return (
      <main className="w-full min-h-screen bg-[#070D19] relative z-10">
        {children}
      </main>
    );
  }

  const themeClass = settings?.uiConfig?.theme || 'slate';
  const densityClass = settings?.uiConfig?.density || 'comfort';
  
  return (
    <div className={`flex min-h-screen theme-${themeClass} density-${densityClass} bg-background text-on-surface transition-all duration-300`}>
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col min-h-screen pl-64 transition-all duration-300 ${
        isAssistantOpen ? 'pr-80' : 'pr-0'
      }`}>
        <Header />
        <main className="flex-1 p-md relative z-10 max-w-container-max w-full mx-auto mt-16 bg-background text-on-surface">
          {children}
        </main>
      </div>

      {/* Assistant Panel */}
      <AssistantSidebar isOpen={isAssistantOpen} onClose={() => setIsAssistantOpen(false)} />

      {/* Floating Toggle Button */}
      {!isAssistantOpen && (
        <button
          onClick={() => setIsAssistantOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-secondary text-white shadow-2xl flex items-center justify-center z-50 cursor-pointer transition-all duration-300 hover:scale-110 hover:-translate-y-1 hover:shadow-secondary/30 active:scale-95 animate-pulse"
          title="Open AI Assistant"
        >
          <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            smart_toy
          </span>
        </button>
      )}
    </div>
  );
}

