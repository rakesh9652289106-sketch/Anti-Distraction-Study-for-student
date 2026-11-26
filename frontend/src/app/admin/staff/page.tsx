'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { StaffMember, StudyRoom } from '@/lib/db';

export default function AdminManageStaffPage() {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [rooms, setRooms] = useState<StudyRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Add / Edit Staff Modal
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formDept, setFormDept] = useState('General');
  const [isSaving, setIsSaving] = useState(false);

  // Selected Staff Detail & Room Stats Inspector
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [assignRoomId, setAssignRoomId] = useState('');

  // Toast
  const [toastMsg, setToastMsg] = useState('');
  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const loadAll = useCallback(async () => {
    try {
      const [resStaff, resRooms] = await Promise.all([
        fetch('/api/admin/staff', { credentials: 'include' }),
        fetch('/api/rooms')
      ]);
      if (resStaff.ok) {
        const sData = await resStaff.json();
        if (Array.isArray(sData)) {
          setStaffList(sData);
          if (selectedStaff) {
            const refreshed = sData.find((s: StaffMember) => s.id === selectedStaff.id);
            if (refreshed) setSelectedStaff(refreshed);
          }
        }
      }
      if (resRooms.ok) {
        const rData = await resRooms.json();
        if (Array.isArray(rData)) setRooms(rData);
      }
    } catch (err) {
      console.error('Failed to load staff & rooms:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedStaff]);

  useEffect(() => {
    loadAll();
  }, []);

  const getRoomsForStaff = (staff: StaffMember) =>
    rooms.filter(
      r =>
        r.roomHead &&
        (r.roomHead.userId === staff.id ||
          r.roomHead.email?.toLowerCase() === staff.email?.toLowerCase())
    );

  const openAddModal = () => {
    setEditingStaff(null);
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormDept('General');
    setShowStaffModal(true);
  };

  const openEditModal = (staff: StaffMember) => {
    setEditingStaff(staff);
    setFormName(staff.name);
    setFormEmail(staff.email);
    setFormPhone(staff.phone || '');
    setFormDept(staff.department || 'General');
    setShowStaffModal(true);
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim()) return;
    setIsSaving(true);
    try {
      const isEdit = Boolean(editingStaff);
      const res = await fetch('/api/admin/staff', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...(isEdit ? { id: editingStaff!.id } : {}),
          name: formName.trim(),
          email: formEmail.trim(),
          phone: formPhone.replace(/\D/g, '').slice(0, 10),
          department: formDept.trim() || 'General'
        })
      });
      if (res.ok) {
        setShowStaffModal(false);
        triggerToast(isEdit ? `Updated staff "${formName.trim()}"` : `Added staff "${formName.trim()}"`);
        await loadAll();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Failed to save staff member.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteStaff = async (staff: StaffMember) => {
    if (!confirm(`Delete staff member "${staff.name}" (${staff.email})? Any assigned rooms will be unassigned.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/staff?id=${encodeURIComponent(staff.id)}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (res.ok) {
        if (selectedStaff?.id === staff.id) setSelectedStaff(null);
        triggerToast(`Removed staff "${staff.name}"`);
        await loadAll();
      } else {
        alert('Failed to delete staff member.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAssignRoomToStaff = async (staff: StaffMember, roomId: string, assign: boolean) => {
    if (!roomId) return;
    try {
      const res = await fetch('/api/rooms', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          roomHead: assign ? { userId: staff.id, name: staff.name, email: staff.email } : null
        })
      });
      if (res.ok) {
        setAssignRoomId('');
        triggerToast(assign ? `Assigned room to ${staff.name}` : `Unassigned room from ${staff.name}`);
        await loadAll();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredStaff = staffList.filter(s => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      s.name.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      (s.phone || '').includes(q) ||
      (s.department || '').toLowerCase().includes(q)
    );
  });

  // Global Aggregated KPIs
  const totalAssignedRooms = rooms.filter(r => Boolean(r.roomHead)).length;
  const studentsInStaffRooms = rooms
    .filter(r => Boolean(r.roomHead))
    .flatMap(r => r.joinedStudents || []);
  const totalStaffGazeAlerts = studentsInStaffRooms.reduce((acc, s) => acc + (s.gazeAlerts || 0), 0);
  const totalStaffTabSwitches = studentsInStaffRooms.reduce((acc, s) => acc + (s.tabSwitchCount || 0), 0);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[320px] text-amber-200 font-mono text-xs gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-[#690E0C] border-t-amber-400 animate-spin" />
        <span>Loading Staff Directory &amp; Room Stats...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans text-black">
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#FDF6ED] border border-[#E2CEB9] text-[#590907] px-4 py-2.5 rounded-xl shadow-2xl text-xs font-black flex items-center gap-2">
          <span className="material-symbols-outlined text-base text-emerald-600">check_circle</span>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Manage Staff &amp; Room Heads</h1>
          <p className="text-xs text-[#F5E6D3]/85 font-medium mt-1">
            Inspect staff profiles, assigned study rooms, live student gaze stats, and manage Room Head assignments.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadAll}
            className="px-3.5 py-2 bg-[#3D0403] hover:bg-[#480605] border border-[#690E0C] text-[#F5E6D3] rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            Refresh
          </button>
          <button
            type="button"
            onClick={openAddModal}
            className="px-4 py-2 bg-[#FDF6ED] hover:bg-white border border-[#E2CEB9] text-[#590907] rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
          >
            <span className="material-symbols-outlined text-[16px]">person_add</span>
            Add Staff Member
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#FDF6ED] border border-[#E2CEB9] rounded-2xl p-4 shadow-md">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-600">Total Staff Members</p>
          <p className="text-2xl font-black text-[#590907] mt-1">{staffList.length}</p>
        </div>
        <div className="bg-[#FDF6ED] border border-[#E2CEB9] rounded-2xl p-4 shadow-md">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-600">Assigned Rooms</p>
          <p className="text-2xl font-black text-emerald-700 mt-1">
            {totalAssignedRooms} <span className="text-xs font-bold text-slate-500">/ {rooms.length}</span>
          </p>
        </div>
        <div className="bg-[#FDF6ED] border border-[#E2CEB9] rounded-2xl p-4 shadow-md">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-600">Students Monitored</p>
          <p className="text-2xl font-black text-sky-700 mt-1">{studentsInStaffRooms.length}</p>
        </div>
        <div className="bg-[#FDF6ED] border border-[#E2CEB9] rounded-2xl p-4 shadow-md">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-600">Alerts / Tab Switches</p>
          <p className="text-2xl font-black text-amber-700 mt-1">
            {totalStaffGazeAlerts} <span className="text-sm text-red-700">/ {totalStaffTabSwitches}</span>
          </p>
        </div>
      </div>

      {/* Main Staff Directory Card */}
      <div className="bg-[#FDF6ED] border border-[#E2CEB9] rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-base font-black text-[#590907] flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">badge</span>
            Staff Directory ({filteredStaff.length})
          </h2>
          <div className="relative w-full max-w-[340px]">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-[18px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search name, email, phone, department..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-[#D5BFA7] focus:border-[#590907] rounded-xl text-xs font-semibold text-black outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E2CEB9] text-[10px] uppercase tracking-wider text-slate-600 font-black">
                <th className="py-3 px-3">Staff Member</th>
                <th className="py-3 px-3">Contact &amp; Dept</th>
                <th className="py-3 px-3">Assigned Rooms</th>
                <th className="py-3 px-3">Students &amp; Focus</th>
                <th className="py-3 px-3">Gaze Alerts (S / M / A)</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2CEB9]/60">
              {filteredStaff.length > 0 ? (
                filteredStaff.map(st => {
                  const staffRooms = getRoomsForStaff(st);
                  const staffStudents = staffRooms.flatMap(r => r.joinedStudents || []);
                  const avgFocus =
                    staffStudents.length > 0
                      ? Math.round(staffStudents.reduce((a, s) => a + (s.focusScore || 0), 0) / staffStudents.length)
                      : 0;
                  const stareSum = staffStudents.reduce((a, s) => a + (s.stareAlerts ?? 0), 0);
                  const multiSum = staffStudents.reduce((a, s) => a + (s.multiPersonAlerts ?? 0), 0);
                  const awaySum = staffStudents.reduce((a, s) => a + (s.lookAwayAlerts ?? 0), 0);
                  const tabSum = staffStudents.reduce((a, s) => a + (s.tabSwitchCount ?? 0), 0);

                  return (
                    <tr key={st.id} className="hover:bg-[#F3E2CF]/50 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-black text-black">{st.name}</div>
                        <div className="text-[10px] font-mono text-slate-600">{st.id}</div>
                        <div className="text-[10px] text-slate-500">
                          Joined: {st.createdAt ? new Date(st.createdAt).toLocaleDateString() : 'N/A'}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{st.email}</div>
                        <div className="text-[11px] text-slate-700 font-semibold">
                          {st.phone ? `📞 ${st.phone}` : 'No phone'}
                        </div>
                        <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-[#590907]/10 text-[#590907] text-[10px] font-bold">
                          {st.department || 'General'}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {staffRooms.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {staffRooms.map(r => (
                              <span
                                key={r.id}
                                className="px-2 py-0.5 rounded-md bg-emerald-700/15 border border-emerald-700/30 text-emerald-900 text-[10px] font-bold"
                              >
                                {r.name} ({(r.joinedStudents || []).length})
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-500 italic">No rooms assigned</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{staffStudents.length} Students</div>
                        <div className="text-[11px] font-bold text-emerald-700">Avg Focus: {avgFocus}%</div>
                        <div className="text-[10px] font-bold text-red-700">Tab Switches: {tabSum}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-900 font-mono font-bold text-[10px]">
                            S: {stareSum}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-900 font-mono font-bold text-[10px]">
                            M: {multiSum}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-900 font-mono font-bold text-[10px]">
                            A: {awaySum}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedStaff(st)}
                            className="px-2.5 py-1.5 rounded-lg bg-[#590907] hover:bg-[#430605] text-white text-[11px] font-bold cursor-pointer transition-colors"
                          >
                            View Stats
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(st)}
                            className="p-1.5 rounded-lg bg-emerald-700/15 hover:bg-emerald-700 text-emerald-900 hover:text-white cursor-pointer transition-colors"
                            title="Edit Staff"
                          >
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteStaff(st)}
                            className="p-1.5 rounded-lg bg-red-700/15 hover:bg-red-700 text-red-900 hover:text-white cursor-pointer transition-colors"
                            title="Delete Staff"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 italic">
                    No staff members found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Staff Detail & Room Stats Modal */}
      {selectedStaff && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#FDF6ED] border border-[#E2CEB9] rounded-2xl p-6 max-w-[880px] w-full max-h-[88vh] overflow-y-auto shadow-2xl relative text-black space-y-5">
            <button
              type="button"
              onClick={() => setSelectedStaff(null)}
              className="absolute top-4 right-4 text-slate-600 hover:text-black cursor-pointer"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2CEB9] pb-4 pr-8">
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-[#590907] text-white text-[10px] font-black uppercase tracking-wider">
                  Staff Profile &amp; Room Telemetry
                </span>
                <h3 className="text-xl font-black text-black mt-1.5">{selectedStaff.name}</h3>
                <p className="text-xs text-slate-700 font-semibold mt-0.5">
                  {selectedStaff.email} • {selectedStaff.phone || 'No phone'} • Dept: {selectedStaff.department || 'General'}
                </p>
              </div>

              {/* Quick Assign Room to this Staff */}
              <div className="flex items-center gap-2">
                <select
                  value={assignRoomId}
                  onChange={e => setAssignRoomId(e.target.value)}
                  className="px-3 py-2 bg-white border border-[#D5BFA7] rounded-xl text-xs font-bold text-black outline-none"
                >
                  <option value="">Select room to assign...</option>
                  {rooms
                    .filter(r => r.roomHead?.userId !== selectedStaff.id)
                    .map(r => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  disabled={!assignRoomId}
                  onClick={() => handleAssignRoomToStaff(selectedStaff, assignRoomId, true)}
                  className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-40"
                >
                  Assign Room
                </button>
              </div>
            </div>

            {getRoomsForStaff(selectedStaff).length === 0 ? (
              <div className="p-8 text-center border border-dashed border-[#D5BFA7] rounded-xl text-xs text-slate-600 italic">
                No study rooms are currently assigned to {selectedStaff.name}. Use the selector above to assign a room.
              </div>
            ) : (
              <div className="space-y-4">
                {getRoomsForStaff(selectedStaff).map(room => {
                  const rStudents = room.joinedStudents || [];
                  const rAvgFocus =
                    rStudents.length > 0
                      ? Math.round(rStudents.reduce((a, s) => a + (s.focusScore || 0), 0) / rStudents.length)
                      : 0;
                  return (
                    <div key={room.id} className="p-4 rounded-xl bg-white border border-[#E2CEB9] space-y-3 shadow-xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E2CEB9]/60 pb-3">
                        <div>
                          <h4 className="font-black text-sm text-[#590907]">{room.name}</h4>
                          <p className="text-[11px] text-slate-600 font-semibold">
                            {room.focusMode || 'Standard Lock'} • Seats: {room.activeUsers} / {room.maxCapacity || 20} •
                            Avg Focus: <span className="text-emerald-700 font-black">{rAvgFocus}%</span> •
                            Downloads: {room.allowMaterialDownloads !== false ? 'ON' : 'OFF'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAssignRoomToStaff(selectedStaff, room.id, false)}
                          className="px-3 py-1.5 rounded-lg bg-red-700/10 hover:bg-red-700 text-red-800 hover:text-white text-[11px] font-bold cursor-pointer transition-colors self-start sm:self-auto"
                        >
                          Unassign Room
                        </button>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-[#E2CEB9] text-[10px] uppercase text-slate-600 font-black">
                              <th className="py-2 px-2">Student</th>
                              <th className="py-2 px-2">Gaze Status</th>
                              <th className="py-2 px-2">Stare / Multi / Away</th>
                              <th className="py-2 px-2">Tab Switches</th>
                              <th className="py-2 px-2">Focus Score</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E2CEB9]/40">
                            {rStudents.length > 0 ? (
                              rStudents.map(st => (
                                <tr key={st.userId}>
                                  <td className="py-2 px-2">
                                    <div className="font-bold text-black">{st.name}</div>
                                    <div className="text-[10px] text-slate-500">{st.email || st.userId}</div>
                                  </td>
                                  <td className="py-2 px-2 font-bold">{st.gazeStatus || 'Focused'}</td>
                                  <td className="py-2 px-2 font-mono font-bold text-[11px]">
                                    {st.stareAlerts ?? 0} / {st.multiPersonAlerts ?? 0} / {st.lookAwayAlerts ?? 0}
                                  </td>
                                  <td className="py-2 px-2 font-bold text-red-700">{st.tabSwitchCount ?? 0}</td>
                                  <td className="py-2 px-2 font-bold text-emerald-700">{st.focusScore ?? 0}%</td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={5} className="py-4 text-center text-slate-500 italic">
                                  No active students in this room.
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
          </div>
        </div>
      )}

      {/* Add / Edit Staff Modal */}
      {showStaffModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#FDF6ED] border border-[#E2CEB9] rounded-2xl p-6 max-w-[440px] w-full shadow-2xl relative text-black">
            <button
              type="button"
              onClick={() => setShowStaffModal(false)}
              className="absolute top-4 right-4 text-slate-600 hover:text-black cursor-pointer"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <h3 className="text-lg font-black text-[#590907] mb-1">
              {editingStaff ? 'Edit Staff Member' : 'Add New Staff Member'}
            </h3>
            <p className="text-xs text-slate-600 mb-4 font-medium">
              Staff sign in with their verified Google email and can be assigned as Room Head.
            </p>

            <form onSubmit={handleSaveStaff} className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-[#D5BFA7] focus:border-[#590907] rounded-xl text-xs font-semibold text-black outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-700 mb-1">
                  Google Email
                </label>
                <input
                  type="email"
                  required
                  value={formEmail}
                  onChange={e => setFormEmail(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-[#D5BFA7] focus:border-[#590907] rounded-xl text-xs font-semibold text-black outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-700 mb-1">
                  10-Digit Phone
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={formPhone}
                  onChange={e => setFormPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="9876543210"
                  className="w-full px-3.5 py-2 bg-white border border-[#D5BFA7] focus:border-[#590907] rounded-xl text-xs font-semibold text-black outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-700 mb-1">
                  Department
                </label>
                <input
                  type="text"
                  value={formDept}
                  onChange={e => setFormDept(e.target.value)}
                  placeholder="Computer Science"
                  className="w-full px-3.5 py-2 bg-white border border-[#D5BFA7] focus:border-[#590907] rounded-xl text-xs font-semibold text-black outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowStaffModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-[#E2CEB9] hover:bg-[#D5BFA7] text-xs font-bold text-black cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2.5 rounded-xl bg-[#590907] hover:bg-[#430605] text-white text-xs font-black cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : editingStaff ? 'Save Changes' : 'Create Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
