'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';

export default function SearchPage() {
  const { fetchData, joinStudyRoom } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'tasks' | 'rooms' | 'sessions' | 'tickets'>('all');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<{
    tasks: any[];
    rooms: any[];
    sessions: any[];
    tickets: any[];
  }>({ tasks: [], rooms: [], sessions: [], tickets: [] });

  // Data Management states
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isWipeConfirmOpen, setIsWipeConfirmOpen] = useState(false);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error' | ''; message: string }>({ type: '', message: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dynamic search fetch
  const performSearch = async (q: string) => {
    setIsSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data);
      }
    } catch (err) {
      console.error('Failed to run global search:', err);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    performSearch(searchQuery);
  }, [searchQuery]);

  // Data Export
  const handleExportBackup = async () => {
    try {
      const res = await fetch('/api/data/manage');
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `focusflow_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } else {
        alert('Failed to generate export backup');
      }
    } catch (err: any) {
      alert('Error exporting database: ' + err.message);
    }
  };

  // Data Import
  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus({ type: '', message: '' });
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const parsedData = JSON.parse(content);

        const res = await fetch('/api/data/manage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'import', data: parsedData })
        });

        if (res.ok) {
          setImportStatus({ type: 'success', message: 'System backup imported successfully! Syncing state...' });
          await fetchData();
          if (fileInputRef.current) fileInputRef.current.value = '';
        } else {
          const err = await res.json();
          setImportStatus({ type: 'error', message: err.error || 'Import failed. Check schema structure.' });
        }
      } catch (err: any) {
        setImportStatus({ type: 'error', message: 'Invalid JSON file: ' + err.message });
      }
    };

    reader.readAsText(file);
  };

  // Reset Database
  const handleResetDatabase = async () => {
    try {
      const res = await fetch('/api/data/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' })
      });

      if (res.ok) {
        alert('FocusFlow Database reset to factory default values!');
        await fetchData();
        setIsResetConfirmOpen(false);
        setSearchQuery('');
      } else {
        alert('Reset database operation failed');
      }
    } catch (err: any) {
      alert('Error resetting database: ' + err.message);
    }
  };

  // Clear Sessions History
  const handleWipeSessions = async () => {
    try {
      const res = await fetch('/api/data/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear_sessions' })
      });

      if (res.ok) {
        alert('Session logs and study histories wiped successfully!');
        await fetchData();
        setIsWipeConfirmOpen(false);
        setSearchQuery('');
      } else {
        alert('Clear history operation failed');
      }
    } catch (err: any) {
      alert('Error clearing session history: ' + err.message);
    }
  };

  return (
    <div className="space-y-lg pb-xl">
      {/* Header */}
      <div className="mb-lg">
        <h2 className="font-bold text-headline-lg text-primary">Global Search &amp; Data Hub</h2>
        <p className="text-body-md text-on-surface-variant font-medium">
          Query across tasks, rooms, sessions, and tickets. Back up or restore systems.
        </p>
      </div>

      {/* Search Input Bar */}
      <div className="glass-panel rounded-xl p-sm flex flex-col md:flex-row gap-sm items-center shadow-sm">
        <div className="relative w-full flex-1">
          <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-on-surface-variant">
            {isSearching ? 'pending' : 'search'}
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search tasks, study rooms, tags, subjects, or tickets..."
            className="w-full bg-transparent border border-outline-variant/30 rounded-lg py-2 pl-[40px] pr-sm focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all text-label-sm font-semibold"
          />
        </div>
        
        {/* Category Filters */}
        <div className="flex gap-xs w-full md:w-auto overflow-x-auto pb-xs md:pb-0">
          {[
            { id: 'all', label: 'All' },
            { id: 'tasks', label: 'Tasks' },
            { id: 'rooms', label: 'Rooms' },
            { id: 'sessions', label: 'Sessions' },
            { id: 'tickets', label: 'Tickets' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-md py-1.5 rounded-lg text-label-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'border border-outline-variant/35 text-on-surface hover:bg-slate-100 bg-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results Container */}
      <div className="glass-panel rounded-xl p-md">
        <div className="flex justify-between items-center mb-md pb-sm border-b border-outline-variant/20">
          <span className="text-primary border-b-2 border-primary pb-sm font-bold text-label-md">
            Query Matches
          </span>
        </div>

        <div className="space-y-lg">
          {/* Tasks Results */}
          {(activeTab === 'all' || activeTab === 'tasks') && searchResults.tasks?.length > 0 && (
            <div className="space-y-sm">
              <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                Tasks ({searchResults.tasks.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
                {searchResults.tasks.map(task => (
                  <div key={task.id} className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-md relative group">
                    <div className="flex justify-between items-start mb-sm">
                      <span className="px-2 py-0.5 bg-surface-variant text-on-surface-variant text-[10px] font-bold rounded-full">
                        {task.subject}
                      </span>
                      <span className={`text-[10px] font-bold ${task.completed ? 'text-secondary' : 'text-amber-600'}`}>
                        {task.completed ? 'Completed' : 'Pending'}
                      </span>
                    </div>
                    <h4 className="font-bold text-label-md text-primary line-clamp-1">{task.title}</h4>
                    <p className="text-[11px] text-on-surface-variant font-semibold mt-sm">
                      Focus duration estimate: {task.estimatedPomodoros} Pomodoro block(s).
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rooms Results */}
          {(activeTab === 'all' || activeTab === 'rooms') && searchResults.rooms?.length > 0 && (
            <div className="space-y-sm">
              <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                Study Rooms ({searchResults.rooms.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
                {searchResults.rooms.map(room => (
                  <div key={room.id} className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-md relative flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="material-symbols-outlined text-secondary font-bold">groups</span>
                        <span className="text-[10px] bg-secondary/15 text-secondary font-bold px-2 py-0.5 rounded">
                          {room.activeUsers} studying
                        </span>
                      </div>
                      <h4 className="font-bold text-label-md text-primary">{room.name}</h4>
                      <p className="text-[10px] text-on-surface-variant mt-1 font-semibold">Soundscape: {room.ambientSound}</p>
                      
                      <div className="flex flex-wrap gap-xs my-sm">
                        {room.tags.map((tag: string) => (
                          <span key={tag} className="px-1.5 py-0.5 bg-slate-100 rounded text-[9px] font-bold text-slate-600">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        joinStudyRoom(room.id);
                        alert(`Joined ${room.name}! Head over to the Virtual Rooms module.`);
                      }}
                      className="mt-md w-full py-1.5 text-center text-xs font-bold text-primary hover:bg-slate-100 border border-outline-variant/30 rounded-lg cursor-pointer transition-colors"
                    >
                      Connect to Room
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sessions Results */}
          {(activeTab === 'all' || activeTab === 'sessions') && searchResults.sessions?.length > 0 && (
            <div className="space-y-sm">
              <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                Study Sessions ({searchResults.sessions.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
                {searchResults.sessions.map(session => (
                  <div key={session.id} className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-md">
                    <span className="text-[9px] text-slate-400 font-bold block mb-1">
                      {new Date(session.startTime).toLocaleDateString()} &bull; {new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <h4 className="font-bold text-label-md text-primary line-clamp-1">{session.taskTitle}</h4>
                    
                    <div className="flex justify-between items-center mt-md text-xs font-semibold text-on-surface-variant">
                      <span>Duration: {session.durationMinutes} mins</span>
                      <span className="text-secondary font-bold">Score: {session.focusScore}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tickets Results */}
          {(activeTab === 'all' || activeTab === 'tickets') && searchResults.tickets?.length > 0 && (
            <div className="space-y-sm">
              <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                Support Tickets ({searchResults.tickets.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                {searchResults.tickets.map(ticket => (
                  <div key={ticket.id} className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-md">
                    <div className="flex justify-between items-start mb-sm">
                      <span className="text-[9px] text-slate-400 font-semibold">{new Date(ticket.timestamp).toLocaleDateString()}</span>
                      <span className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded ${ticket.status === 'Open' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500'}`}>
                        {ticket.status}
                      </span>
                    </div>
                    <h4 className="font-bold text-label-md text-primary line-clamp-1">{ticket.subject}</h4>
                    <p className="text-label-sm text-on-surface-variant font-medium mt-xs line-clamp-2">{ticket.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {searchResults.tasks?.length === 0 && searchResults.rooms?.length === 0 && searchResults.sessions?.length === 0 && searchResults.tickets?.length === 0 && (
            <div className="text-center py-xl text-on-surface-variant/50">
              <span className="material-symbols-outlined text-4xl text-slate-300 block mb-sm">search_off</span>
              <p className="font-semibold text-label-md">No matches found for "{searchQuery}"</p>
              <p className="text-xs font-medium mt-xs">Try broadening your search term or checking filters.</p>
            </div>
          )}
        </div>
      </div>

      {/* Data Management Hub */}
      <div className="glass-panel rounded-xl p-md border border-outline-variant/30 shadow-md">
        <h3 className="font-bold text-headline-md text-primary mb-xs flex items-center gap-xs">
          <span className="material-symbols-outlined font-bold text-primary">database</span>
          Data &amp; Integrity Management Hub
        </h3>
        <p className="text-label-sm text-on-surface-variant font-medium mb-lg">
          Back up, restore, or wipe FocusFlow datasets. Ensure system stability and settings synchronization.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
          {/* Backup Panel */}
          <div className="bg-surface-bright rounded-lg border border-outline-variant/30 p-sm flex flex-col justify-between shadow-sm">
            <div>
              <span className="material-symbols-outlined text-primary mb-xs">cloud_download</span>
              <h4 className="font-bold text-label-md text-primary">Export Settings Backup</h4>
              <p className="text-xs text-on-surface-variant mt-xs leading-relaxed font-semibold">
                Download a full system JSON containing tasks, Streaks, study sessions, and coin balances.
              </p>
            </div>
            <button
              onClick={handleExportBackup}
              className="mt-md w-full py-2 bg-primary hover:bg-primary/90 text-on-primary font-bold text-xs rounded-lg flex items-center justify-center gap-xs cursor-pointer shadow-sm active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-sm font-bold">download</span>
              Download JSON Backup
            </button>
          </div>

          {/* Import Panel */}
          <div className="bg-surface-bright rounded-lg border border-outline-variant/30 p-sm flex flex-col justify-between shadow-sm">
            <div>
              <span className="material-symbols-outlined text-secondary mb-xs">cloud_upload</span>
              <h4 className="font-bold text-label-md text-primary">Import Settings Backup</h4>
              <p className="text-xs text-on-surface-variant mt-xs leading-relaxed font-semibold">
                Upload a FocusFlow JSON backup. All settings and databases will synchronize instantly.
              </p>
            </div>
            <div className="mt-md space-y-sm">
              <input
                type="file"
                ref={fileInputRef}
                accept=".json"
                onChange={handleImportBackup}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2 border border-outline-variant/35 hover:bg-slate-100 text-primary font-bold text-xs rounded-lg flex items-center justify-center gap-xs cursor-pointer active:scale-95 transition-all bg-white"
              >
                <span className="material-symbols-outlined text-sm font-bold">upload_file</span>
                Select JSON Backup
              </button>
              {importStatus.message && (
                <p className={`text-[10px] font-bold ${importStatus.type === 'success' ? 'text-secondary' : 'text-red-500'}`}>
                  {importStatus.message}
                </p>
              )}
            </div>
          </div>

          {/* Wipe & Reset panel */}
          <div className="bg-surface-bright rounded-lg border border-outline-variant/30 p-sm flex flex-col justify-between shadow-sm">
            <div>
              <span className="material-symbols-outlined text-red-500 mb-xs">dangerous</span>
              <h4 className="font-bold text-label-md text-primary">System Factory Actions</h4>
              <p className="text-xs text-on-surface-variant mt-xs leading-relaxed font-semibold">
                Restore FocusFlow database defaults, delete custom study rooms, or clear all focus logs.
              </p>
            </div>
            <div className="mt-md flex gap-xs">
              <button
                onClick={() => setIsWipeConfirmOpen(true)}
                className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg cursor-pointer active:scale-95 transition-all text-center"
              >
                Clear History
              </button>
              <button
                onClick={() => setIsResetConfirmOpen(true)}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg cursor-pointer active:scale-95 transition-all text-center"
              >
                Reset Database
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog - Reset Database */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-md">
          <div className="bg-white dark:bg-slate-900 border border-outline-variant/35 rounded-2xl p-lg w-full max-w-[450px] shadow-2xl">
            <h3 className="font-bold text-headline-md text-red-600 mb-xs flex items-center gap-xs">
              <span className="material-symbols-outlined font-bold">warning</span>
              Reset Database to Factory Defaults?
            </h3>
            <p className="text-label-sm text-on-surface-variant font-medium leading-relaxed mb-md">
              Warning: This action will destroy all custom configurations, tasks, rewards logs, streak records, and newly created virtual rooms. This cannot be undone.
            </p>
            <div className="flex gap-sm justify-end">
              <button
                onClick={() => setIsResetConfirmOpen(false)}
                className="px-md py-sm rounded-lg border border-outline-variant/30 text-primary font-bold text-xs hover:bg-slate-50 cursor-pointer"
              >
                Keep Settings
              </button>
              <button
                onClick={handleResetDatabase}
                className="px-md py-sm bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg cursor-pointer shadow-md"
              >
                Wipe Everything
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog - Wipe Sessions */}
      {isWipeConfirmOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-md">
          <div className="bg-white dark:bg-slate-900 border border-outline-variant/35 rounded-2xl p-lg w-full max-w-[450px] shadow-2xl">
            <h3 className="font-bold text-headline-md text-slate-900 dark:text-slate-100 mb-xs flex items-center gap-xs">
              <span className="material-symbols-outlined font-bold text-amber-500">history</span>
              Wipe Study History Logs?
            </h3>
            <p className="text-label-sm text-on-surface-variant font-medium leading-relaxed mb-md">
              This action will clear only your focus session logs and dashboard analytical grids. Your tasks, Streaks, coin balance, and active rooms list will remain intact.
            </p>
            <div className="flex gap-sm justify-end">
              <button
                onClick={() => setIsWipeConfirmOpen(false)}
                className="px-md py-sm rounded-lg border border-outline-variant/30 text-primary font-bold text-xs hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleWipeSessions}
                className="px-md py-sm bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg cursor-pointer shadow-md"
              >
                Clear History Logs
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
