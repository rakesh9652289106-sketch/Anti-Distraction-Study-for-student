'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';

export default function AdminAiConfigPage() {
  const { fetchData } = useApp();
  const [aiConfig, setAiConfig] = useState({
    personality: 'academic',
    temperature: 0.7,
    systemPrompt: `You are FocusFlow AI Tutor. Provide structured explanations and advice. Maintain a supportive educational tone. Encourage the student to avoid distraction and use Pomodoro blocks.`,
    attentionGuardSensitivity: 'medium'
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const fetchAiSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        if (data.aiConfig) {
          setAiConfig(data.aiConfig);
        }
      }
    } catch (err) {
      console.error('Failed to load AI configurations:', err);
    }
  };

  useEffect(() => {
    fetchAiSettings();
  }, []);

  const handleSaveConfig = async (updatedConfig = aiConfig) => {
    setIsUpdating(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aiConfig: updatedConfig })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.aiConfig) {
          setAiConfig(data.aiConfig);
        }
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
        await fetchData(); // refresh global states
      }
    } catch (err) {
      console.error('Failed to save AI configurations:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateField = (field: string, value: any) => {
    const updated = { ...aiConfig, [field]: value };
    setAiConfig(updated);
    handleSaveConfig(updated);
  };

  return (
    <div className="space-y-lg relative">
      
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-6 right-6 bg-[#0D1527] border border-emerald-500/30 text-emerald-450 px-md py-sm rounded-lg shadow-2xl flex items-center gap-xs z-50 animate-bounce">
          <span className="material-symbols-outlined text-sm font-bold">check_circle</span>
          <span className="text-xs font-semibold">AI Agent prompts and parameter updates synchronized!</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-md pt-sm">
        <div>
          <h2 className="font-bold text-headline-lg text-primary text-white">Panel Configuration: AI Engine Settings</h2>
          <p className="text-body-md text-slate-400 font-medium">
            Tweak LLM temperatures, tutor personality prompts, and Attention Guard checks frequency.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Personality & Prompt Override Card (8 cols) */}
        <div className="lg:col-span-8 glass-panel rounded-xl p-md border border-slate-800 bg-[#0d1527]/90 text-slate-200">
          <h3 className="font-bold text-headline-md text-white mb-xs flex items-center gap-xs">
            <span className="material-symbols-outlined text-secondary">psychology_alt</span>
            System Instruction Guidelines
          </h3>
          <p className="text-label-sm text-slate-400 font-medium mb-lg">
            Customize the core prompt guideline utilized by the local AI Tutor to guide user queries.
          </p>

          <form onSubmit={e => { e.preventDefault(); handleSaveConfig(); }} className="space-y-md">
            <div className="space-y-xs">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Tutor Custom Prompt Template
              </label>
              <textarea
                value={aiConfig.systemPrompt}
                onChange={e => setAiConfig({ ...aiConfig, systemPrompt: e.target.value })}
                className="w-full bg-[#131D33] border border-[#1E2E4E] focus:border-emerald-500/50 rounded-lg py-2 px-sm text-slate-200 outline-none text-xs font-semibold resize-none h-48 leading-relaxed"
                placeholder="Enter core prompt directives..."
              />
            </div>

            <button
              type="submit"
              disabled={isUpdating}
              className="px-md py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-bold rounded-lg text-xs hover:from-emerald-500 hover:to-emerald-650 cursor-pointer shadow-md disabled:opacity-50"
            >
              {isUpdating ? 'Saving Prompt Directive...' : 'Sync Prompt Template'}
            </button>
          </form>
        </div>

        {/* Hyperparameters & Camera check options (4 cols) */}
        <div className="lg:col-span-4 glass-panel rounded-xl p-md border border-slate-800 bg-[#0d1527]/90 text-slate-200 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-headline-md text-white mb-xs flex items-center gap-xs">
              <span className="material-symbols-outlined text-secondary">settings_input_component</span>
              Engine Tuning
            </h3>
            <p className="text-label-sm text-slate-400 font-medium mb-lg">
              Tweak creativity sliders and guard checks.
            </p>

            <div className="space-y-md">
              {/* Personality model */}
              <div className="space-y-xs">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  AI Model Personality
                </label>
                <select
                  value={aiConfig.personality}
                  onChange={e => handleUpdateField('personality', e.target.value)}
                  className="w-full bg-[#131D33] border border-[#1E2E4E] focus:border-emerald-500/50 rounded-lg py-2 px-sm text-slate-200 outline-none text-xs font-semibold"
                >
                  <option value="academic">Academic (Fact-focused & structured)</option>
                  <option value="strict">Strict Coach (Focus-assertive & demanding)</option>
                  <option value="gentle">Gentle Guide (Encouraging & supportive)</option>
                </select>
              </div>

              {/* Temperature Slider */}
              <div className="space-y-xs">
                <div className="flex justify-between text-xs font-bold text-slate-350">
                  <span>LLM Creativity (Temperature)</span>
                  <span className="text-emerald-400">{aiConfig.temperature}</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.1"
                  value={aiConfig.temperature}
                  onChange={e => handleUpdateField('temperature', parseFloat(e.target.value))}
                  className="w-full accent-emerald-500"
                />
                <p className="text-[9px] text-slate-500 leading-tight">
                  Lower numbers reduce creative hallucination for academic queries. Higher values yield creative tipping advices.
                </p>
              </div>

              {/* Attention webcam check sensitivity */}
              <div className="space-y-xs pt-xs">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Webcam Attention Checks Sensitivity
                </label>
                <select
                  value={aiConfig.attentionGuardSensitivity}
                  onChange={e => handleUpdateField('attentionGuardSensitivity', e.target.value)}
                  className="w-full bg-[#131D33] border border-[#1E2E4E] focus:border-emerald-500/50 rounded-lg py-2 px-sm text-slate-200 outline-none text-xs font-semibold"
                >
                  <option value="low">Low (Check every 60s)</option>
                  <option value="medium">Medium (Check every 30s)</option>
                  <option value="high">High (Check every 10s)</option>
                </select>
                <p className="text-[9px] text-slate-500 leading-tight mt-1">
                  Adjusts how frequently Attention Guard analyzes webcam frames for facial coordinates alignment.
                </p>
              </div>
            </div>
          </div>

          <div className="p-sm bg-slate-900 border border-slate-800 rounded-lg text-center mt-md">
            <span className="material-symbols-outlined text-emerald-450 text-2xl mb-1">verified</span>
            <h4 className="font-bold text-xs text-white">FocusGuard AI Engine v2.4</h4>
            <span className="text-[8px] uppercase font-bold text-slate-500 block mt-1">Status: Synced &amp; Active</span>
          </div>
        </div>

      </div>
    </div>
  );
}
