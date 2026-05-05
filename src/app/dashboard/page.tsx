'use client';
import React, { useState, useEffect } from 'react';
import { Calendar, Star, ArrowUpRight, Zap, Loader2, MessageSquare, Trophy, ChevronRight, Crown, ListChecks, Bell, Megaphone, Wallet } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/LanguageContext';

export default function Dashboard() {
  const router = useRouter();
  const { t, lang } = useLanguage();
  const [student, setStudent] = useState<any>(null);
  const [globalNotice, setGlobalNotice] = useState("...");
  const [classNotice, setClassNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [rank, setRank] = useState<number | string>('--');

  // 🚀 SMART CLEARANCE LOGIC: Checks if the paid month is >= the current real-world month
  const checkClearance = (paidTill: string | null) => {
    if (!paidTill || paidTill.toUpperCase() === 'PENDING') return false;
    
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const currentMonth = new Date().getMonth(); // 0 (Jan) to 11 (Dec)
    const currentYear = new Date().getFullYear();

    const str = paidTill.toUpperCase();
    let parsedMonth = -1;
    let parsedYear = currentYear;

    months.forEach((m, idx) => { if (str.includes(m)) parsedMonth = idx; });
    const yearMatch = str.match(/\d{4}/);
    if (yearMatch) parsedYear = parseInt(yearMatch[0]);

    if (parsedMonth === -1) return true; // If it's a custom fee like "ADMISSION", default to green
    if (parsedYear > currentYear) return true;
    if (parsedYear < currentYear) return false;
    return parsedMonth >= currentMonth;
  };

  useEffect(() => {
    const role = localStorage.getItem('role');
    if (role === 'principal' || role === 'teacher') {
      router.push('/admin');
      return;
    }

    const activeId = localStorage.getItem('studentId');
    if (!activeId) { router.push('/login'); return; }

    const fetchDashboardData = async () => {
      setLoading(true);
      const { data: studentData } = await supabase.from('students').select('*').eq('id', activeId).single();
      
      if (studentData) {
        setStudent(studentData);
        const cleanClass = studentData.class.toLowerCase().replace(/(st|nd|rd|th)/g, "").trim();
        const classNoticeKey = `notice_class_${cleanClass}`;

        const [globalRes, classRes] = await Promise.all([
          supabase.from('config').select('value').eq('key', 'global_notice').maybeSingle(),
          supabase.from('config').select('value').eq('key', classNoticeKey).maybeSingle()
        ]);

        if (globalRes.data) setGlobalNotice(globalRes.data.value);
        if (classRes.data) setClassNotice(classRes.data.value);

        const { data: classmates } = await supabase.from('students').select('id').eq('class', studentData.class);
        const classmateIds = classmates ? classmates.map(c => c.id) : [activeId];

        const { data: allScores } = await supabase.from('test_scores').select('student_id, marks_obtained, total_marks').in('student_id', classmateIds);
        
        if (allScores) {
          const studentStats: any = {};
          classmateIds.forEach(id => { studentStats[id] = { got: 0, total: 0 }; }); 
          
          allScores.forEach(s => {
            if (studentStats[s.student_id]) {
              studentStats[s.student_id].got += Number(s.marks_obtained);
              studentStats[s.student_id].total += Number(s.total_marks);
            }
          });

          const rankedList = Object.keys(studentStats)
            .filter(id => studentStats[id].total > 0) 
            .map(id => ({ id, avg: (studentStats[id].got / studentStats[id].total) * 100 }))
            .sort((a, b) => b.avg - a.avg);
            
          const myRank = rankedList.findIndex(item => item.id === activeId) + 1;
          setRank(myRank > 0 ? myRank : '--');
        }
      }
      setLoading(false);
    };
    fetchDashboardData();
  }, [router]);

  if (loading || !student) return <div className="h-svh bg-[var(--background)] flex items-center justify-center"><Loader2 className="text-blue-500 animate-spin" /></div>;

  const isCleared = checkClearance(student.paid_till);

  return (
    <div className="px-6 pt-28 pb-32 min-h-screen font-sans bg-transparent">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-[var(--text)] text-3xl font-black italic uppercase leading-tight tracking-tighter">
            {t('welcome')}, <span className="text-blue-500">{student.name.split(' ')[0]}</span>
          </h1>
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[3px] mt-1 italic">{student.class} {t('student')} • {t('id')}: {student.id}</p>
        </div>
        
        {/* 🛡️ THE SMART BADGE */}
        <div className={`p-2 px-4 rounded-xl border flex flex-col items-center justify-center shadow-sm transition-colors ${isCleared ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
          <span className={`text-[7px] font-black uppercase tracking-[2px] ${isCleared ? 'text-emerald-500' : 'text-red-500'}`}>
             {isCleared ? 'Paid Till' : 'Dues Pending'}
          </span>
          <span className={`text-sm font-black italic uppercase tracking-tighter ${isCleared ? 'text-emerald-600' : 'text-red-600'}`}>
            {student.paid_till || 'PENDING'}
          </span>
        </div>
      </div>

      <div className="mb-4 p-6 bg-[var(--card)] border border-[var(--border)] rounded-[35px] shadow-sm relative overflow-hidden group">
        <div className="absolute right-[-10px] top-[-10px] opacity-5 -rotate-12 group-hover:rotate-0 transition-transform duration-500"><Megaphone size={80} className="text-blue-500" /></div>
        <p className="text-[9px] font-black uppercase tracking-widest text-blue-500 mb-3 flex items-center gap-2"><Megaphone size={10} /> {t('liveNotice')}</p>
        <p className="text-sm font-bold text-[var(--text)] leading-relaxed italic uppercase tracking-tight relative z-10">"{globalNotice}"</p>
      </div>

      <div className="mb-8 p-6 bg-blue-500/5 border border-dashed border-blue-500/20 rounded-[35px] shadow-sm relative overflow-hidden group">
         <div className="absolute right-[-10px] top-[-10px] opacity-5 -rotate-12 group-hover:rotate-0 transition-transform duration-500"><Bell size={80} className="text-orange-500" /></div>
        <p className="text-[9px] font-black uppercase tracking-widest text-orange-500 mb-3 flex items-center gap-2"><Bell size={10} /> {student.class} Update</p>
        <p className="text-sm font-bold text-[var(--text)] leading-relaxed italic uppercase tracking-tight relative z-10">{classNotice ? `"${classNotice}"` : "No specific updates for your class today. Keep studying! 🦊"}</p>
      </div>

      <div onClick={() => router.push('/fees')} className="mb-4 p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-[35px] flex items-center justify-between active:scale-[0.98] transition-all shadow-sm">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 border border-emerald-500/20"><Wallet size={26} /></div>
          <div><p className="text-emerald-500 text-[9px] font-black uppercase tracking-[3px]">Finance Node</p><h3 className="text-2xl font-black italic text-[var(--text)] tracking-tighter uppercase">Fee Diary</h3></div>
        </div>
        <ChevronRight size={16} className="text-emerald-500/50" />
      </div>

      <div onClick={() => router.push('/leaderboard')} className="mb-4 p-6 bg-[var(--card)] border border-[var(--border)] rounded-[35px] flex items-center justify-between active:scale-[0.98] transition-all shadow-sm">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-yellow-500/10 rounded-2xl flex items-center justify-center text-yellow-500 border border-yellow-500/20"><Trophy size={28} /></div>
          <div><p className="text-yellow-500 text-[9px] font-black uppercase tracking-[3px]">{t('rank')}</p><h3 className="text-2xl font-black italic text-[var(--text)] tracking-tighter uppercase">#{rank}</h3></div>
        </div>
        <ChevronRight size={16} className="text-zinc-400" />
      </div>

      <div onClick={() => router.push('/syllabus')} className="mb-4 p-6 bg-[var(--card)] border border-[var(--border)] rounded-[35px] flex items-center justify-between active:scale-[0.98] transition-all shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 border border-red-500/10"><ListChecks size={22} /></div>
          <div><h4 className="text-[9px] font-black uppercase text-zinc-500 tracking-widest leading-none mb-1">{t('syllabus')}</h4><p className="text-sm font-black text-[var(--text)] italic uppercase tracking-tight">{t('trackProgress')}</p></div>
        </div>
        <ArrowUpRight size={18} className="text-zinc-400" />
      </div>
    </div>
  );
}
