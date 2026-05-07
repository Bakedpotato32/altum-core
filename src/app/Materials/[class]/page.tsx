'use client';
import React, { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Book, ChevronLeft, ArrowRight, Loader2, Library } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';
import { supabase } from '@/lib/supabase';

export default function SubjectVault() {
  const router = useRouter();
  const params = useParams();
  const { t } = useLanguage();
  
  // Safely decode the class from the URL
  const studentClass = decodeURIComponent(params.class as string || "");
  const backPressCount = useRef(0);

  const [subjects, setSubjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // --- HARDWARE BACK BUTTON HIJACK ---
  useEffect(() => {
    window.history.pushState({ dummy: true }, '', window.location.href);

    const handleHardwareBack = () => {
      if (backPressCount.current === 0) {
        backPressCount.current = 1;
        window.history.pushState({ dummy: true }, '', window.location.href);
        router.push('/dashboard');
        setTimeout(() => { backPressCount.current = 0; }, 2000);
      }
    };

    window.addEventListener('popstate', handleHardwareBack);
    return () => { window.removeEventListener('popstate', handleHardwareBack); };
  }, [router]);
  // ----------------------------------------

  // Fetch Dynamic Subjects from Cloud
  useEffect(() => {
    const fetchDynamicSubjects = async () => {
      if (!studentClass) return;
      setLoading(true);
      
      const key = 'subjects_' + studentClass.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const { data } = await supabase.from('config').select('value').eq('key', key).maybeSingle();
      
      if (data && data.value) {
        try {
          const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
          setSubjects(Array.isArray(parsed) ? parsed : []);
        } catch (e) {
          setSubjects([]);
        }
      }
      setLoading(false);
    };

    fetchDynamicSubjects();
  }, [studentClass]);

  // 🎨 DYNAMIC COLOR ENGINE 
  // Maps any custom subject to a beautiful, consistent neon gradient
  const getSubjectAccent = (subjectName: string) => {
    const palettes = [
      { color: '#3b82f6', glow: 'rgba(59,130,246,0.25)',  bg: 'rgba(59,130,246,0.07)',  border: 'rgba(59,130,246,0.2)' }, // Blue
      { color: '#10b981', glow: 'rgba(16,185,129,0.25)',  bg: 'rgba(16,185,129,0.07)',  border: 'rgba(16,185,129,0.2)' }, // Emerald
      { color: '#a855f7', glow: 'rgba(168,85,247,0.25)',  bg: 'rgba(168,85,247,0.07)',  border: 'rgba(168,85,247,0.2)' }, // Purple
      { color: '#f97316', glow: 'rgba(249,115,22,0.25)',  bg: 'rgba(249,115,22,0.07)',  border: 'rgba(249,115,22,0.2)' }, // Orange
      { color: '#ec4899', glow: 'rgba(236,72,153,0.25)',  bg: 'rgba(236,72,153,0.07)',  border: 'rgba(236,72,153,0.2)' }, // Pink
      { color: '#06b6d4', glow: 'rgba(6,182,212,0.25)',   bg: 'rgba(6,182,212,0.07)',   border: 'rgba(6,182,212,0.2)' }, // Cyan
      { color: '#eab308', glow: 'rgba(234,179,8,0.25)',   bg: 'rgba(234,179,8,0.07)',   border: 'rgba(234,179,8,0.2)' }, // Yellow
    ];

    // Create a simple deterministic hash based on the string so the color is always the same for that word
    let hash = 0;
    for (let i = 0; i < subjectName.length; i++) {
      hash = subjectName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % palettes.length;
    return palettes[index];
  };

  return (
    <div className="min-h-svh pb-32 font-sans" style={{ background: 'var(--background)', color: 'var(--text)' }}>

      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div style={{ position: 'absolute', top: '-8%', right: '-12%', width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)', filter: 'blur(50px)' }} />
        <div style={{ position: 'absolute', bottom: '15%', left: '-10%', width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,85,247,0.06) 0%, transparent 70%)', filter: 'blur(50px)' }} />
      </div>

      <div className="max-w-md mx-auto px-5 pt-28">

        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-1.5 mb-10 active:scale-95 transition-transform"
          style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text)', opacity: 0.4 }}
        >
          <ChevronLeft size={15} strokeWidth={3} /> {t('backToHub')}
        </button>

        <div style={{ marginBottom: 36 }}>
          <h1 style={{ fontSize: 46, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-0.03em', lineHeight: 0.92, color: 'var(--text)' }}>
            {t('classWord')}{' '}
            <span style={{ color: '#3b82f6', textShadow: '0 0 30px rgba(59,130,246,0.35)' }}>
              {studentClass}
            </span>
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
            <div style={{ width: 28, height: 2, background: 'rgba(59,130,246,0.5)', borderRadius: 2 }} />
            <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.25em', textTransform: 'uppercase', color: '#3b82f6', opacity: 0.7 }}>
              {t('selectSubjectVault')}
            </p>
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0' }}>
            <Loader2 className="animate-spin" size={32} style={{ color: '#3b82f6' }} />
          </div>
        ) : subjects.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 24px', borderRadius: 28, background: 'var(--card)', border: '1px dashed var(--border)', opacity: 0.5 }}>
            <Library size={44} style={{ color: 'var(--text)', opacity: 0.2, margin: '0 auto 14px' }} />
            <p style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text)', opacity: 0.4 }}>
              No subjects configured for this class yet.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {subjects.map((subjectName, index) => {
              const ac = getSubjectAccent(subjectName);
              // Safely encode the subject name so it can be passed via URL without breaking
              const urlSafeSubject = encodeURIComponent(subjectName.toLowerCase());

              return (
                <button
                  key={subjectName}
                  onClick={() => router.push(`/Materials/${encodeURIComponent(studentClass)}/${urlSafeSubject}`)}
                  className="active:scale-[0.98] transition-transform"
                  style={{
                    width: '100%',
                    borderRadius: 26,
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    padding: '18px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 14,
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'hidden',
                    animation: 'fadeSlideIn 0.35s ease both',
                    animationDelay: `${index * 0.07}s`,
                    textAlign: 'left',
                  }}
                >
                  <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at left, ${ac.bg} 0%, transparent 70%)`, pointerEvents: 'none', borderRadius: 26 }} />
                  <div style={{ position: 'absolute', left: 0, top: '18%', bottom: '18%', width: 3, borderRadius: '0 3px 3px 0', background: ac.color, boxShadow: `0 0 10px ${ac.glow}` }} />

                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, position: 'relative', zIndex: 1, flex: 1, minWidth: 0 }}>
                    <div style={{ width: 52, height: 52, borderRadius: 18, background: ac.bg, border: `1px solid ${ac.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 4px 16px ${ac.glow}` }}>
                      <Book size={22} style={{ color: ac.color }} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <h3 style={{ fontSize: 18, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 1.05, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {subjectName}
                      </h3>
                      <p style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: ac.color, opacity: 0.7, marginTop: 4 }}>
                        Digital Material Vault
                      </p>
                    </div>
                  </div>

                  <div style={{ width: 32, height: 32, borderRadius: 12, background: ac.bg, border: `1px solid ${ac.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative', zIndex: 1 }}>
                    <ArrowRight size={14} style={{ color: ac.color }} />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
