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

  const avgAccent = getScoreAccent(avg);return (
    <div className="min-h-screen pb-32 font-sans" style={{ background: 'var(--background)', color: 'var(--text)' }}>

      {/* Ambient orbs */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div style={{ position: 'absolute', top: '-8%', right: '-10%', width: 320, height: 320, borderRadius: '50%', background: `radial-gradient(circle, ${avgAccent.glow.replace('0.3','0.08')} 0%, transparent 70%)`, filter: 'blur(50px)', transition: 'background 0.5s' }} />
        <div style={{ position: 'absolute', bottom: '15%', left: '-10%', width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.05) 0%, transparent 70%)', filter: 'blur(50px)' }} />
      </div>

      <div className="max-w-md mx-auto px-5 pt-24">

        {/* ── Back ── */}
        <button
          onClick={() => router.push('/profile')}
          className="flex items-center gap-1.5 mb-10 active:scale-95 transition-transform"
          style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text)', opacity: 0.4 }}
        >
          <ChevronLeft size={15} strokeWidth={3} /> {t('profile')}
        </button>

        {/* ── Aggregate Hero Card ── */}
        <div style={{ borderRadius: 32, background: `linear-gradient(135deg, ${avgAccent.bg} 0%, var(--card) 100%)`, border: `1px solid ${avgAccent.border}`, padding: '24px 22px', marginBottom: 16, position: 'relative', overflow: 'hidden', boxShadow: `0 16px 48px ${avgAccent.glow}`, transition: 'all 0.5s' }}>
          {/* Shine */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 50%)', pointerEvents: 'none' }} />
          {/* Watermark % */}
          <div style={{ position: 'absolute', right: -10, bottom: -16, fontSize: 100, fontWeight: 900, fontStyle: 'italic', color: avgAccent.color, opacity: 0.06, lineHeight: 1, pointerEvents: 'none', userSelect: 'none' }}>
            {avg}%
          </div>

          <div style={{ position: 'relative', zIndex: 1 }}>
            <p style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.25em', textTransform: 'uppercase', color: avgAccent.color, opacity: 0.8, marginBottom: 6 }}>
              {t('aggregateScore')}
            </p>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 18 }}>
              <span style={{ fontSize: 56, fontWeight: 900, fontStyle: 'italic', letterSpacing: '-0.04em', lineHeight: 0.9, color: avgAccent.color, textShadow: `0 0 30px ${avgAccent.glow}` }}>
                {avg}%
              </span>
              <div style={{ textAlign: 'right', paddingBottom: 4 }}>
                <p style={{ fontSize: 8, fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text)', opacity: 0.3, marginBottom: 4 }}>{t('status')}</p>
                <p style={{ fontSize: 12, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--text)', letterSpacing: '-0.01em' }}>{t('activeLedger')}</p>
              </div>
            </div>

            {/* Progress bar */}
            <div style={{ height: 5, width: '100%', background: 'rgba(128,128,128,0.12)', borderRadius: 5, overflow: 'hidden' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${avg}%` }}
                transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
                style={{ height: '100%', borderRadius: 5, background: `linear-gradient(90deg, ${avgAccent.color}, ${avgAccent.color}bb)`, boxShadow: `0 0 10px ${avgAccent.glow}` }}
              />
            </div>

            {/* Sub stats */}
            <div style={{ display: 'flex', gap: 16, marginTop: 14 }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 900, fontStyle: 'italic', color: 'var(--text)', letterSpacing: '-0.02em' }}>{totalObtained}</p>
                <p style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text)', opacity: 0.3 }}>Obtained</p>
              </div>
              <div style={{ width: 1, background: 'var(--border)', alignSelf: 'stretch' }} />
              <div>
                <p style={{ fontSize: 14, fontWeight: 900, fontStyle: 'italic', color: 'var(--text)', letterSpacing: '-0.02em' }}>{totalPossible}</p>
                <p style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text)', opacity: 0.3 }}>Total</p>
              </div>
              <div style={{ width: 1, background: 'var(--border)', alignSelf: 'stretch' }} />
              <div>
                <p style={{ fontSize: 14, fontWeight: 900, fontStyle: 'italic', color: 'var(--text)', letterSpacing: '-0.02em' }}>{scores.length}</p>
                <p style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text)', opacity: 0.3 }}>Tests</p>
              </div>
            </div>
          </div>
        </div>{/* ── Recent Tests Label ── */}
        <p style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.25em', textTransform: 'uppercase', color: 'var(--text)', opacity: 0.3, marginBottom: 14, paddingLeft: 4 }}>
          {t('recentTests')}
        </p>

        {/* ── Score Cards ── */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1,2,3].map(i => (
              <div key={i} className="animate-pulse" style={{ height: 76, borderRadius: 22, background: 'var(--card)' }} />
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            {scores.map((score, index) => {
              const pct = Math.round((score.marks_obtained / score.total_marks) * 100);
              const ac = getScoreAccent(pct);
              return (
                <motion.div
                  key={score.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.07, duration: 0.35, ease: [0.22,1,0.36,1] }}
                  style={{ borderRadius: 22, background: 'var(--card)', border: '1px solid var(--border)', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, position: 'relative', overflow: 'hidden' }}
                >
                  {/* Left accent bar */}
                  <div style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: 3, borderRadius: '0 3px 3px 0', background: ac.color, boxShadow: `0 0 8px ${ac.glow}` }} />

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0, paddingLeft: 8 }}>
                    {/* Icon */}
                    <div style={{ width: 42, height: 42, borderRadius: 14, background: ac.bg, border: `1px solid ${ac.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <BookOpen size={18} style={{ color: ac.color }} />
                    </div>
                    {/* Info */}
                    <div style={{ minWidth: 0 }}>
                      <h3 style={{ fontSize: 13, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-0.01em', lineHeight: 1.1, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 4 }}>
                        {score.subject}
                      </h3>
                      <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text)', opacity: 0.35 }}>
                        {score.test_name} · {new Date(score.test_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  </div>

                  {/* Score */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', gap: 2 }}>
                      <span style={{ fontSize: 20, fontWeight: 900, fontStyle: 'italic', letterSpacing: '-0.03em', color: 'var(--text)', lineHeight: 1 }}>{score.marks_obtained}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text)', opacity: 0.35 }}>/{score.total_marks}</span>
                    </div>
                    <p style={{ fontSize: 10, fontWeight: 900, fontStyle: 'italic', color: ac.color, letterSpacing: '-0.01em', marginTop: 2, textShadow: `0 0 8px ${ac.glow}` }}>
                      {pct}%
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* ── Mock Finals Banner ── */}
        <div style={{ borderRadius: 28, background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)', padding: '20px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 12px 36px rgba(59,130,246,0.35)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 60%)', pointerEvents: 'none' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative', zIndex: 1 }}>
            <div style={{ width: 38, height: 38, borderRadius: 13, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={19} fill="white" style={{ color: '#fff' }} />
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-0.01em', color: '#fff', lineHeight: 1.1, marginBottom: 3 }}>{t('mockFinals')}</p>
              <p style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)' }}>{t('nextMilestone')}</p>
            </div>
          </div>
          <ChevronRight size={18} style={{ color: 'rgba(255,255,255,0.7)', position: 'relative', zIndex: 1 }} />
        </div>
      </div>
    </div>
  );
}