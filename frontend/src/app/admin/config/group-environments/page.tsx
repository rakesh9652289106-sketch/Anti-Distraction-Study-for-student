'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/create-room');
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400 font-mono">
      <div className="w-8 h-8 rounded-full border-2 border-slate-800 border-t-emerald-450 animate-spin mb-4"></div>
      <p className="text-[10px] tracking-widest uppercase">Redirecting to Rooms Console...</p>
    </div>
  );
}
