'use client';
import React, { useState, useEffect } from 'react';
import { Calendar, Star, ArrowUpRight, Zap, Loader2, MessageSquare, Trophy, ChevronRight, Crown, ListChecks, Bell, Megaphone } from 'lucide-react';
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

        // 🚀 Sanitizer: Search for "5" if class is "5th"
        const cleanClass = studentData.class.toLowerCase().replace(/(st|nd|rd|th)/g, "").trim();
        const classNoticeKey = `notice_class_${cleanClass}`;

        const [globalRes, classRes] = await Promise.all([
          supabase.from('config').select('value').eq('key', 'global_notice').maybeSingle(),
          supabase.from('config').select('value').eq('key', classNoticeKey).maybeSingle()
        ]);

        if (globalRes.data) setGlobalNotice(globalRes.data.value);
        if (classRes.data) setClassNotice(classRes.data.value);

        const { data: allScores } = await supabase.from('test_scores').select('student_id, marks_obtained, total_marks');
        if (allScores) {
          const studentStats: any = {};
          allScores.forEach(s => {
            if (!studentStats[s.student_id]) studentStats[s.student_id] = { got: 0, total: 0 };
            studentStats[s.student_id].got += Number(s.marks_obtained);
            studentStats[s.student_id].total += Number(s.total_marks);
          });
          const rankedList = Object.keys(studentStats)
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

  return (
    <div className="px-6 pt-28 pb-32 min-h-screen font-sans bg-transparent">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-[var(--text)] text-3xl font-black italic uppercase leading-tight tracking-tighter">
            {t('welcome')}, <span className="text-blue-500">{student.name.split(' ')[0]}</span>
          </h1>
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[3px] mt-1 italic">{student.class} {t('student')} • {t('id')}: {student.id}</p>
        </div>
        <div className="p-3 bg-[var(--card)] rounded-2xl border border-[var(--border)]"><Crown className="text-yellow-500" size={20} /></div>
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

      <div onClick={() => window.open('https://chat.whatsapp.com/Fdahi7f77q15O7i2KNvAc3', '_blank')} className="mb-6 p-6 bg-[var(--card)] border border-[var(--border)] rounded-[35px] flex items-center justify-between active:scale-95 transition-all relative">
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-12 h-12 bg-[#25d366] rounded-2xl flex items-center justify-center text-white shadow-lg"><MessageSquare size={22} fill="currentColor" /></div>
          <div><h4 className="text-[9px] font-black uppercase text-[#25d366] tracking-widest mb-1">{t('support')}</h4><p className="text-sm font-black text-[var(--text)] italic uppercase tracking-tight">{t('whatsappGroup')}</p></div>
        </div>
        <ArrowUpRight size={18} className="text-zinc-400" />
      </div>

      <div className="p-8 bg-blue-600 rounded-[40px] relative overflow-hidden shadow-xl mb-6 active:scale-[0.98] transition-all">
        <Zap size={100} className="absolute right-[-15px] bottom-[-15px] text-white/10 rotate-12" />
        <div className="relative z-10">
            <h3 className="text-xl font-black italic uppercase text-white mb-1 tracking-tighter">{t('altumLab')}</h3>
            <p className="text-blue-100/60 text-[10px] font-black mb-6 uppercase tracking-[3px]">{t('performanceMode')}</p>
            <button className="px-8 py-3 bg-white text-blue-600 rounded-2xl text-[10px] font-black uppercase tracking-[3px] shadow-xl font-bold">{t('launchLab')}</button>
        </div>
      </div>
    </div>
  );
}
