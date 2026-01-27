'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, Loader2 } from 'lucide-react';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is already logged in
    const storedUser = localStorage.getItem('carebridge_user');
    
    // Small timeout to let the animation show (feels smoother)
    const timer = setTimeout(() => {
      if (storedUser) {
        router.push('/dashboard'); 
      } else {
        router.push('/login');     
      }
    }, 1500); // 1.5 seconds delay for better UX

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 relative overflow-hidden">
      
      {/* Decorative Background Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000"></div>

      {/* Main Loading Card */}
      <div className="z-10 flex flex-col items-center animate-in fade-in zoom-in duration-700">
        
        {/* Logo Container */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-blue-500 blur-xl opacity-20 rounded-full animate-pulse"></div>
          <div className="relative bg-white p-5 rounded-2xl shadow-xl shadow-blue-500/10 border border-white/50">
            <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-4 rounded-xl text-white">
              <Activity size={40} className="animate-pulse" />
            </div>
          </div>
        </div>

        {/* Text & Spinner */}
        <h1 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">CareBridge</h1>
        
        <div className="flex items-center gap-3 bg-white/60 backdrop-blur-md px-6 py-2 rounded-full border border-slate-200 shadow-sm mt-4">
          <Loader2 size={18} className="text-blue-600 animate-spin" />
          <span className="text-sm font-bold text-slate-600 uppercase tracking-wide">Loading System...</span>
        </div>

        <p className="text-slate-400 text-xs mt-6 font-medium animate-pulse">Establishing Secure Connection</p>
      </div>
    </div>
  );
}