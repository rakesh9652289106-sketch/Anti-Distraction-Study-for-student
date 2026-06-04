'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';

export default function AdminRewardsConfigPage() {
  const { fetchData } = useApp();
  const [rewardsList, setRewardsList] = useState<any[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCost, setNewCost] = useState(50);
  const [newIcon, setNewIcon] = useState('star');
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCost, setEditCost] = useState(0);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editIcon, setEditIcon] = useState('star');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const loadRewards = async () => {
    try {
      const res = await fetch('/api/rewards');
      if (res.ok) {
        const data = await res.json();
        setRewardsList(data.items || []);
      }
    } catch (err) {
      console.error('Failed to load rewards list:', err);
    }
  };

  useEffect(() => {
    loadRewards();
  }, []);

  const handleCreateReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/rewards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          title: newTitle.trim(),
          description: newDesc.trim(),
          cost: newCost,
          icon: newIcon
        })
      });

      if (res.ok) {
        setNewTitle('');
        setNewDesc('');
        setNewCost(50);
        setNewIcon('star');
        triggerToast('New reward item added to shop!');
        await loadRewards();
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (item: any) => {
    setEditingId(item.id);
    setEditTitle(item.title);
    setEditDesc(item.description);
    setEditCost(item.cost);
    setEditIcon(item.icon);
  };

  const handleSaveEdit = async (itemId: string) => {
    try {
      const res = await fetch('/api/rewards', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          itemId,
          title: editTitle.trim(),
          description: editDesc.trim(),
          cost: editCost,
          icon: editIcon
        })
      });

      if (res.ok) {
        setEditingId(null);
        triggerToast('Reward item details updated.');
        await loadRewards();
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteReward = async (itemId: string, title: string) => {
    if (!confirm(`Are you sure you want to remove "${title}" from the rewards shop?`)) return;

    try {
      const res = await fetch(`/api/rewards?itemId=${itemId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        triggerToast(`Reward item "${title}" deleted.`);
        await loadRewards();
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetPurchases = async () => {
    if (!confirm('Wipe all purchases? This makes all shop rewards purchasable again and resets coins.')) return;

    try {
      const res = await fetch('/api/rewards', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' })
      });

      if (res.ok) {
        triggerToast('All purchases reset to initial state!');
        await loadRewards();
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-lg relative">
      
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
          <h2 className="font-bold text-headline-lg text-primary text-white">Panel Configuration: Rewards &amp; Engagement</h2>
          <p className="text-body-md text-slate-400 font-medium">
            Manage rewards items, set coin values, and reset student purchase states.
          </p>
        </div>
        
        <button
          onClick={handleResetPurchases}
          className="px-md py-sm bg-slate-900 border border-slate-800 text-amber-500 hover:text-amber-400 font-bold text-xs rounded-lg flex items-center gap-xs cursor-pointer active:scale-95 transition-all shadow"
        >
          <span className="material-symbols-outlined text-sm font-bold">restart_alt</span>
          Reset Purchases &amp; Coins
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Rewards list Table (8 cols) */}
        <div className="lg:col-span-8 glass-panel rounded-xl p-md border border-slate-800 bg-[#0d1527]/90 text-slate-200 overflow-x-auto">
          <h3 className="font-bold text-headline-md text-white mb-md flex items-center gap-xs">
            <span className="material-symbols-outlined text-secondary font-bold">military_tech</span>
            Rewards Store Registry
          </h3>

          <table className="w-full text-left text-xs font-medium border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                <th className="pb-sm pl-xs">Item</th>
                <th className="pb-sm">Cost</th>
                <th className="pb-sm">Icon</th>
                <th className="pb-sm">Status</th>
                <th className="pb-sm pr-xs text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rewardsList.map(item => (
                <tr key={item.id} className="border-b border-slate-900/50 hover:bg-[#131d33]/20">
                  <td className="py-sm pl-xs max-w-xs">
                    {editingId === item.id ? (
                      <div className="space-y-xs">
                        <input
                          type="text"
                          value={editTitle}
                          onChange={e => setEditTitle(e.target.value)}
                          className="bg-[#131D33] border border-[#1E2E4E] rounded py-1 px-2 text-white outline-none w-full text-xs font-bold"
                        />
                        <input
                          type="text"
                          value={editDesc}
                          onChange={e => setEditDesc(e.target.value)}
                          className="bg-[#131D33] border border-[#1E2E4E] rounded py-1 px-2 text-slate-350 outline-none w-full text-[10px]"
                        />
                      </div>
                    ) : (
                      <div>
                        <h4 className="font-bold text-white text-xs">{item.title}</h4>
                        <p className="text-[10px] text-slate-450 leading-relaxed font-semibold mt-0.5">{item.description}</p>
                      </div>
                    )}
                  </td>
                  
                  <td className="py-sm">
                    {editingId === item.id ? (
                      <input
                        type="number"
                        value={editCost}
                        onChange={e => setEditCost(parseInt(e.target.value) || 0)}
                        className="bg-[#131D33] border border-[#1E2E4E] rounded py-1 px-2 text-slate-200 outline-none w-20 text-xs font-semibold"
                      />
                    ) : (
                      <span className="font-bold text-emerald-400">{item.cost} Coins</span>
                    )}
                  </td>

                  <td className="py-sm">
                    {editingId === item.id ? (
                      <input
                        type="text"
                        value={editIcon}
                        onChange={e => setEditIcon(e.target.value)}
                        className="bg-[#131D33] border border-[#1E2E4E] rounded py-1 px-2 text-slate-200 outline-none w-20 text-xs font-semibold"
                      />
                    ) : (
                      <span className="material-symbols-outlined text-slate-350 text-sm">{item.icon}</span>
                    )}
                  </td>

                  <td className="py-sm">
                    <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider ${
                      item.purchased ? 'bg-slate-800 text-slate-450' : 'bg-emerald-950/40 text-emerald-400'
                    }`}>
                      {item.purchased ? 'Bought' : 'Available'}
                    </span>
                  </td>

                  <td className="py-sm pr-xs text-right space-x-sm whitespace-nowrap">
                    {editingId === item.id ? (
                      <>
                        <button
                          onClick={() => handleSaveEdit(item.id)}
                          className="px-2 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded font-bold text-[10px] cursor-pointer"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-2 py-1 bg-slate-900 border border-slate-800 text-slate-400 rounded font-bold text-[10px] cursor-pointer"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleStartEdit(item)}
                          className="p-1.5 bg-slate-900 border border-slate-850 hover:bg-[#1c2e4a] text-slate-350 hover:text-white rounded transition-colors cursor-pointer"
                          title="Edit Details"
                        >
                          <span className="material-symbols-outlined text-sm block">edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteReward(item.id, item.title)}
                          className="p-1.5 bg-red-950/20 border border-red-900/30 text-red-400 hover:bg-red-905 hover:text-white rounded transition-colors cursor-pointer"
                          title="Delete Reward"
                        >
                          <span className="material-symbols-outlined text-sm block">delete</span>
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {rewardsList.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-xl text-slate-500 font-semibold italic">
                    No shop items configured.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Add reward form (4 cols) */}
        <div className="lg:col-span-4 glass-panel rounded-xl p-md border border-slate-800 bg-[#0d1527]/90 text-slate-200">
          <h3 className="font-bold text-headline-md text-white mb-xs flex items-center gap-xs">
            <span className="material-symbols-outlined text-secondary">add_circle</span>
            Add Reward Item
          </h3>
          <p className="text-label-sm text-slate-400 font-medium mb-lg">
            Create a new purchasable styling or theme item in the shop.
          </p>

          <form onSubmit={handleCreateReward} className="space-y-md">
            <div className="space-y-xs">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Reward Title
              </label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="e.g. Lofi Cozy Theme"
                className="w-full bg-[#131D33] border border-[#1E2E4E] focus:border-emerald-500/50 rounded-lg py-2 px-sm text-slate-200 outline-none text-xs font-semibold"
              />
            </div>

            <div className="space-y-xs">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Cost (Focus Coins)
              </label>
              <input
                type="number"
                required
                value={newCost}
                onChange={e => setNewCost(parseInt(e.target.value) || 0)}
                placeholder="Cost in coins"
                className="w-full bg-[#131D33] border border-[#1E2E4E] focus:border-emerald-500/50 rounded-lg py-2 px-sm text-slate-200 outline-none text-xs font-semibold"
              />
            </div>

            <div className="space-y-xs">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Icon Name
              </label>
              <select
                value={newIcon}
                onChange={e => setNewIcon(e.target.value)}
                className="w-full bg-[#131D33] border border-[#1E2E4E] focus:border-emerald-500/50 rounded-lg py-2 px-sm text-slate-200 outline-none text-xs font-semibold animate-none"
              >
                <option value="star">Star</option>
                <option value="forest">Forest / Pine</option>
                <option value="blur_on">Space Spark</option>
                <option value="bolt">Cyber Bolt</option>
                <option value="military_tech">Badge</option>
                <option value="palette">Paint Brush</option>
                <option value="music_note">Music Note</option>
              </select>
            </div>

            <div className="space-y-xs">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Description
              </label>
              <textarea
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                placeholder="e.g. Calming sage overlays for absolute concentration..."
                className="w-full bg-[#131D33] border border-[#1E2E4E] focus:border-emerald-500/50 rounded-lg py-2 px-sm text-slate-200 outline-none text-xs font-semibold resize-none h-20"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-bold rounded-lg text-xs hover:from-emerald-500 hover:to-emerald-650 cursor-pointer shadow-md disabled:opacity-50"
            >
              {isSubmitting ? 'Creating Item...' : 'Deploy Shop Reward'}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
