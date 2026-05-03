'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { Trophy, ChevronLeft, Loader2, Crown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/LanguageContext';

export default function Leaderboard() {
  const router = useRouter();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [leaders, setLeaders] = useState<any[]>([]);

  useEffect(() => {
    async function fetchLeaderboard() {
      setLoading(true);
      
      // 🛡️ BULLETPROOF FETCH: Grabbing tables separately to avoid Foreign Key errors
      const { data: studentsData } = await supabase.from('students').select('id, name, class, avatar_url');
      const { data: scoresData } = await supabase.from('test_scores').select('student_id, marks_obtained, total_marks');

      if (studentsData && scoresData) {
        const studentStats: any = {};

        // 1. Register every student first
        studentsData.forEach((st) => {
          studentStats[st.id] = { 
            name: st.name, 
            class: st.class, 
            avatar_url: st.avatar_url, 
            got: 0, 
            total: 0 
          };
        });

        // 2. Add up all their scores
        scoresData.forEach((sc) => {
          if (studentStats[sc.student_id]) {
            studentStats[sc.student_id].got += Number(sc.marks_obtained || 0);
            studentStats[sc.student_id].total += Number(sc.total_marks || 0);
          }
        });

        // 3. Calculate percentage, filter out students with 0 tests, and sort by Rank
        const ranked = Object.keys(studentStats)
          .filter(id => studentStats[id].total > 0) // Hides students who haven't taken any tests yet
          .map(id => ({ 
            id, 
            ...studentStats[id], 
            avg: Math.round((studentStats[id].got / studentStats[id].total) * 100) 
          }))
          .sort((a, b) => b.avg - a.avg);

        setLeaders(ranked);
      }
      setLoading(false);
    }
    fetchLeaderboard();
  }, []);

  return (
    <div className="min-h-screen bg-transparent p-6 pt-24 pb-32 font-sans text-[var(--text)]">
      <div className="max-w-md mx-auto">
        <button onClick={() => router.push('/dashboard')} className="flex items-center gap-2 text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-10 active:scale-95">
          <ChevronLeft size={14} /> {t('dashboard')}
        </button>
        
        <div className="mb-12">
          <h1 className="text-4xl font-black italic uppercase tracking-tighter">{t('hallOf')} <span className="text-yellow-500">{t('fame')}</span></h1>
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[3px] mt-1 italic">{t('classRankings')} • May 2026</p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="animate-spin text-yellow-500" size={32} />
            <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest text-center">{t('calculatingGreatness')}</p>
          </div>
        ) : leaders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-50">
             <Trophy size={48} className="text-zinc-500 mb-2" />
             <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">No test data available yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {leaders.map((student, index) => {
              const isTop3 = index < 3;
              const rankColors = [
                "border-yellow-500/50 bg-yellow-500/5 text-yellow-600", 
                "border-zinc-400/30 bg-zinc-400/5 text-zinc-500", 
                "border-orange-700/30 bg-orange-700/5 text-orange-600"
              ];
              
              return (
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.1 }} key={student.id} className={`p-6 rounded-[35px] border flex items-center justify-between shadow-sm ${isTop3 ? rankColors[index] : 'border-[var(--border)] bg-[var(--card)] text-zinc-400'}`}>
                  <div className="flex items-center gap-5">
                    <div className="flex flex-col items-center">
                       {index === 0 ? <Crown size={18} className="mb-1 text-yellow-500" /> : <span className="text-xs font-black italic mb-1 opacity-50">#{index + 1}</span>}
                       <div className={`w-12 h-12 rounded-2xl overflow-hidden flex items-center justify-center font-black italic text-xl border ${isTop3 ? 'border-current' : 'border-[var(--border)] bg-zinc-500/5 text-zinc-500'}`}>
                         {student.avatar_url ? (
                           <img src={student.avatar_url} alt={student.name} className="w-full h-full object-cover" /> 
                         ) : (
                           student.name.charAt(0)
                         )}
                       </div>
                    </div>
                    <div>
                      <h3 className={`font-black italic uppercase tracking-tight ${isTop3 ? 'text-[var(--text)] text-lg' : 'text-[var(--text)] text-sm'}`}>{student.name.split(' ')[0]}</h3>
                      <p className="text-[9px] font-bold uppercase tracking-widest opacity-60 italic">{student.class} {t('standard')}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-2xl font-black italic leading-none ${isTop3 ? 'text-blue-500' : 'text-zinc-400'}`}>{student.avg}%</p>
                    <p className="text-[8px] font-black uppercase tracking-tighter mt-1 opacity-50 italic">{t('aggregate')}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
        <div className="mt-12 p-8 bg-[var(--card)] border border-[var(--border)] rounded-[40px] text-center shadow-sm">
           <Trophy className="mx-auto text-zinc-500 mb-4 opacity-20" size={40} />
           <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[2px] leading-relaxed italic">{t('rankingsUpdate')} <br />{t('keepPushing')} <span className="text-yellow-500">{t('numberOneSpot')}</span>.</p>
        </div>
      </div>
    </div>
  );
}
