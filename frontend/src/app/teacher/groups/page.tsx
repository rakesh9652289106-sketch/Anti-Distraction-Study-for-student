'use client';

import React, { useState, useEffect } from 'react';
import { ClassroomGroup } from '@/lib/db';

interface SessionData {
  liveSession: {
    sessionId: string;
    focusScore: number;
    focusTrend: number;
    activeStudents: number;
    totalStudents: number;
    appsSummary: Record<string, number>;
    momentum: {
      timelineMinutes: number[];
      focusValues: number[];
      peakFocusPercent: number;
      dipTime: string;
    };
  };
  roster: Array<{
    studentId: string;
    name: string;
    avatar: string;
    activity: string;
    status: 'focusing' | 'distracted' | 'away' | string;
  }>;
}

export default function TeacherGroupsPage() {
  const [groups, setGroups] = useState<ClassroomGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<ClassroomGroup | null>(null);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [loadingSession, setLoadingSession] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Toggles and inputs
  const [appNotion, setAppNotion] = useState(true);
  const [appYouTube, setAppYouTube] = useState(false);
  const [appLinkedIn, setAppLinkedIn] = useState(false);

  const [broadcastText, setBroadcastText] = useState('');
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3500);
  };

  const loadGroups = async () => {
    try {
      const res = await fetch('/api/teacher/groups');
      if (res.ok) {
        const data = await res.json();
        setGroups(data || []);
        if (data && data.length > 0) {
          setSelectedGroup(data[0]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingGroups(false);
    }
  };

  const loadSession = async (groupId: string) => {
    setLoadingSession(true);
    try {
      const res = await fetch(`/api/teacher/groups/${groupId}/session`);
      if (res.ok) {
        const data = await res.json();
        setSessionData(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSession(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    if (selectedGroup) {
      loadSession(selectedGroup.id);
    }
  }, [selectedGroup]);

  const handleNudge = async (studentId: string, studentName: string) => {
    if (!sessionData) return;
    try {
      const res = await fetch(`/api/teacher/session/${sessionData.liveSession.sessionId}/students/${studentId}/nudge`, {
        method: 'POST'
      });
      if (res.ok) {
        triggerToast(`Nudge notification dispatched to ${studentName}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLock = async (studentId: string, studentName: string) => {
    if (!sessionData) return;
    try {
      const res = await fetch(`/api/teacher/session/${sessionData.liveSession.sessionId}/students/${studentId}/lock`, {
        method: 'POST'
      });
      if (res.ok) {
        triggerToast(`Active Focus Lock engaged on ${studentName}'s browser`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleApp = async (appName: string, currentVal: boolean, setVal: (v: boolean) => void) => {
    if (!sessionData) return;
    const nextVal = !currentVal;
    try {
      const res = await fetch(`/api/teacher/session/${sessionData.liveSession.sessionId}/apps/${appName.toLowerCase()}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocked: !nextVal })
      });
      if (res.ok) {
        setVal(nextVal);
        triggerToast(`Permissions for ${appName} modified to: ${nextVal ? 'Allowed' : 'Blocked'}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastText.trim() || !sessionData) return;
    setIsBroadcasting(true);
    try {
      const res = await fetch(`/api/teacher/session/${sessionData.liveSession.sessionId}/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: broadcastText })
      });
      if (res.ok) {
        triggerToast(`Broadcast toast transmitted to all session members`);
        setBroadcastText('');
        setShowBroadcastModal(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsBroadcasting(false);
    }
  };

  const handleEndSession = async () => {
    if (!sessionData) return;
    if (!confirm('Are you sure you want to end this study session for all classroom participants?')) return;
    try {
      const res = await fetch(`/api/teacher/session/${sessionData.liveSession.sessionId}/end`, {
        method: 'POST'
      });
      if (res.ok) {
        triggerToast('Session successfully terminated. Syncing logs.');
        setSessionData(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loadingGroups) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400 font-mono">
        <div className="w-8 h-8 rounded-full border-2 border-slate-800 border-t-emerald-450 animate-spin mb-4"></div>
        <p className="text-[10px] tracking-widest uppercase">Opening Teacher Command channels...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f9fb] text-[#191c1e] font-sans pb-xl pt-4">
      {/* Toast */}
      {showToast && (
        <div className="fixed bottom-6 right-6 bg-[#0D1527] border border-emerald-500/30 text-emerald-450 px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 z-50 animate-bounce font-semibold text-xs">
          <span className="material-symbols-outlined text-sm">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Instructor Info */}
      <div className="max-w-[1200px] mx-auto px-6 flex justify-between items-center mb-6 mt-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center font-bold text-slate-650 text-sm overflow-hidden">
            T
          </div>
          <div>
            <p className="font-bold text-sm text-[#091426]">Dr. Aris Thorne</p>
            <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">Lead Instructor</p>
          </div>
        </div>
        
        {sessionData && (
          <button 
            onClick={handleEndSession}
            className="px-4 py-2 bg-red-650 hover:bg-red-700 text-white font-semibold text-xs rounded-xl shadow-sm hover:shadow-md transition-colors cursor-pointer"
          >
            End Study Session
          </button>
        )}
      </div>

      <div className="max-w-[1200px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side Groups list (3 cols) */}
        <aside className="lg:col-span-3 space-y-4">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Your Groups</h3>
          <div className="space-y-2">
            {groups.map(group => {
              const isSelected = selectedGroup?.id === group.id;
              return (
                <div 
                  key={group.id}
                  onClick={() => setSelectedGroup(group)}
                  className={`p-4 rounded-2xl border shadow-sm cursor-pointer transition-all ${
                    isSelected 
                      ? 'bg-white border-l-4 border-l-[#006c49] border-slate-200' 
                      : 'bg-white/40 border-slate-200/50 hover:bg-white/60'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      group.active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {group.active ? 'ACTIVE' : 'OFFLINE'}
                    </span>
                    {group.active && (
                      <span className="material-symbols-outlined text-emerald-500 text-sm animate-pulse">radio_button_checked</span>
                    )}
                  </div>
                  <h4 className="font-bold text-sm text-[#091426]">{group.name}</h4>
                  <p className="text-[10px] text-slate-500 font-semibold mt-0.5">{group.studentCount} Students • Room {group.room}</p>
                </div>
              );
            })}
          </div>
        </aside>

        {/* Center Panel (9 cols) */}
        <main className="lg:col-span-9 space-y-8">
          
          {selectedGroup && sessionData ? (
            <>
              {/* Dashboard Header */}
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <nav className="flex gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                    <span>Groups</span>
                    <span>/</span>
                    <span className="text-[#091426]">{selectedGroup.name}</span>
                  </nav>
                  <h2 className="text-2xl font-bold text-[#091426]">Teacher Command Center</h2>
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={() => setShowBroadcastModal(true)}
                    className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 hover:border-slate-350 bg-white text-[#091426] font-bold text-xs rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">campaign</span>
                    Broadcast Message
                  </button>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Active Students */}
                <div className="bg-white/80 border border-slate-200/60 p-5 rounded-2xl shadow-sm">
                  <div className="flex items-center gap-2 mb-4 text-slate-500">
                    <span className="material-symbols-outlined text-sm">person_pin</span>
                    <span className="text-xs font-bold uppercase tracking-wider">Active Students</span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-extrabold text-[#091426]">{sessionData.liveSession.activeStudents}</span>
                    <span className="text-xs text-slate-400">/ {sessionData.liveSession.totalStudents}</span>
                  </div>
                  <div className="mt-4 w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#006c49]" 
                      style={{ width: `${(sessionData.liveSession.activeStudents / sessionData.liveSession.totalStudents) * 100}%` }}
                    ></div>
                  </div>
                </div>

                {/* Focus Score */}
                <div className="bg-white/80 border border-slate-200/60 p-5 rounded-2xl shadow-sm">
                  <div className="flex items-center gap-2 mb-4 text-slate-500">
                    <span className="material-symbols-outlined text-sm">psychology</span>
                    <span className="text-xs font-bold uppercase tracking-wider">Focus Rating</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-[#006c49]">{sessionData.liveSession.focusScore}%</span>
                    <span className="text-xs text-emerald-600 font-bold flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-xs">trending_up</span>
                      <span>+{sessionData.liveSession.focusTrend}%</span>
                    </span>
                  </div>
                  <p className="mt-2 text-[10px] text-slate-450 font-bold uppercase tracking-wider">High engagement detected</p>
                </div>

                {/* App Activity */}
                <div className="bg-white/80 border border-slate-200/60 p-5 rounded-2xl shadow-sm">
                  <div className="flex items-center gap-2 mb-4 text-slate-500">
                    <span className="material-symbols-outlined text-sm">apps</span>
                    <span className="text-xs font-bold uppercase tracking-wider">App Activity</span>
                  </div>
                  <div className="space-y-1 text-xs">
                    {Object.entries(sessionData.liveSession.appsSummary).map(([appName, count]) => (
                      <div key={appName} className="flex justify-between font-semibold">
                        <span className="text-slate-700">{appName}</span>
                        <span className="text-slate-450 font-bold">{count} users</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Roster & App Control Grid split */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* App Control (5 cols) */}
                <section className="md:col-span-5 bg-white/80 border border-slate-200/60 p-5 rounded-2xl h-fit">
                  <div className="flex justify-between items-center mb-5">
                    <h3 className="text-sm font-bold text-[#091426]">App Controls</h3>
                    <span className="text-[9px] font-bold text-red-650 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full uppercase tracking-wider">Restricted Mode</span>
                  </div>

                  <div className="space-y-3">
                    {[
                      { name: 'Notion', state: appNotion, set: setAppNotion },
                      { name: 'YouTube', state: appYouTube, set: setAppYouTube },
                      { name: 'LinkedIn', state: appLinkedIn, set: setAppLinkedIn }
                    ].map(app => (
                      <div key={app.name} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/50">
                        <span className="text-xs font-bold text-slate-750">{app.name}</span>
                        <label className="relative inline-flex items-center cursor-pointer select-none">
                          <input 
                            type="checkbox" 
                            checked={app.state}
                            onChange={() => handleToggleApp(app.name, app.state, app.set)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-350 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#006c49]"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Roster (7 cols) */}
                <section className="md:col-span-7 bg-white/80 border border-slate-200/60 rounded-2xl overflow-hidden flex flex-col">
                  <div className="p-5 border-b border-slate-200/50 flex justify-between items-center">
                    <h3 className="text-sm font-bold text-[#091426]">Student Roster</h3>
                  </div>

                  <div className="divide-y divide-slate-100 text-xs">
                    {sessionData.roster.map(st => (
                      <div key={st.studentId} className="flex items-center justify-between p-4 hover:bg-slate-50/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-650 text-xs">
                            {st.name[0]}
                          </div>
                          <div>
                            <p className="font-bold text-[#091426]">{st.name}</p>
                            <p className="text-[10px] text-slate-450 font-semibold">{st.activity}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                            st.status === 'focusing' 
                              ? 'bg-emerald-50 text-[#006c49] border border-emerald-100' 
                              : 'bg-red-50 text-red-650 border border-red-100'
                          }`}>
                            {st.status}
                          </span>

                          <div className="flex gap-1.5">
                            <button 
                              onClick={() => handleNudge(st.studentId, st.name)}
                              className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-amber-600 transition-colors cursor-pointer"
                              title="Send Focus Nudge Alert"
                            >
                              <span className="material-symbols-outlined text-[18px]">notifications_active</span>
                            </button>
                            <button 
                              onClick={() => handleLock(st.studentId, st.name)}
                              className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-red-600 transition-colors cursor-pointer"
                              title="Engage Focus Lock Screen"
                            >
                              <span className="material-symbols-outlined text-[18px]">lock</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

              </div>

              {/* Momentum wave graph placeholder */}
              <section className="bg-white/80 border border-slate-200/60 p-5 rounded-2xl relative overflow-hidden h-40 flex flex-col justify-center">
                <div className="absolute inset-0 bg-gradient-to-r from-[#091426]/5 to-transparent pointer-events-none"></div>
                <div className="relative z-10 flex justify-between items-center px-4">
                  <div>
                    <h4 className="text-sm font-bold text-[#091426] mb-0.5">Session Momentum</h4>
                    <p className="text-[10px] text-slate-450 font-semibold">Aggregate class focus levels over the last 60 minutes</p>
                  </div>
                  <div className="flex gap-6 text-xs">
                    <div className="text-center">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Peak Focus</p>
                      <p className="text-lg font-bold text-[#006c49]">{sessionData.liveSession.momentum.peakFocusPercent}%</p>
                    </div>
                    <div className="w-px h-8 bg-slate-200"></div>
                    <div className="text-center">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dip Alert</p>
                      <p className="text-lg font-bold text-slate-800">{sessionData.liveSession.momentum.dipTime}</p>
                    </div>
                  </div>
                </div>
              </section>

            </>
          ) : (
            <div className="bg-white/50 border border-dashed border-slate-350/60 p-12 rounded-2xl text-center text-slate-500 font-semibold italic text-sm">
              Please select an active group from the sidebar to review live rosters and control tools.
            </div>
          )}

        </main>
      </div>

      {/* Broadcast Message Modal */}
      {showBroadcastModal && (
        <div className="fixed inset-0 bg-[#091426]/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-2xl relative">
            <button 
              onClick={() => setShowBroadcastModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            
            <h3 className="text-lg font-bold text-[#091426] mb-2 flex items-center gap-1.5">
              <span className="material-symbols-outlined">campaign</span>
              Broadcast announcement
            </h3>
            <p className="text-xs text-slate-500 mb-4 font-medium leading-relaxed">
              This message will display instantly as a sticky notification card on all student screen modules.
            </p>
            
            <form onSubmit={handleBroadcast} className="space-y-4">
              <textarea
                required
                rows={3}
                value={broadcastText}
                onChange={e => setBroadcastText(e.target.value)}
                placeholder="Attention students: focus sprints will end in 5 minutes. Gather notes."
                className="w-full border border-slate-200 focus:border-slate-800 focus:ring-4 focus:ring-slate-800/5 rounded-xl text-xs outline-none p-3 placeholder-slate-400"
              />
              <button 
                type="submit"
                disabled={isBroadcasting}
                className="w-full bg-[#091426] hover:bg-slate-800 text-white font-bold text-xs py-3 rounded-xl transition-all cursor-pointer"
              >
                {isBroadcasting ? 'Broadcasting...' : 'Broadcast Message'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
