'use client';
import React from 'react';
import { Camera, Calendar as CalIcon, BarChart3, User, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function Profile() {
  return (
    <div className="px-6 pt-28 pb-32 flex flex-col items-center">
      {/* Avatar Section with Outer Glow */}
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full" />
        <div className="relative w-28 h-28 bg-[#111111] border-2 border-white/10 rounded-[40px] flex items-center justify-center shadow-2xl backdrop-blur-xl">
          <User size={48} className="text-blue-500 drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
        </div>
        <button className="absolute bottom-0 right-0 p-2.5 bg-blue-600 rounded-2xl border-[3px] border-[#050508] shadow-lg active:scale-90 transition-all">
          <Camera size={16} className="text-white" />
        </button>
      </div>

      <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-1 text-white">Karan Sahani</h2>
      <p className="text-blue-500 text-[10px] font-black uppercase tracking-[4px] mb-12 opacity-80">ID: STU-7054</p>

      {/* Menu Links with Elevated Glass Style */}
      <div className="w-full space-y-5">
        
        <ProfileCard 
          href="/profile/attendance" 
          icon={<CalIcon size={22} className="text-orange-400" />} 
          title="Attendance Calendar" 
          subtitle="Check Consistency"
          glowColor="group-hover:shadow-orange-500/10"
        />

        <ProfileCard 
          href="/profile/performance" 
          icon={<BarChart3 size={22} className="text-blue-400" />} 
          title="Performance Ledger" 
          subtitle="Marks & Feedback"
          glowColor="group-hover:shadow-blue-500/10"
        />

      </div>
    </div>
  );
}

function ProfileCard({ href, icon, title, subtitle, glowColor }: any) {
  return (
    <Link href={href} className="block group active:scale-[0.97] transition-all duration-300">
      <div className={`relative p-5 bg-[#0f0f12] border border-white/[0.08] rounded-[32px] flex items-center justify-between shadow-xl overflow-hidden ${glowColor}`}>
        {/* Subtle Top "Rim Light" */}
        <div className="absolute top-0 left-10 right-10 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        
        <div className="flex items-center gap-5">
          <div className="p-4 bg-white/[0.03] border border-white/5 rounded-2xl shadow-inner">
            {icon}
          </div>
          <div>
            <h4 className="text-sm font-black uppercase tracking-wider text-zinc-100 group-hover:text-white transition-colors">{title}</h4>
            <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">{subtitle}</p>
          </div>
        </div>
        
        <div className="p-2 text-zinc-700 group-hover:text-zinc-400 transition-colors">
          <ChevronRight size={20} />
        </div>
      </div>
    </Link>
  );
}
