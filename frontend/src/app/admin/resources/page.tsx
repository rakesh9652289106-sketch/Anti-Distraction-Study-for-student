'use client';

import React, { useState, useEffect } from 'react';
import { StudyRoom } from '@/lib/db';

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

export default function AdminResourcesPage() {
  const [rooms, setRooms] = useState<StudyRoom[]>([]);
  const [history, setHistory] = useState<SharedHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Upload States
  const [uploadedTitle, setUploadedTitle] = useState('');
  const [uploadedType, setUploadedType] = useState('pdf');
  const [uploadedFileData, setUploadedFileData] = useState<string>('');
  const [uploadedSize, setUploadedSize] = useState<string>('');
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [suggestedTags, setSuggestedTags] = useState<string[]>(['Quantum Mechanics', 'Advanced Physics', 'Particle Theory']);
  const [newTagInput, setNewTagInput] = useState('');
  const [tempFileId, setTempFileId] = useState('');

  // Sharing permissions config state mapped by Room ID
  const [selectedRooms, setSelectedRooms] = useState<Record<string, boolean>>({});
  const [roomPermissions, setRoomPermissions] = useState<Record<string, { viewOnly: boolean; canDownload: boolean; allowAiSummarization: boolean }>>({});

  const loadData = async () => {
    try {
      const [resRooms, resHistory] = await Promise.all([
        fetch('/api/student/rooms'),
        fetch('/api/teacher/resources/shared-history')
      ]);

      if (resRooms.ok) {
        const roomsData: StudyRoom[] = await resRooms.json();
        setRooms(roomsData || []);
        
        // Initialize default permissions mappings
        const initialSelected: Record<string, boolean> = {};
        const initialPerms: Record<string, { viewOnly: boolean; canDownload: boolean; allowAiSummarization: boolean }> = {};
        roomsData.forEach((r, idx) => {
          initialSelected[r.id] = idx === 0; // Check the first room by default
          initialPerms[r.id] = { viewOnly: false, canDownload: true, allowAiSummarization: true };
        });
        setSelectedRooms(initialSelected);
        setRoomPermissions(initialPerms);
      }

      if (resHistory.ok) {
        setHistory(await resHistory.json());
      }
    } catch (err) {
      console.error('Error fetching admin resources page data:', err);
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
    setUploadedSize(`${(file.size / (1024 * 1024)).toFixed(2)} MB`);

    // Determine type from extension
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'mp4' || ext === 'mov' || ext === 'webm') setUploadedType('video');
    else if (ext === 'url' || ext === 'link') setUploadedType('link');
    else if (ext === 'txt' || ext === 'md') setUploadedType('note');
    else if (ext === 'doc' || ext === 'docx') setUploadedType('paper');
    else setUploadedType('pdf');

    // Read actual file bytes as base64 Data URL so it is persisted on the backend
    setIsReadingFile(true);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setUploadedFileData(reader.result);
      }
      setIsReadingFile(false);
    };
    reader.onerror = () => {
      setIsReadingFile(false);
      alert('Failed to read file from disk. Please try selecting the file again.');
    };
    reader.readAsDataURL(file);

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

  const handleToggleRoomSelected = (roomId: string) => {
    setSelectedRooms(prev => ({
      ...prev,
      [roomId]: !prev[roomId]
    }));
  };

  const handlePermissionChange = (roomId: string, key: 'viewOnly' | 'canDownload' | 'allowAiSummarization') => {
    setRoomPermissions(prev => ({
      ...prev,
      [roomId]: {
        ...prev[roomId],
        [key]: !prev[roomId][key]
      }
    }));
  };

  const handleShareSubmit = async () => {
    if (isReadingFile) {
      alert('Please wait a moment while the file finishes loading before sharing.');
      return;
    }
    if (!uploadedTitle.trim()) {
      alert('Please upload a file or specify a study material name first.');
      return;
    }

    // Build targeted room configurations mapping roomId to groupId (which backend maps to study rooms)
    const groupSettings = Object.entries(selectedRooms)
      .filter(([, isSelected]) => isSelected)
      .map(([roomId]) => ({
        groupId: roomId,
        permissions: roomPermissions[roomId] || { viewOnly: false, canDownload: true, allowAiSummarization: true }
      }));

    if (groupSettings.length === 0) {
      alert('Please select at least one study room to share this resource with.');
      return;
    }

    setIsSharing(true);
    try {
      const res = await fetch('/api/teacher/resources/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tempId: tempFileId || `tmp-${Date.now()}`,
          title: uploadedTitle,
          fileType: uploadedType,
          fileData: uploadedFileData || undefined,
          size: uploadedSize || undefined,
          tags: suggestedTags,
          groupSettings
        })
      });

      if (res.ok) {
        alert('Material successfully shared and deployed to selected rooms!');
        // Reset upload form state
        setUploadedTitle('');
        setUploadedFileData('');
        setUploadedSize('');
        setTempFileId('');
        // Reload shared items log list
        const resHistory = await fetch('/api/teacher/resources/shared-history');
        if (resHistory.ok) {
          setHistory(await resHistory.json());
        }
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Failed to share material.');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to share material.');
    } finally {
      setIsSharing(false);
    }
  };

  const handleDeleteMaterial = async (id: string, name: string) => {
    if (!confirm(`Delete material "${name}"? It will also be removed from all rooms.`)) return;
    try {
      const res = await fetch(`/api/teacher/resources/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          ...(sessionStorage.getItem('admin_authenticated') === 'true'
            ? { 'x-admin-auth': 'authenticated' }
            : {})
        }
      });
      if (res.ok) {
        setHistory(prev => prev.filter(item => item.id !== id));
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Failed to delete material');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to delete material');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400 font-mono">
        <div className="w-8 h-8 rounded-full border-2 border-slate-800 border-t-emerald-400 animate-spin mb-4"></div>
        <p className="text-[10px] tracking-widest uppercase">Aligning classroom catalogs...</p>
      </div>
    );
  }

  return (
    <div className="space-y-lg relative font-sans text-slate-200">
      
      {/* Header */}
      <div>
        <h2 className="font-bold text-headline-lg text-white">Share Coursework &amp; Study Materials</h2>
        <p className="text-body-md text-slate-400 font-medium">
          Distribute PDFs, documents, or lecture notes to student rooms with custom view/download permissions and AI-generated tag tags.
        </p>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Upload box & AI Tags (7 cols) */}
        <div className="lg:col-span-7 space-y-6 flex flex-col justify-between">
          
          {/* Upload Box */}
          <div className="bg-[#0d1527]/90 border border-slate-800 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-all hover:border-[#1E2E4E] hover:bg-[#0d1527]/70 min-h-[220px]">
            <div className="w-14 h-14 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-3xl text-emerald-400">cloud_upload</span>
            </div>
            
            {uploadedTitle ? (
              <div>
                <h3 className="text-sm font-bold text-white mb-1">Uploaded: {uploadedTitle}</h3>
                <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Format: {uploadedType}</p>
              </div>
            ) : (
              <div>
                <h3 className="text-sm font-bold text-white mb-1">Upload Study Material</h3>
                <p className="text-[11px] text-slate-450 font-medium mb-4">Select or drag PDF files, lecture notes, or syllabus docs (Max 50MB)</p>
              </div>
            )}

            <label className="mt-3 px-md py-sm bg-slate-900 border border-slate-800 hover:bg-[#131d33] hover:border-slate-700 text-emerald-400 text-xs font-bold rounded-lg shadow-md cursor-pointer select-none">
              Browse Files
              <input 
                type="file" 
                onChange={handleSimulateUpload}
                className="hidden" 
              />
            </label>
          </div>

          {/* AI-Suggested Tags */}
          <div className="glass-panel rounded-2xl p-5 border border-[#1E2E4E] bg-[#0d1527]/90 text-slate-200">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <span className="material-symbols-outlined text-md">psychology</span>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">AI Topic Classifier</h3>
              </div>
              <span className="bg-[#1b2e46]/60 border border-emerald-500/20 text-emerald-400 text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Automated
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {suggestedTags.map(tag => (
                <span 
                  key={tag} 
                  className="inline-flex items-center gap-1 px-3 py-1 bg-slate-900 border border-slate-800 text-slate-300 rounded-full text-xs font-bold"
                >
                  {tag}
                  <button 
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-red-400 cursor-pointer flex items-center"
                    title="Remove tag"
                  >
                    <span className="material-symbols-outlined text-xs font-bold">close</span>
                  </button>
                </span>
              ))}
              
              <form onSubmit={handleAddCustomTag} className="inline-flex items-center">
                <input
                  type="text"
                  value={newTagInput}
                  onChange={e => setNewTagInput(e.target.value)}
                  placeholder="+ Add Topic"
                  className="border border-dashed border-slate-800 focus:border-slate-600 rounded-full px-3 py-1 text-xs text-slate-450 outline-none bg-transparent w-24 transition-all"
                />
              </form>
            </div>
          </div>

        </div>

        {/* Right Column: Settings & Room check toggles (5 cols) */}
        <div className="lg:col-span-5 glass-panel rounded-2xl p-5 border border-[#1E2E4E] bg-[#0d1527]/90 text-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Distribution Target Rooms</h3>
              <button
                type="button"
                onClick={() => {
                  const allSelected = rooms.length > 0 && rooms.every(r => selectedRooms[r.id]);
                  const next: Record<string, boolean> = {};
                  rooms.forEach(r => { next[r.id] = !allSelected; });
                  setSelectedRooms(next);
                }}
                className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 cursor-pointer"
              >
                {rooms.length > 0 && rooms.every(r => selectedRooms[r.id]) ? 'Deselect All' : 'Select All Rooms'}
              </button>
            </div>
            
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-xs">
              {rooms.map(room => {
                const isChecked = selectedRooms[room.id] || false;
                const perms = roomPermissions[room.id] || { viewOnly: true, canDownload: false, allowAiSummarization: true };
                return (
                  <div 
                    key={room.id} 
                    className={`p-3 bg-[#131d33]/40 border border-slate-850 rounded-xl transition-opacity duration-300 ${
                      isChecked ? 'opacity-100 border-[#1E2E4E]' : 'opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 text-emerald-400 flex items-center justify-center">
                          <span className="material-symbols-outlined text-md">meeting_room</span>
                        </div>
                        <span className="text-xs font-bold text-white truncate max-w-[180px]">{room.name}</span>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={isChecked}
                        onChange={() => handleToggleRoomSelected(room.id)}
                        className="rounded border-[#1E2E4E] text-[#5FE29C] bg-[#131D33] focus:ring-emerald-500/30 w-4 h-4 cursor-pointer"
                      />
                    </div>

                    {/* Sub toggle for download permission */}
                    {isChecked && (
                      <div className="grid grid-cols-1 gap-2 pt-2 border-t border-slate-900 text-[11px] font-semibold text-slate-400">
                        <label className="flex items-center justify-between cursor-pointer group select-none">
                          <span className="group-hover:text-white transition-colors">Allow Local Download</span>
                          <input 
                            type="checkbox" 
                            checked={perms.canDownload}
                            onChange={() => handlePermissionChange(room.id, 'canDownload')}
                            className="sr-only peer"
                          />
                          <div className="w-7 h-4 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-350 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500 relative inline-flex items-center"></div>
                        </label>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-5 mt-5 border-t border-slate-800">
            <button 
              onClick={handleShareSubmit}
              disabled={isSharing}
              className="w-full bg-[#5FE29C] hover:bg-[#4CD08A] disabled:opacity-50 text-[#0A101D] py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-lg transition-transform active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-sm font-bold">send</span>
              {isSharing ? 'Deploying to Rooms...' : 'Share and Deploy to Selected Rooms'}
            </button>
          </div>
        </div>

        {/* Table: Recently Shared Materials (Full 12 cols width) */}
        <div className="col-span-12">
          <div className="glass-panel rounded-2xl border border-slate-800 bg-[#0d1527]/90 text-slate-200 overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Recently Shared Materials Registry</h3>
            </div>
            
            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left">
                <thead className="bg-[#131d33]/50 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-3 py-3">Material Name</th>
                    <th className="px-3 py-3">Target Rooms</th>
                    <th className="px-3 py-3">Shared Date</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Views</th>
                    <th className="px-3 py-3">Downloads</th>
                    <th className="px-3 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900 font-semibold text-slate-300">
                  {history.map(item => (
                    <tr key={item.id} className="hover:bg-[#131d33]/20 transition-colors">
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-red-400 text-base">picture_as_pdf</span>
                          <span className="text-white truncate max-w-[180px]" title={item.name}>{item.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className="bg-[#1b2e46]/60 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap">
                          {item.targetGroup}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-slate-500 font-medium whitespace-nowrap">{item.sharedDate}</td>
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center gap-1 text-emerald-400 text-xs font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 font-bold text-slate-400">{item.views}</td>
                      <td className="px-3 py-3 font-bold text-slate-400">{item.downloads}</td>
                      <td className="px-3 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteMaterial(item.id, item.name)}
                          className="px-2.5 py-1.5 bg-red-600/20 border border-red-500/40 text-red-500 hover:bg-red-600 hover:text-white rounded-lg transition-all cursor-pointer inline-flex items-center gap-1 text-[11px] font-bold"
                          title={`Delete ${item.name}`}
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                          <span>Delete</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {history.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-500 italic">
                        No materials shared yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
