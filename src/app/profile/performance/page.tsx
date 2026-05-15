'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, ChevronRight, Zap, ChevronLeft, BarChart3 } from 'lucide-react';
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

  // 🎨 SOLID GRADIENT COLOR ENGINE
  const getScoreAccent = (pct: number) => {
    if (pct >= 80) return { color: '#10b981', gradient: 'linear-gradient(135deg, #10b981, #059669)', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)' };
    if (pct >= 60) return { color: '#3b82f6', gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.2)' };
    if (pct >= 40) return { color: '#f59e0b', gradient: 'linear-gradient(135deg, #fcd34d, #f59e0b)', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)' };
    return              { color: '#ef4444', gradient: 'linear-gradient(135deg, #ef4444, #b91c1c)', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)' };
  };

  const avgAccent = getScoreAccent(avg);

  return (
    <div style={{ minHeight: '100svh', background: 'var(--background)', color: 'var(--text)', padding: '40px 20px 120px', maxWidth: '500px', margin: '0 auto', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
      
      {/* Ambient Orbs (Softened) */}
      <div style={{ position: 'fixed', inset: 0, zIndex: -10, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '320px', height: '320px', borderRadius: '50%', background: `radial-gradient(circle, ${avgAccent.bg} 0%, transparent 70%)`, filter: 'blur(60px)', transition: 'background 0.5s ease' }} />
        <div style={{ position: 'absolute', bottom: '15%', left: '-10%', width: '260px', height: '260px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.03) 0%, transparent 70%)', filter: 'blur(60px)' }} />
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px' }}>
        <button 
          onClick={() => router.push('/profile')}
          style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'var(--card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text)', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', flexShrink: 0, transition: 'transform 0.2s' }}
          onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
          onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <ChevronLeft size={26} strokeWidth={2.5} />
        </button>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
            <BarChart3 size={14} color="#3b82f6" strokeWidth={3} />
            <p style={{ margin: 0, fontSize: '11px', fontWeight: 900, color: '#3b82f6', letterSpacing: '1px', textTransform: 'uppercase' }}>
              {t('profile') || 'PROFILE'}
            </p>
          </div>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--text)', lineHeight: 1 }}>
            {t('performance') || 'PERFORMANCE'}
          </h1>
        </div>
      </div>

      {/* Aggregate Hero Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        style={{ borderRadius: '32px', background: 'var(--card)', border: '1px solid var(--border)', padding: '28px 24px', position: 'relative', overflow: 'hidden', marginBottom: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}
      >
        <div style={{ position: 'absolute', right: '-10px', bottom: '-20px', fontSize: '100px', fontWeight: 900, fontStyle: 'italic', opacity: 0.04, color: avgAccent.color, pointerEvents: 'none' }}>
          {avg}%
        </div>

        <div style={{ position: 'relative', zIndex: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px' }}>
            <div>
              <p style={{ margin: '0 0 4px 0', fontSize: '10px', fontWeight: 900, letterSpacing: '2px', textTransform: 'uppercase', color: '#94a3b8' }}>
                {t('aggregateScore') || 'AGGREGATE SCORE'}
              </p>
              <h2 style={{ margin: 0, fontSize: '48px', fontWeight: 900, fontStyle: 'italic', letterSpacing: '-1px', color: avgAccent.color, lineHeight: 0.9, transition: 'color 0.4s' }}>
                {avg}%
              </h2>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: '0 0 4px 0', fontSize: '9px', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>{t('status') || 'STATUS'}</p>
              <p style={{ margin: 0, fontSize: '12px', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--text)' }}>{t('activeLedger') || 'ACTIVE'}</p>
            </div>
          </div>

          <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden', marginBottom: '20px' }}>
            <motion.div
              initial={{ width: 0 }} animate={{ width: `${avg}%` }} transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
              style={{ height: '100%', background: avgAccent.gradient, borderRadius: '4px', transition: 'background 0.4s' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'space-between', background: '#f8fafc', padding: '12px 16px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <p style={{ margin: '0 0 2px 0', fontSize: '16px', fontWeight: 900, fontStyle: 'italic', color: 'var(--text)' }}>{totalObtained}</p>
              <p style={{ margin: 0, fontSize: '9px', fontWeight: 900, letterSpacing: '1px', textTransform: 'uppercase', color: '#94a3b8' }}>Obtained</p>
            </div>
            <div style={{ width: '1px', background: '#e2e8f0' }} />
            <div style={{ textAlign: 'center', flex: 1 }}>
              <p style={{ margin: '0 0 2px 0', fontSize: '16px', fontWeight: 900, fontStyle: 'italic', color: 'var(--text)' }}>{totalPossible}</p>
              <p style={{ margin: 0, fontSize: '9px', fontWeight: 900, letterSpacing: '1px', textTransform: 'uppercase', color: '#94a3b8' }}>Total</p>
            </div>
            <div style={{ width: '1px', background: '#e2e8f0' }} />
            <div style={{ textAlign: 'center', flex: 1 }}>
              <p style={{ margin: '0 0 2px 0', fontSize: '16px', fontWeight: 900, fontStyle: 'italic', color: 'var(--text)' }}>{scores.length}</p>
              <p style={{ margin: 0, fontSize: '9px', fontWeight: 900, letterSpacing: '1px', textTransform: 'uppercase', color: '#94a3b8' }}>Tests</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tests Section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', paddingLeft: '8px' }}>
        <BookOpen size={16} color="#94a3b8" />
        <h2 style={{ margin: 0, fontSize: '12px', fontWeight: 900, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#94a3b8' }}>
          {t('recentTests') || 'RECENT TESTS'}
        </h2>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
        {loading ? (
          <>
            <div style={{ height: '76px', borderRadius: '24px', background: 'var(--card)', border: '1px solid var(--border)', opacity: 0.5 }} className="animate-pulse" />
            <div style={{ height: '76px', borderRadius: '24px', background: 'var(--card)', border: '1px solid var(--border)', opacity: 0.5 }} className="animate-pulse" />
          </>
        ) : scores.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 24px', borderRadius: '28px', background: 'var(--card)', border: '2px dashed var(--border)', opacity: 0.7 }}>
             <p style={{ margin: 0, fontSize: '11px', fontWeight: 900, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#94a3b8' }}>
               No tests recorded yet.
             </p>
          </div>
        ) : (
          <AnimatePresence>
            {scores.map((score, index) => {
              const pct = Math.round((score.marks_obtained / score.total_marks) * 100);
              const ac = getScoreAccent(pct);
              return (
                <motion.div
                  key={score.id}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
                  style={{
                    borderRadius: '24px', background: 'var(--card)', border: '1px solid var(--border)',
                    padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.02)', position: 'relative', overflow: 'hidden'
                  }}
                >
                  {/* Left accent stripe */}
                  <div style={{ position: 'absolute', left: 0, top: '25%', bottom: '25%', width: '4px', borderRadius: '0 4px 4px 0', background: ac.gradient }} />

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: 0, paddingLeft: '6px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: ac.bg, border: `1px solid ${ac.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <BookOpen size={20} color={ac.color} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <h3 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--text)', lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {score.subject}
                      </h3>
                      <p style={{ margin: 0, fontSize: '9px', fontWeight: 900, letterSpacing: '1px', textTransform: 'uppercase', color: '#94a3b8' }}>
                        {score.test_name} · {new Date(score.test_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', gap: '2px' }}>
                      <span style={{ fontSize: '22px', fontWeight: 900, fontStyle: 'italic', color: 'var(--text)', lineHeight: 1 }}>{score.marks_obtained}</span>
                      <span style={{ fontSize: '11px', fontWeight: 900, color: '#cbd5e1' }}>/{score.total_marks}</span>
                    </div>
                    <div style={{ display: 'inline-block', marginTop: '6px', background: ac.bg, border: `1px solid ${ac.border}`, padding: '2px 8px', borderRadius: '6px' }}>
                      <p style={{ margin: 0, fontSize: '9px', fontWeight: 900, color: ac.color }}>{pct}%</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Mock Finals Banner (Solid Gradient) */}
      <motion.div
        initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        onClick={() => router.push('/mock-finals')}
        style={{ 
          borderRadius: '26px', background: 'linear-gradient(135deg, #f97316, #ef4444)', padding: '20px 24px', 
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer',
          boxShadow: '0 10px 25px rgba(239, 68, 68, 0.2)', transition: 'transform 0.2s', position: 'relative', overflow: 'hidden'
        }}
        onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
        onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 60%)', pointerEvents: 'none' }} />
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', position: 'relative', zIndex: 1 }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.3)' }}>
            <Zap size={24} color="#fff" />
          </div>
          <div>
            <p style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: '#fff', lineHeight: 1 }}>
              {t('mockFinals') || 'MOCK FINALS'}
            </p>
            <p style={{ margin: 0, fontSize: '10px', fontWeight: 900, letterSpacing: '1px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.9)' }}>
              {t('nextMilestone') || 'NEXT MILESTONE'}
            </p>
          </div>
        </div>
        <ChevronRight size={24} color="#fff" style={{ opacity: 0.8, position: 'relative', zIndex: 1 }} />
      </motion.div>
    </div>
  );
}
