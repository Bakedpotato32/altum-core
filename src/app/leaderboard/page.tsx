'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { Trophy, ChevronLeft, Loader2, Crown, Sparkles, Medal } from 'lucide-react';
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
    <div className="min-h-screen bg-transparent p-6 pt-24 pb-32 font-sans text-[var(--text)] relative z-0">
      
      {/* ✨ Ambient Premium Glow Background */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[350px] h-[350px] rounded-full bg-purple-500/10 blur-[120px]"></div>
        <div className="absolute bottom-[10%] left-[-10%] w-[300px] h-[300px] rounded-full bg-cyan-500/10 blur-[100px]"></div>
      </div>

      <div className="max-w-md mx-auto">
        <button onClick={() => router.push('/dashboard')} className="flex items-center gap-2 text-zinc-500 hover:text-[var(--text)] transition-colors text-[10px] font-black uppercase tracking-widest mb-10 active:scale-95">
          <ChevronLeft size={16} /> {t('dashboard')}
        </button>
        
        <div className="mb-14 relative">
          <Sparkles className="absolute -top-6 -left-4 text-yellow-500/40 animate-pulse" size={40} />
          <h1 className="text-5xl font-black italic uppercase tracking-tighter leading-none text-[var(--text)]">
            {t('hallOf')} <span className="text-yellow-500 drop-shadow-[0_0_15px_rgba(234,179,8,0.4)]">{t('fame')}</span>
          </h1>
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[4px] mt-3 italic flex items-center gap-2">
            <span className="w-8 h-[1px] bg-zinc-400 block"></span> Class {studentClass} {t('rankings')}
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-5">
            <div className="relative">
               <div className="absolute inset-0 border-4 border-yellow-500/20 rounded-full animate-ping"></div>
               <Loader2 className="animate-spin text-yellow-500 relative z-10" size={40} />
            </div>
            <p className="text-[9px] font-black text-yellow-500/70 uppercase tracking-[4px] text-center">{t('calculatingGreatness')}</p>
          </div>
        ) : leaders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-50 bg-[var(--card)] border border-dashed border-[var(--border)] rounded-[40px]">
             <Trophy size={48} className="text-zinc-500 mb-2" />
             <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 text-center">No test data available yet.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {leaders.map((student, index) => {
              const isFirst = index === 0;
              const isSecond = index === 1;
              const isThird = index === 2;
              
              // Dynamic Card Styling
              let cardStyle = "bg-[var(--card)] border-[var(--border)] p-4 opacity-80 hover:opacity-100";
              if (isFirst) cardStyle = "bg-gradient-to-br from-yellow-500/10 via-yellow-500/5 to-transparent border-yellow-500/40 shadow-[0_10px_30px_rgba(234,179,8,0.15)] p-6 scale-[1.02] ring-1 ring-yellow-500/20";
              else if (isSecond) cardStyle = "bg-zinc-500/5 border-[var(--border)] p-5 shadow-sm";
              else if (isThird) cardStyle = "bg-orange-500/5 border-orange-500/30 p-5 shadow-[0_5px_20px_rgba(249,115,22,0.05)]";

              // Dynamic Avatar Styling
              let avatarSize = "w-12 h-12";
              if (isFirst) avatarSize = "w-16 h-16 ring-4 ring-yellow-500/30 shadow-[0_0_20px_rgba(234,179,8,0.2)]";
              else if (isSecond) avatarSize = "w-14 h-14 ring-2 ring-zinc-400/30";
              else if (isThird) avatarSize = "w-14 h-14 ring-2 ring-orange-500/30";

              return (
                <motion.div 
                  initial={{ opacity: 0, y: 15 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ delay: index * 0.1 }}
                  key={student.id} 
                  className={`rounded-[35px] border flex items-center justify-between backdrop-blur-xl transition-all relative ${cardStyle}`}
                >
                  
                  {/* 🏆 VIP Rank Badge for Top 3 (Fixed Position) */}
                  {isFirst && (
                    <div className="absolute -top-3 right-5 bg-gradient-to-r from-yellow-400 to-yellow-500 text-black text-[9px] font-black uppercase tracking-widest py-1.5 px-4 rounded-full shadow-lg shadow-yellow-500/30 flex items-center gap-1 z-10">
                      <Crown size={12} /> Unbeatable
                    </div>
                  )}

                  <div className="flex items-center gap-5">
                    {/* Rank Indicator */}
                    <div className="w-8 flex justify-center">
                      {isFirst ? <Crown size={28} className="text-yellow-500 drop-shadow-md" /> : 
                       isSecond ? <Medal size={24} className="text-zinc-400" /> : 
                       isThird ? <Medal size={24} className="text-orange-500" /> : 
                       <span className="text-xs font-black italic text-zinc-500">#{index + 1}</span>}
                    </div>
                    
                    {/* Big Avatar */}
                    <div className="relative shrink-0">
                      {student.avatar_url ? (
                        <img src={student.avatar_url} alt={student.name} className={`${avatarSize} rounded-full object-cover p-0.5 bg-[var(--background)]`} />
                      ) : (
                        <div className={`${avatarSize} rounded-full bg-[var(--background)] p-0.5 flex items-center justify-center`}>
                           <div className="w-full h-full rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 font-black italic text-lg border border-blue-500/20">
                             {student.name[0]}
                           </div>
                        </div>
                      )}
                    </div>

                    <div>
                      {/* Fixed Text Color for Light/Dark Mode */}
                      <h3 className={`font-black italic uppercase tracking-tight text-[var(--text)] ${isFirst ? 'text-xl' : 'text-md'}`}>
                        {student.name.split(' ')[0]}
                      </h3>
                      <p className={`text-[9px] font-bold tracking-widest mt-0.5 ${isFirst ? 'text-yellow-600 dark:text-yellow-500/80' : 'text-zinc-500'}`}>
                        ID: {student.id}
                      </p>
                    </div>
                  </div>

                  <div className="text-right pl-3 pr-2">
                    <p className={`font-black italic tracking-tighter ${isFirst ? 'text-4xl text-yellow-500 drop-shadow-[0_0_10px_rgba(234,179,8,0.3)]' : isSecond ? 'text-2xl text-zinc-400' : isThird ? 'text-2xl text-orange-400' : 'text-xl text-blue-500/70'}`}>
                      {student.avg}%
                    </p>
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
