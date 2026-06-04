'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';

export default function AdminGroupEnvironmentsPage() {
  const { fetchData } = useApp();
  const [groupConfig, setGroupConfig] = useState({
    maxUsersPerGroup: 8,
    allowScreenShare: true,
    videoStreamRequired: false,
    chatModerationFilter: true,
    censorWords: ['spam', 'cheat', 'abuse', 'slack', 'tiktok'],
    idleTimeoutMinutes: 15
  });

  const [newCensorWord, setNewCensorWord] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const fetchGroupSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        if (data.groupConfig) {
          setGroupConfig(data.groupConfig);
        }
      }
    } catch (err) {
      console.error('Failed to load group configurations:', err);
    }
  };

  useEffect(() => {
    fetchGroupSettings();
  }, []);

  const handleSaveConfig = async (updatedConfig = groupConfig) => {
    setIsUpdating(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupConfig: updatedConfig })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.groupConfig) {
          setGroupConfig(data.groupConfig);
        }
        triggerToast('Group policies and space rules updated!');
        await fetchData(); // refresh global state
      }
    } catch (err) {
      console.error('Failed to save group configurations:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleField = (field: string) => {
    const updated = { ...groupConfig, [field]: !((groupConfig as any)[field]) };
    setGroupConfig(updated);
    handleSaveConfig(updated);
  };

  const handleSliderChange = (field: string, val: number) => {
    setGroupConfig(prev => ({ ...prev, [field]: val }));
  };

  const handleAddCensorWord = (e: React.FormEvent) => {
    e.preventDefault();
    const word = newCensorWord.trim().toLowerCase();
    if (!word) return;

    if (groupConfig.censorWords.includes(word)) {
      triggerToast(`"${word}" is already in the filter list.`);
      setNewCensorWord('');
      return;
    }

    const updated = {
      ...groupConfig,
      censorWords: [...groupConfig.censorWords, word]
    };
    setGroupConfig(updated);
    setNewCensorWord('');
    handleSaveConfig(updated);
  };

  const handleRemoveCensorWord = (word: string) => {
    const updated = {
      ...groupConfig,
      censorWords: groupConfig.censorWords.filter(w => w !== word)
    };
    setGroupConfig(updated);
    handleSaveConfig(updated);
  };

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
          <h2 className="font-bold text-headline-lg text-primary text-white flex items-center gap-xs">
            Panel Configuration: Group Study Environments
            {isUpdating && (
              <span className="text-[10px] bg-secondary/15 text-secondary font-bold px-2 py-0.5 rounded-full flex items-center gap-1 font-sans ml-2">
                <div className="w-2.5 h-2.5 border border-secondary border-t-transparent rounded-full animate-spin"></div>
                Saving...
              </span>
            )}
          </h2>
          <p className="text-body-md text-slate-400 font-medium">
            Configure default settings, permissions, webcam controls, and chat keyword moderation rules for study groups.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Spacing & Perms Configuration Card (7 cols) */}
        <div className="lg:col-span-7 glass-panel rounded-xl p-md border border-slate-800 bg-[#0d1527]/90 text-slate-200 space-y-md">
          <h3 className="font-bold text-headline-md text-white mb-xs flex items-center gap-xs">
            <span className="material-symbols-outlined text-secondary">groups</span>
            Group Access &amp; Room Parameters
          </h3>
          <p className="text-label-sm text-slate-400 font-medium mb-lg">
            Manage study capacity limits, webcams verification, and screen shares.
          </p>

          <div className="space-y-md">
            {/* Max Users per Room */}
            <div className="space-y-sm">
              <div className="flex justify-between text-xs font-bold text-slate-350">
                <span>Maximum Capacity per Study Group</span>
                <span className="text-emerald-400">{groupConfig.maxUsersPerGroup} Members</span>
              </div>
              <div className="flex gap-sm items-center">
                <input
                  type="range"
                  min="2"
                  max="30"
                  step="1"
                  value={groupConfig.maxUsersPerGroup}
                  onChange={e => handleSliderChange('maxUsersPerGroup', parseInt(e.target.value))}
                  onMouseUp={() => handleSaveConfig()}
                  onTouchEnd={() => handleSaveConfig()}
                  className="flex-1 accent-emerald-500 cursor-pointer"
                />
              </div>
              <p className="text-[9px] text-slate-500 leading-tight">
                Controls the maximum concurrent peer streams permitted in the room view grid before joining is blocked.
              </p>
            </div>

            {/* Auto-Idle Timeout Slider */}
            <div className="space-y-sm">
              <div className="flex justify-between text-xs font-bold text-slate-350">
                <span>Auto-Idle Session Expiry Timeout</span>
                <span className="text-emerald-400">{groupConfig.idleTimeoutMinutes} minutes</span>
              </div>
              <div className="flex gap-sm items-center">
                <input
                  type="range"
                  min="5"
                  max="60"
                  step="5"
                  value={groupConfig.idleTimeoutMinutes}
                  onChange={e => handleSliderChange('idleTimeoutMinutes', parseInt(e.target.value))}
                  onMouseUp={() => handleSaveConfig()}
                  onTouchEnd={() => handleSaveConfig()}
                  className="flex-1 accent-emerald-500 cursor-pointer"
                />
              </div>
              <p className="text-[9px] text-slate-500 leading-tight">
                Automatically disconnects inactive student profiles from group rooms if distraction webcam checks are missing.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-md pt-xs">
              {/* Screen Share Toggle */}
              <div className="p-sm rounded-lg bg-[#131d33]/50 border border-slate-850 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">Allow Screen Sharing</span>
                  <span className="text-[9px] text-slate-400 font-semibold leading-tight">Let students share browser tabs</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer scale-90">
                  <input
                    type="checkbox"
                    checked={groupConfig.allowScreenShare}
                    onChange={() => handleToggleField('allowScreenShare')}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              {/* Webcam Mandatory Toggle */}
              <div className="p-sm rounded-lg bg-[#131d33]/50 border border-slate-850 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">Mandatory Webcams</span>
                  <span className="text-[9px] text-slate-400 font-semibold leading-tight">Force camera feed to join group</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer scale-90">
                  <input
                    type="checkbox"
                    checked={groupConfig.videoStreamRequired}
                    onChange={() => handleToggleField('videoStreamRequired')}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>
            </div>

          </div>
        </div>

        {/* Chat Moderation Card (5 cols) */}
        <div className="lg:col-span-5 glass-panel rounded-xl p-md border border-slate-800 bg-[#0d1527]/90 text-slate-200 space-y-md">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-headline-md text-white flex items-center gap-xs">
              <span className="material-symbols-outlined text-secondary">forum</span>
              Chat Moderation Policy
            </h3>
            
            <label className="relative inline-flex items-center cursor-pointer scale-90">
              <input
                type="checkbox"
                checked={groupConfig.chatModerationFilter}
                onChange={() => handleToggleField('chatModerationFilter')}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>
          
          <p className="text-label-sm text-slate-400 font-medium mb-lg">
            Automatically filter restricted words and enforce study chat etiquette.
          </p>

          <div className="space-y-sm">
            <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-widest">
              Restricted Keywords (Censored Words)
            </label>
            
            <div className="flex flex-wrap gap-xs min-h-28 max-h-36 overflow-y-auto border border-slate-800/80 p-sm rounded-lg bg-[#131d33]/30">
              {groupConfig.censorWords.map(word => (
                <span
                  key={word}
                  className="inline-flex items-center gap-xs px-2 py-0.5 bg-slate-900 border border-slate-800 text-slate-300 text-[10px] font-bold rounded-full"
                >
                  {word}
                  <button
                    onClick={() => handleRemoveCensorWord(word)}
                    type="button"
                    className="text-red-400 hover:text-red-300 font-bold ml-0.5 cursor-pointer text-xs"
                    title={`Remove ${word}`}
                  >
                    &times;
                  </button>
                </span>
              ))}
              {groupConfig.censorWords.length === 0 && (
                <span className="text-[10px] text-slate-555 italic font-semibold p-xs">No chat restrictions defined</span>
              )}
            </div>

            <form onSubmit={handleAddCensorWord} className="flex gap-xs pt-xs">
              <input
                type="text"
                value={newCensorWord}
                onChange={e => setNewCensorWord(e.target.value)}
                placeholder="e.g. facebook"
                className="flex-1 bg-[#131D33] border border-[#1E2E4E] focus:border-emerald-500/50 rounded-lg py-1.5 px-sm text-slate-200 outline-none text-xs font-semibold"
              />
              <button
                type="submit"
                className="px-md py-1.5 bg-[#1E2E4E] hover:bg-[#2A3E62] border border-[#2D3E5E] text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                Add Word
              </button>
            </form>
            <p className="text-[8px] text-slate-550 leading-tight italic">
              Restricted words will automatically display as asterisks (&bull;&bull;&bull;&bull;) in room chats.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
