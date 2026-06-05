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
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const [resMetrics, resInsights, resEvents] = await Promise.all([
        fetch('/api/admin/metrics'),
        fetch('/api/admin/ai-insights'),
        fetch('/api/admin/system-events')
      ]);

      if (resMetrics.ok) setMetrics(await resMetrics.json());
      if (resInsights.ok) setInsights(await resInsights.json());
      if (resEvents.ok) setEvents(await resEvents.json());
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
    <div className="space-y-6 text-slate-200 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="font-bold text-2xl text-white tracking-tight">Admin Master Console</h2>
          <p className="text-xs text-slate-400 mt-1">Unified monitoring and configuration dashboard hub.</p>
        </div>

        <div className="flex items-center gap-2 bg-[#0d1627] border border-[#16233c] px-4 py-2 rounded-full">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-xs font-bold text-slate-300">Uptime Metric: {systemStats.uptimePercent}%</span>
        </div>
      </div>

      {/* Grid: 4 Core Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Total Students */}
        <div className="bg-[#0a101d] border border-[#15233c] rounded-2xl p-5 relative overflow-hidden group">
          <span className="material-symbols-outlined absolute right-4 top-4 text-slate-700/30 text-5xl">groups</span>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Students</p>
          <h3 className="text-2xl font-bold text-white mt-2">{systemStats.totalStudents.toLocaleString()}</h3>
          <span className="inline-flex items-center gap-0.5 text-xs font-bold text-emerald-400 mt-2">
            <span className="material-symbols-outlined text-xs">trending_up</span>
            +{systemStats.studentsGrowthTrend}%
          </span>
        </div>

        {/* Active Faculty */}
        <div className="bg-[#0a101d] border border-[#15233c] rounded-2xl p-5 relative overflow-hidden group">
          <span className="material-symbols-outlined absolute right-4 top-4 text-slate-700/30 text-5xl">school</span>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Faculty</p>
          <h3 className="text-2xl font-bold text-white mt-2">{systemStats.activeFaculty}</h3>
          <span className="inline-flex items-center gap-0.5 text-xs font-bold text-slate-400 mt-2">
            Stable
          </span>
        </div>

        {/* Active Licenses */}
        <div className="bg-[#0a101d] border border-[#15233c] rounded-2xl p-5 relative overflow-hidden group">
          <span className="material-symbols-outlined absolute right-4 top-4 text-slate-700/30 text-5xl">card_membership</span>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Licenses</p>
          <h3 className="text-2xl font-bold text-white mt-2">{systemStats.activeLicenses.toLocaleString()}</h3>
          <span className="inline-flex items-center gap-0.5 text-xs font-bold text-emerald-400 mt-2">
            <span className="material-symbols-outlined text-xs">trending_up</span>
            +{systemStats.licensesGrowthTrend}%
          </span>
        </div>

        {/* Server Storage */}
        <div className="bg-[#0a101d] border border-[#15233c] rounded-2xl p-5 relative overflow-hidden group">
          <span className="material-symbols-outlined absolute right-4 top-4 text-slate-700/30 text-5xl">database</span>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Server Storage</p>
          <h3 className="text-2xl font-bold text-white mt-2">{systemStats.storageUsagePercent}%</h3>
          <div className="w-full bg-[#16233c] h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-emerald-500 h-full" style={{ width: `${systemStats.storageUsagePercent}%` }}></div>
          </div>
        </div>
      </div>

      {/* Bento Zone Grid */}
      <div className="grid grid-cols-12 gap-6">
        
        {/* Student and Faculty zones summary (8 columns) */}
        <div className="col-span-12 lg:col-span-8 bg-[#0a101d] border border-[#15233c] rounded-2xl p-6 space-y-6">
          <h3 className="font-bold text-lg text-white border-b border-[#16233c] pb-3">Sub-Zones Telemetry</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Student Zone */}
            <div className="bg-[#0d1527] border border-[#1e2e4e]/40 p-4 rounded-xl">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Student Zone</h4>
              <div className="mt-3 space-y-1">
                <p className="text-sm font-semibold text-white">Online Now: {zonesSummary.studentZone.onlineNow}</p>
                <p className="text-xs text-slate-450">Pending: {zonesSummary.studentZone.pendingRegistration}</p>
              </div>
            </div>

            {/* Teacher Zone */}
            <div className="bg-[#0d1527] border border-[#1e2e4e]/40 p-4 rounded-xl">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Teacher Zone</h4>
              <div className="mt-3 space-y-1">
                <p className="text-sm font-semibold text-white">Active Classes: {zonesSummary.teacherZone.activeCourses}</p>
                <p className="text-xs text-slate-450">Flagged Files: {zonesSummary.teacherZone.flaggedResources}</p>
              </div>
            </div>

            {/* Infrastructure Zone */}
            <div className="bg-[#0d1527] border border-[#1e2e4e]/40 p-4 rounded-xl">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Infra Node</h4>
              <div className="mt-3 space-y-1">
                <p className="text-sm font-semibold text-white">Latency: {zonesSummary.infraZone.latencyMs}ms</p>
                <p className="text-xs text-emerald-400 font-bold">API Status: {zonesSummary.infraZone.apiLoadStatus}</p>
              </div>
            </div>
          </div>

          {/* Quick command buttons */}
          <div className="pt-4 border-t border-[#16233c] flex flex-wrap gap-4">
            <button
              onClick={generateSystemReport}
              className="px-4 py-2.5 bg-slate-900 border border-slate-800 hover:bg-[#131d33] text-white font-bold text-xs rounded-lg cursor-pointer"
            >
              Generate Report
            </button>
            <button
              onClick={triggerSafeMode}
              className={`px-4 py-2.5 font-bold text-xs rounded-lg cursor-pointer transition-all border ${
                safeModeActive
                  ? 'bg-red-650 text-white border-red-500 hover:bg-red-700 animate-pulse'
                  : 'bg-[#131d33] border-[#1e2e4e]/60 text-red-400 hover:bg-[#1e2e4e]/40'
              }`}
            >
              {safeModeActive ? '🔴 SAFE MODE ENGAGED (Halt System)' : 'Lock Student Shells'}
            </button>
          </div>
        </div>

        {/* AI Diagnostics (4 columns) */}
        <div className="col-span-12 lg:col-span-4 bg-[#0a101d] border border-[#15233c] rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-lg text-white border-b border-[#16233c] pb-3">AI Diagnostic Insights</h3>
            <div className="mt-4 space-y-3">
              {insights.map(item => (
                <div
                  key={item.id}
                  className={`p-3 rounded-lg border text-xs leading-relaxed ${
                    item.severity === 'error'
                      ? 'bg-red-950/20 border-red-900/40 text-red-400'
                      : item.severity === 'warning'
                      ? 'bg-amber-950/20 border-amber-900/40 text-amber-400'
                      : item.severity === 'success'
                      ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-400'
                      : 'bg-slate-900 border-slate-800 text-slate-300'
                  }`}
                >
                  {item.text}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Global System Events Logs (12 columns) */}
        <div className="col-span-12 bg-[#0a101d] border border-[#15233c] rounded-2xl p-6">
          <h3 className="font-bold text-lg text-white border-b border-[#16233c] pb-3 mb-4">Global System Events Log</h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#16233c] text-slate-400 uppercase font-bold tracking-wider">
                  <th className="pb-3">Timestamp</th>
                  <th className="pb-3">Module</th>
                  <th className="pb-3">Event Type</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Target / Affected UID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#16233c]/40">
                {events.map((ev, i) => (
                  <tr key={i} className="text-slate-300 hover:bg-[#131d33]/20">
                    <td className="py-3 font-mono text-slate-400">{new Date(ev.timestamp).toLocaleString()}</td>
                    <td className="py-3 font-semibold">{ev.module}</td>
                    <td className="py-3">{ev.eventType}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        ev.status === 'CRITICAL' ? 'bg-red-950/40 text-red-400 border border-red-900/50' : 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/50'
                      }`}>
                        {ev.status}
                      </span>
                    </td>
                    <td className="py-3 font-mono text-slate-400">{ev.affectedUid}</td>
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
