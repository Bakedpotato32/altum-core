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

  // Stats for the current month
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
  const attendancePct = totalLogged > 0 ? Math.round((presentCount / totalLogged) * 100) : 0;const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const calendarDays = eachDayOfInterval({ start: startOfWeek(monthStart), end: endOfWeek(monthEnd) });

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
        {calendarDays.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const isCurrentMonth = isSameMonth(day, monthStart);
          const today = isToday(day);
          const dayLog = logs.find(l => (l.date.includes('T') ? l.date.split('T')[0] : l.date) === dateStr);
          const isHoliday = holidays.includes(dateStr);

          let bg = 'rgba(128,128,128,0.07)';
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
              style={{
                aspectRatio: '1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 12,
                fontSize: 11,
                fontWeight: 900,
                background: bg,
                color: color,
                border: `1px solid ${border}`,
                boxShadow: glow,
                opacity: !isCurrentMonth ? 0 : 1,
                fontStyle: today ? 'italic' : 'normal',
                transition: 'all 0.2s',
              }}
            >
              {isCurrentMonth ? format(day, 'd') : ''}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen pb-32 font-sans" style={{ background: 'var(--background)', color: 'var(--text)' }}>

      {/* Ambient orbs */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div style={{ position: 'absolute', top: '-8%', right: '-10%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.09) 0%, transparent 70%)', filter: 'blur(50px)' }} />
        <div style={{ position: 'absolute', bottom: '15%', left: '-10%', width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 70%)', filter: 'blur(50px)' }} />
      </div>

      <div className="px-5 pt-24">

        {/* ── Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 38, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-0.03em', lineHeight: 0.92, color: 'var(--text)' }}>
              {t('my')}{' '}
              <span style={{ color: '#3b82f6', textShadow: '0 0 24px rgba(59,130,246,0.35)' }}>{t('record')}</span>
            </h1>
            <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text)', opacity: 0.3, marginTop: 8 }}>
              {t('verifiedId')}: {studentId}
            </p>
          </div>
          <button
            onClick={() => router.push('/profile')}
            className="active:scale-90 transition-transform"
            style={{ width: 42, height: 42, borderRadius: 14, background: 'var(--card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text)', opacity: 0.5 }}
          >
            <ChevronLeft size={18} />
          </button>
        </div>

        {/* ── Stats Row ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
          {[
            { label: t('present'), value: presentCount, color: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)' },
            { label: t('absent'),  value: absentCount,  color: '#ef4444', bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.2)'  },
            { label: '%',          value: `${attendancePct}%`, color: '#3b82f6', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.2)' },
          ].map((stat, i) => (
            <div key={i} style={{ borderRadius: 20, background: stat.bg, border: `1px solid ${stat.border}`, padding: '14px 12px', textAlign: 'center' }}>
              <p style={{ fontSize: 22, fontWeight: 900, fontStyle: 'italic', letterSpacing: '-0.03em', color: stat.color, lineHeight: 1, marginBottom: 4 }}>{stat.value}</p>
              <p style={{ fontSize: 8, fontWeight: 900, letterSpacing: '0.18em', textTransform: 'uppercase', color: stat.color, opacity: 0.7 }}>{stat.label}</p>
            </div>
          ))}
        </div>{/* ── Calendar Card ── */}
        <div style={{ borderRadius: 32, background: 'var(--card)', border: '1px solid var(--border)', padding: '22px 18px', marginBottom: 20 }}>

          {/* Month nav */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22, paddingLeft: 4, paddingRight: 4 }}>
            <h2 style={{ fontSize: 20, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-0.02em', color: 'var(--text)' }}>
              {format(currentMonth, 'MMMM')}{' '}
              <span style={{ color: '#3b82f6' }}>{format(currentMonth, 'yyyy')}</span>
            </h2>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="active:scale-90 transition-transform"
                style={{ width: 34, height: 34, borderRadius: 11, background: 'rgba(128,128,128,0.07)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text)', cursor: 'pointer' }}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="active:scale-90 transition-transform"
                style={{ width: 34, height: 34, borderRadius: 11, background: 'rgba(128,128,128,0.07)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text)', cursor: 'pointer' }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 10 }}>
            {['S','M','T','W','T','F','S'].map((d, i) => (
              <div key={i} style={{ textAlign: 'center', fontSize: 9, fontWeight: 900, letterSpacing: '0.1em', color: 'var(--text)', opacity: 0.25, textTransform: 'uppercase', paddingBottom: 4 }}>
                {d}
              </div>
            ))}
          </div>

          {/* Calendar cells */}
          {renderCells()}
        </div>

        {/* ── Legend ── */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 20, paddingBottom: 8 }}>
          {[
            { color: '#10b981', label: t('present') },
            { color: '#ef4444', label: t('absent')  },
            { color: '#f59e0b', label: t('holiday') },
            { color: '#3b82f6', label: 'Today'      },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: item.color, boxShadow: `0 0 6px ${item.color}80` }} />
              <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text)', opacity: 0.35 }}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}