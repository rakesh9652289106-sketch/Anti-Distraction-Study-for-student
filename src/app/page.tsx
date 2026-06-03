'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';

export default function DashboardPage() {
  const {
    tasks,
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
    sessions,
    incrementDistractionShield,
    distractionsBlockedThisSession
  } = useApp();

  const [simSite, setSimSite] = useState('');
  const [shieldAlerts, setShieldAlerts] = useState<Array<{ site: string; time: string }>>([
    { site: 'instagram.com', time: '10 mins ago' }
  ]);

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
  
  // SVG dash offset calculation (circumference = 283)
  const dashOffset = 283 - progressFraction * 283;

  // Handle Distraction Shield Simulator
  const testShield = (e: React.FormEvent) => {
    e.preventDefault();
    if (!simSite) return;
    
    // Check if site is blocked
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

  return (
    <div className="flex flex-col items-center justify-center py-sm">
      {/* Center Pomodoro Timer Card */}
      <div className="relative w-80 h-80 flex items-center justify-center mb-xl">
        {/* Glowing Progress Ring */}
        <svg className="absolute inset-0 w-full h-full drop-shadow-[0_0_15px_rgba(0,108,73,0.2)]" viewBox="0 0 100 100">
          <circle
            className="text-slate-200 dark:text-slate-800"
            cx="50"
            cy="50"
            fill="none"
            r="45"
            stroke="currentColor"
            strokeWidth="2"
          ></circle>
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
          ></circle>
        </svg>

        {/* Center Clock Contents */}
        <div className="text-center z-10 bg-white/60 dark:bg-slate-950/60 backdrop-blur-md rounded-full w-56 h-56 flex flex-col items-center justify-center border border-outline-variant/20 shadow-sm ambient-glow">
          <span className={`font-bold text-label-sm uppercase tracking-widest mb-2 ${
            timerMode === 'work' ? 'text-secondary' : 'text-sky-500'
          }`}>
            {timerMode === 'work' ? 'Deep Work' : 'Break Time'}
          </span>
          <span className="font-bold text-headline-xl text-primary mb-1">
            {timerMinutes.toString().padStart(2, '0')}:{timerSeconds.toString().padStart(2, '0')}
          </span>
          <span className="font-semibold text-label-sm text-on-surface-variant flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full inline-block ${
              isTimerRunning ? 'bg-secondary animate-pulse' : 'bg-slate-400'
            }`}></span>
            {isTimerRunning ? 'Ticking' : 'Paused'}
          </span>
        </div>
      </div>

      {/* Play/Reset Timer controls */}
      <div className="flex gap-md mb-xl">
        <button
          onClick={isTimerRunning ? pauseTimer : startTimer}
          className="px-md py-sm bg-primary text-on-primary font-semibold rounded-lg flex items-center gap-xs cursor-pointer shadow hover:opacity-90 transition-all active:scale-95"
        >
          <span className="material-symbols-outlined">{isTimerRunning ? 'pause' : 'play_arrow'}</span>
          {isTimerRunning ? 'Pause' : 'Start Focus'}
        </button>
        <button
          onClick={resetTimer}
          className="px-md py-sm bg-surface-container-high border border-outline-variant/30 text-primary font-semibold rounded-lg flex items-center gap-xs cursor-pointer hover:bg-surface-variant transition-all active:scale-95"
        >
          <span className="material-symbols-outlined">restart_alt</span>
          Reset
        </button>
      </div>

      {/* Bento Grid Layout */}
      <div className="w-full grid grid-cols-12 gap-md">
        {/* Upcoming Tasks */}
        <div className="col-span-12 md:col-span-6 glass-panel rounded-xl p-md">
          <h3 className="font-bold text-headline-md text-primary mb-md flex items-center gap-sm">
            <span className="material-symbols-outlined text-outline">checklist</span>
            Upcoming Tasks
          </h3>
          <ul className="space-y-sm">
            {tasks.map(task => (
              <li
                key={task.id}
                onClick={() => setActiveTaskId(task.id === activeTaskId ? null : task.id)}
                className={`flex items-center gap-sm p-sm bg-surface-container-lowest rounded-lg border border-outline-variant/30 transition-all cursor-pointer hover:bg-surface-variant/20 ${
                  task.completed ? 'opacity-60' : ''
                } ${task.id === activeTaskId ? 'border-l-4 border-l-secondary bg-secondary/5 font-semibold' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={task.completed}
                  onClick={(e) => e.stopPropagation()}
                  onChange={() => toggleTaskCompleted(task.id)}
                  className="w-4 h-4 rounded border-outline text-primary focus:ring-primary-container cursor-pointer"
                />
                <span className={`font-medium text-body-md text-on-surface ${task.completed ? 'line-through' : ''}`}>
                  {task.title}
                </span>
                <span className="ml-auto text-xs px-2 py-0.5 bg-surface-variant text-on-surface-variant rounded-full">
                  {task.subject}
                </span>
              </li>
            ))}
            {tasks.length === 0 && (
              <div className="text-center text-label-sm text-on-surface-variant/50 py-md">
                No active study tasks. Add some in the Planner!
              </div>
            )}
          </ul>
        </div>

        {/* Distraction Shield & Daily Goal */}
        <div className="col-span-12 md:col-span-6 flex flex-col gap-md">
          {/* Distraction Shield */}
          <div className="glass-panel rounded-xl p-md border-l-4 border-l-primary relative overflow-hidden group">
            <div className="absolute right-0 top-0 w-32 h-32 bg-primary-container/5 rounded-full blur-xl transform translate-x-1/2 -translate-y-1/2"></div>
            
            <div className="flex justify-between items-start mb-sm">
              <h3 className="font-bold text-label-md text-primary flex items-center gap-xs">
                <span className="material-symbols-outlined text-[18px]">security</span>
                Distraction Shield Active
              </h3>
              <span className="text-label-sm text-on-surface-variant bg-surface-variant px-2 py-0.5 rounded-full font-medium">
                {distractionsBlockedThisSession} Blocked
              </span>
            </div>
            
            {/* Display Shield History */}
            <div className="space-y-xs max-h-24 overflow-y-auto mb-md">
              {shieldAlerts.map((alert, i) => (
                <div key={i} className="flex justify-between text-label-sm text-on-surface-variant">
                  <span>Blocked attempt to <strong>{alert.site}</strong></span>
                  <span className="text-[10px] opacity-60">{alert.time}</span>
                </div>
              ))}
            </div>

            {/* Shield Simulator form */}
            <form onSubmit={testShield} className="flex gap-xs">
              <input
                type="text"
                value={simSite}
                onChange={e => setSimSite(e.target.value)}
                placeholder="Simulate surfing: e.g. instagram.com"
                className="flex-1 px-sm py-1.5 border border-outline-variant/50 rounded-lg text-label-sm outline-none bg-surface/30"
              />
              <button
                type="submit"
                className="px-sm py-1.5 bg-slate-900 text-white rounded-lg text-label-sm cursor-pointer hover:bg-slate-800 transition-colors"
              >
                Surf
              </button>
            </form>
          </div>

          {/* Daily Goal */}
          <div className="glass-panel rounded-xl p-md flex-1 flex flex-col justify-center">
            <div className="flex justify-between items-end mb-sm">
              <div>
                <h3 className="font-bold text-label-md text-primary">Daily Goal: 4 Hours</h3>
                <p className="text-label-sm text-on-surface-variant font-medium">
                  {totalMinutesToday}m / {dailyGoalMinutes}m completed
                </p>
              </div>
              <span className="font-bold text-headline-md text-secondary">{progressPercent}%</span>
            </div>
            <div className="w-full h-2 bg-surface-variant rounded-full overflow-hidden">
              <div
                className="h-full bg-secondary rounded-full relative transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              >
                <div className="absolute top-0 right-0 bottom-0 left-0 bg-gradient-to-r from-transparent to-white/20"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
