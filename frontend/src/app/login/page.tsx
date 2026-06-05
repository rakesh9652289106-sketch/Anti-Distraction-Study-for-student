'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Background Particle System Simulation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let particles: Array<{
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      opacity: number;
      color: string;
    }> = [];
    const particleCount = 40;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', resize);
    resize();

    // Initialize particles
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 4 + 1,
        speedX: (Math.random() - 0.5) * 0.4,
        speedY: (Math.random() - 0.5) * 0.4,
        opacity: Math.random() * 0.3 + 0.1,
        color: Math.random() > 0.5 ? '#1e293b' : '#006c49'
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
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all credentials.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // If email has 'admin' or password is the admin key, authenticate as Admin
      if (email.includes('admin') || password === 'admin123') {
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
      } else {
        // Standard Student mock authentication
        setTimeout(() => {
          router.push('/');
        }, 800);
      }
    } catch {
      setError('Connection failure. Check network infrastructure.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between relative overflow-hidden font-sans">
      {/* Particle Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-0" />

      {/* Top Navbar */}
      <header className="w-full z-50 flex justify-center px-6 py-4 max-w-7xl mx-auto bg-white/40 backdrop-blur-lg border-b border-slate-200/40">
        <div className="flex items-center justify-between w-full">
          <div className="text-xl font-bold text-slate-800 font-mono tracking-wider">FocusFlow</div>
          <nav className="hidden md:flex gap-6">
            <a className="text-slate-500 hover:text-slate-800 text-xs font-semibold transition-colors" href="#">Help</a>
          </nav>
        </div>
      </header>

      {/* Main Form Center */}
      <main className="flex-grow flex items-center justify-center py-12 px-6 relative z-10">
        <section className="w-full max-w-[420px]">
          <div className="bg-white/75 backdrop-blur-2xl border border-white/40 shadow-xl rounded-2xl p-8">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Login to Learn</h1>
              <p className="text-xs text-slate-500 mt-1">Access your digital sanctuary for deep work.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider" htmlFor="email">
                  Student Email
                </label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                    alternate_email
                  </span>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="name@university.edu"
                    className="w-full pl-10 pr-4 py-2.5 bg-white/50 border border-slate-200 focus:border-slate-800 focus:ring-4 focus:ring-slate-800/5 rounded-lg text-xs outline-none transition-all placeholder-slate-400"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider" htmlFor="password">
                  Password
                </label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                    lock
                  </span>
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-white/50 border border-slate-200 focus:border-slate-800 focus:ring-4 focus:ring-slate-800/5 rounded-lg text-xs outline-none transition-all placeholder-slate-400"
                  />
                </div>
              </div>

              {/* Remember & Reset */}
              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-slate-200 text-slate-800 focus:ring-slate-800"
                  />
                  <span className="text-slate-500 font-semibold">Remember Me</span>
                </label>
                <a className="text-slate-800 font-bold hover:underline" href="#">Forgot Password?</a>
              </div>

              {error && (
                <div className="text-xs text-red-650 bg-red-50 border border-red-100 rounded-lg p-3 flex gap-2">
                  <span className="material-symbols-outlined text-[16px] shrink-0">error</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-slate-850 hover:bg-slate-900 text-white font-bold text-xs py-3 rounded-lg active:scale-[0.98] transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isSubmitting ? 'Verifying Credentials...' : 'Enter Portal'}
              </button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
                <span className="px-3 bg-white/0">Or continue with</span>
              </div>
            </div>

            {/* Social logins */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => { router.push('/'); }}
                className="flex items-center justify-center gap-1.5 py-2 border border-slate-200 rounded-lg bg-white/40 hover:bg-white/60 text-xs font-semibold transition-colors cursor-pointer"
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
                onClick={() => { router.push('/'); }}
                className="flex items-center justify-center gap-1.5 py-2 border border-slate-200 rounded-lg bg-white/40 hover:bg-white/60 text-xs font-semibold transition-colors cursor-pointer"
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

            <div className="mt-8 text-center text-xs">
              <p className="text-slate-500 font-semibold">
                New student? <a className="text-slate-800 font-bold hover:underline" href="#">Create an account</a>
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full py-6 flex flex-col md:flex-row items-center justify-between px-6 max-w-7xl mx-auto bg-transparent relative z-10 text-[10px] font-bold tracking-wide text-slate-400">
        <div className="mb-4 md:mb-0">
          © 2026 FocusFlow. Cognitive Sustainability for Deep Work.
        </div>
        <div className="flex gap-4">
          <a className="hover:text-slate-800 transition-colors" href="#">Privacy Policy</a>
          <a className="hover:text-slate-800 transition-colors" href="#">Terms of Service</a>
          <a className="hover:text-slate-800 transition-colors" href="#">Security</a>
        </div>
      </footer>
    </div>
  );
}
