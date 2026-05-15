'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Trophy, Crown, Loader2, Medal } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { 
  SnakeLogo, FlappyLogo, TetrisLogo, DashLogo, BreakoutLogo, SpaceLogo,
  TowerLogo, CrossyLogo, DefenderLogo, CombatLogo, RunnerLogo, SlicerLogo 
} from '@/components/ArcadeIcons';

// Upgraded ARCADE_GAMES with the vivid gradients matching the Arcade Lobby
const ARCADE_GAMES = [
  { id: 'snake', name: 'Snake', icon: SnakeLogo, color: '#10b981', gradient: 'linear-gradient(135deg, #10b981, #047857)' },
  { id: 'flappy', name: 'Flappy', icon: FlappyLogo, color: '#8b5cf6', gradient: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' },
  { id: 'tetris', name: 'Tetris', icon: TetrisLogo, color: '#3b82f6', gradient: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' },
  { id: 'dino', name: 'Dash', icon: DashLogo, color: '#f59e0b', gradient: 'linear-gradient(135deg, #f59e0b, #b45309)' },
  { id: 'breakout', name: 'Breakout', icon: BreakoutLogo, color: '#f43f5e', gradient: 'linear-gradient(135deg, #f43f5e, #be123c)' },
  { id: 'space', name: 'Space', icon: SpaceLogo, color: '#06b6d4', gradient: 'linear-gradient(135deg, #06b6d4, #0369a1)' },
  { id: 'tower', name: 'Tower', icon: TowerLogo, color: '#eab308', gradient: 'linear-gradient(135deg, #eab308, #a16207)' },
  { id: 'crossy', name: 'Crossy', icon: CrossyLogo, color: '#14b8a6', gradient: 'linear-gradient(135deg, #14b8a6, #0f766e)' },
  { id: 'defender', name: 'Defender', icon: DefenderLogo, color: '#6366f1', gradient: 'linear-gradient(135deg, #6366f1, #4338ca)' },
  { id: 'combat', name: 'Combat', icon: CombatLogo, color: '#ef4444', gradient: 'linear-gradient(135deg, #ef4444, #b91c1c)' },
  { id: 'runner', name: 'Runner', icon: RunnerLogo, color: '#d946ef', gradient: 'linear-gradient(135deg, #d946ef, #a21caf)' },
  { id: 'slicer', name: 'Slicer', icon: SlicerLogo, color: '#f97316', gradient: 'linear-gradient(135deg, #f97316, #c2410c)' },
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
    <div style={{ 
      padding: '40px 20px 120px', 
      maxWidth: '500px', 
      margin: '0 auto', 
      display: 'flex', 
      flexDirection: 'column', 
      background: '#fff', 
      minHeight: '100svh' 
    }}>
      
      {/* Hide Scrollbar Style */}
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <button 
          onClick={() => router.push('/arcade')}
          style={{
            width: '48px', 
            height: '48px', 
            borderRadius: '16px', 
            background: '#f8fafc',
            border: '2px solid #f1f5f9', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            cursor: 'pointer', 
            flexShrink: 0,
            transition: 'all 0.2s ease'
          }}
          onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
          onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <ChevronLeft size={26} color="#334155" strokeWidth={2.5} />
        </button>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
            <Trophy size={14} color="#f59e0b" strokeWidth={3} />
            <p style={{ margin: 0, fontSize: '11px', fontWeight: 900, color: '#f59e0b', letterSpacing: '1px', textTransform: 'uppercase' }}>
              GLOBAL RANKINGS
            </p>
          </div>
          <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: '#0f172a', lineHeight: 1 }}>
            Hall of <span style={{ color: '#f59e0b' }}>Fame</span>
          </h1>
        </div>
      </div>

      {/* Game Selection Horizontal Menu */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '16px', marginBottom: '12px' }} className="hide-scrollbar">
        {ARCADE_GAMES.map((game) => {
          const isActive = activeTab === game.id;
          const Icon = game.icon;
          return (
            <motion.button
              key={game.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveTab(game.id)}
              style={{
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 20px',
                borderRadius: '18px',
                background: isActive ? game.gradient : '#f8fafc',
                border: isActive ? 'none' : '1px solid #e2e8f0',
                color: isActive ? '#fff' : '#64748b',
                cursor: 'pointer',
                boxShadow: isActive ? `0 8px 20px ${game.color}40` : 'none',
                transition: 'all 0.3s ease'
              }}
            >
              {/* Ensure Icon renders properly (some icons might expect a stroke/fill via className, so forcing color works nicely) */}
              <div style={{ width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isActive ? '#fff' : game.color }}>
                <Icon className="w-full h-full" />
              </div>
              <span style={{ fontSize: '12px', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {game.name}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Content Area */}
      <div style={{ position: 'relative', minHeight: '400px' }}>
        {isFetching ? (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: '16px' }}>
            <Loader2 className="animate-spin" size={32} color={activeGameInfo.color} />
            <p style={{ margin: 0, fontSize: '10px', fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', color: activeGameInfo.color }}>
              Fetching Scores
            </p>
          </div>
        ) : leaderboard.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', gap: '16px', background: '#f8fafc', border: '2px dashed #cbd5e1', borderRadius: '32px' }}>
            <div style={{ width: '48px', height: '48px', opacity: 0.3, color: '#94a3b8' }}>
              <activeGameInfo.icon className="w-full h-full" />
            </div>
            <p style={{ margin: 0, fontSize: '12px', fontWeight: 900, letterSpacing: '1px', textTransform: 'uppercase', color: '#94a3b8', textAlign: 'center' }}>
              No scores posted yet.
            </p>
          </motion.div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <AnimatePresence>
              {leaderboard.map((entry, index) => {
                const isFirst = index === 0;
                const isSecond = index === 1;
                const isThird = index === 2;
                const isTop3 = index < 3;

                // Styling logic for different ranks matching the global Leaderboard
                let cardBackground = '#f8fafc';
                let cardBorder = '1px solid #e2e8f0';
                let textColor = '#0f172a';
                let subTextColor = '#64748b';
                let watermark = '';
                let scoreColor = activeGameInfo.color;

                if (isFirst) {
                  cardBackground = 'linear-gradient(135deg, #f09819, #edde5d)';
                  cardBorder = 'none';
                  textColor = '#fff';
                  subTextColor = 'rgba(255,255,255,0.8)';
                  scoreColor = '#fff';
                  watermark = '🥇';
                } else if (isSecond) {
                  cardBackground = 'linear-gradient(135deg, #94a3b8, #cbd5e1)';
                  cardBorder = 'none';
                  textColor = '#fff';
                  subTextColor = 'rgba(255,255,255,0.8)';
                  scoreColor = '#fff';
                  watermark = '🥈';
                } else if (isThird) {
                  cardBackground = 'linear-gradient(135deg, #f97316, #fb923c)';
                  cardBorder = 'none';
                  textColor = '#fff';
                  subTextColor = 'rgba(255,255,255,0.8)';
                  scoreColor = '#fff';
                  watermark = '🥉';
                }

                return (
                  <motion.div
                    key={`${activeTab}-${index}-${entry.student_id}`}
                    initial={{ opacity: 0, y: 15, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: index * 0.08, duration: 0.4, type: 'spring', damping: 20 }}
                    style={{ 
                      position: 'relative', 
                      background: cardBackground, 
                      border: cardBorder, 
                      borderRadius: '24px', 
                      padding: isFirst ? '20px' : '14px 18px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '16px', 
                      overflow: 'hidden',
                      boxShadow: isFirst ? '0 15px 35px rgba(240, 152, 25, 0.3)' : isSecond ? '0 10px 25px rgba(148, 163, 184, 0.3)' : isThird ? '0 10px 25px rgba(249, 115, 22, 0.3)' : '0 4px 12px rgba(0,0,0,0.02)'
                    }}
                  >
                    {/* Background Watermark for Top 3 */}
                    {isTop3 && (
                      <span style={{ position: 'absolute', right: '-10px', top: '50%', transform: 'translateY(-50%)', fontSize: isFirst ? '90px' : '70px', opacity: 0.15, pointerEvents: 'none' }}>
                        {watermark}
                      </span>
                    )}

                    {/* Rank Icon / Number */}
                    <div style={{ width: '32px', display: 'flex', justifyContent: 'center', flexShrink: 0, zIndex: 1 }}>
                      {isFirst ? (
                        <Crown size={28} color="#fff" fill="rgba(255,255,255,0.5)" />
                      ) : isSecond ? (
                        <Medal size={24} color="#fff" />
                      ) : isThird ? (
                        <Medal size={24} color="#fff" />
                      ) : (
                        <span style={{ fontSize: '16px', fontWeight: 900, fontStyle: 'italic', color: '#94a3b8' }}>#{index + 1}</span>
                      )}
                    </div>

                    {/* Avatar */}
                    <div style={{ flexShrink: 0, zIndex: 1, position: 'relative' }}>
                      <div style={{ 
                        width: isFirst ? '56px' : '46px', 
                        height: isFirst ? '56px' : '46px', 
                        borderRadius: '16px', 
                        padding: '3px', 
                        background: isTop3 ? 'rgba(255,255,255,0.3)' : '#e2e8f0',
                        backdropFilter: 'blur(5px)'
                      }}>
                        <div style={{ width: '100%', height: '100%', borderRadius: '12px', overflow: 'hidden', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {entry.avatar_url ? (
                            <img src={entry.avatar_url} alt={entry.student_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <span style={{ fontSize: isFirst ? '22px' : '18px', fontWeight: 900, fontStyle: 'italic', color: isTop3 ? '#f59e0b' : '#64748b' }}>
                              {entry.student_name[0]}
                            </span>
                          )}
                        </div>
                      </div>
                      {isFirst && <div style={{ position: 'absolute', inset: 0, borderRadius: '16px', border: '2px solid rgba(255,255,255,0.8)' }} className="animate-ping pointer-events-none" />}
                    </div>

                    {/* Name and Class */}
                    <div style={{ flex: 1, minWidth: 0, zIndex: 1 }}>
                      <h3 style={{ margin: 0, fontSize: isFirst ? '20px' : '16px', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: textColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {entry.student_name.split(' ')[0]}
                      </h3>
                      <p style={{ margin: '2px 0 0 0', fontSize: '9px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: subTextColor }}>
                        CLASS {entry.student_class}
                      </p>
                    </div>

                    {/* Score */}
                    <div style={{ textAlign: 'right', flexShrink: 0, zIndex: 1 }}>
                      <span style={{ fontSize: isFirst ? '32px' : '24px', fontWeight: 900, fontStyle: 'italic', lineHeight: 1, color: scoreColor }}>
                        {entry.score}
                      </span>
                      <p style={{ margin: '2px 0 0 0', fontSize: '8px', fontWeight: 900, color: subTextColor, textTransform: 'uppercase', letterSpacing: '1px' }}>
                        Points
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
