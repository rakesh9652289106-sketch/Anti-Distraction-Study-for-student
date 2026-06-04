'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';

export default function SettingsPage() {
  const { settings, updateSettings } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'platform' | 'lock'>('platform');
  const [sensitivity, setSensitivity] = useState(65);
  const [experimentalFeatures, setExperimentalFeatures] = useState(false);
  
  // Lock toggles
  const [appBlock, setAppBlock] = useState(true);
  const [netBlock, setNetBlock] = useState(true);
  const [fsBlock, setFsBlock] = useState(false);

  // PIN settings
  const [pinValue, setPinValue] = useState('1234');
  const [isChangingPin, setIsChangingPin] = useState(false);
  const [newPin, setNewPin] = useState('');

  // Rules
  const [rules, setRules] = useState([
    { id: 1, name: 'Finals Week Preset', desc: 'Mon-Fri, 6 PM - 10 PM', active: true },
    { id: 2, name: 'Weekend Mornings', desc: 'Sat-Sun, 9 AM - 12 PM', active: false }
  ]);

  const handleSavePlatform = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Platform configurations saved successfully!');
  };

  const handlePomodoroTimeChange = (mins: number) => {
    updateSettings({ pomodoroWorkTime: mins });
  };

  const handleBreakTimeChange = (mins: number) => {
    updateSettings({ pomodoroBreakTime: mins });
  };

  const handleBlocklistChange = (websitesStr: string) => {
    const arr = websitesStr.split(',').map(s => s.trim()).filter(Boolean);
    updateSettings({ blockedWebsites: arr });
  };

  const toggleRule = (id: number) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, active: !r.active } : r));
  };

  const handlePinChangeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.length !== 4 || isNaN(Number(newPin))) {
      alert('PIN must be 4 numbers!');
      return;
    }
    setPinValue(newPin);
    setIsChangingPin(false);
    setNewPin('');
    alert('Admin PIN updated successfully!');
  };

  return (
    <div className="space-y-lg">
      {/* Header */}
      <div className="mb-lg">
        <h2 className="font-bold text-headline-lg text-primary">Settings Console</h2>
        <p className="text-body-md text-on-surface-variant font-medium">
          Manage focus configurations, security protocols, and system-wide preferences.
        </p>
      </div>

      {/* Settings Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
        
        {/* Left Side: Sub-tab selectors */}
        <div className="lg:col-span-4 space-y-sm">
          <button
            onClick={() => setActiveSubTab('platform')}
            className={`w-full flex items-center justify-between px-md py-sm rounded-xl text-left font-bold transition-all border ${
              activeSubTab === 'platform'
                ? 'bg-white border-outline-variant/30 text-primary shadow-sm'
                : 'bg-transparent border-transparent text-on-surface-variant hover:bg-surface-container-low/50'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: activeSubTab === 'platform' ? "'FILL' 1" : '' }}>
                tune
              </span>
              Platform Configurations
            </div>
            <span className="material-symbols-outlined text-sm font-bold">chevron_right</span>
          </button>

          <button
            onClick={() => setActiveSubTab('lock')}
            className={`w-full flex items-center justify-between px-md py-sm rounded-xl text-left font-bold transition-all border ${
              activeSubTab === 'lock'
                ? 'bg-white border-outline-variant/30 text-primary shadow-sm'
                : 'bg-transparent border-transparent text-on-surface-variant hover:bg-surface-container-low/50'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: activeSubTab === 'lock' ? "'FILL' 1" : '' }}>
                shield_lock
              </span>
              Emergency Focus Lock
            </div>
            <span className="material-symbols-outlined text-sm font-bold">chevron_right</span>
          </button>
        </div>

        {/* Right Side: Active Form Panel */}
        <div className="lg:col-span-8">
          
          {/* Sub-tab 1: Platform Configurations */}
          {activeSubTab === 'platform' && (
            <section className="bg-white rounded-2xl border border-outline-variant/30 p-md lg:p-lg space-y-lg shadow-sm">
              <div className="flex items-center gap-sm border-b border-outline-variant/10 pb-md">
                <div className="p-2.5 bg-sky-50 text-sky-600 rounded-lg">
                  <span className="material-symbols-outlined">tune</span>
                </div>
                <div>
                  <h3 className="font-bold text-headline-md text-primary">Platform Configurations</h3>
                  <p className="text-label-sm text-on-surface-variant font-medium">Adjust core operational metrics and thresholds.</p>
                </div>
              </div>

              <form onSubmit={handleSavePlatform} className="space-y-md">
                {/* Setting: Focus Score Sensitivity */}
                <div className="space-y-sm">
                  <div className="flex justify-between items-center">
                    <label className="block font-bold text-label-md text-primary">Global Focus Score Sensitivity</label>
                    <span className="text-xs text-on-surface-variant bg-surface-container-low px-2 py-0.5 rounded font-mono">
                      Moderate (0.{sensitivity})
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant font-medium">Determines how quickly the system penalizes distractions.</p>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={sensitivity}
                    onChange={e => setSensitivity(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <div className="flex justify-between text-xs text-slate-400 font-semibold">
                    <span>Forgiving</span>
                    <span>Strict</span>
                  </div>
                </div>

                {/* Setting: Default Intervals */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-md pt-sm">
                  <div>
                    <label className="block font-bold text-label-md text-primary mb-xs">Default Pomodoro Work Interval</label>
                    <p className="text-[11px] text-on-surface-variant mb-sm">Standard study session length (minutes).</p>
                    <select
                      value={settings.pomodoroWorkTime}
                      onChange={e => handlePomodoroTimeChange(Number(e.target.value))}
                      className="w-full px-sm py-2 border border-outline-variant/50 rounded-lg text-label-sm outline-none bg-surface-variant/20"
                    >
                      <option value="15">15 Minutes</option>
                      <option value="25">25 Minutes</option>
                      <option value="45">45 Minutes</option>
                      <option value="60">60 Minutes</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block font-bold text-label-md text-primary mb-xs">Default Break Interval</label>
                    <p className="text-[11px] text-on-surface-variant mb-sm">Standard relax session length (minutes).</p>
                    <select
                      value={settings.pomodoroBreakTime}
                      onChange={e => handleBreakTimeChange(Number(e.target.value))}
                      className="w-full px-sm py-2 border border-outline-variant/50 rounded-lg text-label-sm outline-none bg-surface-variant/20"
                    >
                      <option value="5">5 Minutes</option>
                      <option value="10">10 Minutes</option>
                      <option value="15">15 Minutes</option>
                    </select>
                  </div>
                </div>

                {/* Blocked Websites list */}
                <div className="pt-sm">
                  <label className="block font-bold text-label-md text-primary mb-xs">Distraction Blocklist (Shield)</label>
                  <p className="text-[11px] text-on-surface-variant mb-sm">Comma separated list of blocked websites.</p>
                  <input
                    type="text"
                    defaultValue={settings.blockedWebsites.join(', ')}
                    onBlur={e => handleBlocklistChange(e.target.value)}
                    placeholder="instagram.com, facebook.com..."
                    className="w-full px-sm py-2 border border-outline-variant/50 focus:border-primary focus:ring-1 focus:ring-primary rounded-lg text-label-sm outline-none bg-surface/30 font-mono"
                  />
                </div>

                {/* Setting: Experimental Features Toggle */}
                <label className="flex items-start bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-outline-variant/20 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={experimentalFeatures}
                    onChange={e => setExperimentalFeatures(e.target.checked)}
                    className="mt-1 mr-sm text-primary rounded border-outline-variant focus:ring-primary-container"
                  />
                  <div className="text-label-sm">
                    <span className="font-bold text-primary block">Enable Experimental Focus Modes</span>
                    <span className="text-on-surface-variant">Allow access to beta focus features like &apos;Deep Dive Audio&apos; and &apos;Visual Isolation&apos;.</span>
                  </div>
                </label>

                {/* Submit button */}
                <div className="pt-md border-t border-outline-variant/10 flex justify-end gap-sm">
                  <button
                    type="button"
                    className="px-md py-2 border border-outline-variant rounded-lg text-label-sm font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Discard Changes
                  </button>
                  <button
                    type="submit"
                    className="px-md py-2 bg-primary hover:bg-primary/95 text-on-primary rounded-lg text-label-sm font-semibold cursor-pointer active:scale-95 transition-all shadow-sm"
                  >
                    Save Configurations
                  </button>
                </div>
              </form>
            </section>
          )}

          {/* Sub-tab 2: Emergency Focus Lock */}
          {activeSubTab === 'lock' && (
            <div className="space-y-md">
              
              {/* Lockdown settings pane */}
              <section className="bg-white rounded-2xl border border-outline-variant/30 p-md lg:p-lg space-y-md shadow-sm">
                <div className="flex items-center gap-sm border-b border-outline-variant/10 pb-md">
                  <div className="p-2.5 bg-red-50 text-red-600 rounded-lg">
                    <span className="material-symbols-outlined">security</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-headline-md text-primary">Emergency Focus Lock</h3>
                    <p className="text-label-sm text-on-surface-variant font-medium">Extreme distraction prevention. Changes require PIN authorization to revert.</p>
                  </div>
                </div>

                {/* Status bar warnings */}
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200/50 rounded-xl p-md flex items-start gap-sm">
                  <span className="material-symbols-outlined text-red-600 font-bold">warning</span>
                  <div className="text-label-sm">
                    <strong className="text-red-700 block font-bold">Lockdown enforcement enabled!</strong>
                    <span className="text-red-600/90 font-medium">Once initiated, exiting settings or disabling blocks will require your Admin PIN ({pinValue}).</span>
                  </div>
                </div>

                {/* Lock Modifier Items list */}
                <div className="space-y-sm pt-sm">
                  <div className="flex justify-between items-center p-sm hover:bg-slate-50 rounded-lg transition-colors">
                    <div>
                      <h4 className="text-label-md font-bold text-primary flex items-center gap-xs">
                        <span className="material-symbols-outlined text-lg">app_blocking</span>
                        Hard App Restriction
                      </h4>
                      <p className="text-[11px] text-on-surface-variant">Force-closes non-whitelisted apps. Blocks background processes.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={appBlock}
                      onChange={e => setAppBlock(e.target.checked)}
                      className="w-10 h-5 rounded-full appearance-none bg-slate-300 checked:bg-red-600 relative after:content-[''] after:absolute after:w-4 after:h-4 after:bg-white after:rounded-full after:top-0.5 after:left-0.5 checked:after:left-5.5 after:transition-all cursor-pointer"
                    />
                  </div>

                  <div className="flex justify-between items-center p-sm hover:bg-slate-50 rounded-lg transition-colors">
                    <div>
                      <h4 className="text-label-md font-bold text-primary flex items-center gap-xs">
                        <span className="material-symbols-outlined text-lg">wifi_off</span>
                        Strict Network Block
                      </h4>
                      <p className="text-[11px] text-on-surface-variant">Blocks all non-educational web traffic via shield filter.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={netBlock}
                      onChange={e => setNetBlock(e.target.checked)}
                      className="w-10 h-5 rounded-full appearance-none bg-slate-300 checked:bg-red-600 relative after:content-[''] after:absolute after:w-4 after:h-4 after:bg-white after:rounded-full after:top-0.5 after:left-0.5 checked:after:left-5.5 after:transition-all cursor-pointer"
                    />
                  </div>

                  <div className="flex justify-between items-center p-sm hover:bg-slate-50 rounded-lg transition-colors">
                    <div>
                      <h4 className="text-label-md font-bold text-primary flex items-center gap-xs">
                        <span className="material-symbols-outlined text-lg">fullscreen</span>
                        Full-Screen Lock
                      </h4>
                      <p className="text-[11px] text-on-surface-variant">Locks your browser to active workspace, preventing window switching.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={fsBlock}
                      onChange={e => setFsBlock(e.target.checked)}
                      className="w-10 h-5 rounded-full appearance-none bg-slate-300 checked:bg-red-600 relative after:content-[''] after:absolute after:w-4 after:h-4 after:bg-white after:rounded-full after:top-0.5 after:left-0.5 checked:after:left-5.5 after:transition-all cursor-pointer"
                    />
                  </div>
                </div>
              </section>

              {/* Admin Override Card */}
              <section className="bg-slate-50 border border-outline-variant/30 rounded-xl p-md flex flex-col md:flex-row gap-md shadow-sm">
                <div className="flex-1 space-y-sm">
                  <h3 className="text-label-md font-bold text-primary flex items-center gap-xs">
                    <span className="material-symbols-outlined">admin_panel_settings</span>
                    Admin Pin Settings
                  </h3>
                  <p className="text-xs text-on-surface-variant">
                    Configures access override code required to disable lockdown modes.
                  </p>
                  
                  {isChangingPin ? (
                    <form onSubmit={handlePinChangeSubmit} className="flex gap-xs pt-xs">
                      <input
                        type="password"
                        maxLength={4}
                        value={newPin}
                        onChange={e => setNewPin(e.target.value)}
                        placeholder="4-digit PIN"
                        className="px-sm py-1.5 border border-outline-variant/50 rounded-lg text-xs outline-none bg-white font-mono w-28"
                      />
                      <button
                        type="submit"
                        className="px-sm py-1.5 bg-primary text-white text-xs font-bold rounded-lg cursor-pointer"
                      >
                        Set
                      </button>
                    </form>
                  ) : (
                    <div className="flex items-center gap-sm pt-xs">
                      <span className="font-mono text-sm tracking-widest bg-white border border-outline-variant/20 px-sm py-1 rounded">
                        **** (Active PIN: {pinValue})
                      </span>
                      <button
                        onClick={() => setIsChangingPin(true)}
                        className="text-secondary hover:underline text-xs font-bold cursor-pointer"
                      >
                        Change PIN
                      </button>
                    </div>
                  )}
                </div>
              </section>

              {/* Scheduled Blocking Rules */}
              <section className="bg-white rounded-xl border border-outline-variant/30 p-md shadow-sm">
                <h3 className="font-bold text-label-md text-primary mb-md flex items-center gap-xs">
                  <span className="material-symbols-outlined text-[20px]">calendar_clock</span>
                  Scheduled Lockdown Rules
                </h3>
                
                <div className="space-y-sm">
                  {rules.map(rule => (
                    <div
                      key={rule.id}
                      className={`p-sm rounded-lg flex items-center justify-between border transition-all ${
                        rule.active
                          ? 'bg-slate-50 border-outline-variant/20'
                          : 'bg-transparent border-outline-variant/10 opacity-70'
                      }`}
                    >
                      <div>
                        <span className="font-bold text-label-md text-primary block">{rule.name}</span>
                        <span className="text-label-sm text-on-surface-variant">{rule.desc}</span>
                      </div>
                      <button
                        onClick={() => toggleRule(rule.id)}
                        className={`material-symbols-outlined cursor-pointer select-none ${
                          rule.active ? 'text-secondary' : 'text-slate-400'
                        }`}
                      >
                        {rule.active ? 'check_circle' : 'radio_button_unchecked'}
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
