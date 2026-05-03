
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
    { name: "English", id: "english" },
    { name: "Science", id: "science" },
    { name: "Mathematics", id: "mathematics" },
    { name: "Social Studies", id: "social-studies" }
  ];

  return (
    <div className="px-6 pt-28 pb-32 min-h-svh bg-transparent font-sans">
      <div className="max-w-md mx-auto space-y-8">
        
        <button onClick={() => router.push('/Materials')} className="flex items-center gap-2 text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-4">
          <ChevronLeft size={14} /> {t('backToHub')}
        </button>

        <div>
          <h1 className="text-4xl font-black italic uppercase tracking-tighter text-[var(--text)]">
            {t('classWord')} <span className="text-blue-500">{studentClass}</span>
          </h1>
          <p className="text-blue-500 text-[10px] font-black uppercase tracking-[3px] mt-1">{t('selectSubjectVault')}</p>
        </div>

        <div className="space-y-4">
          {subjects.map((sub) => (
            <button 
              key={sub.id}
              onClick={() => router.push(`/Materials/${studentClass}/${sub.id}`)}
              className="w-full p-6 bg-[var(--card)] border border-[var(--border)] rounded-[35px] flex items-center justify-between active:scale-[0.98] transition-all shadow-sm group"
            >
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500">
                  <Book size={20} />
                </div>
                <div className="text-left">
                  {/* Keep Subject names in English since they are IDs/proper nouns, but translate the subtitle */}
                  <h3 className="text-lg font-black italic uppercase text-[var(--text)] leading-none">{sub.name}</h3>
                  <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mt-1">{t('coreResources')}</p>
                </div>
              </div>
              <ArrowRight className="text-zinc-800 group-hover:text-blue-500 transition-colors" size={16} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
