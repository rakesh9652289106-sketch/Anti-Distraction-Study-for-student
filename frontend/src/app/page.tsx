'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import ZenModeModal from '@/components/ZenModeModal';

const FOCUS_TIPS = [
  "Deep focus follows 20-minute immersion. Protect your initial 10 minutes from digital interruption.",
  "Monotasking outperforms multitasking by up to 40% in long-term academic retention.",
  "Hydration and 20-second distant gazing reduce ocular strain and cognitive fatigue.",
  "Active recall and flashcard generation lock memories 3x faster than passive re-reading.",
  "Pomodoro rhythm synchronizes with ultradian brain cycles for sustained energy."
];

export default function DashboardPage() {
  const {
    tasks,
    addTask,
    toggleTaskCompleted,
    timerMinutes,
    timerSeconds,
    isTimerRunning,
    startTimer,
    pauseTimer,
    resetTimer,
    timerMode,
    activeTaskId,
    setActiveTaskId,
    settings,
    updateSettings,
    sessions,
    incrementDistractionShield,
    distractionsBlockedThisSession,
    setIsAssistantOpen
  } = useApp();

  const [simSite, setSimSite] = useState('');
  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const [quickTaskSubject, setQuickTaskSubject] = useState('Core Subject');
  const [isZenModeOpen, setIsZenModeOpen] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);
  const [shieldAlerts, setShieldAlerts] = useState<Array<{ site: string; time: string }>>([
    { site: 'instagram.com', time: '10 mins ago' },
    { site: 'tiktok.com', time: '25 mins ago' }
  ]);

  // Greeting based on current time
  const [greeting, setGreeting] = useState('Good day');
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  // Calculate daily goal progress
  const totalMinutesToday = sessions
    .filter(s => {
      const todayStr = new Date().toISOString().split('T')[0];
      return s.startTime.startsWith(todayStr);
    })
    .reduce((sum, s) => sum + s.durationMinutes, 0);

  const dailyGoalMinutes = 240; // 4 hours
  const progressPercent = Math.min(100, Math.round((totalMinutesToday / dailyGoalMinutes) * 100));

  // Timer SVG parameters
  const workTime = settings.pomodoroWorkTime;
  const breakTime = settings.pomodoroBreakTime;
  const totalSeconds = timerMode === 'work' ? workTime * 60 : breakTime * 60;
  const currentSeconds = timerMinutes * 60 + timerSeconds;
  const progressFraction = totalSeconds > 0 ? (totalSeconds - currentSeconds) / totalSeconds : 0;
  const dashOffset = 283 - progressFraction * 283;

  // Handle Preset selection
  const handleSelectPreset = (workMins: number, breakMins: number, mode: 'work' | 'break') => {
    pauseTimer();
    updateSettings({
      pomodoroWorkTime: workMins,
      pomodoroBreakTime: breakMins
    });
    // Set timer mode and reset
    resetTimer();
  };

  // Handle Distraction Shield Simulator
  const testShield = (e: React.FormEvent) => {
    e.preventDefault();
    if (!simSite) return;
    
    const host = simSite.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '');
    const isBlocked = settings.blockedWebsites.some(blocked => host.includes(blocked));

    if (isBlocked) {
      incrementDistractionShield();
      setShieldAlerts(prev => [
        { site: host, time: 'Just now' },
        ...prev
      ]);
      alert(`[SHIELD BLOCKED]: Access to "${host}" was intercepted and shielded!`);
    } else {
      alert(`[SHIELD PASSED]: "${host}" is not in your blocklist. Access allowed.`);
    }
    setSimSite('');
  };

  // Handle Quick Add Task
  const handleQuickAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTaskTitle.trim()) return;
    addTask(quickTaskTitle.trim(), quickTaskSubject);
    setQuickTaskTitle('');
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Hero Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2 pb-1">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-bold tracking-widest text-secondary bg-secondary/10 px-2.5 py-0.5 rounded-full border border-secondary/20">
              Flow State Active
            </span>
            <span className="text-xs text-on-surface-variant font-medium">
              {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-primary mt-1 tracking-tight">
            {greeting}, Alex! 🚀
          </h2>
        </div>

        {/* Tip / Quote micro card */}
        <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-surface-container-low/70 border border-outline-variant/20 max-w-md shadow-2xs">
          <span className="material-symbols-outlined text-secondary text-xl">lightbulb</span>
          <p className="text-xs text-on-surface-variant leading-relaxed flex-1">
            {FOCUS_TIPS[tipIndex]}
          </p>
          <button
            onClick={() => setTipIndex((tipIndex + 1) % FOCUS_TIPS.length)}
            className="p-1 text-outline hover:text-primary rounded-lg transition-colors cursor-pointer"
            title="Next focus tip"
          >
            <span className="material-symbols-outlined text-base">refresh</span>
          </button>
        </div>
      </div>

      {/* Main Focus Center Card */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-outline-variant/30 relative overflow-hidden flex flex-col items-center justify-center text-center shadow-sm">
        {/* Subtle decorative glow in background */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-secondary/5 rounded-full blur-3xl pointer-events-none"></div>

        {/* Timer Presets Bar */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-6 z-10">
          <button
            onClick={() => handleSelectPreset(25, 5, 'work')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
              workTime === 25
                ? 'bg-secondary text-white border-secondary shadow-xs'
                : 'bg-surface-container-low text-on-surface-variant hover:text-primary border-outline-variant/30'
            }`}
          >
            25m Focus
          </button>
          <button
            onClick={() => handleSelectPreset(50, 10, 'work')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
              workTime === 50
                ? 'bg-secondary text-white border-secondary shadow-xs'
                : 'bg-surface-container-low text-on-surface-variant hover:text-primary border-outline-variant/30'
            }`}
          >
            50m Deep Flow
          </button>
          <button
            onClick={() => handleSelectPreset(5, 5, 'break')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
              breakTime === 5 && timerMode === 'break'
                ? 'bg-sky-500 text-white border-sky-500 shadow-xs'
                : 'bg-surface-container-low text-on-surface-variant hover:text-primary border-outline-variant/30'
            }`}
          >
            5m Short Break
          </button>
          <button
            onClick={() => handleSelectPreset(15, 15, 'break')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
              breakTime === 15 && timerMode === 'break'
                ? 'bg-sky-500 text-white border-sky-500 shadow-xs'
                : 'bg-surface-container-low text-on-surface-variant hover:text-primary border-outline-variant/30'
            }`}
          >
            15m Long Break
          </button>
        </div>

        {/* Center Clock Visual Ring */}
        <div className="relative w-72 h-72 sm:w-80 sm:h-80 flex items-center justify-center mb-6">
          <svg className="absolute inset-0 w-full h-full drop-shadow-[0_0_20px_rgba(0,108,73,0.18)]" viewBox="0 0 100 100">
            <circle
              className="text-slate-200 dark:text-slate-800"
              cx="50"
              cy="50"
              fill="none"
              r="45"
              stroke="currentColor"
              strokeWidth="2.5"
            />
            <circle
              className={`progress-ring__circle transition-all duration-1000 ${
                timerMode === 'work' ? 'text-secondary' : 'text-sky-500'
              }`}
              cx="50"
              cy="50"
              fill="none"
              r="45"
              stroke="currentColor"
              strokeDasharray="283"
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              strokeWidth="4"
            />
          </svg>

          {/* Clock Center */}
          <div className="text-center z-10 bg-white/70 dark:bg-[#0c1322]/80 backdrop-blur-md rounded-full w-56 h-56 flex flex-col items-center justify-center border border-outline-variant/20 shadow-sm">
            <span className={`font-bold text-[11px] uppercase tracking-widest mb-1 ${
              timerMode === 'work' ? 'text-secondary' : 'text-sky-500'
            }`}>
              {timerMode === 'work' ? 'Cognitive Immersion' : 'Restorative Break'}
            </span>
            <span className="font-bold text-5xl sm:text-6xl text-primary font-mono tracking-tight my-1">
              {timerMinutes.toString().padStart(2, '0')}:{timerSeconds.toString().padStart(2, '0')}
            </span>
            <span className="font-semibold text-xs text-on-surface-variant flex items-center gap-1.5 mt-1">
              <span className={`w-2 h-2 rounded-full inline-block ${
                isTimerRunning ? 'bg-secondary animate-pulse' : 'bg-slate-400'
              }`}></span>
              {isTimerRunning ? 'Session In Progress' : 'Ready to Start'}
            </span>
          </div>
        </div>

        {/* Primary Controls Bar */}
        <div className="flex flex-wrap items-center justify-center gap-3 z-10">
          <button
            onClick={isTimerRunning ? pauseTimer : startTimer}
            className="px-5 py-2.5 bg-primary text-on-primary font-bold text-xs rounded-xl flex items-center gap-2 cursor-pointer shadow-md hover:bg-primary/90 transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-base">
              {isTimerRunning ? 'pause' : 'play_arrow'}
            </span>
            {isTimerRunning ? 'Pause Session' : 'Start Focus Session'}
          </button>

          <button
            onClick={() => updateSettings({ studyMode: !settings.studyMode })}
            className={`px-4 py-2.5 font-bold text-xs rounded-xl flex items-center gap-2 cursor-pointer border transition-all active:scale-95 ${
              settings.studyMode
                ? 'bg-secondary text-white border-secondary shadow-md shadow-secondary/20'
                : 'bg-surface-container-high border-outline-variant/30 text-primary hover:bg-surface-variant'
            }`}
            title="Toggle Study Shield Mode"
          >
            <span className="material-symbols-outlined text-base">
              {settings.studyMode ? 'shield' : 'shield_with_heart'}
            </span>
            {settings.studyMode ? 'Study Shield ON' : 'Study Shield OFF'}
          </button>

          {/* Zen Immersion Mode Button */}
          <button
            onClick={() => setIsZenModeOpen(true)}
            className="px-4 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
            title="Enter distraction-free fullscreen Zen mode"
          >
            <span className="material-symbols-outlined text-base">fullscreen</span>
            Zen Mode
          </button>

          {/* Camera Check or Lockout Button */}
          {settings.cameraEnabled !== false ? (
            <button
              onClick={() => setIsAssistantOpen(true)}
              className="px-4 py-2.5 bg-surface-container-high border border-outline-variant/30 text-primary font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer hover:bg-surface-variant transition-all active:scale-95"
              title="Open AI Attention Camera Monitor"
            >
              <span className="material-symbols-outlined text-secondary text-base">videocam</span>
              Camera Check
            </button>
          ) : (
            <button
              disabled
              className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800/40 border border-amber-500/20 text-slate-400 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-not-allowed opacity-75"
              title="Webcam monitoring has been disabled by Administrator"
            >
              <span className="material-symbols-outlined text-amber-500 text-base">videocam_off</span>
              Camera Disabled
            </button>
          )}

          <button
            onClick={resetTimer}
            className="px-3.5 py-2.5 bg-surface-container-high border border-outline-variant/30 text-on-surface-variant font-semibold text-xs rounded-xl flex items-center gap-1 cursor-pointer hover:bg-surface-variant transition-all active:scale-95"
            title="Reset timer clock"
          >
            <span className="material-symbols-outlined text-base">restart_alt</span>
            Reset
          </button>
        </div>
      </div>

      {/* Bento Grid: Tasks & Distraction Shield */}
      <div className="w-full grid grid-cols-12 gap-6">
        {/* Upcoming Tasks with Inline Quick Add */}
        <div className="col-span-12 lg:col-span-7 glass-panel rounded-2xl p-5 border border-outline-variant/30 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-base text-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">checklist</span>
                Target Tasks for Today
              </h3>
              <span className="text-[11px] font-semibold text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full">
                {tasks.filter(t => t.completed).length} / {tasks.length} Completed
              </span>
            </div>

            {/* Inline Quick Add Task input */}
            <form onSubmit={handleQuickAddTask} className="flex gap-2 mb-4">
              <input
                type="text"
                value={quickTaskTitle}
                onChange={e => setQuickTaskTitle(e.target.value)}
                placeholder="+ Add task and press Enter..."
                className="flex-1 px-3 py-2 text-xs bg-surface-container-low/70 border border-outline-variant/30 rounded-xl outline-none focus:border-secondary transition-colors text-primary placeholder:text-on-surface-variant/60"
              />
              <select
                value={quickTaskSubject}
                onChange={e => setQuickTaskSubject(e.target.value)}
                className="px-2.5 py-2 text-xs bg-surface-container-low border border-outline-variant/30 rounded-xl outline-none text-on-surface-variant font-medium cursor-pointer"
              >
                <option value="Core Subject">Core</option>
                <option value="Biology">Biology</option>
                <option value="Mathematics">Math</option>
                <option value="Physics">Physics</option>
                <option value="Computer Science">CS</option>
              </select>
              <button
                type="submit"
                className="px-3 py-2 bg-secondary text-white text-xs font-bold rounded-xl cursor-pointer hover:brightness-110 active:scale-95 transition-all"
              >
                Add
              </button>
            </form>

            {/* Tasks List */}
            <ul className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {tasks.map(task => (
                <li
                  key={task.id}
                  onClick={() => setActiveTaskId(task.id === activeTaskId ? null : task.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer card-hover-pro ${
                    task.completed
                      ? 'opacity-60 bg-surface-container-low/50 border-outline-variant/20'
                      : task.id === activeTaskId
                      ? 'border-secondary/60 bg-secondary/5 font-semibold shadow-2xs'
                      : 'bg-white/60 dark:bg-slate-900/60 border-outline-variant/30 hover:border-outline-variant/60'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onClick={e => e.stopPropagation()}
                    onChange={() => toggleTaskCompleted(task.id)}
                    className="w-4 h-4 rounded border-outline text-secondary focus:ring-secondary cursor-pointer"
                  />
                  <span className={`text-xs text-on-surface flex-1 truncate ${task.completed ? 'line-through text-on-surface-variant' : ''}`}>
                    {task.title}
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 bg-surface-variant text-on-surface-variant rounded-md">
                    {task.subject}
                  </span>
                  {task.id === activeTaskId && (
                    <span className="text-[10px] font-bold text-secondary bg-secondary/10 px-2 py-0.5 rounded-full animate-pulse">
                      Active
                    </span>
                  )}
                </li>
              ))}
              {tasks.length === 0 && (
                <div className="text-center text-xs text-on-surface-variant/60 py-8">
                  No active tasks. Add one above to kickstart your session!
                </div>
              )}
            </ul>
          </div>
        </div>

        {/* Distraction Shield & Daily Goal */}
        <div className="col-span-12 lg:col-span-5 flex flex-col gap-6">
          {/* Distraction Shield Card */}
          <div className="glass-panel rounded-2xl p-5 border border-outline-variant/30 relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-sm text-primary flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-secondary text-lg">security</span>
                  Distraction Interceptor
                </h3>
                <span className="text-xs font-bold text-secondary bg-secondary/10 px-2.5 py-0.5 rounded-full border border-secondary/20">
                  {distractionsBlockedThisSession} Intercepted
                </span>
              </div>
              <p className="text-[11px] text-on-surface-variant mb-3">
                Silently prevents tab switching to social media and distracting sites during Study Mode.
              </p>

              {/* Shield History Log */}
              <div className="space-y-1.5 max-h-24 overflow-y-auto mb-3 pr-1">
                {shieldAlerts.map((alert, i) => (
                  <div key={i} className="flex justify-between items-center text-xs p-2 rounded-lg bg-surface-container-low/70 border border-outline-variant/20">
                    <span className="flex items-center gap-1.5 truncate">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                      Blocked <strong className="text-primary truncate">{alert.site}</strong>
                    </span>
                    <span className="text-[10px] text-outline font-mono">{alert.time}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Simulator Form */}
            <form onSubmit={testShield} className="flex gap-2">
              <input
                type="text"
                value={simSite}
                onChange={e => setSimSite(e.target.value)}
                placeholder="Test domain: e.g. instagram.com"
                className="flex-1 px-3 py-1.5 border border-outline-variant/40 rounded-xl text-xs outline-none bg-surface/40 text-primary"
              />
              <button
                type="submit"
                className="px-3.5 py-1.5 bg-primary text-white rounded-xl text-xs font-bold cursor-pointer hover:bg-primary/90 transition-colors"
              >
                Test Shield
              </button>
            </form>
          </div>

          {/* Daily Goal Gauge */}
          <div className="glass-panel rounded-2xl p-5 border border-outline-variant/30 flex flex-col justify-between">
            <div className="flex justify-between items-end mb-2">
              <div>
                <h3 className="font-bold text-sm text-primary">Daily Deep Work Target</h3>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  {totalMinutesToday}m of {dailyGoalMinutes}m completed
                </p>
              </div>
              <span className="font-bold text-xl text-secondary">{progressPercent}%</span>
            </div>
            
            <div className="w-full h-2.5 bg-surface-variant rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-gradient-to-r from-secondary to-emerald-400 rounded-full transition-all duration-700 relative"
                style={{ width: `${progressPercent}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
              </div>
            </div>
            <p className="text-[10px] text-on-surface-variant/70 text-right">
              {progressPercent >= 100 ? '🎉 Daily goal achieved!' : `${dailyGoalMinutes - totalMinutesToday} mins left to goal`}
            </p>
          </div>
        </div>
      </div>

      {/* Fullscreen Zen Mode Overlay */}
      <ZenModeModal
        isOpen={isZenModeOpen}
        onClose={() => setIsZenModeOpen(false)}
      />
    </div>
  );
}
