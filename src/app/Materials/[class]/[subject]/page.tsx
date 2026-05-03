
'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { FileDown, Download, ChevronLeft, Loader2, Library } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';

export default function PDFVault() {
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

  return (
    <main className="min-h-screen bg-transparent text-[var(--text)] p-6 pt-28 pb-32 font-sans">
      <Link href={`/Materials/${className}`} className="flex items-center gap-2 text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-10 active:scale-95 transition-all">
        <ChevronLeft size={14} /> {t('backTo')} {className}
      </Link>
      
      <div className="mb-12">
        <h1 className="text-4xl font-black italic uppercase tracking-tighter mb-1 text-[var(--text)]">
          {decodeURIComponent(subject as string)} <span className="text-blue-500 text-3xl not-italic">{t('vault')}</span>
        </h1>
        <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[3px] italic opacity-60">
          {t('standard')} {className} • {pdfs.length} {t('resources')}
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="animate-spin text-blue-500" size={32} />
          <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">{t('openingVault')}</p>
        </div>
      ) : pdfs.length === 0 ? (
        <div className="text-center py-20 bg-[var(--card)] rounded-[40px] border border-dashed border-[var(--border)] shadow-sm">
          <Library className="mx-auto text-zinc-500/20 mb-4" size={48} />
          <p className="text-zinc-500 font-bold text-sm italic">{t('noFilesUploaded')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pdfs.map((pdf) => (
            <div key={pdf.id} className="p-6 rounded-[32px] bg-[var(--card)] border border-[var(--border)] flex items-center justify-between shadow-sm group active:scale-[0.98] transition-all">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500">
                  <FileDown size={22} />
                </div>
                <div>
                  <h4 className="text-sm font-black italic uppercase tracking-tight text-[var(--text)] leading-none mb-1.5">{pdf.title}</h4>
                  <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest leading-none">
                    {pdf.size} • {new Date(pdf.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
              </div>
              <button onClick={() => handleDownload(pdf.drive_id)} className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg active:scale-90 transition-all">
                <Download size={20} />
              </button>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
