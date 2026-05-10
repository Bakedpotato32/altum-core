'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, eachDayOfInterval, subMonths, addMonths, isToday } from 'date-fns';
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
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const calendarDays = eachDayOfInterval({ start: startOfWeek(monthStart), end: endOfWeek(monthEnd) });

    return (
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {calendarDays.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const isCurrentMonth = isSameMonth(day, monthStart);
          const today = isToday(day);
          const dayLog = logs.find(l => (l.date.includes('T') ? l.date.split('T')[0] : l.date) === dateStr);
          const isHoliday = holidays.includes(dateStr);

          let bg = 'rgba(128,128,128,0.05)';
          let color = 'var(--text)';
          let border = 'transparent';
          let glow = 'none';

          if (!isCurrentMonth) { bg = 'transparent'; color = 'transparent'; }
          else if (today) { bg = 'rgba(59,130,246,0.15)'; color = '#3b82f6'; border = 'rgba(59,130,246,0.4)'; glow = '0 0 10px rgba(59,130,246,0.3)'; }
          else if (isHoliday) { bg = 'rgba(245,158,11,0.12)'; color = '#f59e0b'; border = 'rgba(245,158,11,0.3)'; }
          else if (dayLog) {
            const status = dayLog.status.toLowerCase().trim();
            if (status === 'present') { bg = 'rgba(16,185,129,0.12)'; color = '#10b981'; border = 'rgba(16,185,129,0.3)'; glow = '0 0 8px rgba(16,185,129,0.15)'; }
            else { bg = 'rgba(239,68,68,0.1)'; color = '#ef4444'; border = 'rgba(239,68,68,0.25)'; }
          }

          return (
            <div
              key={day.toISOString()}
              className="aspect-square flex items-center justify-center rounded-xl text-xs font-black transition-all duration-200 hover:scale-105 hover:shadow-md"
              style={{
                background: bg,
                color: color,
                border: `1px solid ${border}`,
                boxShadow: glow,
                opacity: !isCurrentMonth ? 0 : 1,
                fontStyle: today ? 'italic' : 'normal',
              }}
            >
              {isCurrentMonth ? format(day, 'd') : ''}
            </div>
          );
        })}
      </div>
    );
  };

  const statCards = [
    { label: t('present'), value: presentCount, color: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)' },
    { label: t('absent'),  value: absentCount,  color: '#ef4444', bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.2)'  },
    { label: '%',          value: `${attendancePct}%`, color: '#3b82f6', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.2)' },
  ];

  return (
    <div className="min-h-screen pb-32 font-sans bg-background text-text">
      {/* Ambient orbs */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div className="absolute -top-[8%] -right-[10%] w-72 h-72 rounded-full bg-blue-500/10 blur-[60px]" />
        <div className="absolute bottom-[15%] -left-[10%] w-64 h-64 rounded-full bg-emerald-500/8 blur-[60px]" />
      </div>

      <div className="px-5 pt-24">
        {/* Header */}
        <div className="flex justify-between items-start mb-7">
          <div>
            <h1 className="text-4xl font-black italic uppercase tracking-[-0.03em] leading-[0.92] text-text">
              {t('my')}{' '}
              <span className="text-blue-500" style={{ textShadow: '0 0 24px rgba(59,130,246,0.35)' }}>
                {t('record')}
              </span>
            </h1>
            <p className="text-[9px] font-extrabold tracking-[0.2em] uppercase text-text/30 mt-2">
              {t('verifiedId')}: {studentId}
            </p>
          </div>
          <button
            onClick={() => router.push('/profile')}
            className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center text-text/50 transition-all duration-200 active:scale-90 hover:bg-border/20 hover:scale-105"
          >
            <ChevronLeft size={18} />
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2.5 mb-5">
          {statCards.map((stat, i) => (
            <div
              key={i}
              className="rounded-xl p-3.5 text-center transition-all duration-200 hover:scale-[1.02] hover:shadow-md"
              style={{ background: stat.bg, border: `1px solid ${stat.border}` }}
            >
              <p className="text-2xl font-black italic tracking-[-0.03em] leading-tight mb-1" style={{ color: stat.color }}>
                {stat.value}
              </p>
              <p className="text-[8px] font-black tracking-[0.18em] uppercase opacity-70" style={{ color: stat.color }}>
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* Calendar Card */}
        <div className="rounded-3xl bg-card border border-border p-5 mb-5 transition-all duration-200 hover:shadow-lg">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-5 px-1">
            <h2 className="text-xl font-black italic uppercase tracking-[-0.02em] text-text">
              {format(currentMonth, 'MMMM')}{' '}
              <span className="text-blue-500">{format(currentMonth, 'yyyy')}</span>
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="w-8 h-8 rounded-lg bg-border/20 border border-border flex items-center justify-center text-text/70 transition-all duration-200 active:scale-90 hover:bg-border/40 hover:scale-105"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="w-8 h-8 rounded-lg bg-border/20 border border-border flex items-center justify-center text-text/70 transition-all duration-200 active:scale-90 hover:bg-border/40 hover:scale-105"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2.5">
            {['S','M','T','W','T','F','S'].map((d, i) => (
              <div key={i} className="text-center text-[9px] font-black tracking-[0.1em] text-text/30 uppercase pb-1">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar cells */}
          {renderCells()}
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-5 pb-2">
          {[
            { color: '#10b981', label: t('present') },
            { color: '#ef4444', label: t('absent')  },
            { color: '#f59e0b', label: t('holiday') },
            { color: '#3b82f6', label: 'Today'      },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full shadow-sm" style={{ background: item.color, boxShadow: `0 0 6px ${item.color}80` }} />
              <span className="text-[8px] font-black tracking-[0.15em] uppercase text-text/30">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}