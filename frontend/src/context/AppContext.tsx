'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Task, StudySession, GlobalSettings, StudyRoom, SupportTicket } from '@/lib/db';

interface AppContextType {
  tasks: Task[];
  settings: GlobalSettings;
  sessions: StudySession[];
  rooms: StudyRoom[];
  tickets: SupportTicket[];
  activeRoom: StudyRoom | null;
  joinedRooms: StudyRoom[];
  showNotification: (message: string, type?: 'success' | 'error' | 'info') => void;
  
  // Timer State
  timerMinutes: number;
  timerSeconds: number;
  isTimerRunning: boolean;
  timerMode: 'work' | 'break';
  activeTaskId: string | null;
  setActiveTaskId: (id: string | null) => void;
  activeTaskTitle: string;
  distractionsBlockedThisSession: number;

  // Assistant Sidebar State
  isAssistantOpen: boolean;
  setIsAssistantOpen: (open: boolean) => void;

  // Left Navigation Sidebar State (collapsed = small icon bar)
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;

  // Tab Switch & Site Focus Protection
  isTabSwitchModalOpen: boolean;
  tabSwitchCount: number;
  resumeAfterTabSwitch: () => void;
  dismissTabSwitchModal: () => void;

  // Actions
  fetchData: () => Promise<void>;
  addTask: (title: string, subject: string, estimatedPomodoros?: number) => Promise<void>;
  toggleTaskCompleted: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  updateTaskPomos: (id: string, delta: number) => Promise<void>;
  updateSettings: (newSettings: Partial<GlobalSettings>) => Promise<void>;
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  adjustTimerMinutes: (delta: number) => void;
  incrementDistractionShield: () => void;
  buyRewardItem: (itemId: string) => Promise<{ success: boolean; message: string }>;
  joinStudyRoom: (roomId: string) => Promise<{ success: boolean; message?: string }>;
  leaveStudyRoom: (roomId?: string) => Promise<void>;
  sendChatMessage: (text: string) => Promise<void>;
  submitSupportTicket: (subject: string, message: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

async function fetchJsonSafely<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`Fetch to ${url} returned status ${res.status}`);
      return null;
    }
    const contentType = res.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.warn(`Fetch to ${url} did not return JSON. Content-Type: ${contentType}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.warn(`Error fetching JSON from ${url}:`, err);
    return null;
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [settings, setSettings] = useState<GlobalSettings>({
    studyMode: false,
    distractionShield: true,
    blockedWebsites: [],
    focusScore: 0,
    pomodoroWorkTime: 25,
    pomodoroBreakTime: 5,
    currentStreak: 0,
    focusCoins: 0,
    cameraEnabled: true,
    aiConfig: {
      personality: 'academic',
      temperature: 0.7,
      systemPrompt: 'You are FocusFlow AI Tutor. Provide structured explanations and advice. Maintain a supportive educational tone. Encourage the student to avoid distraction and use Pomodoro blocks.',
      attentionGuardSensitivity: 'medium',
      stareDurationLimit: 7,
      gazeStatusDuration: 10,
      lookAtScreenDuration: 10
    }
  });
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [rooms, setRooms] = useState<StudyRoom[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [activeRoom, setActiveRoom] = useState<StudyRoom | null>(null);
  const [joinedRooms, setJoinedRooms] = useState<StudyRoom[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('focusflow_joined_rooms');
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    }
    return [];
  });
  const [notifications, setNotifications] = useState<Array<{ id: string; message: string; type: 'success' | 'error' | 'info' }>>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('focusflow_joined_rooms', JSON.stringify(joinedRooms));
        if (joinedRooms.length > 0 && !activeRoom) {
          setActiveRoom(joinedRooms[joinedRooms.length - 1]);
        }
      } catch {
        // ignore storage quota errors
      }
    }
  }, [joinedRooms, activeRoom]);

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = 'notif-' + Math.random().toString(36).substring(2, 9);
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
  };

  // Timer states
  const [timerMinutes, setTimerMinutes] = useState(25);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerMode, setTimerMode] = useState<'work' | 'break'>('work');
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [distractionsBlockedThisSession, setDistractionsBlockedThisSession] = useState(0);
  const [isAssistantOpen, setIsAssistantOpen] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const toggleSidebar = () => setIsSidebarCollapsed(prev => !prev);

  // Tab Switch & Site Focus Protection States
  const [isTabSwitchModalOpen, setIsTabSwitchModalOpen] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const wasTimerRunningBeforeTabSwitchRef = useRef(false);
  const isTimerRunningRef = useRef(isTimerRunning);

  useEffect(() => {
    isTimerRunningRef.current = isTimerRunning;
  }, [isTimerRunning]);

  // Tab switch & browser blur listener: Immediately stop session timer if user leaves our site/tab
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // User switched tab or minimized browser
        if (isTimerRunningRef.current) {
          wasTimerRunningBeforeTabSwitchRef.current = true;
          setIsTimerRunning(false); // Stop session time immediately!
          setTabSwitchCount(prev => prev + 1);
          setDistractionsBlockedThisSession(prev => prev + 1);

          fetch('/api/admin/alerts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: 'Tab Switch / Site Exit Detected',
              text: 'Student navigated away from FocusFlow tab. Study session timer was automatically stopped.',
              type: 'warning',
              region: 'Browser Tab Guard',
              source: 'Anti-Distraction Shield'
            })
          }).catch(() => {});
        }
      } else if (document.visibilityState === 'visible') {
        // User returned to our site
        if (wasTimerRunningBeforeTabSwitchRef.current) {
          setIsTabSwitchModalOpen(true);
        }
      }
    };

    const handleWindowBlur = () => {
      // User clicked outside browser window or switched to another application
      if (isTimerRunningRef.current) {
        wasTimerRunningBeforeTabSwitchRef.current = true;
        setIsTimerRunning(false); // Stop session time immediately!
        setTabSwitchCount(prev => prev + 1);
        setDistractionsBlockedThisSession(prev => prev + 1);
      }
    };

    const handleWindowFocus = () => {
      if (wasTimerRunningBeforeTabSwitchRef.current) {
        setIsTabSwitchModalOpen(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, []);

  // Sync live tabSwitchCount & focusScore telemetry to all joined rooms
  useEffect(() => {
    if (joinedRooms.length === 0) return;
    const userId = localStorage.getItem('student_user_id') || 'u1';
    const userName = localStorage.getItem('student_user_name') || 'Alex Rivera';
    const userEmail = localStorage.getItem('student_user_email') || 'alex@student.edu';
    joinedRooms.forEach(room => {
      fetch(`/api/rooms/${room.id}/telemetry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          userName,
          userEmail,
          tabSwitchCount,
          focusScore: settings.focusScore
        })
      }).catch(() => {});
    });
  }, [tabSwitchCount, joinedRooms, settings.focusScore]);

  const resumeAfterTabSwitch = () => {
    wasTimerRunningBeforeTabSwitchRef.current = false;
    setIsTabSwitchModalOpen(false);
    startTimer();
  };

  const dismissTabSwitchModal = () => {
    wasTimerRunningBeforeTabSwitchRef.current = false;
    setIsTabSwitchModalOpen(false);
  };

  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const activeTaskTitle = tasks.find(t => t.id === activeTaskId)?.title || 'General Focus';

  const fetchData = async () => {
    try {
      const [tasksData, settingsData, sessionsData, roomsData, ticketsData] = await Promise.all([
        fetchJsonSafely<Task[]>('/api/tasks'),
        fetchJsonSafely<GlobalSettings>('/api/settings'),
        fetchJsonSafely<StudySession[]>('/api/sessions'),
        fetchJsonSafely<StudyRoom[]>('/api/rooms'),
        fetchJsonSafely<SupportTicket[]>('/api/support')
      ]);

      if (tasksData !== null) setTasks(tasksData);
      if (settingsData !== null) setSettings(settingsData);
      if (sessionsData !== null) setSessions(sessionsData);
      if (roomsData !== null) setRooms(roomsData);
      if (ticketsData !== null) setTickets(ticketsData);
      
      // Update room in context if active
      if (activeRoom && roomsData !== null) {
        const freshRoom = roomsData.find((r: StudyRoom) => r.id === activeRoom.id);
        if (freshRoom) {
          setActiveRoom(freshRoom);
        }
      }
    } catch (err) {
      console.warn('Error inside fetchData:', err);
    }
  };

  const handleTimerFinished = async () => {
    setIsTimerRunning(false);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    // Audio notification
    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-84.wav');
      audio.volume = 0.5;
      audio.play();
    } catch {}

    if (timerMode === 'work') {
      // Complete work session, report to API
      try {
        const response = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: localStorage.getItem('student_user_id') || '',
            userEmail: localStorage.getItem('student_user_email') || '',
            durationMinutes: settings.pomodoroWorkTime,
            taskTitle: activeTaskTitle,
            distractionsBlocked: distractionsBlockedThisSession,
            focusScore: Math.min(100, Math.max(70, 95 - distractionsBlockedThisSession * 5)),
            taskId: activeTaskId
          })
        });
        
        if (response.ok) {
          await fetchData();
          // Switch to break
          setTimerMode('break');
          setTimerMinutes(settings.pomodoroBreakTime);
          setTimerSeconds(0);
          setDistractionsBlockedThisSession(0);
          showNotification(`Pomodoro completed! You earned study coins! Starting a ${settings.pomodoroBreakTime}-minute break.`, 'success');
        }
      } catch (err) {
        console.error('Failed to log completed session:', err);
      }
    } else {
      // Break completed
      setTimerMode('work');
      setTimerMinutes(settings.pomodoroWorkTime);
      setTimerSeconds(0);
      alert('Break completed! Time to focus.');
    }
  };

  useEffect(() => {
    fetchData();
    // Poll rooms & messages every 5 seconds for chat synchronization
    const interval = setInterval(() => {
      fetchData();
    }, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRoom?.id]);

  // Handle work/break time changes in settings
  useEffect(() => {
    if (!isTimerRunning) {
      setTimerMinutes(timerMode === 'work' ? settings.pomodoroWorkTime : settings.pomodoroBreakTime);
      setTimerSeconds(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.pomodoroWorkTime, settings.pomodoroBreakTime, timerMode]);

  // Timer tick effect
  useEffect(() => {
    if (isTimerRunning) {
      timerIntervalRef.current = setInterval(() => {
        setTimerSeconds(prevSec => {
          if (prevSec > 0) {
            return prevSec - 1;
          } else {
            setTimerMinutes(prevMin => {
              if (prevMin > 0) {
                return prevMin - 1;
              } else {
                // Timer finished!
                handleTimerFinished();
                return 0;
              }
            });
            return 59;
          }
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTimerRunning, timerMinutes, timerMode, activeTaskId]);

  const startTimer = () => {
    setIsTimerRunning(true);
    updateSettings({ studyMode: true });
  };

  const pauseTimer = () => {
    setIsTimerRunning(false);
  };

  const resetTimer = () => {
    setIsTimerRunning(false);
    setTimerMinutes(timerMode === 'work' ? settings.pomodoroWorkTime : settings.pomodoroBreakTime);
    setTimerSeconds(0);
    setDistractionsBlockedThisSession(0);
    updateSettings({ studyMode: false });
  };

  const adjustTimerMinutes = (delta: number) => {
    setTimerMinutes(prev => {
      const next = prev + delta;
      return next < 1 ? 1 : next;
    });
    const nextWorkTime = settings.pomodoroWorkTime + delta;
    updateSettings({ pomodoroWorkTime: nextWorkTime < 1 ? 1 : nextWorkTime });
  };

  const incrementDistractionShield = () => {
    setDistractionsBlockedThisSession(prev => prev + 1);
  };

  // Auto-remove completed tasks 10 minutes after completion
  useEffect(() => {
    const hasCompleted = tasks.some(t => t.completed);
    if (!hasCompleted) return;
    const interval = setInterval(() => {
      const now = Date.now();
      const hasExpired = tasks.some(
        t => t.completed && t.completedAt && now - new Date(t.completedAt).getTime() >= 10 * 60 * 1000
      );
      if (hasExpired) {
        fetchData();
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [tasks]);

  // Task methods
  const addTask = async (title: string, subject: string, estimatedPomodoros = 1) => {
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, subject, estimatedPomodoros })
      });
      if (response.ok) await fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const toggleTaskCompleted = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !task.completed })
      });
      if (response.ok) await fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteTask = async (id: string) => {
    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) await fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const updateTaskPomos = async (id: string, delta: number) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const nextEst = Math.max(1, task.estimatedPomodoros + delta);

    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estimatedPomodoros: nextEst })
      });
      if (response.ok) await fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const updateSettings = async (newSettings: Partial<GlobalSettings>) => {
    // 1. Optimistic state update so toggle and study mode respond immediately
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem('focusflow_local_settings', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // 2. Persist to backend API asynchronously
    try {
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });
      if (response.ok) {
        const data = await response.json();
        setSettings(prev => ({ ...prev, ...data }));
      }
    } catch (err) {
      console.warn('Backend sync deferred, keeping local state:', err);
    }
  };

  // Rewards shop buy
  const buyRewardItem = async (itemId: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await fetch('/api/rewards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId })
      });
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        if (response.ok) {
          await fetchData();
          return { success: true, message: data.message };
        } else {
          return { success: false, message: data.error || 'Purchase failed' };
        }
      } else {
        const text = await response.text();
        return { success: false, message: text || `Server returned error status ${response.status}` };
      }
    } catch (err) {
      const error = err as Error;
      return { success: false, message: error.message };
    }
  };

  // Study rooms methods (supports joining multiple rooms simultaneously)
  const joinStudyRoom = async (roomId: string) => {
    const existing = joinedRooms.find(r => r.id === roomId);
    if (existing) {
      setActiveRoom(existing);
      showNotification(`Already in Study Hall: ${existing.name}`, 'info');
      return { success: true };
    }

    try {
      const userId = localStorage.getItem('student_user_id') || 'u1';
      const userName = localStorage.getItem('student_user_name') || 'Alex Rivera';
      const userEmail = localStorage.getItem('student_user_email') || 'alex@student.edu';
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'join', roomId, userId, userName, userEmail })
      });
      if (response.ok) {
        const room: StudyRoom = await response.json();
        setJoinedRooms(prev => (prev.some(r => r.id === room.id) ? prev : [...prev, room]));
        setActiveRoom(room);
        showNotification(`Joined Study Hall: ${room.name}`, 'success');
        await fetchData();
        return { success: true };
      } else {
        const errData = await response.json();
        const msg = errData.error || 'Failed to join room';
        showNotification(msg, 'error');
        return { success: false, message: msg };
      }
    } catch (err) {
      console.error(err);
      const msg = 'Failed to join room due to network error';
      showNotification(msg, 'error');
      return { success: false, message: msg };
    }
  };

  const leaveStudyRoom = async (roomId?: string) => {
    const targetId = roomId || activeRoom?.id;
    if (!targetId) return;
    try {
      const userId = localStorage.getItem('student_user_id') || 'u1';
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'leave', roomId: targetId, userId })
      });
      if (response.ok) {
        const leftRoom = joinedRooms.find(r => r.id === targetId);
        const remaining = joinedRooms.filter(r => r.id !== targetId);
        setJoinedRooms(remaining);
        if (activeRoom?.id === targetId) {
          setActiveRoom(remaining.length > 0 ? remaining[remaining.length - 1] : null);
        }
        showNotification(`Left Study Hall${leftRoom ? `: ${leftRoom.name}` : ''}`, 'info');
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const sendChatMessage = async (text: string) => {
    if (!activeRoom) return;
    try {
      const response = await fetch(`/api/rooms/${activeRoom.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: 'Student', text })
      });
      if (response.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Support
  const submitSupportTicket = async (subject: string, message: string) => {
    try {
      const response = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, message })
      });
      if (response.ok) await fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <AppContext.Provider
      value={{
        tasks,
        settings,
        sessions,
        rooms,
        tickets,
        activeRoom,
        joinedRooms,
        showNotification,
        timerMinutes,
        timerSeconds,
        isTimerRunning,
        timerMode,
        activeTaskId,
        setActiveTaskId,
        activeTaskTitle,
        distractionsBlockedThisSession,
        isAssistantOpen,
        setIsAssistantOpen,
        isSidebarCollapsed,
        setIsSidebarCollapsed,
        toggleSidebar,
        isTabSwitchModalOpen,
        tabSwitchCount,
        resumeAfterTabSwitch,
        dismissTabSwitchModal,
        fetchData,
        addTask,
        toggleTaskCompleted,
        deleteTask,
        updateTaskPomos,
        updateSettings,
        startTimer,
        pauseTimer,
        resetTimer,
        adjustTimerMinutes,
        incrementDistractionShield,
        buyRewardItem,
        joinStudyRoom,
        leaveStudyRoom,
        sendChatMessage,
        submitSupportTicket
      }}
    >
      {children}

      {/* In-app Website Notifications (never triggers browser alert/window blur) */}
      {notifications.length > 0 && (
        <div className="fixed top-5 right-5 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
          {notifications.map(n => (
            <div
              key={n.id}
              className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-xl shadow-xl border backdrop-blur-md text-xs font-semibold animate-fade-in ${
                n.type === 'success'
                  ? 'bg-emerald-950/95 border-emerald-500/40 text-emerald-100'
                  : n.type === 'error'
                  ? 'bg-red-950/95 border-red-500/40 text-red-100'
                  : 'bg-slate-900/95 border-slate-700 text-slate-100'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`material-symbols-outlined text-[18px] shrink-0 ${
                    n.type === 'success'
                      ? 'text-emerald-400'
                      : n.type === 'error'
                      ? 'text-red-400'
                      : 'text-sky-400'
                  }`}
                >
                  {n.type === 'success' ? 'check_circle' : n.type === 'error' ? 'error' : 'notifications'}
                </span>
                <span className="truncate">{n.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setNotifications(prev => prev.filter(item => item.id !== n.id))}
                className="text-slate-400 hover:text-white cursor-pointer shrink-0"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
