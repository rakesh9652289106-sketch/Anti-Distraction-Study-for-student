'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useApp } from '@/context/AppContext';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface RoomHeadInfo {
  userId: string;
  name: string;
  email: string;
}

interface JoinedStudentStat {
  userId: string;
  name: string;
  email?: string;
  joinedAt: string;
  gazeStatus: string;
  gazeAlerts: number;
  tabSwitchCount: number;
  focusScore: number;
  lastUpdated: string;
}

interface RoomDetails {
  roomId: string;
  title: string;
  host: string;
  isVerified: boolean;
  activeSession: boolean;
  onlineCount: number;
  maxSeats: number;
  focusIndex: number;
  coinsLimit?: number;
  allowMaterialDownloads?: boolean;
  roomHead?: RoomHeadInfo | null;
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
  downloads?: number;
  createdAt?: string;
  aiSummary?: string;
  ownerId?: string;
  permissions?: {
    viewOnly?: boolean;
    canDownload?: boolean;
    allowAiSummarization?: boolean;
  };
}

interface RoomData {
  roomDetails: RoomDetails;
  environment: Environment;
  participants: Participant[];
  joinedStudents?: JoinedStudentStat[];
  curatedResources: CuratedResource[];
}

function RoomPreviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id') || '';
  const { joinStudyRoom, joinedRooms, leaveStudyRoom, showNotification, isSidebarCollapsed, isAssistantOpen } = useApp();
  const [data, setData] = useState<RoomData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmails, setInviteEmails] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [showFacePrepEmbed, setShowFacePrepEmbed] = useState(true);
  const [isFacePrepFullscreen, setIsFacePrepFullscreen] = useState(false);

  useEffect(() => {
    if (!isFacePrepFullscreen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFacePrepFullscreen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isFacePrepFullscreen]);

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
      await leaveStudyRoom(id);
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
        showNotification('Invitations successfully sent to your peers!', 'success');
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

  const { roomDetails, environment, participants, joinedStudents = [], curatedResources } = data;
  const isCurrentlyInThisRoom = joinedRooms.some(r => r.id === id);
  const isInspectRulesMode = searchParams.get('mode') === 'rules' || !isCurrentlyInThisRoom;

  const isStaffUser =
    typeof window !== 'undefined' &&
    (sessionStorage.getItem('staff_authenticated') === 'true' ||
      localStorage.getItem('staff_authenticated') === 'true');
  const currentStaffId = typeof window !== 'undefined' ? (localStorage.getItem('staff_user_id') || '') : '';
  const currentStaffEmail = typeof window !== 'undefined' ? (localStorage.getItem('staff_user_email') || '').toLowerCase() : '';
  const isAdminUser = typeof window !== 'undefined' && sessionStorage.getItem('admin_authenticated') === 'true';
  const isRoomHead =
    (isStaffUser &&
      Boolean(roomDetails.roomHead) &&
      (roomDetails.roomHead?.userId === currentStaffId ||
        roomDetails.roomHead?.email?.toLowerCase() === currentStaffEmail)) ||
    isAdminUser;

  const avgFocusScore =
    joinedStudents.length > 0
      ? Math.round(joinedStudents.reduce((acc, s) => acc + (s.focusScore || 0), 0) / joinedStudents.length)
      : roomDetails.focusIndex;
  const totalGazeAlerts = joinedStudents.reduce((acc, s) => acc + (s.gazeAlerts || 0), 0);
  const totalTabSwitches = joinedStudents.reduce((acc, s) => acc + (s.tabSwitchCount || 0), 0);

  return (
    <div className="w-full text-on-surface font-sans pb-xl pt-2">
      {/* Room Hero Section */}
      <div className="max-w-[1200px] mx-auto px-6 grid grid-cols-1 md:grid-cols-12 gap-8 mt-6">
        <div className="md:col-span-8 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-3">
            <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
              Active Session
            </span>
            {roomDetails.coinsLimit !== undefined && roomDetails.coinsLimit > 0 && (
              <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">monetization_on</span>
                Entry Cost: {roomDetails.coinsLimit} Coins
              </span>
            )}
            <span className="text-on-surface-variant text-xs font-semibold">• {roomDetails.onlineCount} Scholars Online</span>
          </div>
          
          <h1 className="text-4xl font-extrabold text-on-surface tracking-tight mb-2">
            {roomDetails.title}
          </h1>
          <p className="text-base text-on-surface-variant mb-6 flex items-center gap-1.5">
            Hosted by <span className="text-on-surface font-semibold">{roomDetails.host}</span>
            {roomDetails.isVerified && (
              <span className="material-symbols-outlined text-emerald-500 text-[18px]">verified</span>
            )}
          </p>

          <div className="flex flex-wrap gap-3">
            {!isCurrentlyInThisRoom ? (
              <button 
                onClick={handleJoin}
                disabled={isJoining}
                className="bg-primary hover:bg-primary/90 text-on-primary font-semibold text-sm px-6 py-3 rounded-xl hover:opacity-90 transition-all shadow-md active:scale-[0.98] flex items-center gap-1.5 cursor-pointer"
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
              className="border border-outline-variant hover:border-primary/60 bg-surface text-on-surface font-semibold text-sm px-6 py-3 rounded-xl hover:bg-surface-container transition-all cursor-pointer"
            >
              Invite Peers
            </button>
          </div>
        </div>

        {/* Momentum Indicator card */}
        <div className="md:col-span-4">
          <div className="bg-surface border border-outline-variant/40 shadow-sm rounded-2xl p-5 relative overflow-hidden h-full min-h-[200px]">
            <div className="absolute top-0 right-0 p-4 opacity-[0.03]">
              <span className="material-symbols-outlined text-[120px]">science</span>
            </div>
            <h3 className="text-md font-bold text-on-surface mb-4">Session Momentum</h3>
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
              <span className="font-semibold text-on-surface-variant">Focus Index: {roomDetails.focusIndex}%</span>
              <div className="flex items-center text-primary font-bold gap-0.5">
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
        <div className="md:col-span-5 bg-surface border border-outline-variant/40 shadow-sm rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-md font-bold text-on-surface">Room Environment</h3>
            <span className="material-symbols-outlined text-on-surface-variant">settings</span>
          </div>

          <div className="space-y-5">
            <div className="flex items-start gap-3">
              <div className="bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 p-2 rounded-xl">
                <span className="material-symbols-outlined block text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
              </div>
              <div>
                <p className="text-xs font-bold text-on-surface">Active Focus Mode: {environment.focusMode}</p>
                <p className="text-[11px] text-on-surface-variant leading-relaxed font-medium mt-0.5">
                  Distractions are strictly blocked. Idle checks are active.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 p-2 rounded-xl">
                <span className="material-symbols-outlined block text-[20px]">apps</span>
              </div>
              <div>
                <p className="text-xs font-bold text-on-surface">Allowed Ecosystem</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {environment.allowedApps.map((app, idx) => (
                    app === 'faceprep' ? (
                      <a
                        key={idx}
                        href="https://student.faceprep.in/auth"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-primary/10 border border-primary/30 text-[10px] px-2 py-0.5 rounded text-primary font-bold inline-flex items-center gap-1 hover:bg-primary hover:text-white transition-colors"
                        title="Open FACE Prep Student Portal"
                      >
                        FACE Prep
                        <span className="material-symbols-outlined text-[11px]">open_in_new</span>
                      </a>
                    ) : (
                      <span 
                        key={idx} 
                        className="bg-surface-container border border-outline-variant/30 text-[10px] px-2 py-0.5 rounded text-on-surface-variant font-bold capitalize"
                      >
                        {app}
                      </span>
                    )
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="bg-primary/10 text-primary border border-primary/20 p-2 rounded-xl">
                <span className="material-symbols-outlined block text-[20px]">schedule</span>
              </div>
              <div>
                <p className="text-xs font-bold text-on-surface">Session Duration</p>
                <p className="text-[11px] text-on-surface-variant font-medium mt-0.5">{environment.durationFormat}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Participant roster (7 cols) */}
        <div className="md:col-span-7 bg-surface border border-outline-variant/40 shadow-sm rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-md font-bold text-on-surface">Participant Roster</h3>
            <span className="text-xs font-bold text-on-surface-variant">{roomDetails.onlineCount} / {roomDetails.maxSeats} Seats</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {participants.map((p, idx) => (
              <div key={idx} className="flex items-center gap-3 p-2 hover:bg-surface-container border border-transparent hover:border-outline-variant/30 rounded-xl transition-all cursor-pointer">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center font-bold text-on-surface text-sm overflow-hidden border border-outline-variant/40">
                    {p.name[0]}
                  </div>
                  <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-surface ${
                    p.status === 'focusing' ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}></div>
                </div>
                <div>
                  <p className="text-xs font-bold text-on-surface">{p.name}</p>
                  <p className={`text-[10px] font-bold uppercase tracking-wider ${
                    p.status === 'focusing' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                  }`}>
                    {p.status === 'focusing' ? 'Focusing' : 'Short Break'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Room Head Overall Stats Panel (Visible when Admin grants Room Head access) */}
        {roomDetails.roomHead && isRoomHead && (
          <div className="md:col-span-12 bg-surface border-2 border-primary/40 shadow-md rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-primary text-on-primary text-[10px] font-bold uppercase tracking-wider">
                    Room Head Access
                  </span>
                  <h3 className="text-lg font-bold text-on-surface">Overall Student Focus &amp; Gaze Stats</h3>
                </div>
                <p className="text-xs text-on-surface-variant mt-0.5 font-medium">
                  Assigned Room Head: <span className="font-bold text-on-surface">{roomDetails.roomHead.name}</span> ({roomDetails.roomHead.email})
                </p>
              </div>
              <button
                type="button"
                onClick={fetchRoomData}
                className="px-4 py-2 bg-surface-container hover:bg-surface-container-high border border-outline-variant/40 rounded-xl text-xs font-bold text-on-surface flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">refresh</span>
                Refresh Live Stats
              </button>
            </div>

            {/* Summary KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30">
                <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Joined Students</p>
                <p className="text-2xl font-extrabold text-on-surface mt-1">{joinedStudents.length}</p>
              </div>
              <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30">
                <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Avg Focus Score</p>
                <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">{avgFocusScore}%</p>
              </div>
              <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30">
                <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Total Gaze Alerts</p>
                <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">{totalGazeAlerts}</p>
              </div>
              <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30">
                <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Total Tab Switches</p>
                <p className="text-2xl font-extrabold text-red-600 dark:text-red-400 mt-1">{totalTabSwitches}</p>
              </div>
            </div>

            {/* Per-student Telemetry Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-outline-variant/30 text-[10px] uppercase tracking-wider text-on-surface-variant font-bold">
                    <th className="py-2.5 px-3">Student</th>
                    <th className="py-2.5 px-3">Gaze Status</th>
                    <th className="py-2.5 px-3">Gaze Alerts</th>
                    <th className="py-2.5 px-3">Tab Switch Count</th>
                    <th className="py-2.5 px-3">Focus Score</th>
                    <th className="py-2.5 px-3">Joined At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20">
                  {joinedStudents.length > 0 ? (
                    joinedStudents.map(st => (
                      <tr key={st.userId} className="hover:bg-surface-container-low/60">
                        <td className="py-3 px-3">
                          <div className="font-bold text-on-surface">{st.name}</div>
                          <div className="text-[10px] text-on-surface-variant">{st.email || st.userId}</div>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            st.gazeStatus === 'Focused'
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                              : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                          }`}>
                            {st.gazeStatus || 'Focused'}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-bold text-amber-600 dark:text-amber-400">{st.gazeAlerts ?? 0}</td>
                        <td className="py-3 px-3 font-bold text-red-600 dark:text-red-400">{st.tabSwitchCount ?? 0}</td>
                        <td className="py-3 px-3 font-bold text-emerald-600 dark:text-emerald-400">{st.focusScore ?? 0}%</td>
                        <td className="py-3 px-3 text-on-surface-variant text-[11px]">
                          {new Date(st.joinedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-on-surface-variant italic">
                        No students currently active in this room.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* FACE Prep Integrated Learning Portal (Shown when Admin enabled FACE Prep for this room) */}
        {!isInspectRulesMode && environment.allowedApps.includes('faceprep') && (
          <div
            className={
              isFacePrepFullscreen
                ? `fixed top-16 bottom-0 z-30 bg-surface flex flex-col p-4 transition-all duration-300 ${
                    isSidebarCollapsed ? 'left-16' : 'left-64'
                  } ${isAssistantOpen ? 'right-80' : 'right-0'}`
                : 'md:col-span-12 bg-surface border border-outline-variant/40 shadow-sm rounded-2xl p-6'
            }
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[22px]">school</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-on-surface">FACE Prep Student Portal</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                      Integrated App
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant font-medium mt-0.5">
                    Access your FACE Prep courses, assessments, and practice modules directly inside this room.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    if (!showFacePrepEmbed) setShowFacePrepEmbed(true);
                    setIsFacePrepFullscreen(prev => !prev);
                  }}
                  className="px-3.5 py-2 border border-outline-variant/40 hover:bg-surface-container rounded-xl text-xs font-bold text-on-surface flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {isFacePrepFullscreen ? 'fullscreen_exit' : 'fullscreen'}
                  </span>
                  {isFacePrepFullscreen ? 'Exit Full Screen' : 'Full Screen'}
                </button>
                {!isFacePrepFullscreen && (
                  <button
                    type="button"
                    onClick={() => setShowFacePrepEmbed(prev => !prev)}
                    className="px-3.5 py-2 border border-outline-variant/40 hover:bg-surface-container rounded-xl text-xs font-bold text-on-surface flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {showFacePrepEmbed ? 'visibility_off' : 'visibility'}
                    </span>
                    {showFacePrepEmbed ? 'Hide Embed' : 'Show Embed'}
                  </button>
                )}
                <a
                  href="https://student.faceprep.in/auth"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-primary hover:bg-primary/90 text-on-primary rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                  Open FACE Prep
                </a>
              </div>
            </div>

            {showFacePrepEmbed && (
              <div
                className={
                  isFacePrepFullscreen
                    ? 'w-full flex-1 min-h-0 rounded-xl overflow-hidden border border-outline-variant/40 bg-white'
                    : 'w-full h-[650px] rounded-xl overflow-hidden border border-outline-variant/40 bg-white'
                }
              >
                <iframe
                  src="https://student.faceprep.in/auth"
                  title="FACE Prep Student Portal"
                  className="w-full h-full border-0"
                  allow="fullscreen; clipboard-read; clipboard-write"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            )}
          </div>
        )}

        {/* Curated materials folder (12 cols) */}
        <div className="md:col-span-12 bg-surface border border-outline-variant/40 shadow-sm rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-on-surface">Room Study Materials &amp; Downloads</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  {curatedResources.length} files available
                </span>
              </div>
              <p className="text-xs text-on-surface-variant font-medium mt-0.5">
                {isInspectRulesMode
                  ? 'Confidential preview — only file names are visible while inspecting rules. Join the room and enter workspace to access files.'
                  : roomDetails.allowMaterialDownloads === false
                  ? 'Downloads are disabled for this room — you can view the file names uploaded by the administrator.'
                  : 'Study materials uploaded by the administrator for this room.'}
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <Link 
                href="/library" 
                className="px-3.5 py-2 border border-outline-variant/40 hover:bg-surface-container rounded-xl text-xs font-bold text-on-surface flex items-center gap-1 transition-colors"
              >
                Library
                <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
              </Link>
            </div>
          </div>

          {curatedResources.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-outline-variant/40 rounded-2xl p-6 bg-surface-container-low/30">
              <span className="material-symbols-outlined text-4xl text-on-surface-variant/60 mb-2">folder_open</span>
              <p className="text-sm font-bold text-on-surface">No files uploaded yet for this room</p>
              <p className="text-xs text-on-surface-variant mt-1 max-w-md mx-auto">
                Materials uploaded by the administrator for this room will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {curatedResources.map((r, idx) => {
                const canDownload =
                  !isInspectRulesMode &&
                  roomDetails.allowMaterialDownloads !== false &&
                  r.permissions?.canDownload !== false;
                const viewHref = r.url?.startsWith('http') ? r.url : `/api/resources/${r.id}/view`;
                return (
                  <div 
                    key={idx}
                    className="p-4 bg-surface-container-low border border-outline-variant/30 rounded-2xl flex flex-col justify-between hover:shadow-md hover:border-primary/40 transition-all gap-3 group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="bg-primary/10 text-primary p-2.5 rounded-xl group-hover:bg-primary group-hover:text-white transition-colors shrink-0">
                        <span className="material-symbols-outlined block text-[22px]">
                          {isInspectRulesMode ? 'lock' : r.type === 'pdf' ? 'picture_as_pdf' : r.type === 'video' ? 'video_library' : r.type === 'note' ? 'edit_note' : 'description'}
                        </span>
                      </div>
                      <div className="overflow-hidden min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-on-surface truncate" title={r.title}>{r.title}</p>
                          {isInspectRulesMode ? (
                            <span className="shrink-0 px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[9px] font-bold uppercase tracking-wider">
                              Confidential
                            </span>
                          ) : (r.ownerId === 't-aris-thorne' || r.ownerId === 'instructor-admin') && (
                            <span className="shrink-0 px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold uppercase tracking-wider">
                              Admin
                            </span>
                          )}
                        </div>
                        {!isInspectRulesMode && (
                          <>
                            <div className="flex items-center gap-2 text-[10.5px] text-on-surface-variant font-semibold mt-1 flex-wrap">
                              <span className="uppercase">{r.type}</span>
                              <span>•</span>
                              <span>{r.size}</span>
                              {canDownload && (
                                <>
                                  <span>•</span>
                                  <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
                                    <span className="material-symbols-outlined text-[12px]">download</span>
                                    {r.downloads || 0}
                                  </span>
                                </>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Action button: Download only (hidden in Inspect Rules mode or when room downloads are turned off) */}
                    {!isInspectRulesMode && (
                      <div className="flex items-center gap-2 pt-2 border-t border-outline-variant/20 mt-auto">
                        {canDownload ? (
                          <a
                            href={`/api/resources/${r.id}/download`}
                            download={r.title}
                            className="flex-1 py-1.5 px-3 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-xs active:scale-98"
                            title="Download file to your device"
                          >
                            <span className="material-symbols-outlined text-[15px]">download</span>
                            Download
                          </a>
                        ) : (
                          <span className="flex-1 py-1.5 px-3 bg-surface-container text-on-surface-variant font-bold text-[11px] rounded-lg flex items-center justify-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">lock</span>
                            File Name Only (Downloads Off)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-surface border border-outline-variant rounded-2xl p-6 max-w-md w-full shadow-2xl relative text-on-surface">
            <button 
              onClick={() => setShowInviteModal(false)}
              className="absolute top-4 right-4 text-on-surface-variant hover:text-on-surface cursor-pointer"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            <h3 className="text-lg font-bold text-on-surface mb-2 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary">mail</span>
              Invite Peers to Study
            </h3>
            <p className="text-xs text-on-surface-variant mb-4 font-medium leading-relaxed">
              Enter university email addresses separated by commas to distribute dynamic study-sync invites.
            </p>
            <form onSubmit={handleInviteSubmit} className="space-y-4">
              <textarea
                required
                rows={3}
                value={inviteEmails}
                onChange={e => setInviteEmails(e.target.value)}
                placeholder="sara@university.edu, julian@university.edu"
                className="w-full bg-surface-container-low text-on-surface border border-outline-variant focus:border-primary rounded-xl text-xs outline-none p-3 placeholder:text-on-surface-variant/60"
              />
              <button 
                type="submit"
                disabled={isInviting}
                className="w-full bg-primary hover:bg-primary/90 text-on-primary font-bold text-xs py-3 rounded-xl transition-all cursor-pointer"
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
