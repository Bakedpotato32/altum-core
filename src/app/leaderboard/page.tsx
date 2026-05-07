'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, ChevronLeft, Loader2, Crown, Sparkles, Medal } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/LanguageContext';

export default function Leaderboard() {
  const router = useRouter();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [leaders, setLeaders] = useState<any[]>([]);
  const [studentClass, setStudentClass] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLeaderboard() {
      setLoading(true);
      const myClass = localStorage.getItem('studentClass');
      setStudentClass(myClass);

      const { data: studentsData } = await supabase
        .from('students')
        .select('id, name, class, avatar_url')
        .eq('class', myClass);

      const { data: scoresData } = await supabase
        .from('test_scores')
        .select('student_id, marks_obtained, total_marks');

      if (studentsData && scoresData) {
        const studentStats: any = {};

        studentsData.forEach((st) => {
          studentStats[st.id] = {
            name: st.name,
            class: st.class,
            avatar_url: st.avatar_url,
            got: 0,
            total: 0,
          };
        });

        scoresData.forEach((sc) => {
          if (studentStats[sc.student_id]) {
            studentStats[sc.student_id].got += Number(sc.marks_obtained || 0);
            studentStats[sc.student_id].total += Number(sc.total_marks || 0);
          }
        });

        const ranked = Object.keys(studentStats)
          .filter((id) => studentStats[id].total > 0)
          .map((id) => ({
            id,
            ...studentStats[id],
            avg: Math.round((studentStats[id].got / studentStats[id].total) * 100),
          }))
          .sort((a, b) => b.avg - a.avg);

        setLeaders(ranked);
      }
      setLoading(false);
    }
    fetchLeaderboard();
  }, []);

  const getRankColor = (index: number) => {
    if (index === 0) return '#F5C842';
    if (index === 1) return '#B0BEC5';
    if (index === 2) return '#FF8C42';
    return '#4A90D9';
  };

  const getScoreColor = (avg: number) => {
    if (avg >= 80) return '#F5C842';
    if (avg >= 60) return '#6EE7B7';
    if (avg >= 40) return '#93C5FD';
    return '#F87171';
  };

