'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { AdminAlert } from '@/lib/db';

export default function AdminPulsePage() {
  const { sessions } = useApp();
  const [timeUtc, setTimeUtc] = useState('');
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);

  const fetchAlerts = async () => {
    try {
      const res = await fetch('/api/admin/alerts');
      if (res.ok) {
        const data = await res.json();
        setAlerts(data);
      }
    } catch {
      console.error('Failed to fetch alerts');
    }
  };

  useEffect(() => {
    const updateTime = () => {
      setTimeUtc(new Date().toISOString().substring(11, 19) + ' UTC');
    };
    updateTime();
    const timeInterval = setInterval(updateTime, 1000);
    
    fetchAlerts();
    const alertsInterval = setInterval(fetchAlerts, 3000);
    
    return () => {
      clearInterval(timeInterval);
      clearInterval(alertsInterval);
    };
  }, []);

  // Aggregate stats
  const totalActiveSessions = sessions.length + 4210; // add mock offset
  const activeFocusLocks = 1842;
  const networkBlocksPerHour = 84;

  // focus hours graph coords
  const dataPoint1 = [120, 100, 80, 70, 60, 50, 90, 150, 250, 320, 400, 450, 430, 400, 380, 420, 480, 520, 500, 450, 380, 300, 200, 150];
  const maxVal = Math.max(...dataPoint1);
  const minVal = Math.min(...dataPoint1);
  const range = maxVal - minVal;

  // Generate SVG path points
  const width = 600;
  const height = 200;
  const points = dataPoint1.map((val, idx) => {
    const x = (idx / (dataPoint1.length - 1)) * width;
    const y = height - ((val - minVal) / range) * (height - 40) - 20;
    return `${x},${y}`;
  }).join(' ');

  const areaPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <div className="space-y-lg">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-md pt-sm">
        <div>
          <h2 className="font-bold text-headline-lg text-primary">System Pulse</h2>
          <p className="text-body-md text-on-surface-variant font-medium">
            Real-time infrastructure and user engagement monitoring.
          </p>
        </div>
        
        <div className="flex items-center gap-2 text-on-surface-variant bg-slate-50 border border-outline-variant/35 px-4 py-2 rounded-full">
          <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-pulse"></span>
          <span className="text-label-sm font-bold">Live Updates Active</span>
          <span className="mx-2 text-slate-300">|</span>
          <span className="text-label-sm font-mono font-bold text-primary">{timeUtc || '12:00:00 UTC'}</span>
        </div>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-12 gap-6">
        
        {/* Row 1: 3 Metrics Cards */}
        <div className="col-span-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Global Focus Score */}
          <div className="glass-panel rounded-xl p-md flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-primary">
              <span className="material-symbols-outlined text-[64px]">psychology</span>
            </div>
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-label-sm font-bold text-on-surface-variant uppercase tracking-wider">
                Global Focus Score
              </h3>
              <span className="flex items-center gap-0.5 text-secondary bg-secondary/10 px-2 py-0.5 rounded text-xs font-bold">
                <span className="material-symbols-outlined text-sm font-bold">trending_up</span>
                +2.4%
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-bold text-headline-xl text-primary">78%</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-4 overflow-hidden">
              <div className="bg-primary h-full rounded-full" style={{ width: '78%' }}></div>
            </div>
          </div>

          {/* Active Sessions */}
          <div className="glass-panel rounded-xl p-md flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-primary">
              <span className="material-symbols-outlined text-[64px]">laptop_mac</span>
            </div>
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-label-sm font-bold text-on-surface-variant uppercase tracking-wider">
                Active Study Sessions
              </h3>
              <span className="flex items-center gap-0.5 text-secondary bg-secondary/10 px-2 py-0.5 rounded text-xs font-bold">
                <span className="material-symbols-outlined text-sm font-bold">trending_up</span>
                +12%
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-bold text-headline-xl text-primary">{totalActiveSessions.toLocaleString()}</span>
            </div>
            <p className="text-label-sm text-on-surface-variant/80 mt-4 font-semibold">
              Peak hours approaching in 45 mins
            </p>
          </div>

          {/* AI availability */}
          <div className="glass-panel rounded-xl p-md flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-primary">
              <span className="material-symbols-outlined text-[64px]">memory</span>
            </div>
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-label-sm font-bold text-on-surface-variant uppercase tracking-wider">
                AI Assistant Uptime
              </h3>
              <span className="text-label-sm text-on-surface-variant bg-slate-100 px-2 py-0.5 rounded font-bold">
                30 Days
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-bold text-headline-xl text-secondary">99.9%</span>
            </div>
            <p className="text-label-sm text-secondary mt-4 font-bold flex items-center gap-1">
              <span className="material-symbols-outlined text-sm font-bold">check_circle</span>
              All systems nominal
            </p>
          </div>
        </div>

        {/* Focus Hours Trend Chart (8 columns) */}
        <div className="col-span-12 lg:col-span-8 glass-panel rounded-xl p-md">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-bold text-headline-md text-primary">Global Focus Hours</h3>
              <p className="text-body-md text-on-surface-variant font-medium">Platform-wide productivity trend (Past 24h)</p>
            </div>
          </div>
          
          <div className="h-64 w-full relative pt-md pr-sm">
            {/* SVG Line Graph */}
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
              {/* Grid lines */}
              <line x1="0" y1="20" x2={width} y2="20" stroke="#eceef0" strokeDasharray="5 5" />
              <line x1="0" y1="60" x2={width} y2="60" stroke="#eceef0" strokeDasharray="5 5" />
              <line x1="0" y1="100" x2={width} y2="100" stroke="#eceef0" strokeDasharray="5 5" />
              <line x1="0" y1="140" x2={width} y2="140" stroke="#eceef0" strokeDasharray="5 5" />
              <line x1="0" y1="180" x2={width} y2="180" stroke="#eceef0" strokeDasharray="5 5" />

              {/* Area fill */}
              <polygon points={areaPoints} fill="rgba(9, 20, 38, 0.05)" />

              {/* Line path */}
              <polyline points={points} fill="none" stroke="#091426" strokeWidth="2.5" />
              
              {/* Scatter points */}
              {dataPoint1.map((val, idx) => {
                const x = (idx / (dataPoint1.length - 1)) * width;
                const y = height - ((val - minVal) / range) * (height - 40) - 20;
                return (
                  <circle
                    key={idx}
                    cx={x}
                    cy={y}
                    r="3"
                    fill="#091426"
                    className="hover:r-5 cursor-pointer transition-all"
                  />
                );
              })}
            </svg>
            <div className="flex justify-between text-[9px] text-slate-400 font-bold mt-1 uppercase">
              <span>12 AM</span>
              <span>6 AM</span>
              <span>12 PM</span>
              <span>6 PM</span>
              <span>11 PM</span>
            </div>
          </div>
        </div>

        {/* User Breakdown overview (4 columns) */}
        <div className="col-span-12 lg:col-span-4 glass-panel rounded-xl p-md flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-headline-md text-primary">User Breakdown</h3>
            <p className="text-label-sm text-on-surface-variant font-medium mb-md">Active user logs</p>
            
            <div className="grid grid-cols-2 gap-sm mb-md">
              <div className="bg-slate-50 border border-outline-variant/30 p-sm rounded-lg">
                <span className="text-[10px] text-on-surface-variant font-bold block uppercase">Total Active</span>
                <span className="text-xl font-bold text-primary">124.5k</span>
              </div>
              <div className="bg-slate-50 border border-outline-variant/30 p-sm rounded-lg">
                <span className="text-[10px] text-on-surface-variant font-bold block uppercase">New Today</span>
                <span className="text-xl font-bold text-primary">+1,240</span>
              </div>
            </div>
          </div>

          <div className="space-y-sm">
            <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
              Focus mode distribution
            </h4>
            
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                <span>Pomodoro Mode</span>
                <span>45%</span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div className="h-full bg-primary" style={{ width: '45%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                <span>Deep Work Focus</span>
                <span>35%</span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div className="h-full bg-tertiary-container" style={{ width: '35%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                <span>Exam Prep Blocks</span>
                <span>20%</span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div className="h-full bg-secondary" style={{ width: '20%' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Infrastructure (4 columns) */}
        <div className="col-span-12 md:col-span-6 lg:col-span-4 glass-panel rounded-xl p-md">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-headline-md text-primary">AI Infrastructure</h3>
            <span className="material-symbols-outlined text-slate-400">smart_toy</span>
          </div>

          <div className="space-y-md">
            <div className="bg-slate-50 border border-outline-variant/30 rounded-lg p-sm">
              <p className="text-[10px] text-on-surface-variant font-bold uppercase mb-1">Avg AI Response Speed</p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-primary">1.2</span>
                <span className="text-xs text-on-surface-variant font-semibold">seconds</span>
              </div>
            </div>

            <div className="space-y-xs">
              <h4 className="text-xs font-bold text-on-surface-variant uppercase flex items-center gap-1">
                <span className="material-symbols-outlined text-sm text-error">warning</span>
                Burnout Alerts
              </h4>
              <div className="flex items-center gap-sm">
                <div className="w-12 h-12 rounded-full border-2 border-red-200 flex items-center justify-center font-bold text-red-600 text-lg">
                  42
                </div>
                <div className="flex-1">
                  <p className="text-[10px] text-on-surface-variant font-semibold">Flagged in past hour</p>
                  <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                    <div className="bg-red-500 h-full" style={{ width: '15%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Security and Focus lock (4 columns) */}
        <div className="col-span-12 md:col-span-6 lg:col-span-4 glass-panel rounded-xl p-md">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-headline-md text-primary">Security & Lock</h3>
            <span className="material-symbols-outlined text-slate-400">lock</span>
          </div>

          <div className="grid grid-cols-2 gap-sm mb-md">
            <div className="bg-slate-50 border border-outline-variant/30 p-sm rounded-lg text-center">
              <span className="material-symbols-outlined text-primary mb-1 text-lg">lock_clock</span>
              <p className="text-lg font-bold text-primary">{activeFocusLocks.toLocaleString()}</p>
              <p className="text-[9px] text-on-surface-variant font-bold uppercase">Active Locks</p>
            </div>
            
            <div className="bg-red-50 border border-red-200 p-sm rounded-lg text-center">
              <span className="material-symbols-outlined text-error mb-1 text-lg">block</span>
              <p className="text-lg font-bold text-error">{networkBlocksPerHour}</p>
              <p className="text-[9px] text-on-surface-variant font-bold uppercase">Shield Blocks/hr</p>
            </div>
          </div>

          <div className="space-y-xs">
            <h4 className="text-xs font-bold text-on-surface-variant uppercase">Top Blocked Categories</h4>
            <ul className="space-y-1.5 text-xs font-semibold text-slate-700">
              <li className="flex justify-between border-b border-slate-100 pb-1">
                <span>Social Media</span>
                <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">65%</span>
              </li>
              <li className="flex justify-between border-b border-slate-100 pb-1">
                <span>Video Streaming</span>
                <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">22%</span>
              </li>
              <li className="flex justify-between">
                <span>Gaming Sites</span>
                <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">13%</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Recent Operational Alerts (4 columns) */}
        <div className="col-span-12 md:col-span-6 lg:col-span-4 glass-panel rounded-xl p-md flex flex-col h-[400px]">
          <h3 className="font-bold text-headline-md text-primary mb-md">Recent Alerts</h3>
          
          <div className="space-y-sm flex-1 overflow-y-auto pr-xs">
            {alerts.slice(0, 5).map(alert => (
              <div key={alert.id} className="flex gap-sm items-start border-b border-outline-variant/10 pb-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                  alert.type === 'error' 
                    ? 'bg-red-50 text-red-600 border border-red-200' 
                    : alert.type === 'warning' 
                    ? 'bg-amber-50 text-amber-600 border border-amber-200' 
                    : 'bg-slate-50 text-primary border border-outline-variant/20'
                }`}>
                  <span className="material-symbols-outlined text-sm font-bold">
                    {alert.type === 'error' ? 'error' : alert.type === 'warning' ? 'warning' : 'info'}
                  </span>
                </div>
                <div className="text-xs flex-1">
                  <h4 className="font-bold text-slate-700">{alert.title}</h4>
                  <p className="text-on-surface-variant font-medium mt-0.5 leading-tight">{alert.text}</p>
                  <span className="text-[9px] text-slate-400 font-semibold block mt-1">{alert.time}</span>
                </div>
              </div>
            ))}
            {alerts.length === 0 && (
              <div className="text-center text-xs text-slate-400 py-10">
                No active system alerts.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
