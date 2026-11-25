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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

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

    setSelectedFile(file);
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
      let base64Data = '';
      if (selectedFile) {
        base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(selectedFile);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
        });
      }

      const res = await fetch('/api/teacher/resources/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tempId: tempFileId || 'tmp-manual',
          title: uploadedTitle,
          fileType: uploadedType,
          tags: suggestedTags,
          groupSettings,
          fileData: base64Data || undefined,
          size: selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB` : undefined
        })
      });

      if (res.ok) {
        alert('Material successfully shared and distributed to room students!');
        // Reset upload form state
        setUploadedTitle('');
        setTempFileId('');
        setSelectedFile(null);
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
    <div className="w-full text-on-surface font-sans pb-xl pt-2">
      <div className="max-w-[1200px] mx-auto px-6 mt-6">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-on-surface tracking-tight mb-1">Share New Material</h1>
          <p className="text-sm text-on-surface-variant max-w-2xl font-medium">
            Distribute documents, lecture recordings, or research papers to your classes with AI-enhanced summaries and smart permissions.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Drag & Drop Upload & AI Tags (7 cols) */}
          <div className="lg:col-span-7 space-y-8 flex flex-col justify-between">
            
            {/* Upload block */}
            <div className="bg-surface border-2 border-dashed border-outline-variant/50 rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-all hover:border-primary group">
              <div className="w-14 h-14 bg-surface-container rounded-full flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-3xl text-on-surface-variant">cloud_upload</span>
              </div>
              
              {uploadedTitle ? (
                <div>
                  <h3 className="text-sm font-bold text-on-surface mb-1">Uploaded: {uploadedTitle}</h3>
                  <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Format: {uploadedType}</p>
                </div>
              ) : (
                <div>
                  <h3 className="text-sm font-bold text-on-surface mb-1">Drag and drop file here</h3>
                  <p className="text-[11px] text-on-surface-variant font-medium mb-4">Supports PDF, MP4, URLs, or written notes (Max 50MB)</p>
                </div>
              )}

              <label className="mt-3 px-4 py-2 bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold rounded-lg shadow-sm cursor-pointer select-none border border-outline-variant/30">
                Browse Files
                <input 
                  type="file" 
                  onChange={handleSimulateUpload}
                  className="hidden" 
                />
              </label>
            </div>

            {/* AI-Suggested Tags */}
            <div className="bg-surface border border-outline-variant/40 p-5 rounded-2xl">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-1.5 text-primary">
                  <span className="material-symbols-outlined text-md">psychology</span>
                  <h3 className="text-xs font-bold text-on-surface">AI-Suggested Tags</h3>
                </div>
                <span className="bg-primary/10 text-primary border border-primary/20 text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">Auto-detect Active</span>
              </div>

              <div className="flex flex-wrap gap-2">
                {suggestedTags.map(tag => (
                  <span 
                    key={tag} 
                    className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-xs font-bold"
                  >
                    {tag}
                    <button 
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-red-500 cursor-pointer"
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
                    className="border border-dashed border-outline-variant/60 rounded-full px-3 py-1 text-xs text-on-surface outline-none hover:border-primary focus:border-primary focus:ring-0 bg-transparent w-24 transition-all placeholder:text-on-surface-variant/60"
                  />
                </form>
              </div>
            </div>

          </div>

          {/* Right Column: Settings & Group check toggles (5 cols) */}
          <div className="lg:col-span-5 bg-surface border border-outline-variant/40 p-5 rounded-2xl flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-4">Sharing Settings</h3>
              
              <div className="space-y-4">
                {groups.map(group => {
                  const isChecked = selectedGroups[group.id] || false;
                  const perms = permissions[group.id] || { viewOnly: true, canDownload: false, allowAiSummarization: true };
                  return (
                    <div 
                      key={group.id} 
                      className={`p-3 bg-surface-container-low border border-outline-variant/40 rounded-2xl transition-opacity duration-300 ${
                        isChecked ? 'opacity-100' : 'opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                            <span className="material-symbols-outlined text-md">science</span>
                          </div>
                          <span className="text-xs font-bold text-on-surface truncate max-w-[150px]">{group.name}</span>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={isChecked}
                          onChange={() => handleToggleGroupSelected(group.id)}
                          className="w-5 h-5 accent-primary rounded border-outline-variant cursor-pointer"
                        />
                      </div>

                      {/* Sub toggles for permissions, only show active if group checked */}
                      {isChecked && (
                        <div className="grid grid-cols-1 gap-2 pt-2 border-t border-outline-variant/30 text-[11px] font-semibold text-on-surface-variant">
                          
                          <label className="flex items-center justify-between cursor-pointer group select-none">
                            <span className="group-hover:text-on-surface transition-colors">View Only</span>
                            <input 
                              type="checkbox" 
                              checked={perms.viewOnly}
                              onChange={() => handlePermissionChange(group.id, 'viewOnly')}
                              className="sr-only peer"
                            />
                            <div className="w-8 h-4.5 bg-surface-container-highest rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-350 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-primary relative inline-flex items-center"></div>
                          </label>

                          <label className="flex items-center justify-between cursor-pointer group select-none">
                            <span className="group-hover:text-on-surface transition-colors">Can Download</span>
                            <input 
                              type="checkbox" 
                              checked={perms.canDownload}
                              onChange={() => handlePermissionChange(group.id, 'canDownload')}
                              className="sr-only peer"
                            />
                            <div className="w-8 h-4.5 bg-surface-container-highest rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-350 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-primary relative inline-flex items-center"></div>
                          </label>

                          <label className="flex items-center justify-between cursor-pointer group select-none">
                            <span className="group-hover:text-on-surface transition-colors flex items-center gap-0.5">
                              Allow AI Summaries
                              <span className="material-symbols-outlined text-primary text-xs font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                            </span>
                            <input 
                              type="checkbox" 
                              checked={perms.allowAiSummarization}
                              onChange={() => handlePermissionChange(group.id, 'allowAiSummarization')}
                              className="sr-only peer"
                            />
                            <div className="w-8 h-4.5 bg-surface-container-highest rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-350 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-primary relative inline-flex items-center"></div>
                          </label>

                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-5 mt-5 border-t border-outline-variant/30">
              <button 
                onClick={handleShareSubmit}
                className="w-full bg-primary hover:bg-primary/90 text-on-primary py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
              >
                <span className="material-symbols-outlined text-sm">send</span>
                Share with Selected Groups
              </button>
            </div>
          </div>

          {/* Table: Recently Shared Materials (Full 12 cols width) */}
          <div className="col-span-12">
            <div className="bg-surface border border-outline-variant/40 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-outline-variant/30 flex items-center justify-between">
                <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider">Recently Shared Materials</h3>
              </div>
              
              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left">
                  <thead className="bg-surface-container-low text-on-surface-variant font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-5 py-3">Material Name</th>
                      <th className="px-5 py-3">Target Groups</th>
                      <th className="px-5 py-3">Shared Date</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">Views</th>
                      <th className="px-5 py-3">Downloads</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/20 font-semibold text-on-surface">
                    {history.map(item => (
                      <tr key={item.id} className="hover:bg-surface-container-low/50 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-red-500">picture_as_pdf</span>
                            <span>{item.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="bg-primary/10 border border-primary/20 text-primary px-2.5 py-0.5 rounded text-[10px] font-bold">
                            {item.targetGroup}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-on-surface-variant font-medium">{item.sharedDate}</td>
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            {item.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 font-bold text-on-surface">{item.views}</td>
                        <td className="px-5 py-4 font-bold text-on-surface">{item.downloads}</td>
                        <td className="px-5 py-4 text-right">
                          <a
                            href={`/api/resources/${item.id}/download`}
                            download={item.name}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary text-white text-[11px] font-bold rounded-lg hover:brightness-110 shadow-xs cursor-pointer"
                            title="Download and test file"
                          >
                            <span className="material-symbols-outlined text-[13px]">download</span>
                            Download
                          </a>
                        </td>
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