/* ========================================= */
/* ✂️ END OF PART 1 - PASTE PART 2 BELOW THIS */
/* ========================================= */
  return (
    <div
      className="min-h-screen p-5 pt-20 pb-32 font-sans relative overflow-hidden"
      style={{ background: 'var(--background)', color: 'var(--text)' }}
    >
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div className="absolute" style={{ top: '-8%', right: '-12%', width: 380, height: 380, borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,200,66,0.12) 0%, transparent 70%)', filter: 'blur(40px)' }} />
        <div className="absolute" style={{ bottom: '5%', left: '-15%', width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, rgba(74,144,217,0.1) 0%, transparent 70%)', filter: 'blur(50px)' }} />
        <div className="absolute" style={{ top: '40%', left: '30%', width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(110,231,183,0.06) 0%, transparent 70%)', filter: 'blur(60px)' }} />
      </div>

      <div className="max-w-md mx-auto">
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-1.5 mb-10 active:scale-95 transition-transform"
          style={{ color: 'var(--text)', opacity: 0.45, fontSize: 10, fontWeight: 900, letterSpacing: '0.18em', textTransform: 'uppercase' }}
        >
          <ChevronLeft size={15} strokeWidth={3} />
          {t('dashboard')}
        </motion.button>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12 relative"
        >
          <div className="absolute -top-4 -left-2 opacity-60">
            <Sparkles size={32} style={{ color: '#F5C842' }} className="animate-pulse" />
          </div>
          <h1 style={{ fontSize: 52, fontWeight: 900, fontStyle: 'italic', lineHeight: 0.92, letterSpacing: '-0.03em', textTransform: 'uppercase', color: 'var(--text)' }}>
            {t('hallOf')}{' '}
            <span style={{ color: '#F5C842', textShadow: '0 0 40px rgba(245,200,66,0.35)' }}>
              {t('fame')}
            </span>
          </h1>
          <div className="flex items-center gap-3 mt-4">
            <div style={{ width: 36, height: 2, background: 'rgba(245,200,66,0.5)', borderRadius: 2 }} />
            <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.25em', textTransform: 'uppercase', color: 'var(--text)', opacity: 0.4 }}>
              {t('classWord')} {studentClass} {t('classRankings')}
            </p>
          </div>
        </motion.div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-6">
            <div className="relative">
              <div className="absolute inset-0 rounded-full animate-ping" style={{ border: '3px solid rgba(245,200,66,0.25)' }} />
              <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'rgba(245,200,66,0.08)', border: '1px solid rgba(245,200,66,0.2)' }}>
                <Loader2 className="animate-spin" size={26} style={{ color: '#F5C842' }} />
              </div>
            </div>
            <p style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(245,200,66,0.6)' }}>
              {t('calculatingGreatness')}
            </p>
          </div>
        ) : leaders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 rounded-[32px]" style={{ background: 'var(--card)', border: '1px dashed var(--border)', opacity: 0.5 }}>
            <Trophy size={44} style={{ color: 'var(--text)', opacity: 0.3 }} />
            <p style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', opacity: 0.5, textAlign: 'center' }}>
              {t('noTestData')}
            </p>
          </div>
        ) : (<div className="space-y-4">
            <AnimatePresence>
              {leaders.map((student, index) => {
                const isFirst = index === 0;
                const isSecond = index === 1;
                const isThird = index === 2;
                const isTop3 = index < 3;
                const rankColor = getRankColor(index);
                const scoreColor = getScoreColor(student.avg);

                return (
                  <motion.div
                    key={student.id}
                    initial={{ opacity: 0, y: 24, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: index * 0.09, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                    style={{ position: 'relative' }}
                  >
                    {isFirst && (
                      <div className="absolute inset-0 rounded-[32px] pointer-events-none" style={{ boxShadow: '0 0 0 1.5px rgba(245,200,66,0.35), 0 16px 48px rgba(245,200,66,0.18)' }} />
                    )}
                    <div style={{ borderRadius: 32, border: isFirst ? '1px solid rgba(245,200,66,0.3)' : isSecond ? '1px solid rgba(176,190,197,0.2)' : isThird ? '1px solid rgba(255,140,66,0.2)' : '1px solid var(--border)', background: isFirst ? 'linear-gradient(135deg, rgba(245,200,66,0.1) 0%, rgba(245,200,66,0.04) 50%, var(--card) 100%)' : isSecond ? 'linear-gradient(135deg, rgba(176,190,197,0.06) 0%, var(--card) 100%)' : isThird ? 'linear-gradient(135deg, rgba(255,140,66,0.07) 0%, var(--card) 100%)' : 'var(--card)', padding: isFirst ? '22px 20px' : '16px 18px', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', gap: 14, position: 'relative', overflow: 'hidden' }}>
                      {isTop3 && <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse at top right, ${rankColor}08 0%, transparent 60%)` }} />}
                      {isFirst && (
                        <div className="absolute" style={{ top: -1, right: 18, background: 'linear-gradient(90deg, #F5C842, #FFE082)', color: '#1a1200', fontSize: 8, fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', padding: '5px 12px', borderRadius: '0 0 12px 12px', display: 'flex', alignItems: 'center', gap: 5, boxShadow: '0 4px 16px rgba(245,200,66,0.3)' }}>
                          <Crown size={9} />{t('unbeatable')}
                        </div>
                      )}
                      <div style={{ width: 36, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {isFirst ? <Crown size={26} style={{ color: '#F5C842', filter: 'drop-shadow(0 0 6px rgba(245,200,66,0.5))' }} /> : isSecond ? <Medal size={22} style={{ color: '#B0BEC5' }} /> : isThird ? <Medal size={22} style={{ color: '#FF8C42' }} /> : <span style={{ fontSize: 11, fontWeight: 900, fontStyle: 'italic', color: 'var(--text)', opacity: 0.3 }}>#{index + 1}</span>}
                      </div>
                      <div style={{ flexShrink: 0, position: 'relative' }}>
                        <div style={{ width: isFirst ? 58 : 48, height: isFirst ? 58 : 48, borderRadius: '50%', padding: 2.5, background: isFirst ? 'linear-gradient(135deg, #F5C842, #FFE082)' : isSecond ? 'linear-gradient(135deg, #B0BEC5, #78909C)' : isThird ? 'linear-gradient(135deg, #FF8C42, #FFB347)' : 'var(--border)' }}>
                          <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', background: 'var(--background)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {student.avatar_url ? (
                              <img src={student.avatar_url} alt={student.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <span style={{ fontSize: isFirst ? 22 : 16, fontWeight: 900, fontStyle: 'italic', color: rankColor }}>{student.name[0]}</span>
                            )}
                          </div>
                        </div>
                        {isFirst && <div className="absolute inset-0 rounded-full animate-ping pointer-events-none" style={{ border: '2px solid rgba(245,200,66,0.3)', animationDuration: '2.5s' }} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 style={{ fontSize: isFirst ? 20 : 15, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 1.1, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {student.name.split(' ')[0]}
                        </h3>
                        <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: 3, color: isFirst ? 'rgba(245,200,66,0.7)' : 'var(--text)', opacity: isFirst ? 1 : 0.35 }}>
                          CLASS {student.class}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <span style={{ fontSize: isFirst ? 38 : isTop3 ? 26 : 20, fontWeight: 900, fontStyle: 'italic', letterSpacing: '-0.04em', lineHeight: 1, color: isFirst ? '#F5C842' : isSecond ? '#B0BEC5' : isThird ? '#FF8C42' : scoreColor, textShadow: isFirst ? '0 0 24px rgba(245,200,66,0.4)' : 'none' }}>
                          {student.avg}%
                        </span>
                        <div style={{ marginTop: 6, width: isFirst ? 56 : 40, height: 3, borderRadius: 4, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginLeft: 'auto' }}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${student.avg}%` }}
                            transition={{ delay: index * 0.09 + 0.3, duration: 0.7, ease: 'easeOut' }}
                            style={{ height: '100%', borderRadius: 4, background: isFirst ? 'linear-gradient(90deg, #F5C842, #FFE082)' : isSecond ? '#B0BEC5' : isThird ? '#FF8C42' : scoreColor }}
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            {leaders.length > 0 && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: leaders.length * 0.09 + 0.3 }}
                style={{ textAlign: 'center', fontSize: 9, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text)', opacity: 0.2, paddingTop: 8 }}
              >
                {leaders.length} student{leaders.length !== 1 ? 's' : ''} ranked
              </motion.p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
