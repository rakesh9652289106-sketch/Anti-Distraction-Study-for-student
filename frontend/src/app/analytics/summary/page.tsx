'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';

interface SessionSummary {
  sessionId: string;
  title: string;
  completedAt: string;
  durationMinutes: number;
  focusScore: number;
  timeline: Array<{ minute: number; score: number }>;
}

interface AiSummary {
  recapText: string;
  suggestedLessonId: string;
}

interface Milestone {
  name: string;
  reward: string;
  icon: string;
}

interface Resource {
  title: string;
  type: string;
  url?: string;
}

export default function SessionSummaryPage() {
  const { sessions } = useApp();
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [aiSummary, setAiSummary] = useState<AiSummary | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Interactive forms
  const [showAddResource, setShowAddResource] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState('pdf');
  const [isAdding, setIsAdding] = useState(false);
  const [calendarSynced, setCalendarSynced] = useState(false);

  useEffect(() => {
    // We can query the summary of the latest session in our logs
    const latestSessionId = sessions[sessions.length - 1]?.id || 's2';
    
    fetch(`/api/student/sessions/${latestSessionId}/summary`)
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('Failed to load session details');
      })
      .then(data => {
        setSummary(data.summary);
        setAiSummary(data.aiSummary);
        setMilestones(data.milestones || []);
        setResources(data.resources || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [sessions]);

  const handleAddResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !summary) return;
    setIsAdding(true);
    try {
      const res = await fetch(`/api/student/sessions/${summary.sessionId}/resources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle, type: newType, url: '#' })
      });
      if (res.ok) {
        setResources(prev => [...prev, { title: newTitle, type: newType }]);
        setNewTitle('');
        setShowAddResource(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAdding(false);
    }
  };

  const handleSyncCalendar = async () => {
    try {
      const res = await fetch('/api/student/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId: aiSummary?.suggestedLessonId || 'general', scheduledTime: new Date(Date.now() + 3600000 * 20).toISOString() })
      });
      if (res.ok) {
        const json = await res.json();
        setCalendarSynced(true);
        alert(`Successfully synced upcoming work block to your calendar. (Registry ID: ${json.bookingId})`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400 font-mono">
        <div className="w-8 h-8 rounded-full border-2 border-slate-800 border-t-emerald-450 animate-spin mb-4"></div>
        <p className="text-[10px] tracking-widest uppercase">Harvesting cognitive metrics...</p>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="text-center py-12 text-slate-500 font-semibold italic">
        No recent study sessions found to display recaps.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f9fb] text-[#191c1e] font-sans pb-xl pt-4">
      {/* Hero Header */}
      <section className="max-w-[1200px] mx-auto px-6 mb-8 mt-6">
        <div className="relative overflow-hidden rounded-2xl p-6 md:p-8 bg-[#091426] text-white shadow-xl flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute -right-20 -top-20 w-96 h-96 bg-[#4edea3] rounded-full blur-3xl"></div>
            <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-blue-500 rounded-full blur-3xl"></div>
          </div>
          
          <div className="relative z-10 text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 mb-3 px-3 py-1 bg-[#006c49]/20 text-[#4edea3] border border-[#4edea3]/30 rounded-full text-xs font-bold">
              <span className="material-symbols-outlined text-[16px] font-bold">verified</span>
              <span>SESSION COMPLETE</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-1">{summary.title}</h1>
            <p className="text-xs text-slate-400">Completed on {summary.completedAt}</p>
          </div>

          <div className="relative z-10 flex gap-8">
            <div className="flex flex-col items-center">
              <span className="text-4xl md:text-5xl font-extrabold leading-none">{summary.durationMinutes}<span className="text-sm font-semibold ml-0.5">m</span></span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Total Focus</span>
            </div>
            <div className="w-px h-12 bg-slate-700/50"></div>
            <div className="flex flex-col items-center">
              <span className="text-4xl md:text-5xl font-extrabold leading-none text-[#4edea3]">{summary.focusScore}<span className="text-sm font-semibold ml-0.5">%</span></span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Focus Score</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Grid */}
      <div className="max-w-[1200px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left column (8 cols) */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Productivity Timeline */}
          <div className="bg-white/80 border border-slate-200/60 shadow-sm rounded-2xl p-5">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-[#091426]">Productivity Timeline</h3>
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#006c49]"></div>
                  <span className="text-slate-500 font-semibold">High Intensity</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-200"></div>
                  <span className="text-slate-500 font-semibold">Rest</span>
                </div>
              </div>
            </div>

            <div className="h-60 flex items-end justify-between gap-1.5 mb-4">
              {summary.timeline.map((point, idx) => {
                // Height percent based on score
                const heightVal = `${point.score}%`;
                const isRest = point.score < 30;
                return (
                  <div 
                    key={idx} 
                    className="w-full rounded-t transition-all duration-1000"
                    style={{ 
                      height: heightVal, 
                      backgroundColor: isRest ? '#e2e8f0' : '#006c49' 
                    }}
                    title={`Minute ${point.minute}: Score ${point.score}%`}
                  ></div>
                );
              })}
            </div>

            <div className="flex justify-between text-[10px] font-bold text-slate-450 uppercase tracking-widest">
              <span>0m</span>
              <span>{Math.round(summary.durationMinutes / 3)}m</span>
              <span>{Math.round(summary.durationMinutes * 2 / 3)}m</span>
              <span>{summary.durationMinutes}m</span>
            </div>
          </div>

          {/* AI Study Assistant Recap */}
          {aiSummary && (
            <div className="bg-blue-50/40 border border-blue-100 rounded-2xl p-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <span className="material-symbols-outlined text-[80px]">smart_toy</span>
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3 text-blue-800">
                  <span className="material-symbols-outlined">auto_awesome</span>
                  <h3 className="text-base font-bold">AI Study Assistant Recap</h3>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed max-w-2xl font-medium mb-5">
                  "{aiSummary.recapText}"
                </p>
                <div className="flex flex-wrap gap-3">
                  <button 
                    onClick={handleSyncCalendar}
                    disabled={calendarSynced}
                    className="px-4 py-2 bg-[#091426] hover:bg-slate-800 disabled:bg-slate-350 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                  >
                    {calendarSynced ? 'Synced to Calendar' : 'Schedule Tunneling Lesson'}
                  </button>
                  <button className="px-4 py-2 border border-slate-200 hover:border-slate-300 text-slate-650 bg-white hover:bg-slate-50 rounded-lg text-xs font-semibold transition-colors">
                    Review Today's Notes
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right column (4 cols) */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* Milestones */}
          <div className="bg-white/80 border border-slate-200/60 shadow-sm rounded-2xl p-5">
            <h3 className="text-md font-bold text-[#091426] mb-4">Milestones</h3>
            <div className="space-y-3">
              {milestones.map((m, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
                    <span className="material-symbols-outlined">{m.icon || 'bolt'}</span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#091426]">{m.name}</p>
                    <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">{m.reward}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Resources Consulted */}
          <div className="bg-white/80 border border-slate-200/60 shadow-sm rounded-2xl p-5">
            <h3 className="text-md font-bold text-[#091426] mb-4">Resources Consulted</h3>
            <div className="space-y-1">
              {resources.map((r, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 hover:bg-slate-50 rounded-xl transition-colors group">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="material-symbols-outlined text-slate-400 text-sm">
                      {r.type === 'pdf' ? 'picture_as_pdf' : r.type === 'link' ? 'language' : 'article'}
                    </span>
                    <span className="text-xs font-bold text-[#091426] truncate">{r.title}</span>
                  </div>
                  <span className="material-symbols-outlined text-slate-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity">open_in_new</span>
                </div>
              ))}

              <div className="pt-3">
                {!showAddResource ? (
                  <button 
                    onClick={() => setShowAddResource(true)}
                    className="w-full py-2 border border-dashed border-slate-300 hover:border-[#091426] text-slate-500 hover:text-[#091426] text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    + Add missing resource
                  </button>
                ) : (
                  <form onSubmit={handleAddResource} className="space-y-3 bg-slate-50 p-3 border border-slate-200 rounded-xl mt-2">
                    <div className="space-y-1">
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Document Title</label>
                      <input
                        required
                        type="text"
                        value={newTitle}
                        onChange={e => setNewTitle(e.target.value)}
                        placeholder="e.g. Chapter 4 review.pdf"
                        className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-slate-800"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Type</label>
                      <select
                        value={newType}
                        onChange={e => setNewType(e.target.value)}
                        className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-slate-800"
                      >
                        <option value="pdf">PDF File</option>
                        <option value="link">Web Link</option>
                        <option value="note">Document/Paper</option>
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        type="submit"
                        disabled={isAdding}
                        className="flex-1 py-1.5 bg-[#091426] hover:bg-slate-800 text-white font-bold text-[10px] rounded-lg transition-colors cursor-pointer"
                      >
                        Add
                      </button>
                      <button 
                        type="button"
                        onClick={() => setShowAddResource(false)}
                        className="flex-1 py-1.5 bg-slate-200 hover:bg-slate-350 text-slate-650 font-bold text-[10px] rounded-lg transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>

          {/* Sync to calendar trigger */}
          <div className="bg-[#006c49]/5 border border-[#006c49]/20 rounded-2xl p-5 flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-[#6ffbbe]/25 text-[#006c49] rounded-full flex items-center justify-center mb-3">
              <span className="material-symbols-outlined text-[24px]">calendar_today</span>
            </div>
            <h4 className="text-xs font-bold text-[#091426] mb-1">Ready for more?</h4>
            <p className="text-[11px] text-slate-500 mb-4 font-medium leading-relaxed">Your next focus block schedule is tomorrow at 10:00 AM.</p>
            <button 
              onClick={handleSyncCalendar}
              className="w-full py-2.5 bg-[#006c49] hover:bg-[#005236] text-white font-bold text-xs rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer"
            >
              Sync to Calendar
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
