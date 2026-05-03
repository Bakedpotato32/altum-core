'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { BookOpen, ChevronRight, Zap, ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/LanguageContext';

export default function StudentPerformance() {
  const router = useRouter();
  const { t } = useLanguage();
  const [scores, setScores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentId, setStudentId] = useState("");

  useEffect(() => {
    async function fetchData() {
      const activeId = localStorage.getItem('studentId');
      if (!activeId) return;
      setStudentId(activeId);

      const { data } = await supabase
        .from('test_scores')
        .select('*')
        .eq('student_id', activeId)
        .order('test_date', { ascending: false });

      if (data) setScores(data);
      setLoading(false);
    }
    fetchData();
  }, []);

  const totalObtained = scores.reduce((acc, curr) => acc + Number(curr.marks_obtained), 0);
  const totalPossible = scores.reduce((acc, curr) => acc + Number(curr.total_marks), 0);
  const avg = totalPossible > 0 ? Math.round((totalObtained / totalPossible) * 100) : 0;

  return (
    <div className="min-h-screen bg-transparent p-5 pt-24 pb-32 font-sans text-[var(--text)]">
      <div className="max-w-md mx-auto space-y-6">
        
        {/* Navigation */}
        <button onClick={() => router.push('/profile')} className="flex items-center gap-2 text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-4">
          <ChevronLeft size={14} /> {t('profile')}
        </button>

        {/* Aggregate Card */}
        <div className="p-6 bg-[var(--card)] border border-[var(--border)] rounded-[32px] relative overflow-hidden shadow-sm">
          <div className="flex justify-between items-center relative z-10">
            <div>
              <p className="text-zinc-500 text-[9px] font-bold uppercase tracking-[2px]">{t('aggregateScore')}</p>
              <h1 className="text-4xl font-black italic tracking-tighter text-blue-500">{avg}%</h1>
            </div>
            <div className="text-right">
              <p className="text-zinc-500 text-[9px] font-bold uppercase tracking-[2px]">{t('status')}</p>
              <p className="text-sm font-black italic uppercase text-[var(--text)]">{t('activeLedger')}</p>
            </div>
          </div>
          <div className="mt-4 h-1.5 w-full bg-[var(--border)] rounded-full overflow-hidden">
             <div className="h-full bg-blue-600 transition-all duration-1000" style={{ width: `${avg}%` }} />
          </div>
        </div>

        <h2 className="text-zinc-500 text-[10px] font-bold uppercase tracking-[3px] ml-2">{t('recentTests')}</h2>

        {loading ? (
           <div className="space-y-3 animate-pulse">
             {[1,2,3].map(i => <div key={i} className="h-20 bg-[var(--card)] rounded-2xl" />)}
           </div>
        ) : (
          <div className="space-y-3">
            {scores.map((score) => (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={score.id} className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500">
                    <BookOpen size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black italic uppercase leading-none text-[var(--text)]">{score.subject}</h3>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase mt-1">
                      {score.test_name} <span className="mx-1 opacity-20">•</span> {new Date(score.test_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="flex items-baseline justify-end gap-0.5">
                      <span className="text-lg font-black italic text-[var(--text)]">{score.marks_obtained}</span>
                      <span className="text-[10px] font-bold text-zinc-500">/{score.total_marks}</span>
                    </div>
                    <p className="text-[9px] font-black text-blue-500 uppercase tracking-tighter mt-0.5">
                      {Math.round((score.marks_obtained / score.total_marks) * 100)}%
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        <div className="p-6 bg-blue-600 rounded-[35px] flex items-center justify-between shadow-xl shadow-blue-500/10">
           <div className="flex items-center gap-4">
              <Zap size={20} className="text-white" fill="currentColor" />
              <div>
                <p className="text-white text-xs font-black italic uppercase">{t('mockFinals')}</p>
                <p className="text-blue-200 text-[9px] font-bold uppercase tracking-widest">{t('nextMilestone')}</p>
              </div>
           </div>
           <ChevronRight size={18} className="text-white" />
        </div>
      </div>
    </div>
  );
}
