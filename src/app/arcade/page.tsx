'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Trophy, Zap, Gamepad2 } from 'lucide-react';
import { 
  SnakeLogo, FlappyLogo, TetrisLogo, DashLogo, BreakoutLogo, SpaceLogo,
  TowerLogo, CrossyLogo, DefenderLogo, CombatLogo, RunnerLogo, SlicerLogo 
} from '@/components/ArcadeIcons';

export default function ArcadeLobby() {
  const router = useRouter();

  const GAMES = [
    // Phase 1 Games
    { id: 'snake', name: 'Neon Snake', sub: 'Classic Retro Action', color: 'text-emerald-500', Icon: SnakeLogo },
    { id: 'flappy', name: 'Flappy Altu', sub: 'Gravity Protocol', color: 'text-violet-500', Icon: FlappyLogo },
    { id: 'tetris', name: 'Tetris Core', sub: 'Geometric Alignment', color: 'text-blue-500', Icon: TetrisLogo },
    { id: 'dino', name: 'Altu Dash', sub: 'Infinite Runner', color: 'text-amber-500', Icon: DashLogo },
    { id: 'breakout', name: 'Neon Breakout', sub: 'Reflex Protocol', color: 'text-rose-500', Icon: BreakoutLogo },
    { id: 'space', name: 'Starship Altu', sub: 'Bullet Hell Protocol', color: 'text-cyan-400', Icon: SpaceLogo },
    
    // Phase 2 Games
    { id: 'tower', name: 'Neon Tower', sub: 'Precision Stacking', color: 'text-yellow-400', Icon: TowerLogo },
    { id: 'crossy', name: 'Crossy Altu', sub: 'Isometric Survival', color: 'text-teal-400', Icon: CrossyLogo },
    { id: 'defender', name: 'Core Defender', sub: 'Tactical Defense', color: 'text-indigo-400', Icon: DefenderLogo },
    { id: 'combat', name: 'Vector Combat', sub: 'Top-Down Shooter', color: 'text-red-500', Icon: CombatLogo },
    { id: 'runner', name: 'Synth Runner', sub: '3D Speed Protocol', color: 'text-fuchsia-400', Icon: RunnerLogo },
    { id: 'slicer', name: 'Fruit Slicer', sub: 'Kinetic Slashing', color: 'text-orange-500', Icon: SlicerLogo },
  ];

  return (
    <div className="min-h-screen pb-32 font-sans bg-[var(--background)] text-[var(--text)] px-5 pt-24 relative overflow-hidden">
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[320px] h-[320px] rounded-full bg-violet-500/10 blur-[80px]" />
        <div className="absolute bottom-[10%] left-[-10%] w-[260px] h-[260px] rounded-full bg-fuchsia-500/10 blur-[80px]" />
      </div>

      <button onClick={() => router.push('/dashboard')} className="flex items-center gap-1.5 mb-8 active:scale-95 transition-transform text-[10px] font-black tracking-[0.18em] uppercase text-zinc-500 hover:text-[var(--text)]">
        <ChevronLeft size={16} strokeWidth={3} /> Back to Dashboard
      </button>

      <div className="mb-10">
        <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-5 shadow-[0_0_15px_rgba(139,92,246,0.2)]">
          <Gamepad2 size={28} className="text-violet-500" />
        </div>
        <h1 className="text-4xl font-black italic uppercase tracking-tighter leading-none mb-2">
          Altum <span className="text-violet-500 drop-shadow-[0_0_20px_rgba(139,92,246,0.4)]">Arcade</span>
        </h1>
      </div>

      <div className="space-y-4">
        <div onClick={() => router.push('/arcade/leaderboard')} className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-[28px] p-5 flex items-center justify-between cursor-pointer active:scale-95 transition-all group mb-2">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center border border-yellow-500/40">
              <Trophy size={24} className="text-yellow-500" />
            </div>
            <div>
              <h3 className="text-lg font-black italic uppercase tracking-tight text-yellow-600 dark:text-yellow-500">Hall of Fame</h3>
              <p className="text-[9px] font-bold text-yellow-600/60 dark:text-yellow-500/60 uppercase tracking-widest mt-1">Global Rankings</p>
            </div>
          </div>
        </div>

        {GAMES.map((game) => (
          <div key={game.id} onClick={() => router.push(`/arcade/${game.id}`)} className="bg-[var(--card)]/80 backdrop-blur-xl border border-[var(--border)] border-l-4 rounded-[28px] p-5 flex items-center justify-between cursor-pointer active:scale-95 transition-all group" style={{ borderLeftColor: `currentColor` }}>
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl bg-zinc-500/5 flex items-center justify-center border border-[var(--border)] group-hover:scale-110 transition-transform ${game.color}`}>
                <game.Icon className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-black italic uppercase tracking-tight text-[var(--text)]">{game.name}</h3>
                <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mt-1">{game.sub}</p>
              </div>
            </div>
            <Zap size={14} className={`${game.color} opacity-30`} />
          </div>
        ))}
      </div>
    </div>
  );
}
