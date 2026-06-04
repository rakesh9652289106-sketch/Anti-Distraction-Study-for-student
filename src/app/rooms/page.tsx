'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';

export default function VirtualRoomsPage() {
  const {
    rooms,
    activeRoom,
    joinStudyRoom,
    leaveStudyRoom,
    sendChatMessage,
    timerMinutes,
    timerSeconds,
    isTimerRunning
  } = useApp();

  const [chatInput, setChatInput] = useState('');

  // Modal states for Create Room
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomTags, setNewRoomTags] = useState('');
  const [newRoomSound, setNewRoomSound] = useState('Silence');
  const [createError, setCreateError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) {
      setCreateError('Room name is required');
      return;
    }
    setIsSubmitting(true);
    setCreateError('');
    try {
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newRoomName.trim(),
          tags: newRoomTags.split(',').map(t => t.trim()).filter(Boolean),
          ambientSound: newRoomSound
        })
      });
      if (response.ok) {
        const room = await response.json();
        setNewRoomName('');
        setNewRoomTags('');
        setNewRoomSound('Silence');
        setIsCreateOpen(false);
        await joinStudyRoom(room.id);
      } else {
        const err = await response.json();
        setCreateError(err.error || 'Failed to create room');
      }
    } catch (err: any) {
      setCreateError(err.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendChatMessage(chatInput);
    setChatInput('');
  };

  const formattedTime = `${timerMinutes.toString().padStart(2, '0')}:${timerSeconds.toString().padStart(2, '0')}`;

  return (
    <div className="space-y-lg">
      {/* Hero Header */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-md pt-sm">
        <div>
          <h2 className="font-bold text-headline-xl text-primary tracking-tight mb-xs">Collaborative Flow</h2>
          <p className="text-body-lg text-on-surface-variant max-w-2xl font-medium">
            Join virtual rooms, share accountability, and sustain peak cognitive performance together.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-md py-sm rounded-lg bg-primary hover:bg-primary/95 text-on-primary font-semibold text-label-md cursor-pointer transition-all duration-200 active:scale-95 flex items-center gap-xs shadow-sm border border-transparent"
          >
            <span className="material-symbols-outlined text-sm font-bold">add</span>
            Create Room
          </button>
          {activeRoom && (
            <button
              onClick={leaveStudyRoom}
              className="px-md py-sm rounded-lg border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 font-semibold text-label-md cursor-pointer transition-all duration-200 active:scale-95 flex items-center gap-xs"
            >
              <span className="material-symbols-outlined text-sm font-bold">logout</span>
              Leave Active Room
            </button>
          )}
        </div>
      </section>

      {/* Active Room Detail (When joined) */}
      {activeRoom ? (
        <section className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-lg ambient-shadow flex flex-col md:flex-row items-center justify-between gap-lg relative overflow-hidden">
          <div className="absolute right-0 top-0 w-64 h-64 bg-secondary/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
          
          <div className="flex-1 w-full z-10">
            <div className="flex justify-between items-end mb-sm">
              <div>
                <span className="text-label-sm text-secondary uppercase tracking-widest font-bold flex items-center gap-xs mb-xs">
                  <span className="material-symbols-outlined text-[14px]">flag</span>
                  Active Room: {activeRoom.name}
                </span>
                <h3 className="font-bold text-headline-md text-primary">Marathon Goal Progress</h3>
              </div>
              <span className="text-label-md text-on-surface-variant font-semibold">320 / 500 Mins</span>
            </div>
            <div className="h-2 w-full bg-surface-container-highest rounded-full overflow-hidden">
              <div className="h-full bg-secondary rounded-full" style={{ width: '64%' }}></div>
            </div>
            <p className="text-label-sm text-on-surface-variant mt-sm flex items-center gap-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
              {activeRoom.activeUsers} members study-synced
            </p>
          </div>

          <div className="hidden md:block w-[1px] h-24 bg-outline-variant/30 z-10"></div>

          <div className="flex flex-col items-center justify-center min-w-[200px] z-10">
            <span className="text-label-sm font-semibold text-on-surface-variant mb-xs">Room Timer Sync</span>
            <div className="font-bold text-[64px] leading-none text-primary tracking-tighter tabular-nums mb-sm">
              {formattedTime}
            </div>
            <span className="text-xs font-semibold text-on-surface-variant flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full inline-block ${
                isTimerRunning ? 'bg-secondary animate-pulse' : 'bg-slate-400'
              }`}></span>
              {isTimerRunning ? 'Work Block Active' : 'Room Paused'}
            </span>
          </div>
        </section>
      ) : (
        <section className="bg-slate-100 dark:bg-slate-900 border border-dashed border-outline-variant/30 rounded-xl p-lg text-center">
          <span className="material-symbols-outlined text-4xl text-slate-400 mb-sm">groups</span>
          <h3 className="font-bold text-headline-md text-primary mb-xs">Not Joined in a Study Room</h3>
          <p className="text-label-sm text-on-surface-variant font-semibold mb-md">
            Join one of the community study rooms below to share logs and study with peers.
          </p>
        </section>
      )}

      {/* Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
        
        {/* Left Column (Wide) - Spans 8 cols */}
        <div className="lg:col-span-8 space-y-gutter">
          {/* Virtual Study Rooms */}
          <section className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-md shadow-sm">
            <h3 className="font-bold text-headline-md text-primary mb-md">Discover Rooms</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-sm">
              {rooms.map(room => {
                const isJoined = activeRoom?.id === room.id;
                return (
                  <div
                    key={room.id}
                    className={`border border-outline-variant/30 rounded-lg p-sm hover:border-primary/50 transition-all group bg-surface-bright relative overflow-hidden ${
                      isJoined ? 'border-2 border-secondary' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start mb-sm">
                      <div>
                        <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-surface-container-highest text-on-surface-variant mb-xs">
                          {room.tags[0] || 'Study'}
                        </span>
                        <h4 className="font-bold text-body-lg text-primary">{room.name}</h4>
                      </div>
                      <span className={`flex items-center gap-xs font-bold text-xs px-2 py-0.5 rounded ${
                        isJoined
                          ? 'bg-secondary/15 text-secondary'
                          : 'bg-surface-container-highest text-on-surface-variant'
                      }`}>
                        <span className="material-symbols-outlined text-[13px] font-bold">
                          {isJoined ? 'check_circle' : 'groups'}
                        </span>
                        {isJoined ? 'Joined' : `${room.activeUsers} online`}
                      </span>
                    </div>

                    <p className="text-label-sm text-on-surface-variant mb-md font-semibold line-clamp-2">
                      Ambient soundscape active: <strong>{room.ambientSound}</strong>. Tags: {room.tags.join(', ')}.
                    </p>

                    <div className="flex justify-between items-center mt-auto">
                      <div className="flex -space-x-1.5">
                        <div className="w-5 h-5 rounded-full bg-slate-200 border border-white flex items-center justify-center text-[9px] font-bold text-slate-500">
                          {room.name[0]}
                        </div>
                        <div className="w-5 h-5 rounded-full bg-slate-300 border border-white flex items-center justify-center text-[9px] font-bold text-slate-600">
                          {room.name[1]}
                        </div>
                      </div>
                      {!isJoined && (
                        <button
                          onClick={() => joinStudyRoom(room.id)}
                          className="font-bold text-xs text-primary hover:underline flex items-center gap-xs cursor-pointer"
                        >
                          Join Room
                          <span className="material-symbols-outlined text-[12px] font-bold">arrow_forward</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Live Focus Competition */}
          <section className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-md shadow-sm">
            <div className="flex justify-between items-center mb-md">
              <h3 className="font-bold text-headline-md text-primary flex items-center gap-sm">
                <span className="material-symbols-outlined text-primary font-bold">leaderboard</span>
                Live Leaderboard
              </h3>
            </div>
            
            <div className="space-y-sm">
              <div className="flex items-center gap-sm p-sm rounded-lg bg-surface-bright border border-outline-variant/30 relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-secondary"></div>
                <div className="w-6 text-center font-bold text-label-md text-primary">1</div>
                <div className="w-8 h-8 rounded-full bg-secondary text-white flex items-center justify-center font-bold text-xs">
                  YOU
                </div>
                <div className="flex-1">
                  <h4 className="text-label-md font-bold text-primary">You</h4>
                  <div className="w-full h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
                    <div className="h-full bg-secondary" style={{ width: '85%' }}></div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-bold text-headline-md text-primary">850</span>
                  <p className="text-[10px] text-on-surface-variant font-medium">points</p>
                </div>
              </div>

              <div className="flex items-center gap-sm p-sm rounded-lg hover:bg-slate-50 transition-colors">
                <div className="w-6 text-center font-bold text-label-md text-on-surface-variant">2</div>
                <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs">
                  SJ
                </div>
                <div className="flex-1">
                  <h4 className="text-label-md font-bold text-primary">Sarah J.</h4>
                  <div className="w-full h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
                    <div className="h-full bg-slate-300" style={{ width: '72%' }}></div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-bold text-body-md text-primary">720</span>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column (Narrow) - Spans 4 cols */}
        <div className="lg:col-span-4 flex flex-col gap-gutter">
          {/* Online Co-workers */}
          <section className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-md shadow-sm">
            <div className="flex justify-between items-center mb-sm">
              <h3 className="text-label-sm font-bold text-on-surface-variant uppercase tracking-wider">
                Online Study Buddies
              </h3>
              <span className="w-2.5 h-2.5 rounded-full bg-secondary"></span>
            </div>
            
            <div className="flex gap-sm overflow-x-auto pb-xs pt-xs">
              <div className="relative flex-shrink-0 cursor-pointer">
                <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center font-bold text-xs text-slate-500">
                  A
                </div>
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-secondary border-2 border-white rounded-full"></div>
              </div>
              
              <div className="relative flex-shrink-0 cursor-pointer">
                <div className="w-10 h-10 rounded-full bg-slate-300 border-2 border-white flex items-center justify-center font-bold text-xs text-slate-600">
                  M
                </div>
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-secondary border-2 border-white rounded-full"></div>
              </div>
            </div>
          </section>

          {/* Study Accountability Chat / Log */}
          <section className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl shadow-sm flex flex-col h-[400px]">
            <div className="p-md border-b border-outline-variant/20 flex justify-between items-center bg-slate-50 rounded-t-xl">
              <h3 className="text-label-md font-bold text-primary flex items-center gap-sm">
                <span className="material-symbols-outlined text-on-surface-variant text-[20px]">forum</span>
                Accountability Log
              </h3>
            </div>

            {/* Chat Messages Log */}
            <div className="flex-1 p-md overflow-y-auto space-y-md bg-slate-50/30">
              <div className="flex justify-center">
                <span className="bg-surface-container-highest px-3 py-1 rounded-full text-[10px] font-bold text-on-surface-variant">
                  {activeRoom ? `Joined: ${activeRoom.name}` : 'Join a study room to view chat log'}
                </span>
              </div>

              {activeRoom?.messages.map(msg => {
                const isSelf = msg.user === 'Student';
                const isAI = msg.user === 'AI Tutor';
                return (
                  <div key={msg.id} className={`flex gap-sm ${isSelf ? 'flex-row-reverse' : ''}`}>
                    {isAI ? (
                      <div className="w-8 h-8 rounded-full bg-tertiary/15 text-tertiary flex items-center justify-center shrink-0 border border-tertiary/20 shadow-sm">
                        <span className="material-symbols-outlined text-[15px] font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>
                          smart_toy
                        </span>
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-slate-200 border border-outline-variant/20 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">
                        {msg.user[0]}
                      </div>
                    )}
                    <div className="max-w-[75%]">
                      <div className={`flex items-baseline gap-xs mb-0.5 ${isSelf ? 'justify-end' : ''}`}>
                        {isAI ? (
                          <span className="text-xs font-bold text-tertiary flex items-center gap-1">
                            AI Tutor
                            <span className="bg-tertiary/10 text-tertiary text-[9px] font-extrabold px-1.5 py-0.2 rounded scale-90">BOT</span>
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-primary">{msg.user}</span>
                        )}
                        <span className="text-[9px] text-slate-400">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className={`border rounded-2xl p-sm text-label-sm inline-block shadow-sm leading-relaxed whitespace-pre-wrap ${
                        isSelf
                          ? 'bg-primary border-primary text-white rounded-tr-none'
                          : isAI
                          ? 'bg-gradient-to-br from-tertiary/10 to-tertiary/5 border-tertiary/20 text-on-surface rounded-tl-none font-medium'
                          : 'bg-white border-outline-variant/30 text-on-surface rounded-tl-none'
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Input area */}
            <div className="p-sm border-t border-outline-variant/20 bg-white rounded-b-xl flex flex-col gap-xs">
              {activeRoom && (
                <div className="flex gap-2 items-center px-xs">
                  <button
                    type="button"
                    onClick={() => {
                      if (!chatInput.trim().startsWith('@ai')) {
                        setChatInput(prev => '@ai ' + prev.trim());
                      }
                    }}
                    className="px-2 py-0.5 border border-tertiary/20 bg-tertiary/5 hover:bg-tertiary/10 text-tertiary rounded-full text-[10px] font-bold cursor-pointer flex items-center gap-0.5 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[10px]" style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
                    Tag @ai
                  </button>
                  <span className="text-[9px] text-slate-400 font-semibold">Type @ai to ask AI Tutor</span>
                </div>
              )}
              <form onSubmit={handleSendMessage} className="flex gap-xs w-full">
                <input
                  disabled={!activeRoom}
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  placeholder={activeRoom ? 'Share your study goal...' : 'Join a room first...'}
                  className="w-full bg-surface-bright border border-outline-variant/50 rounded-full py-1.5 px-sm text-label-sm outline-none bg-surface/30 focus:border-primary"
                />
                <button
                  disabled={!activeRoom}
                  type="submit"
                  className="w-8 h-8 rounded-full bg-primary hover:bg-primary/95 disabled:bg-slate-300 text-on-primary flex items-center justify-center cursor-pointer transition-colors shrink-0"
                >
                  <span className="material-symbols-outlined text-[16px] font-bold">send</span>
                </button>
              </form>
            </div>
          </section>
        </div>

      </div>

      {/* Create Room Modal Dialog */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-md">
          <div className="bg-white dark:bg-slate-900 border border-outline-variant/35 rounded-2xl p-lg w-full max-w-[450px] shadow-2xl relative">
            <button
              onClick={() => setIsCreateOpen(false)}
              className="absolute right-md top-md w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 flex items-center justify-center cursor-pointer transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <h3 className="font-bold text-headline-md text-primary mb-xs flex items-center gap-xs">
              <span className="material-symbols-outlined font-bold text-secondary">add_circle</span>
              Create Virtual Study Room
            </h3>
            <p className="text-label-sm text-on-surface-variant mb-md font-medium">
              Create a custom space to study collaboratively with classmates.
            </p>

            <form onSubmit={handleCreateRoom} className="space-y-md">
              <div>
                <label className="block text-xs uppercase font-bold text-slate-500 mb-sm">
                  Room Name
                </label>
                <input
                  type="text"
                  required
                  value={newRoomName}
                  onChange={e => setNewRoomName(e.target.value)}
                  placeholder="e.g. Organic Chemistry Sprint"
                  className="w-full bg-transparent border border-outline-variant/35 rounded-lg py-2 px-sm focus:border-primary outline-none text-label-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs uppercase font-bold text-slate-500 mb-sm">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  value={newRoomTags}
                  onChange={e => setNewRoomTags(e.target.value)}
                  placeholder="e.g. Science, Organic, Intense"
                  className="w-full bg-transparent border border-outline-variant/35 rounded-lg py-2 px-sm focus:border-primary outline-none text-label-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs uppercase font-bold text-slate-500 mb-sm">
                  Ambient Soundscape
                </label>
                <select
                  value={newRoomSound}
                  onChange={e => setNewRoomSound(e.target.value)}
                  className="w-full bg-transparent border border-outline-variant/35 rounded-lg py-2 px-sm focus:border-primary outline-none text-label-sm font-semibold"
                >
                  <option value="Silence">Silence</option>
                  <option value="Soft Rain">Soft Rain</option>
                  <option value="Lofi Beats">Lofi Beats</option>
                  <option value="Library Ambient">Library Ambient</option>
                  <option value="Forest Ambient">Forest Ambient</option>
                </select>
              </div>

              {createError && (
                <p className="text-xs font-semibold text-red-500 flex items-center gap-xs">
                  <span className="material-symbols-outlined text-[16px]">error</span>
                  {createError}
                </p>
              )}

              <div className="flex gap-sm justify-end pt-sm">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-md py-sm rounded-lg border border-outline-variant/30 text-primary font-bold text-xs hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-md py-sm bg-primary hover:bg-primary/90 text-on-primary font-bold text-xs rounded-lg flex items-center gap-xs cursor-pointer shadow-md disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create & Join'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
