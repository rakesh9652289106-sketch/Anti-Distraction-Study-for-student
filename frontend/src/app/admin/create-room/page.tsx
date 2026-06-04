'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import Link from 'next/link';

export default function AdminCreateRoomPage() {
  const { rooms, fetchData } = useApp();
  const [roomName, setRoomName] = useState('');
  const [roomTags, setRoomTags] = useState('');
  const [roomSound, setRoomSound] = useState('Silence');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim()) {
      setError('Room name is required');
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
          activeUsers: 0 // Explicitly set to 0 active users initially
        })
      });

      if (res.ok) {
        setRoomName('');
        setRoomTags('');
        setRoomSound('Silence');
        triggerToast(`Room "${roomName.trim()}" has been deployed!`);
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
    <div className="space-y-lg relative">
      
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
            Configure, deploy, and launch custom study rooms for students to collaborate and focus.
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
        <div className="lg:col-span-5 glass-panel rounded-2xl p-lg border border-[#1E2E4E] bg-[#0d1527]/90 text-slate-200 shadow-2xl flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-headline-md text-white mb-xs flex items-center gap-xs">
              <span className="material-symbols-outlined text-emerald-400 font-bold">add_home_work</span>
              Room Configuration Details
            </h3>
            <p className="text-label-sm text-slate-400 font-medium mb-lg">
              Set properties to initialize the new virtual study environment.
            </p>

            <form onSubmit={handleSubmit} className="space-y-md">
              
              <div className="space-y-xs">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
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
                    placeholder="e.g., Organic Chemistry Sprint"
                    className="w-full bg-[#131D33] border border-[#1E2E4E] focus:border-emerald-500/50 rounded-lg py-2.5 pl-[36px] pr-sm text-slate-200 outline-none text-xs font-semibold placeholder-slate-650 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-xs">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
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
                    placeholder="e.g., Chemistry, Exam Prep, Intense"
                    className="w-full bg-[#131D33] border border-[#1E2E4E] focus:border-emerald-500/50 rounded-lg py-2.5 pl-[36px] pr-sm text-slate-200 outline-none text-xs font-semibold placeholder-slate-650 transition-colors"
                  />
                </div>
                <span className="text-[9px] text-slate-500 font-bold block mt-1">
                  Tags help students filter and locate study themes quickly.
                </span>
              </div>

              <div className="space-y-xs">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Ambient Soundscape Preset
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-[18px]">
                    volume_up
                  </span>
                  <select
                    value={roomSound}
                    onChange={e => setRoomSound(e.target.value)}
                    className="w-full bg-[#131D33] border border-[#1E2E4E] focus:border-emerald-500/50 rounded-lg py-2.5 pl-[36px] pr-sm text-slate-200 outline-none text-xs font-semibold transition-colors cursor-pointer appearance-none"
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

              {error && (
                <div className="flex gap-sm p-sm bg-red-950/20 border border-red-900/30 rounded-lg text-red-400 text-[11px] font-semibold">
                  <span className="material-symbols-outlined text-[16px] shrink-0">error</span>
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 mt-sm bg-[#5FE29C] hover:bg-[#4CD08A] text-[#0A101D] font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-lg active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-[#0A101D]/20 border-t-[#0A101D] rounded-full animate-spin"></div>
                    Deploying Environment...
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

        {/* Existing Rooms List (7 columns) */}
        <div className="lg:col-span-7 glass-panel rounded-2xl p-lg border border-[#1E2E4E] bg-[#0d1527]/90 text-slate-200 shadow-2xl flex flex-col">
          <h3 className="font-bold text-headline-md text-white mb-md flex items-center gap-xs">
            <span className="material-symbols-outlined text-secondary">forum</span>
            Active Web Environments ({rooms.length})
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-medium border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                  <th className="pb-sm pl-xs">Room ID / Name</th>
                  <th className="pb-sm">Ambient Preset</th>
                  <th className="pb-sm">Tags</th>
                  <th className="pb-sm">Active Students</th>
                  <th className="pb-sm pr-xs text-right">Delete</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map(room => (
                  <tr key={room.id} className="border-b border-slate-900/50 hover:bg-[#131d33]/25 transition-colors">
                    <td className="py-sm pl-xs">
                      <div className="font-bold text-white text-xs">{room.name}</div>
                      <div className="text-[9px] font-mono text-slate-500 mt-0.5">{room.id}</div>
                    </td>
                    <td className="py-sm text-slate-350">{room.ambientSound}</td>
                    <td className="py-sm">
                      <div className="flex flex-wrap gap-xs">
                        {room.tags.map(tag => (
                          <span key={tag} className="px-1.5 py-0.5 bg-[#1b2e46] text-slate-300 rounded text-[9px] font-bold">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-sm">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${room.activeUsers > 0 ? 'text-secondary' : 'text-slate-500'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${room.activeUsers > 0 ? 'bg-secondary animate-pulse' : 'bg-slate-700'}`}></span>
                        {room.activeUsers} studying
                      </span>
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
                      No active rooms found on the portal. Use the form to deploy one.
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
