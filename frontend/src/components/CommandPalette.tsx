'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { soundscapeEngine, SoundscapeType } from '@/lib/soundscapes';

interface CommandItem {
  id: string;
  category: 'Navigation' | 'Focus & Timer' | 'Soundscapes' | 'System';
  title: string;
  subtitle?: string;
  icon: string;
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const {
    startTimer,
    pauseTimer,
    resetTimer,
    isTimerRunning,
    settings,
    updateSettings,
    setIsAssistantOpen,
    addTask
  } = useApp();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Global shortcut Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Can be handled by parent or custom event
          window.dispatchEvent(new CustomEvent('toggle-command-palette'));
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Define commands
  const commands: CommandItem[] = [
    // Focus actions
    {
      id: 'timer-toggle',
      category: 'Focus & Timer',
      title: isTimerRunning ? 'Pause Session' : 'Start Focus Session',
      subtitle: 'Control Pomodoro study timer',
      icon: isTimerRunning ? 'pause' : 'play_arrow',
      action: () => {
        if (isTimerRunning) pauseTimer();
        else startTimer();
        onClose();
      }
    },
    {
      id: 'study-mode-toggle',
      category: 'Focus & Timer',
      title: settings.studyMode ? 'Disable Study Shield Mode' : 'Enable Study Shield Mode',
      subtitle: 'Block distracting domains & enforce focus',
      icon: 'security',
      action: () => {
        updateSettings({ studyMode: !settings.studyMode });
        onClose();
      }
    },
    {
      id: 'timer-reset',
      category: 'Focus & Timer',
      title: 'Reset Timer Clock',
      subtitle: 'Reset active session clock to default',
      icon: 'restart_alt',
      action: () => {
        resetTimer();
        onClose();
      }
    },
    {
      id: 'camera-check',
      category: 'Focus & Timer',
      title: 'Open AI Attention Camera Monitor',
      subtitle: 'Test gaze & blink tracker calibration',
      icon: 'videocam',
      action: () => {
        setIsAssistantOpen(true);
        onClose();
      }
    },

    // Soundscapes
    {
      id: 'sound-rain',
      category: 'Soundscapes',
      title: 'Play Gentle Rain Ambience',
      subtitle: 'Procedural pink noise with soft drops',
      icon: 'water_drop',
      action: () => {
        soundscapeEngine.play('rain');
        onClose();
      }
    },
    {
      id: 'sound-binaural',
      category: 'Soundscapes',
      title: 'Play 40Hz Gamma Focus Beats',
      subtitle: 'Binaural cognitive stimulation',
      icon: 'graphic_eq',
      action: () => {
        soundscapeEngine.play('binaural');
        onClose();
      }
    },
    {
      id: 'sound-ocean',
      category: 'Soundscapes',
      title: 'Play Ocean Waves Ambience',
      subtitle: 'Rhythmic deep breathing waves',
      icon: 'tsunami',
      action: () => {
        soundscapeEngine.play('ocean');
        onClose();
      }
    },
    {
      id: 'sound-stop',
      category: 'Soundscapes',
      title: 'Stop Ambient Sound',
      subtitle: 'Mute background soundscape engine',
      icon: 'volume_off',
      action: () => {
        soundscapeEngine.stop();
        onClose();
      }
    },

    // Navigation
    {
      id: 'nav-dashboard',
      category: 'Navigation',
      title: 'Go to Dashboard',
      subtitle: 'Main focus hub & timer',
      icon: 'dashboard',
      action: () => {
        router.push('/');
        onClose();
      }
    },
    {
      id: 'nav-planner',
      category: 'Navigation',
      title: 'Go to Smart Planner',
      subtitle: 'Weekly schedule & study tasks',
      icon: 'calendar_today',
      action: () => {
        router.push('/planner');
        onClose();
      }
    },
    {
      id: 'nav-analytics',
      category: 'Navigation',
      title: 'Go to Analytics & Cognitive Scores',
      subtitle: 'Study trends & productivity metrics',
      icon: 'analytics',
      action: () => {
        router.push('/analytics');
        onClose();
      }
    },
    {
      id: 'nav-rooms',
      category: 'Navigation',
      title: 'Go to Virtual Study Rooms',
      subtitle: 'Collaborative rooms with peers',
      icon: 'groups',
      action: () => {
        router.push('/rooms');
        onClose();
      }
    },
    {
      id: 'nav-rewards',
      category: 'Navigation',
      title: 'Go to Focus Rewards & Shop',
      subtitle: 'Coins, streaks & achievements',
      icon: 'military_tech',
      action: () => {
        router.push('/rewards');
        onClose();
      }
    },
    {
      id: 'nav-settings',
      category: 'Navigation',
      title: 'Go to User Settings',
      subtitle: 'Themes, timer durations, blocked list',
      icon: 'settings',
      action: () => {
        router.push('/settings');
        onClose();
      }
    },
    {
      id: 'nav-pulse',
      category: 'Navigation',
      title: 'Admin: Open Pulse Hub',
      subtitle: 'Live infrastructure & zone status',
      icon: 'monitoring',
      action: () => {
        router.push('/admin/pulse');
        onClose();
      }
    },
  ];

