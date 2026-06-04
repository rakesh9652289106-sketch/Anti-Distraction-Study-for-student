'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';

export default function AdminUiConfigPage() {
  const { fetchData } = useApp();
  const [uiConfig, setUiConfig] = useState({
    theme: 'slate',
    density: 'comfort',
    brandingName: 'FocusFlow'
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const fetchUiSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        if (data.uiConfig) {
          setUiConfig(data.uiConfig);
        }
      }
    } catch (err) {
      console.error('Failed to load UI configurations:', err);
    }
  };

  useEffect(() => {
    fetchUiSettings();
  }, []);

  const handleSaveConfig = async (updatedConfig = uiConfig) => {
    setIsUpdating(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uiConfig: updatedConfig })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.uiConfig) {
          setUiConfig(data.uiConfig);
        }
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
        await fetchData(); // refresh global state
      }
    } catch (err) {
      console.error('Failed to save UI configurations:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateField = (field: string, value: string) => {
    const updated = { ...uiConfig, [field]: value };
    setUiConfig(updated);
    handleSaveConfig(updated);
  };

  return (
    <div className="space-y-lg relative">
      
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-6 right-6 bg-[#0D1527] border border-emerald-500/30 text-emerald-450 px-md py-sm rounded-lg shadow-2xl flex items-center gap-xs z-50 animate-bounce">
          <span className="material-symbols-outlined text-sm font-bold">check_circle</span>
          <span className="text-xs font-semibold">Branding and Visual adjustments synchronized!</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-md pt-sm">
        <div>
          <h2 className="font-bold text-headline-lg text-primary text-white">Panel Configuration: UI &amp; Visual Theme</h2>
          <p className="text-body-md text-slate-400 font-medium">
            Customize typography scales, layout presets, dark-mode, and student panel layouts.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Visual Theme Options Card */}
        <div className="col-span-12 lg:col-span-8 glass-panel rounded-xl p-md border border-slate-800 bg-[#0d1527]/90 text-slate-200">
          <h3 className="font-bold text-headline-md text-white mb-xs flex items-center gap-xs">
            <span className="material-symbols-outlined text-secondary">palette</span>
            System Visual Style Preset
          </h3>
          <p className="text-label-sm text-slate-400 font-medium mb-lg">
            Choose the default theme styling for all student client dashboards.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
            {[
              { id: 'slate', name: 'Midnight Slate', desc: 'Default high-contrast charcoal and deep blue styling.', color: 'bg-slate-900 border-slate-700' },
              { id: 'cyberpunk', name: 'Neon Cyberpunk', desc: 'Vibrant violet backgrounds, hot-pink borders, and dark neon style.', color: 'bg-purple-950 border-purple-800' },
              { id: 'forest', name: 'Zen Forest', desc: 'Calming sage greens, soft warm slate highlights, and rounder profiles.', color: 'bg-emerald-950 border-emerald-800' }
            ].map(theme => (
              <div
                key={theme.id}
                onClick={() => handleUpdateField('theme', theme.id)}
                className={`border rounded-xl p-sm cursor-pointer transition-all flex flex-col justify-between h-40 ${
                  uiConfig.theme === theme.id
                    ? 'border-2 border-emerald-400 shadow-lg shadow-emerald-950/20 bg-slate-900'
                    : 'border-slate-800 bg-[#131d33]/40 hover:bg-[#131d33]/80'
                }`}
              >
                <div>
                  <div className="flex justify-between items-center mb-xs">
                    <span className="text-xs font-bold text-white">{theme.name}</span>
                    {uiConfig.theme === theme.id && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">{theme.desc}</p>
                </div>
                <div className={`w-full h-4 rounded mt-sm ${theme.color}`}></div>
              </div>
            ))}
          </div>
        </div>

        {/* Branding & App Title Card */}
        <div className="col-span-12 lg:col-span-4 glass-panel rounded-xl p-md border border-slate-800 bg-[#0d1527]/90 text-slate-200">
          <h3 className="font-bold text-headline-md text-white mb-xs flex items-center gap-xs">
            <span className="material-symbols-outlined text-secondary">branding_watermark</span>
            Branding Header
          </h3>
          <p className="text-label-sm text-slate-400 font-medium mb-lg">
            Configure default app labels and layout density variables.
          </p>

          <form onSubmit={e => { e.preventDefault(); handleSaveConfig(); }} className="space-y-md">
            <div className="space-y-xs">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Client Brand Title
              </label>
              <input
                type="text"
                value={uiConfig.brandingName}
                onChange={e => setUiConfig({ ...uiConfig, brandingName: e.target.value })}
                className="w-full bg-[#131D33] border border-[#1E2E4E] focus:border-emerald-500/50 rounded-lg py-2 px-sm text-slate-200 outline-none text-xs font-semibold"
              />
            </div>

            <div className="space-y-xs">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Client Layout Density
              </label>
              <select
                value={uiConfig.density}
                onChange={e => handleUpdateField('density', e.target.value)}
                className="w-full bg-[#131D33] border border-[#1E2E4E] focus:border-emerald-500/50 rounded-lg py-2 px-sm text-slate-200 outline-none text-xs font-semibold"
              >
                <option value="comfort">Comfort (Relaxed spacings)</option>
                <option value="cozy">Cozy (Standard desktop spacing)</option>
                <option value="compact">Compact (Dense layout fit)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isUpdating}
              className="w-full py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-bold rounded-lg text-xs hover:from-emerald-500 hover:to-emerald-650 cursor-pointer shadow-md disabled:opacity-50"
            >
              {isUpdating ? 'Synchronizing UI...' : 'Update Visual Settings'}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
