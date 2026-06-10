'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { TimetableEvent } from '@/lib/db';
import { useRouter } from 'next/navigation';

export default function PlannerPage() {
  const router = useRouter();
  const { tasks, addTask, toggleTaskCompleted } = useApp();
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskSubject, setNewTaskSubject] = useState('Biology');

  const [timetable, setTimetable] = useState<TimetableEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTimetable = async () => {
    try {
      const response = await fetch('/api/timetable');
      if (response.ok) {
        const data = await response.json();
        setTimetable(data);
      }
    } catch (err) {
      console.error('Error fetching timetable:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimetable();
  }, []);

  const handleOpenAddModal = () => {
    router.push('/planner/add');
  };

  const days: Array<'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun'> = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    addTask(newTaskTitle, newTaskSubject);
    setNewTaskTitle('');
  };

  return (
    <div className="space-y-lg">
      <div className="mb-lg">
        <h2 className="font-bold text-headline-lg text-primary mb-xs">Smart Study Planner</h2>
        <p className="text-body-md text-on-surface-variant font-medium">
          AI-curated schedule based on your upcoming exams and past performance.
        </p>
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-md">
        
        {/* Left column: AI Weekly Timetable & Subject Prioritization (Spans 8 cols) */}
        <div className="md:col-span-8 flex flex-col gap-md">
          {/* AI Weekly Timetable */}
          <div className="glass-panel rounded-xl p-md relative overflow-hidden shadow-sm">
            <div className="absolute top-0 right-0 w-32 h-32 bg-secondary-container opacity-20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
            
            <div className="flex justify-between items-center mb-md">
              <div className="flex items-center gap-sm">
                <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>
                  auto_awesome
                </span>
                <h3 className="font-bold text-headline-md text-primary">AI Weekly Timetable</h3>
              </div>
              <div className="flex gap-sm items-center">
                <button
                  onClick={handleOpenAddModal}
                  className="flex items-center gap-xs px-sm py-1.5 bg-primary text-on-primary rounded-lg text-label-sm font-semibold hover:bg-primary/90 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  Add Event
                </button>
                <div className="flex gap-xs items-center">
                  <button className="p-1 rounded hover:bg-surface-variant text-on-surface-variant transition-colors">
                    <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                  </button>
                  <span className="font-semibold text-label-md py-1">Oct 24 - Oct 30</span>
                  <button className="p-1 rounded hover:bg-surface-variant text-on-surface-variant transition-colors">
                    <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-xs min-h-[300px]">
              {/* Day Headers */}
              {days.map((day) => (
                <div key={day} className="text-center pb-xs border-b border-outline-variant/30">
                  <span className={`text-label-sm ${day === 'Wed' ? 'text-primary font-bold' : 'text-on-surface-variant'}`}>
                    {day}
                  </span>
                </div>
              ))}

              {/* Day columns */}
              {loading ? (
                <div className="col-span-7 flex items-center justify-center py-xl text-on-surface-variant font-medium">
                  Loading timetable...
                </div>
              ) : (
                days.map((day) => {
                  const dayEvents = timetable.filter(e => e.day === day);
                  return (
                    <div key={day} className="flex flex-col gap-xs mt-xs min-h-[200px] bg-surface-variant/5 rounded-md p-[2px]">
                      {dayEvents.map(event => (
                        <div
                          key={event.id}
                          onClick={() => router.push(`/planner/add?id=${event.id}`)}
                          className={`p-xs rounded-md border text-left cursor-pointer transition-all hover:scale-[1.02] active:scale-95 group relative ${
                            event.isAiSuggested
                              ? 'bg-tertiary-fixed border-tertiary-fixed-dim text-tertiary-container relative p-sm'
                              : 'bg-surface-container-low border-outline-variant/20 hover:border-primary/45 text-on-surface'
                          }`}
                        >
                          {event.isAiSuggested && (
                            <div className="absolute -top-2 -right-2 bg-primary text-white text-[9px] px-1.5 py-0.5 rounded-full shadow-sm">
                              AI Suggested
                            </div>
                          )}
                          <p className={`text-[10px] font-bold mb-0.5 ${event.isAiSuggested ? 'text-tertiary-container' : 'text-primary'}`}>
                            {event.time}
                          </p>
                          <p className={`text-[12px] leading-tight font-semibold ${event.isAiSuggested ? 'text-tertiary-container' : 'text-on-surface'}`}>
                            {event.title}
                          </p>
                          {event.pomodoros > 0 && (
                            <div className={`flex items-center gap-1 mt-1.5 ${event.isAiSuggested ? 'text-on-tertiary-container' : 'text-on-surface-variant/70'}`}>
                              <span className="material-symbols-outlined text-[12px]">timer</span>
                              <span className="text-[9px] font-semibold">{event.pomodoros} Pomos</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Subject Prioritization */}
          <div className="glass-panel rounded-xl p-md">
            <h3 className="font-bold text-[20px] text-primary mb-md">Subject Prioritization</h3>
            <div className="flex flex-col gap-sm">
              {/* Priority Item 1 */}
              <div className="flex items-center justify-between p-sm rounded-lg border border-error-container bg-error-container/10">
                <div className="flex items-center gap-sm">
                  <div className="w-8 h-8 rounded-full bg-error-container flex items-center justify-center text-on-error-container">
                    <span className="material-symbols-outlined text-[18px]">priority_high</span>
                  </div>
                  <div>
                    <p className="text-label-md text-on-surface font-bold">Biology</p>
                    <p className="text-label-sm text-on-surface-variant font-medium">Cellular Respiration concepts weak</p>
                  </div>
                </div>
                <button className="px-sm py-1 border border-outline-variant rounded-md text-label-sm font-semibold hover:bg-surface-variant transition-colors cursor-pointer">
                  Review Now
                </button>
              </div>
              
              {/* Priority Item 2 */}
              <div className="flex items-center justify-between p-sm rounded-lg border border-outline-variant/30 hover:bg-surface-container-low transition-colors">
                <div className="flex items-center gap-sm">
                  <div className="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center text-on-surface-variant">
                    <span className="material-symbols-outlined text-[18px]">functions</span>
                  </div>
                  <div>
                    <p className="text-label-md text-on-surface font-bold">Calculus</p>
                    <p className="text-label-sm text-on-surface-variant font-medium">Maintain practice streak</p>
                  </div>
                </div>
                <button className="px-sm py-1 border border-outline-variant rounded-md text-label-sm font-semibold hover:bg-surface-variant transition-colors cursor-pointer">
                  Schedule
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Countdown & Task Assignment Tracker (Spans 4 cols) */}
        <div className="md:col-span-4 flex flex-col gap-md">
          {/* Exam Countdown Card */}
          <div className="glass-panel rounded-xl p-md bg-gradient-to-br from-primary-container to-primary text-white border-none relative overflow-hidden shadow-md">
            <div className="absolute -right-8 -bottom-8 opacity-10">
              <span className="material-symbols-outlined text-[120px]">science</span>
            </div>
            <h3 className="text-label-sm text-on-primary-container uppercase tracking-wider mb-sm font-bold">
              Upcoming Major Exam
            </h3>
            <p className="text-headline-lg font-bold text-white leading-tight mb-sm">Biology Final</p>
            <div className="flex items-baseline gap-xs mb-md">
              <span className="font-bold text-[48px] text-secondary-container">4</span>
              <span className="text-label-md text-on-primary-container">days left</span>
            </div>
            <div className="w-full bg-primary/45 rounded-full h-1.5 mb-2">
              <div className="bg-secondary-container h-1.5 rounded-full" style={{ width: '85%' }}></div>
            </div>
            <p className="text-[11px] text-on-primary-container text-right font-medium">
              85% Study Plan Completed
            </p>
          </div>

          {/* Assignment Tracker Card */}
          <div className="glass-panel rounded-xl p-md flex-1">
            <div className="flex justify-between items-center mb-md">
              <h3 className="font-bold text-[20px] text-primary">Assignments</h3>
            </div>

            {/* List Assignments */}
            <div className="flex flex-col gap-sm mb-md">
              {tasks.map(task => (
                <label
                  key={task.id}
                  className={`flex items-start gap-sm p-sm rounded-lg hover:bg-surface-container-low transition-colors cursor-pointer group ${
                    task.completed ? 'opacity-65' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => toggleTaskCompleted(task.id)}
                    className="mt-1 rounded border-outline-variant text-secondary focus:ring-secondary/50 bg-transparent cursor-pointer"
                  />
                  <div>
                    <p className={`text-label-md font-bold text-on-surface group-hover:text-primary transition-colors ${
                      task.completed ? 'line-through' : ''
                    }`}>
                      {task.title}
                    </p>
                    <p className={`text-label-sm font-medium mt-0.5 ${task.completed ? 'text-secondary' : 'text-error'}`}>
                      {task.completed ? 'Completed' : 'Due Soon'}
                    </p>
                  </div>
                </label>
              ))}
            </div>

            {/* Add Assignment Mini-Form */}
            <form onSubmit={handleAddTask} className="border-t border-outline-variant/20 pt-md mt-auto">
              <h4 className="text-xs font-bold text-on-surface-variant mb-xs uppercase">Add New task</h4>
              <div className="flex flex-col gap-sm">
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={e => setNewTaskTitle(e.target.value)}
                  placeholder="Task description..."
                  className="w-full px-sm py-2 border border-outline-variant/50 focus:border-primary focus:ring-1 focus:ring-primary rounded-lg text-label-sm outline-none bg-surface/30"
                />
                <div className="flex gap-xs">
                  <select
                    value={newTaskSubject}
                    onChange={e => setNewTaskSubject(e.target.value)}
                    className="flex-1 px-sm py-2 border border-outline-variant/50 rounded-lg text-label-sm outline-none bg-white dark:bg-slate-800"
                  >
                    <option value="Biology">Biology</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="Physics">Physics</option>
                    <option value="History">History</option>
                  </select>
                  <button
                    type="submit"
                    className="px-md py-2 bg-primary hover:bg-primary/90 text-on-primary rounded-lg text-label-sm font-semibold cursor-pointer active:scale-95 transition-all"
                  >
                    Add
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
