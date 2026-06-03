'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';

export default function SearchPage() {
  const { rooms } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'students' | 'rooms'>('all');

  const mockStudents = [
    { id: '1', name: 'Jane Doe', subject: 'Computer Science', score: 85, status: 'Active' },
    { id: '2', name: 'Alex Smith', subject: 'Architecture', score: 92, status: 'Active' },
    { id: '3', name: 'Maria Kim', subject: 'Literature', score: 65, status: 'Offline' },
    { id: '4', name: 'David Chen', subject: 'Biology', score: 78, status: 'Active' },
    { id: '5', name: 'Elena Rodriguez', subject: 'Physics', score: 88, status: 'Offline' }
  ];

  // Filter students based on query
  const filteredStudents = mockStudents.filter(student =>
    student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter rooms based on query
  const filteredRooms = rooms.filter(room =>
    room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    room.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleExport = () => {
    alert('Exported search results to focusflow_export.csv!');
  };

  return (
    <div className="space-y-lg">
      {/* Header */}
      <div className="mb-lg">
        <h2 className="font-bold text-headline-lg text-primary">Global Search</h2>
        <p className="text-body-md text-on-surface-variant font-medium">
          Search across all users, virtual rooms, and active study reports.
        </p>
      </div>

      {/* Search Input Bar */}
      <div className="glass-panel rounded-xl p-sm flex flex-col md:flex-row gap-sm items-center shadow-sm">
        <div className="relative w-full flex-1">
          <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-on-surface-variant">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search student names, subjects, rooms, tags..."
            className="w-full bg-transparent border border-outline-variant/30 rounded-lg py-2 pl-[40px] pr-sm focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all text-label-sm font-semibold"
          />
        </div>
        
        {/* Category Filters */}
        <div className="flex gap-xs w-full md:w-auto overflow-x-auto pb-xs md:pb-0">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-md py-1.5 rounded-lg text-label-sm font-bold transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'border border-outline-variant/35 text-on-surface hover:bg-slate-100 bg-white'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`px-md py-1.5 rounded-lg text-label-sm font-bold transition-all cursor-pointer ${
              activeTab === 'students'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'border border-outline-variant/35 text-on-surface hover:bg-slate-100 bg-white'
            }`}
          >
            Students
          </button>
          <button
            onClick={() => setActiveTab('rooms')}
            className={`px-md py-1.5 rounded-lg text-label-sm font-bold transition-all cursor-pointer ${
              activeTab === 'rooms'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'border border-outline-variant/35 text-on-surface hover:bg-slate-100 bg-white'
            }`}
          >
            Rooms
          </button>
        </div>
      </div>

      {/* Results Container */}
      <div className="glass-panel rounded-xl p-md">
        {/* Tab Selection Headers */}
        <div className="flex justify-between items-center mb-md pb-sm border-b border-outline-variant/20">
          <div className="flex gap-md">
            <span className="text-primary border-b-2 border-primary pb-sm font-bold text-label-md">
              Search Results
            </span>
          </div>
          
          <button
            onClick={handleExport}
            className="text-on-surface-variant hover:text-primary flex items-center gap-xs font-semibold text-label-sm transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px] font-bold">download</span>
            Export Results
          </button>
        </div>

        {/* Results Grid display */}
        <div className="space-y-lg">
          {/* Students Grid */}
          {(activeTab === 'all' || activeTab === 'students') && (
            <div className="space-y-sm">
              <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                Students ({filteredStudents.length})
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
                {filteredStudents.map(student => (
                  <div
                    key={student.id}
                    className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-md hover:shadow-md transition-all cursor-pointer relative group"
                  >
                    <div className="flex items-center gap-sm mb-md">
                      <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-sm">
                        {student.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <h3 className="font-bold text-label-md text-primary">{student.name}</h3>
                        <p className="text-label-sm text-on-surface-variant font-medium">{student.subject}</p>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-end">
                      <div className="flex-1 mr-md">
                        <p className="text-[10px] text-on-surface-variant mb-1 font-bold">Focus Score</p>
                        <div className="flex items-center gap-xs">
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-secondary rounded-full" style={{ width: `${student.score}%` }}></div>
                          </div>
                          <span className="text-label-sm font-bold text-secondary">{student.score}%</span>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider ${
                        student.status === 'Active' ? 'bg-secondary/15 text-secondary' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {student.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rooms Grid */}
          {(activeTab === 'all' || activeTab === 'rooms') && (
            <div className="space-y-sm pt-md">
              <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                Study Rooms ({filteredRooms.length})
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
                {filteredRooms.map(room => (
                  <div
                    key={room.id}
                    className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-md hover:shadow-md transition-all cursor-pointer relative group"
                  >
                    <div className="flex items-center gap-sm mb-sm">
                      <span className="material-symbols-outlined text-secondary font-bold">groups</span>
                      <div>
                        <h3 className="font-bold text-label-md text-primary">{room.name}</h3>
                        <p className="text-label-sm text-on-surface-variant font-medium">
                          Soundscape: {room.ambientSound}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-xs mb-sm">
                      {room.tags.map(tag => (
                        <span key={tag} className="px-1.5 py-0.5 bg-slate-100 rounded text-[9px] font-bold text-slate-600">
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="flex justify-between items-center text-xs font-semibold text-on-surface-variant">
                      <span>{room.activeUsers} studying live</span>
                      <span className="text-[10px] uppercase font-bold text-secondary bg-secondary/10 px-2 py-0.5 rounded">
                        Open
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
