'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, CheckCircle2, Circle, Loader2, ListChecks } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/LanguageContext';

export default function StudentSyllabus() {
  const router = useRouter();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [chapters, setChapters] = useState<any[]>([]);
  const [activeSubject, setActiveSubject] = useState("mathematics");
  const [userClass, setUserClass] = useState<string | null>(null);

  const subjects = ["mathematics", "science", "english", "social-studies"];

  useEffect(() => {
    const savedClass = localStorage.getItem('studentClass') || localStorage.getItem('class');
    setUserClass(savedClass || "12th");
  }, []);

  useEffect(() => {
    if (!userClass) return;
    async function fetchSyllabus() {
      setLoading(true);
      const { data, error } = await supabase
        .from('syllabus')
        .select('*')
        .eq('class', userClass)
        .eq('subject', activeSubject.toLowerCase())
        .order('order_index', { ascending: true });
      if (!error) setChapters(data || []);
      setLoading(false);
    }
    fetchSyllabus();
  }, [activeSubject, userClass]);

  const completedCount = chapters.filter(c => c.is_completed).length;
  const progressPercent = chapters.length > 0 ? Math.round((completedCount / chapters.length) * 100) : 0;

  const subjectAccents: Record<string, { color: string; glow: string; bg: string; border: string }> = {
    mathematics:    { color: '#3b82f6', glow: 'rgba(59,130,246,0.3)',  bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.2)'  },
    science:        { color: '#10b981', glow: 'rgba(16,185,129,0.3)',  bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.2)'  },
    english:        { color: '#a855f7', glow: 'rgba(168,85,247,0.3)',  bg: 'rgba(168,85,247,0.08)',  border: 'rgba(168,85,247,0.2)'  },
    'social-studies':{ color: '#f97316', glow: 'rgba(249,115,22,0.3)', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.2)'  },
  };

  const accent = subjectAccents[activeSubject] || subjectAccents['mathematics'];return (
    <div className="min-h-screen pb-32 font-sans" style={{ background: 'var(--background)', color: 'var(--text)' }}>

      {/* Ambient orbs */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div style={{ position: 'absolute', top: '-8%', right: '-12%', width: 320, height: 320, borderRadius: '50%', background: `radial-gradient(circle, ${accent.glow.replace('0.3','0.1')} 0%, transparent 70%)`, filter: 'blur(50px)', transition: 'background 0.5s' }} />
        <div style={{ position: 'absolute', bottom: '10%', left: '-10%', width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)', filter: 'blur(50px)' }} />
      </div>

      <div className="px-5 pt-24">

        {/* ── Back ── */}
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-1.5 mb-10 active:scale-95 transition-transform"
          style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text)', opacity: 0.4 }}
        >
          <ChevronLeft size={15} strokeWidth={3} /> {t('backToDashboard')}
        </button>

        {/* ── Header ── */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <div>
              <h1 style={{ fontSize: 44, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-0.03em', lineHeight: 0.92, color: 'var(--text)' }}>
                {t('syllabus')}{' '}
                <span style={{ color: accent.color, textShadow: `0 0 30px ${accent.glow}`, transition: 'color 0.4s, text-shadow 0.4s' }}>
                  {t('pulse')}
                </span>
              </h1>
              <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--text)', opacity: 0.3, marginTop: 8 }}>
                {t('classWord')} {userClass} · {t('progress')}
              </p>
            </div>
            <div style={{ width: 48, height: 48, borderRadius: 16, background: accent.bg, border: `1px solid ${accent.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.4s, border 0.4s', flexShrink: 0 }}>
              <ListChecks size={22} style={{ color: accent.color, transition: 'color 0.4s' }} />
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ borderRadius: 24, background: 'var(--card)', border: '1px solid var(--border)', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ flex: 1, height: 6, background: 'rgba(128,128,128,0.1)', borderRadius: 6, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progressPercent}%`, borderRadius: 6, background: `linear-gradient(90deg, ${accent.color}, ${accent.color}cc)`, boxShadow: `0 0 12px ${accent.glow}`, transition: 'width 1s cubic-bezier(0.22,1,0.36,1), background 0.4s' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, flexShrink: 0 }}>
              <span style={{ fontSize: 26, fontWeight: 900, fontStyle: 'italic', letterSpacing: '-0.04em', color: accent.color, transition: 'color 0.4s' }}>
                {progressPercent}%
              </span>
            </div>
          </div>

          {/* Chapter count */}
          <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text)', opacity: 0.25, marginTop: 10, textAlign: 'center' }}>
            {completedCount} of {chapters.length} chapters done
          </p>
        </div>

        {/* ── Subject Tabs ── */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 20 }} className="no-scrollbar">
          {subjects.map(s => {
            const dictKey = s.replace('-', '');
            const isActive = activeSubject === s;
            const sa = subjectAccents[s];
            return (
              <button
                key={s}
                onClick={() => setActiveSubject(s)}
                className="active:scale-95 transition-transform"
                style={{
                  flexShrink: 0,
                  padding: '10px 20px',
                  borderRadius: 14,
                  fontSize: 9,
                  fontWeight: 900,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                  border: isActive ? `1px solid ${sa.border}` : '1px solid var(--border)',
                  background: isActive ? sa.bg : 'var(--card)',
                  color: isActive ? sa.color : 'var(--text)',
                  opacity: isActive ? 1 : 0.45,
                  boxShadow: isActive ? `0 4px 16px ${sa.glow}` : 'none',
                  transition: 'all 0.25s',
                }}
              >
                {t(dictKey)}
              </button>
            );
          })}
        </div>{/* ── Chapter List ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 8 }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 16 }}>
              <div style={{ position: 'relative' }}>
                <div className="absolute inset-0 rounded-full animate-ping" style={{ border: `2px solid ${accent.glow}` }} />
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: accent.bg, border: `1px solid ${accent.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Loader2 size={22} className="animate-spin" style={{ color: accent.color }} />
                </div>
              </div>
              <p style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.28em', textTransform: 'uppercase', color: accent.color, opacity: 0.6 }}>
                {t('readingCloudData')}
              </p>
            </div>

          ) : chapters.length === 0 ? (
            <div style={{ padding: '64px 24px', textAlign: 'center', borderRadius: 28, background: 'var(--card)', border: '1px dashed var(--border)', opacity: 0.5 }}>
              <ListChecks size={36} style={{ color: 'var(--text)', opacity: 0.2, margin: '0 auto 12px' }} />
              <p style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text)', opacity: 0.4 }}>
                {t('noChaptersAdded')} {t(activeSubject.replace('-', ''))}.
              </p>
            </div>

          ) : (
            chapters.map((ch, index) => (
              <div
                key={ch.id}
                style={{
                  borderRadius: 22,
                  background: ch.is_completed ? accent.bg : 'var(--card)',
                  border: ch.is_completed ? `1px solid ${accent.border}` : '1px solid var(--border)',
                  padding: '15px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 14,
                  transition: 'background 0.3s, border 0.3s',
                  animation: `fadeSlideIn 0.35s ease both`,
                  animationDelay: `${index * 0.04}s`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 }}>
                  {/* Rank number */}
                  <span style={{ fontSize: 10, fontWeight: 900, fontStyle: 'italic', color: 'var(--text)', opacity: 0.2, width: 20, textAlign: 'right', flexShrink: 0 }}>
                    {String(index + 1).padStart(2, '0')}
                  </span>

                  {/* Check icon */}
                  <div style={{ width: 28, height: 28, borderRadius: 10, background: ch.is_completed ? accent.color : 'rgba(128,128,128,0.08)', border: ch.is_completed ? 'none' : '1px solid rgba(128,128,128,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: ch.is_completed ? `0 4px 12px ${accent.glow}` : 'none', transition: 'all 0.3s' }}>
                    {ch.is_completed
                      ? <CheckCircle2 size={16} style={{ color: '#fff' }} />
                      : <Circle size={16} style={{ color: 'var(--text)', opacity: 0.25 }} />
                    }
                  </div>

                  {/* Chapter name */}
                  <span style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.02em', color: ch.is_completed ? accent.color : 'var(--text)', textDecoration: ch.is_completed ? 'line-through' : 'none', opacity: ch.is_completed ? 0.6 : 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', transition: 'color 0.3s, opacity 0.3s' }}>
                    {ch.chapter_name}
                  </span>
                </div>

                {/* Done glow dot */}
                {ch.is_completed && (
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: accent.color, boxShadow: `0 0 10px ${accent.glow}`, flexShrink: 0 }} />
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}