'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import AttentionCamera from './AttentionCamera';
import { generateAiResponse } from '@/lib/educationalAi';

interface AssistantSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AssistantSidebar({ isOpen, onClose }: AssistantSidebarProps) {
  const {
    settings,
    isTimerRunning,
    distractionsBlockedThisSession,
    adjustTimerMinutes
  } = useApp();

  const [activeTab, setActiveTab] = useState<'ai' | 'notes'>('ai');
  const [noteText, setNoteText] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [chatLog, setChatLog] = useState<Array<{ sender: 'user' | 'ai'; text: string; time: string }>>([
    {
      sender: 'ai',
      text: 'Hi there! I am your AI Study Sentinel. Need help understanding a concept or want tips to stay focused?',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  // Load notes from localstorage
  useEffect(() => {
    const savedNote = localStorage.getItem('focusflow_quick_notes');
    if (savedNote) setNoteText(savedNote);
  }, []);

  const saveNote = (text: string) => {
    setNoteText(text);
    localStorage.setItem('focusflow_quick_notes', text);
  };

  const extendSession = () => {
    adjustTimerMinutes(10);
    alert('Extended focus session by +10 minutes!');
  };

  const reduceSession = () => {
    if (settings.pomodoroWorkTime <= 10) {
      alert('Cannot reduce session below 10 minutes!');
      return;
    }
    adjustTimerMinutes(-10);
    alert('Reduced focus session by -10 minutes!');
  };

  const sendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput;
    setChatInput('');
    
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setChatLog(prev => [...prev, { sender: 'user', text: userMsg, time: timestamp }]);

    setTimeout(() => {
      const aiText = generateAiResponse(userMsg, settings?.aiConfig);
      setChatLog(prev => [...prev, { sender: 'ai', text: aiText, time: timestamp }]);
    }, 600);
  };

  return (
    <aside className={`fixed right-0 top-0 h-screen w-80 sm:w-88 flex flex-col bg-surface/98 backdrop-blur-xl border-l border-outline-variant/40 text-on-surface shadow-2xl z-50 transition-transform duration-300 ${
      isOpen ? 'translate-x-0' : 'translate-x-full'
    }`}>
      {/* Sticky Top Header */}
      <div className="shrink-0 sticky top-0 z-30 px-4 py-3 bg-surface/98 backdrop-blur-xl border-b border-outline-variant/30 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-secondary/15 text-secondary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined font-bold text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              smart_toy
            </span>
          </div>
          <div>
            <h2 className="font-bold text-sm text-primary leading-tight">Smart Assistant</h2>
            <p className="text-[11px] text-on-surface-variant font-medium">AI-Powered Support</p>
          </div>
        </div>
        <button
          onClick={onClose}
          type="button"
          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-outline-variant/20 text-on-surface-variant cursor-pointer transition-colors active:scale-95"
          title="Close AI Assistant"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>

      {/* Scrollable Content Body */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-3.5 space-y-4 min-h-0 [scrollbar-width:thin]">
        {/* Assistant Status Card */}
        <div className="glass-panel rounded-xl p-3 border border-outline-variant/40 bg-surface-container/60 shadow-xs">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-2.5 h-2.5 rounded-full ${isTimerRunning ? 'bg-secondary animate-pulse' : 'bg-primary'}`}></div>
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
              Status: {isTimerRunning ? 'In Deep Focus' : 'Ready to Start'}
            </span>
          </div>
          <p className="text-[11.5px] font-medium text-slate-700 dark:text-slate-300 mb-3 leading-relaxed">
            {isTimerRunning
              ? `Distraction level: Low. We have blocked ${distractionsBlockedThisSession} attempts during this study block.`
              : 'Get ready for your session. Turn on Study Mode to shield yourself from internet distractions.'}
          </p>
          <div className="flex gap-2 w-full">
            <button
              onClick={reduceSession}
              type="button"
              className="flex-1 py-1.5 px-2 border border-outline-variant hover:border-outline rounded-lg font-bold text-xs text-slate-900 dark:text-slate-100 bg-surface hover:bg-surface-variant transition-all cursor-pointer active:scale-98 text-center"
              title="Reduce focus session by 10 minutes"
            >
              Reduce (-10m)
            </button>
            <button
              onClick={extendSession}
              type="button"
              className="flex-1 py-1.5 px-2 border border-outline-variant hover:border-outline rounded-lg font-bold text-xs text-slate-900 dark:text-slate-100 bg-surface hover:bg-surface-variant transition-all cursor-pointer active:scale-98 text-center"
              title="Extend focus session by 10 minutes"
            >
              Extend (+10m)
            </button>
          </div>
        </div>

        {/* Attention Monitor Camera */}
        <div>
          <AttentionCamera />
        </div>

        {/* Tabs Headers */}
        <div className="flex border-b border-outline-variant/40 pt-1">
          <button
            type="button"
            onClick={() => setActiveTab('ai')}
            className={`flex-1 pb-2 font-bold text-xs text-center transition-all cursor-pointer ${
              activeTab === 'ai'
                ? 'text-primary border-b-2 border-primary'
                : 'text-slate-600 dark:text-slate-400 hover:text-primary'
            }`}
          >
            AI Study Companion
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('notes')}
            className={`flex-1 pb-2 font-bold text-xs text-center transition-all cursor-pointer ${
              activeTab === 'notes'
                ? 'text-primary border-b-2 border-primary'
                : 'text-slate-600 dark:text-slate-400 hover:text-primary'
            }`}
          >
            Quick Scratchpad
          </button>
        </div>

        {/* Tabs Content */}
        <div className="pb-6">
          {activeTab === 'ai' ? (
            <div className="flex flex-col space-y-3">
              {/* Chat Log */}
              <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1 [scrollbar-width:thin]">
                {chatLog.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex flex-col max-w-[88%] rounded-xl p-2.5 text-xs font-medium ${
                      msg.sender === 'user'
                        ? 'bg-primary text-white ml-auto rounded-tr-none'
                        : 'bg-surface-container-high text-slate-900 dark:text-slate-100 mr-auto rounded-tl-none border border-outline-variant/30'
                    }`}
                  >
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                    <span
                      className={`text-[9px] mt-1 self-end font-bold ${
                        msg.sender === 'user' ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {msg.time}
                    </span>
                  </div>
                ))}
              </div>

              {/* Input Form */}
              <form onSubmit={sendChatMessage} className="flex gap-1.5 pt-1">
                <input
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  placeholder="Ask focus tips, math help..."
                  className="flex-1 px-3 py-2 border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-lg text-xs outline-none bg-surface text-slate-900 dark:text-slate-100"
                />
                <button
                  type="submit"
                  className="bg-primary hover:bg-primary/95 text-white px-3 py-2 rounded-lg flex items-center justify-center cursor-pointer transition-colors shadow-xs active:scale-95"
                >
                  <span className="material-symbols-outlined text-[17px]">send</span>
                </button>
              </form>
            </div>
          ) : (
            <div className="flex flex-col space-y-2">
              <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Notes automatically save
              </label>
              <textarea
                value={noteText}
                onChange={e => saveNote(e.target.value)}
                placeholder="Jot down quick reminders, equations, list items here so you don't break your study flow..."
                className="w-full p-2.5 border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-lg text-xs outline-none bg-surface text-slate-900 dark:text-slate-100 min-h-[220px] resize-y leading-relaxed"
              />
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
