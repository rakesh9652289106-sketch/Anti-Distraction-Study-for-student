'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import Link from 'next/link';

export default function VirtualRoomsPage() {
  const {
    rooms,
    activeRoom,
    joinedRooms,
    joinStudyRoom,
    leaveStudyRoom,
    settings
  } = useApp();

  const [roomCode, setRoomCode] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('All Topics');
  const [flowGoalPercent, setFlowGoalPercent] = useState(75);

  // Fetch current flow goal metrics
  useEffect(() => {
    fetch('/api/student/flow-goal')
      .then(res => {
        if (res.ok) return res.json();
        return null;
      })
      .then(data => {
        if (data && data.percentage !== undefined) {
          setFlowGoalPercent(data.percentage);
        }
      })
      .catch(err => console.error('Error fetching flow goal:', err));
  }, []);

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode.trim()) return;

    // Find if we have a room matching name or id, otherwise default to first room
    const cleanedCode = roomCode.trim().toLowerCase();
    const matched = rooms.find(r => 
      r.id.toLowerCase() === cleanedCode || 
      r.name.toLowerCase().includes(cleanedCode)
    );

    const targetId = matched ? matched.id : (rooms[0]?.id || 'room-1');

    await joinStudyRoom(targetId);
    setRoomCode('');
  };

  const handleJoinRoomClick = async (roomId: string) => {
    await joinStudyRoom(roomId);
  };

  // Filter logic
  const filteredRooms = rooms.filter(room => {
    const matchesSearch = room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      room.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (room.hostName || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTopic = selectedTopic === 'All Topics' || 
      room.tags.some(tag => tag.toLowerCase() === selectedTopic.toLowerCase());
    
    return matchesSearch && matchesTopic;
  });

  return (
    <div className="w-full text-on-surface font-sans pb-xl pt-2">
      {/* Hero Section */}
      <section className="relative pt-8 pb-8 overflow-hidden">
        <div className="max-w-[1200px] mx-auto px-6 relative z-10 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-on-surface tracking-tight mb-4">
            Your Focus Sanctuary Awaits.
          </h1>
          <p className="text-base md:text-lg text-on-surface-variant mb-8 max-w-[600px] mx-auto">
            Join a collaborative study session or discover public rooms to maintain your deep work momentum.
          </p>
          
          <form onSubmit={handleJoinByCode} className="max-w-[480px] mx-auto bg-surface/90 backdrop-blur-md border border-outline-variant/40 p-2 rounded-xl shadow-lg flex flex-col sm:flex-row gap-2">
            <div className="flex-1 relative flex items-center">
              <span className="material-symbols-outlined absolute left-3 text-on-surface-variant">key</span>
              <input 
                type="text" 
                value={roomCode}
                onChange={e => setRoomCode(e.target.value)}
                maxLength={20}
                placeholder="Enter room code (e.g. FOCUS-2024)"
                className="w-full pl-10 pr-4 py-2.5 bg-transparent border-none focus:ring-0 rounded-lg text-sm outline-none text-on-surface placeholder:text-on-surface-variant/60"
              />
            </div>
            <button 
              type="submit"
              className="bg-primary hover:bg-primary/90 text-on-primary px-6 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-md active:scale-[0.98] cursor-pointer"
            >
              Join Room
            </button>
          </form>
        </div>
      </section>

      {/* Active Joined Rooms Section (Supports Multiple Rooms) */}
      {joinedRooms.length > 0 && (
        <div className="max-w-[1200px] mx-auto px-6 mb-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant">
              Joined Study Halls ({joinedRooms.length})
            </h2>
          </div>

          {joinedRooms.map(room => (
            <div key={room.id} className="bg-surface-container text-on-surface border border-outline-variant rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
              <div className="absolute right-0 top-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
              
              <div className="flex-1 w-full z-10">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-primary text-on-primary flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px] font-bold">check_circle</span>
                    Joined
                  </span>
                  <span className="text-xs text-on-surface-variant">| Ambient Sound: {room.ambientSound}</span>
                </div>
                <h3 className="text-xl font-bold text-on-surface mb-2">{room.name}</h3>
                <p className="text-xs text-on-surface-variant flex items-center gap-1.5 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  {room.activeUsers} scholars study-synced
                </p>
              </div>

              <div className="flex items-center gap-4 z-10">
                <Link 
                  href={`/rooms/preview?id=${room.id}`}
                  className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-on-primary font-semibold text-xs rounded-xl shadow-lg transition-all flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">visibility</span>
                  Enter Workspace
                </Link>
                <button
                  onClick={() => leaveStudyRoom(room.id)}
                  className="px-5 py-2.5 bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-semibold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">logout</span>
                  Leave Room
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main layout */}
      <div className="max-w-[1200px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Discover and recommended rooms list */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Filters and search bar */}
          <section className="space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <h2 className="text-2xl font-bold text-on-surface">Discover Public Rooms</h2>
              <div className="flex items-center gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-64 bg-surface border border-outline-variant/40 rounded-full px-3 py-1.5 flex items-center">
                  <span className="material-symbols-outlined text-on-surface-variant text-[18px] mr-2">search</span>
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search topics or hosts..." 
                    className="w-full bg-transparent border-none outline-none text-xs focus:ring-0 text-on-surface placeholder:text-on-surface-variant/60"
                  />
                </div>
              </div>
            </div>

            {/* Topics horizontal pills */}
            <div className="flex flex-wrap gap-2 pt-1">
              {['All Topics', 'Physics', 'Design', 'Coding', 'Medicine', 'Architecture'].map(topic => (
                <button
                  key={topic}
                  onClick={() => setSelectedTopic(topic)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                    selectedTopic === topic 
                      ? 'bg-primary text-on-primary shadow-sm font-bold' 
                      : 'bg-surface border border-outline-variant/40 text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                  }`}
                >
                  {topic}
                </button>
              ))}
            </div>
          </section>

          {/* Recommended Rooms Grid */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Recommended for You</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredRooms.map(room => {
                const isJoined = joinedRooms.some(jr => jr.id === room.id);
                return (
                  <div key={room.id} className="bg-surface border border-outline-variant/40 rounded-2xl p-5 flex flex-col justify-between hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-md transition-all">
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="text-lg font-bold text-on-surface line-clamp-1">{room.name}</h4>
                          <p className="text-xs text-on-surface-variant font-medium mt-0.5">Host: {room.hostName || 'Prof. Alex Rivera'}</p>
                        </div>
                        <div className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1.5 ${
                          room.activeUsers > 0 
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            : 'bg-surface-container text-on-surface-variant border border-outline-variant/30'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${room.activeUsers > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-outline-variant'}`}></span>
                          {room.activeUsers > 0 ? 'Active' : 'Empty'}
                        </div>
                      </div>

                      {/* Participant Count */}
                      <div className="mb-4 flex items-center justify-between bg-surface-container-low border border-outline-variant/30 p-3 rounded-xl text-xs">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Participants</span>
                          <span className="font-bold text-on-surface">{room.activeUsers} / {room.maxCapacity || 20} students</span>
                        </div>
                        <div className="flex -space-x-1.5">
                          <div className="w-6 h-6 rounded-full bg-surface-container border-2 border-surface flex items-center justify-center text-[9px] font-bold text-on-surface-variant">A</div>
                          <div className="w-6 h-6 rounded-full bg-surface-container-high border-2 border-surface flex items-center justify-center text-[9px] font-bold text-on-surface-variant">S</div>
                          <div className="w-6 h-6 rounded-full bg-surface-container-highest border-2 border-surface flex items-center justify-center text-[9px] font-bold text-on-surface-variant">J</div>
                        </div>
                      </div>

                      {/* Allowed Apps */}
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Ecosystem:</span>
                        <div className="flex gap-1.5">
                          {(room.allowedApps || ['notion', 'gdocs']).map((app, idx) => (
                            <span 
                              key={idx} 
                              className="bg-surface-container border border-outline-variant/30 text-[10px] px-2 py-0.5 rounded text-on-surface-variant font-bold capitalize"
                            >
                              {app}
                            </span>
                          ))}
                        </div>
                      </div>

                      {room.coinsLimit !== undefined && room.coinsLimit > 0 && (
                        <div className="flex items-center gap-1.5 mb-4 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl">
                          <span className="material-symbols-outlined text-sm">monetization_on</span>
                          <span>Entry Cost: {room.coinsLimit} Focus Coins</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Link
                        href={`/rooms/preview?id=${room.id}&mode=rules`}
                        className="flex-1 py-2 border border-outline-variant/40 hover:border-primary/60 text-on-surface text-center font-bold text-xs rounded-xl hover:bg-surface-container transition-colors"
                      >
                        Inspect Rules
                      </Link>
                      
                      {!isJoined ? (
                        <button
                          onClick={() => handleJoinRoomClick(room.id)}
                          className="flex-1 py-2 bg-primary hover:bg-primary/90 text-on-primary font-bold text-xs rounded-xl transition-colors cursor-pointer"
                        >
                          Join Study Hall
                        </button>
                      ) : (
                        <button
                          onClick={() => leaveStudyRoom(room.id)}
                          className="flex-1 py-2 bg-emerald-500/10 hover:bg-red-500/10 border border-emerald-500/20 hover:border-red-500/30 text-emerald-600 dark:text-emerald-400 hover:text-red-500 font-bold text-xs rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-colors"
                          title="Click to leave this room"
                        >
                          <span className="material-symbols-outlined text-sm">check_circle</span>
                          In Session
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {filteredRooms.length === 0 && (
                <div className="col-span-2 text-center py-12 bg-surface/50 border border-dashed border-outline-variant/50 rounded-2xl text-on-surface-variant font-semibold italic text-sm">
                  No public study spaces match your query.
                </div>
              )}
            </div>
          </section>

        </div>

        {/* Sidebar: Recent Rooms & Goal meters */}
        <aside className="lg:col-span-4 space-y-8">
          
          {/* Recent Rooms list */}
          <section className="bg-surface border border-outline-variant/40 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-primary font-bold">history</span>
              <h3 className="text-md font-bold text-on-surface">Recent Rooms</h3>
            </div>
            
            <div className="space-y-2">
              {[
                { name: 'Quantum Mechanics Study', when: 'Joined 2h ago', icon: 'science' },
                { name: 'UI/UX Figma Jam', when: 'Joined yesterday', icon: 'palette' },
                { name: 'Silent Library', when: 'Joined 3 days ago', icon: 'menu_book' }
              ].map((rr, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center gap-3 p-2 rounded-xl border border-transparent hover:border-outline-variant/40 hover:bg-surface-container transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined">{rr.icon}</span>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-xs font-bold text-on-surface truncate">{rr.name}</p>
                    <p className="text-[10px] text-on-surface-variant font-medium">{rr.when}</p>
                  </div>
                  <span className="material-symbols-outlined text-on-surface-variant text-sm">chevron_right</span>
                </div>
              ))}
            </div>
          </section>

          {/* Current Flow Goal widget */}
          <section className="bg-surface border border-outline-variant/40 rounded-2xl p-5 shadow-sm relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">Current Flow Goal</h3>
              <div className="flex items-end justify-between mb-2">
                <span className="text-2xl font-bold text-on-surface">120 <span className="text-xs font-normal text-on-surface-variant">mins/day</span></span>
                <span className="text-xs font-bold text-primary">{flowGoalPercent}% Complete</span>
              </div>
              <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                <div className="bg-primary h-full rounded-full transition-all duration-1000" style={{ width: `${flowGoalPercent}%` }}></div>
              </div>
            </div>
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-primary/5 rounded-full blur-2xl"></div>
          </section>

          {/* Aesthetic visual illustration panel */}
          <div className="rounded-2xl overflow-hidden h-48 relative border border-outline-variant/40 shadow-sm">
            <img 
              className="w-full h-full object-cover" 
              alt="Digital study space illustration" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBdmz4xX2p3FOE4sfapASnMR36kK4VOoUTdnPmDye-eLeqwNRB5IHfdWgOfVg_m_BTpDYlmh77jSz2yMlkHogc5Kk6FePp4FoRMWAerZDHWZApQHjhknkqUHts_H8GHet2kSsAKLQoP6AFB3re293dQPRljLqmcakmm4mZjO18qQP1UnsSs_Sa0Pt5JDtND8ZFYAy5XKpzvecG2Xnw6-8jOUHx69YPudti6_RrD5u1GCzcBaEQ10YmTFTezSPVgclV1O7PbEzmkvENN"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-4">
              <p className="text-white font-bold text-xs">Aesthetic focus sanctuary</p>
              <p className="text-white/80 text-[10px] font-medium">Cognitive sustainability &amp; peer accountability</p>
            </div>
          </div>

        </aside>

      </div>
    </div>
  );
}

