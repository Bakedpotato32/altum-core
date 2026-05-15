'use client';
import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Book, ChevronLeft, ArrowRight, Loader2, Library } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';
import { supabase } from '@/lib/supabase';

export default function SubjectVault() {
  const router = useRouter();
  const params = useParams();
  const { t } = useLanguage();
  
  const studentClass = decodeURIComponent(params.class as string || "");

  const [subjects, setSubjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch subjects
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

  // 🎨 SOLID GRADIENT COLOR ENGINE (Runs inline, immune to Tailwind bugs)
  const getSubjectAccent = (subjectName: string) => {
    const fallback = { color: '#3b82f6', gradient: 'linear-gradient(135deg, #60a5fa, #3b82f6)' }; // Blue
    if (!subjectName) return fallback;
    
    const palettes = [
      { color: '#f43f5e', gradient: 'linear-gradient(135deg, #fb7185, #e11d48)' }, // Rose/Red
      { color: '#3b82f6', gradient: 'linear-gradient(135deg, #60a5fa, #2563eb)' }, // Blue
      { color: '#f59e0b', gradient: 'linear-gradient(135deg, #fbbf24, #d97706)' }, // Amber/Yellow
      { color: '#8b5cf6', gradient: 'linear-gradient(135deg, #a78bfa, #7c3aed)' }, // Violet
      { color: '#10b981', gradient: 'linear-gradient(135deg, #34d399, #059669)' }, // Emerald
      { color: '#06b6d4', gradient: 'linear-gradient(135deg, #22d3ee, #0284c7)' }, // Cyan
    ];

    let hash = 0;
    for (let i = 0; i < subjectName.length; i++) {
      hash = subjectName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % palettes.length;
    return palettes[index];
  };

  return (
    <div className="p-5 max-w-[500px] mx-auto flex flex-col relative z-10 font-sans">
      
      {/* Back Button */}
      <button
        onClick={() => router.replace('/dashboard')} 
        className="flex items-center gap-1.5 mb-8 text-[10px] font-black tracking-widest uppercase text-slate-400 bg-transparent border-none p-0 cursor-pointer active:scale-95 transition-transform w-fit"
      >
        <ChevronLeft size={16} strokeWidth={3} /> {t('backToHub')}
      </button>

      {/* Header */}
      <div className="mb-8">
        <h1 className="m-0 text-[44px] font-black italic uppercase tracking-tight leading-[0.95] text-slate-900">
          CLASS <span className="text-blue-500">{studentClass}</span>
        </h1>
        <div className="flex items-center gap-2.5 mt-3">
          <div className="w-7 h-[3px] rounded-full bg-blue-500/40" />
          <p className="m-0 text-[9px] font-black tracking-[2.5px] uppercase text-slate-400">
            {t('selectSubject')}
          </p>
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-14 h-14 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm">
            <Loader2 className="animate-spin text-blue-500" size={26} />
          </div>
        </div>
      ) : subjects.length === 0 ? (
        <div className="text-center py-16 px-6 bg-white border-2 border-dashed border-slate-200 rounded-[32px] opacity-80">
          <Library size={42} className="text-slate-300 mx-auto mb-4" />
          <p className="m-0 text-[11px] font-black tracking-widest uppercase text-slate-400">
            No subjects configured for this class yet.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3.5">
          {subjects.map((subjectName, index) => {
            const ac = getSubjectAccent(subjectName);
            const urlSafeSubject = encodeURIComponent(subjectName.toLowerCase());

            return (
              <div
                key={subjectName}
                onClick={() => router.push(`/Materials/${encodeURIComponent(studentClass)}/${urlSafeSubject}`)}
                className="bg-white rounded-[26px] border border-slate-100 p-4 flex items-center justify-between gap-4 cursor-pointer shadow-[0_8px_25px_rgba(0,0,0,0.03)] active:scale-95 transition-transform animate-[fadeSlideIn_0.35s_ease_both]"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  
                  {/* Dynamic Gradient Icon - Using Inline Style to prevent Tailwind Bug */}
                  <div 
                    className="w-[54px] h-[54px] rounded-[18px] flex items-center justify-center shrink-0"
                    style={{ background: ac.gradient, boxShadow: `0 6px 15px ${ac.color}40` }}
                  >
                    <Book size={24} color="#fff" />
                  </div>

                  <div className="min-w-0">
                    <h3 className="m-0 text-[18px] font-black italic uppercase text-slate-900 leading-tight whitespace-nowrap overflow-hidden text-ellipsis">
                      {subjectName}
                    </h3>
                    
                    {/* Dynamic Text Color */}
                    <p 
                      className="m-0 mt-1 text-[9px] font-black tracking-widest uppercase opacity-80"
                      style={{ color: ac.color }}
                    >
                      {t('digitalMaterial')}
                    </p>
                  </div>
                </div>

                <div className="w-10 h-10 rounded-[14px] bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
                  <ArrowRight size={18} style={{ color: ac.color }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Embedded Animation */}
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
