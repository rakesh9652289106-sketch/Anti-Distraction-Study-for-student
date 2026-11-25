'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { StudyRoom } from '@/lib/db';

export default function StaffPortalPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<StudyRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [staffInfo, setStaffInfo] = useState<{ id: string; name: string; email: string }>({
    id: '',
    name: 'Staff Member',
    email: ''
  });

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

    setStaffInfo({
      id: localStorage.getItem('staff_user_id') || '',
      name: localStorage.getItem('staff_user_name') || 'Staff Member',
      email: localStorage.getItem('staff_user_email') || ''
    });

    loadRooms();
    const interval = setInterval(loadRooms, 10000);
    return () => clearInterval(interval);
  }, [router, loadRooms]);

  const handleLogout = async () => {
    await fetch('/api/staff/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
    sessionStorage.removeItem('staff_authenticated');
    localStorage.removeItem('staff_authenticated');
    localStorage.removeItem('staff_user_id');
    localStorage.removeItem('staff_user_name');
    localStorage.removeItem('staff_user_email');
    sessionStorage.removeItem('student_authenticated');
    localStorage.removeItem('student_authenticated');
    router.push('/login');
  };

  const assignedRooms = rooms.filter(
    r =>
      r.roomHead &&
      (r.roomHead.userId === staffInfo.id ||
        r.roomHead.email?.toLowerCase() === staffInfo.email?.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-200 flex items-center justify-center font-mono text-xs">
        Loading Staff Room Head Portal...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-400 flex items-center justify-center">
              <span className="material-symbols-outlined">badge</span>
            </div>
            <div>
              <h1 className="text-sm font-extrabold text-white leading-tight">
                FocusFlow Staff &amp; Room Head Portal
              </h1>
              <p className="text-[11px] text-slate-400 font-medium">
                Signed in as <span className="text-sky-400 font-bold">{staffInfo.name}</span> ({staffInfo.email})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={loadRooms}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">refresh</span>
              Refresh Stats
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">logout</span>
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <div>
          <h2 className="text-2xl font-black text-white">Your Assigned Room Head Sanctuaries ({assignedRooms.length})</h2>
          <p className="text-xs text-slate-400 mt-1">
            Monitor live student gazes, gaze alerts, tab switches, and overall focus scores for rooms assigned to you by the Admin.
          </p>
        </div>

        {assignedRooms.length === 0 ? (
          <div className="p-10 rounded-2xl border border-dashed border-slate-800 bg-slate-900/50 text-center">
            <span className="material-symbols-outlined text-4xl text-slate-500 mb-2">meeting_room</span>
            <p className="text-sm font-bold text-white">No Rooms Assigned Yet</p>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Ask the Administrator to assign you as **Room Head** in Create &amp; Configure Rooms (`/admin/create-room`). Once assigned, full room stats will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {assignedRooms.map(room => {
              const students = room.joinedStudents || [];
              const avgFocus =
                students.length > 0
                  ? Math.round(students.reduce((s, st) => s + (st.focusScore || 0), 0) / students.length)
                  : 0;
              const totalGazeAlerts = students.reduce((s, st) => s + (st.gazeAlerts || 0), 0);
              const totalTabSwitches = students.reduce((s, st) => s + (st.tabSwitchCount || 0), 0);

              return (
                <div key={room.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-sky-500/15 border border-sky-500/30 text-sky-400 text-[10px] font-bold uppercase tracking-wider">
                          Room Head
                        </span>
                        <h3 className="text-lg font-extrabold text-white">{room.name}</h3>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {room.focusMode || 'Standard Lock'} • {room.sessionDurationFormat || '90m Focus'} • Capacity: {room.activeUsers} / {room.maxCapacity || 20}
                      </p>
                    </div>
                    <Link
                      href={`/rooms/preview?id=${room.id}`}
                      className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 self-start sm:self-auto"
                    >
                      <span className="material-symbols-outlined text-[16px]">visibility</span>
                      Open Room Workspace
                    </Link>
                  </div>

                  {/* Summary KPIs */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Joined Students</p>
                      <p className="text-2xl font-black text-white mt-1">{students.length}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Avg Focus Score</p>
                      <p className="text-2xl font-black text-emerald-400 mt-1">{avgFocus}%</p>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Gaze Alerts</p>
                      <p className="text-2xl font-black text-amber-400 mt-1">{totalGazeAlerts}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Tab Switches</p>
                      <p className="text-2xl font-black text-red-400 mt-1">{totalTabSwitches}</p>
                    </div>
                  </div>

                  {/* Student Stats Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                          <th className="py-2.5 px-3">Student</th>
                          <th className="py-2.5 px-3">Gaze Status</th>
                          <th className="py-2.5 px-3">Gaze Alerts</th>
                          <th className="py-2.5 px-3">Tab Switch Count</th>
                          <th className="py-2.5 px-3">Focus Score</th>
                          <th className="py-2.5 px-3">Joined At</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/70">
                        {students.length > 0 ? (
                          students.map(st => (
                            <tr key={st.userId} className="hover:bg-slate-800/30">
                              <td className="py-3 px-3">
                                <div className="font-bold text-white">{st.name}</div>
                                <div className="text-[10px] text-slate-400">{st.email || st.userId}</div>
                              </td>
                              <td className="py-3 px-3">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    st.gazeStatus === 'Focused'
                                      ? 'bg-emerald-500/15 text-emerald-400'
                                      : 'bg-amber-500/15 text-amber-400'
                                  }`}
                                >
                                  {st.gazeStatus || 'Focused'}
                                </span>
                              </td>
                              <td className="py-3 px-3 font-bold text-amber-400">{st.gazeAlerts ?? 0}</td>
                              <td className="py-3 px-3 font-bold text-red-400">{st.tabSwitchCount ?? 0}</td>
                              <td className="py-3 px-3 font-bold text-emerald-400">{st.focusScore ?? 92}%</td>
                              <td className="py-3 px-3 text-slate-400 text-[11px]">
                                {new Date(st.joinedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="py-6 text-center text-slate-500 italic">
                              No students have joined this room yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
