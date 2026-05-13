'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Gamepad2, Trophy, Loader2, Trash2, Users, AlertOctagon, ChevronDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const ARCADE_GAMES = [
  { id: 'snake', name: 'Neon Snake' },
  { id: 'flappy', name: 'Flappy Altu' },
  { id: 'tetris', name: 'Tetris Core' },
  { id: 'dino', name: 'Altu Dash' },
  { id: 'breakout', name: 'Neon Breakout' },
  { id: 'space', name: 'Starship Altu' },
  { id: 'tower', name: 'Neon Tower' },
  { id: 'crossy', name: 'Crossy Altu' },
  { id: 'defender', name: 'Core Defender' },
  { id: 'combat', name: 'Vector Combat' },
  { id: 'runner', name: 'Synth Runner' },
  { id: 'slicer', name: 'Fruit Slicer' },
];

export default function ArcadeAdmin() {
  const router = useRouter();
  const [selectedGame, setSelectedGame] = useState('snake');
  const [scores, setScores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Wipe States
  const [isWipingAll, setIsWipingAll] = useState(false);
  const [wipeClassId, setWipeClassId] = useState('');
  const [isWipingClass, setIsWipingClass] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    const role = localStorage.getItem('role');
    if (role !== 'principal') {
      router.push('/dashboard');
    }
  }, [router]);

  const fetchScores = async () => {
    setLoading(true);
    try {
      const { data: scoreData } = await supabase
        .from('arcade_scores')
        .select('*')
        .eq('game_name', selectedGame)
        .order('score', { ascending: false });

      if (!scoreData || scoreData.length === 0) {
        setScores([]);
        setLoading(false);
        return;
      }

      const studentIds = [...new Set(scoreData.map(s => s.student_id))];
      const { data: students } = await supabase
        .from('students')
        .select('id, name, class')
        .in('id', studentIds);

      const merged = scoreData.map(score => {
        const student = students?.find(s => s.id === score.student_id);
        return {
          ...score,
          student_name: student ? student.name : 'Unknown',
          student_class: student ? student.class : '—'
        };
      });

      setScores(merged);
    } catch (err) {
      console.error("Error fetching scores:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScores();
  }, [selectedGame]);

  // ACTION: Delete Single Score
  const deleteSingleScore = async (id: number) => {
    if (!window.confirm("Delete this individual score?")) return;
    setDeletingId(id);
    try {
      await supabase.from('arcade_scores').delete().eq('id', id);
      setScores(prev => prev.filter(s => s.id !== id));
    } catch (error) {
      console.error("Error deleting:", error);
    } finally {
      setDeletingId(null);
    }
  };

  // ACTION: Wipe by Class
  const wipeByClass = async () => {
    if (!wipeClassId.trim()) return;
    const confirm = window.confirm(`Delete all ${ARCADE_GAMES.find(g => g.id === selectedGame)?.name} scores for Class ${wipeClassId}?`);
    if (!confirm) return;

    setIsWipingClass(true);
    try {
      // 1. Find all students in that class
      const { data: classStudents } = await supabase
        .from('students')
        .select('id')
        .eq('class', wipeClassId.trim().toUpperCase());

      if (!classStudents || classStudents.length === 0) {
        alert("No students found in that class.");
        setIsWipingClass(false);
        return;
      }

      const idsToDelete = classStudents.map(s => s.id);

      // 2. Delete their scores for this specific game
      await supabase
        .from('arcade_scores')
        .delete()
        .eq('game_name', selectedGame)
        .in('student_id', idsToDelete);

      // Refresh list
      fetchScores();
      setWipeClassId('');
    } catch (error) {
      console.error("Error wiping class:", error);
    } finally {
      setIsWipingClass(false);
    }
  };

  // ACTION: Nuke Everything
  const wipeAllScores = async () => {
    const gameName = ARCADE_GAMES.find(g => g.id === selectedGame)?.name;
    const confirm = window.confirm(`DANGER: Wipe ALL scores globally for ${gameName}? This cannot be undone.`);
    if (!confirm) return;

    setIsWipingAll(true);
    try {
      await supabase.from('arcade_scores').delete().eq('game_name', selectedGame);
      setScores([]);
    } catch (error) {
      console.error("Error wiping all:", error);
    } finally {
      setIsWipingAll(false);
    }
  };

  return (
    <div className="min-h-screen pb-32 font-sans bg-background text-text px-5 pt-24 relative overflow-hidden">
      
      <button onClick={() => router.back()} className="flex items-center gap-1.5 mb-8 active:scale-95 transition-transform text-[10px] font-black tracking-[0.18em] uppercase text-zinc-500 hover:text-text">
        <ChevronLeft size={16} strokeWidth={3} /> Back to Admin
      </button>

      <div className="mb-8">
        <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mb-5 shadow-sm">
          <Gamepad2 size={28} className="text-orange-500" />
        </div>
        <h1 className="text-3xl font-black uppercase tracking-tighter leading-none mb-2">
          Arcade <span className="text-orange-500">Control</span>
        </h1>
        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Master Leaderboard Management</p>
      </div>

      {/* Control Panel */}
      <div className="bg-card border border-border rounded-3xl p-5 mb-8 shadow-sm">
        <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-2 block ml-1">Target Databank</label>
        <div className="relative mb-6">
          <select
            value={selectedGame}
            onChange={(e) => setSelectedGame(e.target.value)}
            className="w-full appearance-none bg-background border border-border rounded-xl px-4 py-3.5 text-sm font-black text-text uppercase tracking-wider outline-none focus:border-orange-500 focus:ring-[3px] focus:ring-orange-500/20 transition-all shadow-sm cursor-pointer"
          >
            {ARCADE_GAMES.map(game => (
              <option key={game.id} value={game.id}>{game.name}</option>
            ))}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
            <ChevronDown size={16} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Wipe By Class */}
          <div className="flex items-center gap-2">
            <input 
              type="text" 
              placeholder="CLASS (e.g. BATCH-1)" 
              value={wipeClassId}
              onChange={(e) => setWipeClassId(e.target.value)}
              className="flex-1 bg-background border border-border rounded-xl px-4 py-3 text-xs font-bold text-text uppercase tracking-widest outline-none focus:border-orange-500 placeholder:text-zinc-500"
            />
            <button 
              onClick={wipeByClass}
              disabled={isWipingClass || !wipeClassId.trim()}
              className="px-4 py-3 bg-card border border-border text-red-500 rounded-xl hover:bg-red-500/10 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center"
            >
              {isWipingClass ? <Loader2 size={16} className="animate-spin" /> : <Users size={16} />}
            </button>
          </div>

          {/* Wipe All */}
          <button 
            onClick={wipeAllScores}
            disabled={isWipingAll || scores.length === 0}
            className="w-full py-3 bg-red-500 text-white rounded-xl flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20 active:scale-95 transition-all disabled:opacity-50"
          >
            {isWipingAll ? <Loader2 size={16} className="animate-spin" /> : <AlertOctagon size={16} />}
            Nuke Leaderboard
          </button>
        </div>
      </div>

      {/* Score List */}
      <h2 className="text-xs font-black text-zinc-500 uppercase tracking-[3px] mb-4 ml-2">Registered Scores</h2>
      
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-zinc-500">
          <Loader2 size={24} className="animate-spin text-orange-500" />
          <p className="text-[10px] font-black uppercase tracking-widest">Accessing Databank...</p>
        </div>
      ) : scores.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-zinc-400 bg-card border border-dashed border-border rounded-3xl">
          <Trophy size={32} />
          <p className="text-[10px] font-black uppercase tracking-widest">No scores found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {scores.map((score, idx) => (
            <div key={score.id} className="flex items-center justify-between p-4 bg-card border border-border rounded-2xl shadow-sm group">
              <div className="flex items-center gap-4">
                <span className={`text-lg font-black italic w-6 text-center ${idx === 0 ? 'text-yellow-500' : idx === 1 ? 'text-zinc-400' : idx === 2 ? 'text-amber-600' : 'text-zinc-500'}`}>
                  #{idx + 1}
                </span>
                <div>
                  <p className="text-sm font-black text-text capitalize">{score.student_name}</p>
                  <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">{score.student_id} • Class {score.student_class}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-lg font-black italic text-orange-500">{score.score}</p>
                  <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">{new Date(score.created_at).toLocaleDateString()}</p>
                </div>
                
                {/* Delete Individual Score Button */}
                <button 
                  onClick={() => deleteSingleScore(score.id)}
                  disabled={deletingId === score.id}
                  className="p-2.5 bg-background border border-border text-zinc-500 rounded-xl hover:text-red-500 hover:border-red-500/30 hover:bg-red-500/10 active:scale-90 transition-all"
                >
                  {deletingId === score.id ? <Loader2 size={16} className="animate-spin text-red-500" /> : <Trash2 size={16} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
