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
  const [userClass, setUserClass] = useState<string | null>(null);
  
  // Dynamic Subject States
  const [subjects, setSubjects] = useState<string[]>([]);
  const [activeSubject, setActiveSubject] = useState("");

  useEffect(() => {
    const savedClass = localStorage.getItem('studentClass') || localStorage.getItem('class');
    setUserClass(savedClass || "12th");
  }, []);

  // 1. Fetch Dynamic Subjects
  useEffect(() => {
    if (!userClass) return;
    
    const fetchDynamicSubjects = async () => {
      const key = 'subjects_' + userClass.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const { data } = await supabase.from('config').select('value').eq('key', key).maybeSingle();
      
      if (data && data.value) {
        try {
          const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSubjects(parsed);
            setActiveSubject(parsed[0]); // Auto-select the first subject
          }
        } catch (e) {
          setSubjects([]);
        }
      }
    };

    fetchDynamicSubjects();
  }, [userClass]);

  // 2. Fetch Chapters for Active Subject
  useEffect(() => {
    if (!userClass || !activeSubject) {
      setLoading(false);
      return;
    }
    
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

  // 🎨 DYNAMIC COLOR ENGINE 
  const getSubjectAccent = (subjectName: string) => {
    if (!subjectName) return { color: '#3b82f6', glow: 'rgba(59,130,246,0.3)', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.2)' };
    
    const palettes = [
      { color: '#3b82f6', glow: 'rgba(59,130,246,0.3)',  bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.2)' }, // Blue
      { color: '#10b981', glow: 'rgba(16,185,129,0.3)',  bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.2)' }, // Emerald
      { color: '#a855f7', glow: 'rgba(168,85,247,0.3)',  bg: 'rgba(168,85,247,0.08)',  border: 'rgba(168,85,247,0.2)' }, // Purple
      { color: '#f97316', glow: 'rgba(249,115,22,0.3)',  bg: 'rgba(249,115,22,0.08)',  border: 'rgba(249,115,22,0.2)' }, // Orange
      { color: '#ec4899', glow: 'rgba(236,72,153,0.3)',  bg: 'rgba(236,72,153,0.08)',  border: 'rgba(236,72,153,0.2)' }, // Pink
      { color: '#06b6d4', glow: 'rgba(6,182,212,0.3)',   bg: 'rgba(6,182,212,0.08)',   border: 'rgba(6,182,212,0.2)' }, // Cyan
      { color: '#eab308', glow: 'rgba(234,179,8,0.3)',   bg: 'rgba(234,179,8,0.08)',   border: 'rgba(234,179,8,0.2)' }, // Yellow
    ];

    let hash = 0;
    for (let i = 0; i < subjectName.length; i++) {
      hash = subjectName.charCodeAt(i) + ((hash << 5) - hash);
    }
    return palettes[Math.abs(hash) % palettes.length];
  };

  const accent = getSubjectAccent(activeSubject);

  return (
    <div className="min-h-screen pb-32 font-sans" style={{ background: 'var(--background)', color: 'var(--text)' }}>

      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div style={{ position: 'absolute', top: '-8%', right: '-12%', width: 320, height: 320, borderRadius: '50%', background: `radial-gradient(circle, ${accent.glow.replace('0.3','0.1')} 0%, transparent 70%)`, filter: 'blur(50px)', transition: 'background 0.5s' }} />
        <div style={{ position: 'absolute', bottom: '10%', left: '-10%', width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)', filter: 'blur(50px)' }} />
      </div>

      <div className="px-5 pt-24">

        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-1.5 mb-10 active:scale-95 transition-transform"
          style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text)', opacity: 0.4 }}
        >
          <ChevronLeft size={15} strokeWidth={3} /> {t('backToDashboard')}
        </button>

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

          <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text)', opacity: 0.25, marginTop: 10, textAlign: 'center' }}>
            {completedCount} of {chapters.length} chapters done
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 20 }} className="no-scrollbar">
          {subjects.length === 0 && !loading && (
            <p style={{ fontSize: 10, fontWeight: 800, color: 'var(--text)', opacity: 0.4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              No subjects configured
            </p>
          )}
          {subjects.map(s => {
            const isActive = activeSubject === s;
            const sa = getSubjectAccent(s);
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
                {/* Fallback to translation dict if exists, otherwise raw name */}
                {t(s.replace('-', '')) !== s.replace('-', '') ? t(s.replace('-', '')) : s}
              </button>
            );
          })}
        </div>

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

          ) : !activeSubject ? (
            <div style={{ padding: '64px 24px', textAlign: 'center', borderRadius: 28, background: 'var(--card)', border: '1px dashed var(--border)', opacity: 0.5 }}>
               <ListChecks size={36} style={{ color: 'var(--text)', opacity: 0.2, margin: '0 auto 12px' }} />
               <p style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text)', opacity: 0.4 }}>
                 No Subjects Available
               </p>
            </div>
          ) : chapters.length === 0 ? (
            <div style={{ padding: '64px 24px', textAlign: 'center', borderRadius: 28, background: 'var(--card)', border: '1px dashed var(--border)', opacity: 0.5 }}>
              <ListChecks size={36} style={{ color: 'var(--text)', opacity: 0.2, margin: '0 auto 12px' }} />
              <p style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text)', opacity: 0.4 }}>
                {t('noChaptersAdded')} {t(activeSubject.replace('-', '')) !== activeSubject.replace('-', '') ? t(activeSubject.replace('-', '')) : activeSubject}.
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
                  <span style={{ fontSize: 10, fontWeight: 900, fontStyle: 'italic', color: 'var(--text)', opacity: 0.2, width: 20, textAlign: 'right', flexShrink: 0 }}>
                    {String(index + 1).padStart(2, '0')}
                  </span>

                  <div style={{ width: 28, height: 28, borderRadius: 10, background: ch.is_completed ? accent.color : 'rgba(128,128,128,0.08)', border: ch.is_completed ? 'none' : '1px solid rgba(128,128,128,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: ch.is_completed ? `0 4px 12px ${accent.glow}` : 'none', transition: 'all 0.3s' }}>
                    {ch.is_completed
                      ? <CheckCircle2 size={16} style={{ color: '#fff' }} />
                      : <Circle size={16} style={{ color: 'var(--text)', opacity: 0.25 }} />
                    }
                  </div>

                  <span style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.02em', color: ch.is_completed ? accent.color : 'var(--text)', textDecoration: ch.is_completed ? 'line-through' : 'none', opacity: ch.is_completed ? 0.6 : 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', transition: 'color 0.3s, opacity 0.3s' }}>
                    {ch.chapter_name}
                  </span>
                </div>

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
