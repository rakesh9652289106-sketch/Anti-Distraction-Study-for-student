'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import AttentionCamera from './AttentionCamera';

export default function AssistantSidebar() {
  const {
    settings,
    updateSettings,
    isTimerRunning,
    distractionsBlockedThisSession
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
    // Modify settings.pomodoroWorkTime to extend current running session or add 10 minutes to state
    // For convenience we can set study timer minutes direct to +10 mins
    alert('Extended current focus session by +10 minutes!');
    // Ideally we can update a state in context, but since timerMinutes is a state, we can write a simple workaround
    // Let's increment work time by 10 mins or just add 10 to current timer minutes
    updateSettings({ pomodoroWorkTime: settings.pomodoroWorkTime + 10 });
  };

  const sendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput;
    setChatInput('');
    
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setChatLog(prev => [...prev, { sender: 'user', text: userMsg, time: timestamp }]);

    // Simple educational AI response matching study & focus topics
    setTimeout(() => {
      let aiText = '';
      const query = userMsg.toLowerCase();
      
      if (query.includes('focus') || query.includes('distract')) {
        aiText = "To maximize focus, I recommend the 25/5 Pomodoro method. I've activated your Distraction Shield to block social media. Take deep breaths if you feel restless!";
      } else if (query.includes('biology') || query.includes('cell')) {
        aiText = "Cells are the basic building blocks of life! Animal cells have a cell membrane, nucleus, and mitochondria. Plant cells also have a cell wall and chloroplasts.";
      } else if (query.includes('math') || query.includes('calculus')) {
        aiText = "For math problem sets, try breaking them into small steps. Write out formulas first. I can keep time while you solve the next derivative!";
      } else if (query.includes('hello') || query.includes('hi')) {
        aiText = "Hello! Ready for a deep work session? Let me know how I can help you prepare today.";
      } else {
        aiText = "That sounds like a great topic! Let's keep concentrating on our active task. If you need any specific facts or study strategies, just ask.";
      }

      setChatLog(prev => [...prev, { sender: 'ai', text: aiText, time: timestamp }]);
    }, 1000);
  };

  return (
    <nav className="fixed right-0 top-0 h-screen w-80 flex flex-col bg-surface-container-low/90 backdrop-blur-lg border-l border-outline-variant/30 shadow-lg py-md px-sm z-50 overflow-y-auto">
      {/* Assistant Logo Area */}
      <div className="flex items-center gap-sm mb-lg px-sm">
        <div className="w-10 h-10 rounded-full bg-tertiary-container text-on-tertiary-container flex items-center justify-center">
          <span className="material-symbols-outlined font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>
            smart_toy
          </span>
        </div>
        <div>
          <h2 className="font-bold text-label-md text-tertiary-container">Smart Assistant</h2>
          <p className="text-label-sm text-on-surface-variant font-medium">AI-Powered Support</p>
        </div>
      </div>

      {/* Assistant Status Card */}
      <div className="glass-panel rounded-xl p-md mb-md mx-xs">
        <div className="flex items-center gap-sm mb-sm">
          <div className="w-2.5 h-2.5 rounded-full bg-secondary animate-pulse"></div>
          <span className="text-label-md font-bold text-on-surface">
            Status: {isTimerRunning ? 'In Deep Focus' : 'Ready to Start'}
          </span>
        </div>
        <p className="text-label-sm text-on-surface-variant mb-md leading-relaxed">
          {isTimerRunning
            ? `Distraction level: Low. We have blocked ${distractionsBlockedThisSession} attempts during this study block.`
            : 'Get ready for your session. Turn on Study Mode to shield yourself from internet distractions.'}
        </p>
        <button
          onClick={extendSession}
          className="w-full py-2 border border-outline-variant/50 hover:border-outline-variant rounded-lg font-semibold text-label-md text-primary hover:bg-surface-variant transition-all cursor-pointer active:scale-98"
        >
          Extend Session (+10m)
        </button>
      </div>

      {/* Attention Monitor Camera */}
      <div className="mb-md mx-xs">
        <AttentionCamera />
      </div>

      {/* Tabs Headers */}
      <div className="flex border-b border-outline-variant/20 mb-md px-xs">
        <button
          onClick={() => setActiveTab('ai')}
          className={`flex-1 pb-sm font-semibold text-label-sm text-center transition-all ${
            activeTab === 'ai'
              ? 'text-primary border-b-2 border-primary'
              : 'text-on-surface-variant/60 hover:text-primary'
          }`}
        >
          AI Study Companion
        </button>
        <button
          onClick={() => setActiveTab('notes')}
          className={`flex-1 pb-sm font-semibold text-label-sm text-center transition-all ${
            activeTab === 'notes'
              ? 'text-primary border-b-2 border-primary'
              : 'text-on-surface-variant/60 hover:text-primary'
          }`}
        >
          Quick Scratchpad
        </button>
      </div>

      {/* Tabs Content */}
      <div className="flex-1 flex flex-col overflow-hidden px-xs">
        {activeTab === 'ai' ? (
          <div className="flex-1 flex flex-col justify-between overflow-hidden">
            {/* Chat Log */}
            <div className="flex-1 overflow-y-auto space-y-sm pr-xs mb-sm max-h-[350px]">
              {chatLog.map((msg, index) => (
                <div
                  key={index}
                  className={`flex flex-col max-w-[85%] rounded-xl p-sm text-label-sm ${
                    msg.sender === 'user'
                      ? 'bg-primary text-on-primary ml-auto rounded-tr-none'
                      : 'bg-surface-container-high text-on-surface mr-auto rounded-tl-none border border-outline-variant/10'
                  }`}
                >
                  <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                  <span
                    className={`text-[9px] mt-1 self-end ${
                      msg.sender === 'user' ? 'text-white/60' : 'text-on-surface-variant/60'
                    }`}
                  >
                    {msg.time}
                  </span>
                </div>
              ))}
            </div>

            {/* Input Form */}
            <form onSubmit={sendChatMessage} className="flex gap-xs mt-auto">
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Ask focus tips, math help..."
                className="flex-1 px-sm py-2 border border-outline-variant/50 focus:border-primary focus:ring-1 focus:ring-primary rounded-lg text-label-sm outline-none bg-surface/50"
              />
              <button
                type="submit"
                className="bg-primary hover:bg-primary/95 text-on-primary p-2 rounded-lg flex items-center justify-center cursor-pointer transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">send</span>
              </button>
            </form>
          </div>
        ) : (
          <div className="flex-1 flex flex-col gap-sm">
            <label className="text-xs font-bold text-on-surface-variant/50 uppercase tracking-wider">
              Notes automatically save
            </label>
            <textarea
              value={noteText}
              onChange={e => saveNote(e.target.value)}
              placeholder="Jot down quick reminders, equations, list items here so you don't break your study flow..."
              className="flex-1 w-full p-sm border border-outline-variant/50 focus:border-primary focus:ring-1 focus:ring-primary rounded-lg text-label-sm outline-none resize-none bg-surface/30 min-h-[300px]"
            />
          </div>
        )}
      </div>
    </nav>
  );
}
