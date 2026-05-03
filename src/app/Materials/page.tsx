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

  return (
    <div className="px-6 pt-28 pb-32 min-h-svh bg-transparent font-sans">
      <div className="max-w-md mx-auto space-y-8">
        
        <div>
          <h1 className="text-4xl font-black italic uppercase tracking-tighter text-[var(--text)]">
            {t('study')} <span className="text-blue-500">{t('vault')}</span>
          </h1>
          <p className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-[3px] mt-1 italic">{t('digitalLibraryNode')}</p>
        </div>

        <div className="relative group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-blue-500 transition-colors" size={18} />
          <input 
            type="text"
            placeholder={t('searchStandard')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-[var(--card)] border border-[var(--border)] rounded-[24px] py-5 pl-14 pr-6 text-sm font-bold text-[var(--text)] outline-none focus:border-blue-500/50 transition-all placeholder:text-zinc-700 shadow-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {filteredClasses.map((cls) => (
            <button 
              key={cls}
              onClick={() => router.push(`/Materials/${cls}`)}
              className="p-8 bg-[var(--card)] border border-[var(--border)] rounded-[35px] active:scale-95 transition-all shadow-md text-center group relative overflow-hidden"
            >
              <h2 className="text-4xl font-black italic text-[var(--text)] group-hover:text-blue-500 transition-colors">{cls}</h2>
              <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase mt-2 tracking-widest">{t('standard')}</p>
              <ArrowRight className="absolute bottom-4 right-4 text-zinc-800/20 group-hover:text-blue-500/30" size={12} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
