'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';

export default function PlannerPage() {
  const { tasks, addTask, toggleTaskCompleted } = useApp();
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskSubject, setNewTaskSubject] = useState('Biology');

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

            {/* Calendar Grid */}
            <div className="grid grid-cols-5 gap-xs min-h-[300px]">
              {/* Day Headers */}
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day, idx) => (
                <div key={day} className="text-center pb-xs border-b border-outline-variant/30">
                  <span className={`text-label-sm ${idx === 1 ? 'text-primary font-bold' : 'text-on-surface-variant'}`}>
                    {day}
                  </span>
                </div>
              ))}

              {/* Day blocks mockup */}
              {/* Monday */}
              <div className="col-start-1 mt-xs p-xs bg-surface-container-low rounded-md border border-outline-variant/20 h-fit">
                <p className="text-[10px] text-primary font-bold mb-0.5">9:00 AM</p>
                <p className="text-[12px] leading-tight text-on-surface font-semibold">Calculus Revision</p>
              </div>

              {/* Tuesday - Highlighted Block */}
              <div className="col-start-2 mt-xs p-sm bg-tertiary-fixed rounded-md border border-tertiary-fixed-dim relative group cursor-pointer h-fit">
                <div className="absolute -top-2 -right-2 bg-primary text-white text-[9px] px-1.5 py-0.5 rounded-full shadow-sm">
                  AI Suggested
                </div>
                <p className="text-[10px] text-tertiary-container font-bold mb-0.5">11:00 AM - 2h</p>
                <p className="text-[13px] text-tertiary-container font-bold leading-tight">Biology Deep Dive</p>
                <div className="flex items-center gap-1 mt-2 text-on-tertiary-container">
                  <span className="material-symbols-outlined text-[13px]">timer</span>
                  <span className="text-[10px] font-semibold">4 Pomodoros</span>
                </div>
              </div>

              {/* Wednesday - Empty */}
              <div className="col-start-3"></div>

              {/* Thursday */}
              <div className="col-start-4 mt-xs p-xs bg-surface-container-low rounded-md border border-outline-variant/20 h-fit">
                <p className="text-[10px] text-primary font-bold mb-0.5">2:00 PM</p>
                <p className="text-[12px] leading-tight text-on-surface font-semibold">History Essay</p>
              </div>

              {/* Friday */}
              <div className="col-start-5 mt-xs p-xs bg-surface-container-low rounded-md border border-outline-variant/20 h-fit">
                <p className="text-[10px] text-primary font-bold mb-0.5">10:00 AM</p>
                <p className="text-[12px] leading-tight text-on-surface font-semibold">Chemistry Lab Prep</p>
              </div>
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
