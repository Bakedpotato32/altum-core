'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, ChevronRight, LogOut } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, eachDayOfInterval, subMonths, addMonths } from 'date-fns';
import { useLanguage } from '@/lib/LanguageContext';

export default function StudentAttendance() {
  const router = useRouter();
  const { t } = useLanguage();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [logs, setLogs] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<string[]>([]);
  const [studentId, setStudentId] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const activeId = localStorage.getItem('studentId');
    if (!activeId) {
        router.push('/login');
        return;
    }
    setStudentId(activeId);
    
    const fetchData = async () => {
      const { data: attendanceData } = await supabase.from('attendance_logs').select('*').eq('student_id', activeId);
      const { data: holidayData } = await supabase.from('holidays').select('date');
      if (attendanceData) setLogs(attendanceData);
      if (holidayData) setHolidays(holidayData.map(h => h.date));
    };
    fetchData();
  }, [currentMonth, router]);

  if (!mounted) return null;

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const calendarDays = eachDayOfInterval({ start: startOfWeek(monthStart), end: endOfWeek(monthEnd) });

    return (
      <div className="grid grid-cols-7 gap-1.5">
        {calendarDays.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const isCurrentMonth = isSameMonth(day, monthStart);
          const dayLog = logs.find(l => (l.date.includes('T') ? l.date.split('T')[0] : l.date) === dateStr);
          const isHoliday = holidays.includes(dateStr);

          let glowClass = "bg-[var(--border)]"; 
          if (isHoliday) glowClass = "bg-yellow-500/20 text-yellow-600 border border-yellow-500/30";
          else if (dayLog) {
            const status = dayLog.status.toLowerCase().trim();
            glowClass = status === 'present' 
              ? "bg-green-500/20 text-green-600 border border-green-500/30" 
              : "bg-red-500/20 text-red-600 border border-red-500/30";
          }

          return (
            <div key={day.toISOString()} className={`aspect-square flex items-center justify-center rounded-xl text-[11px] font-black transition-all ${!isCurrentMonth ? 'opacity-10' : ''} ${glowClass}`}>
              {format(day, 'd')}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-transparent p-6 pt-24 text-[var(--text)] font-sans">
      <div className="flex justify-between items-start mb-10">
        <div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter leading-none">{t('my')} <span className="text-blue-500">{t('record')}</span></h1>
          <p className="text-[9px] font-black text-zinc-500 uppercase tracking-[3px] mt-2">{t('verifiedId')}: {studentId}</p>
        </div>
        <button onClick={() => router.push('/profile')} className="p-3 bg-[var(--card)] border border-[var(--border)] rounded-2xl text-zinc-500 active:scale-90 transition-all">
          <ChevronLeft size={18} />
        </button>
      </div>

      <div className="p-7 bg-[var(--card)] border border-[var(--border)] rounded-[40px] shadow-sm mb-8">
        <div className="flex items-center justify-between mb-8 px-2">
           <h2 className="text-xl font-black italic uppercase tracking-tight text-[var(--text)]">{format(currentMonth, 'MMMM yyyy')}</h2>
           <div className="flex gap-2">
              <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 bg-zinc-500/5 rounded-lg border border-[var(--border)] text-[var(--text)]"><ChevronLeft size={18}/></button>
              <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 bg-zinc-500/5 rounded-lg border border-[var(--border)] text-[var(--text)]"><ChevronRight size={18}/></button>
           </div>
        </div>
        <div className="grid grid-cols-7 mb-4 text-center">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <div key={i} className="text-[10px] font-black text-zinc-400 uppercase">{d}</div>
          ))}
        </div>
        {renderCells()}
      </div>

      <div className="flex gap-4 justify-center mb-8">
         <div className="flex items-center gap-1.5"><div className="w-2 h-2 bg-green-500 rounded-full" /><span className="text-[8px] font-bold uppercase text-zinc-500">{t('present')}</span></div>
         <div className="flex items-center gap-1.5"><div className="w-2 h-2 bg-red-500 rounded-full" /><span className="text-[8px] font-bold uppercase text-zinc-500">{t('absent')}</span></div>
         <div className="flex items-center gap-1.5"><div className="w-2 h-2 bg-yellow-500 rounded-full" /><span className="text-[8px] font-bold uppercase text-zinc-500">{t('holiday')}</span></div>
      </div>
    </div>
  );
}
