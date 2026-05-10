'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Gamepad2, Trophy, Ghost, Zap, LayoutGrid } from 'lucide-react';

export default function ArcadeLobby() {
  const router = useRouter();

  return (
    <div className="min-h-screen pb-32 font-sans bg-[var(--background)] text-[var(--text)] px-5 pt-24 relative overflow-hidden">
      {/* Ambient Background */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[320px] h-[320px] rounded-full bg-violet-500/10 blur-[80px]" />
        <div className="absolute bottom-[10%] left-[-10%] w-[260px] h-[260px] rounded-full bg-fuchsia-500/10 blur-[80px]" />
      </div>

      {/* Back Button */}
      <button onClick={() => router.push('/dashboard')} className="flex items-center gap-1.5 mb-8 active:scale-95 transition-transform text-[10px] font-black tracking-[0.18em] uppercase text-zinc-500 hover:text-[var(--text)]">
        <ChevronLeft size={16} strokeWidth={3} /> Back to Dashboard
      </button>

      {/* Header */}
      <div className="mb-10">
        <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-5 shadow-[0_0_15px_rgba(139,92,246,0.2)]">
          <Gamepad2 size={28} className="text-violet-500" />
        </div>
        <h1 className="text-4xl font-black italic uppercase tracking-tighter leading-none mb-2">
          Altum <span className="text-violet-500 drop-shadow-[0_0_20px_rgba(139,92,246,0.4)]">Arcade</span>
        </h1>
        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
          Recharge your core • Mini Games
        </p>
      </div>

      {/* Games List */}
      <div className="space-y-4">
        
        {/* Hall of Fame Leaderboard Card */}
        <div onClick={() => router.push('/arcade/leaderboard')} className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 backdrop-blur-xl border border-yellow-500/30 rounded-[28px] p-5 flex items-center justify-between cursor-pointer active:scale-95 transition-all shadow-[0_0_20px_rgba(234,179,8,0.1)] hover:shadow-[0_0_25px_rgba(234,179,8,0.2)] group mb-2">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center border border-yellow-500/40 group-hover:scale-110 transition-transform shadow-inner">
              <Trophy size={24} className="text-yellow-500 drop-shadow-md" />
            </div>
            <div>
              <h3 className="text-lg font-black italic uppercase tracking-tight text-yellow-600 dark:text-yellow-500">Hall of Fame</h3>
              <p className="text-[9px] font-bold text-yellow-600/60 dark:text-yellow-500/60 uppercase tracking-widest mt-1">Global Leaderboards</p>
            </div>
          </div>
        </div>

        {/* Neon Snake Card */}
        <div onClick={() => router.push('/arcade/snake')} className="bg-[var(--card)]/80 backdrop-blur-xl border border-[var(--border)] border-l-4 border-l-emerald-500 rounded-[28px] p-5 flex items-center justify-between cursor-pointer active:scale-95 transition-all shadow-sm hover:shadow-emerald-500/10 group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 transition-transform">
              <Ghost size={24} className="text-emerald-500" />
            </div>
            <div>
              <h3 className="text-lg font-black italic uppercase tracking-tight text-[var(--text)]">Neon Snake</h3>
              <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Classic Retro Action</p>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <Zap size={14} />
          </div>
        </div>

        {/* Flappy Altu Card (UNLOCKED) */}
        <div onClick={() => router.push('/arcade/flappy')} className="bg-[var(--card)]/80 backdrop-blur-xl border border-[var(--border)] border-l-4 border-l-violet-500 rounded-[28px] p-5 flex items-center justify-between cursor-pointer active:scale-95 transition-all shadow-sm hover:shadow-violet-500/10 group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center border border-violet-500/20 group-hover:scale-110 transition-transform">
              <Gamepad2 size={24} className="text-violet-500" />
            </div>
            <div>
              <h3 className="text-lg font-black italic uppercase tracking-tight text-[var(--text)]">Flappy Altu</h3>
              <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Gravity Protocol</p>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-violet-500/10 flex items-center justify-center text-violet-500">
            <Zap size={14} />
          </div>
        </div>

        {/* 2048 Coming Soon Card */}
        <div className="bg-[var(--card)]/40 backdrop-blur-xl border border-dashed border-[var(--border)] rounded-[28px] p-5 flex items-center justify-between opacity-60">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-zinc-500/10 flex items-center justify-center border border-zinc-500/20">
              <LayoutGrid size={24} className="text-zinc-500" />
            </div>
            <div>
              <h3 className="text-lg font-black italic uppercase tracking-tight text-zinc-500">2048 Core</h3>
              <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Under Construction...</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
