'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { ClassroomGroup, StudentUser } from '@/lib/db';

export default function AdminUserManagementPage() {
  const { tickets, fetchData } = useApp();
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [adminReplyText, setAdminReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'users' | 'groups' | 'tickets'>('users');
  const [usersList, setUsersList] = useState<any[]>([]);
  const [groupsList, setGroupsList] = useState<ClassroomGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<ClassroomGroup | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedStudentToAdd, setSelectedStudentToAdd] = useState('');

  // Selected user for editing
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [editCoins, setEditCoins] = useState(0);
  const [editStreak, setEditStreak] = useState(0);
  const [editScore, setEditScore] = useState(0);
  const [editStatus, setEditStatus] = useState<'active' | 'offline' | 'suspended'>('active');
  const [editChatMuted, setEditChatMuted] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  function triggerToast(msg: string) {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  }

  const handleSendAdminReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminReplyText.trim() || !selectedTicketId) return;
    setIsSendingReply(true);

    try {
      const res = await fetch(`/api/support/${selectedTicketId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: 'Support Agent', text: adminReplyText.trim() })
      });

      if (res.ok) {
        setAdminReplyText('');
        await fetchData();
        triggerToast('Reply sent to student successfully.');
      } else {
        alert('Failed to send reply');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSendingReply(false);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsersList(data || []);
      }
    } catch (err) {
      console.error('Failed to load users list:', err);
    }
  };

  const loadGroups = async () => {
    try {
      const res = await fetch('/api/admin/groups');
      if (res.ok) {
        const data = await res.json();
        setGroupsList(data || []);
        // Update active group details reference if open
        if (selectedGroup) {
          const freshGroup = data.find((g: ClassroomGroup) => g.id === selectedGroup.id);
          if (freshGroup) {
            setSelectedGroup(freshGroup);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load groups list:', err);
    }
  };

  useEffect(() => {
    loadUsers();
    loadGroups();
  }, []);

  const handleSelectUser = (user: any) => {
    setSelectedUser(user);
    setEditCoins(user.focusCoins);
    setEditStreak(user.currentStreak);
    setEditScore(user.focusScore);
    setEditStatus(user.status);
    setEditChatMuted(user.chatMuted || false);
  };

  const handleSaveUserChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.id,
          focusCoins: editCoins,
          currentStreak: editStreak,
          focusScore: editScore,
          status: editStatus,
          chatMuted: editChatMuted
        })
      });

      if (res.ok) {
        const updatedUser = await res.json();
        triggerToast(`Updated stats for student "${updatedUser.name}"`);
        setSelectedUser(null);
        await loadUsers();
        await fetchData(); // refresh global state
      }
    } catch (err) {
      console.error('Error saving user stats:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently remove student "${name}" from focus databases?`)) return;

    try {
      const res = await fetch(`/api/admin/users?userId=${userId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        triggerToast(`Student "${name}" registry deleted.`);
        setSelectedUser(null);
        await loadUsers();
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };


  const handleDeleteGroup = async (groupId: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently delete group "${name}"?`)) return;
    try {
      const res = await fetch(`/api/admin/groups/${groupId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        triggerToast(`Group "${name}" deleted.`);
        if (selectedGroup?.id === groupId) {
          setSelectedGroup(null);
        }
        await loadGroups();
      } else {
        alert('Failed to delete group');
      }
    } catch (err) {
      console.error('Error deleting group:', err);
    }
  };

  const handleRemoveStudentFromGroup = async (groupId: string, studentId: string, studentName: string) => {
    if (!confirm(`Are you sure you want to remove "${studentName}" from this group?`)) return;
    try {
      const res = await fetch(`/api/admin/groups/${groupId}/students/${studentId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        triggerToast(`Removed student "${studentName}" from the group.`);
        await loadGroups();
      } else {
        alert('Failed to remove student from group');
      }
    } catch (err) {
      console.error('Error removing student:', err);
    }
  };

  const handleAddStudentToGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup || !selectedStudentToAdd) return;
    const student = usersList.find(u => u.id === selectedStudentToAdd);
    if (!student) return;
    try {
      const res = await fetch(`/api/admin/groups/${selectedGroup.id}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: selectedStudentToAdd })
      });
      if (res.ok) {
        triggerToast(`Added student "${student.name}" to the group.`);
        setSelectedStudentToAdd('');
        await loadGroups();
      } else {
        alert('Failed to add student to group');
      }
    } catch (err) {
      console.error('Error adding student:', err);
    }
  };

  const handleFlagAttentionCheck = (name: string) => {
    triggerToast(`Sent priority Attention Camera calibration alert to ${name}.`);
  };

  const handleKickFromRoom = (name: string) => {
    triggerToast(`Kicked ${name} from active virtual study space.`);
  };

  // Filter lists based on searchQuery
  const filteredUsers = usersList.filter(user => {
    const term = searchQuery.toLowerCase();
    return (
      user.name.toLowerCase().includes(term) ||
      user.email.toLowerCase().includes(term) ||
      user.id.toLowerCase().includes(term)
    );
  });

  const filteredGroups = groupsList.filter(group => {
    const term = searchQuery.toLowerCase();
    return (
      group.name.toLowerCase().includes(term) ||
      group.room.toLowerCase().includes(term) ||
      group.id.toLowerCase().includes(term)
    );
  });

  const filteredTickets = tickets.filter(ticket => {
    const term = searchQuery.toLowerCase();
    return (
      ticket.subject.toLowerCase().includes(term) ||
      ticket.message.toLowerCase().includes(term) ||
      ticket.id.toLowerCase().includes(term)
    );
  });

  const groupMembers = selectedGroup
    ? selectedGroup.students.map((sid: string) => usersList.find(u => u.id === sid)).filter(Boolean)
    : [];

  const filteredGroupMembers = groupMembers.filter((m: any) => {
    const term = searchQuery.toLowerCase();
    return (
      m.name.toLowerCase().includes(term) ||
      m.email.toLowerCase().includes(term) ||
      m.id.toLowerCase().includes(term)
    );
  });

  // Get list of students eligible to be added to the selected group (not already in the group)
  const eligibleStudents = usersList.filter(
    user => selectedGroup && !selectedGroup.students.includes(user.id) && user.status === 'active'
  );

  return (
    <div className="space-y-lg relative font-sans">
      
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-6 right-6 bg-[#0D1527] border border-emerald-500/30 text-emerald-450 px-md py-sm rounded-lg shadow-2xl flex items-center gap-xs z-50 animate-bounce font-semibold text-xs">
          <span className="material-symbols-outlined text-sm">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-md pt-sm">
        <div>
          <h2 className="font-bold text-headline-lg text-primary text-white">Admin Console: User Panel &amp; Group Management</h2>
          <p className="text-body-md text-slate-400 font-medium">
            Moderate registered student accounts, manage chat permissions, configure study groups/rooms, and review student support threads.
          </p>
        </div>
      </div>

      {/* Tabs Hub */}
      <div className="flex border-b border-slate-800 gap-md">
        <button
          onClick={() => {
            setActiveTab('users');
            setSearchQuery('');
          }}
          className={`pb-sm px-xs font-bold text-xs tracking-wider uppercase border-b-2 cursor-pointer transition-all ${
            activeTab === 'users'
              ? 'border-emerald-500 text-emerald-450'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Student Directory ({usersList.length})
        </button>
        <button
          onClick={() => {
            setActiveTab('groups');
            setSearchQuery('');
          }}
          className={`pb-sm px-xs font-bold text-xs tracking-wider uppercase border-b-2 cursor-pointer transition-all ${
            activeTab === 'groups'
              ? 'border-emerald-500 text-emerald-450'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          User Group Management ({groupsList.length})
        </button>
        <button
          onClick={() => {
            setActiveTab('tickets');
            setSearchQuery('');
          }}
          className={`pb-sm px-xs font-bold text-xs tracking-wider uppercase border-b-2 cursor-pointer transition-all ${
            activeTab === 'tickets'
              ? 'border-emerald-500 text-emerald-450'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Support Ticket Desk ({tickets.length})
        </button>
      </div>

      {/* Dynamic Search Bar */}
      <div className="flex gap-sm items-center w-full max-w-md bg-[#0d1527]/90 border border-slate-800 rounded-xl px-sm py-2 text-xs">
        <span className="material-symbols-outlined text-slate-505 font-bold">search</span>
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder={
            activeTab === 'users'
              ? 'Search by student name, email, or registry ID...'
              : activeTab === 'groups'
              ? 'Search by group name or room...'
              : 'Search support tickets...'
          }
          className="bg-transparent border-none outline-none text-slate-200 placeholder-slate-650 w-full font-semibold"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* STUDENT DIRECTORY TAB */}
        {activeTab === 'users' && (
          <div className="lg:col-span-12 glass-panel rounded-xl p-md border border-slate-800 bg-[#0d1527]/90 text-slate-200 overflow-x-auto transition-all">
            <h3 className="font-bold text-headline-md text-white mb-md flex items-center gap-xs">
              <span className="material-symbols-outlined text-secondary font-bold">manage_accounts</span>
              Registered Student Directory
            </h3>

            <table className="w-full text-left text-xs font-medium border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                  <th className="pb-sm pl-xs">Student</th>
                  <th className="pb-sm">Focus Rating</th>
                  <th className="pb-sm">Streak</th>
                  <th className="pb-sm">Focus Wallet</th>
                  <th className="pb-sm">Status</th>
                  <th className="pb-sm pr-xs text-right">Moderation Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(user => (
                  <tr key={user.id} className={`border-b border-slate-900/50 hover:bg-[#131d33]/20 ${selectedUser?.id === user.id ? 'bg-[#182641]/35 border-l-4 border-l-emerald-500 pl-xs' : ''}`}>
                    <td className="py-sm pl-xs">
                      <div>
                        <h4 className="font-bold text-white text-xs">{user.name}</h4>
                        <p className="text-[10px] text-slate-455 leading-relaxed font-semibold mt-0.5">{user.email}</p>
                      </div>
                    </td>
                    
                    <td className="py-sm">
                      <span className={`font-bold ${user.focusScore >= 90 ? 'text-emerald-450' : user.focusScore >= 70 ? 'text-amber-500' : 'text-red-400'}`}>
                        {user.focusScore}%
                      </span>
                    </td>

                    <td className="py-sm font-semibold text-slate-300">
                      {user.currentStreak} Days
                    </td>

                    <td className="py-sm font-bold text-emerald-400">
                      {user.focusCoins} Coins
                    </td>

                    <td className="py-sm">
                      <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider ${
                        user.status === 'active' 
                          ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/20' 
                          : user.status === 'suspended'
                          ? 'bg-red-950/40 text-red-455 border border-red-900/20'
                          : 'bg-slate-900 text-slate-400 border border-slate-800'
                      }`}>
                        {user.status}
                      </span>
                    </td>

                    <td className="py-sm pr-xs text-right space-x-sm whitespace-nowrap">
                      <button
                        onClick={() => handleSelectUser(user)}
                        className="px-2 py-1 bg-slate-900 border border-slate-800 hover:bg-[#1c2e4a] text-slate-300 hover:text-white rounded font-bold text-[10px] cursor-pointer"
                        title="Edit Student Stats"
                      >
                        Inspect
                      </button>
                      <button
                        onClick={() => handleFlagAttentionCheck(user.name)}
                        className="p-1 bg-[#131d33]/50 border border-slate-800 hover:bg-[#203153]/50 text-slate-450 hover:text-slate-200 rounded cursor-pointer"
                        title="Flag Attention Check"
                      >
                        <span className="material-symbols-outlined text-sm block">videocam</span>
                      </button>
                      <button
                        onClick={() => handleKickFromRoom(user.name)}
                        className="p-1 bg-[#131d33]/50 border border-slate-800 hover:bg-amber-950/20 hover:text-amber-400 text-slate-455 rounded cursor-pointer"
                        title="Kick from Room"
                      >
                        <span className="material-symbols-outlined text-sm block">logout</span>
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-xl text-slate-500 font-semibold italic">
                      No student registry matched query.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* USER GROUP MANAGEMENT TAB */}
        {activeTab === 'groups' && (
          <>
            {/* Left Column: Groups List (5 columns) */}
            <div className="lg:col-span-5 flex flex-col gap-6">

              {/* Group Catalog List */}
              <div className="glass-panel rounded-xl p-md border border-slate-800 bg-[#0d1527]/90 text-slate-200 flex flex-col flex-grow">
                <h3 className="font-bold text-headline-sm text-white mb-md flex items-center gap-xs">
                  <span className="material-symbols-outlined text-secondary font-bold">domain</span>
                  Your Administered Groups
                </h3>

                <div className="space-y-sm max-h-[500px] overflow-y-auto pr-xs">
                  {filteredGroups.map(group => {
                    const isSelected = selectedGroup?.id === group.id;
                    return (
                      <div
                        key={group.id}
                        onClick={() => setSelectedGroup(group)}
                        className={`p-sm bg-[#131D33]/40 border rounded-xl cursor-pointer transition-all flex justify-between items-center ${
                          isSelected 
                            ? 'border-emerald-500 bg-[#131d33]/85' 
                            : 'border-slate-805 hover:border-[#1E2E4E] hover:bg-[#131D33]/60'
                        }`}
                      >
                        <div className="space-y-xs flex-1">
                          <div className="flex items-center gap-sm">
                            <h4 className="font-bold text-white text-xs">{group.name}</h4>
                            <span className={`px-2 py-0.5 rounded text-[8px] uppercase font-bold tracking-wider ${
                              group.active 
                                ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/20' 
                                : 'bg-slate-900 text-slate-400 border border-slate-800'
                            }`}>
                              {group.active ? 'Active' : 'Offline'}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">
                            {group.room} • {group.students?.length || 0} Members
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-xs">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteGroup(group.id, group.name);
                            }}
                            className="p-1.5 hover:bg-red-950/20 hover:text-red-400 text-slate-500 rounded cursor-pointer transition-all border border-transparent hover:border-red-900/35"
                            title="Delete Group"
                          >
                            <span className="material-symbols-outlined text-sm block">delete</span>
                          </button>
                          <span className="material-symbols-outlined text-slate-500 text-xs font-bold pl-xs">
                            chevron_right
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {filteredGroups.length === 0 && (
                    <div className="text-center py-xl text-slate-500 font-semibold italic text-xs">
                      No matching administered groups.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Room & Member Inspector (7 columns) */}
            <div className="lg:col-span-7">
              {selectedGroup ? (
                <div className="glass-panel rounded-xl p-md border border-slate-800 bg-[#0d1527]/90 text-slate-200 flex flex-col h-full min-h-[500px]">
                  
                  {/* Opened Room Banner */}
                  <div className="border-b border-slate-800 pb-md mb-md flex justify-between items-start">
                    <div className="space-y-xs">
                      <div className="flex items-center gap-sm">
                        <span className="material-symbols-outlined text-emerald-450">meeting_room</span>
                        <h3 className="font-bold text-headline-md text-white">{selectedGroup.name}</h3>
                      </div>
                      <p className="text-[10px] text-slate-450 uppercase tracking-widest font-bold">
                        Physical Space: <span className="text-white font-semibold lowercase font-sans">{selectedGroup.room}</span> • Code: <span className="font-mono text-emerald-400">{selectedGroup.id}</span>
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-xs text-[10px]">
                      <span className={`px-2 py-0.5 rounded uppercase font-bold tracking-wider ${
                        selectedGroup.active 
                          ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/20 animate-pulse' 
                          : 'bg-slate-900 text-slate-400 border border-slate-800'
                      }`}>
                        {selectedGroup.active ? 'Live Study Room' : 'Inactive Room'}
                      </span>
                      <span className="text-slate-500 font-semibold">Teacher: Dr. Aris Thorne</span>
                    </div>
                  </div>

                  {/* Add Member form */}
                  <div className="bg-[#131d33]/20 border border-slate-800 p-sm rounded-xl mb-md">
                    <h4 className="text-[10px] font-bold text-[#5FE29C] uppercase tracking-wider mb-sm">
                      Enroll Student to Room
                    </h4>
                    
                    <form onSubmit={handleAddStudentToGroup} className="flex gap-sm items-end">
                      <div className="flex-1 space-y-xs">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                          Select Registered Student
                        </label>
                        <select
                          value={selectedStudentToAdd}
                          onChange={e => setSelectedStudentToAdd(e.target.value)}
                          className="w-full bg-[#131D33] border border-[#1E2E4E] focus:border-emerald-500/50 rounded-lg py-2 px-sm text-slate-200 outline-none text-xs font-semibold"
                        >
                          <option value="">-- Choose student --</option>
                          {eligibleStudents.map(student => (
                            <option key={student.id} value={student.id}>
                              {student.name} ({student.email})
                            </option>
                          ))}
                        </select>
                      </div>
                      <button
                        type="submit"
                        disabled={!selectedStudentToAdd}
                        className="py-2 px-md bg-[#5FE29C] hover:bg-[#4CD08A] disabled:opacity-50 disabled:cursor-not-allowed text-[#0A101D] font-bold rounded-lg text-xs cursor-pointer transition-colors font-sans whitespace-nowrap h-[34px] flex items-center justify-center"
                      >
                        Enroll Student
                      </button>
                    </form>
                    {eligibleStudents.length === 0 && (
                      <p className="text-[9px] text-slate-500 font-medium mt-sm italic">
                        No active registered students are available to enroll.
                      </p>
                    )}
                  </div>

                  {/* Roster list */}
                  <div className="flex-1">
                    <h4 className="text-[10px] font-bold text-white uppercase tracking-wider mb-md flex items-center gap-xs">
                      <span className="material-symbols-outlined text-xs">group</span>
                      Enrolled Students ({groupMembers.length})
                    </h4>

                    <div className="space-y-sm max-h-[350px] overflow-y-auto pr-xs">
                      {filteredGroupMembers.map((member: any) => (
                        <div
                          key={member.id}
                          className="p-sm bg-[#131D33]/30 border border-slate-850 rounded-xl hover:border-slate-800 transition-all flex justify-between items-center text-xs"
                        >
                          <div className="space-y-xs">
                            <h5 className="font-bold text-white">{member.name}</h5>
                            <p className="text-[10px] text-slate-550 leading-relaxed font-semibold">
                              {member.email} • ID: <span className="font-mono">{member.id}</span>
                            </p>
                          </div>

                          <div className="flex items-center gap-md">
                            <div className="text-right text-[10px]">
                              <p className="font-bold text-emerald-450">Score: {member.focusScore}%</p>
                              <span className={`px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider font-bold ${
                                member.status === 'active'
                                  ? 'bg-emerald-950/20 text-emerald-450'
                                  : 'bg-slate-900 text-slate-400'
                              }`}>
                                {member.status}
                              </span>
                            </div>

                            <button
                              onClick={() => handleRemoveStudentFromGroup(selectedGroup.id, member.id, member.name)}
                              className="px-2 py-1 bg-red-950/20 border border-red-900/30 text-red-400 hover:bg-red-900 hover:text-white rounded font-bold text-[10px] cursor-pointer transition-colors"
                              title="Unenroll student from room"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                      {filteredGroupMembers.length === 0 && (
                        <div className="text-center py-xl text-slate-500 font-semibold italic text-xs">
                          {searchQuery 
                            ? 'No group members match the search query.' 
                            : 'This group does not have any students enrolled yet.'}
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              ) : (
                <div className="glass-panel rounded-xl p-md border border-slate-800 bg-[#0d1527]/90 text-slate-200 flex items-center justify-center h-full min-h-[500px] border-dashed text-slate-500 font-semibold italic text-xs">
                  Select an administered group from the sidebar to review room details and manage student enrollments.
                </div>
              )}
            </div>
          </>
        )}

        {/* SUPPORT TICKETS TAB */}
        {activeTab === 'tickets' && (
          <>
            {/* Left Column: Tickets list (5 columns) */}
            <div className="lg:col-span-5 glass-panel rounded-xl p-md border border-slate-800 bg-[#0d1527]/90 text-slate-200 flex flex-col h-full min-h-[500px]">
              <h3 className="font-bold text-headline-md text-white mb-md flex items-center gap-xs">
                <span className="material-symbols-outlined text-secondary font-bold">support_agent</span>
                Support Ticket Desk
              </h3>
              
              <div className="flex-grow overflow-y-auto space-y-sm max-h-[600px] pr-xs">
                {filteredTickets.map(ticket => (
                  <div
                    key={ticket.id}
                    onClick={() => setSelectedTicketId(ticket.id)}
                    className={`p-sm border rounded-xl cursor-pointer transition-all space-y-xs ${
                      selectedTicketId === ticket.id 
                        ? 'border-emerald-500 bg-[#131d33]/85' 
                        : 'border-slate-805 hover:border-[#1E2E4E] bg-[#131D33]/40 hover:bg-[#131D33]/80'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] text-slate-500 font-mono">{ticket.id}</span>
                      <span className={`px-2 py-0.5 rounded text-[8px] uppercase font-bold tracking-wider ${
                        ticket.status === 'Open'
                          ? 'bg-amber-950/40 text-amber-400 border border-amber-900/20'
                          : 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/20'
                      }`}>
                        {ticket.status}
                      </span>
                    </div>
                    <h4 className="font-bold text-white text-xs line-clamp-1">{ticket.subject}</h4>
                    <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">{ticket.message}</p>
                    <div className="flex justify-between items-center pt-xs text-[9px] text-slate-500 font-medium">
                      <span>{new Date(ticket.timestamp).toLocaleString()}</span>
                      <span>{ticket.replies?.length || 0} messages</span>
                    </div>
                  </div>
                ))}
                {filteredTickets.length === 0 && (
                  <div className="text-center py-xl text-slate-500 font-semibold italic text-xs">
                    No support tickets match the search query.
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Ticket Conversation Thread (7 columns) */}
            <div className="lg:col-span-7">
              {selectedTicketId !== null ? (
                (() => {
                  const activeTicket = tickets.find(t => t.id === selectedTicketId);
                  if (!activeTicket) {
                    setSelectedTicketId(null);
                    return null;
                  }
                  return (
                    <div className="glass-panel rounded-xl p-md border border-slate-800 bg-[#0d1527]/90 text-slate-200 flex flex-col h-full min-h-[500px]">
                      
                      {/* Detail Header */}
                      <div className="flex justify-between items-start border-b border-slate-800 pb-sm mb-md">
                        <div className="flex items-center gap-xs">
                          <button
                            onClick={() => setSelectedTicketId(null)}
                            className="p-1 hover:bg-[#131D33] text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer mr-xs"
                            title="Back to Tickets"
                          >
                            <span className="material-symbols-outlined text-sm block">arrow_back</span>
                          </button>
                          <div>
                            <h4 className="font-bold text-white text-xs leading-none">{activeTicket.subject}</h4>
                            <span className="text-[9px] text-slate-500 font-mono mt-1 block">ID: {activeTicket.id}</span>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[8px] uppercase font-bold tracking-wider ${
                          activeTicket.status === 'Open'
                            ? 'bg-amber-950/40 text-amber-400 border border-amber-900/20'
                            : 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/20'
                        }`}>
                          {activeTicket.status}
                        </span>
                      </div>

                      {/* Original Student Query */}
                      <div className="bg-[#131d33]/20 border border-slate-800/60 p-sm rounded-xl space-y-xs mb-md">
                        <p className="text-[9px] text-[#5FE29C] font-bold uppercase tracking-wider">Original Query</p>
                        <p className="text-xs text-slate-200 leading-relaxed font-semibold">{activeTicket.message}</p>
                        <p className="text-[9px] text-slate-505 font-medium">{new Date(activeTicket.timestamp).toLocaleString()}</p>
                      </div>

                      {/* Message Bubble Thread */}
                      <div className="flex-1 overflow-y-auto space-y-sm max-h-[300px] min-h-[180px] bg-[#0a101d]/50 border border-slate-900/80 p-sm rounded-xl pr-2 mb-md">
                        {activeTicket.replies?.map((rep, idx) => {
                          const isAdminReply = rep.user === 'Support Agent' || rep.user === 'Administrator';
                          const isBotReply = rep.user === 'Support Bot';
                          return (
                            <div
                              key={idx}
                              className={`flex flex-col max-w-[85%] space-y-1 ${
                                isAdminReply ? 'ml-auto items-end' : 'mr-auto items-start'
                              }`}
                            >
                              <span className="text-[9px] font-bold text-slate-455">
                                {rep.user}
                              </span>
                              <div
                                className={`p-sm rounded-xl text-xs leading-relaxed ${
                                  isAdminReply
                                    ? 'bg-[#1e2e4e] text-white rounded-tr-none'
                                    : isBotReply
                                    ? 'bg-slate-800/40 text-slate-350 rounded-tl-none border border-slate-800'
                                    : 'bg-[#131d33] text-slate-200 rounded-tl-none border border-slate-850'
                                }`}
                              >
                                {rep.text}
                              </div>
                              <span className="text-[8px] text-slate-500">
                                {new Date(rep.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Reply Form */}
                      <form onSubmit={handleSendAdminReply} className="space-y-sm pt-xs mt-auto">
                        <div className="relative">
                          <textarea
                            required
                            rows={3}
                            value={adminReplyText}
                            onChange={e => setAdminReplyText(e.target.value)}
                            placeholder="Type your official support response here..."
                            className="w-full bg-[#131D33] border border-[#1E2E4E] focus:border-emerald-500/50 rounded-lg p-sm text-slate-200 outline-none text-xs font-semibold placeholder-slate-600"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={isSendingReply || !adminReplyText.trim()}
                          className="w-full py-2 bg-[#5FE29C] hover:bg-[#4CD08A] text-[#0A101D] font-bold rounded-lg text-xs flex items-center justify-center gap-xs cursor-pointer disabled:opacity-50 transition-colors font-sans"
                        >
                          {isSendingReply ? 'Sending response...' : 'Send Response'}
                          <span className="material-symbols-outlined text-[16px] font-bold">send</span>
                        </button>
                      </form>
                    </div>
                  );
                })()
              ) : (
                <div className="glass-panel rounded-xl p-md border border-slate-800 bg-[#0d1527]/90 text-slate-200 flex items-center justify-center h-full min-h-[500px] border-dashed text-slate-500 font-semibold italic text-xs">
                  Select a support ticket from the list to review the thread history and send replies.
                </div>
              )}
            </div>
          </>
        )}

      </div>

      {/* Edit Student profile Modal Overlay */}
      {selectedUser && (
        <div className="fixed inset-0 bg-[#091426]/75 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-[#0d1527] border border-[#1e2e4e] rounded-2xl p-6 max-w-md w-full shadow-2xl relative text-slate-200 flex flex-col justify-between animate-fade-in">
            <div>
              <div className="flex justify-between items-start mb-md">
                <div>
                  <h3 className="font-bold text-headline-md text-white flex items-center gap-xs">
                    <span className="material-symbols-outlined text-secondary">tune</span>
                    Moderate Student
                  </h3>
                  <p className="text-label-sm text-slate-450 font-semibold mt-1">
                    {selectedUser.name}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="text-slate-555 hover:text-slate-350 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>

              <form onSubmit={handleSaveUserChanges} className="space-y-md">
                <div className="space-y-xs">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Account Status
                  </label>
                  <select
                    value={editStatus}
                    onChange={e => setEditStatus(e.target.value as any)}
                    className="w-full bg-[#131D33] border border-[#1E2E4E] focus:border-emerald-500/50 rounded-lg py-2 px-sm text-slate-200 outline-none text-xs font-semibold"
                  >
                    <option value="active">Active (Access to all rooms)</option>
                    <option value="offline">Offline (Registered student offline)</option>
                    <option value="suspended">Suspended (Blocked access &amp; rooms)</option>
                  </select>
                </div>

                <div className="space-y-xs">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest flex justify-between">
                    <span>Chat Privileges</span>
                    <span className={editChatMuted ? 'text-red-400' : 'text-emerald-450'}>
                      {editChatMuted ? 'Muted' : 'Allowed'}
                    </span>
                  </label>
                  <select
                    value={editChatMuted ? 'muted' : 'allowed'}
                    onChange={e => setEditChatMuted(e.target.value === 'muted')}
                    className="w-full bg-[#131D33] border border-[#1E2E4E] focus:border-emerald-500/50 rounded-lg py-2 px-sm text-slate-200 outline-none text-xs font-semibold"
                  >
                    <option value="allowed">Allowed (Send messages in rooms)</option>
                    <option value="muted">Muted (Restrict study chat privileges)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-sm">
                  <div className="space-y-xs">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Streak Days
                    </label>
                    <input
                      type="number"
                      value={editStreak}
                      onChange={e => setEditStreak(parseInt(e.target.value) || 0)}
                      className="w-full bg-[#131D33] border border-[#1E2E4E] rounded-lg py-2 px-sm text-slate-200 outline-none text-xs font-semibold"
                    />
                  </div>
                  <div className="space-y-xs">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Focus Coins
                    </label>
                    <input
                      type="number"
                      value={editCoins}
                      onChange={e => setEditCoins(parseInt(e.target.value) || 0)}
                      className="w-full bg-[#131D33] border border-[#1E2E4E] rounded-lg py-2 px-sm text-slate-200 outline-none text-xs font-semibold"
                    />
                  </div>
                </div>

                <div className="space-y-xs">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest flex justify-between">
                    <span>Override Focus Score</span>
                    <span className="text-emerald-400">{editScore}%</span>
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="1"
                    value={editScore}
                    onChange={e => setEditScore(parseInt(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>

                <div className="pt-xs flex gap-sm">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-bold rounded-lg text-xs hover:from-emerald-500 hover:to-emerald-650 cursor-pointer shadow-md disabled:opacity-50"
                  >
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteUser(selectedUser.id, selectedUser.name)}
                    className="px-sm py-2 bg-red-950/20 hover:bg-red-900 border border-red-900/30 text-red-400 hover:text-white rounded-lg font-bold text-xs cursor-pointer transition-all"
                    title="Delete Student account"
                  >
                    Delete
                  </button>
                </div>
              </form>
            </div>

            <div className="p-sm bg-slate-900 border border-slate-805 rounded-lg text-center mt-md text-[10px] font-semibold text-slate-500">
              Student ID: <span className="font-mono text-slate-400">{selectedUser.id}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