  // Filter commands
  const filteredCommands = commands.filter(cmd =>
    cmd.title.toLowerCase().includes(query.toLowerCase()) ||
    cmd.subtitle?.toLowerCase().includes(query.toLowerCase()) ||
    cmd.category.toLowerCase().includes(query.toLowerCase())
  );

  // Quick task creation when query is not empty
  const canCreateTask = query.trim().length > 1;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const totalItems = filteredCommands.length + (canCreateTask ? 1 : 0);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % (totalItems || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + (totalItems || 1)) % (totalItems || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex < filteredCommands.length) {
        filteredCommands[selectedIndex]?.action();
      } else if (canCreateTask) {
        addTask(query.trim(), 'General');
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white dark:bg-[#0c1322] border border-outline-variant/30 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-outline-variant/20">
          <span className="material-symbols-outlined text-outline text-xl">search</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search (e.g. 'start timer', 'rain', 'planner')..."
            className="flex-1 bg-transparent text-primary text-sm font-medium outline-none placeholder:text-outline-variant"
          />
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono font-semibold text-outline bg-surface-container-high rounded border border-outline-variant/30">
            ESC to close
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-1">
          {filteredCommands.length > 0 ? (
            filteredCommands.map((cmd, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={cmd.id}
                  onClick={cmd.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-secondary/10 border border-secondary/30 text-primary'
                      : 'hover:bg-surface-container-low text-on-surface-variant'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      isSelected ? 'bg-secondary text-white' : 'bg-surface-variant text-on-surface-variant'
                    }`}>
                      <span className="material-symbols-outlined text-lg">{cmd.icon}</span>
                    </div>
                    <div>
                      <div className={`text-xs font-semibold ${isSelected ? 'text-primary font-bold' : ''}`}>
                        {cmd.title}
                      </div>
                      {cmd.subtitle && (
                        <div className="text-[11px] text-on-surface-variant/70 leading-tight">
                          {cmd.subtitle}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-outline-variant tracking-wider">
                    {cmd.category}
                  </span>
                </div>
              );
            })
          ) : !canCreateTask ? (
            <div className="py-12 text-center text-xs text-on-surface-variant">
              No matching commands or pages found.
            </div>
          ) : null}

          {/* Quick Task creation item */}
          {canCreateTask && (
            <div
              onClick={() => {
                addTask(query.trim(), 'General');
                onClose();
              }}
              onMouseEnter={() => setSelectedIndex(filteredCommands.length)}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                selectedIndex === filteredCommands.length
                  ? 'bg-primary/10 border border-primary/30 text-primary font-bold'
                  : 'hover:bg-surface-container-low text-on-surface-variant'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg">add_task</span>
                </div>
                <div>
                  <div className="text-xs font-semibold">
                    Create new task: &ldquo;<span className="text-secondary">{query.trim()}</span>&rdquo;
                  </div>
                  <div className="text-[11px] text-on-surface-variant/70">
                    Add directly to upcoming study planner
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                Press Enter ↵
              </span>
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 border-t border-outline-variant/20 bg-surface-container-lowest/50 flex items-center justify-between text-[11px] text-outline">
          <div className="flex items-center gap-3">
            <span><kbd className="font-mono bg-surface-container px-1.5 py-0.5 rounded text-[10px]">↑</kbd> <kbd className="font-mono bg-surface-container px-1.5 py-0.5 rounded text-[10px]">↓</kbd> Navigate</span>
            <span><kbd className="font-mono bg-surface-container px-1.5 py-0.5 rounded text-[10px]">↵</kbd> Select</span>
          </div>
          <span>FocusFlow Command Palette</span>
        </div>
      </div>
    </div>
  );
}
