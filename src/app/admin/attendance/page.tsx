'use client';
import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, CalendarCheck, Sun, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, isSameMonth, isSameDay, eachDayOfInterval, isToday
} from 'date-fns';

export default function AttendanceHub() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [holidays, setHolidays] = useState<string[]>([]);
  const [markedDates, setMarkedDates] = useState<string[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [assignedClass, setAssignedClass] = useState<string | null>(null);
  const [isMasterAdmin, setIsMasterAdmin] = useState(false);
  const [activeClasses, setActiveClasses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const sanitizeClass = (cls: string | null) => {
    if (!cls) return "";
    return cls.toLowerCase().replace(/(st|nd|rd|th|class)/g, "").trim();
  };

  useEffect(() => {
    const role = localStorage.getItem('role');
    const assigned = localStorage.getItem('assignedClass');
    setUserRole(role);
    setAssignedClass(assigned);
    const isMaster = role === 'principal' || sanitizeClass(assigned) === 'all';
    setIsMasterAdmin(isMaster);

    const fetchAll = async () => {
      try {
        const { data: configData } = await supabase
          .from('config').select('value').eq('key', 'active_classes').maybeSingle();
        if (configData?.value) {
          try {
            const parsed = typeof configData.value === 'string'
              ? JSON.parse(configData.value) : configData.value;
            if (Array.isArray(parsed)) setActiveClasses(parsed);
          } catch (e) { console.error("Parse error", e); }
        }

        const { data: holidayData } = await supabase.from('holidays').select('date');
        if (holidayData) setHolidays(holidayData.map(h => h.date));

        const { data: attendanceData } = await supabase
          .from('attendance_logs').select('date, class');
        if (attendanceData) {
          let myLogs = attendanceData;
          if (!isMaster && assigned) {
            const cleanAssigned = sanitizeClass(assigned);
            myLogs = attendanceData.filter(
              log => sanitizeClass(log.class) === cleanAssigned
            );
          }
          setMarkedDates(Array.from(new Set(myLogs.map(a => a.date))));
        }
      } catch (err) {
        console.error('Fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);const handleHolidayMark = async (day: Date) => {
    if (!isMasterAdmin) return;
    const dateStr = format(day, 'yyyy-MM-dd');
    if (holidays.includes(dateStr)) {
      await supabase.from('holidays').delete().eq('date', dateStr);
      setHolidays(holidays.filter(h => h !== dateStr));
    } else {
      await supabase.from('holidays').insert([{ date: dateStr, reason: 'School Off' }]);
      setHolidays([...holidays, dateStr]);
    }
  };

  const visibleClasses: string[] = isMasterAdmin
    ? activeClasses
    : assignedClass ? [assignedClass] : [];

  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const isSelectedHoliday = holidays.includes(selectedDateStr);
  const isSelectedMarked = markedDates.includes(selectedDateStr);

  const totalMarked = markedDates.filter(d => d.startsWith(format(currentMonth, 'yyyy-MM'))).length;
  const totalHolidays = holidays.filter(d => d.startsWith(format(currentMonth, 'yyyy-MM'))).length;

  return (
    <div className="min-h-screen bg-transparent px-5 pt-14 pb-40 text-[var(--text)] font-sans">

      {/* ── HEADER ── */}
      <div className="flex items-center gap-3 mb-6 pt-6">
        <button
          onClick={() => router.push('/admin')}
          className="p-2.5 bg-[var(--card)] rounded-2xl border border-[var(--border)] active:scale-90 transition-all"
        >
          <ChevronLeft size={18} className="text-zinc-500" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-black italic uppercase tracking-tighter leading-none">
            Attendance <span className="text-blue-500">Hub</span>
          </h1>
          <p className="text-[9px] font-black text-zinc-500 uppercase tracking-[4px] mt-0.5">
            Roll Call · Cloud Synced
          </p>
        </div>
        {isSelectedHoliday && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl">
            <Sun size={12} className="text-yellow-500" />
            <span className="text-[8px] font-black text-yellow-600 uppercase tracking-widest">Holiday</span>
          </div>
        )}
      </div>

      {/* ── MONTH STATS ── */}
      <div className="flex gap-3 mb-5">
        <div className="flex-1 p-3.5 bg-[var(--card)] border border-[var(--border)] rounded-2xl">
          <p className="text-[7px] font-black uppercase tracking-[3px] text-zinc-500">Logged Days</p>
          <p className="text-xl font-black text-violet-500 mt-0.5">{totalMarked}</p>
        </div>
        <div className="flex-1 p-3.5 bg-[var(--card)] border border-[var(--border)] rounded-2xl">
          <p className="text-[7px] font-black uppercase tracking-[3px] text-zinc-500">Holidays</p>
          <p className="text-xl font-black text-yellow-500 mt-0.5">{totalHolidays}</p>
        </div>
        <div className="flex-1 p-3.5 bg-[var(--card)] border border-[var(--border)] rounded-2xl">
          <p className="text-[7px] font-black uppercase tracking-[3px] text-zinc-500">Selected</p>
          <p className="text-[11px] font-black text-blue-500 mt-0.5 leading-tight">
            {format(selectedDate, 'dd MMM')}
          </p>
        </div>
      </div>

      {/* ── CALENDAR ── */}
      <div className="p-5 bg-[var(--card)] border border-[var(--border)] rounded-[32px] mb-5 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-black italic uppercase tracking-tighter text-[var(--text)]">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <div className="flex gap-1.5">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-2 bg-zinc-500/5 rounded-xl border border-[var(--border)] active:scale-90 transition-transform"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-2 bg-zinc-500/5 rounded-xl border border-[var(--border)] active:scale-90 transition-transform"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Day labels */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {['S','M','T','W','T','F','S'].map((d, i) => (
            <div key={i} className="text-center text-[8px] font-black text-zinc-500 uppercase tracking-widest py-1">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {eachDayOfInterval({
            start: startOfWeek(startOfMonth(currentMonth)),
            end: endOfWeek(endOfMonth(currentMonth))
          }).map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const isSelected = isSameDay(day, selectedDate);
            const isHoliday = holidays.includes(dateStr);
            const isMarked = markedDates.includes(dateStr);
            const isCurrent = isToday(day);
            const inMonth = isSameMonth(day, currentMonth);

            return (
              <div
                key={day.toString()}
                onClick={() => setSelectedDate(day)}
                onDoubleClick={() => handleHolidayMark(day)}
                className={`
                  aspect-square flex items-center justify-center rounded-xl
                  text-[11px] font-black transition-all cursor-pointer select-none relative
                  ${!inMonth ? 'opacity-10' : 'opacity-100'}
                  ${isSelected
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-110 z-10'
                    : isHoliday
                    ? 'bg-yellow-500/15 text-yellow-600 border border-yellow-500/30'
                    : isMarked
                    ? 'bg-violet-500/10 text-violet-500 border border-violet-500/30 shadow-[0_0_10px_rgba(139,92,246,0.25)]'
                    : isCurrent
                    ? 'border border-blue-500/40 text-blue-500'
                    : 'bg-zinc-500/5 hover:bg-zinc-500/10 text-[var(--text)]'}
                `}
              >
                {format(day, 'd')}
                {isCurrent && !isSelected && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-500" />
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-5 mt-4 pt-4 border-t border-[var(--border)]">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-violet-500/20 border border-violet-500 shadow-[0_0_6px_rgba(139,92,246,0.4)]" />
            <span className="text-[7px] font-black text-zinc-500 uppercase tracking-widest">Logged</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500" />
            <span className="text-[7px] font-black text-zinc-500 uppercase tracking-widest">Holiday</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full border border-blue-500/40" />
            <span className="text-[7px] font-black text-zinc-500 uppercase tracking-widest">Today</span>
          </div>
        </div>
      </div>

      {isMasterAdmin && (
        <p className="text-center text-[7px] font-black text-zinc-500 uppercase tracking-[3px] mb-5">
          Double-tap any date to toggle holiday
        </p>
      )}{/* ── CLASS CARDS ── */}
      <div className="flex items-center gap-2 mb-3 ml-1">
        <Users size={12} className="text-zinc-500" />
        <span className="text-[9px] font-black text-zinc-500 uppercase tracking-[4px]">
          Mark Roll Call · {format(selectedDate, 'dd MMM yyyy')}
        </span>
        <div className="flex-1 h-[1px] bg-[var(--border)]" />
      </div>

      {isSelectedHoliday ? (
        <div className="p-6 bg-yellow-500/8 border border-yellow-500/20 rounded-[28px] text-center">
          <Sun size={28} className="text-yellow-500 mx-auto mb-2" />
          <p className="text-sm font-black italic uppercase text-yellow-600 tracking-tight">Holiday</p>
          <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mt-1">
            No attendance needed for this date
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-5 bg-[var(--card)] border border-[var(--border)] rounded-[28px] h-28 animate-pulse" />
            ))
          ) : visibleClasses.length === 0 ? (
            <div className="col-span-2 py-12 text-center">
              <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">No classes configured</p>
            </div>
          ) : (
            visibleClasses.map((cls) => {
              const alreadyMarked = markedDates.includes(selectedDateStr);
              return (
                <button
                  key={cls}
                  onClick={() => router.push(
                    `/admin/attendance/mark?date=${selectedDateStr}&class=${sanitizeClass(cls)}`
                  )}
                  className="p-5 bg-[var(--card)] border border-[var(--border)] rounded-[28px] text-left active:scale-95 transition-all shadow-sm group relative overflow-hidden"
                >
                  {alreadyMarked && (
                    <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-violet-500 shadow-[0_0_6px_rgba(139,92,246,0.6)]" />
                  )}
                  <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500 mb-3 group-hover:bg-blue-600 group-hover:text-white transition-colors border border-[var(--border)]">
                    <CalendarCheck size={17} />
                  </div>
                  <h4 className="font-black italic text-[var(--text)] uppercase text-sm leading-none">{cls}</h4>
                  <p className="text-[7px] font-bold text-zinc-500 uppercase tracking-widest mt-1.5">
                    {alreadyMarked ? '✓ Already Logged' : 'Mark Roll Call'}
                  </p>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}