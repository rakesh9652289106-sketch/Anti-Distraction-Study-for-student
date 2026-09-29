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
  leaveStudyRoom: () => Promise<void>;
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
    focusScore: 92,
    pomodoroWorkTime: 25,
    pomodoroBreakTime: 5,
    currentStreak: 5,
    focusCoins: 120
  });
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [rooms, setRooms] = useState<StudyRoom[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [activeRoom, setActiveRoom] = useState<StudyRoom | null>(null);

  // Timer states
  const [timerMinutes, setTimerMinutes] = useState(25);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerMode, setTimerMode] = useState<'work' | 'break'>('work');
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [distractionsBlockedThisSession, setDistractionsBlockedThisSession] = useState(0);
  const [isAssistantOpen, setIsAssistantOpen] = useState(true);

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
          alert(`Pomodoro completed! You earned study coins! Starting a ${settings.pomodoroBreakTime}-minute break.`);
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
    try {
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (err) {
      console.error(err);
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

  // Study rooms methods
  const joinStudyRoom = async (roomId: string) => {
    try {
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'join', roomId })
      });
      if (response.ok) {
        const room = await response.json();
        setActiveRoom(room);
        await fetchData();
        return { success: true };
      } else {
        const errData = await response.json();
        return { success: false, message: errData.error || 'Failed to join room' };
      }
    } catch (err) {
      console.error(err);
      return { success: false, message: 'Failed to join room due to network error' };
    }
  };

  const leaveStudyRoom = async () => {
    if (!activeRoom) return;
    try {
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'leave', roomId: activeRoom.id })
      });
      if (response.ok) {
        setActiveRoom(null);
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
