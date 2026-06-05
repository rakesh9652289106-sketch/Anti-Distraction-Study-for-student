'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import Link from 'next/link';

export default function AdminCreateRoomPage() {
  const { rooms, fetchData } = useApp();
  
  // General details
  const [roomName, setRoomName] = useState('');
  const [roomTags, setRoomTags] = useState('');
  const [roomSound, setRoomSound] = useState('Silence');
  const [hostName, setHostName] = useState('Prof. Alex Rivera');
  
  // Environmental details (merged from group environments)
  const [maxCapacity, setMaxCapacity] = useState(20);
  const [focusMode, setFocusMode] = useState('Standard Lock');
  const [sessionDuration, setSessionDuration] = useState('90m Focus / 15m Insight Exchange');
  const [allowScreenShare, setAllowScreenShare] = useState(true);
  const [videoStreamRequired, setVideoStreamRequired] = useState(false);
  const [chatModerationFilter, setChatModerationFilter] = useState(true);
  const [censorWords, setCensorWords] = useState<string[]>(['spam', 'cheat', 'abuse', 'slack', 'tiktok']);
  const [newCensorWord, setNewCensorWord] = useState('');
  const [allowedApps, setAllowedApps] = useState<string[]>(['notion', 'gdocs']);
  const [coinsLimit, setCoinsLimit] = useState(0);

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // Toggle app selection
  const handleToggleApp = (appId: string) => {
    if (allowedApps.includes(appId)) {
      setAllowedApps(allowedApps.filter(id => id !== appId));
    } else {
      setAllowedApps([...allowedApps, appId]);
    }
  };

  // Add censor word chip
  const handleAddCensorWord = (e: React.FormEvent) => {
    e.preventDefault();
    const word = newCensorWord.trim().toLowerCase();
    if (!word) return;
    if (censorWords.includes(word)) {
      triggerToast(`"${word}" is already in the restricted list.`);
      setNewCensorWord('');
      return;
    }
    setCensorWords([...censorWords, word]);
    setNewCensorWord('');
  };

  // Remove censor word chip
  const handleRemoveCensorWord = (word: string) => {
    setCensorWords(censorWords.filter(w => w !== word));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim()) {
      setError('Room name is required');
      return;
    }
    if (allowedApps.length === 0) {
      setError('Select at least one allowed integration app');
      return;
    }
    
    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: roomName.trim(),
          tags: roomTags.split(',').map(t => t.trim()).filter(Boolean),
          ambientSound: roomSound,
          hostName: hostName.trim(),
          activeUsers: 0,
          maxCapacity,
          focusMode,
          sessionDurationFormat: sessionDuration,
          allowScreenShare,
          videoStreamRequired,
          chatModerationFilter,
          censorWords,
          allowedApps,
          coinsLimit
        })
      });

      if (res.ok) {
        setRoomName('');
        setRoomTags('');
        setRoomSound('Silence');
        setHostName('Prof. Alex Rivera');
        setMaxCapacity(20);
        setFocusMode('Standard Lock');
        setSessionDuration('90m Focus / 15m Insight Exchange');
        setAllowScreenShare(true);
        setVideoStreamRequired(false);
        setChatModerationFilter(true);
        setCensorWords(['spam', 'cheat', 'abuse', 'slack', 'tiktok']);
        setAllowedApps(['notion', 'gdocs']);
        setCoinsLimit(0);
        
        triggerToast(`Virtual Study Sanctuary "${roomName.trim()}" has been deployed!`);
        await fetchData();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to deploy room');
      }
    } catch (err: any) {
      setError(err.message || 'Network error encountered during deployment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRoom = async (roomId: string, name: string) => {
    if (!confirm(`Are you sure you want to terminate study room "${name}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/rooms?roomId=${roomId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        triggerToast(`Room "${name}" has been terminated.`);
        await fetchData();
      } else {
        alert('Failed to delete study room.');
      }
    } catch (err: any) {
      alert('Error deleting room: ' + err.message);
    }
  };

  return (
    <div className="space-y-lg relative font-sans">
      
      {/* Dynamic Toast Notification */}
      {showToast && (
        <div className="fixed bottom-6 right-6 bg-[#0D1527] border border-emerald-500/40 text-emerald-400 px-md py-sm rounded-xl shadow-2xl flex items-center gap-xs z-50 animate-bounce">
          <span className="material-symbols-outlined text-sm font-bold">check_circle</span>
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-md pt-sm">
        <div>
          <h2 className="font-bold text-headline-lg text-white">Create Virtual Study Room</h2>
          <p className="text-body-md text-slate-400 font-medium">
            Configure individual study environments with custom policies, permissions, webcam checks, and moderation rules.
          </p>
        </div>
        <Link
          href="/rooms"
          target="_blank"
          className="px-md py-sm bg-slate-900 border border-slate-800 hover:bg-[#131d33] hover:border-slate-700 text-emerald-400 hover:text-emerald-300 font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer transition-all self-start md:self-auto shadow-md"
        >
          <span className="material-symbols-outlined text-sm">open_in_new</span>
          Open Student Portal
        </Link>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Form Container (5 columns) */}
        <div className="lg:col-span-6 glass-panel rounded-2xl p-lg border border-[#1E2E4E] bg-[#0d1527]/90 text-slate-200 shadow-2xl space-y-md">
          <div>
            <h3 className="font-bold text-headline-md text-white mb-xs flex items-center gap-xs">
              <span className="material-symbols-outlined text-emerald-400 font-bold">add_home_work</span>
              Deploy Study Sanctuary
            </h3>
            <p className="text-label-sm text-slate-400 font-medium mb-lg">
              Set general details, access rules, app integrations, and chat rules.
            </p>

            <form onSubmit={handleSubmit} className="space-y-md">
              
              {/* SECTION 1: General Details */}
              <div className="border-b border-slate-800 pb-md space-y-md">
                <span className="text-[10px] font-bold text-emerald-450 uppercase tracking-widest block">
                  1. Room General Details
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-sm">
                  <div className="space-y-xs">
                    <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-widest">
                      Room Name
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-[18px]">
                        meeting_room
                      </span>
                      <input
                        type="text"
                        required
                        value={roomName}
                        onChange={e => setRoomName(e.target.value)}
                        placeholder="e.g., Quantum Physics Prep"
                        className="w-full bg-[#131D33] border border-[#1E2E4E] focus:border-emerald-500/50 rounded-lg py-2 pl-[36px] pr-sm text-slate-200 outline-none text-xs font-semibold placeholder-slate-650"
                      />
                    </div>
                  </div>

                  <div className="space-y-xs">
                    <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-widest">
                      Host Name
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-[18px]">
                        person
                      </span>
                      <input
                        type="text"
                        value={hostName}
                        onChange={e => setHostName(e.target.value)}
                        placeholder="e.g., Prof. Alex Rivera"
                        className="w-full bg-[#131D33] border border-[#1E2E4E] focus:border-emerald-500/50 rounded-lg py-2 pl-[36px] pr-sm text-slate-200 outline-none text-xs font-semibold"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-sm">
                  <div className="space-y-xs">
                    <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-widest">
                      Tags (comma separated)
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-[18px]">
                        label
                      </span>
                      <input
                        type="text"
                        value={roomTags}
                        onChange={e => setRoomTags(e.target.value)}
                        placeholder="Physics, Quantum, Lofi"
                        className="w-full bg-[#131D33] border border-[#1E2E4E] focus:border-emerald-500/50 rounded-lg py-2 pl-[36px] pr-sm text-slate-200 outline-none text-xs font-semibold placeholder-slate-650"
                      />
                    </div>
                  </div>

                  <div className="space-y-xs">
                    <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-widest">
                      Ambient Soundscape Preset
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-[18px]">
                        volume_up
                      </span>
                      <select
                        value={roomSound}
                        onChange={e => setRoomSound(e.target.value)}
                        className="w-full bg-[#131D33] border border-[#1E2E4E] focus:border-emerald-500/50 rounded-lg py-2 pl-[36px] pr-sm text-slate-200 outline-none text-xs font-semibold cursor-pointer appearance-none"
                      >
                        <option value="Silence">Silence</option>
                        <option value="Soft Rain">Soft Rain</option>
                        <option value="Lofi Beats">Lofi Beats</option>
                        <option value="Library Ambient">Library Ambient</option>
                        <option value="Forest Ambient">Forest Ambient</option>
                      </select>
                      <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none text-[18px]">
                        arrow_drop_down
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: Environmental Access Settings */}
              <div className="border-b border-slate-800 pb-md space-y-md">
                <span className="text-[10px] font-bold text-emerald-450 uppercase tracking-widest block">
                  2. Individual Group Rules &amp; Limits
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-sm">
                  {/* Capacity Limit */}
                  <div className="space-y-xs">
                    <div className="flex justify-between text-[10px] font-bold text-slate-450 uppercase tracking-widest">
                      <span>Maximum Room Capacity</span>
                      <span className="text-emerald-400 font-bold">{maxCapacity} Seats</span>
                    </div>
                    <input
                      type="range"
                      min="2"
                      max="50"
                      step="1"
                      value={maxCapacity}
                      onChange={e => setMaxCapacity(parseInt(e.target.value))}
                      className="w-full accent-emerald-500 cursor-pointer h-5 mt-1"
                    />
                  </div>

                  {/* Focus Mode Selection */}
                  <div className="space-y-xs">
                    <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-widest">
                      Focus Lock Severity
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-[18px]">
                        lock
                      </span>
                      <select
                        value={focusMode}
                        onChange={e => setFocusMode(e.target.value)}
                        className="w-full bg-[#131D33] border border-[#1E2E4E] focus:border-emerald-500/50 rounded-lg py-2 pl-[36px] pr-sm text-slate-200 outline-none text-xs font-semibold cursor-pointer appearance-none"
                      >
                        <option value="Standard Lock">Standard Lock (Quiet checks)</option>
                        <option value="AI Active Nudge">AI Active Nudge (Prompt on distractions)</option>
                        <option value="Hard Lock">Hard Lock (Facial camera required)</option>
                      </select>
                      <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none text-[18px]">
                        arrow_drop_down
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-sm">
                  {/* Session Duration format */}
                  <div className="space-y-xs">
                    <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-widest">
                      Session Intervals Format
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-[18px]">
                        schedule
                      </span>
                      <select
                        value={sessionDuration}
                        onChange={e => setSessionDuration(e.target.value)}
                        className="w-full bg-[#131D33] border border-[#1E2E4E] focus:border-emerald-500/50 rounded-lg py-2 pl-[36px] pr-sm text-slate-200 outline-none text-xs font-semibold cursor-pointer appearance-none"
                      >
                        <option value="25m Focus / 5m Discussion">25m Focus / 5m Break</option>
                        <option value="50m Focus / 10m Break">50m Focus / 10m Break</option>
                        <option value="90m Focus / 15m Insight Exchange">90m Focus / 15m Break</option>
                      </select>
                      <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none text-[18px]">
                        arrow_drop_down
                      </span>
                    </div>
                  </div>

                  {/* Coins Entry Requirement */}
                  <div className="space-y-xs">
                    <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-widest">
                      Coins Entry Requirement
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-[18px]">
                        monetization_on
                      </span>
                      <input
                        type="number"
                        min="0"
                        max="1000"
                        value={coinsLimit}
                        onChange={e => setCoinsLimit(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full bg-[#131D33] border border-[#1E2E4E] focus:border-emerald-500/50 rounded-lg py-2 pl-[36px] pr-sm text-slate-200 outline-none text-xs font-semibold placeholder-slate-650"
                        placeholder="e.g. 50"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-sm pt-xs">
                  {/* Toggle switches */}
                  <div className="flex flex-col justify-end gap-2 text-xs">
                    <label className="flex items-center gap-sm cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={allowScreenShare}
                        onChange={() => setAllowScreenShare(!allowScreenShare)}
                        className="rounded border-[#1E2E4E] text-emerald-500 bg-[#131D33] focus:ring-emerald-500/30 w-4 h-4 cursor-pointer"
                      />
                      <span className="font-semibold text-slate-300">Allow Screen Sharing</span>
                    </label>

                    <label className="flex items-center gap-sm cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={videoStreamRequired}
                        onChange={() => setVideoStreamRequired(!videoStreamRequired)}
                        className="rounded border-[#1E2E4E] text-emerald-500 bg-[#131D33] focus:ring-emerald-500/30 w-4 h-4 cursor-pointer"
                      />
                      <span className="font-semibold text-slate-300">Mandatory Camera Feed</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* SECTION 3: App Ecosystem Allowed */}
              <div className="border-b border-slate-800 pb-md space-y-md">
                <span className="text-[10px] font-bold text-emerald-450 uppercase tracking-widest block">
                  3. Allowed App Integrations
                </span>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-xs">
                  {[
                    { id: 'notion', name: 'Notion', icon: 'description' },
                    { id: 'gdocs', name: 'Google Docs', icon: 'drafts' },
                    { id: 'terminal', name: 'Terminal', icon: 'terminal' },
                    { id: 'youtube', name: 'YouTube', icon: 'video_library' }
                  ].map(app => {
                    const isSelected = allowedApps.includes(app.id);
                    return (
                      <button
                        type="button"
                        key={app.id}
                        onClick={() => handleToggleApp(app.id)}
                        className={`flex items-center gap-xs px-sm py-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#1b2e46]/60 border-emerald-500/50 text-white shadow-sm'
                            : 'bg-[#131D33] border-[#1E2E4E] text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <span className="material-symbols-outlined text-sm">{app.icon}</span>
                        <span>{app.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 4: Chat keyword censorship */}
              <div className="pb-sm space-y-md">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-emerald-450 uppercase tracking-widest block">
                    4. Room Chat Moderation Policy
                  </span>
                  
                  <label className="relative inline-flex items-center cursor-pointer scale-90 select-none">
                    <input
                      type="checkbox"
                      checked={chatModerationFilter}
                      onChange={() => setChatModerationFilter(!chatModerationFilter)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                    <span className="ml-2 text-xs font-semibold text-slate-300">Enable Moderation</span>
                  </label>
                </div>

                {chatModerationFilter && (
                  <div className="space-y-sm animate-fade-in">
                    <div className="flex flex-wrap gap-xs min-h-16 max-h-24 overflow-y-auto border border-slate-800/80 p-xs rounded-lg bg-[#131d33]/30">
                      {censorWords.map(word => (
                        <span
                          key={word}
                          className="inline-flex items-center gap-xs px-2 py-0.5 bg-slate-900 border border-slate-800 text-slate-300 text-[10px] font-bold rounded-full"
                        >
                          {word}
                          <button
                            onClick={() => handleRemoveCensorWord(word)}
                            type="button"
                            className="text-red-400 hover:text-red-300 font-bold ml-0.5 cursor-pointer text-[12px]"
                            title={`Remove ${word}`}
                          >
                            &times;
                          </button>
                        </span>
                      ))}
                      {censorWords.length === 0 && (
                        <span className="text-[10px] text-slate-500 italic p-xs font-medium">No chat restrictions defined</span>
                      )}
                    </div>

                    <div className="flex gap-xs">
                      <input
                        type="text"
                        value={newCensorWord}
                        onChange={e => setNewCensorWord(e.target.value)}
                        placeholder="Restrict word (e.g. reddit)"
                        className="flex-1 bg-[#131D33] border border-[#1E2E4E] focus:border-emerald-500/50 rounded-lg py-1 px-sm text-slate-200 outline-none text-xs font-semibold"
                      />
                      <button
                        type="button"
                        onClick={handleAddCensorWord}
                        className="px-md py-1 bg-[#1E2E4E] hover:bg-[#2A3E62] border border-[#2D3E5E] text-white rounded-lg text-xs font-bold cursor-pointer transition-colors"
                      >
                        Add Word
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div className="flex gap-sm p-sm bg-red-950/20 border border-red-900/30 rounded-lg text-red-400 text-[11px] font-semibold leading-relaxed">
                  <span className="material-symbols-outlined text-[16px] shrink-0">error</span>
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 mt-sm bg-[#5FE29C] hover:bg-[#4CD08A] text-[#0A101D] font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-lg active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed font-sans"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-[#0A101D]/20 border-t-[#0A101D] rounded-full animate-spin"></div>
                    Deploying virtual room...
                  </>
                ) : (
                  <>
                    Deploy &amp; Launch Room
                    <span className="material-symbols-outlined text-[16px] font-bold">arrow_forward</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Existing Rooms List (6 columns) */}
        <div className="lg:col-span-6 glass-panel rounded-2xl p-lg border border-[#1E2E4E] bg-[#0d1527]/90 text-slate-200 shadow-2xl flex flex-col h-full min-h-[500px]">
          <h3 className="font-bold text-headline-md text-white mb-md flex items-center gap-xs">
            <span className="material-symbols-outlined text-secondary">forum</span>
            Active Web Environments ({rooms.length})
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-medium border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[9px]">
                  <th className="pb-sm pl-xs">Sanctuary Details</th>
                  <th className="pb-sm">Room Policies</th>
                  <th className="pb-sm text-center">Screen / Cam</th>
                  <th className="pb-sm">Apps Ecosystem</th>
                  <th className="pb-sm pr-xs text-right">Delete</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map(room => (
                  <tr key={room.id} className="border-b border-slate-900/50 hover:bg-[#131d33]/25 transition-colors">
                    <td className="py-sm pl-xs">
                      <div className="font-bold text-white text-xs">{room.name}</div>
                      <div className="text-[9px] font-semibold text-[#5FE29C] mt-0.5">{room.focusMode || 'Standard Lock'}</div>
                      <div className="text-[8px] font-mono text-slate-500">{room.id}</div>
                    </td>
                    <td className="py-sm">
                      <div className="text-[10px] text-slate-350 font-bold">{room.ambientSound}</div>
                      <div className="text-[9px] text-slate-500 font-semibold">{room.sessionDurationFormat || '90m Focus'}</div>
                      <div className="text-[9px] text-slate-400/80 font-bold mt-1">Seats: {room.activeUsers} / {room.maxCapacity || 20}</div>
                      {room.coinsLimit !== undefined && room.coinsLimit > 0 && (
                        <div className="text-[9px] text-amber-400/95 font-bold mt-1 flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-[10px]">monetization_on</span>
                          Min: {room.coinsLimit} Coins
                        </div>
                      )}
                    </td>
                    <td className="py-sm text-center">
                      <div className="flex justify-center items-center gap-1.5">
                        {/* Screen share allowed status */}
                        <span 
                          className={`material-symbols-outlined text-sm font-bold ${room.allowScreenShare !== false ? 'text-emerald-450' : 'text-slate-600'}`}
                          title={room.allowScreenShare !== false ? 'Screen Sharing Enabled' : 'Screen Sharing Blocked'}
                        >
                          {room.allowScreenShare !== false ? 'screen_share' : 'stop_screen_share'}
                        </span>
                        
                        {/* Camera feed mandatory status */}
                        <span 
                          className={`material-symbols-outlined text-sm font-bold ${room.videoStreamRequired ? 'text-emerald-450' : 'text-slate-650'}`}
                          title={room.videoStreamRequired ? 'Camera Stream Mandatory' : 'Camera Stream Optional'}
                        >
                          {room.videoStreamRequired ? 'videocam' : 'videocam_off'}
                        </span>
                        
                        {/* Chat moderation status */}
                        <span 
                          className={`material-symbols-outlined text-sm font-bold ${room.chatModerationFilter !== false ? 'text-emerald-450' : 'text-slate-650'}`}
                          title={room.chatModerationFilter !== false ? 'Chat Moderation Filter Active' : 'Chat Filter Disabled'}
                        >
                          {room.chatModerationFilter !== false ? 'forum' : 'speaker_notes_off'}
                        </span>
                      </div>
                    </td>
                    <td className="py-sm">
                      <div className="flex flex-wrap gap-xs max-w-[120px]">
                        {(room.allowedApps || []).map(app => (
                          <span key={app} className="px-1.5 py-0.5 bg-[#1b2e46] text-slate-300 rounded text-[9px] font-bold uppercase">
                            {app}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-sm pr-xs text-right">
                      <button
                        onClick={() => handleDeleteRoom(room.id, room.name)}
                        className="p-1.5 bg-red-950/20 border border-red-900/30 text-red-400 hover:bg-red-900 hover:text-white rounded-lg transition-all cursor-pointer inline-flex items-center justify-center"
                        title="Delete Room"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
                {rooms.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-xl text-slate-500 font-semibold italic">
                      No active study sanctuaries deployed.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
