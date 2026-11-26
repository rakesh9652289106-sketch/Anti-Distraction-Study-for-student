'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { StudyRoom } from '@/lib/db';

interface RoomMaterial {
  id: string;
  title: string;
  type: string;
  size: string;
  url: string;
  downloads?: number;
}

export default function StaffPortalPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<StudyRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'monitor' | 'chat' | 'materials'>('monitor');
  const [studentSearch, setStudentSearch] = useState('');
  const [studentFilter, setStudentFilter] = useState<'all' | 'attention' | 'focused'>('all');
  const [announcementText, setAnnouncementText] = useState('');
  const [isSendingAnnounce, setIsSendingAnnounce] = useState(false);
  const [roomMaterials, setRoomMaterials] = useState<RoomMaterial[]>([]);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'info' | 'error' } | null>(null);

  const [staffInfo, setStaffInfo] = useState<{
    id: string;
    name: string;
    email: string;
    phone?: string;
    department?: string;
  }>({
    id: '',
    name: 'Staff Member',
    email: '',
    phone: '',
    department: 'General'
  });

  // Edit Profile Modal States
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editDept, setEditDept] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');

  const showToast = (msg: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadRooms = useCallback(async () => {
    try {
      const res = await fetch('/api/rooms');
      if (res.ok) {
        const data: StudyRoom[] = await res.json();
        setRooms(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error loading rooms for staff:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const isStaff =
      sessionStorage.getItem('staff_authenticated') === 'true' ||
      localStorage.getItem('staff_authenticated') === 'true';
    if (!isStaff) {
      router.replace('/login');
      return;
    }

    const loadedInfo = {
      id: localStorage.getItem('staff_user_id') || '',
      name: localStorage.getItem('staff_user_name') || 'Staff Member',
      email: localStorage.getItem('staff_user_email') || '',
      phone: localStorage.getItem('staff_user_phone') || '',
      department: localStorage.getItem('staff_user_dept') || 'General'
    };
    setStaffInfo(loadedInfo);
    setEditName(loadedInfo.name);
    setEditPhone(loadedInfo.phone);
    setEditDept(loadedInfo.department);

    loadRooms();
    const interval = setInterval(loadRooms, 10000);
    return () => clearInterval(interval);
  }, [router, loadRooms]);

  const assignedRooms = rooms.filter(
    r =>
      r.roomHead &&
      (r.roomHead.userId === staffInfo.id ||
        r.roomHead.email?.toLowerCase() === staffInfo.email?.toLowerCase())
  );

  // Keep a valid selected room
  useEffect(() => {
    if (assignedRooms.length > 0 && !assignedRooms.some(r => r.id === selectedRoomId)) {
      setSelectedRoomId(assignedRooms[0].id);
    }
  }, [assignedRooms, selectedRoomId]);

  const activeRoom = assignedRooms.find(r => r.id === selectedRoomId) || assignedRooms[0] || null;

  // Fetch room materials when selected room or materials tab changes
  useEffect(() => {
    if (!activeRoom?.id) {
      setRoomMaterials([]);
      return;
    }
    fetch(`/api/student/rooms/${activeRoom.id}`)
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (data && Array.isArray(data.curatedResources)) {
          setRoomMaterials(data.curatedResources);
        }
      })
      .catch(() => {});
  }, [activeRoom?.id, activeTab]);

  const handleSaveStaffProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg('');
    if (!editName.trim()) {
      setProfileMsg('Name is required.');
      return;
    }
    if (editPhone && !/^\d{10}$/.test(editPhone)) {
      setProfileMsg('Phone number must be 10 digits.');
      return;
    }

    setIsSavingProfile(true);
    try {
      const res = await fetch('/api/staff/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId: staffInfo.id,
          email: staffInfo.email,
          name: editName.trim(),
          phone: editPhone,
          department: editDept.trim() || 'General'
        })
      });
      if (res.ok) {
        const data = await res.json();
        const updated = data.staff;
        localStorage.setItem('staff_user_name', updated.name);
        if (updated.phone) localStorage.setItem('staff_user_phone', updated.phone);
        if (updated.department) localStorage.setItem('staff_user_dept', updated.department);
        setStaffInfo(prev => ({
          ...prev,
          name: updated.name,
          phone: updated.phone || '',
          department: updated.department || 'General'
        }));
        setShowProfileModal(false);
        showToast('Staff profile updated!');
        loadRooms();
      } else {
        const err = await res.json().catch(() => ({}));
        setProfileMsg(err.error || 'Failed to update profile.');
      }
    } catch {
      setProfileMsg('Network error.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRoom || !announcementText.trim()) return;
    setIsSendingAnnounce(true);
    try {
      const res = await fetch(`/api/staff/rooms/${activeRoom.id}/announce`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffName: staffInfo.name,
          message: announcementText.trim()
        })
      });
      if (res.ok) {
        setAnnouncementText('');
        showToast(`Announcement sent to ${activeRoom.name}`);
        await loadRooms();
      }
    } catch {
      showToast('Failed to send announcement', 'error');
    } finally {
      setIsSendingAnnounce(false);
    }
  };

  const handleNudgeStudent = async (userId: string, studentName: string) => {
    if (!activeRoom) return;
    try {
      const res = await fetch(`/api/staff/rooms/${activeRoom.id}/students/${userId}/nudge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffName: staffInfo.name })
      });
      if (res.ok) {
        showToast(`Refocus nudge sent to ${studentName}`, 'info');
      }
    } catch {
      showToast('Failed to send nudge', 'error');
    }
  };

  const handleRemoveStudent = async (userId: string, studentName: string) => {
    if (!activeRoom) return;
    if (!confirm(`Remove ${studentName} from "${activeRoom.name}"?`)) return;
    try {
      const res = await fetch(`/api/staff/rooms/${activeRoom.id}/students/${userId}/remove`, {
        method: 'POST'
      });
      if (res.ok) {
        showToast(`${studentName} removed from ${activeRoom.name}`, 'info');
        await loadRooms();
      }
    } catch {
      showToast('Failed to remove student', 'error');
    }
  };

  const handleToggleRoomSetting = async (field: 'allowMaterialDownloads' | 'chatModerationFilter', currentVal: boolean) => {
    if (!activeRoom) return;
    try {
      const res = await fetch(`/api/staff/rooms/${activeRoom.id}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: !currentVal })
      });
      if (res.ok) {
        showToast('Room setting updated!');
        await loadRooms();
      }
    } catch {
      showToast('Failed to update room setting', 'error');
    }
  };

  const handleLogout = async () => {
    await fetch('/api/staff/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
    sessionStorage.removeItem('staff_authenticated');
    localStorage.removeItem('staff_authenticated');
    localStorage.removeItem('staff_user_id');
    localStorage.removeItem('staff_user_name');
    localStorage.removeItem('staff_user_email');
    localStorage.removeItem('staff_user_phone');
    localStorage.removeItem('staff_user_dept');
    sessionStorage.removeItem('student_authenticated');
    localStorage.removeItem('student_authenticated');
    router.push('/login');
  };

  // Global aggregated KPIs across all assigned rooms
  const allAssignedStudents = assignedRooms.flatMap(r => r.joinedStudents || []);
  const globalAvgFocus =
    allAssignedStudents.length > 0
      ? Math.round(allAssignedStudents.reduce((acc, s) => acc + (s.focusScore || 0), 0) / allAssignedStudents.length)
      : 0;
  const globalGazeAlerts = allAssignedStudents.reduce((acc, s) => acc + (s.gazeAlerts || 0), 0);
  const globalTabSwitches = allAssignedStudents.reduce((acc, s) => acc + (s.tabSwitchCount || 0), 0);

  // Filtered students for the selected room
  const roomStudents = activeRoom?.joinedStudents || [];
  const filteredStudents = roomStudents.filter(st => {
    const matchesSearch =
      !studentSearch.trim() ||
      st.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      (st.email || '').toLowerCase().includes(studentSearch.toLowerCase());
    const needsAttention =
      st.gazeStatus !== 'Focused' || (st.gazeAlerts || 0) > 0 || (st.tabSwitchCount || 0) > 0;
    const matchesFilter =
      studentFilter === 'all' ||
      (studentFilter === 'attention' && needsAttention) ||
      (studentFilter === 'focused' && !needsAttention);
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col items-center justify-center font-mono text-xs gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-slate-800 border-t-sky-400 animate-spin" />
        <span>Loading Staff Room Head Portal...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative overflow-x-hidden">
      {/* Subtle Ambient Background Glow */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full bg-sky-500/8 blur-[140px]" />
        <div className="absolute -bottom-32 -right-32 w-[480px] h-[480px] rounded-full bg-emerald-500/8 blur-[140px]" />
      </div>

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-20 right-6 z-50 px-4 py-3 rounded-xl border shadow-2xl text-xs font-bold flex items-center gap-2 ${
            toast.type === 'error'
              ? 'bg-red-950/95 border-red-500/40 text-red-100'
              : toast.type === 'info'
              ? 'bg-sky-950/95 border-sky-500/40 text-sky-100'
              : 'bg-emerald-950/95 border-emerald-500/40 text-emerald-100'
          }`}
        >
          <span className="material-symbols-outlined text-base">
            {toast.type === 'error' ? 'error' : toast.type === 'info' ? 'notifications' : 'check_circle'}
          </span>
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Top Navbar */}
      <header className="border-b border-slate-800/90 bg-slate-900/90 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500/20 to-indigo-500/20 border border-sky-500/30 text-sky-400 flex items-center justify-center shrink-0 shadow-sm">
              <span className="material-symbols-outlined">badge</span>
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-extrabold text-white leading-tight truncate">
                FocusFlow Staff &amp; Room Head Console
              </h1>
              <p className="text-[11px] text-slate-400 font-medium truncate">
                <span className="text-sky-400 font-bold">{staffInfo.name}</span>
                {staffInfo.department ? ` • ${staffInfo.department}` : ''}
                {staffInfo.email ? ` • ${staffInfo.email}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-[11px] font-bold text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Auto-Sync
            </span>
            <button
              type="button"
              onClick={() => {
                setEditName(staffInfo.name);
                setEditPhone(staffInfo.phone || '');
                setEditDept(staffInfo.department || 'General');
                setProfileMsg('');
                setShowProfileModal(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700/70 text-xs font-bold text-slate-200 flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">manage_accounts</span>
              <span className="hidden sm:inline">Edit Profile</span>
            </button>
            <button
              type="button"
              onClick={loadRooms}
              className="px-3.5 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700/70 text-xs font-bold text-slate-200 flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">refresh</span>
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">logout</span>
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Global Staff Overview KPIs */}
        <section className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 transition-colors shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Assigned Rooms</p>
              <span className="material-symbols-outlined text-[18px] text-slate-400">meeting_room</span>
            </div>
            <p className="text-2xl font-black text-white mt-2">{assignedRooms.length}</p>
          </div>
          <div className="bg-slate-900/90 border border-slate-800 hover:border-sky-500/30 rounded-2xl p-4 transition-colors shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Students</p>
              <span className="material-symbols-outlined text-[18px] text-sky-400">groups</span>
            </div>
            <p className="text-2xl font-black text-sky-400 mt-2">{allAssignedStudents.length}</p>
          </div>
          <div className="bg-slate-900/90 border border-slate-800 hover:border-emerald-500/30 rounded-2xl p-4 transition-colors shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Avg Focus Score</p>
              <span className="material-symbols-outlined text-[18px] text-emerald-400">radar</span>
            </div>
            <p className="text-2xl font-black text-emerald-400 mt-2">{globalAvgFocus}%</p>
          </div>
          <div className="bg-slate-900/90 border border-slate-800 hover:border-amber-500/30 rounded-2xl p-4 transition-colors shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Gaze Alerts</p>
              <span className="material-symbols-outlined text-[18px] text-amber-400">visibility</span>
            </div>
            <p className="text-2xl font-black text-amber-400 mt-2">{globalGazeAlerts}</p>
          </div>
          <div className="bg-slate-900/90 border border-slate-800 hover:border-red-500/30 rounded-2xl p-4 col-span-2 lg:col-span-1 transition-colors shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Tab Switches</p>
              <span className="material-symbols-outlined text-[18px] text-red-400">tab_close</span>
            </div>
            <p className="text-2xl font-black text-red-400 mt-2">{globalTabSwitches}</p>
          </div>
        </section>

        {assignedRooms.length === 0 ? (
          <div className="p-10 sm:p-14 rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-900/50 shadow-xl flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/25 text-sky-400 flex items-center justify-center mb-4 shadow-inner">
              <span className="material-symbols-outlined text-4xl">meeting_room</span>
            </div>
            <h2 className="text-xl font-extrabold text-white tracking-tight">No Rooms Assigned Yet</h2>
            <p className="text-sm text-slate-300 mt-2.5 w-full max-w-[520px] mx-auto leading-relaxed">
              Ask the Administrator to assign you as <span className="text-sky-400 font-bold">Room Head</span> in{' '}
              <span className="font-mono text-xs bg-slate-800/90 px-2 py-0.5 rounded-md border border-slate-700 text-slate-200">
                /admin/create-room
              </span>
              . Once assigned, you can monitor live student gazes, tab switches, chat announcements, and room controls here.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={loadRooms}
                className="px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-md shadow-sky-500/20"
              >
                <span className="material-symbols-outlined text-[16px]">refresh</span>
                Check for Assigned Rooms
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditName(staffInfo.name);
                  setEditPhone(staffInfo.phone || '');
                  setEditDept(staffInfo.department || 'General');
                  setProfileMsg('');
                  setShowProfileModal(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">manage_accounts</span>
                Update Staff Profile
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Room Selector Pills */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                {assignedRooms.map(r => {
                  const isSelected = activeRoom?.id === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setSelectedRoomId(r.id)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all border ${
                        isSelected
                          ? 'bg-sky-500 text-slate-950 border-sky-400 shadow-lg shadow-sky-500/20'
                          : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">meeting_room</span>
                      <span>{r.name}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                          isSelected ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {(r.joinedStudents || []).length}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {activeRoom && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
                {/* Selected Room Header & Quick Policy Toggles */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="px-2.5 py-0.5 rounded-full bg-sky-500/15 border border-sky-500/30 text-sky-400 text-[10px] font-bold uppercase tracking-wider">
                        Room Head Active
                      </span>
                      <h2 className="text-xl font-black text-white">{activeRoom.name}</h2>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {activeRoom.focusMode || 'Standard Lock'} • {activeRoom.sessionDurationFormat || '90m Focus'} •
                      Seats: {activeRoom.activeUsers} / {activeRoom.maxCapacity || 20}
                    </p>
                  </div>

                  {/* Quick Room Policy Controls */}
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        handleToggleRoomSetting(
                          'allowMaterialDownloads',
                          activeRoom.allowMaterialDownloads !== false
                        )
                      }
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border flex items-center gap-1.5 cursor-pointer transition-colors ${
                        activeRoom.allowMaterialDownloads !== false
                          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[15px]">download</span>
                      Downloads: {activeRoom.allowMaterialDownloads !== false ? 'ON' : 'OFF'}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleToggleRoomSetting(
                          'chatModerationFilter',
                          activeRoom.chatModerationFilter !== false
                        )
                      }
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border flex items-center gap-1.5 cursor-pointer transition-colors ${
                        activeRoom.chatModerationFilter !== false
                          ? 'bg-sky-500/15 border-sky-500/30 text-sky-400'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[15px]">shield</span>
                      Chat Filter: {activeRoom.chatModerationFilter !== false ? 'ON' : 'OFF'}
                    </button>
                  </div>
                </div>

                {/* Inner Tabs */}
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('monitor')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                      activeTab === 'monitor'
                        ? 'bg-slate-800 text-white border border-slate-700'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">monitoring</span>
                    Live Student Monitor ({roomStudents.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('chat')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                      activeTab === 'chat'
                        ? 'bg-slate-800 text-white border border-slate-700'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">campaign</span>
                    Announcements &amp; Chat ({(activeRoom.messages || []).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('materials')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                      activeTab === 'materials'
                        ? 'bg-slate-800 text-white border border-slate-700'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">folder_shared</span>
                    Room Materials ({roomMaterials.length})
                  </button>
                </div>

                {/* TAB 1: Live Student Monitor */}
                {activeTab === 'monitor' && (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="relative flex-1 max-w-[340px] w-full">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-[18px]">
                          search
                        </span>
                        <input
                          type="text"
                          value={studentSearch}
                          onChange={e => setStudentSearch(e.target.value)}
                          placeholder="Search student name or email..."
                          className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:border-sky-500"
                        />
                      </div>

                      <div className="flex items-center gap-1.5">
                        {(['all', 'attention', 'focused'] as const).map(f => (
                          <button
                            key={f}
                            type="button"
                            onClick={() => setStudentFilter(f)}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold capitalize cursor-pointer ${
                              studentFilter === f
                                ? 'bg-sky-500 text-slate-950'
                                : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            {f === 'attention' ? 'Needs Attention' : f}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-800 text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                            <th className="py-3 px-3">Student</th>
                            <th className="py-3 px-3">Gaze Status</th>
                            <th className="py-3 px-3">Gaze Alerts</th>
                            <th className="py-3 px-3">Tab Switches</th>
                            <th className="py-3 px-3">Focus Score</th>
                            <th className="py-3 px-3">Joined</th>
                            <th className="py-3 px-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/70">
                          {filteredStudents.length > 0 ? (
                            filteredStudents.map(st => (
                              <tr key={st.userId} className="hover:bg-slate-800/30">
                                <td className="py-3 px-3">
                                  <div className="font-bold text-white">{st.name}</div>
                                  <div className="text-[10px] text-slate-400">{st.email || st.userId}</div>
                                </td>
                                <td className="py-3 px-3">
                                  <span
                                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                      st.gazeStatus === 'Focused'
                                        ? 'bg-emerald-500/15 text-emerald-400'
                                        : 'bg-amber-500/15 text-amber-400'
                                    }`}
                                  >
                                    {st.gazeStatus || 'Focused'}
                                  </span>
                                </td>
                                <td className="py-3 px-3">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span
                                      className="px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono font-bold text-[10px]"
                                      title="Stare / Eye-Blink Alerts"
                                    >
                                      Stare: {st.stareAlerts ?? 0}
                                    </span>
                                    <span
                                      className="px-2 py-0.5 rounded-md bg-orange-500/15 border border-orange-500/30 text-orange-300 font-mono font-bold text-[10px]"
                                      title="2+ Persons Detected Alerts"
                                    >
                                      Multi: {st.multiPersonAlerts ?? 0}
                                    </span>
                                    <span
                                      className="px-2 py-0.5 rounded-md bg-red-500/15 border border-red-500/30 text-red-300 font-mono font-bold text-[10px]"
                                      title="Look Away / Face Turned Alerts"
                                    >
                                      Away: {st.lookAwayAlerts ?? 0}
                                    </span>
                                  </div>
                                </td>
                                <td className="py-3 px-3 font-bold text-red-400">{st.tabSwitchCount ?? 0}</td>
                                <td className="py-3 px-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-16 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                                      <div
                                        className="h-full bg-emerald-400 rounded-full"
                                        style={{ width: `${Math.min(100, st.focusScore ?? 0)}%` }}
                                      />
                                    </div>
                                    <span className="font-bold text-emerald-400">{st.focusScore ?? 0}%</span>
                                  </div>
                                </td>
                                <td className="py-3 px-3 text-slate-400 text-[11px]">
                                  {new Date(st.joinedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </td>
                                <td className="py-3 px-3 text-right">
                                  <div className="inline-flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleNudgeStudent(st.userId, st.name)}
                                      className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-[11px] font-bold cursor-pointer"
                                      title="Send focus nudge"
                                    >
                                      Nudge
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveStudent(st.userId, st.name)}
                                      className="px-2.5 py-1 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 text-[11px] font-bold cursor-pointer"
                                      title="Remove student from room"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={7} className="py-8 text-center text-slate-500 italic">
                                No matching students in this room.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* TAB 2: Room Chat & Broadcast Announcements */}
                {activeTab === 'chat' && (
                  <div className="space-y-4">
                    <form onSubmit={handleBroadcast} className="flex gap-2">
                      <input
                        type="text"
                        value={announcementText}
                        onChange={e => setAnnouncementText(e.target.value)}
                        placeholder={`Broadcast announcement to ${activeRoom.name}...`}
                        className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:border-sky-500"
                      />
                      <button
                        type="submit"
                        disabled={isSendingAnnounce || !announcementText.trim()}
                        className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-[16px]">send</span>
                        {isSendingAnnounce ? 'Sending...' : 'Broadcast'}
                      </button>
                    </form>

                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                      {(activeRoom.messages || []).length > 0 ? (
                        activeRoom.messages.map(msg => (
                          <div
                            key={msg.id}
                            className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-start justify-between gap-3"
                          >
                            <div>
                              <span className="text-xs font-bold text-sky-400">{msg.user}</span>
                              <p className="text-xs text-slate-200 mt-0.5">{msg.text}</p>
                            </div>
                            <span className="text-[10px] text-slate-500 shrink-0">
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-center py-8 text-xs text-slate-500 italic">
                          No messages or announcements in this room yet.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 3: Room Materials */}
                {activeTab === 'materials' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {roomMaterials.length > 0 ? (
                      roomMaterials.map(mat => (
                        <div
                          key={mat.id}
                          className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-sky-500/40 transition-colors flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
                              <span className="material-symbols-outlined text-[20px]">
                                {mat.type === 'pdf' ? 'picture_as_pdf' : mat.type === 'video' ? 'video_library' : 'description'}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-white truncate" title={mat.title}>
                                {mat.title}
                              </p>
                              <p className="text-[10px] text-slate-400 uppercase mt-0.5">
                                {mat.type} • {mat.size} • {mat.downloads || 0} downloads
                              </p>
                            </div>
                          </div>
                          <a
                            href={`/api/resources/${mat.id}/download`}
                            download={mat.title}
                            className="px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-[11px] font-bold shrink-0 transition-colors"
                          >
                            Download
                          </a>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-full text-center py-10 text-xs text-slate-400 italic border border-dashed border-slate-800 rounded-2xl">
                        No study materials shared with this room yet.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Edit Staff Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-[440px] w-full shadow-2xl relative text-slate-100">
            <button
              type="button"
              onClick={() => setShowProfileModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <h3 className="text-lg font-extrabold mb-1 flex items-center gap-2">
              <span className="material-symbols-outlined text-sky-400">manage_accounts</span>
              Edit Staff Profile
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Update your display name, 10-digit phone number, and department.
            </p>

            <form onSubmit={handleSaveStaffProfile} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-300">Full Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white outline-none focus:border-sky-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-300">10-Digit Phone Number</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={editPhone}
                  onChange={e => setEditPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="9876543210"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white outline-none focus:border-sky-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-300">Department</label>
                <input
                  type="text"
                  value={editDept}
                  onChange={e => setEditDept(e.target.value)}
                  placeholder="Computer Science"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white outline-none focus:border-sky-500"
                />
              </div>

              {profileMsg && <p className="text-xs font-semibold text-red-400">{profileMsg}</p>}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="flex-1 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {isSavingProfile ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
