'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { BookOpen, ChevronRight, Zap, ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/LanguageContext';

export default function StudentPerformance() {
  const router = useRouter();
  const { t } = useLanguage();
  const [scores, setScores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentId, setStudentId] = useState("");

  useEffect(() => {
    async function fetchData() {
      const activeId = localStorage.getItem('studentId');
      if (!activeId) return;
      setStudentId(activeId);
      const { data } = await supabase
        .from('test_scores')
        .select('*')
        .eq('student_id', activeId)
        .order('test_date', { ascending: false });
      if (data) setScores(data);
      setLoading(false);
    }
    fetchData();
  }, []);

  const totalObtained = scores.reduce((acc, curr) => acc + Number(curr.marks_obtained), 0);
  const totalPossible = scores.reduce((acc, curr) => acc + Number(curr.total_marks), 0);
  const avg = totalPossible > 0 ? Math.round((totalObtained / totalPossible) * 100) : 0;

  const getScoreAccent = (pct: number) => {
    if (pct >= 80) return { color: '#10b981', bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.25)', glow: 'rgba(16,185,129,0.3)' };
    if (pct >= 60) return { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',  border: 'rgba(59,130,246,0.25)', glow: 'rgba(59,130,246,0.3)' };
    if (pct >= 40) return { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.25)', glow: 'rgba(245,158,11,0.3)' };
    return              { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',    border: 'rgba(239,68,68,0.25)',  glow: 'rgba(239,68,68,0.3)'  };
  };

  const avgAccent = getScoreAccent(avg);

  return (
    <div className="min-h-screen pb-32 font-sans bg-background text-text">
      {/* Ambient orbs */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-[8%] -right-[10%] w-80 h-80 rounded-full blur-[60px] transition-all duration-500"
          style={{ background: `radial-gradient(circle, ${avgAccent.glow.replace('0.3','0.08')} 0%, transparent 70%)` }}
        />
        <div className="absolute bottom-[15%] -left-[10%] w-64 h-64 rounded-full bg-blue-500/5 blur-[60px]" />
      </div>

      <div className="max-w-md mx-auto px-5 pt-24">
        {/* Back button */}
        <button
          onClick={() => router.push('/profile')}
          className="flex items-center gap-1.5 mb-10 text-[10px] font-extrabold tracking-[0.18em] uppercase text-text/40 transition-all duration-200 active:scale-95 hover:opacity-80"
        >
          <ChevronLeft size={15} strokeWidth={3} /> {t('profile')}
        </button>

        {/* Aggregate Hero Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="relative rounded-3xl p-6 mb-4 overflow-hidden transition-all duration-300 hover:shadow-xl"
          style={{
            background: `linear-gradient(135deg, ${avgAccent.bg} 0%, var(--card) 100%)`,
            border: `1px solid ${avgAccent.border}`,
            boxShadow: `0 16px 48px ${avgAccent.glow}`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
          <div className="absolute -right-3 -bottom-5 text-8xl font-black italic opacity-[0.06] pointer-events-none select-none" style={{ color: avgAccent.color }}>
            {avg}%
          </div>
          <div className="relative z-10">
            <p className="text-[9px] font-black tracking-[0.25em] uppercase mb-1.5" style={{ color: avgAccent.color, opacity: 0.8 }}>
              {t('aggregateScore')}
            </p>
            <div className="flex items-end justify-between mb-4">
              <span className="text-6xl font-black italic tracking-[-0.04em] leading-[0.9]" style={{ color: avgAccent.color, textShadow: `0 0 30px ${avgAccent.glow}` }}>
                {avg}%
              </span>
              <div className="text-right pb-1">
                <p className="text-[8px] font-black tracking-[0.2em] uppercase text-text/30 mb-1">{t('status')}</p>
                <p className="text-xs font-black italic uppercase tracking-[-0.01em] text-text">{t('activeLedger')}</p>
              </div>
            </div>

            <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${avg}%` }}
                transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
                className="h-full rounded-full"
                style={{ background: `linear-gradient(90deg, ${avgAccent.color}, ${avgAccent.color}bb)`, boxShadow: `0 0 10px ${avgAccent.glow}` }}
              />
            </div>

            <div className="flex gap-4 mt-3.5">
              <div>
                <p className="text-sm font-black italic tracking-[-0.02em] text-text">{totalObtained}</p>
                <p className="text-[8px] font-black tracking-[0.15em] uppercase text-text/30">Obtained</p>
              </div>
              <div className="w-px bg-border self-stretch" />
              <div>
                <p className="text-sm font-black italic tracking-[-0.02em] text-text">{totalPossible}</p>
                <p className="text-[8px] font-black tracking-[0.15em] uppercase text-text/30">Total</p>
              </div>
              <div className="w-px bg-border self-stretch" />
              <div>
                <p className="text-sm font-black italic tracking-[-0.02em] text-text">{scores.length}</p>
                <p className="text-[8px] font-black tracking-[0.15em] uppercase text-text/30">Tests</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Recent Tests label */}
        <p className="text-[9px] font-black tracking-[0.25em] uppercase text-text/30 mb-3.5 pl-1">
          {t('recentTests')}
        </p>

        {/* Score Cards */}
        {loading ? (
          <div className="flex flex-col gap-2.5">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse h-[76px] rounded-2xl bg-card" />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2.5 mb-5">
            {scores.map((score, index) => {
              const pct = Math.round((score.marks_obtained / score.total_marks) * 100);
              const ac = getScoreAccent(pct);
              return (
                <motion.div
                  key={score.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.07, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="group relative rounded-2xl bg-card border border-border p-3.5 flex items-center justify-between gap-3 overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
                >
                  <div
                    className="absolute left-0 top-[20%] bottom-[20%] w-1 rounded-r-full transition-all group-hover:top-[12%] group-hover:bottom-[12%]"
                    style={{ background: ac.color, boxShadow: `0 0 8px ${ac.glow}` }}
                  />
                  <div className="flex items-center gap-3 flex-1 min-w-0 pl-2">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
                      style={{ background: ac.bg, border: `1px solid ${ac.border}` }}
                    >
                      <BookOpen size={18} style={{ color: ac.color }} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-black italic uppercase tracking-[-0.01em] leading-tight text-text truncate mb-1">
                        {score.subject}
                      </h3>
                      <p className="text-[9px] font-bold tracking-[0.12em] uppercase text-text/35">
                        {score.test_name} · {new Date(score.test_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="flex items-baseline justify-end gap-0.5">
                      <span className="text-xl font-black italic tracking-[-0.03em] text-text leading-none">{score.marks_obtained}</span>
                      <span className="text-[10px] font-bold text-text/35">/{score.total_marks}</span>
                    </div>
                    <p className="text-[10px] font-black italic mt-0.5" style={{ color: ac.color, textShadow: `0 0 8px ${ac.glow}` }}>
                      {pct}%
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* --- FIXED: Mock Finals Banner (solid, high contrast) --- */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="group relative rounded-3xl bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 p-5 flex items-center justify-between overflow-hidden transition-all duration-200 cursor-pointer hover:scale-[1.02] hover:shadow-2xl border border-white/20"
          onClick={() => router.push('/mock-finals')}
        >
          {/* Bright inner glow for extra pop */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
          <div className="flex items-center gap-3.5 relative z-10">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-md">
              <Zap size={19} fill="white" className="text-white drop-shadow" />
            </div>
            <div>
              <p className="text-sm font-black italic uppercase tracking-[-0.01em] text-white leading-tight mb-0.5 drop-shadow">
                {t('mockFinals')}
              </p>
              <p className="text-[8px] font-black tracking-[0.2em] uppercase text-white/80 drop-shadow">
                {t('nextMilestone')}
              </p>
            </div>
          </div>
          <ChevronRight size={18} className="text-white/90 transition-transform group-hover:translate-x-1 drop-shadow" />
        </motion.div>
      </div>
    </div>
  );
}