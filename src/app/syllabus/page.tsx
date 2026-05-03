'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, CheckCircle2, Circle, Loader2, ListChecks } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/LanguageContext';

export default function StudentSyllabus() {
  const router = useRouter();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [chapters, setChapters] = useState<any[]>([]);
  const [activeSubject, setActiveSubject] = useState("mathematics");
  const [userClass, setUserClass] = useState<string | null>(null);

  const subjects = ["mathematics", "science", "english", "social-studies"];

  useEffect(() => {
    const savedClass = localStorage.getItem('studentClass') || localStorage.getItem('class');
    setUserClass(savedClass || "12th");
  }, []);

  useEffect(() => {
    if (!userClass) return;

    async function fetchSyllabus() {
      setLoading(true);
      const { data, error } = await supabase
        .from('syllabus')
        .select('*')
        .eq('class', userClass)
        .eq('subject', activeSubject.toLowerCase())
        .order('order_index', { ascending: true });

      if (!error) setChapters(data || []);
      setLoading(false);
    }
    fetchSyllabus();
  }, [activeSubject, userClass]);

  const completedCount = chapters.filter(c => c.is_completed).length;
  const progressPercent = chapters.length > 0 ? Math.round((completedCount / chapters.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-transparent p-6 pt-24 pb-32 text-[var(--text)] font-sans">
      <button 
        onClick={() => router.push('/dashboard')} 
        className="flex items-center gap-2 text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-10 active:scale-90"
      >
        <ChevronLeft size={14} /> {t('backToDashboard')}
      </button>

      <div className="mb-10">
        <div className="flex justify-between items-end mb-4">
           <div>
             <h1 className="text-4xl font-black italic uppercase tracking-tighter leading-none">{t('syllabus')} <span className="text-blue-500">{t('pulse')}</span></h1>
             <p className="text-zinc-500 text-[9px] font-black uppercase tracking-[3px] mt-2 italic opacity-60">{t('classWord')} {userClass} • {t('progress')}</p>
           </div>
           <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 border border-blue-500/20">
              <ListChecks size={24} />
           </div>
        </div>
        
        <div className="flex items-center gap-4 bg-[var(--card)] p-4 rounded-[30px] border border-[var(--border)] shadow-sm">
           <div className="flex-1 h-2 bg-zinc-500/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-600 to-blue-400 shadow-[0_0_15px_#3b82f6] transition-all duration-1000" 
                style={{ width: `${progressPercent}%` }} 
              />
           </div>
           <span className="text-2xl font-black italic text-[var(--text)] tracking-tighter">{progressPercent}%</span>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-8 no-scrollbar">
        {subjects.map(s => {
          // Dynamic key resolution: "social-studies" -> "socialstudies" to match dictionary
          const dictKey = s.replace('-', '');
          return (
            <button 
              key={s} 
              onClick={() => setActiveSubject(s)}
              className={`px-7 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${activeSubject === s ? 'bg-blue-600 border-blue-400 text-white shadow-xl' : 'bg-[var(--card)] border-[var(--border)] text-zinc-500'}`}
            >
              {t(dictKey)}
            </button>
          );
        })}
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="flex flex-col items-center py-20 gap-4">
             <Loader2 className="animate-spin text-blue-500" size={32} />
             <p className="text-[8px] font-black uppercase tracking-[4px] text-zinc-800">{t('readingCloudData')}</p>
          </div>
        ) : chapters.length === 0 ? (
          <div className="py-20 text-center border border-dashed border-[var(--border)] rounded-[40px] bg-[var(--card)]/30">
            <p className="text-zinc-500 font-bold italic uppercase text-[10px] tracking-widest">{t('noChaptersAdded')} {t(activeSubject.replace('-',''))}.</p>
          </div>
        ) : (
          chapters.map(ch => (
            <div key={ch.id} className="p-6 bg-[var(--card)] border border-[var(--border)] rounded-[30px] flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-5">
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${ch.is_completed ? 'bg-green-500 text-black' : 'bg-zinc-500/10 text-zinc-400'}`}>
                   {ch.is_completed ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                </div>
                <span className={`text-[12px] font-bold uppercase tracking-tight ${ch.is_completed ? 'text-zinc-500 line-through' : 'text-[var(--text)]'}`}>
                  {ch.chapter_name}
                </span>
              </div>
              {ch.is_completed && <div className="w-1.5 h-1.5 bg-green-500 rounded-full shadow-[0_0_8px_#22c55e]" />}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
