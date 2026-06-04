'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';

export default function AdminEnvironmentsConfigPage() {
  const { rooms, fetchData } = useApp();
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomTags, setNewRoomTags] = useState('');
  const [newRoomSound, setNewRoomSound] = useState('Silence');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) {
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
          name: newRoomName.trim(),
          tags: newRoomTags.split(',').map(t => t.trim()).filter(Boolean),
          ambientSound: newRoomSound
        })
      });

      if (res.ok) {
        setNewRoomName('');
        setNewRoomTags('');
        setNewRoomSound('Silence');
        triggerToast('Virtual Study Room registered successfully!');
        await fetchData();
      } else {
        const err = await res.json();
        setError(err.error || 'Failed to create room');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRoom = async (roomId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This will terminate all active sessions inside.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/rooms?roomId=${roomId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        triggerToast(`Room "${name}" has been wiped.`);
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
      
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-6 right-6 bg-[#0D1527] border border-emerald-500/30 text-emerald-450 px-md py-sm rounded-lg shadow-2xl flex items-center gap-xs z-50 animate-bounce">
          <span className="material-symbols-outlined text-sm font-bold">check_circle</span>
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-md pt-sm">
        <div>
          <h2 className="font-bold text-headline-lg text-primary text-white">Panel Configuration: Study Environments</h2>
          <p className="text-body-md text-slate-400 font-medium">
            Manage the list of active virtual study rooms, select ambient background music, and configure tags.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Rooms list manager (8 cols) */}
        <div className="lg:col-span-8 glass-panel rounded-xl p-md border border-slate-800 bg-[#0d1527]/90 text-slate-200 overflow-x-auto">
          <h3 className="font-bold text-headline-md text-white mb-md flex items-center gap-xs">
            <span className="material-symbols-outlined text-secondary">domain</span>
            Active Study Environments ({rooms.length})
          </h3>

          <table className="w-full text-left text-xs font-medium border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                <th className="pb-sm pl-xs">Room Name</th>
                <th className="pb-sm">Soundscape</th>
                <th className="pb-sm">Tags</th>
                <th className="pb-sm">Members</th>
                <th className="pb-sm pr-xs text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map(room => (
                <tr key={room.id} className="border-b border-slate-900/50 hover:bg-[#131d33]/20">
                  <td className="py-sm pl-xs font-bold text-white text-xs">{room.name}</td>
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
                  <td className="py-sm font-semibold text-slate-350">{room.activeUsers} studying</td>
                  <td className="py-sm pr-xs text-right">
                    <button
                      onClick={() => handleDeleteRoom(room.id, room.name)}
                      className="p-1.5 bg-red-950/20 border border-red-900/30 text-red-400 hover:bg-red-900 hover:text-white rounded transition-colors cursor-pointer"
                      title="Wipe Study Room"
                    >
                      <span className="material-symbols-outlined text-sm block">delete</span>
                    </button>
                  </td>
                </tr>
              ))}
              {rooms.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-xl text-slate-500 font-semibold italic">
                    No active study rooms registered. Create one to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Add room form (4 cols) */}
        <div className="lg:col-span-4 glass-panel rounded-xl p-md border border-slate-800 bg-[#0d1527]/90 text-slate-200">
          <h3 className="font-bold text-headline-md text-white mb-xs flex items-center gap-xs">
            <span className="material-symbols-outlined text-secondary">add_circle</span>
            Add Environment
          </h3>
          <p className="text-label-sm text-slate-400 font-medium mb-lg">
            Deploy a new virtual room onto the student portal.
          </p>

          <form onSubmit={handleCreateRoom} className="space-y-md">
            <div className="space-y-xs">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Room Name
              </label>
              <input
                type="text"
                required
                value={newRoomName}
                onChange={e => setNewRoomName(e.target.value)}
                placeholder="e.g. Physics Prep &amp; Lofi"
                className="w-full bg-[#131D33] border border-[#1E2E4E] focus:border-emerald-500/50 rounded-lg py-2 px-sm text-slate-200 outline-none text-xs font-semibold"
              />
            </div>

            <div className="space-y-xs">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Tags (comma separated)
              </label>
              <input
                type="text"
                value={newRoomTags}
                onChange={e => setNewRoomTags(e.target.value)}
                placeholder="e.g. Science, Physics, Lofi"
                className="w-full bg-[#131D33] border border-[#1E2E4E] focus:border-emerald-500/50 rounded-lg py-2 px-sm text-slate-200 outline-none text-xs font-semibold"
              />
            </div>

            <div className="space-y-xs">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Ambient Sound Preset
              </label>
              <select
                value={newRoomSound}
                onChange={e => setNewRoomSound(e.target.value)}
                className="w-full bg-[#131D33] border border-[#1E2E4E] focus:border-emerald-500/50 rounded-lg py-2 px-sm text-slate-200 outline-none text-xs font-semibold"
              >
                <option value="Silence">Silence</option>
                <option value="Soft Rain">Soft Rain</option>
                <option value="Lofi Beats">Lofi Beats</option>
                <option value="Library Ambient">Library Ambient</option>
                <option value="Forest Ambient">Forest Ambient</option>
              </select>
            </div>

            {error && (
              <p className="text-xs font-semibold text-red-400 flex items-center gap-xs">
                <span className="material-symbols-outlined text-[16px]">error</span>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-bold rounded-lg text-xs hover:from-emerald-500 hover:to-emerald-650 cursor-pointer shadow-md disabled:opacity-50"
            >
              {isSubmitting ? 'Creating Room...' : 'Register & Deploy Room'}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
