'use client';

import React, { useState, useEffect } from 'react';
import { ClassroomGroup } from '@/lib/db';

interface SharedHistoryItem {
  id: string;
  name: string;
  format: string;
  targetGroup: string;
  sharedDate: string;
  status: string;
  views: number;
  downloads: number;
}

export default function TeacherResourcesPage() {
  const [groups, setGroups] = useState<ClassroomGroup[]>([]);
  const [history, setHistory] = useState<SharedHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Upload States
  const [uploadedTitle, setUploadedTitle] = useState('');
  const [uploadedType, setUploadedType] = useState('pdf');
  const [suggestedTags, setSuggestedTags] = useState<string[]>(['Quantum Mechanics', 'Advanced Physics', 'Particle Theory']);
  const [newTagInput, setNewTagInput] = useState('');
  const [tempFileId, setTempFileId] = useState('');

  // Sharing permissions config state mapped by Group ID
  const [selectedGroups, setSelectedGroups] = useState<Record<string, boolean>>({});
  const [permissions, setPermissions] = useState<Record<string, { viewOnly: boolean; canDownload: boolean; allowAiSummarization: boolean }>>({});

  const loadData = async () => {
    try {
      const [resGroups, resHistory] = await Promise.all([
        fetch('/api/teacher/groups'),
        fetch('/api/teacher/resources/shared-history')
      ]);

      if (resGroups.ok) {
        const groupsData: ClassroomGroup[] = await resGroups.ok ? await resGroups.json() : [];
        setGroups(groupsData);
        
        // Initialize default permissions mappings
        const initialSelected: Record<string, boolean> = {};
        const initialPerms: Record<string, { viewOnly: boolean; canDownload: boolean; allowAiSummarization: boolean }> = {};
        groupsData.forEach((g, idx) => {
          initialSelected[g.id] = idx === 0; // Check the first group by default
          initialPerms[g.id] = { viewOnly: true, canDownload: false, allowAiSummarization: true };
        });
        setSelectedGroups(initialSelected);
        setPermissions(initialPerms);
      }

      if (resHistory.ok) {
        setHistory(await resHistory.json());
      }
    } catch (err) {
      console.error('Error fetching teacher resources page data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSimulateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedTitle(file.name);
    // Determine type from extension
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'mp4' || ext === 'mov') setUploadedType('video');
    else if (ext === 'url' || ext === 'link') setUploadedType('link');
    else setUploadedType('pdf');

    try {
      const res = await fetch('/api/teacher/resources/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name })
      });
      if (res.ok) {
        const data = await res.json();
        setTempFileId(data.tempId);
        setSuggestedTags(data.suggestedTags || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddCustomTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagInput.trim()) return;
    if (!suggestedTags.includes(newTagInput.trim())) {
      setSuggestedTags(prev => [...prev, newTagInput.trim()]);
    }
    setNewTagInput('');
  };

  const handleRemoveTag = (tag: string) => {
    setSuggestedTags(prev => prev.filter(t => t !== tag));
  };

  const handleToggleGroupSelected = (groupId: string) => {
    setSelectedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  const handlePermissionChange = (groupId: string, key: 'viewOnly' | 'canDownload' | 'allowAiSummarization') => {
    setPermissions(prev => ({
      ...prev,
      [groupId]: {
        ...prev[groupId],
        [key]: !prev[groupId][key]
      }
    }));
  };

  const handleShareSubmit = async () => {
    if (!uploadedTitle.trim()) {
      alert('Please upload a file or specify a study material name first.');
      return;
    }

    // Build targeted group configurations
    const groupSettings = Object.entries(selectedGroups)
      .filter(([, isSelected]) => isSelected)
      .map(([groupId]) => ({
        groupId,
        permissions: permissions[groupId]
      }));

    if (groupSettings.length === 0) {
      alert('Please select at least one student group to share this resource with.');
      return;
    }

    try {
      const res = await fetch('/api/teacher/resources/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tempId: tempFileId || 'tmp-manual',
          title: uploadedTitle,
          fileType: uploadedType,
          tags: suggestedTags,
          groupSettings
        })
      });

      if (res.ok) {
        alert('Material successfully shared and distributed!');
        // Reset upload form state
        setUploadedTitle('');
        setTempFileId('');
        // Reload shared items log list
        const resHistory = await fetch('/api/teacher/resources/shared-history');
        if (resHistory.ok) {
          setHistory(await resHistory.json());
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400 font-mono">
        <div className="w-8 h-8 rounded-full border-2 border-slate-800 border-t-emerald-450 animate-spin mb-4"></div>
        <p className="text-[10px] tracking-widest uppercase">Aligning classroom catalogs...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f9fb] text-[#191c1e] font-sans pb-xl pt-4">
      <div className="max-w-[1200px] mx-auto px-6 mt-6">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-[#091426] tracking-tight mb-1">Share New Material</h1>
          <p className="text-sm text-slate-500 max-w-2xl font-medium">
            Distribute documents, lecture recordings, or research papers to your classes with AI-enhanced summaries and smart permissions.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Drag & Drop Upload & AI Tags (7 cols) */}
          <div className="lg:col-span-7 space-y-8 flex flex-col justify-between">
            
            {/* Upload block */}
            <div className="bg-white border-2 border-dashed border-slate-300 rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-all hover:border-[#091426] group bg-white/80">
              <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-3xl text-slate-500">cloud_upload</span>
              </div>
              
              {uploadedTitle ? (
                <div>
                  <h3 className="text-sm font-bold text-[#091426] mb-1">Uploaded: {uploadedTitle}</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Format: {uploadedType}</p>
                </div>
              ) : (
                <div>
                  <h3 className="text-sm font-bold text-[#091426] mb-1">Drag and drop file here</h3>
                  <p className="text-[11px] text-slate-450 font-medium mb-4">Supports PDF, MP4, URLs, or written notes (Max 50MB)</p>
                </div>
              )}

              <label className="mt-3 px-4 py-2 bg-slate-150 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg shadow-sm cursor-pointer select-none">
                Browse Files
                <input 
                  type="file" 
                  onChange={handleSimulateUpload}
                  className="hidden" 
                />
              </label>
            </div>

            {/* AI-Suggested Tags */}
            <div className="bg-white border border-slate-200/60 p-5 rounded-2xl bg-white/80">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-1.5 text-blue-700">
                  <span className="material-symbols-outlined text-md">psychology</span>
                  <h3 className="text-xs font-bold text-[#091426]">AI-Suggested Tags</h3>
                </div>
                <span className="bg-blue-50 text-blue-700 text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">Auto-detect Active</span>
              </div>

              <div className="flex flex-wrap gap-2">
                {suggestedTags.map(tag => (
                  <span 
                    key={tag} 
                    className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-[#006c49] border border-emerald-100 rounded-full text-xs font-bold"
                  >
                    {tag}
                    <button 
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-red-650 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm font-bold block">close</span>
                    </button>
                  </span>
                ))}
                
                <form onSubmit={handleAddCustomTag} className="inline-flex items-center">
                  <input
                    type="text"
                    value={newTagInput}
                    onChange={e => setNewTagInput(e.target.value)}
                    placeholder="+ Add Topic"
                    className="border border-dashed border-slate-300 rounded-full px-3 py-1 text-xs text-slate-500 outline-none hover:border-[#091426] focus:border-[#091426] focus:ring-0 bg-transparent w-24 transition-all"
                  />
                </form>
              </div>
            </div>

          </div>

          {/* Right Column: Settings & Group check toggles (5 cols) */}
          <div className="lg:col-span-5 bg-white border border-slate-200/60 p-5 rounded-2xl flex flex-col justify-between bg-white/80">
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Sharing Settings</h3>
              
              <div className="space-y-4">
                {groups.map(group => {
                  const isChecked = selectedGroups[group.id] || false;
                  const perms = permissions[group.id] || { viewOnly: true, canDownload: false, allowAiSummarization: true };
                  return (
                    <div 
                      key={group.id} 
                      className={`p-3 bg-slate-50 border border-slate-200/60 rounded-2xl transition-opacity duration-300 ${
                        isChecked ? 'opacity-100' : 'opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                            <span className="material-symbols-outlined text-md">science</span>
                          </div>
                          <span className="text-xs font-bold text-[#091426] truncate max-w-[150px]">{group.name}</span>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={isChecked}
                          onChange={() => handleToggleGroupSelected(group.id)}
                          className="w-5 h-5 text-[#091426] rounded border-slate-350 focus:ring-0 cursor-pointer"
                        />
                      </div>

                      {/* Sub toggles for permissions, only show active if group checked */}
                      {isChecked && (
                        <div className="grid grid-cols-1 gap-2 pt-2 border-t border-slate-200/50 text-[11px] font-semibold text-slate-500">
                          
                          <label className="flex items-center justify-between cursor-pointer group select-none">
                            <span className="group-hover:text-[#091426] transition-colors">View Only</span>
                            <input 
                              type="checkbox" 
                              checked={perms.viewOnly}
                              onChange={() => handlePermissionChange(group.id, 'viewOnly')}
                              className="sr-only peer"
                            />
                            <div className="w-8 h-4.5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-350 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[#091426] relative inline-flex items-center"></div>
                          </label>

                          <label className="flex items-center justify-between cursor-pointer group select-none">
                            <span className="group-hover:text-[#091426] transition-colors">Can Download</span>
                            <input 
                              type="checkbox" 
                              checked={perms.canDownload}
                              onChange={() => handlePermissionChange(group.id, 'canDownload')}
                              className="sr-only peer"
                            />
                            <div className="w-8 h-4.5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-350 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[#091426] relative inline-flex items-center"></div>
                          </label>

                          <label className="flex items-center justify-between cursor-pointer group select-none">
                            <span className="group-hover:text-[#091426] transition-colors flex items-center gap-0.5">
                              Allow AI Summaries
                              <span className="material-symbols-outlined text-blue-700 text-xs font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                            </span>
                            <input 
                              type="checkbox" 
                              checked={perms.allowAiSummarization}
                              onChange={() => handlePermissionChange(group.id, 'allowAiSummarization')}
                              className="sr-only peer"
                            />
                            <div className="w-8 h-4.5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-350 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[#091426] relative inline-flex items-center"></div>
                          </label>

                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-5 mt-5 border-t border-slate-200/50">
              <button 
                onClick={handleShareSubmit}
                className="w-full bg-[#091426] hover:bg-slate-800 text-white py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
              >
                <span className="material-symbols-outlined text-sm">send</span>
                Share with Selected Groups
              </button>
            </div>
          </div>

          {/* Table: Recently Shared Materials (Full 12 cols width) */}
          <div className="col-span-12">
            <div className="bg-white border border-slate-200/60 rounded-2xl overflow-hidden shadow-sm bg-white/80">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-xs font-bold text-[#091426] uppercase tracking-wider">Recently Shared Materials</h3>
              </div>
              
              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-5 py-3">Material Name</th>
                      <th className="px-5 py-3">Target Groups</th>
                      <th className="px-5 py-3">Shared Date</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">Views</th>
                      <th className="px-5 py-3">Downloads</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-[#091426]">
                    {history.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-red-650">picture_as_pdf</span>
                            <span>{item.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="bg-blue-50 border border-blue-100 text-blue-800 px-2.5 py-0.5 rounded text-[10px] font-bold">
                            {item.targetGroup}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-slate-500 font-medium">{item.sharedDate}</td>
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-1 text-emerald-700 text-xs font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            {item.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 font-bold text-slate-600">{item.views}</td>
                        <td className="px-5 py-4 font-bold text-slate-600">{item.downloads}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
