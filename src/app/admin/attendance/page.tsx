'use client';
import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, CalendarCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, eachDayOfInterval } from 'date-fns';

export default function AttendanceHub() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [holidays, setHolidays] = useState<string[]>([]);
  const [markedDates, setMarkedDates] = useState<string[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [assignedClass, setAssignedClass] = useState<string | null>(null);
  const [isMasterAdmin, setIsMasterAdmin] = useState(false);
  const router = useRouter();

  // Dynamic Classes
  const [activeClasses, setActiveClasses] = useState<string[]>([]);

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

    const fetchConfigAndData = async () => {
      // Fetch Dynamic Classes
      const { data: configData } = await supabase.from('config').select('value').eq('key', 'active_classes').maybeSingle();
      if (configData && configData.value) {
        try {
          const parsed = typeof configData.value === 'string' ? JSON.parse(configData.value) : configData.value;
          if (Array.isArray(parsed)) setActiveClasses(parsed);
        } catch (e) {
          console.error("Parse error", e);
        }
      }

      // Fetch Holidays
      const { data: holidayData } = await supabase.from('holidays').select('date');
      if (holidayData) setHolidays(holidayData.map(h => h.date));

      // Fetch Logs
      const { data: attendanceData } = await supabase.from('attendance_logs').select('date, class');
      if (attendanceData) {
        let myLogs = attendanceData;
        if (!isMaster && assigned) {
          const cleanAssigned = sanitizeClass(assigned);
          myLogs = attendanceData.filter(log => sanitizeClass(log.class) === cleanAssigned);
        }
        const uniqueDates = Array.from(new Set(myLogs.map(a => a.date)));
        setMarkedDates(uniqueDates);
      }
    };
    fetchConfigAndData();
  }, []);

  const handleHolidayMark = async (day: Date) => {
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

  const visibleClasses = isMasterAdmin ? activeClasses : [assignedClass];

  return (
    <div className="min-h-screen bg-transparent p-6 pt-28 pb-40 text-[var(--text)] font-sans">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.push('/admin')} className="p-2 bg-[var(--card)] rounded-xl border border-[var(--border)] active:scale-90 transition-all"><ChevronLeft size={20} /></button>
        <div>
          <h1 className="text-2xl font-black italic uppercase tracking-tighter">Attendance <span className="text-blue-500">Hub</span></h1>
          <p className="text-[9px] font-black text-zinc-500 uppercase tracking-[4px] italic">Cloud Synced</p>
        </div>
      </div>

      <div className="p-6 bg-[var(--card)] border border-[var(--border)] rounded-[35px] mb-6 shadow-sm">
        <div className="flex items-center justify-between mb-6 px-2">
          <h2 className="text-xl font-black italic uppercase text-[var(--text)]">{format(currentMonth, 'MMMM yyyy')}</h2>
          <div className="flex gap-2">
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 bg-zinc-500/5 rounded-lg border border-[var(--border)] active:scale-90 transition-transform"><ChevronLeft size={18}/></button>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 bg-zinc-500/5 rounded-lg border border-[var(--border)] active:scale-90 transition-transform"><ChevronRight size={18}/></button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {eachDayOfInterval({ start: startOfWeek(startOfMonth(currentMonth)), end: endOfWeek(endOfMonth(currentMonth)) }).map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const isSelected = isSameDay(day, selectedDate);
            const isHoliday = holidays.includes(dateStr);
            const isMarked = markedDates.includes(dateStr); 

            return (
              <div key={day.toString()} onClick={() => setSelectedDate(day)} onDoubleClick={() => handleHolidayMark(day)}
                className={`aspect-square flex items-center justify-center rounded-xl text-xs font-black transition-all cursor-pointer 
                  ${!isSameMonth(day, currentMonth) ? 'opacity-10' : 'opacity-100'} 
                  ${isSelected ? 'bg-blue-600 text-white shadow-lg scale-105 z-10' : 
                    isHoliday ? 'bg-yellow-500/20 text-yellow-600 border border-yellow-500/30' : 
                    isMarked ? 'bg-violet-500/10 text-violet-500 border border-violet-500/30 shadow-[0_0_12px_rgba(139,92,246,0.3)] ring-1 ring-violet-500/50' : 
                    'bg-zinc-500/5 hover:bg-zinc-500/10'}`}
              >
                {format(day, 'd')}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-center gap-6 mb-10 px-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-violet-500/20 border border-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.4)]"></div>
          <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Logged</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500"></div>
          <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Holiday</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-10">
        {visibleClasses.map((cls) => cls && (
          <button key={cls} onClick={() => router.push(`/admin/attendance/mark?date=${format(selectedDate, 'yyyy-MM-dd')}&class=${sanitizeClass(cls)}`)} className="p-5 bg-[var(--card)] border border-[var(--border)] rounded-[28px] text-left active:scale-95 transition-all shadow-sm group">
            <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500 font-black italic mb-3 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <CalendarCheck size={18} />
            </div>
            <h4 className="font-black italic text-[var(--text)] uppercase text-sm">{cls}</h4>
            <p className="text-[8px] font-bold text-zinc-500 uppercase mt-1">Mark Roll Call</p>
          </button>
        ))}
      </div>
    </div>
  );
}
