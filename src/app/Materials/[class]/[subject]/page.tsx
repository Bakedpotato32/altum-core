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

  // Hardware back button protection (unchanged)
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
    <main className="min-h-screen pb-32 font-sans bg-background text-text">
      {/* Ambient orbs (preserved with dynamic accent glow) */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-[8%] -right-[12%] w-80 h-80 rounded-full blur-[60px] transition-all duration-500"
          style={{ background: `radial-gradient(circle, ${ac.glow.replace('0.25', '0.09')} 0%, transparent 70%)` }}
        />
        <div className="absolute bottom-[15%] -left-[10%] w-64 h-64 rounded-full bg-blue-500/5 blur-[60px]" />
      </div>

      <div className="max-w-md mx-auto px-5 pt-28">
        {/* Back button */}
        <button
          onClick={() => router.push(`/Materials/${className}`)}
          className="flex items-center gap-1.5 mb-10 active:scale-95 transition-transform text-[10px] font-extrabold tracking-[0.18em] uppercase text-text/40 border-none bg-transparent p-0"
        >
          <ChevronLeft size={15} strokeWidth={3} /> {t('backTo')} {className}
        </button>

        {/* Header section */}
        <div className="mb-8">
          <h1 className="text-5xl font-black italic uppercase tracking-[-0.03em] leading-[0.92] text-text">
            {subjectLabel}{' '}
            <span className="text-4xl" style={{ color: ac.color, textShadow: `0 0 30px ${ac.glow}` }}>
              {t('vault')}
            </span>
          </h1>
          <div className="flex items-center gap-2.5 mt-2.5">
            <div className="w-7 h-0.5 rounded-full" style={{ background: ac.color, opacity: 0.5 }} />
            <p className="text-[9px] font-extrabold tracking-[0.22em] uppercase text-text/30">
              {t('standard')} {className} · {pdfs.length} {t('resources')}
            </p>
          </div>
        </div>

        {/* Loading state */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="relative">
              <div className="absolute inset-0 rounded-full animate-ping" style={{ border: `2px solid ${ac.glow}` }} />
              <div
                className="relative w-14 h-14 rounded-full flex items-center justify-center backdrop-blur-sm"
                style={{ background: ac.bg, border: `1px solid ${ac.border}` }}
              >
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: ac.color }} />
              </div>
            </div>
            <p className="text-[9px] font-black tracking-[0.28em] uppercase opacity-60" style={{ color: ac.color }}>
              {t('openingVault')}
            </p>
          </div>

        ) : pdfs.length === 0 ? (
          /* Empty state */
          <div className="text-center py-16 px-6 rounded-3xl bg-card border border-dashed border-border opacity-70">
            <Library className="w-11 h-11 text-text/20 mx-auto mb-3.5" />
            <p className="text-[10px] font-black tracking-[0.2em] uppercase text-text/40">
              {t('noFilesUploaded')}
            </p>
          </div>

        ) : (
          /* PDF list */
          <div className="flex flex-col gap-3">
            {pdfs.map((pdf, index) => (
              <div
                key={pdf.id}
                className="group relative rounded-2xl bg-card border border-border p-4 flex items-center justify-between gap-3 overflow-hidden transition-all duration-200 hover:shadow-lg hover:border-opacity-50 hover:-translate-y-0.5"
                style={{
                  animation: 'fadeSlideIn 0.35s ease both',
                  animationDelay: `${index * 0.06}s`,
                }}
              >
                {/* Left accent bar */}
                <div
                  className="absolute left-0 top-1/4 bottom-1/4 w-1 rounded-r-full transition-all group-hover:top-1/5 group-hover:bottom-1/5"
                  style={{ background: ac.color, boxShadow: `0 0 10px ${ac.glow}` }}
                />

                {/* Large background number */}
                <div
                  className="absolute right-14 top-1/2 -translate-y-1/2 text-5xl font-black italic opacity-[0.04] pointer-events-none select-none"
                  style={{ color: ac.color }}
                >
                  {String(index + 1).padStart(2, '0')}
                </div>

                {/* PDF info */}
                <div className="flex items-center gap-3.5 flex-1 min-w-0 pl-2.5">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-md"
                    style={{ background: ac.bg, border: `1px solid ${ac.border}`, boxShadow: `0 4px 14px ${ac.glow}` }}
                  >
                    <FileDown size={20} style={{ color: ac.color }} />
                  </div>

                  <div className="min-w-0">
                    <h4 className="text-sm font-black italic uppercase tracking-[-0.01em] leading-tight text-text truncate mb-1">
                      {pdf.title}
                    </h4>
                    <p className="text-[8px] font-black tracking-[0.15em] uppercase text-text/30">
                      {pdf.size} · {new Date(pdf.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                </div>

                {/* Download button */}
                <button
                  onClick={() => handleDownload(pdf.drive_id)}
                  className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 active:scale-90 hover:scale-105"
                  style={{
                    background: `linear-gradient(135deg, ${ac.color}, ${ac.color}cc)`,
                    boxShadow: `0 6px 20px ${ac.glow}`,
                  }}
                >
                  <Download size={18} className="text-white" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeSlideIn {
          from {
            opacity: 0;
            transform: translateY(14px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </main>
  );
}