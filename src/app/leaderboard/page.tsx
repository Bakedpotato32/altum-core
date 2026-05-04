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
  const [studentClass, setStudentClass] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLeaderboard() {
      setLoading(true);
      const myClass = localStorage.getItem('studentClass');
      setStudentClass(myClass);
      
      // 🛡️ CLASS-SPECIFIC FETCH: Only grab students and scores from the user's class
      const { data: studentsData } = await supabase
        .from('students')
        .select('id, name, class, avatar_url')
        .eq('class', myClass);

      const { data: scoresData } = await supabase
        .from('test_scores')
        .select('student_id, marks_obtained, total_marks');

      if (studentsData && scoresData) {
        const studentStats: any = {};

        studentsData.forEach((st) => {
          studentStats[st.id] = { 
            name: st.name, 
            class: st.class, 
            avatar_url: st.avatar_url, 
            got: 0, 
            total: 0 
          };
        });

        scoresData.forEach((sc) => {
          if (studentStats[sc.student_id]) {
            studentStats[sc.student_id].got += Number(sc.marks_obtained || 0);
            studentStats[sc.student_id].total += Number(sc.total_marks || 0);
          }
        });

        const ranked = Object.keys(studentStats)
          .filter(id => studentStats[id].total > 0)
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
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[3px] mt-1 italic">
            Class {studentClass} {t('rankings')} • May 2026
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="animate-spin text-yellow-500" size={32} />
            <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest text-center">{t('calculatingGreatness')}</p>
          </div>
        ) : leaders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-50">
             <Trophy size={48} className="text-zinc-500 mb-2" />
             <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 text-center">No test data for Class {studentClass} yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {leaders.map((student, index) => {
              const isTop3 = index < 3;
              const rankColors = ["border-yellow-500 bg-yellow-500/5", "border-zinc-400 bg-zinc-400/5", "border-orange-600 bg-orange-600/5"];
              return (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={student.id} className={`p-6 rounded-[35px] border flex items-center justify-between ${isTop3 ? rankColors[index] : 'border-[var(--border)] bg-[var(--card)]'}`}>
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-black italic w-6">{index === 0 ? <Crown size={16} className="text-yellow-500" /> : `#${index + 1}`}</span>
                    <div>
                      <h3 className="font-black italic uppercase tracking-tight text-sm">{student.name.split(' ')[0]}</h3>
                      <p className="text-[8px] font-bold text-zinc-500 tracking-widest">ID: {student.id}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black italic text-blue-500">{student.avg}%</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
