'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, CheckCircle2, Circle, Loader2, ListChecks } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';

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

  // 🎨 SOLID GRADIENT COLOR ENGINE (Matched to Dashboard UI)
  const getSubjectAccent = (subjectName: string) => {
    const fallback = { color: '#3a7bd5', gradient: 'linear-gradient(135deg, #00d2ff, #3a7bd5)' };
    if (!subjectName) return fallback;
    
    const palettes = [
      { color: '#ff0844', gradient: 'linear-gradient(135deg, #ff0844, #ffb199)' }, // Pink/Red
      { color: '#3a7bd5', gradient: 'linear-gradient(135deg, #00d2ff, #3a7bd5)' }, // Blue
      { color: '#f09819', gradient: 'linear-gradient(135deg, #f09819, #edde5d)' }, // Orange/Yellow
      { color: '#8e2de2', gradient: 'linear-gradient(135deg, #8e2de2, #4a00e0)' }, // Purple
      { color: '#10b981', gradient: 'linear-gradient(135deg, #22c55e, #059669)' }, // Green
      { color: '#06b6d4', gradient: 'linear-gradient(135deg, #22d3ee, #0284c7)' }, // Cyan
    ];

    let hash = 0;
    for (let i = 0; i < subjectName.length; i++) {
      hash = subjectName.charCodeAt(i) + ((hash << 5) - hash);
    }
    return palettes[Math.abs(hash) % palettes.length];
  };

  const accent = getSubjectAccent(activeSubject);

  return (
    <div style={{ minHeight: '100svh', background: 'var(--background)', color: 'var(--text)', padding: '40px 20px 120px', maxWidth: '500px', margin: '0 auto', display: 'flex', flexDirection: 'column' }}>

      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px' }}>
        <button 
          onClick={() => router.push('/dashboard')}
          style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'var(--card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text)', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', flexShrink: 0, transition: 'transform 0.2s' }}
          onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
          onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <ChevronLeft size={26} strokeWidth={2.5} />
        </button>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
            <ListChecks size={14} color={accent.color} strokeWidth={3} style={{ transition: 'color 0.3s ease' }} />
            <p style={{ margin: 0, fontSize: '11px', fontWeight: 900, color: accent.color, letterSpacing: '1px', textTransform: 'uppercase', transition: 'color 0.3s ease' }}>
              {t('classWord') || 'CLASS'} {userClass}
            </p>
          </div>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--text)', lineHeight: 1 }}>
            {t('syllabus') || 'SYLLABUS'}
          </h1>
        </div>
      </div>

      {/* PROGRESS CARD */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        style={{ borderRadius: '28px', background: 'var(--card)', border: '1px solid var(--border)', padding: '24px', position: 'relative', overflow: 'hidden', marginBottom: '24px', boxShadow: '0 8px 20px rgba(0,0,0,0.03)' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '16px' }}>
          <div>
            <p style={{ margin: '0 0 4px 0', fontSize: '10px', fontWeight: 900, letterSpacing: '2px', textTransform: 'uppercase', color: '#94a3b8' }}>
              PROGRESS
            </p>
            <h2 style={{ margin: 0, fontSize: '36px', fontWeight: 900, fontStyle: 'italic', letterSpacing: '-0.5px', color: accent.color, lineHeight: 1, transition: 'color 0.3s ease' }}>
              {progressPercent}%
            </h2>
          </div>
          <p style={{ margin: 0, fontSize: '10px', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>
            {completedCount} / {chapters.length} DONE
          </p>
        </div>
        <div style={{ width: '100%', height: '12px', background: '#f1f5f9', borderRadius: '6px', overflow: 'hidden' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            style={{ height: '100%', background: accent.gradient, borderRadius: '6px', transition: 'background 0.3s ease' }}
          />
        </div>
      </motion.div>

      {/* SUBJECT TABS (Clean Solid Selection Bar) */}
      <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '16px', marginBottom: '8px', width: '100%' }} className="hide-scrollbar">
        {subjects.length === 0 && !loading && (
          <p style={{ margin: '0 auto', fontSize: '10px', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>
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
              style={{
                flexShrink: 0,
                padding: '12px 24px',
                borderRadius: '20px',
                fontSize: '11px',
                fontWeight: 900,
                letterSpacing: '1px',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
                border: isActive ? '1px solid transparent' : '1px solid var(--border)',
                background: isActive ? sa.gradient : 'var(--card)',
                color: isActive ? '#ffffff' : '#64748b',
                boxShadow: isActive ? '0 8px 15px rgba(0,0,0,0.1)' : '0 2px 5px rgba(0,0,0,0.02)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                transform: isActive ? 'scale(1.02)' : 'scale(1)'
              }}
              onMouseDown={e => { if(!isActive) e.currentTarget.style.transform = 'scale(0.95)'; }}
              onMouseUp={e => { if(!isActive) e.currentTarget.style.transform = 'scale(1)'; }}
            >
              {t(s.replace('-', '')) !== s.replace('-', '') ? t(s.replace('-', '')) : s}
            </button>
          );
        })}
      </div>

      {/* CHAPTER LIST */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: '16px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#f8fafc', border: `1px solid var(--border)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Loader2 size={24} className="animate-spin" color={accent.color} />
            </div>
            <p style={{ margin: 0, fontSize: '10px', fontWeight: 900, letterSpacing: '2px', textTransform: 'uppercase', color: '#94a3b8' }}>
              {t('readingCloudData') || 'LOADING DATA...'}
            </p>
          </div>

        ) : !activeSubject ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: '64px 24px', textAlign: 'center', borderRadius: '28px', background: 'var(--card)', border: '2px dashed var(--border)' }}>
             <ListChecks size={42} color="#cbd5e1" style={{ margin: '0 auto 16px' }} />
             <p style={{ margin: 0, fontSize: '11px', fontWeight: 900, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#94a3b8' }}>
               No Subjects Available
             </p>
          </motion.div>
        ) : chapters.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: '64px 24px', textAlign: 'center', borderRadius: '28px', background: 'var(--card)', border: '2px dashed var(--border)' }}>
            <ListChecks size={42} color="#cbd5e1" style={{ margin: '0 auto 16px' }} />
            <p style={{ margin: 0, fontSize: '11px', fontWeight: 900, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#94a3b8', lineHeight: 1.6 }}>
              {t('noChaptersAdded') || 'NO CHAPTERS ADDED FOR'} {t(activeSubject.replace('-', '')) !== activeSubject.replace('-', '') ? t(activeSubject.replace('-', '')) : activeSubject}
            </p>
          </motion.div>

        ) : (
          <AnimatePresence>
            {chapters.map((ch, index) => (
              <motion.div
                key={ch.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                style={{
                  borderRadius: '20px',
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* Chapter Index */}
                <span style={{ fontSize: '13px', fontWeight: 900, fontStyle: 'italic', color: ch.is_completed ? '#e2e8f0' : '#cbd5e1', width: '22px', textAlign: 'right', flexShrink: 0 }}>
                  {String(index + 1).padStart(2, '0')}
                </span>

                {/* Details */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 style={{ 
                    margin: 0, fontSize: '14px', fontWeight: 900, textTransform: 'uppercase', 
                    color: ch.is_completed ? '#94a3b8' : 'var(--text)', 
                    textDecoration: ch.is_completed ? 'line-through' : 'none',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', transition: 'color 0.3s ease' 
                  }}>
                    {ch.chapter_name}
                  </h4>
                </div>

                {/* Solid Gradient Checkmark */}
                <div style={{ 
                  width: '32px', height: '32px', borderRadius: '10px', 
                  background: ch.is_completed ? accent.gradient : '#f1f5f9', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, 
                  transition: 'all 0.3s ease',
                  boxShadow: ch.is_completed ? '0 4px 10px rgba(0,0,0,0.1)' : 'none'
                }}>
                  {ch.is_completed
                    ? <CheckCircle2 size={18} color="#fff" strokeWidth={3} />
                    : <Circle size={18} color="#cbd5e1" strokeWidth={2.5} />
                  }
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

    </div>
  );
}
