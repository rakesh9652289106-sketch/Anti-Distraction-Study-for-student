'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
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
  const { joinStudyRoom, joinedRooms, leaveStudyRoom, showNotification, isSidebarCollapsed, setIsSidebarCollapsed, isAssistantOpen, setIsAssistantOpen } = useApp();
  const [data, setData] = useState<RoomData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmails, setInviteEmails] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [hiddenEmbeds, setHiddenEmbeds] = useState<Record<string, boolean>>({});
  const [fullscreenAppId, setFullscreenAppId] = useState<string | null>(null);
  const wasAssistantOpenRef = useRef(false);
  const wasSidebarCollapsedRef = useRef(true);

  const toggleAppFullscreen = (appId: string) => {
    setFullscreenAppId(prev => {
      const next = prev === appId ? null : appId;
      if (next) {
        wasAssistantOpenRef.current = isAssistantOpen;
        wasSidebarCollapsedRef.current = isSidebarCollapsed;
        setIsAssistantOpen(false);
        setIsSidebarCollapsed(true);
      } else {
        if (wasAssistantOpenRef.current) setIsAssistantOpen(true);
        if (!wasSidebarCollapsedRef.current) setIsSidebarCollapsed(false);
      }
      return next;
    });
  };

  useEffect(() => {
    if (!fullscreenAppId) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setFullscreenAppId(null);
        if (wasAssistantOpenRef.current) setIsAssistantOpen(true);
        if (!wasSidebarCollapsedRef.current) setIsSidebarCollapsed(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [fullscreenAppId, setIsAssistantOpen, setIsSidebarCollapsed]);

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

  const { roomDetails, environment, participants, curatedResources } = data;
  const isCurrentlyInThisRoom = joinedRooms.some(r => r.id === id);
  const isInspectRulesMode = searchParams.get('mode') === 'rules' || !isCurrentlyInThisRoom;

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
              type="button"
              onClick={() => router.push('/rooms')}
              className="border border-outline-variant hover:border-primary/60 bg-surface text-on-surface font-semibold text-sm px-6 py-3 rounded-xl hover:bg-surface-container transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              Back
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
                  {environment.allowedApps.map((app, idx) => {
                    const appLinks: Record<string, { label: string; url: string }> = {
                      faceprep: { label: 'FACE Prep', url: 'https://student.faceprep.in/auth' },
                      hackerrank: { label: 'HackerRank', url: 'https://www.hackerrank.com/dashboard' }
                    };
                    const match = appLinks[app];
                    return match ? (
                      <a
                        key={idx}
                        href={match.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-primary/10 border border-primary/30 text-[10px] px-2 py-0.5 rounded text-primary font-bold inline-flex items-center gap-1 hover:bg-primary hover:text-white transition-colors"
                        title={`Open ${match.label}`}
                      >
                        {match.label}
                        <span className="material-symbols-outlined text-[11px]">open_in_new</span>
                      </a>
                    ) : (
                      <span
                        key={idx}
                        className="bg-surface-container border border-outline-variant/30 text-[10px] px-2 py-0.5 rounded text-on-surface-variant font-bold capitalize"
                      >
                        {app}
                      </span>
                    );
                  })}
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

            <div className="flex items-start gap-3">
              <div className="bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 p-2 rounded-xl">
                <span className="material-symbols-outlined block text-[20px]">badge</span>
              </div>
              <div>
                <p className="text-xs font-bold text-on-surface">Room Head</p>
                <p className="text-[11px] text-on-surface-variant font-medium mt-0.5">
                  {roomDetails.roomHead?.name || 'Not Assigned'}
                </p>
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

        {/* Integrated Learning Portals (FACE Prep / HackerRank when enabled for this room) */}
        {!isInspectRulesMode &&
          [
            {
              id: 'faceprep',
              title: 'FACE Prep Student Portal',
              subtitle: 'Access your FACE Prep courses, assessments, and practice modules directly inside this room.',
              url: 'https://student.faceprep.in/auth',
              icon: 'school',
              openLabel: 'Open FACE Prep'
            },
            {
              id: 'hackerrank',
              title: 'HackerRank Coding Dashboard',
              subtitle: 'Solve coding challenges, interview prep kits, and assessments directly inside this room.',
              url: 'https://www.hackerrank.com/dashboard',
              icon: 'code',
              openLabel: 'Open HackerRank'
            }
          ]
            .filter(portal => environment.allowedApps.includes(portal.id))
            .map(portal => {
              const isFullscreen = fullscreenAppId === portal.id;
              const isEmbedVisible = !hiddenEmbeds[portal.id];
              return (
                <div
                  key={portal.id}
                  className={
                    isFullscreen
                      ? `fixed top-16 bottom-0 z-30 bg-surface flex flex-col p-4 transition-all duration-300 ease-in-out shadow-2xl ${
                          isSidebarCollapsed ? 'left-16' : 'left-64'
                        } ${isAssistantOpen ? 'right-80' : 'right-0'}`
                      : 'md:col-span-12 bg-surface border border-outline-variant/40 shadow-sm rounded-2xl p-6 transition-all duration-300 ease-in-out'
                  }
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[22px]">{portal.icon}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-on-surface">{portal.title}</h3>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                            Integrated App
                          </span>
                        </div>
                        <p className="text-xs text-on-surface-variant font-medium mt-0.5">
                          {portal.subtitle}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          if (!isEmbedVisible) setHiddenEmbeds(prev => ({ ...prev, [portal.id]: false }));
                          toggleAppFullscreen(portal.id);
                        }}
                        className="px-3.5 py-2 border border-outline-variant/40 hover:bg-surface-container rounded-xl text-xs font-bold text-on-surface flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
                        </span>
                        {isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
                      </button>
                      {!isFullscreen && (
                        <button
                          type="button"
                          onClick={() => setHiddenEmbeds(prev => ({ ...prev, [portal.id]: !prev[portal.id] }))}
                          className="px-3.5 py-2 border border-outline-variant/40 hover:bg-surface-container rounded-xl text-xs font-bold text-on-surface flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            {isEmbedVisible ? 'visibility_off' : 'visibility'}
                          </span>
                          {isEmbedVisible ? 'Hide Embed' : 'Show Embed'}
                        </button>
                      )}
                      <a
                        href={portal.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-primary hover:bg-primary/90 text-on-primary rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                      >
                        <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                        {portal.openLabel}
                      </a>
                    </div>
                  </div>

                  {isEmbedVisible && (
                    <div className={isFullscreen ? 'flex-1 flex flex-col min-h-0 gap-2' : 'space-y-2'}>
                      {portal.id === 'hackerrank' && (
                        <div className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] font-semibold text-amber-700 dark:text-amber-300 flex items-center justify-between gap-2 flex-wrap">
                          <span className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[15px]">info</span>
                            Google/SSO login inside embeds is blocked by browser third-party cookie rules. Use <strong>Open HackerRank</strong> to sign in with Google.
                          </span>
                        </div>
                      )}
                      <div
                        className={
                          isFullscreen
                            ? 'w-full flex-1 min-h-0 rounded-xl overflow-hidden border border-outline-variant/40 bg-white'
                            : 'w-full h-[650px] rounded-xl overflow-hidden border border-outline-variant/40 bg-white'
                        }
                      >
                        <iframe
                          src={portal.url}
                          title={portal.title}
                          className="w-full h-full border-0"
                          allow="fullscreen; clipboard-read; clipboard-write"
                          allowFullScreen
                          referrerPolicy="no-referrer-when-downgrade"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

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
