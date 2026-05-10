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
  
  const studentClass = decodeURIComponent(params.class as string || "");
  const backPressCount = useRef(0);

  const [subjects, setSubjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Hardware back button (unchanged)
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

  // Fetch subjects (unchanged)
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

  // Dynamic color engine (unchanged)
  const getSubjectAccent = (subjectName: string) => {
    const palettes = [
      { color: '#3b82f6', glow: 'rgba(59,130,246,0.25)',  bg: 'rgba(59,130,246,0.07)',  border: 'rgba(59,130,246,0.2)' },
      { color: '#10b981', glow: 'rgba(16,185,129,0.25)',  bg: 'rgba(16,185,129,0.07)',  border: 'rgba(16,185,129,0.2)' },
      { color: '#a855f7', glow: 'rgba(168,85,247,0.25)',  bg: 'rgba(168,85,247,0.07)',  border: 'rgba(168,85,247,0.2)' },
      { color: '#f97316', glow: 'rgba(249,115,22,0.25)',  bg: 'rgba(249,115,22,0.07)',  border: 'rgba(249,115,22,0.2)' },
      { color: '#ec4899', glow: 'rgba(236,72,153,0.25)',  bg: 'rgba(236,72,153,0.07)',  border: 'rgba(236,72,153,0.2)' },
      { color: '#06b6d4', glow: 'rgba(6,182,212,0.25)',   bg: 'rgba(6,182,212,0.07)',   border: 'rgba(6,182,212,0.2)' },
      { color: '#eab308', glow: 'rgba(234,179,8,0.25)',   bg: 'rgba(234,179,8,0.07)',   border: 'rgba(234,179,8,0.2)' },
    ];
    let hash = 0;
    for (let i = 0; i < subjectName.length; i++) {
      hash = subjectName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % palettes.length;
    return palettes[index];
  };

  return (
    <div className="min-h-screen pb-32 font-sans bg-background text-text">
      {/* Ambient orbs */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div className="absolute -top-[8%] -right-[12%] w-80 h-80 rounded-full bg-blue-500/10 blur-[60px]" />
        <div className="absolute bottom-[15%] -left-[10%] w-64 h-64 rounded-full bg-purple-500/8 blur-[60px]" />
      </div>

      <div className="max-w-md mx-auto px-5 pt-28">
        {/* Back button */}
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-1.5 mb-10 active:scale-95 transition-all text-[10px] font-extrabold tracking-[0.18em] uppercase text-text/40"
        >
          <ChevronLeft size={15} strokeWidth={3} /> {t('backToHub')}
        </button>

        {/* Header */}
        <div className="mb-9">
          <h1 className="text-5xl font-black italic uppercase tracking-[-0.03em] leading-[0.92] text-text">
            {t('classWord')}{' '}
            <span className="text-blue-600" style={{ textShadow: '0 0 30px rgba(59,130,246,0.35)' }}>
              {studentClass}
            </span>
          </h1>
          <div className="flex items-center gap-2.5 mt-2.5">
            <div className="w-7 h-0.5 rounded-full bg-blue-500/50" />
            <p className="text-[9px] font-extrabold tracking-[0.25em] uppercase text-blue-500/70">
              {t('selectSubjectVault')}
            </p>
          </div>
        </div>

        {/* Loading state */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="animate-spin w-8 h-8 text-blue-500" />
          </div>
        ) : subjects.length === 0 ? (
          /* Empty state */
          <div className="text-center py-16 px-6 rounded-3xl bg-card border border-dashed border-border opacity-60">
            <Library className="w-11 h-11 text-text/20 mx-auto mb-3.5" />
            <p className="text-[10px] font-black tracking-[0.2em] uppercase text-text/40">
              No subjects configured for this class yet.
            </p>
          </div>
        ) : (
          /* Subject list */
          <div className="flex flex-col gap-3">
            {subjects.map((subjectName, index) => {
              const ac = getSubjectAccent(subjectName);
              const urlSafeSubject = encodeURIComponent(subjectName.toLowerCase());

              return (
                <button
                  key={subjectName}
                  onClick={() => router.push(`/Materials/${encodeURIComponent(studentClass)}/${urlSafeSubject}`)}
                  className="group relative w-full rounded-2xl bg-card border border-border p-4 flex items-center justify-between gap-3.5 cursor-pointer transition-all duration-200 active:scale-[0.98] hover:shadow-lg hover:-translate-y-0.5 text-left overflow-hidden"
                  style={{
                    animation: 'fadeSlideIn 0.35s ease both',
                    animationDelay: `${index * 0.07}s`,
                  }}
                >
                  {/* Background radial gradient */}
                  <div
                    className="absolute inset-0 pointer-events-none rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ background: `radial-gradient(ellipse at left, ${ac.bg} 0%, transparent 70%)` }}
                  />
                  
                  {/* Left accent bar */}
                  <div
                    className="absolute left-0 top-[18%] bottom-[18%] w-1 rounded-r-full transition-all group-hover:top-[12%] group-hover:bottom-[12%]"
                    style={{ background: ac.color, boxShadow: `0 0 10px ${ac.glow}` }}
                  />

                  {/* Content */}
                  <div className="flex items-center gap-4 relative z-10 flex-1 min-w-0">
                    <div
                      className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 shadow-md transition-transform group-hover:scale-105"
                      style={{ background: ac.bg, border: `1px solid ${ac.border}`, boxShadow: `0 4px 16px ${ac.glow}` }}
                    >
                      <Book size={22} style={{ color: ac.color }} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-lg font-black italic uppercase tracking-[-0.02em] leading-tight text-text truncate">
                        {subjectName}
                      </h3>
                      <p className="text-[8px] font-extrabold tracking-[0.18em] uppercase mt-1" style={{ color: ac.color, opacity: 0.7 }}>
                        Digital Material Vault
                      </p>
                    </div>
                  </div>

                  {/* Arrow button */}
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all group-hover:scale-110 group-hover:rotate-3"
                    style={{ background: ac.bg, border: `1px solid ${ac.border}` }}
                  >
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