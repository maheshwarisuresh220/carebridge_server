'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Activity, ChevronRight, ShieldCheck, Eye, EyeOff, Lock, User } from 'lucide-react';

// --- INTERACTIVE MASCOT COMPONENT ---
const SecurityBear = ({ focused, showPassword }: { focused: string | null, showPassword: boolean }) => {
  // Calculated positions for animations
  const handPosition = focused === 'password' && !showPassword ? 'translate-y-0' : 'translate-y-full';
  const peekPosition = focused === 'password' && showPassword ? 'translate-y-2' : 'translate-y-full';
  
  return (
    <div className="w-32 h-32 mx-auto mb-2 relative overflow-hidden rounded-full bg-slate-100 border-4 border-white shadow-xl flex items-end justify-center transition-transform hover:scale-105 duration-300">
      <svg viewBox="0 0 100 100" className="w-full h-full relative z-10">
        {/* Body/Head Base */}
        <path d="M15,100 Q15,40 50,40 T85,100" fill="#334155" />
        
        {/* Face */}
        <ellipse cx="50" cy="75" rx="25" ry="22" fill="#F1F5F9" />
        
        {/* Eyes */}
        <g className={`transition-all duration-300 ${focused === 'email' ? 'translate-y-2' : ''}`}>
          <circle cx="40" cy="70" r="3" fill="#0F172A" />
          <circle cx="60" cy="70" r="3" fill="#0F172A" />
        </g>

        {/* Muzzle */}
        <ellipse cx="50" cy="82" rx="10" ry="8" fill="#CBD5E1" />
        <path d="M46,80 Q50,85 54,80" fill="none" stroke="#334155" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="50" cy="78" r="2.5" fill="#334155" />

        {/* Hands (For covering eyes) */}
        <g className={`transition-transform duration-500 ease-in-out ${handPosition}`}>
           {/* Left Hand */}
           <path d="M10,110 Q20,60 50,65" stroke="#334155" strokeWidth="18" strokeLinecap="round" fill="none" />
           {/* Right Hand */}
           <path d="M90,110 Q80,60 50,65" stroke="#334155" strokeWidth="18" strokeLinecap="round" fill="none" />
        </g>

        {/* Peek Hand (One hand lowers slightly) */}
        <g className={`transition-transform duration-500 ease-in-out ${peekPosition}`}>
           {/* Hands shifting down to peek */}
           <path d="M10,120 Q20,70 45,75" stroke="#334155" strokeWidth="18" strokeLinecap="round" fill="none" />
           <path d="M90,110 Q80,60 55,65" stroke="#334155" strokeWidth="18" strokeLinecap="round" fill="none" />
        </g>
      </svg>
    </div>
  );
};

export default function LoginPage() {
  const auth = useAuth();
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // UX States
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate slight delay for animation smoothness
    await new Promise(r => setTimeout(r, 800));
    const success = await auth?.login(email, pass);
    if (!success) setError('Invalid credentials. Please try again.');
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden p-4">
      {/* Dynamic Background */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[30rem] h-[30rem] bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[30rem] h-[30rem] bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-[40%] left-[40%] w-[20rem] h-[20rem] bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="bg-white/70 backdrop-blur-xl p-8 md:p-10 rounded-[2.5rem] shadow-2xl border border-white/60 w-full max-w-md relative z-10 animate-in fade-in zoom-in duration-500">
        
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex p-3 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl shadow-lg shadow-blue-500/30 mb-4 text-white transform hover:rotate-12 transition-transform duration-300">
            <Activity size={28} />
          </div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tighter">CareBridge</h1>
          <p className="text-slate-500 text-sm font-bold tracking-wide uppercase mt-1">Secure Access Portal</p>
        </div>

        {/* The Animated Mascot */}
        <SecurityBear focused={focusedField} showPassword={showPassword} />

        <form onSubmit={handleSubmit} className="space-y-5 mt-6">
          
          {/* Identity Input */}
          <div className="space-y-1 group">
            <label className="text-xs font-bold text-slate-400 uppercase ml-4 group-focus-within:text-blue-600 transition-colors">Identity</label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors">
                <User size={20} />
              </div>
              <input 
                className="w-full pl-12 pr-6 py-4 bg-slate-50/50 border-2 border-slate-100 rounded-2xl focus:bg-white focus:border-blue-500 outline-none transition-all font-semibold text-slate-700 shadow-inner focus:shadow-lg" 
                placeholder="Username" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1 group">
            <label className="text-xs font-bold text-slate-400 uppercase ml-4 group-focus-within:text-blue-600 transition-colors">Secure Key</label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors">
                <Lock size={20} />
              </div>
              <input 
                type={showPassword ? 'text' : 'password'}
                className="w-full pl-12 pr-12 py-4 bg-slate-50/50 border-2 border-slate-100 rounded-2xl focus:bg-white focus:border-blue-500 outline-none transition-all font-semibold text-slate-700 shadow-inner focus:shadow-lg" 
                placeholder="••••••••" 
                value={pass}
                onChange={e => setPass(e.target.value)}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
              />
              {/* Show/Hide Toggle */}
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors p-1 rounded-full hover:bg-slate-100"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
          
          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50/80 backdrop-blur-sm text-red-600 text-sm font-bold rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2 border border-red-100">
              <ShieldCheck size={18} className="shrink-0"/> {error}
            </div>
          )}

          {/* Submit Button */}
          <button 
            disabled={loading} 
            className="w-full py-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white font-bold rounded-2xl hover:from-blue-600 hover:to-indigo-600 hover:shadow-xl hover:shadow-blue-500/30 hover:scale-[1.02] active:scale-95 transition-all duration-300 flex items-center justify-center gap-2 group mt-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                Verifying...
              </span>
            ) : (
              <>
                Access Dashboard 
                <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform"/>
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-xs text-slate-400 font-medium">
            Protected by <span className="text-slate-600 font-bold">256-bit AES Encryption</span>
          </p>
        </div>
      </div>
    </div>
  );
}