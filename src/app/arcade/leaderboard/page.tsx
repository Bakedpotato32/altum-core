'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, Trophy, Medal, Crown, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { SnakeLogo, FlappyLogo, TetrisLogo, DashLogo, BreakoutLogo, SpaceLogo } from '@/components/ArcadeIcons';

const ARCADE_GAMES = [
  { id: 'snake', name: 'Snake', icon: SnakeLogo, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', glow: 'shadow-[0_0_15px_rgba(16,185,129,0.2)]' },
  { id: 'flappy', name: 'Flappy', icon: FlappyLogo, color: 'text-violet-500', bg: 'bg-violet-500/10', border: 'border-violet-500/30', glow: 'shadow-[0_0_15px_rgba(139,92,246,0.2)]' },
  { id: 'tetris', name: 'Tetris', icon: TetrisLogo, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/30', glow: 'shadow-[0_0_15px_rgba(59,130,246,0.2)]' },
  { id: 'dino', name: 'Dash', icon: DashLogo, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/30', glow: 'shadow-[0_0_15px_rgba(245,158,11,0.2)]' },
  { id: 'breakout', name: 'Breakout', icon: BreakoutLogo, color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/30', glow: 'shadow-[0_0_15px_rgba(244,63,94,0.2)]' },
  { id: 'space', name: 'Space', icon: SpaceLogo, color: 'text-cyan-400', bg: 'bg-cyan-400/10', border: 'border-cyan-400/30', glow: 'shadow-[0_0_15px_rgba(34,211,238,0.2)]' },
];

export default function ArcadeLeaderboard() {
  const router = useRouter();
  const [isFetching, setIsFetching] = useState(true);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('snake');

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setIsFetching(true); 
      const [{ data: scores }, { data: students }] = await Promise.all([
        supabase.from('arcade_scores').select('*').eq('game_name', activeTab),
        supabase.from('students').select('id, name, class, avatar_url')
      ]);

      if (scores && students) {
        const bestScoresMap = new Map();
        scores.forEach(s => {
          if (!bestScoresMap.has(s.student_id) || bestScoresMap.get(s.student_id).score < s.score) {
            bestScoresMap.set(s.student_id, s);
          }
        });

        const uniqueScores = Array.from(bestScoresMap.values());
        const mergedData = uniqueScores.map(score => {
          const student = students.find(s => s.id === score.student_id);
          return {
            ...score,
            student_name: student ? student.name : 'Unknown Player',
            student_class: student ? student.class : 'N/A',
            avatar_url: student ? student.avatar_url : null
          };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
        setLeaderboard(mergedData);
      }
      setIsFetching(false);
    };
    fetchLeaderboard();
  }, [activeTab]); 

  const activeGameInfo = ARCADE_GAMES.find(g => g.id === activeTab) || ARCADE_GAMES[0];

  return (
    <div className="min-h-screen pb-40 font-sans bg-[var(--background)] text-[var(--text)] px-5 pt-20 relative overflow-hidden">
      <div className="fixed inset-0 -z-10 pointer-events-none transition-colors duration-700 ease-in-out">
        <div className={`absolute top-[-10%] right-[-10%] w-[320px] h-[320px] rounded-full ${activeTab === 'snake' ? 'bg-emerald-500/10' : activeTab === 'flappy' ? 'bg-violet-500/10' : activeTab === 'tetris' ? 'bg-blue-500/10' : activeTab === 'space' ? 'bg-cyan-400/10' : 'bg-amber-500/10'} blur-[80px]`} />
      </div>

      <button onClick={() => router.back()} className="flex items-center gap-1.5 mb-6 active:scale-95 transition-transform text-[10px] font-black tracking-[0.18em] uppercase text-zinc-500 hover:text-[var(--text)]">
        <ChevronLeft size={16} strokeWidth={3} /> Arcade Lobby
      </button>

      <div className="mb-8 text-center flex flex-col items-center">
        <div className="w-16 h-16 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(234,179,8,0.2)] relative">
          <Crown size={32} className="text-yellow-500 drop-shadow-md" />
        </div>
        <h1 className="text-4xl font-black italic uppercase tracking-tighter leading-none mb-2 text-yellow-500 drop-shadow-[0_0_15px_rgba(234,179,8,0.4)]">
          Hall of Fame
        </h1>
        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Global Rankings</p>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-4 mb-2 hide-scrollbar">
        {ARCADE_GAMES.map((game) => {
          const isActive = activeTab === game.id;
          const Icon = game.icon;
          return (
            <button
              key={game.id}
              onClick={() => setActiveTab(game.id)}
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black italic uppercase tracking-widest text-[10px] transition-all duration-300 ease-out whitespace-nowrap border ${
                isActive 
                ? `${game.bg} ${game.border} ${game.color} ${game.glow}` 
                : 'bg-[var(--card)] border-[var(--border)] text-zinc-500 hover:bg-zinc-500/5 hover:text-zinc-400'
              }`}
            >
              <Icon className="w-4 h-4" /> {game.name}
            </button>
          );
        })}
      </div>

      <div className="min-h-[400px] relative">
        <div className={`transition-opacity duration-300 ${isFetching ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
          {leaderboard.length === 0 && !isFetching ? (
            <div className="text-center py-16 bg-[var(--card)]/40 border border-dashed border-[var(--border)] rounded-3xl mt-2">
              <activeGameInfo.icon className={`w-10 h-10 mx-auto mb-3 opacity-30 ${activeGameInfo.color}`} />
              <p className="text-xs font-black uppercase tracking-widest text-zinc-500 opacity-60">No scores posted yet.</p>
            </div>
          ) : (
            <div className="space-y-3 mt-2">
              {leaderboard.map((entry, index) => (
                <div key={index} className={`bg-[var(--card)]/80 backdrop-blur-xl border rounded-[24px] p-3 flex items-center justify-between shadow-sm transition-all duration-300 ${index === 0 ? `border-yellow-500/40 shadow-[0_0_15px_rgba(234,179,8,0.15)] bg-gradient-to-r from-[var(--card)] to-yellow-500/5` : index === 1 ? 'border-zinc-300/40 dark:border-zinc-500/40' : index === 2 ? 'border-amber-700/40' : 'border-[var(--border)]'}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 flex justify-center font-black italic text-lg shrink-0">
                      {index === 0 ? <Medal size={24} className="text-yellow-500" /> : 
                       index === 1 ? <Medal size={24} className="text-zinc-400" /> : 
                       index === 2 ? <Medal size={24} className="text-amber-700" /> : 
                       <span className="text-zinc-500 text-sm">#{index + 1}</span>}
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-[var(--border)] flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                      {entry.avatar_url ? (
                        <img src={entry.avatar_url} alt={entry.student_name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-sm font-black italic text-zinc-500">{entry.student_name[0]}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className={`text-sm font-black italic uppercase tracking-tight leading-none truncate ${index === 0 ? 'text-yellow-600 dark:text-yellow-500' : 'text-[var(--text)]'}`}>
                        {entry.student_name}
                      </h3>
                      <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest mt-1 truncate">Class {entry.student_class}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 pl-2">
                    <span className={`text-2xl font-black italic tracking-tighter ${index === 0 ? 'text-yellow-500' : activeGameInfo.color}`}>
                      {entry.score}
                    </span>
                    <p className="text-[7px] font-black text-zinc-500 uppercase tracking-widest">Points</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {isFetching && (
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
            <Loader2 size={28} className={`animate-spin ${activeGameInfo.color} drop-shadow-lg`} />
          </div>
        )}
      </div>
    </div>
  );
}
