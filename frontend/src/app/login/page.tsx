'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (tokenResponse: { access_token?: string; error?: string }) => void;
          }) => { requestAccessToken: () => void };
        };
      };
    };
  }
}

const ADMIN_EMAIL = 'rakesh9652289106@gmail.com';

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<'student' | 'staff'>('student');
  const [studentName, setStudentName] = useState('');
  const [studentPhone, setStudentPhone] = useState('');
  const [hasGoogleVerifiedBefore, setHasGoogleVerifiedBefore] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const storageKey = role === 'staff' ? 'staff_google_verified_email' : 'student_google_verified_email';
    setHasGoogleVerifiedBefore(Boolean(localStorage.getItem(storageKey)));
  }, [role]);

  useEffect(() => {
    // Load Google Identity Services script
    if (!document.getElementById('google-gsi-script')) {
      const script = document.createElement('script');
      script.id = 'google-gsi-script';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  }, []);

  // Switch role tabs
  const handleRoleChange = (newRole: 'student' | 'staff') => {
    setRole(newRole);
    setError('');
  };

  // Compulsory Google Verification for Students
  const handleGoogleVerification = () => {
    setError('');

    if (!hasGoogleVerifiedBefore) {
      if (!studentName.trim()) {
        setError('Please enter your Full Name before verifying with Google.');
        return;
      }
      if (!/^\d{10}$/.test(studentPhone.trim())) {
        setError('Please enter a valid 10-digit Phone Number (digits only) before verifying with Google.');
        return;
      }
    }

    const clientId =
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
      '1085021351863-fqhvvbqtq50chfcev030kie5p4jmsrsg.apps.googleusercontent.com';
    if (!clientId) {
      setError('Google OAuth Client ID (NEXT_PUBLIC_GOOGLE_CLIENT_ID) is not configured yet. Follow the Google setup steps to connect your Google Client ID.');
      return;
    }

    const oauth2 = window.google?.accounts?.oauth2;
    if (!oauth2) {
      setError('Google Sign-In library is still loading. Please try again in a second.');
      return;
    }

    setIsSubmitting(true);
    const tokenClient = oauth2.initTokenClient({
      client_id: clientId,
      scope: 'openid email profile',
      callback: async tokenResponse => {
        if (tokenResponse.error || !tokenResponse.access_token) {
          setIsSubmitting(false);
          setError('Google verification was cancelled or failed.');
          return;
        }

        try {
          const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
          });
          const profile = await profileRes.json();

          if (!profile?.email) {
            setIsSubmitting(false);
            setError('Could not retrieve verified email from Google.');
            return;
          }

          const endpoint = role === 'staff' ? '/api/staff/google-auth' : '/api/student/google-auth';
          const authRes = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              googleEmail: profile.email,
              googleName: profile.name,
              name: studentName.trim(),
              phone: studentPhone.trim(),
              mode: hasGoogleVerifiedBefore ? 'login' : 'register'
            })
          });

          const authData = await authRes.json().catch(() => ({}));
          if (!authRes.ok) {
            if (authData.needsProfile) {
              setHasGoogleVerifiedBefore(false);
            }
            if (authData.alreadyExists) {
              setHasGoogleVerifiedBefore(true);
            }
            const fallbackMsg =
              authRes.status === 404
                ? `Auth endpoint (${endpoint}) not found (404). Please run "npm run build-all" and restart the server.`
                : `Google login failed (HTTP ${authRes.status}).`;
            setError(authData.error || fallbackMsg);
            setIsSubmitting(false);
            return;
          }

          const verifiedEmail = String(profile.email).trim().toLowerCase();
          if (verifiedEmail === ADMIN_EMAIL) {
            sessionStorage.setItem('admin_authenticated', 'true');
          } else {
            sessionStorage.removeItem('admin_authenticated');
          }

          if (role === 'staff') {
            const staff = authData.staff;
            sessionStorage.setItem('staff_authenticated', 'true');
            localStorage.setItem('staff_authenticated', 'true');
            localStorage.setItem('staff_user_id', staff.id);
            localStorage.setItem('staff_user_name', staff.name);
            localStorage.setItem('staff_user_email', staff.email);
            if (staff.phone) localStorage.setItem('staff_user_phone', staff.phone);
            localStorage.setItem('staff_google_verified_email', staff.email);
            sessionStorage.setItem('student_authenticated', 'true');
            localStorage.setItem('student_authenticated', 'true');
            router.push('/staff');
          } else {
            const user = authData.user;
            localStorage.removeItem('staff_authenticated');
            sessionStorage.removeItem('staff_authenticated');
            sessionStorage.setItem('student_authenticated', 'true');
            localStorage.setItem('student_authenticated', 'true');
            localStorage.setItem('student_user_id', user.id);
            localStorage.setItem('student_user_name', user.name);
            localStorage.setItem('student_user_email', user.email);
            if (user.phone) localStorage.setItem('student_user_phone', user.phone);
            localStorage.setItem('student_google_verified_email', user.email);
            router.push('/');
          }
        } catch {
          setError('Failed to verify Google account with server.');
          setIsSubmitting(false);
        }
      }
    });

    tokenClient.requestAccessToken();
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
                {role === 'student' ? 'Welcome to FocusFlow' : 'Staff & Room Head Portal'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-700 mt-1 font-semibold">
                {role === 'student'
                  ? 'Your AI-powered digital sanctuary for deep study'
                  : 'Monitor assigned rooms, student gazes & tab-switch stats'}
              </p>
            </div>

            {/* Role Switcher Pill Tabs */}
            <div className="p-1 bg-slate-100 rounded-2xl flex items-center mb-6 border border-slate-200/80 gap-1">
              <button
                type="button"
                onClick={() => handleRoleChange('student')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
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
                onClick={() => handleRoleChange('staff')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  role === 'staff'
                    ? 'bg-white text-slate-900 shadow-sm shadow-slate-200 border border-slate-200/60'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                <span className="material-symbols-outlined text-base text-sky-600">badge</span>
                <span>Staff</span>
              </button>
            </div>

            {/* Student & Staff Login (Name & 10-digit Phone + Compulsory Google Verification) */}
            <div className="space-y-4">
                {!hasGoogleVerifiedBefore ? (
                  <>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700" htmlFor="studentName">
                        Full Name
                      </label>
                      <div className="relative group">
                        <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors text-lg">
                          person
                        </span>
                        <input
                          id="studentName"
                          type="text"
                          required
                          value={studentName}
                          onChange={e => setStudentName(e.target.value)}
                          placeholder="Enter your full name"
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white rounded-xl text-xs text-slate-900 placeholder:text-slate-400 font-medium outline-none transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700" htmlFor="studentPhone">
                        Phone Number
                      </label>
                      <div className="relative group">
                        <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors text-lg">
                          call
                        </span>
                        <input
                          id="studentPhone"
                          type="tel"
                          inputMode="numeric"
                          pattern="[0-9]{10}"
                          maxLength={10}
                          required
                          value={studentPhone}
                          onChange={e => setStudentPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                          placeholder="9876543210"
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white rounded-xl text-xs text-slate-900 placeholder:text-slate-400 font-medium outline-none transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-emerald-600 text-lg">verified_user</span>
                      <span className="font-semibold">Google verified — click Google below to sign in</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setHasGoogleVerifiedBefore(false)}
                      className="text-[11px] font-bold text-emerald-700 underline cursor-pointer shrink-0"
                    >
                      New user?
                    </button>
                  </div>
                )}

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs flex items-center gap-2 animate-shake">
                    <span className="material-symbols-outlined text-base shrink-0">error</span>
                    <span className="font-medium">{error}</span>
                  </div>
                )}

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleGoogleVerification}
                  className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-slate-900 hover:bg-slate-800 text-white shadow-md shadow-slate-900/10 active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-70"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z" fill="#EA4335" />
                  </svg>
                  <span>
                    {isSubmitting
                      ? 'Verifying with Google...'
                      : hasGoogleVerifiedBefore
                      ? 'Sign in with Google'
                      : 'Verify & Sign In with Google'}
                  </span>
                </button>

                {!hasGoogleVerifiedBefore && (
                  <p className="text-[11px] text-center text-slate-600 font-medium">
                    Already verified before?{' '}
                    <button
                      type="button"
                      onClick={() => setHasGoogleVerifiedBefore(true)}
                      className="text-emerald-700 font-bold hover:underline cursor-pointer"
                    >
                      Sign in with Google only
                    </button>
                  </p>
                )}
              </div>

            {/* Role Switcher Footer */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1 font-medium">
                <span className="material-symbols-outlined text-sm text-emerald-600">
                  verified_user
                </span>
                Google verification required
              </span>
              <button
                type="button"
                onClick={() => handleRoleChange(role === 'student' ? 'staff' : 'student')}
                className="font-bold text-slate-800 hover:text-emerald-600 underline cursor-pointer"
              >
                Switch to {role === 'student' ? 'Staff' : 'Student'}
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
    </div>
  );
}
