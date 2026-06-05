'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useApp } from '@/context/AppContext';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface RoomDetails {
  roomId: string;
  title: string;
  host: string;
  isVerified: boolean;
  activeSession: boolean;
  onlineCount: number;
  maxSeats: number;
  focusIndex: number;
}

interface Environment {
  focusMode: string;
  allowedApps: string[];
  durationFormat: string;
}

interface Participant {
  name: string;
  status: 'focusing' | 'break' | 'offline' | string;
  avatar: string;
}

interface CuratedResource {
  id: string;
  title: string;
  type: 'pdf' | 'video' | 'note' | 'paper' | 'link' | string;
  size: string;
  url: string;
}

interface RoomData {
  roomDetails: RoomDetails;
  environment: Environment;
  participants: Participant[];
  curatedResources: CuratedResource[];
}

function RoomPreviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id') || '';
  const { joinStudyRoom, activeRoom, leaveStudyRoom } = useApp();
  const [data, setData] = useState<RoomData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmails, setInviteEmails] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  const fetchRoomData = async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/student/rooms/${id}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Error fetching preview data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoomData();
  }, [id]);

  const handleJoin = async () => {
    if (!id) return;
    setIsJoining(true);
    try {
      await joinStudyRoom(id);
      setIsJoining(false);
      // Wait briefly, then re-fetch room status
      await fetchRoomData();
    } catch (err) {
      console.error(err);
      setIsJoining(false);
    }
  };

  const handleLeave = async () => {
    try {
      await leaveStudyRoom();
      await fetchRoomData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmails.trim() || !id) return;
    setIsInviting(true);
    try {
      const emailsArr = inviteEmails.split(',').map(em => em.trim()).filter(Boolean);
      const res = await fetch(`/api/student/rooms/${id}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails: emailsArr })
      });
      if (res.ok) {
        alert('Invitations successfully sent to your peers!');
        setInviteEmails('');
        setShowInviteModal(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsInviting(false);
    }
  };

  if (!id) {
    return (
      <div className="text-center py-12 text-slate-505 font-semibold italic">
        Invalid Sanctuary parameters. Missing Room ID.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400 font-mono">
        <div className="w-8 h-8 rounded-full border-2 border-slate-800 border-t-emerald-450 animate-spin mb-4"></div>
        <p className="text-[10px] tracking-widest uppercase">Syncing Sanctuary coordinates...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-slate-505 font-semibold italic">
        Room preview data is currently unavailable.
      </div>
    );
  }

  const { roomDetails, environment, participants, curatedResources } = data;
  const isCurrentlyInThisRoom = activeRoom?.id === id;

  return (
    <div className="min-h-screen bg-[#f7f9fb] text-[#191c1e] font-sans pb-xl pt-4">
      {/* Room Hero Section */}
      <div className="max-w-[1200px] mx-auto px-6 grid grid-cols-1 md:grid-cols-12 gap-8 mt-6">
        <div className="md:col-span-8 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-3">
            <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
              Active Session
            </span>
            <span className="text-slate-500 text-xs font-semibold">• {roomDetails.onlineCount} Scholars Online</span>
          </div>
          
          <h1 className="text-4xl font-extrabold text-[#091426] tracking-tight mb-2">
            {roomDetails.title}
          </h1>
          <p className="text-base text-slate-500 mb-6 flex items-center gap-1.5">
            Hosted by <span className="text-[#091426] font-semibold">{roomDetails.host}</span>
            {roomDetails.isVerified && (
              <span className="material-symbols-outlined text-emerald-600 text-[18px]">verified</span>
            )}
          </p>

          <div className="flex flex-wrap gap-3">
            {!isCurrentlyInThisRoom ? (
              <button 
                onClick={handleJoin}
                disabled={isJoining}
                className="bg-[#091426] hover:bg-slate-800 text-white font-semibold text-sm px-6 py-3 rounded-xl hover:opacity-90 transition-all shadow-md active:scale-[0.98] flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined">login</span>
                {isJoining ? 'Entering...' : 'Join Room'}
              </button>
            ) : (
              <button 
                onClick={handleLeave}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm px-6 py-3 rounded-xl transition-all shadow-md active:scale-[0.98] flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined">check_circle</span>
                Joined (Leave Room)
              </button>
            )}
            <button 
              onClick={() => setShowInviteModal(true)}
              className="border border-slate-200 hover:border-slate-300 bg-white text-[#091426] font-semibold text-sm px-6 py-3 rounded-xl hover:bg-slate-50 transition-all cursor-pointer"
            >
              Invite Peers
            </button>
          </div>
        </div>

        {/* Momentum Indicator card */}
        <div className="md:col-span-4">
          <div className="bg-white/80 border border-slate-200/60 shadow-sm rounded-2xl p-5 relative overflow-hidden h-full min-h-[200px]">
            <div className="absolute top-0 right-0 p-4 opacity-[0.03]">
              <span className="material-symbols-outlined text-[120px]">science</span>
            </div>
            <h3 className="text-md font-bold text-[#091426] mb-4">Session Momentum</h3>
            <div className="flex items-end gap-1.5 h-28 mb-4">
              <div className="flex-1 bg-emerald-500/20 rounded-t h-[40%] hover:bg-emerald-500 transition-all"></div>
              <div className="flex-1 bg-emerald-500/20 rounded-t h-[60%] hover:bg-emerald-500 transition-all"></div>
              <div className="flex-1 bg-emerald-500/20 rounded-t h-[55%] hover:bg-emerald-500 transition-all"></div>
              <div className="flex-1 bg-emerald-500/20 rounded-t h-[80%] hover:bg-emerald-500 transition-all"></div>
              <div className="flex-1 bg-emerald-500/20 rounded-t h-[70%] hover:bg-emerald-500 transition-all"></div>
              <div className="flex-1 bg-emerald-500/20 rounded-t h-[95%] hover:bg-emerald-500 transition-all"></div>
              <div className="flex-1 bg-emerald-500 rounded-t h-[85%] animate-pulse"></div>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-500">Focus Index: {roomDetails.focusIndex}%</span>
              <div className="flex items-center text-[#006c49] font-bold gap-0.5">
                <span className="material-symbols-outlined text-sm">trending_up</span>
                <span>High Flow</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid panels */}
      <div className="max-w-[1200px] mx-auto px-6 grid grid-cols-1 md:grid-cols-12 gap-6 mt-8">
        
        {/* Room settings and environment (5 cols) */}
        <div className="md:col-span-5 bg-white/80 border border-slate-200/60 shadow-sm rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-md font-bold text-[#091426]">Room Environment</h3>
            <span className="material-symbols-outlined text-slate-400">settings</span>
          </div>

          <div className="space-y-5">
            <div className="flex items-start gap-3">
              <div className="bg-red-50 text-red-600 border border-red-100 p-2 rounded-xl">
                <span className="material-symbols-outlined block text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
              </div>
              <div>
                <p className="text-xs font-bold text-[#091426]">Active Focus Mode: {environment.focusMode}</p>
                <p className="text-[11px] text-slate-500 leading-relaxed font-medium mt-0.5">
                  Distractions are strictly blocked. Idle checks are active.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="bg-blue-50 text-blue-600 border border-blue-100 p-2 rounded-xl">
                <span className="material-symbols-outlined block text-[20px]">apps</span>
              </div>
              <div>
                <p className="text-xs font-bold text-[#091426]">Allowed Ecosystem</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {environment.allowedApps.map((app, idx) => (
                    <span 
                      key={idx} 
                      className="bg-slate-100 border border-slate-200/50 text-[10px] px-2 py-0.5 rounded text-slate-650 font-bold capitalize"
                    >
                      {app}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="bg-[#006c49]/10 text-[#006c49] border border-[#006c49]/20 p-2 rounded-xl">
                <span className="material-symbols-outlined block text-[20px]">schedule</span>
              </div>
              <div>
                <p className="text-xs font-bold text-[#091426]">Session Duration</p>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">{environment.durationFormat}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Participant roster (7 cols) */}
        <div className="md:col-span-7 bg-white/80 border border-slate-200/60 shadow-sm rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-md font-bold text-[#091426]">Participant Roster</h3>
            <span className="text-xs font-bold text-slate-450">{roomDetails.onlineCount} / {roomDetails.maxSeats} Seats</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {participants.map((p, idx) => (
              <div key={idx} className="flex items-center gap-3 p-2 hover:bg-slate-50 border border-transparent hover:border-slate-100 rounded-xl transition-all cursor-pointer">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 text-sm overflow-hidden border border-slate-200">
                    {p.name[0]}
                  </div>
                  <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                    p.status === 'focusing' ? 'bg-[#4edea3]' : 'bg-amber-450'
                  }`}></div>
                </div>
                <div>
                  <p className="text-xs font-bold text-[#091426]">{p.name}</p>
                  <p className={`text-[10px] font-bold uppercase tracking-wider ${
                    p.status === 'focusing' ? 'text-[#006c49]' : 'text-amber-600'
                  }`}>
                    {p.status === 'focusing' ? 'Focusing' : 'Short Break'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Curated materials folder (12 cols) */}
        <div className="md:col-span-12 bg-white/80 border border-slate-200/60 shadow-sm rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-md font-bold text-[#091426]">Curated Study Resources</h3>
            <Link 
              href="/library" 
              className="text-[#091426] hover:text-[#006c49] text-xs font-bold flex items-center gap-1.5"
            >
              View Library
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {curatedResources.map((r, idx) => (
              <a 
                href={r.url} 
                target="_blank" 
                key={idx}
                className="flex items-center gap-3 p-4 bg-slate-50/50 border border-slate-200/40 rounded-xl hover:shadow-md transition-shadow group cursor-pointer"
              >
                <div className="bg-[#091426]/5 text-[#091426] p-2.5 rounded-xl group-hover:bg-[#091426] group-hover:text-white transition-colors">
                  <span className="material-symbols-outlined block">
                    {r.type === 'pdf' ? 'picture_as_pdf' : r.type === 'video' ? 'video_library' : 'description'}
                  </span>
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-[#091426] truncate">{r.title}</p>
                  <p className="text-[10px] text-slate-450 uppercase font-semibold mt-0.5">{r.type} • {r.size}</p>
                </div>
              </a>
            ))}

            <Link 
              href="/library" 
              className="flex items-center gap-3 p-4 bg-slate-50/20 border border-dashed border-slate-300 rounded-xl hover:border-[#091426] transition-colors"
            >
              <div className="bg-slate-200/50 text-slate-500 p-2.5 rounded-xl">
                <span className="material-symbols-outlined block">add_circle</span>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-650">Suggest Resource</p>
                <p className="text-[10px] text-slate-455 font-medium">Add document files</p>
              </div>
            </Link>
          </div>
        </div>

      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-[#091426]/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-2xl relative">
            <button 
              onClick={() => setShowInviteModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            <h3 className="text-lg font-bold text-[#091426] mb-2 flex items-center gap-1.5">
              <span className="material-symbols-outlined">mail</span>
              Invite Peers to Study
            </h3>
            <p className="text-xs text-slate-500 mb-4 font-medium leading-relaxed">
              Enter university email addresses separated by commas to distribute dynamic study-sync invites.
            </p>
            <form onSubmit={handleInviteSubmit} className="space-y-4">
              <textarea
                required
                rows={3}
                value={inviteEmails}
                onChange={e => setInviteEmails(e.target.value)}
                placeholder="sara@university.edu, julian@university.edu"
                className="w-full border border-slate-200 focus:border-slate-800 focus:ring-4 focus:ring-slate-800/5 rounded-xl text-xs outline-none p-3 placeholder-slate-400"
              />
              <button 
                type="submit"
                disabled={isInviting}
                className="w-full bg-[#091426] hover:bg-slate-800 text-white font-bold text-xs py-3 rounded-xl transition-all cursor-pointer"
              >
                {isInviting ? 'Sending invites...' : 'Send Invitations'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RoomPreviewPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400 font-mono">
        <div className="w-8 h-8 rounded-full border-2 border-slate-800 border-t-emerald-450 animate-spin mb-4"></div>
        <p className="text-[10px] tracking-widest uppercase">Syncing Sanctuary coordinates...</p>
      </div>
    }>
      <RoomPreviewContent />
    </Suspense>
  );
}
