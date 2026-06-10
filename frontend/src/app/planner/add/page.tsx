'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface SubTask {
  id: string;
  title: string;
  duration: number;
}

function AddEventForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams ? searchParams.get('id') : null;

  // Form states
  const [title, setTitle] = useState('');
  const todayStr = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(todayStr);
  const [time, setTime] = useState('10:00');
  const [subject, setSubject] = useState('Biology');
  const [aiOptimized, setAiOptimized] = useState(true);
  const [focusMode, setFocusMode] = useState('standard');

  // Sub-tasks state
  const [subTasks, setSubTasks] = useState<SubTask[]>([
    { id: 'sub-1', title: 'Review chapter 4 annotations', duration: 20 },
    { id: 'sub-2', title: 'Outline introductory argument', duration: 45 }
  ]);

  // Load event details if editing
  useEffect(() => {
    if (eventId) {
      const loadEvent = async () => {
        try {
          const response = await fetch('/api/timetable');
          if (response.ok) {
            const data: any[] = await response.json();
            const event = data.find(e => e.id === eventId);
            if (event) {
              setTitle(event.title);
              setSubject(event.subject);
              setAiOptimized(!!event.isAiSuggested);

              // Map day of the week back to date
              const getDayOfWeekDate = (dayName: string) => {
                const now = new Date();
                const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                const targetIdx = daysOfWeek.indexOf(dayName);
                if (targetIdx === -1) return now.toISOString().split('T')[0];
                const currentIdx = now.getDay();
                const diff = targetIdx - currentIdx;
                now.setDate(now.getDate() + diff);
                return now.toISOString().split('T')[0];
              };
              setDate(getDayOfWeekDate(event.day));

              // Map 12h time to 24h input format
              const convert12hTo24h = (time12: string) => {
                if (!time12) return '10:00';
                const cleanTime = time12.split('-')[0].trim();
                const parts = cleanTime.split(' ');
                if (parts.length < 2) return '10:00';
                const timeStr = parts[0];
                const ampm = parts[1].toUpperCase();
                let [hoursStr, minutesStr] = timeStr.split(':');
                let hours = parseInt(hoursStr);
                if (ampm === 'PM' && hours < 12) hours += 12;
                if (ampm === 'AM' && hours === 12) hours = 0;
                const pad = (n: number) => n < 10 ? '0' + n : n;
                return `${pad(hours)}:${minutesStr.substring(0, 2)}`;
              };
              setTime(convert12hTo24h(event.time));

              // Setup subtask representing the current pomodoro allocation
              const durationMins = event.pomodoros * 25;
              setSubTasks([
                { id: 'sub-loaded-1', title: `Focus Session for ${event.title}`, duration: durationMins }
              ]);
            }
          }
        } catch (err) {
          console.error('Failed to load event details:', err);
        }
      };
      loadEvent();
    }
  }, [eventId]);

  // Handle subtask actions
  const handleAddSubTask = () => {
    const newId = 'sub-' + Math.random().toString(36).substring(2, 9);
    setSubTasks([...subTasks, { id: newId, title: '', duration: 15 }]);
  };

  const handleUpdateSubTask = (id: string, field: 'title' | 'duration', value: any) => {
    setSubTasks(subTasks.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const handleDeleteSubTask = (id: string) => {
    setSubTasks(subTasks.filter(t => t.id !== id));
  };

  // Dynamic risk calculation
  const getRiskStatus = () => {
    if (!time) {
      return { 
        label: 'Select Time', 
        colorClass: 'text-on-surface-variant border-outline-variant/30 bg-surface-variant/5', 
        barClass: 'bg-outline-variant w-1/4', 
        text: 'Configure your start time to assess distraction risk.',
        highRisk: false 
      };
    }
    const [hoursStr] = time.split(':');
    const hours = parseInt(hoursStr);

    if (hours >= 18 && hours <= 21) {
      return {
        label: 'High Distraction Risk',
        colorClass: 'text-error border-error-container bg-error-container/10',
        barClass: 'bg-error w-3/4',
        text: 'Evening sessions (18:00 - 21:00) usually have 20% lower focus scores based on your biometrics.',
        highRisk: true
      };
    } else if (hours >= 8 && hours <= 12) {
      return {
        label: 'Low Distraction Risk',
        colorClass: 'text-secondary border-secondary-container/30 bg-secondary-container/10',
        barClass: 'bg-secondary w-1/5',
        text: 'Morning sessions (08:00 - 12:00) usually yield 15% higher focus scores due to natural circadian rhythm.',
        highRisk: false
      };
    } else {
      return {
        label: 'Moderate Distraction Risk',
        colorClass: 'text-amber-600 border-amber-500/20 bg-amber-500/5',
        barClass: 'bg-amber-500 w-1/2',
        text: 'Mid-day sessions show standard cognitive loads. Ensure distractions shield is activated.',
        highRisk: false
      };
    }
  };

  const risk = getRiskStatus();

  const handleSuggestTime = () => {
    setTime('10:00'); // Morning optimal suggestion
  };

  // Form submit handler
  const handleCommit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !time.trim() || !date) return;

    // Convert date string to Mon-Sun
    const dateObj = new Date(date);
    const weekdayNames: Array<'Sun' | 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat'> = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const day = weekdayNames[dateObj.getDay()];

    // Time formatting 12h
    const formatTime12h = (time24: string) => {
      if (!time24) return '';
      const [hoursStr, minutesStr] = time24.split(':');
      let hours = parseInt(hoursStr);
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      return `${hours}:${minutesStr} ${ampm}`;
    };
    const formattedTime = formatTime12h(time);

    // Compute pomodoros
    const totalMinutes = subTasks.reduce((sum, t) => sum + (parseInt(t.duration as any) || 0), 0);
    const pomodoros = Math.max(1, Math.round(totalMinutes / 25));

    const eventData = {
      title,
      day,
      time: formattedTime,
      subject,
      pomodoros,
      isAiSuggested: aiOptimized
    };

    try {
      const url = eventId ? `/api/timetable/${eventId}` : '/api/timetable';
      const method = eventId ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData)
      });
      if (response.ok) {
        router.push('/planner');
      }
    } catch (err) {
      console.error('Error committing timetable event:', err);
    }
  };

  // Delete handler
  const handleDelete = async () => {
    if (!eventId) return;
    if (!confirm('Are you sure you want to delete this study session?')) return;
    try {
      const response = await fetch(`/api/timetable/${eventId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        router.push('/planner');
      }
    } catch (err) {
      console.error('Error deleting event:', err);
    }
  };

  return (
    <div className="space-y-lg">
      {/* Page Header */}
      <div className="mb-lg">
        <h2 className="font-bold text-headline-lg text-primary mb-xs">
          {eventId ? 'Edit Study Session' : 'Schedule Deep Work'}
        </h2>
        <p className="text-body-md text-on-surface-variant font-medium">
          Curate your sanctuary. Set your intentions for a distraction-free flow session.
        </p>
      </div>

      <form onSubmit={handleCommit}>
        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-md">
          
          {/* Left Column (Spans 8) */}
          <div className="md:col-span-8 flex flex-col gap-md">
            
            {/* Event Details Card */}
            <div className="glass-panel rounded-xl p-md relative overflow-hidden shadow-sm">
              <div className="flex items-center gap-sm mb-md">
                <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>
                  edit_calendar
                </span>
                <h3 className="font-bold text-headline-md text-primary">Event Details</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                <div className="md:col-span-2">
                  <label className="block text-label-sm text-on-surface font-semibold mb-xs">Session Title</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. Quantum Mechanics Thesis Draft"
                    className="w-full px-sm py-2 border border-outline-variant/50 focus:border-primary focus:ring-1 focus:ring-primary rounded-lg text-label-sm outline-none bg-surface/30 text-on-surface"
                  />
                </div>

                <div>
                  <label className="block text-label-sm text-on-surface font-semibold mb-xs">Date</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full px-sm py-2 border border-outline-variant/50 focus:border-primary focus:ring-1 focus:ring-primary rounded-lg text-label-sm outline-none bg-surface/30 text-on-surface cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-label-sm text-on-surface font-semibold mb-xs">Start Time</label>
                  <input
                    type="time"
                    required
                    value={time}
                    onChange={e => setTime(e.target.value)}
                    className="w-full px-sm py-2 border border-outline-variant/50 focus:border-primary focus:ring-1 focus:ring-primary rounded-lg text-label-sm outline-none bg-surface/30 text-on-surface cursor-pointer"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-label-sm text-on-surface font-semibold mb-xs">Subject Area</label>
                  <select
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    className="w-full px-sm py-2 border border-outline-variant/50 rounded-lg text-label-sm outline-none bg-surface/30 text-on-surface cursor-pointer"
                  >
                    <option value="Biology" className="bg-surface text-on-surface">Biology</option>
                    <option value="Mathematics" className="bg-surface text-on-surface">Mathematics</option>
                    <option value="Physics" className="bg-surface text-on-surface">Physics</option>
                    <option value="History" className="bg-surface text-on-surface">History</option>
                    <option value="Chemistry" className="bg-surface text-on-surface">Chemistry</option>
                  </select>
                </div>
              </div>
            </div>

            {/* AI Flow Session Optimization */}
            <div className="glass-panel rounded-xl p-md relative overflow-hidden shadow-sm border-l-4 border-l-primary/75">
              <div className="flex justify-between items-start mb-md">
                <div className="space-y-xs">
                  <div className="flex items-center gap-sm">
                    <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>
                      auto_awesome
                    </span>
                    <h3 className="font-bold text-headline-md text-primary">AI-Optimized Flow</h3>
                  </div>
                  <p className="text-body-md text-on-surface-variant font-medium">
                    Enable cognitive pacing to maintain peak performance and focus.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={aiOptimized}
                    onChange={e => setAiOptimized(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              {aiOptimized && (
                <div className="bg-surface-container-low/50 rounded-lg p-sm flex items-center gap-md border border-outline-variant/20 animate-fadeIn">
                  <div className="flex flex-col items-center justify-center p-xs bg-white dark:bg-slate-800 rounded-md shadow-sm min-w-[80px]">
                    <span className="font-bold text-primary">90m</span>
                    <span className="text-[10px] uppercase font-bold text-on-surface-variant">Focus</span>
                  </div>
                  <span className="material-symbols-outlined text-outline">arrow_forward</span>
                  <div className="flex flex-col items-center justify-center p-xs bg-secondary-container rounded-md shadow-sm min-w-[80px]">
                    <span className="font-bold text-on-secondary-container">15m</span>
                    <span className="text-[10px] uppercase font-bold text-on-secondary-container">Break</span>
                  </div>
                  <span className="material-symbols-outlined text-outline">arrow_forward</span>
                  <div className="flex flex-col items-center justify-center p-xs bg-white dark:bg-slate-800 rounded-md shadow-sm min-w-[80px]">
                    <span className="font-bold text-primary">90m</span>
                    <span className="text-[10px] uppercase font-bold text-on-surface-variant">Focus</span>
                  </div>
                </div>
              )}
            </div>

            {/* Task Breakdown Card */}
            <div className="glass-panel rounded-xl p-md relative overflow-hidden shadow-sm">
              <div className="flex justify-between items-center mb-md">
                <div className="flex items-center gap-sm">
                  <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>
                    checklist
                  </span>
                  <h3 className="font-bold text-headline-md text-primary">Task Breakdown</h3>
                </div>
                <button
                  type="button"
                  onClick={handleAddSubTask}
                  className="text-primary font-bold text-label-sm flex items-center gap-xs hover:underline cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">add</span> Add Task
                </button>
              </div>

              <div className="space-y-sm">
                {subTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-sm bg-white dark:bg-slate-900 p-sm rounded-lg border border-outline-variant/10 shadow-sm"
                  >
                    <span className="material-symbols-outlined text-outline-variant">drag_indicator</span>
                    <input
                      type="text"
                      required
                      value={task.title}
                      onChange={e => handleUpdateSubTask(task.id, 'title', e.target.value)}
                      placeholder="Enter specific intent..."
                      className="flex-grow border-0 p-0 font-body-md text-on-surface focus:ring-0 bg-transparent outline-none"
                    />
                    <div className="flex items-center gap-xs px-sm py-xs bg-surface-container-low rounded-full text-label-sm font-semibold text-on-surface-variant">
                      <span className="material-symbols-outlined text-[14px]">timer</span>
                      <input
                        type="number"
                        min="5"
                        max="180"
                        value={task.duration}
                        onChange={e => handleUpdateSubTask(task.id, 'duration', parseInt(e.target.value) || 0)}
                        className="w-12 border-none bg-transparent p-0 text-center font-bold focus:ring-0 focus:outline-none cursor-pointer"
                      />
                      <span>m</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteSubTask(task.id)}
                      className="text-error/60 hover:text-error transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm block">delete</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column (Spans 4) */}
          <div className="md:col-span-4 flex flex-col gap-md">
            
            {/* Risk Assessment Card */}
            <div className={`glass-panel rounded-xl p-md border shadow-sm ${risk.colorClass} transition-colors duration-300`}>
              <div className="flex items-center gap-sm mb-sm">
                <span className="material-symbols-outlined">warning</span>
                <h3 className="font-bold text-label-md uppercase tracking-wide">Risk Assessment</h3>
              </div>
              <div className="space-y-sm">
                <div className="h-2 w-full bg-surface-container-high rounded-full overflow-hidden">
                  <div className={`h-full ${risk.barClass} rounded-full transition-all duration-300`}></div>
                </div>
                <p className="text-body-md text-on-surface-variant text-sm font-semibold">
                  <strong className="text-on-surface">{risk.label}:</strong> {risk.text}
                </p>
                {risk.highRisk && (
                  <button
                    type="button"
                    onClick={handleSuggestTime}
                    className="w-full text-center py-xs px-sm border border-error/20 text-error rounded-lg font-bold text-label-sm hover:bg-error/5 transition-colors cursor-pointer"
                  >
                    Suggest Better Time
                  </button>
                )}
              </div>
            </div>

            {/* Focus Mode Selection Card */}
            <div className="glass-panel rounded-xl p-md relative overflow-hidden shadow-sm">
              <h3 className="font-bold text-headline-sm text-primary mb-md">Focus Mode</h3>
              <div className="space-y-sm">
                {[
                  { id: 'deep', title: 'Deep Work', desc: 'Total app & notification lockout', icon: 'do_not_disturb_on' },
                  { id: 'standard', title: 'Standard Focus', desc: 'Managed notifications only', icon: 'verified_user' },
                  { id: 'collab', title: 'Collab Mode', desc: 'Allows active Study Room access', icon: 'group' }
                ].map((mode) => (
                  <label key={mode.id} className="block cursor-pointer group">
                    <input
                      type="radio"
                      name="focus-mode"
                      value={mode.id}
                      checked={focusMode === mode.id}
                      onChange={() => setFocusMode(mode.id)}
                      className="hidden"
                    />
                    <div className={`p-sm rounded-lg border transition-all ${
                      focusMode === mode.id
                        ? 'border-primary bg-primary-fixed text-primary'
                        : 'border-outline-variant/40 hover:bg-surface-container-low text-on-surface-variant'
                    }`}>
                      <div className="flex items-center gap-sm">
                        <span className="material-symbols-outlined text-primary">{mode.icon}</span>
                        <div>
                          <p className="font-bold text-sm">{mode.title}</p>
                          <p className="text-[11px] font-medium">{mode.desc}</p>
                        </div>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* AI Resource Library Card */}
            <div className="glass-panel rounded-xl p-md relative overflow-hidden shadow-sm">
              <div className="flex items-center gap-sm mb-md">
                <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>
                  link
                </span>
                <h3 className="font-bold text-headline-sm text-primary">AI Resource Library</h3>
              </div>
              <div className="space-y-sm">
                <div className="flex items-center gap-sm p-xs bg-surface-container-low rounded hover:bg-surface-container-high cursor-pointer transition-colors">
                  <div className="w-8 h-8 rounded bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm">
                    <span className="material-symbols-outlined text-sm text-primary">description</span>
                  </div>
                  <span className="text-sm font-semibold text-on-surface truncate">Quantum_Lecture_Notes.pdf</span>
                </div>
                <div className="flex items-center gap-sm p-xs bg-surface-container-low rounded hover:bg-surface-container-high cursor-pointer transition-colors">
                  <div className="w-8 h-8 rounded bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm">
                    <span className="material-symbols-outlined text-sm text-primary">article</span>
                  </div>
                  <span className="text-sm font-semibold text-on-surface truncate">Thesis_References_V2.docx</span>
                </div>
                <button
                  type="button"
                  className="w-full py-sm border-2 border-dashed border-outline-variant/30 rounded-lg text-on-surface-variant hover:border-primary hover:text-primary transition-all text-xs font-bold"
                >
                  + Link Resource
                </button>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="col-span-12 flex justify-between items-center py-lg border-t border-outline-variant/20 mt-md">
            {eventId ? (
              <button
                type="button"
                onClick={handleDelete}
                className="px-lg py-sm rounded-xl font-bold text-label-md bg-error/10 hover:bg-error/20 text-error transition-colors cursor-pointer"
              >
                Delete Event
              </button>
            ) : (
              <div></div>
            )}
            <div className="flex gap-md">
              <button
                type="button"
                onClick={() => router.push('/planner')}
                className="px-lg py-sm rounded-xl font-bold text-label-md text-on-surface-variant hover:bg-surface-container-high transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-xl py-sm rounded-xl font-bold text-label-md bg-primary text-on-primary shadow-lg hover:shadow-xl hover:translate-y-[-2px] transition-all active:scale-95 cursor-pointer"
              >
                {eventId ? 'Update Event' : 'Commit to Planner'}
              </button>
            </div>
          </div>

        </div>
      </form>
    </div>
  );
}

export default function AddEventPage() {
  return (
    <Suspense fallback={<div className="p-md text-on-surface-variant font-medium">Loading session scheduler...</div>}>
      <AddEventForm />
    </Suspense>
  );
}
