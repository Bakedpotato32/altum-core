'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';

export default function MaterialsPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const classes = ["5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"];

  const filteredClasses = classes.filter(cls =>
    cls.toLowerCase().includes(query.toLowerCase())
  );

  const classAccents: Record<string, { color: string; glow: string; bg: string; border: string }> = {
    "5th":  { color: '#3b82f6', glow: 'rgba(59,130,246,0.25)',  bg: 'rgba(59,130,246,0.07)',  border: 'rgba(59,130,246,0.18)'  },
    "6th":  { color: '#10b981', glow: 'rgba(16,185,129,0.25)',  bg: 'rgba(16,185,129,0.07)',  border: 'rgba(16,185,129,0.18)'  },
    "7th":  { color: '#a855f7', glow: 'rgba(168,85,247,0.25)',  bg: 'rgba(168,85,247,0.07)',  border: 'rgba(168,85,247,0.18)'  },
    "8th":  { color: '#f59e0b', glow: 'rgba(245,158,11,0.25)',  bg: 'rgba(245,158,11,0.07)',  border: 'rgba(245,158,11,0.18)'  },
    "9th":  { color: '#ef4444', glow: 'rgba(239,68,68,0.25)',   bg: 'rgba(239,68,68,0.07)',   border: 'rgba(239,68,68,0.18)'   },
    "10th": { color: '#06b6d4', glow: 'rgba(6,182,212,0.25)',   bg: 'rgba(6,182,212,0.07)',   border: 'rgba(6,182,212,0.18)'   },
    "11th": { color: '#f97316', glow: 'rgba(249,115,22,0.25)',  bg: 'rgba(249,115,22,0.07)',  border: 'rgba(249,115,22,0.18)'  },
    "12th": { color: '#ec4899', glow: 'rgba(236,72,153,0.25)',  bg: 'rgba(236,72,153,0.07)',  border: 'rgba(236,72,153,0.18)'  },
  };return (
    <div className="min-h-svh pb-32 font-sans" style={{ background: 'var(--background)', color: 'var(--text)' }}>

      {/* Ambient orbs */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div style={{ position: 'absolute', top: '-8%', right: '-12%', width: 340, height: 340, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.09) 0%, transparent 70%)', filter: 'blur(50px)' }} />
        <div style={{ position: 'absolute', bottom: '15%', left: '-10%', width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,85,247,0.06) 0%, transparent 70%)', filter: 'blur(50px)' }} />
      </div>

      <div className="max-w-md mx-auto px-5 pt-28">

        {/* ── Header ── */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 46, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-0.03em', lineHeight: 0.92, color: 'var(--text)' }}>
            {t('study')}{' '}
            <span style={{ color: '#3b82f6', textShadow: '0 0 30px rgba(59,130,246,0.35)' }}>
              {t('vault')}
            </span>
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
            <div style={{ width: 28, height: 2, background: 'rgba(59,130,246,0.5)', borderRadius: 2 }} />
            <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.25em', textTransform: 'uppercase', color: 'var(--text)', opacity: 0.3 }}>
              {t('digitalLibraryNode')}
            </p>
          </div>
        </div>

        {/* ── Search ── */}
        <div style={{ position: 'relative', marginBottom: 28 }}>
          <div style={{ position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', zIndex: 1 }}>
            <Search size={16} style={{ color: 'var(--text)', opacity: 0.3 }} />
          </div>
          <input
            type="text"
            placeholder={t('searchStandard')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              width: '100%',
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 20,
              padding: '16px 20px 16px 46px',
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--text)',
              outline: 'none',
              boxSizing: 'border-box',
              fontFamily: 'inherit',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = 'rgba(59,130,246,0.5)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.08)'; }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
          />
        </div>{/* ── Class Grid ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {filteredClasses.map((cls, index) => {
            const ac = classAccents[cls] || classAccents["5th"];
            return (
              <button
                key={cls}
                onClick={() => router.push(`/Materials/${cls}`)}
                className="active:scale-95 transition-transform"
                style={{
                  borderRadius: 28,
                  background: ac.bg,
                  border: `1px solid ${ac.border}`,
                  padding: '28px 20px 22px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  position: 'relative',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  boxShadow: `0 8px 28px ${ac.glow}`,
                  animation: 'fadeSlideIn 0.35s ease both',
                  animationDelay: `${index * 0.05}s`,
                  textAlign: 'left',
                }}
              >
                {/* Watermark number */}
                <div style={{ position: 'absolute', right: -8, bottom: -12, fontSize: 80, fontWeight: 900, fontStyle: 'italic', color: ac.color, opacity: 0.08, lineHeight: 1, letterSpacing: '-0.04em', userSelect: 'none', pointerEvents: 'none' }}>
                  {cls}
                </div>

                {/* Top accent line */}
                <div style={{ width: 24, height: 3, borderRadius: 2, background: ac.color, marginBottom: 16, boxShadow: `0 0 8px ${ac.glow}` }} />

                {/* Class number */}
                <h2 style={{ fontSize: 40, fontWeight: 900, fontStyle: 'italic', letterSpacing: '-0.04em', lineHeight: 0.9, color: ac.color, textShadow: `0 0 20px ${ac.glow}`, marginBottom: 8, position: 'relative', zIndex: 1 }}>
                  {cls}
                </h2>

                {/* Label */}
                <p style={{ fontSize: 8, fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text)', opacity: 0.35, position: 'relative', zIndex: 1 }}>
                  {t('standard')}
                </p>

                {/* Arrow */}
                <div style={{ position: 'absolute', bottom: 14, right: 14, width: 26, height: 26, borderRadius: 10, background: ac.bg, border: `1px solid ${ac.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ArrowRight size={12} style={{ color: ac.color, opacity: 0.7 }} />
                </div>
              </button>
            );
          })}
        </div>

        {/* Empty state */}
        {filteredClasses.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 24px', borderRadius: 28, background: 'var(--card)', border: '1px dashed var(--border)', opacity: 0.5, marginTop: 8 }}>
            <Search size={32} style={{ color: 'var(--text)', opacity: 0.2, margin: '0 auto 12px' }} />
            <p style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text)', opacity: 0.4 }}>
              No class found
            </p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        input::placeholder { opacity: 0.35; }
      `}</style>
    </div>
  );
}