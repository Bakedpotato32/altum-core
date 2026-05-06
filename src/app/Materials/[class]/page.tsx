'use client';
import React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Book, ChevronLeft, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';

export default function SubjectVault() {
  const router = useRouter();
  const params = useParams();
  const { t } = useLanguage();
  const studentClass = params.class;

  const subjects = [
    { name: "English",       id: "english"       },
    { name: "Science",       id: "science"        },
    { name: "Mathematics",   id: "mathematics"    },
    { name: "Social Studies",id: "social-studies" },
  ];

  const subjectAccents: Record<string, { color: string; glow: string; bg: string; border: string; label: string }> = {
    english:        { color: '#a855f7', glow: 'rgba(168,85,247,0.25)',  bg: 'rgba(168,85,247,0.07)',  border: 'rgba(168,85,247,0.2)',  label: 'Language & Literature' },
    science:        { color: '#10b981', glow: 'rgba(16,185,129,0.25)',  bg: 'rgba(16,185,129,0.07)',  border: 'rgba(16,185,129,0.2)',  label: 'Physics · Chemistry · Bio' },
    mathematics:    { color: '#3b82f6', glow: 'rgba(59,130,246,0.25)',  bg: 'rgba(59,130,246,0.07)',  border: 'rgba(59,130,246,0.2)',  label: 'Numbers & Algebra' },
    'social-studies':{ color: '#f97316', glow: 'rgba(249,115,22,0.25)', bg: 'rgba(249,115,22,0.07)', border: 'rgba(249,115,22,0.2)',  label: 'History · Geo · Civics' },
  };return (
    <div className="min-h-svh pb-32 font-sans" style={{ background: 'var(--background)', color: 'var(--text)' }}>

      {/* Ambient orbs */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div style={{ position: 'absolute', top: '-8%', right: '-12%', width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)', filter: 'blur(50px)' }} />
        <div style={{ position: 'absolute', bottom: '15%', left: '-10%', width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,85,247,0.06) 0%, transparent 70%)', filter: 'blur(50px)' }} />
      </div>

      <div className="max-w-md mx-auto px-5 pt-28">

        {/* ── Back ── */}
        <button
          onClick={() => router.push('/Materials')}
          className="flex items-center gap-1.5 mb-10 active:scale-95 transition-transform"
          style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text)', opacity: 0.4 }}
        >
          <ChevronLeft size={15} strokeWidth={3} /> {t('backToHub')}
        </button>

        {/* ── Header ── */}
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
        </div>{/* ── Subject Cards ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {subjects.map((sub, index) => {
            const ac = subjectAccents[sub.id] || subjectAccents['mathematics'];
            return (
              <button
                key={sub.id}
                onClick={() => router.push(`/Materials/${studentClass}/${sub.id}`)}
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
                {/* Hover shimmer layer */}
                <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at left, ${ac.bg} 0%, transparent 70%)`, pointerEvents: 'none', borderRadius: 26 }} />

                {/* Left color bar */}
                <div style={{ position: 'absolute', left: 0, top: '18%', bottom: '18%', width: 3, borderRadius: '0 3px 3px 0', background: ac.color, boxShadow: `0 0 10px ${ac.glow}` }} />

                <div style={{ display: 'flex', alignItems: 'center', gap: 16, position: 'relative', zIndex: 1, flex: 1, minWidth: 0 }}>
                  {/* Icon box */}
                  <div style={{ width: 52, height: 52, borderRadius: 18, background: ac.bg, border: `1px solid ${ac.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 4px 16px ${ac.glow}` }}>
                    <Book size={22} style={{ color: ac.color }} />
                  </div>

                  {/* Text */}
                  <div style={{ minWidth: 0 }}>
                    <h3 style={{ fontSize: 18, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 1.05, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {sub.name}
                    </h3>
                    <p style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: ac.color, opacity: 0.7, marginTop: 4 }}>
                      {ac.label}
                    </p>
                  </div>
                </div>

                {/* Arrow */}
                <div style={{ width: 32, height: 32, borderRadius: 12, background: ac.bg, border: `1px solid ${ac.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative', zIndex: 1 }}>
                  <ArrowRight size={14} style={{ color: ac.color }} />
                </div>
              </button>
            );
          })}
        </div>
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