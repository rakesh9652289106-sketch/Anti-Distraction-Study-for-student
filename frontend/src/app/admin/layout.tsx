'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [corporateId, setCorporateId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const router = useRouter();
  const pathname = usePathname();

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/admin/check-auth');
      if (res.ok) {
        const data = await res.json();
        setIsAuthenticated(data.authenticated);
      }
    } catch (err) {
      console.error('Failed to check auth:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!corporateId.trim()) {
      setError('Corporate ID is required');
      return;
    }
    if (!password.trim()) {
      setError('Access Key is required');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      if (res.ok) {
        setIsAuthenticated(true);
        setPassword('');
        setCorporateId('');
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || 'Authentication failed. Please verify Access Key.');
      }
    } catch {
      setError('Connection failure. Check network infrastructure.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/admin/logout', { method: 'POST' });
      if (res.ok) {
        setIsAuthenticated(false);
        router.refresh();
      }
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-[#070D19] flex flex-col items-center justify-center z-50 animate-pulse">
        <div className="w-10 h-10 rounded-full border-2 border-slate-800 border-t-emerald-400 animate-spin mb-md"></div>
        <p className="text-[11px] font-mono text-slate-500 tracking-widest uppercase">
          Decrypting Console Access...
        </p>
      </div>
    );
  }

  // Not Logged In - Render Mockup Login Screen
  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 bg-[#070D19] flex flex-col items-center justify-center p-md z-50 overflow-y-auto font-sans">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
        
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute top-[10%] left-[30%] w-[40%] h-[40%] rounded-full bg-emerald-500/5 blur-[120px]"></div>
          <div className="absolute bottom-[10%] right-[30%] w-[40%] h-[40%] rounded-full bg-blue-500/5 blur-[120px]"></div>
        </div>

        <div className="w-full max-w-[380px] flex flex-col items-center z-10 text-slate-200">
          <div className="w-14 h-14 rounded-full bg-[#0D1B2A] border border-[#1B2E46] flex items-center justify-center mb-md shadow-inner">
            <span className="material-symbols-outlined text-emerald-400 text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              lock
            </span>
          </div>

          <div className="text-center mb-md">
            <h1 className="text-xl font-bold text-white tracking-tight leading-none">Administrator Secure Access</h1>
            <p className="text-[10px] font-bold tracking-widest text-slate-400/80 mt-2 uppercase">
              AUTHORIZED PERSONNEL ONLY
            </p>
          </div>

          <div className="w-full bg-[#0D1527]/90 border border-[#1D2A44] rounded-2xl p-7 shadow-2xl backdrop-blur-md">
            <form onSubmit={handleLogin} className="space-y-md">
              <div className="space-y-xs">
                <label className="block text-[10px] font-bold text-slate-400/90 uppercase tracking-widest">
                  Corporate ID
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-[18px]">
                    alternate_email
                  </span>
                  <input
                    type="text"
                    required
                    value={corporateId}
                    onChange={e => setCorporateId(e.target.value)}
                    placeholder="e.g. admin@focusflow.ai"
                    className="w-full bg-[#131D33] border border-[#1E2E4E] focus:border-emerald-500/50 rounded-lg py-2 px-[36px] text-slate-200 outline-none text-xs font-semibold tracking-wide placeholder-slate-600 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-xs">
                <div className="flex justify-between items-baseline">
                  <label className="block text-[10px] font-bold text-slate-400/90 uppercase tracking-widest">
                    Access Key
                  </label>
                  <button
                    type="button"
                    onClick={() => alert('Access keys are managed by FocusFlow Infrastructure. Contact sysadmin for reset details.')}
                    className="text-[10px] font-bold text-emerald-400 hover:text-emerald-350 cursor-pointer"
                  >
                    Forgot Password
                  </button>
                </div>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-[18px]">
                    vpn_key
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-[#131D33] border border-[#1E2E4E] focus:border-emerald-500/50 rounded-lg py-2 pl-[36px] pr-10 text-slate-200 outline-none text-xs font-semibold tracking-wide placeholder-slate-600 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute right-sm top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer flex items-center justify-center"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {showPassword ? 'visibility' : 'visibility_off'}
                    </span>
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex gap-sm p-sm bg-red-950/20 border border-red-900/30 rounded-lg text-red-400 text-[11px] font-semibold leading-relaxed">
                  <span className="material-symbols-outlined text-[16px] shrink-0">error</span>
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-[#5FE29C] hover:bg-[#4CD08A] text-[#0A101D] font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-lg active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-[#0A101D]/20 border-t-[#0A101D] rounded-full animate-spin"></div>
                    Unlocking Secure Node...
                  </>
                ) : (
                  <>
                    Unlock Console
                    <span className="material-symbols-outlined text-[16px] font-bold">arrow_forward</span>
                  </>
                )}
              </button>

              <div className="flex items-center py-xs">
                <div className="flex-grow h-px bg-[#1D2A44]"></div>
                <span className="px-2 text-[9px] font-bold text-slate-500 tracking-widest uppercase">
                  SECURE OPTIONS
                </span>
                <div className="flex-grow h-px bg-[#1D2A44]"></div>
              </div>

              <button
                type="button"
                onClick={() => alert('FIDO2 hardware security key scanner initiated. Please insert USB security token.')}
                className="w-full py-2.5 bg-transparent border border-[#1E2E4E] hover:bg-[#131D33] text-slate-300 hover:text-white font-bold rounded-lg text-[10px] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <span className="material-symbols-outlined text-sm">security_key</span>
                Hardware Security Key
              </button>
            </form>
          </div>

          <div className="mt-md flex flex-col items-center space-y-md w-full">
            <div className="inline-flex items-center gap-1.5 bg-red-950/20 border border-red-900/30 rounded-full px-3.5 py-1 text-[9px] font-bold text-red-400">
              <span className="material-symbols-outlined text-xs animate-pulse">warning</span>
              Emergency Override Protocols Active
            </div>

            <Link
              href="/"
              className="text-xs font-bold text-slate-400 hover:text-white transition-colors flex items-center gap-xs cursor-pointer"
            >
              <span className="material-symbols-outlined text-xs">arrow_back</span>
              Return to Main App
            </Link>

            <div className="text-[10px] font-mono text-slate-600 tracking-wider">
              FocusFlow <span className="text-slate-700">|</span> ADMIN v4.2.1
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Admin Sidebar Items
  const adminNavLinks = [
    { name: 'System Pulse', path: '/admin/pulse', icon: 'monitoring' },
    { name: 'Infrastructure Alerts', path: '/admin/monitor', icon: 'dns' },
    { name: 'UI & Visual Theme', path: '/admin/config/ui', icon: 'palette' },
    { name: 'AI Engine Settings', path: '/admin/config/ai', icon: 'psychology_alt' },
    { name: 'Study Environments', path: '/admin/config/environments', icon: 'domain' },
    { name: 'Create Study Room', path: '/admin/create-room', icon: 'add_home_work' },
    { name: 'Group Environments', path: '/admin/config/group-environments', icon: 'groups' },
    { name: 'User & Group Management', path: '/admin/config/users', icon: 'manage_accounts' },
    { name: 'Rewards & Engagement', path: '/admin/config/rewards', icon: 'military_tech' }
  ];

  // Logged In Admin Layout
  return (
    <div className="min-h-screen bg-[#070D19] text-slate-100 flex relative font-sans">
      
      {/* Left Sidebar Navigation Hub */}
      <aside className="w-64 bg-[#0a101d] border-r border-[#15233c] flex flex-col justify-between py-6 px-4 z-40 fixed left-0 top-0 h-screen overflow-y-auto">
        <div className="space-y-lg">
          {/* Admin Header */}
          <div className="flex items-center gap-sm px-2">
            <div className="w-9 h-9 rounded-full bg-[#1b2e46] text-emerald-450 border border-emerald-500/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-emerald-400 text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
                security
              </span>
            </div>
            <div>
              <h2 className="font-bold text-label-md text-white tracking-tight leading-none">FocusFlow</h2>
              <p className="text-[9px] font-bold tracking-widest text-emerald-400 mt-1 uppercase">Admin Control</p>
            </div>
          </div>

          {/* Navigation Hub Links */}
          <div className="space-y-xs">
            <span className="block text-[9px] uppercase font-bold text-slate-500/70 px-2 tracking-widest mb-xs">
              Console Hub
            </span>
            {adminNavLinks.map(link => {
              const isActive = pathname === link.path;
              return (
                <Link
                  key={link.path}
                  href={link.path}
                  className={`flex items-center gap-sm px-3 py-2.5 rounded-lg transition-all text-xs font-semibold ${
                    isActive
                      ? 'bg-slate-900 border-l-4 border-emerald-500 text-white font-bold'
                      : 'text-slate-400 hover:bg-[#131d33]/55 hover:text-white'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">{link.icon}</span>
                  <span>{link.name}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Sidebar Footer Link */}
        <div className="space-y-sm pt-4 border-t border-[#15233c]/60">
          <Link
            href="/"
            className="flex items-center gap-sm px-3 py-2 text-slate-400 hover:text-white transition-colors text-xs font-semibold"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            <span>Return to User Panel</span>
          </Link>
          <div className="px-3 text-[9px] font-mono text-slate-650">
            Node Server v4.2.1
          </div>
        </div>
      </aside>

      {/* Right Content Area */}
      <div className="pl-64 flex flex-col min-h-screen w-full relative z-10">
        
        {/* Top Active Bar */}
        <header className="border-b border-[#15233c] bg-[#0d1527]/90 backdrop-blur-md sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase">
                ADMIN CONSOLE ACTIVE
              </span>
            </div>
            
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-[#131d33] hover:border-slate-700 text-slate-350 hover:text-white font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all shadow-md"
            >
              <span className="material-symbols-outlined text-[16px]">logout</span>
              End Session
            </button>
          </div>
        </header>

        {/* Main Content Viewport */}
        <main className="flex-grow max-w-7xl w-full mx-auto px-6 py-8 relative z-10">
          {children}
        </main>
      </div>

      {/* Subtle Background Glows */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[20%] right-[10%] w-[35%] h-[35%] rounded-full bg-emerald-500/5 blur-[130px]"></div>
        <div className="absolute bottom-[20%] left-[10%] w-[35%] h-[35%] rounded-full bg-blue-500/5 blur-[130px]"></div>
      </div>

    </div>
  );
}
