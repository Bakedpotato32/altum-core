'use client';
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, CheckCircle2, XCircle, PartyPopper, Calendar as CalIcon } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, getDay, getYear } from 'date-fns';

export default function AttendanceCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // This state will eventually come from your Database/Admin panel
  // Format: { "2026-05-10": "present", "2026-05-15": "holiday" }
  const [attendanceData] = useState<Record<string, string>>({
    "2026-05-01": "holiday", // Example: May Day
  });

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const dateRange = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // Calculate empty slots for the first week (so the 1st starts on the right weekday)
  const startDay = getDay(monthStart); 

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  return (
    <div className="px-6 pt-28 pb-32">
      {/* Header with Year Switcher */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">
            {getYear(currentDate)}
          </h2>
          <motion.p 
            key={format(currentDate, 'MMMM')}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-xs font-black text-blue-500 uppercase tracking-[4px]"
          >
            {format(currentDate, 'MMMM')}
          </motion.p>
        </div>
        <div className="flex gap-2">
          <button onClick={prevMonth} className="p-3 bg-white/5 border border-white/10 rounded-2xl active:scale-90 transition-all text-white">
            <ChevronLeft size={20} />
          </button>
          <button onClick={nextMonth} className="p-3 bg-white/5 border border-white/10 rounded-2xl active:scale-90 transition-all text-white">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Admin Legend (Status Indicators) */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <StatusBox label="Present" color="text-green-400" bg="bg-green-500/10" />
        <StatusBox label="Absent" color="text-red-500" bg="bg-red-500/10" />
        <StatusBox label="Holiday" color="text-yellow-500" bg="bg-yellow-500/10" />
      </div>

      {/* Real-Date Calendar Grid */}
      <div className="bg-white/[0.02] border border-white/10 p-5 rounded-[35px] backdrop-blur-2xl relative">
        <div className="grid grid-cols-7 gap-2 relative z-10">
          {['SUN','MON','TUE','WED','THU','FRI','SAT'].map(d => (
            <div key={d} className="text-center text-[8px] font-black text-zinc-700 uppercase mb-4">{d}</div>
          ))}
          
          {/* Empty spaces for correct weekday alignment */}
          {Array.from({ length: startDay }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}

          <AnimatePresence mode="popLayout">
            {dateRange.map((date, i) => {
              const dateStr = format(date, 'yyyy-MM-dd');
              const status = attendanceData[dateStr] || 'none';

              return (
                <motion.div 
                  key={dateStr}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.005 }}
                  className={`aspect-square rounded-xl flex items-center justify-center text-[11px] font-black transition-all border
                    ${status === 'present' ? 'bg-green-500/20 border-green-500/40 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.1)]' : 
                      status === 'absent' ? 'bg-red-500/20 border-red-500/30 text-red-500' : 
                      status === 'holiday' ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.1)]' : 
                      'bg-white/5 border-white/5 text-zinc-500'}
                  `}
                >
                  {format(date, 'd')}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Admin Info Card */}
      <div className="mt-8 p-6 bg-white/[0.02] border border-white/5 rounded-[32px] flex items-center gap-4">
        <div className="p-3 bg-blue-500/10 rounded-2xl">
          <CalIcon size={24} className="text-blue-500" />
        </div>
        <div>
          <h4 className="text-sm font-black italic uppercase text-zinc-200">Admin Sync</h4>
          <p className="text-[10px] font-bold text-zinc-500 leading-tight">
            Attendance is updated by the karan (the admin) every Sunday. Check back for recent markings.
          </p>
        </div>
      </div>
    </div>
  );
}

function StatusBox({ label, color, bg }: any) {
  return (
    <div className={`${bg} py-3 rounded-2xl border border-white/5 text-center`}>
      <h5 className={`text-xs font-black italic ${color}`}>{label}</h5>
    </div>
  );
}
