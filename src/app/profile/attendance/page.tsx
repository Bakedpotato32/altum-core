'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, ChevronRight, CalendarDays, CalendarCheck } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, eachDayOfInterval, subMonths, addMonths, isToday } from 'date-fns';
import { useLanguage } from '@/lib/LanguageContext';
import { motion } from 'framer-motion';

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
    if (!activeId) { router.push('/login'); return; }
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

  // Stats for current month
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const monthLogs = logs.filter(l => {
    const d = l.date.includes('T') ? l.date.split('T')[0] : l.date;
    return monthDays.some(day => format(day, 'yyyy-MM-dd') === d);
  });
  const presentCount = monthLogs.filter(l => l.status.toLowerCase().trim() === 'present').length;
  const absentCount  = monthLogs.filter(l => l.status.toLowerCase().trim() === 'absent').length;
  const totalLogged  = presentCount + absentCount;
  const attendancePct = totalLogged > 0 ? Math.round((presentCount / totalLogged) * 100) : 0;

  const renderCells = () => {
    const calStart = startOfWeek(monthStart);
    const calEnd = endOfWeek(monthEnd);
    const calendarDays = eachDayOfInterval({ start: calStart, end: calEnd });

    return (
      <div className="grid grid-cols-7 gap-1.5 md:gap-2">
        {calendarDays.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const isCurrentMonth = isSameMonth(day, monthStart);
          const today = isToday(day);
          const dayLog = logs.find(l => (l.date.includes('T') ? l.date.split('T')[0] : l.date) === dateStr);
          const isHoliday = holidays.includes(dateStr);

          // Base classes for the cell
          let cellClasses = "aspect-square flex items-center justify-center rounded-[12px] md:rounded-[14px] text-xs font-black transition-all ";

          if (!isCurrentMonth) {
            cellClasses += "opacity-0 pointer-events-none";
          } else if (today) {
            cellClasses += "bg-blue-500 text-white border border-blue-600 shadow-[0_4px_10px_rgba(59,130,246,0.3)] italic active:scale-95 cursor-pointer";
          } else if (isHoliday) {
            cellClasses += "bg-[#fef3c7] text-amber-500 border border-amber-200 active:scale-95 cursor-pointer";
          } else if (dayLog) {
            const status = dayLog.status.toLowerCase().trim();
            if (status === 'present') {
              cellClasses += "bg-[#dcfce7] text-emerald-600 border border-emerald-200 active:scale-95 cursor-pointer";
            } else {
              cellClasses += "bg-[#fee2e2] text-red-500 border border-red-200 active:scale-95 cursor-pointer";
            }
          } else {
            cellClasses += "bg-slate-50 text-slate-400 border border-slate-200 active:scale-95 cursor-pointer hover:bg-slate-100";
          }

          return (
            <div key={day.toISOString()} className={cellClasses}>
              {isCurrentMonth ? format(day, 'd') : ''}
            </div>
          );
        })}
      </div>
    );
  };

  const statCards = [
    { label: t('present') || 'PRESENT', value: presentCount, textColor: 'text-emerald-500', badgeBg: 'bg-[#dcfce7]' },
    { label: t('absent') || 'ABSENT',  value: absentCount, textColor: 'text-red-500', badgeBg: 'bg-[#fee2e2]' },
    { label: 'PERCENT', value: `${attendancePct}%`, textColor: 'text-blue-500', badgeBg: 'bg-[#dbeafe]' },
  ];

  return (
    <div className="min-h-[100dvh] bg-[#f8fafc] text-slate-900 px-5 pt-8 pb-32 max-w-[500px] mx-auto relative overflow-hidden font-sans">
      
      {/* Soft Ambient Glow Background for Light Mode */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-[5%] -right-[10%] w-[300px] h-[300px] rounded-full bg-orange-500/5 blur-[60px]" />
        <div className="absolute top-[40%] -left-[10%] w-[250px] h-[250px] rounded-full bg-blue-500/5 blur-[60px]" />
      </div>

      {/* Header Section */}
      <div className="flex items-center gap-4 mb-8 relative z-10">
        <button 
          onClick={() => router.push('/profile')}
          className="w-12 h-12 rounded-[16px] bg-white border border-slate-200 flex items-center justify-center text-slate-900 shadow-[0_4px_12px_rgba(0,0,0,0.03)] shrink-0 active:scale-95 transition-transform"
        >
          <ChevronLeft size={26} strokeWidth={2.5} />
        </button>
        <div>
          <div className="flex items-center gap-1.5 mb-0.5">
            <CalendarCheck size={14} className="text-orange-500" strokeWidth={2.5} />
            <p className="m-0 text-[11px] font-extrabold text-orange-500 tracking-wider uppercase">
              {t('verifiedId') || 'VERIFIED ID'}: {studentId}
            </p>
          </div>
          <h1 className="m-0 text-[28px] font-black italic uppercase text-slate-900 leading-tight">
            {t('my') || 'MY'} <span className="text-orange-500">{t('record') || 'RECORD'}</span>
          </h1>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3 mb-8 relative z-10">
        {statCards.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="bg-white border border-slate-200 rounded-[24px] p-4 text-center shadow-[0_4px_15px_rgba(0,0,0,0.02)] flex flex-col items-center justify-center gap-2"
          >
            <p className={`m-0 text-[26px] font-black italic leading-none ${stat.textColor}`}>
              {stat.value}
            </p>
            <div className={`px-2.5 py-1 rounded-[8px] ${stat.badgeBg}`}>
              <p className={`m-0 text-[9px] font-black tracking-widest uppercase ${stat.textColor}`}>
                {stat.label}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Calendar Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="bg-white border border-slate-200 rounded-[32px] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.04)] mb-8 relative z-10"
      >
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="m-0 text-[20px] font-black italic uppercase text-slate-900">
            {format(currentMonth, 'MMMM')} <span className="text-blue-500">{format(currentMonth, 'yyyy')}</span>
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="w-10 h-10 rounded-[14px] bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 active:scale-90 transition-transform"
            >
              <ChevronLeft size={20} strokeWidth={2.5} />
            </button>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="w-10 h-10 rounded-[14px] bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 active:scale-90 transition-transform"
            >
              <ChevronRight size={20} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1.5 md:gap-2 mb-3">
          {['S','M','T','W','T','F','S'].map((d, i) => (
            <div key={i} className="text-center text-[11px] font-black text-slate-400">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar Cells */}
        {renderCells()}
      </motion.div>

      {/* Legend */}
      <div className="flex justify-center gap-4 flex-wrap relative z-10">
        {[
          { color: 'bg-emerald-500', label: t('present') || 'PRESENT' },
          { color: 'bg-red-500', label: t('absent') || 'ABSENT' },
          { color: 'bg-amber-500', label: t('holiday') || 'HOLIDAY' },
          { color: 'bg-blue-500', label: 'TODAY' },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
            <span className="text-[9px] font-black tracking-widest uppercase text-slate-500">
              {item.label}
            </span>
          </div>
        ))}
      </div>
      
    </div>
  );
}
