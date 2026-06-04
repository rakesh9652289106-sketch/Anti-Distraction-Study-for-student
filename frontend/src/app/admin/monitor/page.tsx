'use client';

import React, { useState, useEffect } from 'react';
import { AdminAlert } from '@/lib/db';

export default function AdminMonitorPage() {
  const [timeUtc, setTimeUtc] = useState('');
  const [activeAlerts, setActiveAlerts] = useState<AdminAlert[]>([]);
  const [streamLogs, setStreamLogs] = useState([
    { id: '1', type: 'start', title: 'Session Started', text: 'User usr_8x92 initiated 60m Deep Work phase.', time: 'Just now' },
    { id: '2', type: 'block', title: 'Distraction Blocked', text: 'AI intercepted access attempt to instagram.com for usr_2m41.', time: '12s ago' },
    { id: '3', type: 'ai', title: 'AI Intervention', text: 'Emotional engine detected frustration. Sent subtle encouragement prompt to usr_9p77.', time: '45s ago' },
    { id: '4', type: 'complete', title: 'Session Completed', text: 'User usr_1k22 successfully finished 120m study block.', time: '2m ago' }
  ]);

  const fetchAlerts = async () => {
    try {
      const res = await fetch('/api/admin/alerts');
      if (res.ok) {
        const data = await res.json();
        setActiveAlerts(data);
        
        // Merge real database alerts into the Live Activity Stream logs
        setStreamLogs(prev => {
          const nonAlertLogs = prev.filter(log => !log.id.startsWith('alert-'));
          const alertLogs = data.map((alert: AdminAlert) => ({
            id: alert.id,
            type: 'warning',
            title: alert.title,
            text: alert.text,
            time: alert.time || 'Just now'
          }));
          return [...alertLogs, ...nonAlertLogs].slice(0, 15);
        });
      }
    } catch {
      console.error('Failed to fetch alerts');
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const updateTime = () => {
      setTimeUtc(new Date().toISOString().substring(11, 19) + ' UTC');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Simulate incoming live logs
  useEffect(() => {
    const logInterval = setInterval(() => {
      const users = ['usr_4d21', 'usr_7v10', 'usr_3k90', 'usr_5p88'];
      const user = users[Math.floor(Math.random() * users.length)];
      const events = [
        { type: 'start', title: 'Session Started', text: `User ${user} initiated 25m Focus Block.` },
        { type: 'block', title: 'Distraction Intercepted', text: `Distraction shield blocked tik-tok.com for ${user}.` },
        { type: 'complete', title: 'Session Completed', text: `User ${user} finished study session successfully.` }
      ];
      const event = events[Math.floor(Math.random() * events.length)];
      
      setStreamLogs(prev => [
        { id: Math.random().toString(), type: event.type, title: event.title, text: event.text, time: 'Just now' },
        ...prev.slice(0, 5) // keep last 6 items
      ]);
    }, 8000);

    return () => clearInterval(logInterval);
  }, []);

  const handleExport = () => {
    alert('Infrastructure log exported as focusflow_infra_dump.json');
  };

  return (
    <div className="space-y-lg">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-sm">
        <div>
          <h2 className="font-bold text-headline-lg text-primary">System Pulse</h2>
          <p className="text-body-md text-on-surface-variant font-medium flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            All systems operational. Last updated: Just now.
          </p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-white text-primary border border-outline-variant/35 rounded-lg font-bold text-sm hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            Export Log
          </button>
          <button
            onClick={() => alert('Manually refreshed systems!')}
            className="px-4 py-2 bg-primary text-on-primary rounded-lg font-bold text-sm hover:opacity-90 transition-colors flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            Refresh ({timeUtc})
          </button>
        </div>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Row 1: Key Metrics */}
        <div className="md:col-span-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-outline-variant/35 rounded-xl p-5 shadow-sm">
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Active Sessions</span>
            <h3 className="font-bold text-headline-md text-primary mt-1">24,592</h3>
            <p className="text-xs text-emerald-600 font-semibold mt-2 flex items-center gap-0.5">
              <span className="material-symbols-outlined text-[14px] font-bold">trending_up</span>
              +12.5% vs last hour
            </p>
          </div>

          <div className="bg-white border border-outline-variant/35 rounded-xl p-5 shadow-sm">
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">AI Avg Latency</span>
            <h3 className="font-bold text-headline-md text-primary mt-1">124 ms</h3>
            <p className="text-xs text-emerald-600 font-semibold mt-2 flex items-center gap-0.5">
              <span className="material-symbols-outlined text-[14px] font-bold">trending_down</span>
              -5ms vs average
            </p>
          </div>

          <div className="bg-white border border-outline-variant/35 rounded-xl p-5 shadow-sm">
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Intercepts / hr</span>
            <h3 className="font-bold text-headline-md text-primary mt-1">89.2k</h3>
            <p className="text-xs text-emerald-600 font-semibold mt-2 flex items-center gap-0.5">
              <span className="material-symbols-outlined text-[14px] font-bold">trending_up</span>
              +8.1% today
            </p>
          </div>

          <div className="bg-white border border-outline-variant/35 rounded-xl p-5 shadow-sm">
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Infrastructure Alerts</span>
            <h3 className="font-bold text-headline-md text-red-600 mt-1">{activeAlerts.length}</h3>
            <p className="text-xs text-amber-600 font-semibold mt-2 flex items-center gap-0.5">
              <span className="material-symbols-outlined text-[14px] font-bold">info</span>
              Warnings require attention
            </p>
          </div>
        </div>

        {/* Server Cluster Health (8 columns) */}
        <div className="md:col-span-8 bg-white rounded-xl border border-outline-variant/35 shadow-sm flex flex-col h-[400px]">
          <div className="p-5 border-b border-outline-variant/20 flex justify-between items-center bg-slate-50">
            <div>
              <h3 className="font-bold text-headline-md text-primary">Server Cluster Health</h3>
              <p className="text-xs text-on-surface-variant font-medium">AI Nodes &amp; Database Latency (Last 6 Hours)</p>
            </div>
            <div className="flex gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary text-on-primary">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span> AI Nodes
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-200 text-slate-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> DB Cluster
              </span>
            </div>
          </div>
          
          <div className="flex-1 p-5 relative w-full h-full flex items-end justify-center bg-white">
            <div className="absolute inset-x-8 inset-y-8 flex items-end gap-3">
              {/* Draw simulated bars */}
              {[40, 55, 30, 48, 65, 50, 42, 85, 70, 52, 45, 75].map((val, idx) => (
                <div key={idx} className="flex-1 h-full relative flex items-end group">
                  <div
                    className="w-full bg-slate-900/10 rounded-t-sm relative border-t-2 border-slate-900 group-hover:bg-slate-900/20 transition-all cursor-pointer"
                    style={{ height: `${val}%` }}
                  />
                  <div
                    className="absolute bottom-0 w-full bg-emerald-500/20 rounded-t-sm border-t border-emerald-500"
                    style={{ height: `${val * 0.4}%` }}
                  />
                </div>
              ))}
            </div>

            {/* Grid background lines */}
            <div className="absolute inset-x-8 inset-y-8 flex flex-col justify-between pointer-events-none opacity-20 border-l border-b border-slate-300">
              <div className="w-full h-px bg-slate-400"></div>
              <div className="w-full h-px bg-slate-400"></div>
              <div className="w-full h-px bg-slate-400"></div>
              <div className="w-full h-px bg-slate-400"></div>
            </div>
          </div>
        </div>

        {/* Server Critical Alerts Feed (4 columns) */}
        <div className="md:col-span-4 bg-white rounded-xl border border-outline-variant/35 shadow-sm flex flex-col h-[400px]">
          <div className="p-5 border-b border-outline-variant/20 flex justify-between items-center bg-red-50/50">
            <h3 className="font-bold text-headline-md text-primary flex items-center gap-1.5">
              <span className="material-symbols-outlined text-red-600 font-bold text-lg">warning</span>
              System Alerts
            </h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {activeAlerts.map(alert => (
              <div
                key={alert.id}
                className={`p-3 rounded-lg border text-xs font-semibold leading-relaxed ${
                  alert.type === 'error'
                    ? 'bg-red-50/70 border-red-200/50 text-red-700'
                    : 'bg-slate-50 border-slate-100 text-slate-700'
                }`}
              >
                <div className="flex gap-2 items-start">
                  <span className="material-symbols-outlined text-sm font-bold mt-0.5">
                    {alert.type === 'error' ? 'error' : 'warning'}
                  </span>
                  <div>
                    <h4 className="font-bold">{alert.title}</h4>
                    <p className="text-on-surface-variant font-medium mt-1">{alert.text}</p>
                    <p className="text-[9px] text-slate-400 mt-2 font-mono">
                      {alert.time} &bull; {alert.region} &bull; {alert.source}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live User Activity Stream (5 columns) */}
        <div className="md:col-span-5 bg-white rounded-xl border border-outline-variant/35 shadow-sm flex flex-col h-[450px]">
          <div className="p-5 border-b border-outline-variant/20 flex justify-between items-center bg-slate-50">
            <h3 className="font-bold text-headline-md text-primary flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              Live Activity Stream
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto p-4 relative">
            <div className="absolute left-[33px] top-6 bottom-6 w-px bg-slate-200 z-0"></div>
            <div className="space-y-4 relative z-10">
              {streamLogs.map(log => (
                <div key={log.id} className="flex gap-4 items-start group">
                  <div className={`w-8 h-8 rounded-full border-2 border-white flex items-center justify-center shrink-0 shadow-sm transition-transform ${
                    log.type === 'start'
                      ? 'bg-emerald-100 text-emerald-600'
                      : log.type === 'block'
                      ? 'bg-red-100 text-red-600'
                      : log.type === 'warning'
                      ? 'bg-amber-100 text-amber-600 border border-amber-200'
                      : 'bg-indigo-100 text-indigo-600'
                  }`}>
                    <span className="material-symbols-outlined text-[16px] font-bold">
                      {log.type === 'start' 
                        ? 'play_arrow' 
                        : log.type === 'block' 
                        ? 'block' 
                        : log.type === 'warning' 
                        ? 'warning' 
                        : 'psychology'}
                    </span>
                  </div>
                  
                  <div className="flex-1 bg-slate-50 rounded-lg p-3 border border-outline-variant/30 hover:bg-slate-100/50 transition-colors">
                    <div className="flex justify-between items-start">
                      <p className="font-bold text-xs text-primary">{log.title}</p>
                      <span className="text-[10px] text-slate-400 font-semibold">{log.time}</span>
                    </div>
                    <p className="text-[11px] text-on-surface-variant font-semibold mt-1">{log.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Traffic map and AI Engine (7 columns) */}
        <div className="md:col-span-7 bg-white rounded-xl border border-outline-variant/35 shadow-sm flex flex-col h-[450px] overflow-hidden">
          <div className="p-5 border-b border-outline-variant/20 flex justify-between items-center bg-slate-50 shrink-0">
            <h3 className="font-bold text-headline-md text-primary">AI Engine & Traffic distribution</h3>
          </div>
          
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* AI stats */}
            <div className="w-full md:w-1/3 p-5 border-r border-slate-100 flex flex-col justify-between bg-slate-50/30 shrink-0">
              <div className="space-y-sm">
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                    <span>Prompt Prep</span>
                    <span className="text-secondary">85ms</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div className="h-full bg-secondary" style={{ width: '85%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                    <span>Context Fetch</span>
                    <span className="text-primary">110ms</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: '60%' }}></div>
                  </div>
                </div>
              </div>

              <div className="p-sm bg-white rounded-lg border border-slate-200 text-center shadow-sm mt-md">
                <span className="material-symbols-outlined text-primary text-3xl font-bold mb-1">memory</span>
                <h4 className="font-bold text-label-md text-primary">FocusGuard v2.4</h4>
                <span className="inline-block mt-2 px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded uppercase">
                  Active
                </span>
              </div>
            </div>

            {/* Regional Map Graphic */}
            <div className="flex-1 relative bg-primary flex items-center justify-center p-4">
              <div className="absolute inset-0 opacity-15" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1.5px, transparent 0)', backgroundSize: '16px 16px' }} />
              
              <div className="relative w-full max-w-[340px] aspect-video z-10">
                {/* Simulated pulsing dots for active load coordinates */}
                {/* US East */}
                <div className="absolute top-[35%] left-[20%] group cursor-pointer">
                  <span className="relative flex h-3.5 w-3.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border border-white"></span>
                  </span>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-0.5 bg-white text-slate-900 text-[9px] font-bold rounded shadow-lg pointer-events-none whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                    US-East: 8.4k Active
                  </div>
                </div>

                {/* Europe */}
                <div className="absolute top-[28%] right-[40%] group cursor-pointer">
                  <span className="relative flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border border-white"></span>
                  </span>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-0.5 bg-white text-slate-900 text-[9px] font-bold rounded shadow-lg pointer-events-none whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                    EU-Central: 12.1k Active
                  </div>
                </div>

                {/* Asia */}
                <div className="absolute top-[40%] right-[20%] group cursor-pointer">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500 border border-white"></span>
                  </span>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-0.5 bg-white text-slate-900 text-[9px] font-bold rounded shadow-lg pointer-events-none whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                    AP-East: 3.2k Active (Degraded)
                  </div>
                </div>
              </div>
              
              <div className="absolute bottom-3 right-3 bg-white/5 border border-white/10 rounded-lg p-2 text-white">
                <span className="text-[8px] uppercase font-bold tracking-wider opacity-80">
                  Global Load Distribution
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
