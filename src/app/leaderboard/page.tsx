'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, ChevronLeft, Loader2, Crown, Medal } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/LanguageContext';

export default function Leaderboard() {
  const router = useRouter();
  const { t, lang } = useLanguage();
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

  const getScoreColor = (avg: number) => {
    if (avg >= 80) return '#f59e0b'; // Amber
    if (avg >= 60) return '#10b981'; // Emerald
    if (avg >= 40) return '#3b82f6'; // Blue
    return '#ef4444'; // Red
  };

  // Dynamic trick to keep the two-color title in both EN and HI
  const titleText = t('hallOfFame') as string;
  const splitIndex = titleText.indexOf(' ');
  const titlePart1 = splitIndex > -1 ? titleText.slice(0, splitIndex) : titleText;
  const titlePart2 = splitIndex > -1 ? titleText.slice(splitIndex) : '';

  return (
    <div style={{ 
      padding: '40px 20px 120px', 
      maxWidth: '500px', 
      margin: '0 auto', 
      display: 'flex', 
      flexDirection: 'column', 
      background: 'transparent', 
      minHeight: '100svh' 
    }}>
      
      {/* Header (Clean & Modern Dashboard Style) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
        <button 
          onClick={() => router.push('/dashboard')}
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
            transition: 'all 0.2s ease',
            boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
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
              CLASS {studentClass}
            </p>
          </div>
          <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: '#0f172a', lineHeight: 1 }}>
            {titlePart1} <span style={{ color: '#f59e0b' }}>{titlePart2}</span>
          </h1>
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: '24px' }}>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '3px solid rgba(245, 158, 11, 0.2)' }} className="animate-ping" />
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Loader2 className="animate-spin" size={26} color="#f59e0b" />
            </div>
          </div>
          <p style={{ margin: 0, fontSize: '10px', fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#f59e0b' }}>
            {lang === 'EN' ? 'CALCULATING GREATNESS...' : 'रैंक निकाली जा रही है...'}
          </p>
        </div>
      ) : leaders.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', gap: '16px', background: '#f8fafc', border: '2px dashed #cbd5e1', borderRadius: '32px' }}>
          <Trophy size={44} color="#cbd5e1" />
          <p style={{ margin: 0, fontSize: '12px', fontWeight: 900, letterSpacing: '1px', textTransform: 'uppercase', color: '#94a3b8', textAlign: 'center' }}>
            {lang === 'EN' ? 'NO TEST DATA FOUND' : 'कोई टेस्ट डेटा नहीं मिला'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <AnimatePresence>
            {leaders.map((student, index) => {
              const isFirst = index === 0;
              const isSecond = index === 1;
              const isThird = index === 2;
              const isTop3 = index < 3;
              const scoreColor = getScoreColor(student.avg);

              // Styling logic for different ranks
              let cardBackground = '#ffffff';
              let cardBorder = '1px solid #e2e8f0';
              let textColor = '#0f172a';
              let subTextColor = '#64748b';
              let watermark = '';

              if (isFirst) {
                cardBackground = 'linear-gradient(135deg, #f09819, #edde5d)';
                cardBorder = 'none';
                textColor = '#fff';
                subTextColor = 'rgba(255,255,255,0.8)';
                watermark = '🥇';
              } else if (isSecond) {
                cardBackground = 'linear-gradient(135deg, #94a3b8, #cbd5e1)';
                cardBorder = 'none';
                textColor = '#fff';
                subTextColor = 'rgba(255,255,255,0.8)';
                watermark = '🥈';
              } else if (isThird) {
                cardBackground = 'linear-gradient(135deg, #f97316, #fb923c)';
                cardBorder = 'none';
                textColor = '#fff';
                subTextColor = 'rgba(255,255,255,0.8)';
                watermark = '🥉';
              }

              return (
                <motion.div
                  key={student.id}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: index * 0.1, duration: 0.4, type: 'spring', damping: 20 }}
                  style={{ 
                    position: 'relative', 
                    background: cardBackground, 
                    border: cardBorder, 
                    borderRadius: '28px', 
                    padding: isFirst ? '24px 20px' : '16px 20px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '16px', 
                    overflow: 'hidden',
                    boxShadow: isFirst ? '0 15px 35px rgba(240, 152, 25, 0.3)' : isSecond ? '0 10px 25px rgba(148, 163, 184, 0.3)' : isThird ? '0 10px 25px rgba(249, 115, 22, 0.3)' : '0 4px 12px rgba(0,0,0,0.02)'
                  }}
                >
                  {/* Background Watermark for Top 3 */}
                  {isTop3 && (
                    <span style={{ position: 'absolute', right: '-10px', top: '50%', transform: 'translateY(-50%)', fontSize: isFirst ? '100px' : '80px', opacity: 0.15, pointerEvents: 'none' }}>
                      {watermark}
                    </span>
                  )}

                  {/* "Unbeatable" Tag for 1st Place */}
                  {isFirst && (
                    <div style={{ position: 'absolute', top: 0, right: '24px', background: '#fff', color: '#f09819', fontSize: '9px', fontWeight: 900, padding: '6px 12px', borderRadius: '0 0 12px 12px', display: 'flex', alignItems: 'center', gap: '4px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', textTransform: 'uppercase', letterSpacing: '1px', zIndex: 10 }}>
                      <Crown size={10} strokeWidth={3} /> {t('unbeatable')}
                    </div>
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
                      width: isFirst ? '60px' : '50px', 
                      height: isFirst ? '60px' : '50px', 
                      borderRadius: '18px', 
                      padding: '3px', 
                      background: isTop3 ? 'rgba(255,255,255,0.3)' : '#e2e8f0',
                      backdropFilter: 'blur(5px)'
                    }}>
                      <div style={{ width: '100%', height: '100%', borderRadius: '14px', overflow: 'hidden', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {student.avatar_url ? (
                          <img src={student.avatar_url} alt={student.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span style={{ fontSize: isFirst ? '24px' : '18px', fontWeight: 900, fontStyle: 'italic', color: isTop3 ? '#f59e0b' : '#64748b' }}>
                            {student.name[0]}
                          </span>
                        )}
                      </div>
                    </div>
                    {isFirst && <div style={{ position: 'absolute', inset: 0, borderRadius: '18px', border: '2px solid rgba(255,255,255,0.8)' }} className="animate-ping pointer-events-none" />}
                  </div>

                  {/* Name and Class */}
                  <div style={{ flex: 1, minWidth: 0, zIndex: 1 }}>
                    <h3 style={{ margin: 0, fontSize: isFirst ? '22px' : '18px', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: textColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {student.name.split(' ')[0]}
                    </h3>
                    <p style={{ margin: '2px 0 0 0', fontSize: '10px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: subTextColor }}>
                      CLASS {student.class}
                    </p>
                  </div>

                  {/* Score & Progress Bar */}
                  <div style={{ textAlign: 'right', flexShrink: 0, zIndex: 1 }}>
                    <span style={{ fontSize: isFirst ? '32px' : '24px', fontWeight: 900, fontStyle: 'italic', lineHeight: 1, color: isTop3 ? '#fff' : scoreColor }}>
                      {student.avg}%
                    </span>
                    <div style={{ marginTop: '8px', width: isFirst ? '60px' : '45px', height: '4px', borderRadius: '4px', background: isTop3 ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.05)', overflow: 'hidden', marginLeft: 'auto' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${student.avg}%` }}
                        transition={{ delay: index * 0.1 + 0.4, duration: 0.8, ease: 'easeOut' }}
                        style={{ height: '100%', borderRadius: '4px', background: isTop3 ? '#fff' : scoreColor }}
                      />
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
              transition={{ delay: leaders.length * 0.1 + 0.3 }}
              style={{ textAlign: 'center', fontSize: '10px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: '#94a3b8', marginTop: '16px' }}
            >
              {leaders.length} {t('studentsRanked')}
            </motion.p>
          )}
        </div>
      )}
    </div>
  );
}
