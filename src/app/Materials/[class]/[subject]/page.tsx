'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { FileDown, Download, ChevronLeft, Loader2, Library } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';

export default function PDFVault() {
  const router = useRouter();
  const { class: className, subject } = useParams();
  const { t } = useLanguage();
  const [pdfs, setPdfs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const backPressCount = useRef(0);

  // --- BULLETPROOF HARDWARE BACK BUTTON ---
  useEffect(() => {
    window.history.pushState({ dummy: true }, '', window.location.href);

    const handleHardwareBack = () => {
      if (backPressCount.current === 0) {
        backPressCount.current = 1;
        window.history.pushState({ dummy: true }, '', window.location.href);
        router.push(`/Materials/${className}`);
        setTimeout(() => {
          backPressCount.current = 0;
        }, 2000);
      }
    };

    window.addEventListener('popstate', handleHardwareBack);
    return () => {
      window.removeEventListener('popstate', handleHardwareBack);
    };
  }, [router, className]);
  // ----------------------------------------

  useEffect(() => {
    async function fetchMaterials() {
      if (!className || !subject) return;
      setLoading(true);
      const cleanClass = decodeURIComponent(className as string);
      const cleanSubject = decodeURIComponent(subject as string).toLowerCase();
      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .eq('class', cleanClass)
        .eq('subject', cleanSubject);
      if (data) setPdfs(data);
      if (error) console.error("Vault Query Error:", error);
      setLoading(false);
    }
    fetchMaterials();
  }, [className, subject]);

  const handleDownload = (idOrLink: string) => {
    if (idOrLink.startsWith('http')) window.open(idOrLink, '_blank');
    else window.open(`https://drive.google.com/uc?export=download&id=${idOrLink}`, '_blank');
  };

  const subjectAccents: Record<string, { color: string; glow: string; bg: string; border: string }> = {
    english:          { color: '#a855f7', glow: 'rgba(168,85,247,0.25)', bg: 'rgba(168,85,247,0.08)', border: 'rgba(168,85,247,0.2)' },
    science:          { color: '#10b981', glow: 'rgba(16,185,129,0.25)', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)' },
    mathematics:      { color: '#3b82f6', glow: 'rgba(59,130,246,0.25)', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.2)' },
    'social-studies': { color: '#f97316', glow: 'rgba(249,115,22,0.25)', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.2)' },
  };

  const cleanSubjectKey = decodeURIComponent(subject as string).toLowerCase();
  const ac = subjectAccents[cleanSubjectKey] || subjectAccents['mathematics'];
  const subjectLabel = decodeURIComponent(subject as string);

  return (
    <main className="min-h-screen pb-32 font-sans" style={{ background: 'var(--background)', color: 'var(--text)' }}>

      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div style={{ position: 'absolute', top: '-8%', right: '-12%', width: 320, height: 320, borderRadius: '50%', background: `radial-gradient(circle, ${ac.glow.replace('0.25','0.09')} 0%, transparent 70%)`, filter: 'blur(50px)', transition: 'background 0.5s' }} />
        <div style={{ position: 'absolute', bottom: '15%', left: '-10%', width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.05) 0%, transparent 70%)', filter: 'blur(50px)' }} />
      </div>

      <div className="max-w-md mx-auto px-5 pt-28">

        <button
          onClick={() => router.push(`/Materials/${className}`)}
          className="flex items-center gap-1.5 mb-10 active:scale-95 transition-transform"
          style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text)', opacity: 0.4, border: 'none', background: 'transparent', padding: 0 }}
        >
          <ChevronLeft size={15} strokeWidth={3} /> {t('backTo')} {className}
        </button>

        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 44, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-0.03em', lineHeight: 0.92, color: 'var(--text)' }}>
            {subjectLabel}{' '}
            <span style={{ color: ac.color, textShadow: `0 0 30px ${ac.glow}`, fontSize: 36 }}>
              {t('vault')}
            </span>
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
            <div style={{ width: 28, height: 2, background: ac.color, opacity: 0.5, borderRadius: 2 }} />
            <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--text)', opacity: 0.3 }}>
              {t('standard')} {className} · {pdfs.length} {t('resources')}
            </p>
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 16 }}>
            <div style={{ position: 'relative' }}>
              <div className="absolute inset-0 rounded-full animate-ping" style={{ border: `2px solid ${ac.glow}` }} />
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: ac.bg, border: `1px solid ${ac.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Loader2 size={22} className="animate-spin" style={{ color: ac.color }} />
              </div>
            </div>
            <p style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.28em', textTransform: 'uppercase', color: ac.color, opacity: 0.6 }}>
              {t('openingVault')}
            </p>
          </div>

        ) : pdfs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 24px', borderRadius: 28, background: 'var(--card)', border: '1px dashed var(--border)', opacity: 0.5 }}>
            <Library size={44} style={{ color: 'var(--text)', opacity: 0.2, margin: '0 auto 14px' }} />
            <p style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text)', opacity: 0.4 }}>
              {t('noFilesUploaded')}
            </p>
          </div>) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {pdfs.map((pdf, index) => (
              <div
                key={pdf.id}
                style={{
                  borderRadius: 26,
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  padding: '16px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  position: 'relative',
                  overflow: 'hidden',
                  animation: 'fadeSlideIn 0.35s ease both',
                  animationDelay: `${index * 0.06}s`,
                }}
              >
                <div style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: 3, borderRadius: '0 3px 3px 0', background: ac.color, boxShadow: `0 0 10px ${ac.glow}` }} />

                <div style={{ position: 'absolute', right: 60, top: '50%', transform: 'translateY(-50%)', fontSize: 52, fontWeight: 900, fontStyle: 'italic', color: ac.color, opacity: 0.04, lineHeight: 1, pointerEvents: 'none', userSelect: 'none' }}>
                  {String(index + 1).padStart(2, '0')}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0, paddingLeft: 10 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 16, background: ac.bg, border: `1px solid ${ac.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 4px 14px ${ac.glow}` }}>
                    <FileDown size={20} style={{ color: ac.color }} />
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <h4 style={{ fontSize: 13, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-0.01em', lineHeight: 1.1, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 5 }}>
                      {pdf.title}
                    </h4>
                    <p style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text)', opacity: 0.3 }}>
                      {pdf.size} · {new Date(pdf.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleDownload(pdf.drive_id)}
                  className="active:scale-90 transition-transform"
                  style={{ width: 44, height: 44, borderRadius: 15, background: `linear-gradient(135deg, ${ac.color}, ${ac.color}cc)`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 6px 20px ${ac.glow}`, border: 'none', cursor: 'pointer' }}
                >
                  <Download size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </main>
  );
}
