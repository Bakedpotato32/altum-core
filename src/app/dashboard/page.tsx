'use client';
import React, { useState, useEffect } from 'react';
import { Calendar, Star, ArrowUpRight, Zap } from 'lucide-react';

export default function Dashboard() {
  const [liveNotice, setLiveNotice] = useState("Loading updates...");

  // Load the notice from localStorage
  useEffect(() => {
    const savedNotice = localStorage.getItem('altum_notice');
    if (savedNotice) {
      setLiveNotice(savedNotice);
    } else {
      setLiveNotice("Welcome to Altum Core. No new notices today.");
    }
  }, []);

  return (
    <div className="px-6 pt-28">
      {/* Notice Board - Now Dynamic */}
      <div className="mb-8 relative p-6 bg-[#0f0f12] border border-white/10 backdrop-blur-xl rounded-[32px] shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <span className="text-[9px] font-black uppercase tracking-widest text-blue-500 bg-blue-500/10 px-3 py-1 rounded-full">Notice Board</span>
          <span className="text-[8px] font-bold text-zinc-600 tracking-tighter uppercase">Live Sync</span>
        </div>
        <p className="text-sm font-bold text-zinc-200 leading-relaxed italic uppercase">
          "{liveNotice}"
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-6 bg-[#0f0f12] border border-white/10 rounded-[32px] shadow-lg">
          <Calendar size={20} className="text-blue-500 mb-4" />
          <p className="text-[9px] font-black uppercase text-zinc-500 tracking-widest">Attendance</p>
          <div className="flex items-baseline gap-1 mt-1">
            <h4 className="text-2xl font-black italic text-white">92%</h4>
            <ArrowUpRight size={12} className="text-green-500" />
          </div>
        </div>
        <div className="p-6 bg-[#0f0f12] border border-white/10 rounded-[32px] shadow-lg">
          <Star size={20} className="text-orange-500 mb-4" />
          <p className="text-[9px] font-black uppercase text-zinc-500 tracking-widest">Core Rating</p>
          <h4 className="text-2xl font-black italic mt-1 text-white">88<span className="text-xs text-zinc-600">/100</span></h4>
        </div>
      </div>

      {/* Activity Card */}
      <div className="mt-4 p-6 bg-gradient-to-br from-blue-600 to-blue-800 rounded-[32px] relative overflow-hidden shadow-[0_20px_40px_rgba(37,99,235,0.25)]">
        <Zap size={80} className="absolute right-[-10px] bottom-[-10px] text-white/10 rotate-12" />
        <h3 className="text-lg font-black italic uppercase text-white mb-1">Daily Streak</h3>
        <p className="text-white/60 text-xs font-bold mb-4">You're on a 5 day roll!</p>
        <button className="px-6 py-2 bg-white text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all">Keep Going</button>
      </div>
    </div>
  );
}
