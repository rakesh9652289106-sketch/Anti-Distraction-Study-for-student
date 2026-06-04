'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminIndexPage() {
  const router = useRouter();

  useEffect(() => {
    // Automatically redirect /admin to /admin/pulse dashboard
    router.replace('/admin/pulse');
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400 font-mono">
      <div className="w-8 h-8 rounded-full border-2 border-slate-800 border-t-emerald-400 animate-spin mb-sm"></div>
      <p className="text-[10px] tracking-widest uppercase">Redirecting to Control Dashboard...</p>
    </div>
  );
}
