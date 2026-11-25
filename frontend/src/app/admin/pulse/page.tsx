'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface MetricStats {
  systemStats: {
    uptimePercent: number;
    totalStudents: number;
    studentsGrowthTrend: number;
    activeFaculty: number;
    facultyGrowthTrend: number;
    activeLicenses: number;
    licensesGrowthTrend: number;
    storageUsagePercent: number;
  };
  zonesSummary: {
    studentZone: { onlineNow: number; pendingRegistration: number };
    teacherZone: { activeCourses: number; flaggedResources: number };
    infraZone: { latencyMs: number; apiLoadStatus: string };
  };
}

interface AiInsight {
  id: string;
  severity: 'info' | 'success' | 'warning' | 'error';
  text: string;
}

interface SystemEvent {
  timestamp: string;
  module: string;
  eventType: string;
  status: string;
  affectedUid: string;
}

export default function AdminPulsePage() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<MetricStats | null>(null);
  const [insights, setInsights] = useState<AiInsight[]>([]);
  const [events, setEvents] = useState<SystemEvent[]>([]);
  const [safeModeActive, setSafeModeActive] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const [resMetrics, resInsights, resEvents, resSettings] = await Promise.all([
        fetch('/api/admin/metrics'),
        fetch('/api/admin/ai-insights'),
        fetch('/api/admin/system-events'),
        fetch('/api/settings')
      ]);

      if (resMetrics.ok) setMetrics(await resMetrics.json());
      if (resInsights.ok) setInsights(await resInsights.json());
      if (resEvents.ok) setEvents(await resEvents.json());
      if (resSettings.ok) {
        const s = await resSettings.json();
        setCameraEnabled(s.cameraEnabled !== false);
      }
    } catch (err) {
      console.error('Failed to load admin metrics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 5000);
    return () => clearInterval(interval);
  }, []);

  const triggerSafeMode = async () => {
    const nextState = !safeModeActive;
    try {
      const res = await fetch('/api/admin/system/safe-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: nextState })
      });
      if (res.ok) {
        setSafeModeActive(nextState);
        alert(nextState ? '🚨 safe-mode-engaged: All client student shells locked down.' : 'Safe mode disengaged.');
      }
    } catch {
      alert('Failed to connect to security controller.');
    }
  };

  const generateSystemReport = async () => {
    try {
      const res = await fetch('/api/admin/reports/generate', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        alert(`Report Snapshot compiled! Fetch backup file at: ${data.downloadUrl}`);
        window.open(data.downloadUrl, '_blank');
      }
    } catch {
      alert('Report generation failed.');
    }
  };

  const toggleMasterCamera = async () => {
    const nextState = !cameraEnabled;
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cameraEnabled: nextState })
      });
      if (res.ok) {
        setCameraEnabled(nextState);
        alert(nextState ? 'Webcam monitoring restored system-wide for students.' : '🚨 Student webcams stopped and locked down system-wide.');
      }
    } catch {
      alert('Failed to update camera master switch.');
    }
  };

  if (isLoading || !metrics) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400 font-mono">
        <div className="w-8 h-8 rounded-full border-2 border-slate-800 border-t-emerald-450 animate-spin mb-4"></div>
        <p className="text-[10px] tracking-widest uppercase">Syncing Dashboard telemetry...</p>
      </div>
    );
  }

  const { systemStats, zonesSummary } = metrics;

  return (
    <div className="space-y-6 text-black font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="font-black text-3xl text-white tracking-tight drop-shadow-sm">Admin Master Console</h2>
          <p className="text-xs font-bold text-amber-200 mt-1">Unified monitoring and configuration dashboard hub.</p>
        </div>

        <div className="flex items-center gap-2 bg-[#FDF6ED] border-2 border-[#E2CEB9] px-4 py-2 rounded-full shadow-md text-black">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse"></span>
          <span className="text-xs font-black text-black">Uptime Metric: {systemStats.uptimePercent}%</span>
        </div>
      </div>

      {/* Grid: 4 Core Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Total Students */}
        <div className="bg-[#FDF6ED] border-2 border-[#E2CEB9] rounded-2xl p-5 relative overflow-hidden group shadow-lg text-black">
          <span className="material-symbols-outlined absolute right-4 top-4 text-slate-300/40 text-5xl">groups</span>
          <p className="text-[10px] font-black text-black uppercase tracking-widest">Total Students</p>
          <h3 className="text-3xl font-black text-black mt-2 font-mono">{systemStats.totalStudents.toLocaleString()}</h3>
          <span className="inline-flex items-center gap-0.5 text-xs font-bold text-emerald-800 mt-2">
            <span className="material-symbols-outlined text-xs">trending_up</span>
            +{systemStats.studentsGrowthTrend}%
          </span>
        </div>

        {/* Active Faculty */}
        <div className="bg-[#FDF6ED] border-2 border-[#E2CEB9] rounded-2xl p-5 relative overflow-hidden group shadow-lg text-black">
          <span className="material-symbols-outlined absolute right-4 top-4 text-slate-300/40 text-5xl">school</span>
          <p className="text-[10px] font-black text-black uppercase tracking-widest">Active Faculty</p>
          <h3 className="text-3xl font-black text-black mt-2 font-mono">{systemStats.activeFaculty}</h3>
          <span className="inline-flex items-center gap-0.5 text-xs font-bold text-slate-800 mt-2">
            Stable
          </span>
        </div>

        {/* Active Licenses */}
        <div className="bg-[#FDF6ED] border-2 border-[#E2CEB9] rounded-2xl p-5 relative overflow-hidden group shadow-lg text-black">
          <span className="material-symbols-outlined absolute right-4 top-4 text-slate-300/40 text-5xl">card_membership</span>
          <p className="text-[10px] font-black text-black uppercase tracking-widest">Active Licenses</p>
          <h3 className="text-3xl font-black text-black mt-2 font-mono">{systemStats.activeLicenses.toLocaleString()}</h3>
          <span className="inline-flex items-center gap-0.5 text-xs font-bold text-emerald-800 mt-2">
            <span className="material-symbols-outlined text-xs">trending_up</span>
            +{systemStats.licensesGrowthTrend}%
          </span>
        </div>

        {/* Server Storage */}
        <div className="bg-[#FDF6ED] border-2 border-[#E2CEB9] rounded-2xl p-5 relative overflow-hidden group shadow-lg text-black">
          <span className="material-symbols-outlined absolute right-4 top-4 text-slate-300/40 text-5xl">database</span>
          <p className="text-[10px] font-black text-black uppercase tracking-widest">Server Storage</p>
          <h3 className="text-3xl font-black text-black mt-2 font-mono">{systemStats.storageUsagePercent}%</h3>
          <div className="w-full bg-[#E2CEB9] h-2 rounded-full mt-3 overflow-hidden">
            <div className="bg-[#590907] h-full rounded-full" style={{ width: `${systemStats.storageUsagePercent}%` }}></div>
          </div>
        </div>
      </div>

      {/* Bento Zone Grid */}
      <div className="grid grid-cols-12 gap-6">
        
        {/* Student and Faculty zones summary (8 columns) */}
        <div className="col-span-12 lg:col-span-8 bg-[#FDF6ED] border-2 border-[#E2CEB9] rounded-2xl p-6 space-y-6 shadow-lg text-black">
          <h3 className="font-black text-lg text-black border-b border-[#E2CEB9] pb-3">Sub-Zones Telemetry</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Student Zone */}
            <div className="bg-[#F3E2CF] border border-[#D5BFA7] p-4 rounded-xl text-black">
              <h4 className="text-xs font-black text-black uppercase tracking-wider">Student Zone</h4>
              <div className="mt-3 space-y-1">
                <p className="text-sm font-black text-black">Online Now: {zonesSummary.studentZone.onlineNow}</p>
                <p className="text-xs font-bold text-slate-800">Pending: {zonesSummary.studentZone.pendingRegistration}</p>
              </div>
            </div>

            {/* Teacher Zone */}
            <div className="bg-[#F3E2CF] border border-[#D5BFA7] p-4 rounded-xl text-black">
              <h4 className="text-xs font-black text-black uppercase tracking-wider">Teacher Zone</h4>
              <div className="mt-3 space-y-1">
                <p className="text-sm font-black text-black">Active Classes: {zonesSummary.teacherZone.activeCourses}</p>
                <p className="text-xs font-bold text-slate-800">Flagged Files: {zonesSummary.teacherZone.flaggedResources}</p>
              </div>
            </div>

            {/* Infrastructure Zone */}
            <div className="bg-[#F3E2CF] border border-[#D5BFA7] p-4 rounded-xl text-black">
              <h4 className="text-xs font-black text-black uppercase tracking-wider">Infra Node</h4>
              <div className="mt-3 space-y-1">
                <p className="text-sm font-black text-black">Latency: {zonesSummary.infraZone.latencyMs}ms</p>
                <p className="text-xs font-black text-emerald-800">API Status: {zonesSummary.infraZone.apiLoadStatus}</p>
              </div>
            </div>
          </div>

          {/* Quick command buttons */}
          <div className="pt-4 border-t border-[#E2CEB9] flex flex-wrap gap-4">
            <button
              onClick={generateSystemReport}
              className="px-4 py-2.5 bg-[#590907] hover:bg-[#430605] text-white font-black text-xs rounded-lg cursor-pointer shadow-md"
            >
              Generate Report
            </button>
            <button
              onClick={triggerSafeMode}
              className={`px-4 py-2.5 font-black text-xs rounded-lg cursor-pointer transition-all border shadow-md ${
                safeModeActive
                  ? 'bg-red-700 text-white border-red-500 hover:bg-red-800 animate-pulse'
                  : 'bg-red-100 border-red-300 text-red-800 hover:bg-red-200'
              }`}
            >
              {safeModeActive ? '🔴 SAFE MODE ENGAGED (Halt System)' : 'Lock Student Shells'}
            </button>
            <button
              onClick={toggleMasterCamera}
              className={`px-4 py-2.5 font-black text-xs rounded-lg cursor-pointer transition-all border flex items-center gap-1.5 shadow-md ${
                cameraEnabled
                  ? 'bg-amber-100 border-amber-300 hover:bg-amber-200 text-amber-900'
                  : 'bg-emerald-100 border-emerald-300 hover:bg-emerald-200 text-emerald-900'
              }`}
            >
              <span className="material-symbols-outlined text-sm font-bold">
                {cameraEnabled ? 'videocam_off' : 'videocam'}
              </span>
              {cameraEnabled ? 'Stop Camera (All Students)' : 'Restore Camera Stream'}
            </button>
          </div>
        </div>

        {/* AI Diagnostics (4 columns) */}
        <div className="col-span-12 lg:col-span-4 bg-[#FDF6ED] border-2 border-[#E2CEB9] rounded-2xl p-6 flex flex-col justify-between shadow-lg text-black">
          <div>
            <h3 className="font-black text-lg text-black border-b border-[#E2CEB9] pb-3">AI Diagnostic Insights</h3>
            <div className="mt-4 space-y-3">
              {insights.map(item => (
                <div
                  key={item.id}
                  className={`p-3 rounded-lg border text-xs font-bold leading-relaxed ${
                    item.severity === 'error'
                      ? 'bg-red-100 border-red-300 text-red-900'
                      : item.severity === 'warning'
                      ? 'bg-amber-100 border-amber-300 text-amber-900'
                      : item.severity === 'success'
                      ? 'bg-emerald-100 border-emerald-300 text-emerald-900'
                      : 'bg-[#F3E2CF] border-[#D5BFA7] text-black'
                  }`}
                >
                  {item.text}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Global System Events Logs (12 columns) */}
        <div className="col-span-12 bg-[#FDF6ED] border-2 border-[#E2CEB9] rounded-2xl p-6 shadow-lg text-black">
          <h3 className="font-black text-lg text-black border-b border-[#E2CEB9] pb-3 mb-4">Global System Events Log</h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b-2 border-[#D5BFA7] text-black uppercase font-black tracking-wider">
                  <th className="pb-3">Timestamp</th>
                  <th className="pb-3">Module</th>
                  <th className="pb-3">Event Type</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Target / Affected UID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2CEB9]">
                {events.map((ev, i) => (
                  <tr key={i} className="text-black font-semibold hover:bg-[#F3E2CF]/50">
                    <td className="py-3 font-mono font-bold text-black">{new Date(ev.timestamp).toLocaleString()}</td>
                    <td className="py-3 font-black text-black">{ev.module}</td>
                    <td className="py-3 font-bold text-black">{ev.eventType}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                        ev.status === 'CRITICAL' ? 'bg-red-200 text-red-900 border border-red-400' : 'bg-emerald-200 text-emerald-900 border border-emerald-400'
                      }`}>
                        {ev.status}
                      </span>
                    </td>
                    <td className="py-3 font-mono font-bold text-black">{ev.affectedUid}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
