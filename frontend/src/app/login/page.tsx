'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';

export default function LoginPage() {
  const router = useRouter();
  const { login, signup } = useApp();

  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Background Particle System Simulation matching Stitch's Zen Emerald settings
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    const particles: Array<{
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      opacity: number;
      color: string;
    }> = [];
    const particleCount = 30; // Reduced for minimalism

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', resize);
    resize();

    // Initialize particles with slower "Zen" speeds and Emerald colors
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 3 + 1,
        speedX: (Math.random() - 0.5) * 0.15,
        speedY: (Math.random() - 0.5) * 0.15,
        opacity: Math.random() * 0.2 + 0.05,
        color: '#6cf8bb' // Soft emerald/green
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.speedX;
        p.y += p.speedY;

        if (p.x < 0 || p.x > canvas.width || p.y < 0 || p.y > canvas.height) {
          p.x = Math.random() * canvas.width;
          p.y = Math.random() * canvas.height;
        }

        ctx.beginPath();
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      animationId = requestAnimationFrame(animate);
    };

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!prefersReducedMotion) {
      animate();
    }

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Check fields
    if (isRegisterMode) {
      if (!name.trim() || !email.trim() || !phone.trim() || !password.trim()) {
        setError('Please fill in all registration fields.');
        return;
      }
    } else {
      if (!emailOrPhone.trim() || !password.trim()) {
        setError('Please fill in all credentials.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // Admin bypass
      const isInputAdmin = emailOrPhone.toLowerCase().includes('admin') || email.toLowerCase().includes('admin');
      if (isInputAdmin || password === 'admin123') {
        const res = await fetch('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password })
        });
        if (res.ok) {
          router.push('/admin/pulse');
        } else {
          const data = await res.json();
          setError(data.error || 'Incorrect administrator password.');
        }
        return;
      }

      if (isRegisterMode) {
        const res = await signup(name.trim(), email.trim(), phone.trim(), password);
        if (res.success) {
          router.push('/');
        } else {
          setError(res.error || 'Registration failed.');
        }
      } else {
        const res = await login(emailOrPhone.trim(), password);
        if (res.success) {
          router.push('/');
        } else {
          setError(res.error || 'Incorrect phone number/email or password.');
        }
      }
    } catch {
      setError('Connection failure. Check network infrastructure.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between relative overflow-hidden zen-bg">
      {/* Wave flow and glassmorphic card styles */}
      <style>{`
        .zen-bg {
          background: linear-gradient(135deg, #002113 0%, #003220 50%, #002113 100%);
          background-size: 400% 400%;
          animation: wave-flow 20s ease-in-out infinite;
        }
        @keyframes wave-flow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .glass-card {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 10px 40px -10px rgba(0, 0, 0, 0.3);
        }
      `}</style>

      {/* Particle Canvas */}
      <canvas ref={canvasRef} id="particle-canvas" className="absolute inset-0 w-full h-full pointer-events-none z-0 opacity-60" />

      {/* Top Navbar */}
      <header className="fixed top-0 w-full z-50 flex justify-center px-gutter py-4 max-w-container-max mx-auto">
        <div className="flex items-center justify-between w-full">
          <div className="font-headline-md text-headline-md font-bold text-white/90">FocusFlow</div>
          <nav className="hidden md:flex gap-md">
            <a className="text-white/70 font-label-md hover:text-white transition-colors" href="#">Help</a>
          </nav>
        </div>
      </header>

      {/* Main Form Center */}
      <main className="flex-grow flex items-center justify-center pt-xl pb-lg px-gutter relative z-10">
        <section className="w-full max-w-[440px]">
          <div className="glass-card rounded-xl p-lg">
            {/* Header */}
            <div className="text-center mb-lg">
              <h1 className="font-headline-lg text-headline-lg text-primary mb-xs">
                {isRegisterMode ? 'Join FocusFlow' : 'Login to Learn'}
              </h1>
              <p className="font-body-md text-body-md text-on-surface-variant">
                {isRegisterMode ? 'Register your personal productivity hub.' : 'Access your digital sanctuary for deep work.'}
              </p>
            </div>

            {/* Login / Register Form */}
            <form onSubmit={handleSubmit} className="space-y-md">
              {isRegisterMode && (
                <>
                  {/* Name Field */}
                  <div className="space-y-xs">
                    <label className="font-label-md text-label-md text-on-surface" htmlFor="name">
                      Full Name
                    </label>
                    <div className="relative group">
                      <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-secondary transition-colors">
                        person
                      </span>
                      <input
                        id="name"
                        type="text"
                        required
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full pl-[44px] pr-md py-sm bg-surface-container-lowest border border-outline-variant/60 rounded-lg font-body-md text-body-md outline-none transition-all focus:border-secondary focus:ring-4 focus:ring-secondary/10 text-slate-900"
                      />
                    </div>
                  </div>

                  {/* Email Field */}
                  <div className="space-y-xs">
                    <label className="font-label-md text-label-md text-on-surface" htmlFor="email">
                      Email Address
                    </label>
                    <div className="relative group">
                      <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-secondary transition-colors">
                        mail
                      </span>
                      <input
                        id="email"
                        type="email"
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="john@example.com"
                        className="w-full pl-[44px] pr-md py-sm bg-surface-container-lowest border border-outline-variant/60 rounded-lg font-body-md text-body-md outline-none transition-all focus:border-secondary focus:ring-4 focus:ring-secondary/10 text-slate-900"
                      />
                    </div>
                  </div>

                  {/* Phone Field */}
                  <div className="space-y-xs">
                    <label className="font-label-md text-label-md text-on-surface" htmlFor="phone">
                      Phone Number
                    </label>
                    <div className="relative group">
                      <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-secondary transition-colors">
                        phone
                      </span>
                      <input
                        id="phone"
                        type="tel"
                        required
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="+1 (555) 000-0000"
                        className="w-full pl-[44px] pr-md py-sm bg-surface-container-lowest border border-outline-variant/60 rounded-lg font-body-md text-body-md outline-none transition-all focus:border-secondary focus:ring-4 focus:ring-secondary/10 text-slate-900"
                      />
                    </div>
                  </div>
                </>
              )}

              {!isRegisterMode && (
                /* Phone / Email Field */
                <div className="space-y-xs">
                  <label className="font-label-md text-label-md text-on-surface" htmlFor="phoneOrEmail">
                    Phone Number or Email
                  </label>
                  <div className="relative group">
                    <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-secondary transition-colors">
                      contact_mail
                    </span>
                    <input
                      id="phoneOrEmail"
                      type="text"
                      required
                      value={emailOrPhone}
                      onChange={e => setEmailOrPhone(e.target.value)}
                      placeholder="Enter phone or email address"
                      className="w-full pl-[44px] pr-md py-sm bg-surface-container-lowest border border-outline-variant/60 rounded-lg font-body-md text-body-md outline-none transition-all focus:border-secondary focus:ring-4 focus:ring-secondary/10 text-slate-900"
                    />
                  </div>
                </div>
              )}

              {/* Password Field */}
              <div className="space-y-xs">
                <label className="font-label-md text-label-md text-on-surface" htmlFor="password">
                  Password
                </label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-secondary transition-colors">
                    lock
                  </span>
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-[44px] pr-md py-sm bg-surface-container-lowest border border-outline-variant/60 rounded-lg font-body-md text-body-md outline-none transition-all focus:border-secondary focus:ring-4 focus:ring-secondary/10 text-slate-900"
                  />
                </div>
              </div>

              {/* Options */}
              {!isRegisterMode && (
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-xs cursor-pointer group">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-outline-variant text-secondary focus:ring-secondary cursor-pointer"
                    />
                    <span className="font-label-md text-label-md text-on-surface-variant group-hover:text-on-surface transition-colors select-none">
                      Remember Me
                    </span>
                  </label>
                  <a className="font-label-md text-label-md text-secondary font-semibold hover:underline" href="#">
                    Forgot Password?
                  </a>
                </div>
              )}

              {error && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg p-3 flex gap-2">
                  <span className="material-symbols-outlined text-[16px] shrink-0">error</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-secondary text-white font-label-md text-label-md py-sm rounded-lg hover:brightness-110 transition-all duration-200 transform active:scale-[0.98] shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isSubmitting ? 'Verifying Credentials...' : (isRegisterMode ? 'Create Account' : 'Enter Portal')}
              </button>
            </form>

            {/* Social logins option */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
                <span className="px-3 bg-white">Or continue with</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => { router.push('/'); }}
                className="flex items-center justify-center gap-1.5 py-2 border border-slate-200 rounded-lg bg-white/40 hover:bg-white/60 text-xs font-semibold transition-colors cursor-pointer text-slate-700"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"></path>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z" fill="#EA4335"></path>
                </svg>
                <span>Google</span>
              </button>
              <button
                type="button"
                onClick={() => { router.push('/'); }}
                className="flex items-center justify-center gap-1.5 py-2 border border-slate-200 rounded-lg bg-white/40 hover:bg-white/60 text-xs font-semibold transition-colors cursor-pointer text-slate-700"
              >
                <svg className="w-4 h-4" viewBox="0 0 23 23">
                  <path d="M0 0h23v23H0z" fill="#f3f3f3"></path>
                  <path d="M1 1h10v10H1z" fill="#f35325"></path>
                  <path d="M12 1h10v10H12z" fill="#81bc06"></path>
                  <path d="M1 12h10v10H1z" fill="#05a6f0"></path>
                  <path d="M12 12h10v10H12z" fill="#ffba08"></path>
                </svg>
                <span>Microsoft</span>
              </button>
            </div>

            {/* Footer Link */}
            <div className="mt-lg text-center">
              <p className="font-body-md text-body-md text-on-surface-variant">
                {isRegisterMode ? (
                  <>
                    Already registered?{' '}
                    <button
                      type="button"
                      onClick={() => { setIsRegisterMode(false); setError(''); }}
                      className="text-secondary font-semibold hover:underline bg-transparent border-none cursor-pointer"
                    >
                      Login here
                    </button>
                  </>
                ) : (
                  <>
                    New student?{' '}
                    <button
                      type="button"
                      onClick={() => { setIsRegisterMode(true); setError(''); }}
                      className="text-secondary font-semibold hover:underline bg-transparent border-none cursor-pointer"
                    >
                      Create an account
                    </button>
                  </>
                )}
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full py-md flex flex-col md:flex-row items-center justify-between px-gutter max-w-container-max mx-auto bg-transparent relative z-10">
        <div className="font-label-sm text-label-sm text-white/50 mb-4 md:mb-0">
          © 2026 FocusFlow. Cognitive Sustainability for Deep Work.
        </div>
        <div className="flex gap-md">
          <a className="font-label-sm text-label-sm text-white/50 hover:text-white transition-colors" href="#">
            Privacy Policy
          </a>
          <a className="font-label-sm text-label-sm text-white/50 hover:text-white transition-colors" href="#">
            Terms of Service
          </a>
          <a className="font-label-sm text-label-sm text-white/50 hover:text-white transition-colors" href="#">
            Security
          </a>
        </div>
      </footer>

      {/* Floating Support Button */}
      <button
        onClick={() => router.push('/support')}
        className="fixed bottom-md right-gutter w-12 h-12 bg-secondary text-white rounded-full shadow-lg flex items-center justify-center hover:brightness-110 transition-all duration-200 z-50 cursor-pointer"
        title="Support Desk"
      >
        <span className="material-symbols-outlined">question_mark</span>
      </button>
    </div>
  );
}
