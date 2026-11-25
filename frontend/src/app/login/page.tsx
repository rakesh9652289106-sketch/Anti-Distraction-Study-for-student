'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<'student' | 'admin'>('student');
  const [emailOrPhone, setEmailOrPhone] = useState('alex@student.edu');
  const [password, setPassword] = useState('student123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  // Switch role tabs and update default demo credentials
  const handleRoleChange = (newRole: 'student' | 'admin') => {
    setRole(newRole);
    setError('');
    if (newRole === 'student') {
      setEmailOrPhone('alex@student.edu');
      setPassword('student123');
    } else {
      setEmailOrPhone('admin@focusflow.ai');
      setPassword('admin123');
    }
  };

  // 1-Click Social Sign-in
  const handleSocialLogin = (provider: 'Google' | 'Microsoft') => {
    setIsSubmitting(true);
    sessionStorage.setItem('student_authenticated', 'true');
    localStorage.setItem('student_authenticated', 'true');
    setTimeout(() => {
      router.push('/');
    }, 350);
  };

  // Form submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrPhone.trim() || !password.trim()) {
      setError('Please provide both your email and password.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      if (role === 'admin' || emailOrPhone.toLowerCase().includes('admin') || password === 'admin123') {
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
          router.push('/admin/pulse');
        } else {
          const data = await res.json().catch(() => ({}));
          setError(data.error || 'Incorrect admin password (demo: admin123).');
        }
      } else {
        // Standard student login
        sessionStorage.setItem('student_authenticated', 'true');
        localStorage.setItem('student_authenticated', 'true');
        setTimeout(() => {
          router.push('/');
        }, 400);
      }
    } catch {
      setError('Connection failure. Please verify your network.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#f8fafc] text-[#0f172a] flex flex-col justify-between relative selection:bg-emerald-500 selection:text-white">
      {/* Ambient background glows & subtle dot grid */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-emerald-400/12 blur-[140px]" />
        <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full bg-indigo-400/12 blur-[140px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-sky-400/5 blur-[160px]" />
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: `radial-gradient(#0f172a 1px, transparent 1px)`,
            backgroundSize: '24px 24px'
          }}
        />
      </div>

      {/* Top Navbar */}
      <header className="relative z-10 w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-600/20">
            <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              psychology
            </span>
          </div>
          <div>
            <span className="font-bold text-lg text-slate-900 tracking-tight">FocusFlow</span>
            <span className="hidden sm:inline-block ml-2 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
              Study Sentinel
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 border border-slate-200 shadow-xs text-slate-600">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-medium text-[11px]">System Status: Operational</span>
          </div>
          <button
            onClick={() => router.push('/support')}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer font-medium text-xs"
          >
            <span className="material-symbols-outlined text-sm">help</span>
            <span>Support</span>
          </button>
        </div>
      </header>

      {/* Main Center Auth Container */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-[440px]">
          {/* Card Container */}
          <div className="bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-3xl p-7 sm:p-9 shadow-xl shadow-slate-200/50 transition-all">
            
            {/* Header / Titles */}
            <div className="text-center mb-6">
              <h1 className="text-2xl sm:text-[26px] font-black text-slate-900 tracking-tight">
                {role === 'student' ? 'Welcome to FocusFlow' : 'Admin & Staff Portal'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-700 mt-1 font-semibold">
                {role === 'student'
                  ? 'Your AI-powered digital sanctuary for deep study'
                  : 'Manage system settings, analytics & security guard'}
              </p>
            </div>

            {/* Role Switcher Pill Tabs */}
            <div className="p-1 bg-slate-100 rounded-2xl flex items-center mb-6 border border-slate-200/80">
              <button
                type="button"
                onClick={() => handleRoleChange('student')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  role === 'student'
                    ? 'bg-white text-slate-900 shadow-sm shadow-slate-200 border border-slate-200/60'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                <span className="material-symbols-outlined text-base text-emerald-600">school</span>
                <span>Student</span>
              </button>
              <button
                type="button"
                onClick={() => handleRoleChange('admin')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  role === 'admin'
                    ? 'bg-white text-slate-900 shadow-sm shadow-slate-200 border border-slate-200/60'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                <span className="material-symbols-outlined text-base text-indigo-600">admin_panel_settings</span>
                <span>Admin / Staff</span>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email / Username Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700" htmlFor="emailOrPhone">
                  {role === 'student' ? 'Student Email or Username' : 'Administrator Email'}
                </label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors text-lg">
                    {role === 'student' ? 'mail' : 'shield_person'}
                  </span>
                  <input
                    id="emailOrPhone"
                    type="text"
                    required
                    value={emailOrPhone}
                    onChange={e => setEmailOrPhone(e.target.value)}
                    placeholder={role === 'student' ? 'alex@student.edu' : 'admin@focusflow.ai'}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white rounded-xl text-xs text-slate-900 placeholder:text-slate-400 font-medium outline-none transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700" htmlFor="password">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(true)}
                    className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 hover:underline cursor-pointer"
                  >
                    Need demo keys?
                  </button>
                </div>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors text-lg">
                    lock
                  </span>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-11 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white rounded-xl text-xs text-slate-900 placeholder:text-slate-400 font-medium outline-none transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded-lg"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <span className="material-symbols-outlined text-base">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
                  />
                  <span className="text-slate-800 font-bold">Keep me signed in</span>
                </label>
                <span className="text-[11px] text-slate-600 font-semibold">Auto-synced</span>
              </div>

              {/* Error banner */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs flex items-center gap-2 animate-shake">
                  <span className="material-symbols-outlined text-base shrink-0">error</span>
                  <span className="font-medium">{error}</span>
                </div>
              )}

              {/* Primary Action Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-slate-900 hover:bg-slate-800 text-white shadow-md shadow-slate-900/10 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-70"
              >
                {isSubmitting ? (
                  <>
                    <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>{role === 'student' ? 'Enter Focus Sanctuary' : 'Access Admin Dashboard'}</span>
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </>
                )}
              </button>
            </form>

            {/* Social Authentication Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <span className="bg-white px-3">or instant access with</span>
              </div>
            </div>

            {/* Social Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleSocialLogin('Google')}
                className="flex items-center justify-center gap-2 py-2.5 px-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all text-xs font-semibold text-slate-700 cursor-pointer shadow-2xs hover:shadow-xs active:scale-[0.98]"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z" fill="#EA4335" />
                </svg>
                <span>Google</span>
              </button>

              <button
                type="button"
                onClick={() => handleSocialLogin('Microsoft')}
                className="flex items-center justify-center gap-2 py-2.5 px-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all text-xs font-semibold text-slate-700 cursor-pointer shadow-2xs hover:shadow-xs active:scale-[0.98]"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 23 23">
                  <path d="M0 0h11v11H0z" fill="#f35325" />
                  <path d="M12 0h11v11H12z" fill="#81bc06" />
                  <path d="M0 12h11v11H0z" fill="#05a6f0" />
                  <path d="M12 12h11v11H12z" fill="#ffba08" />
                </svg>
                <span>Microsoft</span>
              </button>
            </div>

            {/* Micro Demo Credential Switcher Card */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1 font-medium">
                <span className="material-symbols-outlined text-sm text-emerald-600">key</span>
                Demo credentials active
              </span>
              <button
                type="button"
                onClick={() => handleRoleChange(role === 'student' ? 'admin' : 'student')}
                className="font-bold text-slate-800 hover:text-emerald-600 underline cursor-pointer"
              >
                Switch to {role === 'student' ? 'Admin' : 'Student'}
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Clean Trust / Feature Badges Footer */}
      <footer className="relative z-10 w-full max-w-6xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 border-t border-slate-200/60 mt-4">
        <div className="flex items-center gap-4 flex-wrap justify-center sm:justify-start">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="material-symbols-outlined text-sm text-emerald-600">verified_user</span>
            Local On-Device AI
          </span>
          <span className="text-slate-300">•</span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="material-symbols-outlined text-sm text-indigo-600">visibility</span>
            AI Gaze Sentinel
          </span>
          <span className="text-slate-300">•</span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="material-symbols-outlined text-sm text-amber-600">lock</span>
            Distraction Blocker
          </span>
        </div>

        <div className="text-[11px] text-slate-400">
          © {new Date().getFullYear()} FocusFlow Sentinel. All rights reserved.
        </div>
      </footer>

      {/* Forgot Password / Demo Keys Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-sm w-full border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg">vpn_key</span>
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Demo Access Credentials</h3>
              </div>
              <button
                onClick={() => setShowForgotModal(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              FocusFlow includes pre-configured testing accounts so you can inspect both Student and Administrator experiences immediately.
            </p>

            <div className="space-y-2">
              <div
                onClick={() => {
                  handleRoleChange('student');
                  setShowForgotModal(false);
                }}
                className="p-3 rounded-xl border border-emerald-200/80 bg-emerald-50/50 hover:bg-emerald-50 cursor-pointer transition-colors"
              >
                <div className="flex justify-between items-center text-xs font-bold text-emerald-700">
                  <span>Student Account</span>
                  <span className="text-[10px] uppercase bg-emerald-100 px-2 py-0.5 rounded-full">Apply</span>
                </div>
                <div className="text-[11px] font-mono text-slate-600 mt-1">alex@student.edu</div>
                <div className="text-[11px] font-mono text-slate-500">password: student123</div>
              </div>

              <div
                onClick={() => {
                  handleRoleChange('admin');
                  setShowForgotModal(false);
                }}
                className="p-3 rounded-xl border border-indigo-200/80 bg-indigo-50/50 hover:bg-indigo-50 cursor-pointer transition-colors"
              >
                <div className="flex justify-between items-center text-xs font-bold text-indigo-700">
                  <span>Administrator Account</span>
                  <span className="text-[10px] uppercase bg-indigo-100 px-2 py-0.5 rounded-full">Apply</span>
                </div>
                <div className="text-[11px] font-mono text-slate-600 mt-1">admin@focusflow.ai</div>
                <div className="text-[11px] font-mono text-slate-500">password: admin123</div>
              </div>
            </div>

            <button
              onClick={() => setShowForgotModal(false)}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
