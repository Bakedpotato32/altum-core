'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Zap, ShieldCheck, ArrowRight, MessageSquare } from 'lucide-react';

export default function Login() {
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState(false);
  const router = useRouter();

  const ADMIN_KEY = "287362";
  const STUDENT_KEYS = ["0000", "7054"]; 

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (accessCode === ADMIN_KEY) {
      router.push('/admin');
    } else if (STUDENT_KEYS.includes(accessCode)) {
      router.push('/dashboard');
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  // WhatsApp Redirect Function
  const contactAdmin = () => {
    window.open("https://wa.me/917054937918?text=Hello%20Karan%20sir,%20I%20need%20help%20with%20my%20access%20code.", "_blank");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-svh bg-[#050508] px-8">
      {/* Brand Logo */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12 text-center"
      >
        <div className="w-20 h-20 bg-blue-600/10 border border-blue-500/20 rounded-[30px] flex items-center justify-center mb-6 mx-auto shadow-[0_0_50px_rgba(59,130,246,0.1)]">
          <Zap size={40} className="text-blue-500 fill-blue-500/20" />
        </div>
        <h1 className="text-4xl font-black italic uppercase tracking-tighter text-white leading-none">
          ALTUM<span className="text-blue-500">CORE</span>
        </h1>
        <p className="text-[10px] font-black uppercase tracking-[5px] text-zinc-600 mt-2 ml-1">Portal Entry</p>
      </motion.div>

      {/* Login Form */}
      <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4 mb-10">
        <div className="relative">
          <input 
            type="number" 
            pattern="\d*"
            inputMode="numeric"
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value)}
            placeholder="Enter Access Code"
            className={`w-full bg-[#0f0f12] border ${error ? 'border-red-500/50' : 'border-white/10'} rounded-[24px] py-5 px-6 text-center text-xl font-black tracking-[8px] text-white placeholder:text-zinc-800 placeholder:tracking-normal focus:border-blue-500/50 outline-none transition-all shadow-2xl`}
          />
          {error && (
            <motion.p 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="absolute -bottom-6 left-0 right-0 text-center text-[10px] font-black uppercase text-red-500 tracking-widest"
            >
              Access Denied
            </motion.p>
          )}
        </div>

        <button 
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-[3px] py-5 rounded-[24px] flex items-center justify-center gap-3 shadow-[0_15px_30px_rgba(59,130,246,0.3)] active:scale-95 transition-all"
        >
          Verify Identity
          <ArrowRight size={18} />
        </button>
      </form>

      {/* ENLARGED: WhatsApp Contact Button */}
      <button 
        onClick={contactAdmin}
        className="w-full max-w-sm flex items-center justify-center gap-3 py-5 rounded-[24px] bg-white/[0.03] border border-white/10 text-xs font-black uppercase tracking-[2px] text-zinc-300 active:scale-95 transition-all shadow-xl"
      >
        <MessageSquare size={18} className="text-blue-500" />
        Contact Admin
      </button>

      {/* Footer Info */}
      <div className="mt-16 flex items-center gap-2 text-zinc-800">
        <ShieldCheck size={14} />
        <p className="text-[9px] font-bold uppercase tracking-widest">End-to-End Encrypted Node</p>
      </div>
    </div>
  );
}
