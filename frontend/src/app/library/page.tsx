'use client';

import React, { useState, useEffect } from 'react';
import { SharedResource } from '@/lib/db';

export default function LibraryPage() {
  const [resources, setResources] = useState<SharedResource[]>([]);
  const [aiPicks, setAiPicks] = useState<SharedResource[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'home' | 'uploads' | 'ai' | 'teachers' | 'starred' | 'archive'>('home');
  const [fileTypeFilter, setFileTypeFilter] = useState('all');

  // Selected resource for AI summary drawer
  const [selectedResource, setSelectedResource] = useState<SharedResource | null>(null);
  const [summaryData, setSummaryData] = useState<{ summaryHtml: string; keyTakeaways: string[] } | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  // Upload dialog
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadType, setUploadType] = useState<'pdf' | 'video' | 'note' | 'paper' | 'link'>('pdf');
  const [isUploading, setIsUploading] = useState(false);

  const fetchLibraryData = async () => {
    try {
      const typeParam = fileTypeFilter !== 'all' ? `&type=${fileTypeFilter}` : '';
      const [resAll, resPicks] = await Promise.all([
        fetch(`/api/student/library?search=${searchQuery}${typeParam}`),
        fetch('/api/student/library/ai-picks')
      ]);

      if (resAll.ok) setResources(await resAll.json());
      if (resPicks.ok) setAiPicks(await resPicks.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLibraryData();
  }, [searchQuery, fileTypeFilter]);

  const handleOpenSummary = async (resItem: SharedResource) => {
    setSelectedResource(resItem);
    setLoadingSummary(true);
    setSummaryData(null);
    try {
      const res = await fetch(`/api/student/library/${resItem.id}/ai-summary`);
      if (res.ok) {
        setSummaryData(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleToggleStar = async (resItem: SharedResource) => {
    try {
      const res = await fetch(`/api/student/library/${resItem.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ starred: !resItem.starred })
      });
      if (res.ok) {
        await fetchLibraryData();
        if (selectedResource?.id === resItem.id) {
          setSelectedResource(prev => prev ? { ...prev, starred: !prev.starred } : null);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleArchive = async (resItem: SharedResource) => {
    try {
      const res = await fetch(`/api/student/library/${resItem.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: !resItem.archived })
      });
      if (res.ok) {
        setSelectedResource(null);
        await fetchLibraryData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTitle.trim()) return;
    setIsUploading(true);
    try {
      const res = await fetch('/api/student/library/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: uploadTitle, fileType: uploadType })
      });
      if (res.ok) {
        alert('File uploaded and AI-indexed successfully!');
        setUploadTitle('');
        setShowUploadModal(false);
        await fetchLibraryData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  // Sidebar filtering logic
  const getFilteredResources = () => {
    switch (selectedCategory) {
      case 'starred':
        return resources.filter(r => r.starred);
      case 'uploads':
        return resources.filter(r => r.ownerId === 'u-student');
      case 'teachers':
        return resources.filter(r => r.ownerId === 't-aris-thorne');
      case 'ai':
        return resources.filter(r => r.relevanceScore >= 90);
      case 'archive':
        // Wait, the API defaults to return archived = false, but if we need archived, we can filter or search
        return resources.filter(r => r.archived);
      case 'home':
      default:
        return resources;
    }
  };

  const currentList = getFilteredResources();

  return (
    <div className="min-h-screen bg-[#f7f9fb] text-[#191c1e] font-sans pb-xl pt-4">
      {/* Top Navbar Offset wrapped in grid layout */}
      <div className="max-w-[1200px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-8 mt-6">
        
        {/* Sidebar (3 cols) */}
        <aside className="lg:col-span-3 bg-slate-200/50 backdrop-blur-lg border border-slate-350/20 rounded-2xl p-4 flex flex-col h-fit">
          <div className="mb-6 px-2">
            <h2 className="text-lg font-bold text-[#091426]">Resource Library</h2>
            <p className="text-[10px] font-bold text-slate-450 uppercase tracking-wider mt-0.5">Cognitive Flow Mode</p>
          </div>
          
          <button 
            onClick={() => setShowUploadModal(true)}
            className="mb-6 flex items-center justify-center gap-2 bg-[#091426] hover:bg-slate-800 text-white py-3 rounded-xl font-semibold text-xs shadow-lg transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">upload_file</span>
            New Upload
          </button>

          <nav className="space-y-1 text-xs font-semibold">
            {[
              { id: 'home', label: 'Home Library', icon: 'home' },
              { id: 'uploads', label: 'My Uploads', icon: 'upload_file' },
              { id: 'ai', label: 'AI Summaries', icon: 'auto_awesome' },
              { id: 'teachers', label: 'Shared by Teachers', icon: 'school' },
              { id: 'starred', label: 'Starred Items', icon: 'star' }
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id as any)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
                  selectedCategory === cat.id 
                    ? 'bg-slate-300/60 text-[#091426] font-bold' 
                    : 'text-slate-550 hover:bg-slate-200/30'
                }`}
              >
                <span className="material-symbols-outlined text-sm">{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Content Area (9 cols) */}
        <main className="lg:col-span-9 space-y-8">
          
          {/* Header */}
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-[#091426] tracking-tight">AI Study Resource Library</h1>
              <p className="text-xs text-slate-500 mt-1">Distill key concepts from PDFs, links, and notes instantly using AI.</p>
            </div>
            <button 
              onClick={() => setShowUploadModal(true)}
              className="bg-[#091426] hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-xs font-semibold shadow-sm transition-colors cursor-pointer"
            >
              Upload New Resource
            </button>
          </header>

          {/* Search bar */}
          <div className="relative max-w-2xl bg-white border border-slate-200 rounded-xl px-4 py-2.5 flex items-center shadow-sm">
            <span className="material-symbols-outlined text-slate-400 mr-2">search</span>
            <input 
              type="text" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search across documents, AI summaries, and lecture notes..."
              className="w-full bg-transparent border-none outline-none text-xs text-slate-800 focus:ring-0 placeholder-slate-400"
            />
          </div>

          {/* Top AI Picks */}
          {aiPicks.length > 0 && selectedCategory === 'home' && (
            <section className="space-y-4">
              <h3 className="text-xs font-bold text-slate-450 uppercase tracking-widest flex items-center gap-1.5">
                <span className="material-symbols-outlined text-blue-600 text-sm">auto_awesome</span>
                Top AI Picks
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {aiPicks.slice(0, 3).map(pick => (
                  <div key={pick.id} className="bg-white border-l-4 border-l-[#006c49] border border-slate-200/60 p-5 rounded-2xl flex flex-col justify-between h-48 relative overflow-hidden group hover:border-slate-350 hover:-translate-y-0.5 transition-all">
                    <div>
                      <div className="flex items-center gap-1 mb-2">
                        <span className="material-symbols-outlined text-slate-400 text-sm">description</span>
                        <span className="bg-emerald-50 text-emerald-700 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">AI Pick</span>
                      </div>
                      <h4 className="font-bold text-sm text-[#091426] line-clamp-2 leading-relaxed">{pick.title}</h4>
                      <p className="text-[10px] text-slate-450 mt-1 line-clamp-2 leading-normal">{pick.aiSummarySnippet}</p>
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-[#006c49] font-bold text-xs">{pick.relevanceScore}% Relevance</span>
                      <button 
                        onClick={() => handleOpenSummary(pick)}
                        className="bg-slate-100 hover:bg-[#091426] hover:text-white p-1.5 rounded-full transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-sm block">psychology</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* All Resources Grid */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-450 uppercase tracking-widest">All Resources ({currentList.length})</h3>
              
              {/* Type filter */}
              <select 
                value={fileTypeFilter}
                onChange={e => setFileTypeFilter(e.target.value)}
                className="bg-white border border-slate-200 text-xs font-semibold py-1 px-3 rounded-lg outline-none cursor-pointer"
              >
                <option value="all">All Formats</option>
                <option value="pdf">PDF Documents</option>
                <option value="video">Lectures (Video)</option>
                <option value="note">Study Notes</option>
                <option value="link">Web References</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {currentList.map(res => (
                <div key={res.id} className="bg-white border border-slate-200/60 rounded-2xl p-4 flex flex-col justify-between group hover:border-[#091426] hover:-translate-y-0.5 transition-all shadow-sm">
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-[9px] font-bold text-slate-650 flex items-center gap-1 uppercase">
                        <span className="material-symbols-outlined text-[12px]">
                          {res.fileType === 'pdf' ? 'picture_as_pdf' : res.fileType === 'video' ? 'play_circle' : 'article'}
                        </span>
                        {res.fileType}
                      </span>

                      <div className="flex gap-1">
                        <button 
                          onClick={() => handleToggleStar(res)}
                          className={`p-1 rounded hover:bg-slate-50 cursor-pointer ${res.starred ? 'text-amber-500' : 'text-slate-400'}`}
                        >
                          <span className="material-symbols-outlined text-sm font-bold block" style={{ fontVariationSettings: res.starred ? "'FILL' 1" : "'FILL' 0" }}>star</span>
                        </button>
                        <button 
                          onClick={() => handleToggleArchive(res)}
                          className="p-1 rounded hover:bg-slate-50 text-slate-400 hover:text-slate-650 cursor-pointer"
                          title="Archive"
                        >
                          <span className="material-symbols-outlined text-sm block">archive</span>
                        </button>
                      </div>
                    </div>

                    <h4 className="font-bold text-sm text-[#091426] line-clamp-2 leading-relaxed mb-1">{res.title}</h4>
                    <p className="text-[10px] text-slate-450 font-semibold mb-3">Uploaded: {new Date(res.createdAt).toLocaleDateString()}</p>
                    <p className="text-[11px] text-slate-500 italic leading-relaxed line-clamp-2">"{res.aiSummarySnippet}"</p>
                  </div>

                  <div className="flex items-center gap-2 mt-4 pt-2 border-t border-slate-100">
                    <a 
                      href={res.url} 
                      target="_blank" 
                      className="flex-1 bg-[#091426] hover:bg-slate-800 text-white text-center py-2 rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      Open
                    </a>
                    <button 
                      onClick={() => handleOpenSummary(res)}
                      className="p-2 bg-slate-50 border border-slate-100 hover:bg-slate-100 rounded-lg text-slate-650 cursor-pointer" 
                      title="AI Summary Insights"
                    >
                      <span className="material-symbols-outlined text-sm block">psychology</span>
                    </button>
                  </div>
                </div>
              ))}

              {/* Upload CTA block */}
              <div 
                onClick={() => setShowUploadModal(true)}
                className="border-2 border-dashed border-slate-300 hover:border-[#091426] rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50 transition-all min-h-[220px]"
              >
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-2">
                  <span className="material-symbols-outlined text-[#091426]">add</span>
                </div>
                <h5 className="font-bold text-xs text-[#091426]">Add Resource</h5>
                <p className="text-[10px] text-slate-450 font-medium mt-0.5">Click to configure study uploads</p>
              </div>
            </div>
          </section>

        </main>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-[#091426]/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-2xl relative">
            <button 
              onClick={() => setShowUploadModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            
            <h3 className="text-lg font-bold text-[#091426] mb-2 flex items-center gap-1.5">
              <span className="material-symbols-outlined">upload_file</span>
              Upload Study Resource
            </h3>
            
            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Document Title</label>
                <input 
                  required
                  type="text" 
                  value={uploadTitle}
                  onChange={e => setUploadTitle(e.target.value)}
                  placeholder="e.g. Quantum Wave Packet Dispersion"
                  className="w-full border border-slate-200 focus:border-slate-800 focus:ring-4 focus:ring-slate-800/5 rounded-xl text-xs p-3 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Resource Type</label>
                <select
                  value={uploadType}
                  onChange={e => setUploadType(e.target.value as any)}
                  className="w-full border border-slate-200 focus:border-slate-800 rounded-xl text-xs p-3 outline-none cursor-pointer"
                >
                  <option value="pdf">PDF File</option>
                  <option value="video">Lecture Video</option>
                  <option value="note">Written Notes</option>
                  <option value="paper">Scientific Paper</option>
                  <option value="link">Web Link Reference</option>
                </select>
              </div>

              <button 
                type="submit"
                disabled={isUploading}
                className="w-full bg-[#091426] hover:bg-slate-800 text-white font-bold text-xs py-3 rounded-xl transition-all cursor-pointer"
              >
                {isUploading ? 'Uploading & AI Indexing...' : 'Index Document'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* AI Summary Sidebar Drawer */}
      {selectedResource && (
        <div className="fixed inset-0 bg-[#091426]/30 backdrop-blur-sm z-50 flex justify-end">
          <div className="bg-white w-full max-w-md h-full shadow-2xl p-6 overflow-y-auto flex flex-col justify-between border-l border-slate-200 animate-slide-in">
            <div>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-md font-bold text-[#091426] flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-blue-600">psychology</span>
                    AI Distilled Insights
                  </h3>
                  <p className="text-[10px] text-slate-500 font-semibold mt-1 truncate max-w-xs">{selectedResource.title}</p>
                </div>
                <button 
                  onClick={() => setSelectedResource(null)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {loadingSummary ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 font-mono">
                  <div className="w-6 h-6 rounded-full border-2 border-slate-200 border-t-blue-600 animate-spin mb-3"></div>
                  <p className="text-[9px] tracking-wider uppercase">Generating AI Synopsis...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Summary html */}
                  {summaryData && (
                    <>
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Synopsis</h4>
                        <div 
                          className="text-xs text-slate-650 leading-relaxed space-y-2 font-medium"
                          dangerouslySetInnerHTML={{ __html: summaryData.summaryHtml }}
                        />
                      </div>

                      <div className="space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Key Takeaways</h4>
                        <ul className="space-y-2">
                          {summaryData.keyTakeaways.map((takeaway, index) => (
                            <li key={index} className="flex gap-2 text-xs text-slate-750 font-medium">
                              <span className="text-emerald-500 font-extrabold">•</span>
                              <span>{takeaway}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="pt-6 border-t border-slate-100 flex gap-2">
              <a 
                href={selectedResource.url} 
                target="_blank"
                className="flex-1 bg-[#091426] hover:bg-slate-800 text-white text-center py-2.5 rounded-xl text-xs font-bold"
              >
                Download Original
              </a>
              <button 
                onClick={() => handleToggleStar(selectedResource)}
                className={`px-3 border border-slate-200 rounded-xl flex items-center justify-center cursor-pointer ${
                  selectedResource.starred ? 'text-amber-500' : 'text-slate-400 hover:text-slate-650'
                }`}
              >
                <span className="material-symbols-outlined block text-[18px]">star</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
