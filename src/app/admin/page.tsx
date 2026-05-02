'use client';
import React, { useState, useEffect } from 'react';
import { ShieldCheck, Bell, Save, Plus, Users, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
  const [notice, setNotice] = useState("");
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  // Load existing notice on mount
  useEffect(() => {
    const savedNotice = localStorage.getItem('altum_notice');
    if (savedNotice) setNotice(savedNotice);
  }, []);

  const handleUpdateNotice = () => {
    localStorage.setItem('altum_notice', notice);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="px-6 pt-28 pb-32 min-h-svh bg-[#050508]">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-600/20 rounded-2xl border border-blue-500/30">
            <ShieldCheck className="text-blue-500" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black italic uppercase text-white tracking-tighter">Admin <span className="text-blue-500">Core</span></h2>
            <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-[4px]">Management Console</p>
          </div>
        </div>
        <button onClick={() => router.push('/')} className="p-3 bg-white/5 rounded-xl text-zinc-500">
          <LogOut size={20} />
        </button>
      </div>

      {/* Notice Editor */}
      <div className="p-6 bg-[#0f0f12] border border-white/10 rounded-[35px] shadow-2xl mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Bell className="text-orange-400" size={18} />
          <h4 className="text-xs font-black uppercase tracking-widest text-white">Global Notice Board</h4>
        </div>
        
        <textarea 
          value={notice}
          onChange={(e) => setNotice(e.target.value)}
          placeholder="Enter news or alerts for students..."
          className="w-full h-32 bg-black/40 border border-white/5 rounded-2xl p-4 text-sm font-bold text-zinc-300 focus:border-blue-500/50 outline-none transition-all resize-none mb-4"
        />

        <button 
          onClick={handleUpdateNotice}
          className={`w-full py-4 rounded-2xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest transition-all shadow-lg active:scale-95
            ${saved ? 'bg-green-600 text-white' : 'bg-blue-600 text-white shadow-blue-900/20'}
          `}
        >
          {saved ? "Successfully Updated!" : <><Save size={16} /> Update Board</>}
        </button>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-6 bg-[#0f0f12] border border-white/10 rounded-[32px]">
          <Plus size={20} className="text-green-500 mb-3" />
          <h5 className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">New Study</h5>
          <p className="text-sm font-black text-white italic">Materials</p>
        </div>
        <div className="p-6 bg-[#0f0f12] border border-white/10 rounded-[32px]">
          <Users size={20} className="text-purple-500 mb-3" />
          <h5 className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Student</h5>
          <p className="text-sm font-black text-white italic">Ledger</p>
        </div>
      </div>
    </div>
  );
}
