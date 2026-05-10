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

  const getClearanceLevel = (paidTill: string | null) => {
    if (!paidTill || paidTill.toUpperCase() === 'PENDING') return { level: 'danger', monthsBehind: 99 };
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const str = paidTill.toUpperCase();
    let parsedMonth = -1;
    let parsedYear = currentYear;
    months.forEach((m, idx) => { if (str.includes(m)) parsedMonth = idx; });
    const yearMatch = str.match(/\d{4}/);
    if (yearMatch) parsedYear = parseInt(yearMatch[0]);
    if (parsedMonth === -1) return { level: 'cleared', monthsBehind: 0 };
    const totalCurrentMonths = currentYear * 12 + currentMonth;
    const totalPaidMonths = parsedYear * 12 + parsedMonth;
    const monthsBehind = totalCurrentMonths - totalPaidMonths;
    if (monthsBehind <= 0) return { level: 'cleared', monthsBehind: 0 };
    if (monthsBehind === 1) return { level: 'warning', monthsBehind: 1 };
    if (monthsBehind === 2) return { level: 'alert', monthsBehind: 2 };
    return { level: 'danger', monthsBehind };
  };

  useEffect(() => {
    const role = localStorage.getItem('role');
    if (role === 'principal' || role === 'teacher') { router.push('/admin'); return; }
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

  if (loading || !student) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="relative">
        <div className="absolute inset-0 rounded-full animate-ping bg-blue-500/20" />
        <div className="relative w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center backdrop-blur-sm">
          <Loader2 className="animate-spin w-5 h-5 text-blue-500" />
        </div>
      </div>
    </div>
  );

  const clearance = getClearanceLevel(student.paid_till);
  const badgeConfig: Record<string, { bg: string; border: string; label: string; color: string }> = {
    cleared:  { bg: 'bg-emerald-500/10', border: 'border-emerald-500/25', label: t('paidTill'),     color: 'text-emerald-500' },
    warning:  { bg: 'bg-amber-500/10',  border: 'border-amber-500/30',   label: t('dueSoon'),      color: 'text-amber-500' },
    alert:    { bg: 'bg-orange-500/10',  border: 'border-orange-500/30',   label: t('overdue'),      color: 'text-orange-500' },
    danger:   { bg: 'bg-red-500/10',    border: 'border-red-500/25',   label: t('actionNeeded'), color: 'text-red-500' },
  };
  const badge = badgeConfig[clearance.level];

  return (
    <div className="min-h-screen pb-32 font-sans bg-background text-text">
      {/* Ambient background orbs (soft & modern) */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div className="absolute -top-[20%] -right-[20%] w-[400px] h-[400px] rounded-full bg-blue-500/5 blur-[80px]" />
        <div className="absolute bottom-[10%] -left-[20%] w-[350px] h-[350px] rounded-full bg-emerald-500/5 blur-[80px]" />
        <div className="absolute top-[40%] left-[30%] w-[200px] h-[200px] rounded-full bg-amber-500/5 blur-[60px]" />
      </div>

      {/* Hero section */}
      <div className="px-5 pt-28 pb-6">
        <div className="flex justify-between items-center gap-3">
          {/* Avatar + name */}
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/10 overflow-hidden">
              {student.avatar_url ? (
                <img src={student.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-black italic text-blue-500">
                  {student.name[0]}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-extrabold tracking-[0.22em] uppercase text-text/40 mb-1">
                {t('welcome')}
              </p>
              <h1 className="text-3xl font-black italic uppercase tracking-[-0.02em] leading-[0.95] text-text">
                {student.name.split(' ')[0].split('').map((char: string, i: number) => (
                  <span key={i} className={i === 0 ? 'text-blue-500' : 'text-text'}>{char}</span>
                ))}
              </h1>
              <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-text/30 mt-1.5 truncate">
                {student.class} {t('student')} · ID: {student.id}
              </p>
            </div>
          </div>

          {/* Fee badge */}
          <div className={`shrink-0 px-3 py-2 rounded-xl ${badge.bg} ${badge.border} border flex flex-col items-center gap-0.5 backdrop-blur-sm`}>
            <span className={`text-[9px] font-black tracking-[0.2em] uppercase ${badge.color}/80`}>
              {badge.label}
            </span>
            <span className={`text-xs font-black italic uppercase tracking-[-0.02em] ${badge.color}`}>
              {student.paid_till || t('pending')}
            </span>
          </div>
        </div>

        {/* Accent divider */}
        <div className="mt-6 h-px bg-gradient-to-r from-blue-500/40 to-transparent rounded-full" />
      </div>

      {/* Card grid */}
      <div className="px-5 space-y-4">
        {/* Live Notice */}
        <div className="relative rounded-3xl bg-card border border-border p-5 overflow-hidden transition-all duration-200 hover:scale-[1.01] hover:shadow-xl cursor-pointer">
          <Megaphone className="absolute -right-3 -top-3 w-20 h-20 text-blue-500/5" />
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)] animate-pulse" />
            <span className="text-[10px] font-extrabold tracking-[0.2em] uppercase text-blue-500">
              {t('liveNotice')}
            </span>
          </div>
          <p className="text-sm font-extrabold italic uppercase tracking-[-0.01em] leading-relaxed text-text relative z-10">
            “{globalNotice}”
          </p>
        </div>

        {/* Class Update */}
        <div className="relative rounded-3xl bg-orange-500/5 border border-orange-500/20 p-5 overflow-hidden transition-all duration-200 hover:scale-[1.01]">
          <Bell className="absolute -right-3 -top-3 w-20 h-20 text-orange-500/5" />
          <div className="flex items-center gap-2 mb-3">
            <Bell className="w-3 h-3 text-orange-500" />
            <span className="text-[10px] font-extrabold tracking-[0.2em] uppercase text-orange-500">
              {student.class} {t('update')}
            </span>
          </div>
          <p className="text-sm font-extrabold italic uppercase tracking-[-0.01em] leading-relaxed text-text relative z-10">
            {classNotice ? `“${classNotice}”` : "No specific updates for your class today. Keep studying! 🦊"}
          </p>
        </div>

        {/* Fee Diary Card */}
        <div
          onClick={() => router.push('/fees')}
          className="group relative rounded-3xl bg-emerald-500/5 border border-emerald-500/20 p-5 flex items-center justify-between cursor-pointer transition-all duration-200 active:scale-[0.98] hover:shadow-lg hover:border-emerald-500/40 overflow-hidden"
        >
          <Wallet className="absolute -right-5 -top-5 w-28 h-28 text-emerald-500/5 group-hover:scale-110 transition-transform duration-300" />
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Wallet className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-[9px] font-extrabold tracking-[0.22em] uppercase text-emerald-500 mb-1">
                {t('financeNode')}
              </p>
              <h3 className="text-xl font-black italic uppercase tracking-[-0.02em] text-text leading-tight">
                {t('feeDiary')}
              </h3>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-emerald-500/40 group-hover:translate-x-1 transition-transform" />
        </div>

        {/* Rank Card */}
        <div
          onClick={() => router.push('/leaderboard')}
          className="group relative rounded-3xl bg-card border border-border p-5 flex items-center justify-between cursor-pointer transition-all duration-200 active:scale-[0.98] hover:shadow-lg overflow-hidden"
        >
          <Trophy className="absolute -right-5 -top-5 w-28 h-28 text-yellow-500/5 group-hover:scale-110 transition-transform duration-300" />
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-yellow-500" />
            </div>
            <div>
              <p className="text-[9px] font-extrabold tracking-[0.22em] uppercase text-yellow-500 mb-1">
                {t('rank')}
              </p>
              <h3 className="text-3xl font-black italic uppercase tracking-[-0.03em] text-text leading-tight flex items-center gap-1">
                {rank === 1 && <Crown className="w-5 h-5 text-yellow-500 -mt-1" />}#{rank}
              </h3>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-border group-hover:translate-x-1 transition-transform" />
        </div>

        {/* Syllabus Card */}
        <div
          onClick={() => router.push('/syllabus')}
          className="group rounded-3xl bg-card border border-border p-4 flex items-center justify-between cursor-pointer transition-all duration-200 active:scale-[0.98] hover:shadow-lg"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <ListChecks className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-[9px] font-extrabold tracking-[0.22em] uppercase text-text/40 mb-1">
                {t('syllabus')}
              </p>
              <h4 className="text-sm font-black italic uppercase tracking-[-0.01em] text-text">
                {t('trackProgress')}
              </h4>
            </div>
          </div>
          <ArrowUpRight className="w-4 h-4 text-border group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </div>

        {/* WhatsApp Card */}
        <div
          onClick={() => window.open('https://chat.whatsapp.com/Fdahi7f77q15O7i2KNvAc3', '_blank')}
          className="group rounded-3xl bg-card border border-border p-4 flex items-center justify-between cursor-pointer transition-all duration-200 active:scale-[0.98] hover:shadow-lg hover:border-green-500/30"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#25D366] flex items-center justify-center shadow-lg shadow-green-500/20">
              <MessageSquare className="w-5 h-5 text-white fill-white" />
            </div>
            <div>
              <p className="text-[9px] font-extrabold tracking-[0.22em] uppercase text-[#25D366] mb-1">
                {t('support')}
              </p>
              <h4 className="text-sm font-black italic uppercase tracking-[-0.01em] text-text">
                {t('whatsappGroup')}
              </h4>
            </div>
          </div>
          <ArrowUpRight className="w-4 h-4 text-border group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </div>
      </div>
    </div>
  );
}