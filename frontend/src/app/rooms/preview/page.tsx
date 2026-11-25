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
  coinsLimit?: number;
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

  // File Upload Modal States
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState('');

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
      const res = await joinStudyRoom(id);
      if (res && !res.success) {
        alert(res.message);
      }
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      if (!uploadTitle.trim()) {
        setUploadTitle(file.name);
      }
    }
  };

  const handleRoomFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      alert('Please choose a file to upload');
      return;
    }

    setIsUploading(true);
    setUploadSuccessMsg('');

    try {
      const reader = new FileReader();
      reader.readAsDataURL(uploadFile);
      reader.onload = async () => {
        try {
          const base64Data = reader.result as string;
          const fileExt = uploadFile.name.split('.').pop()?.toLowerCase();
          let fType = 'pdf';
          if (fileExt === 'mp4' || fileExt === 'mov') fType = 'video';
          else if (fileExt === 'txt' || fileExt === 'md') fType = 'note';
          else if (fileExt === 'doc' || fileExt === 'docx') fType = 'paper';

          const res = await fetch(`/api/student/rooms/${id}/files`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: uploadTitle.trim() || uploadFile.name,
              filename: uploadFile.name,
              fileData: base64Data,
              fileType: fType,
              size: `${(uploadFile.size / (1024 * 1024)).toFixed(2)} MB`,
              description: uploadDescription.trim() || `Course material for ${data?.roomDetails.title || 'study room'}`
            })
          });

          if (res.ok) {
            setUploadSuccessMsg('File uploaded and saved to database successfully!');
            setUploadFile(null);
            setUploadTitle('');
            setUploadDescription('');
            await fetchRoomData();
            setTimeout(() => {
              setShowUploadModal(false);
              setUploadSuccessMsg('');
            }, 1200);
          } else {
            const err = await res.json();
            alert(err.error || 'Upload failed');
          }
        } catch (err: any) {
          console.error(err);
          alert('Failed to complete upload');
        } finally {
          setIsUploading(false);
        }
      };
      reader.onerror = () => {
        alert('Failed to read file from disk');
        setIsUploading(false);
      };
    } catch (err: any) {
      console.error(err);
      alert('Failed to upload file');
      setIsUploading(false);
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
                    <span 
                      key={idx} 
                      className="bg-surface-container border border-outline-variant/30 text-[10px] px-2 py-0.5 rounded text-on-surface-variant font-bold capitalize"
                    >
                      {app}
                    </span>
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
                Files uploaded for this room are saved to the cloud database and instantly downloadable by all students in this session.
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setShowUploadModal(true)}
                className="px-4 py-2 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-98"
              >
                <span className="material-symbols-outlined text-[17px]">upload_file</span>
                Upload File for Students
              </button>
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
                Teachers and scholars can upload lecture notes, assignments, research PDFs, or formula sheets.
              </p>
              <button
                type="button"
                onClick={() => setShowUploadModal(true)}
                className="mt-4 px-4 py-2 bg-primary text-white font-bold text-xs rounded-xl shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                Upload First Material
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {curatedResources.map((r, idx) => (
                <div 
                  key={idx}
                  className="p-4 bg-surface-container-low border border-outline-variant/30 rounded-2xl flex flex-col justify-between hover:shadow-md hover:border-primary/40 transition-all gap-3 group"
                >
                  <div className="flex items-start gap-3">
                    <div className="bg-primary/10 text-primary p-2.5 rounded-xl group-hover:bg-primary group-hover:text-white transition-colors shrink-0">
                      <span className="material-symbols-outlined block text-[22px]">
                        {r.type === 'pdf' ? 'picture_as_pdf' : r.type === 'video' ? 'video_library' : r.type === 'note' ? 'edit_note' : 'description'}
                      </span>
                    </div>
                    <div className="overflow-hidden min-w-0 flex-1">
                      <p className="text-xs font-bold text-on-surface truncate" title={r.title}>{r.title}</p>
                      <div className="flex items-center gap-2 text-[10.5px] text-on-surface-variant font-semibold mt-1 flex-wrap">
                        <span className="uppercase">{r.type}</span>
                        <span>•</span>
                        <span>{r.size}</span>
                        <span>•</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-[12px]">download</span>
                          {r.downloads || 0}
                        </span>
                      </div>
                      {r.aiSummary && (
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-1 font-medium">
                          {r.aiSummary}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Action buttons: Download & View */}
                  <div className="flex items-center gap-2 pt-2 border-t border-outline-variant/20 mt-auto">
                    <a
                      href={`/api/resources/${r.id}/download`}
                      download={r.title}
                      className="flex-1 py-1.5 px-3 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-xs active:scale-98"
                      title="Download file to your device"
                    >
                      <span className="material-symbols-outlined text-[15px]">download</span>
                      Download
                    </a>
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-1.5 px-3 bg-surface hover:bg-surface-container border border-outline-variant/40 rounded-lg text-xs font-semibold text-on-surface flex items-center justify-center gap-1 transition-colors"
                      title="Open and preview in browser"
                    >
                      <span className="material-symbols-outlined text-[15px]">visibility</span>
                      View
                    </a>
                  </div>
                </div>
              ))}

              {/* Upload Another Card */}
              <button 
                type="button"
                onClick={() => setShowUploadModal(true)}
                className="flex flex-col items-center justify-center p-6 bg-surface-container-low/40 border-2 border-dashed border-outline-variant/40 rounded-2xl hover:border-primary/70 hover:bg-surface-container-low transition-all cursor-pointer text-center group min-h-[140px]"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-2 group-hover:bg-primary group-hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-xl">add</span>
                </div>
                <p className="text-xs font-bold text-on-surface">Upload Another File</p>
                <p className="text-[10px] text-on-surface-variant font-medium mt-0.5">PDF, Notes, Papers, Docs</p>
              </button>
            </div>
          )}
        </div>

      </div>

      {/* Upload File Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-outline-variant rounded-2xl p-6 max-w-lg w-full shadow-2xl relative text-on-surface animate-fade-in">
            <button 
              type="button"
              onClick={() => {
                setShowUploadModal(false);
                setUploadSuccessMsg('');
              }}
              className="absolute top-4 right-4 text-on-surface-variant hover:text-on-surface cursor-pointer w-8 h-8 rounded-full flex items-center justify-center hover:bg-outline-variant/20 transition-colors"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
            
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-xl">upload_file</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-on-surface leading-tight">Upload Room Study Material</h3>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Connected to Cloud Firestore Database
                </p>
              </div>
            </div>

            <p className="text-xs text-on-surface-variant mb-4 font-medium leading-relaxed">
              Upload study files for <span className="font-bold text-on-surface">{data?.roomDetails.title}</span>. All students in this room will immediately see and be able to download the material.
            </p>

            {uploadSuccessMsg && (
              <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fade-in">
                <span className="material-symbols-outlined text-base">check_circle</span>
                {uploadSuccessMsg}
              </div>
            )}

            <form onSubmit={handleRoomFileUpload} className="space-y-4">
              {/* File Input */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-on-surface uppercase tracking-wider block">
                  Select File from Computer *
                </label>
                <div className="border-2 border-dashed border-outline-variant hover:border-primary rounded-xl p-4 text-center cursor-pointer relative bg-surface-container-low transition-colors">
                  <input
                    type="file"
                    required
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center justify-center pointer-events-none">
                    <span className="material-symbols-outlined text-2xl text-primary mb-1">attach_file</span>
                    <p className="text-xs font-bold text-on-surface">
                      {uploadFile ? uploadFile.name : 'Click or drag file here'}
                    </p>
                    <p className="text-[10px] text-on-surface-variant mt-0.5">
                      {uploadFile ? `${(uploadFile.size / (1024 * 1024)).toFixed(2)} MB` : 'PDF, DOCX, TXT, PPT, Images, Videos, Notes'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Title Input */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-on-surface uppercase tracking-wider block">
                  Display Title *
                </label>
                <input
                  type="text"
                  required
                  value={uploadTitle}
                  onChange={e => setUploadTitle(e.target.value)}
                  placeholder="e.g. Chapter 4 Practice Exam & Formula Sheet"
                  className="w-full bg-surface-container-low text-on-surface border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none px-3.5 py-2.5"
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-on-surface uppercase tracking-wider block">
                  Instructions or AI Summary Note
                </label>
                <textarea
                  rows={2}
                  value={uploadDescription}
                  onChange={e => setUploadDescription(e.target.value)}
                  placeholder="e.g. Required reading for today's Pomodoro sprint. Key equations on page 3."
                  className="w-full bg-surface-container-low text-on-surface border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none p-3 resize-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 py-2.5 border border-outline-variant hover:bg-surface-container rounded-xl text-xs font-bold text-on-surface transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="flex-1 py-2.5 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl transition-all shadow-md active:scale-98 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {isUploading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Uploading to DB...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">cloud_upload</span>
                      <span>Upload &amp; Share with Students</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
