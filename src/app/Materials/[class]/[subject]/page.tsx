'use client';
import React, { useState, useEffect } from 'react';
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

  const subjectAccents: Record<string, { color: string; gradient: string }> = {
    english:          { color: '#8e2de2', gradient: 'linear-gradient(135deg, #8e2de2, #4a00e0)' },
    science:          { color: '#10b981', gradient: 'linear-gradient(135deg, #22c55e, #059669)' },
    mathematics:      { color: '#3a7bd5', gradient: 'linear-gradient(135deg, #00d2ff, #3a7bd5)' },
    'social-studies': { color: '#f09819', gradient: 'linear-gradient(135deg, #f09819, #edde5d)' },
  };

  const cleanSubjectKey = decodeURIComponent(subject as string).toLowerCase();
  const ac = subjectAccents[cleanSubjectKey] || { color: '#3a7bd5', gradient: 'linear-gradient(135deg, #00d2ff, #3a7bd5)' };
  const subjectLabel = decodeURIComponent(subject as string);

  return (
    <div style={{ minHeight: '100svh', background: 'var(--background)', color: 'var(--text)', padding: '40px 20px 120px', maxWidth: '500px', margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      
      <div style={{ position: 'fixed', inset: 0, zIndex: -10, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '320px', height: '320px', borderRadius: '50%', background: `radial-gradient(circle, ${ac.color}15 0%, transparent 70%)`, filter: 'blur(60px)', transition: 'background 0.5s ease' }} />
        <div style={{ position: 'absolute', bottom: '15%', left: '-10%', width: '260px', height: '260px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.03) 0%, transparent 70%)', filter: 'blur(60px)' }} />
      </div>

      <button
        onClick={() => router.back()} // Naturally drops back to SubjectVault
        style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '40px', fontSize: '10px', fontWeight: 900, letterSpacing: '2px', textTransform: 'uppercase', color: '#94a3b8', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
      >
        <ChevronLeft size={16} strokeWidth={3} /> {t('backTo') || 'BACK TO'} {className}
      </button>

      <div style={{ marginBottom: '36px' }}>
        <h1 style={{ margin: 0, fontSize: '44px', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-1px', lineHeight: 0.92, color: 'var(--text)' }}>
          {subjectLabel}{' '}
          <span style={{ color: ac.color }}>
            {t('vault') || 'VAULT'}
          </span>
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '12px' }}>
          <div style={{ width: '28px', height: '3px', borderRadius: '2px', background: ac.color, opacity: 0.5 }} />
          <p style={{ margin: 0, fontSize: '9px', fontWeight: 900, letterSpacing: '2.5px', textTransform: 'uppercase', color: '#94a3b8' }}>
            {t('standard') || 'STANDARD'} {className} · {pdfs.length} {t('resources') || 'RESOURCES'}
          </p>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyItems: 'center', padding: '60px 0', gap: '16px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Loader2 className="animate-spin" size={24} color={ac.color} />
          </div>
          <p style={{ margin: 0, fontSize: '10px', fontWeight: 900, letterSpacing: '2px', textTransform: 'uppercase', color: '#94a3b8' }}>
            {t('openingVault') || 'OPENING VAULT...'}
          </p>
        </div>
      ) : pdfs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 24px', borderRadius: '32px', background: 'var(--card)', border: '2px dashed var(--border)', opacity: 0.7 }}>
          <Library size={42} color="#cbd5e1" style={{ margin: '0 auto 16px' }} />
          <p style={{ margin: 0, fontSize: '11px', fontWeight: 900, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#94a3b8' }}>
            {t('noFilesUploaded') || 'NO FILES UPLOADED YET'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {pdfs.map((pdf, index) => (
            <div
              key={pdf.id}
              style={{
                background: 'var(--card)', borderRadius: '24px', border: '1px solid var(--border)', padding: '16px 20px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
                boxShadow: '0 8px 25px rgba(0,0,0,0.03)', position: 'relative', overflow: 'hidden',
                animation: 'fadeSlideIn 0.35s ease both', animationDelay: `${index * 0.05}s`
              }}
            >
              <div style={{ position: 'absolute', left: 0, top: '25%', bottom: '25%', width: '4px', borderRadius: '0 4px 4px 0', background: ac.gradient }} />

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: 0, paddingLeft: '6px' }}>
                <div style={{ width: '50px', height: '50px', borderRadius: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FileDown size={22} color={ac.color} />
                </div>

                <div style={{ minWidth: 0 }}>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--text)', lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {pdf.title}
                  </h4>
                  <p style={{ margin: 0, fontSize: '9px', fontWeight: 900, letterSpacing: '1px', textTransform: 'uppercase', color: '#94a3b8' }}>
                    {pdf.size} · {new Date(pdf.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleDownload(pdf.drive_id)}
                style={{ width: '46px', height: '46px', borderRadius: '16px', background: ac.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: 'none', cursor: 'pointer', boxShadow: '0 6px 15px rgba(0,0,0,0.1)', transition: 'transform 0.2s' }}
                onMouseDown={e => e.currentTarget.style.transform = 'scale(0.92)'}
                onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                <Download size={20} color="#fff" />
              </button>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
