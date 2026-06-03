'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';

export default function SupportPage() {
  const { tickets, submitSupportTicket, fetchData } = useApp();
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [newTicketSubject, setNewTicketSubject] = useState('');
  const [newTicketMsg, setNewTicketMsg] = useState('');
  const [showSubmitForm, setShowSubmitForm] = useState(false);

  // Set default selected ticket if available
  useEffect(() => {
    if (tickets.length > 0 && !selectedTicketId) {
      setSelectedTicketId(tickets[0].id);
    }
  }, [tickets, selectedTicketId]);

  const activeTicket = tickets.find(t => t.id === selectedTicketId) || null;

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedTicketId) return;

    try {
      // Post reply to ticket (we can simulate this on backend using a new endpoint or update it)
      // For simplicity, we can modify tickets directly since we can call an API or send it.
      // Let's create an API route for replies, or just edit the ticket on the server.
      // Wait, let's write a simple patch for tickets. Since we don't have a specific replies endpoint, 
      // let's fetch the local ticket, add reply and update it.
      // Wait! We can update the ticket in the database by sending a request.
      // Since we didn't write an API PATCH endpoint for tickets, let's look at how we can implement it.
      // Oh! We can write a simple endpoint `/api/support/[id]` to add replies!
      // Let's create `src/app/api/support/[id]/route.ts` that handles POST to add a reply.
      // But wait! We can also just send it to a replies route, or write it now.
      // Let's write the PATCH/POST endpoint first. It is very fast and takes 10 seconds!
      const res = await fetch(`/api/support/${selectedTicketId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: 'Support Agent', text: replyText })
      });
      
      if (res.ok) {
        setReplyText('');
        await fetchData();
      } else {
        alert('Failed to send reply');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicketSubject.trim() || !newTicketMsg.trim()) return;

    await submitSupportTicket(newTicketSubject, newTicketMsg);
    setNewTicketSubject('');
    setNewTicketMsg('');
    setShowSubmitForm(false);
    alert('Ticket submitted successfully! It has been added to your Inbox list.');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] w-full">
      {/* Page Header */}
      <div className="mb-sm shrink-0">
        <h2 className="font-bold text-headline-lg text-primary">Student Support Desk</h2>
        <p className="text-body-md text-on-surface-variant font-medium">
          Manage support queries and assist students in maintaining focus.
        </p>
      </div>

      {/* Main Content Layout Grid */}
      <div className="flex-1 flex overflow-hidden border border-outline-variant/30 rounded-xl bg-white shadow-sm">
        
        {/* Inbox Left Column */}
        <section className="w-80 flex flex-col border-r border-outline-variant/30 bg-slate-50 shrink-0 h-full">
          {/* Stats Bar */}
          <div className="p-sm border-b border-outline-variant/20 space-y-xs">
            <h3 className="font-bold text-label-md text-primary">Inbox</h3>
            <div className="flex gap-xs">
              <div className="flex-1 bg-white p-2 rounded border border-outline-variant/10 text-center">
                <span className="text-[10px] text-on-surface-variant font-bold block uppercase">Open Tickets</span>
                <span className="text-lg font-bold text-primary">{tickets.length}</span>
              </div>
              <div className="flex-1 bg-white p-2 rounded border border-outline-variant/10 text-center">
                <span className="text-[10px] text-on-surface-variant font-bold block uppercase">Avg Response</span>
                <span className="text-lg font-bold text-secondary">5m</span>
              </div>
            </div>
          </div>

          {/* New Ticket Trigger */}
          <div className="p-2 border-b border-outline-variant/20 bg-white">
            <button
              onClick={() => setShowSubmitForm(!showSubmitForm)}
              className="w-full py-1.5 bg-primary text-on-primary text-xs font-semibold rounded-lg hover:bg-primary/95 cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-xs"
            >
              <span className="material-symbols-outlined text-sm font-bold">add</span>
              {showSubmitForm ? 'View Tickets' : 'Simulate New Ticket'}
            </button>
          </div>

          {/* Tickets Scroll List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-sm">
            {showSubmitForm ? (
              <form onSubmit={handleCreateTicket} className="p-2 space-y-sm bg-white rounded border border-outline-variant/25">
                <h4 className="text-xs font-bold text-primary uppercase">New Support Ticket</h4>
                <div>
                  <label className="text-[10px] font-bold text-on-surface-variant block mb-1">Subject</label>
                  <input
                    type="text"
                    required
                    value={newTicketSubject}
                    onChange={e => setNewTicketSubject(e.target.value)}
                    placeholder="e.g. Lock screen frozen"
                    className="w-full px-2 py-1 border border-outline-variant/50 rounded text-xs outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-on-surface-variant block mb-1">Message</label>
                  <textarea
                    required
                    value={newTicketMsg}
                    onChange={e => setNewTicketMsg(e.target.value)}
                    placeholder="Describe the issue..."
                    className="w-full px-2 py-1 border border-outline-variant/50 rounded text-xs outline-none focus:border-primary h-20 resize-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-1.5 bg-secondary text-white text-xs font-bold rounded cursor-pointer"
                >
                  Submit
                </button>
              </form>
            ) : (
              tickets.map(ticket => {
                const isActive = selectedTicketId === ticket.id;
                return (
                  <div
                    key={ticket.id}
                    onClick={() => setSelectedTicketId(ticket.id)}
                    className={`p-sm rounded-lg border cursor-pointer hover:bg-white transition-all relative ${
                      isActive
                        ? 'bg-white border-primary shadow-sm'
                        : 'bg-transparent border-outline-variant/15 opacity-80'
                    }`}
                  >
                    {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-secondary rounded-l-lg"></div>}
                    <div className="flex justify-between items-start mb-0.5">
                      <span className="font-bold text-xs text-primary truncate max-w-[120px]">Student User</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(ticket.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <h4 className="text-xs font-semibold text-slate-700 truncate">{ticket.subject}</h4>
                    <p className="text-[11px] text-on-surface-variant truncate">{ticket.message}</p>
                    <span className="mt-2 inline-block text-[9px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-bold uppercase">
                      {ticket.status}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Conversation View (Right Column) */}
        <section className="flex-1 flex flex-col h-full bg-slate-50/20">
          {activeTicket ? (
            <>
              {/* Active Conversation Header */}
              <div className="p-md border-b border-outline-variant/20 flex justify-between items-center bg-white shrink-0">
                <div>
                  <h3 className="font-bold text-headline-md text-primary">{activeTicket.subject}</h3>
                  <p className="text-xs text-on-surface-variant font-medium mt-0.5">
                    Ticket ID: #{activeTicket.id} &bull; Student &bull; High Priority
                  </p>
                </div>
                <span className="px-3 py-1 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-bold uppercase">
                  {activeTicket.status}
                </span>
              </div>

              {/* Chat Messages scroll area */}
              <div className="flex-1 overflow-y-auto p-md space-y-md">
                {/* Initial student report */}
                <div className="flex gap-sm max-w-2xl">
                  <div className="w-8 h-8 rounded-full bg-slate-200 border border-outline-variant/20 flex items-center justify-center font-bold text-xs text-slate-500 shrink-0">
                    ST
                  </div>
                  <div>
                    <div className="bg-white p-md rounded-2xl rounded-tl-none border border-outline-variant/30 shadow-sm">
                      <p className="text-label-sm text-slate-700 leading-relaxed font-semibold">
                        {activeTicket.message}
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 block ml-1">
                      {new Date(activeTicket.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                {/* System Assignment Log */}
                <div className="flex justify-center">
                  <span className="bg-slate-200/55 text-slate-500 font-bold text-[9px] px-2 py-0.5 rounded-full uppercase">
                    System Assigned to Support Representative
                  </span>
                </div>

                {/* Conversation Replies List */}
                {activeTicket.replies.map((reply, index) => {
                  const isAgent = reply.user === 'Support Agent';
                  return (
                    <div key={index} className={`flex gap-sm max-w-2xl ${isAgent ? 'ml-auto flex-row-reverse' : ''}`}>
                      <div className="w-8 h-8 rounded-full bg-slate-200 border border-outline-variant/20 flex items-center justify-center font-bold text-xs text-slate-500 shrink-0">
                        {reply.user[0]}
                      </div>
                      <div>
                        <div className={`p-md border rounded-2xl shadow-sm ${
                          isAgent
                            ? 'bg-primary border-primary text-white rounded-tr-none'
                            : 'bg-white border-outline-variant/30 text-slate-700 rounded-tl-none'
                        }`}>
                          <p className="text-label-sm leading-relaxed font-semibold">{reply.text}</p>
                        </div>
                        <span className={`text-[10px] text-slate-400 mt-1 block ${isAgent ? 'text-right mr-1' : 'ml-1'}`}>
                          {new Date(reply.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Reply submission form */}
              <form onSubmit={handleSendReply} className="p-md border-t border-outline-variant/20 bg-white shrink-0 space-y-sm">
                <textarea
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder={`Type your reply to student...`}
                  className="w-full p-sm border border-outline-variant/50 focus:border-primary focus:ring-1 focus:ring-primary rounded-lg text-label-sm outline-none resize-none bg-surface/20 min-h-[80px]"
                />
                
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-md py-2 bg-primary hover:bg-primary/95 text-on-primary rounded-lg text-label-sm font-semibold cursor-pointer active:scale-95 transition-all shadow-sm flex items-center gap-xs"
                  >
                    Send Reply
                    <span className="material-symbols-outlined text-[16px] font-bold">send</span>
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
              <span className="material-symbols-outlined text-4xl mb-xs">mail</span>
              <p className="text-label-sm font-semibold">Select a ticket from the Inbox to view details</p>
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
