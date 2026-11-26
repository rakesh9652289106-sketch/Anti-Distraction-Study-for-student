'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

const ADMIN_EMAIL = 'rakesh9652289106@gmail.com';

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
      const signedInEmails = [
        localStorage.getItem('student_user_email'),
        localStorage.getItem('staff_user_email'),
        localStorage.getItem('student_google_verified_email'),
        localStorage.getItem('staff_google_verified_email')
      ].map(e => (e || '').trim().toLowerCase());

      if (!signedInEmails.includes(ADMIN_EMAIL)) {
        sessionStorage.removeItem('admin_authenticated');
        setIsAuthenticated(false);
        setIsLoading(false);
        const isLoggedIn =
          sessionStorage.getItem('student_authenticated') === 'true' ||
          localStorage.getItem('student_authenticated') === 'true';
        router.replace(isLoggedIn ? '/' : '/login');
        return;
      }

      sessionStorage.setItem('admin_authenticated', 'true');
      setIsAuthenticated(true);
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
        credentials: 'include',
        body: JSON.stringify({ password })
      });

      if (res.ok) {
        sessionStorage.setItem('student_authenticated', 'true');
        localStorage.setItem('student_authenticated', 'true');
        sessionStorage.setItem('admin_authenticated', 'true');
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
      const res = await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' });
      if (res.ok) {
        sessionStorage.removeItem('admin_authenticated');
        setIsAuthenticated(false);
        router.refresh();
      }
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-[#590907] flex flex-col items-center justify-center z-50 animate-pulse">
        <div className="w-10 h-10 rounded-full border-2 border-red-900 border-t-amber-400 animate-spin mb-md"></div>
        <p className="text-[11px] font-mono text-amber-200 tracking-widest uppercase font-bold">
          Decrypting Console Access...
        </p>
      </div>
    );
  }

  // Not Logged In - Render Mockup Login Screen
  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 bg-[#590907] flex flex-col items-center justify-center p-md z-50 overflow-y-auto font-sans">
        <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
        
        <div className="w-full max-w-[390px] flex flex-col items-center z-10 text-black">
          <div className="w-14 h-14 rounded-full bg-[#FDF6ED] border-2 border-[#E2CEB9] flex items-center justify-center mb-md shadow-lg">
            <span className="material-symbols-outlined text-[#590907] text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              lock
            </span>
          </div>

          <div className="text-center mb-md">
            <h1 className="text-2xl font-black text-white tracking-tight leading-none drop-shadow-sm">Administrator Console</h1>
            <p className="text-[10px] font-black tracking-widest text-amber-200/90 mt-2 uppercase">
              AUTHORIZED PERSONNEL ONLY
            </p>
          </div>

          <div className="w-full bg-[#FDF6ED] border-2 border-[#E2CEB9] rounded-2xl p-7 shadow-2xl backdrop-blur-md text-black">
            {/* Quick Demo Fill */}
            <div className="mb-4 p-3 bg-[#F3E2CF] border border-[#D5BFA7] rounded-xl flex items-center justify-between text-black">
              <div>
                <div className="text-[10px] font-black text-[#590907] tracking-wider uppercase">Sample Credentials</div>
                <div className="text-[11px] text-black font-mono font-bold mt-0.5">admin@focusflow.ai</div>
                <div className="text-[10px] text-black font-mono font-bold">Access Key: admin123</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCorporateId('admin@focusflow.ai');
                  setPassword('admin123');
                  setError('');
                }}
                className="px-2.5 py-1.5 bg-[#590907] hover:bg-[#430605] text-white text-[10px] font-bold rounded-lg cursor-pointer transition-colors shadow-sm"
              >
                Auto-Fill
              </button>
            </div>

            <form onSubmit={handleLogin} className="space-y-md">
              <div className="space-y-xs">
                <label className="block text-[10px] font-black text-black uppercase tracking-widest">
                  Corporate ID
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-700 text-[18px]">
                    alternate_email
                  </span>
                  <input
                    type="text"
                    required
                    value={corporateId}
                    onChange={e => setCorporateId(e.target.value)}
                    placeholder="e.g. admin@focusflow.ai"
                    className="w-full bg-white border border-[#D5BFA7] focus:border-[#590907] rounded-lg py-2.5 px-[36px] text-black outline-none text-xs font-bold tracking-wide placeholder-slate-400 transition-colors shadow-inner"
                  />
                </div>
              </div>

              <div className="space-y-xs">
                <div className="flex justify-between items-baseline">
                  <label className="block text-[10px] font-black text-black uppercase tracking-widest">
                    Access Key
                  </label>
                  <button
                    type="button"
                    onClick={() => alert('Access keys are managed by FocusFlow Infrastructure. Contact sysadmin for reset details.')}
                    className="text-[10px] font-bold text-[#590907] hover:underline cursor-pointer"
                  >
                    Forgot Password
                  </button>
                </div>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-700 text-[18px]">
                    vpn_key
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-white border border-[#D5BFA7] focus:border-[#590907] rounded-lg py-2.5 pl-[36px] pr-10 text-black outline-none text-xs font-bold tracking-wide placeholder-slate-400 transition-colors shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute right-sm top-1/2 -translate-y-1/2 text-slate-700 hover:text-black cursor-pointer flex items-center justify-center"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {showPassword ? 'visibility' : 'visibility_off'}
                    </span>
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex gap-sm p-sm bg-red-100 border border-red-300 rounded-lg text-red-700 text-[11px] font-bold leading-relaxed">
                  <span className="material-symbols-outlined text-[16px] shrink-0">error</span>
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-[#590907] hover:bg-[#430605] text-white font-black rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-lg active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Unlocking Console...
                  </>
                ) : (
                  <>
                    Unlock Console
                    <span className="material-symbols-outlined text-[16px] font-bold">arrow_forward</span>
                  </>
                )}
              </button>

              <div className="flex items-center py-xs">
                <div className="flex-grow h-px bg-[#D5BFA7]"></div>
                <span className="px-2 text-[9px] font-bold text-slate-700 tracking-widest uppercase">
                  SECURE OPTIONS
                </span>
                <div className="flex-grow h-px bg-[#D5BFA7]"></div>
              </div>

              <button
                type="button"
                onClick={() => alert('FIDO2 hardware security key scanner initiated. Please insert USB security token.')}
                className="w-full py-2.5 bg-[#F3E2CF] border border-[#D5BFA7] hover:bg-[#EBD2B8] text-black font-bold rounded-lg text-[10px] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <span className="material-symbols-outlined text-sm text-[#590907]">security_key</span>
                Hardware Security Key
              </button>
            </form>
          </div>

          <div className="mt-md flex flex-col items-center space-y-md w-full">
            <div className="inline-flex items-center gap-1.5 bg-[#FDF6ED] border border-[#E2CEB9] rounded-full px-3.5 py-1 text-[9.5px] font-bold text-[#590907] shadow-sm">
              <span className="material-symbols-outlined text-xs animate-pulse text-amber-600">warning</span>
              Emergency Override Protocols Active
            </div>

            <Link
              href="/"
              className="text-xs font-bold text-[#F5E6D3] hover:text-white transition-colors flex items-center gap-xs cursor-pointer"
            >
              <span className="material-symbols-outlined text-xs">arrow_back</span>
              Return to Main App
            </Link>

            <div className="text-[10px] font-mono text-amber-200/80 tracking-wider font-bold">
              FocusFlow <span className="text-amber-400">|</span> ADMIN v4.2.1
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
    { name: 'Create & Configure Rooms', path: '/admin/create-room', icon: 'add_home_work' },
    { name: 'Manage Users', path: '/admin/config/users', icon: 'manage_accounts' },
    { name: 'Manage Staff', path: '/admin/staff', icon: 'badge' },
    { name: 'Share Study Materials', path: '/admin/resources', icon: 'auto_stories' },
    { name: 'Rewards & Engagement', path: '/admin/config/rewards', icon: 'military_tech' }
  ];

  // Logged In Admin Layout with Burgundy Background & Black Text
  return (
    <div className="min-h-screen bg-[#590907] text-black flex relative font-sans admin-theme-burgundy">
      
      {/* Left Sidebar Navigation Hub */}
      <aside className="w-64 bg-[#3D0403] border-r border-[#690E0C] flex flex-col justify-between py-6 px-4 z-40 fixed left-0 top-0 h-screen overflow-y-auto">
        <div className="space-y-lg">
          {/* Admin Header */}
          <div className="flex items-center gap-sm px-2">
            <div className="w-9 h-9 rounded-full bg-[#FDF6ED] text-[#590907] border border-[#E2CEB9] flex items-center justify-center shadow-md">
              <span className="material-symbols-outlined text-[#590907] text-lg font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>
                security
              </span>
            </div>
            <div>
              <h2 className="font-black text-label-md text-white tracking-tight leading-none">FocusFlow</h2>
              <p className="text-[9px] font-bold tracking-widest text-amber-300 mt-1 uppercase">Admin Control</p>
            </div>
          </div>

          {/* Navigation Hub Links */}
          <div className="space-y-xs">
            <span className="block text-[9px] uppercase font-black text-amber-200/80 px-2 tracking-widest mb-xs">
              Console Hub
            </span>
            {adminNavLinks.map(link => {
              const isActive = pathname === link.path;
              return (
                <Link
                  key={link.path}
                  href={link.path}
                  className={`flex items-center gap-sm px-3 py-2.5 rounded-lg transition-all text-xs font-bold ${
                    isActive
                      ? 'bg-[#FDF6ED] border-l-4 border-amber-500 text-black font-black shadow-md'
                      : 'text-[#F5E6D3] hover:bg-[#590907] hover:text-white'
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
        <div className="space-y-sm pt-4 border-t border-[#690E0C]">
          <Link
            href="/"
            className="flex items-center gap-sm px-3 py-2 text-[#F5E6D3] hover:text-white transition-colors text-xs font-bold"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            <span>Return to User Panel</span>
          </Link>
          <div className="px-3 text-[9px] font-mono text-amber-200/60 font-bold">
            Node Server v4.2.1
          </div>
        </div>
      </aside>

      {/* Right Content Area */}
      <div className="pl-64 flex flex-col min-h-screen w-full relative z-10">
        
        {/* Top Active Bar */}
        <header className="border-b border-[#690E0C] bg-[#480605]/95 backdrop-blur-md sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
              <span className="text-[10px] font-mono font-black tracking-widest text-amber-200 uppercase">
                ADMIN CONSOLE ACTIVE · BURGUNDY THEME
              </span>
            </div>
            
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-[#FDF6ED] hover:bg-white text-black font-black text-xs rounded-lg flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all shadow-md border border-[#E2CEB9]"
            >
              <span className="material-symbols-outlined text-[16px] font-bold">logout</span>
              End Session
            </button>
          </div>
        </header>

        {/* Main Content Viewport with Burgundy Background */}
        <main className="flex-grow max-w-7xl w-full mx-auto px-6 py-8 relative z-10 text-black">
          {children}
        </main>
      </div>

    </div>
  );
}
