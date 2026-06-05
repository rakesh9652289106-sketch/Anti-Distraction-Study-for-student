'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import Link from 'next/link';

export default function VirtualRoomsPage() {
  const {
    rooms,
    activeRoom,
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
    const targetName = matched ? matched.name : (rooms[0]?.name || 'Silent Library');

    const res = await joinStudyRoom(targetId);
    if (res && !res.success) {
      alert(res.message);
    } else {
      alert(`Joined Study Hall: ${targetName}`);
    }
    setRoomCode('');
  };

  const handleJoinRoomClick = async (roomId: string, roomName: string) => {
    const res = await joinStudyRoom(roomId);
    if (res && !res.success) {
      alert(res.message);
    } else {
      alert(`Joined Study Hall: ${roomName}`);
    }
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
    <div className="min-h-screen bg-[#f7f9fb] text-[#191c1e] font-sans pb-xl pt-4">
      {/* Hero Section */}
      <section className="relative pt-8 pb-8 overflow-hidden">
        <div className="max-w-[1200px] mx-auto px-6 relative z-10 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-[#091426] tracking-tight mb-4">
            Your Focus Sanctuary Awaits.
          </h1>
          <p className="text-base md:text-lg text-[#45474c] mb-8 max-w-[600px] mx-auto">
            Join a collaborative study session or discover public rooms to maintain your deep work momentum.
          </p>
          
          <form onSubmit={handleJoinByCode} className="max-w-[480px] mx-auto bg-white/80 backdrop-blur-md border border-slate-200/50 p-2 rounded-xl shadow-lg flex flex-col sm:flex-row gap-2">
            <div className="flex-1 relative flex items-center">
              <span className="material-symbols-outlined absolute left-3 text-slate-400">key</span>
              <input 
                type="text" 
                value={roomCode}
                onChange={e => setRoomCode(e.target.value)}
                maxLength={20}
                placeholder="Enter room code (e.g. FOCUS-2024)"
                className="w-full pl-10 pr-4 py-2.5 bg-transparent border-none focus:ring-0 rounded-lg text-sm outline-none placeholder-slate-400"
              />
            </div>
            <button 
              type="submit"
              className="bg-[#091426] hover:bg-slate-800 text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-md active:scale-[0.98] cursor-pointer"
            >
              Join Room
            </button>
          </form>
        </div>
      </section>

      {/* Active Room Sticky Card (If joined) */}
      {activeRoom && (
        <div className="max-w-[1200px] mx-auto px-6 mb-8">
          <div className="bg-[#091426] text-white border border-[#16233c] rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
            <div className="absolute right-0 top-0 w-64 h-64 bg-[#006c49]/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
            
            <div className="flex-1 w-full z-10">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#006c49] text-white flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px] font-bold">check_circle</span>
                  Joined
                </span>
                <span className="text-xs text-slate-350">| Ambient Sound: {activeRoom.ambientSound}</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{activeRoom.name}</h3>
              <p className="text-xs text-slate-300 flex items-center gap-1.5 font-medium">
                <span className="w-2 h-2 rounded-full bg-[#4edea3] animate-pulse"></span>
                {activeRoom.activeUsers} scholars study-synced
              </p>
            </div>

            <div className="flex items-center gap-4 z-10">
              <Link 
                href={`/rooms/preview?id=${activeRoom.id}`}
                className="px-5 py-2.5 bg-[#006c49] hover:bg-[#005236] text-white font-semibold text-xs rounded-xl shadow-lg transition-all flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">visibility</span>
                Enter Workspace
              </Link>
              <button
                onClick={leaveStudyRoom}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-350 hover:text-white font-semibold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">logout</span>
                Leave Room
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main layout */}
      <div className="max-w-[1200px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Discover and recommended rooms list */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Filters and search bar */}
          <section className="space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <h2 className="text-2xl font-bold text-[#091426]">Discover Public Rooms</h2>
              <div className="flex items-center gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-64 bg-slate-200/50 border border-slate-300/40 rounded-full px-3 py-1.5 flex items-center">
                  <span className="material-symbols-outlined text-slate-400 text-[18px] mr-2">search</span>
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search topics or hosts..." 
                    className="w-full bg-transparent border-none outline-none text-xs focus:ring-0 text-slate-800 placeholder-slate-450"
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
                      ? 'bg-[#091426] text-white shadow-sm' 
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
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
              <h3 className="text-xs font-bold text-slate-450 uppercase tracking-widest">Recommended for You</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredRooms.map(room => {
                const isJoined = activeRoom?.id === room.id;
                return (
                  <div key={room.id} className="bg-white/80 border border-slate-200/60 rounded-2xl p-5 flex flex-col justify-between hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md transition-all">
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="text-lg font-bold text-[#091426] line-clamp-1">{room.name}</h4>
                          <p className="text-xs text-slate-500 font-medium mt-0.5">Host: {room.hostName || 'Prof. Alex Rivera'}</p>
                        </div>
                        <div className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1.5 ${
                          room.activeUsers > 0 
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                            : 'bg-slate-50 text-slate-500 border border-slate-100'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${room.activeUsers > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                          {room.activeUsers > 0 ? 'Active' : 'Empty'}
                        </div>
                      </div>

                      {/* Participant Count */}
                      <div className="mb-4 flex items-center justify-between bg-slate-50 border border-slate-100 p-3 rounded-xl text-xs">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">Participants</span>
                          <span className="font-bold text-[#091426]">{room.activeUsers} / {room.maxCapacity || 20} students</span>
                        </div>
                        <div className="flex -space-x-1.5">
                          <div className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[9px] font-bold text-slate-500">A</div>
                          <div className="w-6 h-6 rounded-full bg-slate-300 border-2 border-white flex items-center justify-center text-[9px] font-bold text-slate-600">S</div>
                          <div className="w-6 h-6 rounded-full bg-slate-400 border-2 border-white flex items-center justify-center text-[9px] font-bold text-slate-700">J</div>
                        </div>
                      </div>

                      {/* Allowed Apps */}
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-[10px] text-slate-455 font-bold uppercase tracking-wider">Ecosystem:</span>
                        <div className="flex gap-1.5">
                          {(room.allowedApps || ['notion', 'gdocs']).map((app, idx) => (
                            <span 
                              key={idx} 
                              className="bg-slate-100 border border-slate-200/60 text-[10px] px-2 py-0.5 rounded text-slate-650 font-bold capitalize"
                            >
                              {app}
                            </span>
                          ))}
                        </div>
                      </div>

                      {room.coinsLimit !== undefined && room.coinsLimit > 0 && (
                        <div className="flex items-center gap-1.5 mb-4 text-xs font-bold text-amber-600 bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-xl">
                          <span className="material-symbols-outlined text-sm">monetization_on</span>
                          <span>Entry Cost: {room.coinsLimit} Focus Coins</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Link
                        href={`/rooms/preview?id=${room.id}`}
                        className="flex-1 py-2 border border-slate-200 hover:border-slate-300 text-[#091426] text-center font-bold text-xs rounded-xl hover:bg-slate-50 transition-colors"
                      >
                        Inspect Rules
                      </Link>
                      
                      {!isJoined ? (
                        <button
                          onClick={() => handleJoinRoomClick(room.id, room.name)}
                          className="flex-1 py-2 bg-[#091426] hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                        >
                          Join Study Hall
                        </button>
                      ) : (
                        <button
                          disabled
                          className="flex-1 py-2 bg-emerald-50 border border-emerald-100 text-emerald-650 font-bold text-xs rounded-xl flex items-center justify-center gap-1"
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
                <div className="col-span-2 text-center py-12 bg-white/50 border border-dashed border-slate-300/60 rounded-2xl text-slate-500 font-semibold italic text-sm">
                  No public study spaces match your query.
                </div>
              )}
            </div>
          </section>

        </div>

        {/* Sidebar: Recent Rooms & Goal meters */}
        <aside className="lg:col-span-4 space-y-8">
          
          {/* Recent Rooms list */}
          <section className="bg-white/85 border border-slate-200/60 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-[#091426] font-bold">history</span>
              <h3 className="text-md font-bold text-[#091426]">Recent Rooms</h3>
            </div>
            
            <div className="space-y-2">
              {[
                { name: 'Quantum Mechanics Study', when: 'Joined 2h ago', icon: 'science' },
                { name: 'UI/UX Figma Jam', when: 'Joined yesterday', icon: 'palette' },
                { name: 'Silent Library', when: 'Joined 3 days ago', icon: 'menu_book' }
              ].map((rr, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center gap-3 p-2 rounded-xl border border-transparent hover:border-slate-200/40 hover:bg-slate-50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-[#091426]">
                    <span className="material-symbols-outlined">{rr.icon}</span>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-xs font-bold text-[#091426] truncate">{rr.name}</p>
                    <p className="text-[10px] text-slate-450 font-medium">{rr.when}</p>
                  </div>
                  <span className="material-symbols-outlined text-slate-400 text-sm">chevron_right</span>
                </div>
              ))}
            </div>
          </section>

          {/* Current Flow Goal widget */}
          <section className="bg-white/85 border border-slate-200/60 rounded-2xl p-5 shadow-sm relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Current Flow Goal</h3>
              <div className="flex items-end justify-between mb-2">
                <span className="text-2xl font-bold text-[#091426]">120 <span className="text-xs font-normal text-slate-400">mins/day</span></span>
                <span className="text-xs font-bold text-[#006c49]">{flowGoalPercent}% Complete</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-[#4edea3] h-full rounded-full transition-all duration-1000" style={{ width: `${flowGoalPercent}%` }}></div>
              </div>
            </div>
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-[#006c49]/5 rounded-full blur-2xl"></div>
          </section>

          {/* Aesthetic visual illustration panel */}
          <div className="rounded-2xl overflow-hidden h-48 relative border border-slate-200 shadow-sm">
            <img 
              className="w-full h-full object-cover" 
              alt="Digital study space illustration" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBdmz4xX2p3FOE4sfapASnMR36kK4VOoUTdnPmDye-eLeqwNRB5IHfdWgOfVg_m_BTpDYlmh77jSz2yMlkHogc5Kk6FePp4FoRMWAerZDHWZApQHjhknkqUHts_H8GHet2kSsAKLQoP6AFB3re293dQPRljLqmcakmm4mZjO18qQP1UnsSs_Sa0Pt5JDtND8ZFYAy5XKpzvecG2Xnw6-8jOUHx69YPudti6_RrD5u1GCzcBaEQ10YmTFTezSPVgclV1O7PbEzmkvENN"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#091426]/75 to-transparent flex flex-col justify-end p-4">
              <p className="text-white font-bold text-xs">Aesthetic focus sanctuary</p>
              <p className="text-slate-300 text-[10px] font-medium">Cognitive sustainability &amp; peer accountability</p>
            </div>
          </div>

        </aside>

      </div>
    </div>
  );
}

