'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';

export default function AdminUserManagementPage() {
  const { tickets, fetchData } = useApp();
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [adminReplyText, setAdminReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);

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
  const [usersList, setUsersList] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
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

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
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

  useEffect(() => {
    loadUsers();
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

  const handleFlagAttentionCheck = (name: string) => {
    triggerToast(`Sent priority Attention Camera calibration alert to ${name}.`);
  };

  const handleKickFromRoom = (name: string) => {
    triggerToast(`Kicked ${name} from active virtual study space.`);
  };

  // Filter list
  const filteredUsers = usersList.filter(user => {
    const term = searchQuery.toLowerCase();
    return (
      user.name.toLowerCase().includes(term) ||
      user.email.toLowerCase().includes(term) ||
      user.id.toLowerCase().includes(term)
    );
  });

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
            Moderate registered student accounts, manage chat permissions, kick idle users, and override focus metrics.
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex gap-sm items-center w-full max-w-md bg-[#0d1527]/90 border border-slate-800 rounded-xl px-sm py-2 text-xs">
        <span className="material-symbols-outlined text-slate-505 font-bold">search</span>
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search by student name, email, or registry ID..."
          className="bg-transparent border-none outline-none text-slate-200 placeholder-slate-650 w-full font-semibold"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* User directory table (6 columns) */}
        <div className="lg:col-span-6 glass-panel rounded-xl p-md border border-slate-800 bg-[#0d1527]/90 text-slate-200 overflow-x-auto transition-all">
          <h3 className="font-bold text-headline-md text-white mb-md flex items-center gap-xs">
            <span className="material-symbols-outlined text-secondary font-bold">manage_accounts</span>
            Registered Student Directory ({usersList.length})
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

        {/* Support Tickets Desk (6 columns) */}
        <div className="lg:col-span-6 glass-panel rounded-xl p-md border border-slate-800 bg-[#0d1527]/90 text-slate-200 flex flex-col h-full min-h-[500px]">
          {selectedTicketId === null ? (
            // LIST VIEW
            <>
              <h3 className="font-bold text-headline-md text-white mb-md flex items-center gap-xs">
                <span className="material-symbols-outlined text-secondary font-bold">support_agent</span>
                Support Ticket Desk ({tickets.length})
              </h3>
              
              <div className="flex-1 overflow-y-auto space-y-sm max-h-[600px] pr-xs">
                {tickets.map(ticket => (
                  <div
                    key={ticket.id}
                    onClick={() => setSelectedTicketId(ticket.id)}
                    className="p-sm bg-[#131D33]/40 border border-slate-805 hover:border-[#1E2E4E] hover:bg-[#131D33]/80 rounded-xl cursor-pointer transition-all space-y-xs"
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
                {tickets.length === 0 && (
                  <div className="text-center py-xl text-slate-500 font-semibold italic text-xs">
                    No support tickets submitted by students.
                  </div>
                )}
              </div>
            </>
          ) : (
            // CONVERSATION THREAD DETAIL VIEW
            (() => {
              const activeTicket = tickets.find(t => t.id === selectedTicketId);
              if (!activeTicket) {
                setSelectedTicketId(null);
                return null;
              }
              return (
                <div className="flex flex-col h-full space-y-md flex-1">
                  {/* Detail Header */}
                  <div className="flex justify-between items-start border-b border-slate-800 pb-sm">
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
                  <div className="bg-[#131d33]/20 border border-slate-800/60 p-sm rounded-xl space-y-xs">
                    <p className="text-[9px] text-[#5FE29C] font-bold uppercase tracking-wider">Original Query</p>
                    <p className="text-xs text-slate-200 leading-relaxed font-semibold">{activeTicket.message}</p>
                    <p className="text-[9px] text-slate-505 font-medium">{new Date(activeTicket.timestamp).toLocaleString()}</p>
                  </div>

                  {/* Message Bubble Thread */}
                  <div className="flex-1 overflow-y-auto space-y-sm max-h-[300px] min-h-[180px] bg-[#0a101d]/50 border border-slate-900/80 p-sm rounded-xl pr-2">
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
                  <form onSubmit={handleSendAdminReply} className="space-y-sm pt-xs">
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
          )}
        </div>

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
