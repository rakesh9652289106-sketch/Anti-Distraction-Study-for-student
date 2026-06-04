'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';

export default function AnalyticsPage() {
  const { sessions, settings } = useApp();

  // Aggregate stats from sessions list
  const totalMinutes = sessions.reduce((sum, s) => sum + s.durationMinutes, 0);
  const formattedHours = Math.floor(totalMinutes / 60);
  const formattedMins = totalMinutes % 60;

  const avgFocusScore = sessions.length > 0 
    ? Math.round(sessions.reduce((sum, s) => sum + s.focusScore, 0) / sessions.length)
    : 90;

  const totalDistractions = sessions.reduce((sum, s) => sum + s.distractionsBlocked, 0);

  // Focus trends: last 7 days mockup utilizing actual sessions where possible
  const mockDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const mockFocusTimes = [50, 80, 120, 60, 95, 150, 110]; // in minutes

  // Calculate XP based on focus minutes (10 XP per focus minute)
  const totalXP = totalMinutes * 10;
  const currentLevel = Math.floor(totalXP / 1000) + 1;
  const nextLevelXP = 1000;
  const currentLevelXP = totalXP % 1000;
  const xpPercent = Math.min(100, Math.round((currentLevelXP / nextLevelXP) * 100));

  return (
    <div className="space-y-lg">
      {/* Header */}
      <div className="mb-lg">
        <h2 className="font-bold text-headline-lg text-primary">Analytics Overview</h2>
        <p className="text-body-md text-on-surface-variant font-medium">
          Deep dive into your cognitive performance and study habits.
        </p>
      </div>

      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md">
        
        {/* Total Study Time */}
        <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-md shadow-[0px_4px_20px_rgba(30,41,59,0.02)] hover:shadow-[0px_4px_20px_rgba(30,41,59,0.05)] transition-shadow duration-300">
          <div className="flex justify-between items-start mb-sm">
            <p className="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider">Total Study Time</p>
            <span className="material-symbols-outlined text-secondary">timer</span>
          </div>
          <h3 className="font-bold text-headline-md text-primary">
            {formattedHours}h {formattedMins}m
          </h3>
          <p className="text-label-sm text-secondary mt-xs flex items-center gap-xs font-semibold">
            <span className="material-symbols-outlined text-[16px]">trending_up</span>
            +12% vs last week
          </p>
        </div>

        {/* Avg Focus Score */}
        <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-md shadow-[0px_4px_20px_rgba(30,41,59,0.02)] hover:shadow-[0px_4px_20px_rgba(30,41,59,0.05)] transition-shadow duration-300">
          <div className="flex justify-between items-start mb-sm">
            <p className="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider">Avg Focus Score</p>
            <span className="material-symbols-outlined text-secondary">psychology</span>
          </div>
          <h3 className="font-bold text-headline-md text-primary">{avgFocusScore}/100</h3>
          <p className="text-label-sm text-secondary mt-xs flex items-center gap-xs font-semibold">
            <span className="material-symbols-outlined text-[16px]">trending_up</span>
            +5 pts vs last week
          </p>
        </div>

        {/* Current Streak */}
        <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-md shadow-[0px_4px_20px_rgba(30,41,59,0.02)] hover:shadow-[0px_4px_20px_rgba(30,41,59,0.05)] transition-shadow duration-300">
          <div className="flex justify-between items-start mb-sm">
            <p className="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider">Current Streak</p>
            <span className="material-symbols-outlined text-amber-600" style={{ fontVariationSettings: "'FILL' 1" }}>
              local_fire_department
            </span>
          </div>
          <h3 className="font-bold text-headline-md text-primary">{settings.currentStreak} Days</h3>
          <p className="text-label-sm text-on-surface-variant mt-xs font-semibold">
            Keep it up!
          </p>
        </div>

        {/* XP Earned */}
        <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-md shadow-[0px_4px_20px_rgba(30,41,59,0.02)] hover:shadow-[0px_4px_20px_rgba(30,41,59,0.05)] transition-shadow duration-300 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-tertiary-container/5 to-transparent pointer-events-none group-hover:from-tertiary-container/10 transition-colors duration-500"></div>
          <div className="flex justify-between items-start mb-sm relative z-10">
            <p className="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider">Total Experience (XP)</p>
            <span className="material-symbols-outlined text-tertiary-container">diamond</span>
          </div>
          <h3 className="font-bold text-headline-md text-primary relative z-10">{totalXP.toLocaleString()} XP</h3>
          <div className="w-full bg-surface-container-highest rounded-full h-1.5 mt-sm relative z-10">
            <div className="bg-primary h-1.5 rounded-full" style={{ width: `${xpPercent}%` }}></div>
          </div>
          <p className="text-label-sm text-on-surface-variant mt-xs relative z-10 font-semibold">
            Level {currentLevel} ({xpPercent}%)
          </p>
        </div>
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-md">
        
        {/* Focus Trends Bar Graph (2 columns) */}
        <div className="lg:col-span-2 bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-md shadow-[0px_4px_20px_rgba(30,41,59,0.02)]">
          <h3 className="text-label-md text-primary font-bold mb-md">Focus Trends (Last 7 Days)</h3>
          
          <div className="h-64 w-full relative flex items-end justify-between pt-md">
            {/* Grid Lines */}
            <div className="absolute inset-0 flex flex-col justify-between border-b border-l border-outline-variant/20 pb-6 pl-2">
              <div className="border-t border-outline-variant/10 w-full"></div>
              <div className="border-t border-outline-variant/10 w-full"></div>
              <div className="border-t border-outline-variant/10 w-full"></div>
              <div className="border-t border-outline-variant/10 w-full"></div>
            </div>

            {/* SVG columns representing daily focus times */}
            <div className="relative z-10 w-full h-full flex items-end justify-around pb-6 pl-2">
              {mockFocusTimes.map((min, idx) => {
                // max is 180 min
                const heightPercent = Math.min(100, Math.round((min / 180) * 100));
                return (
                  <div
                    key={idx}
                    className="w-8 rounded-t-lg bg-secondary/20 hover:bg-secondary cursor-pointer transition-all relative group flex flex-col items-center justify-end"
                    style={{ height: `${heightPercent}%` }}
                  >
                    <span className="absolute -top-8 bg-slate-900 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity shadow pointer-events-none whitespace-nowrap">
                      {min} mins
                    </span>
                  </div>
                );
              })}
            </div>
            
            {/* X Axis Labels */}
            <div className="absolute bottom-0 w-full flex justify-around pl-2 text-[10px] text-on-surface-variant font-bold">
              {mockDays.map(day => (
                <span key={day}>{day}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Time Distribution Doughnut (1 column) */}
        <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-md shadow-[0px_4px_20px_rgba(30,41,59,0.02)] flex flex-col">
          <h3 className="text-label-md text-primary font-bold mb-md">Subject Distribution</h3>
          
          <div className="flex-1 flex items-center justify-center relative min-h-[160px]">
            {/* SVG Circular Ring */}
            <svg className="w-36 h-36" viewBox="0 0 36 36">
              {/* Computer Science (45%) */}
              <circle
                className="text-primary"
                cx="18"
                cy="18"
                r="15.915"
                fill="transparent"
                stroke="currentColor"
                strokeWidth="3"
                strokeDasharray="45 55"
                strokeDashoffset="25"
              ></circle>
              {/* Mathematics (35%) */}
              <circle
                className="text-secondary"
                cx="18"
                cy="18"
                r="15.915"
                fill="transparent"
                stroke="currentColor"
                strokeWidth="3"
                strokeDasharray="35 65"
                strokeDashoffset="-20"
              ></circle>
              {/* Physics (20%) */}
              <circle
                className="text-amber-500"
                cx="18"
                cy="18"
                r="15.915"
                fill="transparent"
                stroke="currentColor"
                strokeWidth="3"
                strokeDasharray="20 80"
                strokeDashoffset="-55"
              ></circle>
            </svg>
            <div className="absolute text-center">
              <span className="font-bold text-headline-md block text-primary">{formattedHours}h</span>
              <span className="text-label-sm text-on-surface-variant">Focus</span>
            </div>
          </div>

          <div className="mt-md space-y-xs">
            <div className="flex items-center justify-between text-sm font-medium">
              <div className="flex items-center gap-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
                <span className="text-on-surface">Computer Science</span>
              </div>
              <span className="font-bold">45%</span>
            </div>
            <div className="flex items-center justify-between text-sm font-medium">
              <div className="flex items-center gap-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-secondary"></span>
                <span className="text-on-surface">Mathematics</span>
              </div>
              <span className="font-bold">35%</span>
            </div>
            <div className="flex items-center justify-between text-sm font-medium">
              <div className="flex items-center gap-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span className="text-on-surface">Physics</span>
              </div>
              <span className="font-bold">20%</span>
            </div>
          </div>
        </div>

        {/* Distraction Heatmap (2 columns) */}
        <div className="lg:col-span-2 bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-md shadow-[0px_4px_20px_rgba(30,41,59,0.02)]">
          <div className="flex justify-between items-center mb-md">
            <h3 className="text-label-md text-primary font-bold">Distraction Heatmap</h3>
            <span className="text-label-sm text-on-surface-variant font-semibold">Avg per time of day</span>
          </div>
          
          <div className="grid grid-cols-12 gap-1.5 h-32">
            <div className="bg-slate-200 dark:bg-slate-800 rounded col-span-2 hover:bg-amber-500/20 cursor-pointer" title="Morning (Low)"></div>
            <div className="bg-amber-500/20 rounded col-span-2 hover:bg-amber-500/40 cursor-pointer" title="Mid-Morning (Med)"></div>
            <div className="bg-amber-500/60 rounded col-span-4 hover:bg-amber-500/80 cursor-pointer animate-pulse" title="Afternoon (High)"></div>
            <div className="bg-amber-500/30 rounded col-span-2 hover:bg-amber-500/50 cursor-pointer" title="Evening (Med-High)"></div>
            <div className="bg-slate-200 dark:bg-slate-800 rounded col-span-2 hover:bg-amber-500/20 cursor-pointer" title="Night (Low)"></div>
          </div>
          
          <div className="flex justify-between mt-sm text-label-sm text-on-surface-variant font-semibold">
            <span>6 AM</span>
            <span>12 PM</span>
            <span>6 PM</span>
            <span>12 AM</span>
          </div>
        </div>

        {/* Top Distractions List (1 column) */}
        <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-md shadow-[0px_4px_20px_rgba(30,41,59,0.02)]">
          <h3 className="text-label-md text-primary font-bold mb-md">Top Intercepted Sites</h3>
          <ul className="space-y-md">
            <li className="flex items-center justify-between group">
              <div className="flex items-center gap-sm">
                <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 flex items-center justify-center font-bold">
                  YT
                </div>
                <div>
                  <p className="text-label-md font-bold text-on-surface">YouTube</p>
                  <p className="text-label-sm font-semibold text-amber-600 flex items-center gap-[2px]">
                    <span className="material-symbols-outlined text-[12px] font-bold">warning</span>
                    {totalDistractions + 12} blocked attempts
                  </p>
                </div>
              </div>
            </li>
            
            <li className="flex items-center justify-between group">
              <div className="flex items-center gap-sm">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center font-bold">
                  IG
                </div>
                <div>
                  <p className="text-label-md font-bold text-on-surface">Instagram</p>
                  <p className="text-label-sm font-semibold text-amber-600 flex items-center gap-[2px]">
                    <span className="material-symbols-outlined text-[12px] font-bold">warning</span>
                    {totalDistractions + 8} blocked attempts
                  </p>
                </div>
              </div>
            </li>

            <li className="flex items-center justify-between group">
              <div className="flex items-center gap-sm">
                <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/30 text-teal-600 flex items-center justify-center font-bold">
                  TK
                </div>
                <div>
                  <p className="text-label-md font-bold text-on-surface">TikTok</p>
                  <p className="text-label-sm font-semibold text-on-surface-variant">
                    3 blocked attempts
                  </p>
                </div>
              </div>
            </li>
          </ul>
        </div>

      </div>
    </div>
  );
}
