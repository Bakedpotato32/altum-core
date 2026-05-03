'use client';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { Check, X, Save, ChevronLeft, Loader2, Sun, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

function AttendanceForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const dateStr = searchParams.get('date') || format(new Date(), 'yyyy-MM-dd');
  const className = searchParams.get('class') || '10th';

  const [students, setStudents] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isHoliday, setIsHoliday] = useState(false);
  const [hasExistingRecords, setHasExistingRecords] = useState(false); // New state to track if we can "undo"

  useEffect(() => {
    async function init() {
      setLoading(true);
      const { data: holidayData } = await supabase.from('holidays').select('*').eq('date', dateStr).maybeSingle();
      if (holidayData) setIsHoliday(true);

      const { data: studentData } = await supabase.from('students').select('*').eq('class', className).order('name', { ascending: true });
      const { data: existingLogs } = await supabase.from('attendance_logs').select('*').eq('date', dateStr).eq('class', className);

      if (studentData) {
        setStudents(studentData);
        const initialStatus: Record<string, boolean> = {};
        
        // If there are existing logs, we allow the "Undo" function
        if (existingLogs && existingLogs.length > 0) {
          setHasExistingRecords(true);
        }

        studentData.forEach(s => {
          const log = existingLogs?.find(l => l.student_id === s.id);
          initialStatus[s.id] = log ? log.status === 'present' : true;
        });
        setAttendance(initialStatus);
      }
      setLoading(false);
    }
    init();
  }, [className, dateStr]);

  const toggleStatus = (id: string) => {
    if (isHoliday) return;
    setAttendance(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const saveToCloud = async () => {
    setSaving(true);
    // Delete existing logs first to prevent duplicates
    await supabase.from('attendance_logs').delete().eq('date', dateStr).eq('class', className);
    
    // Create new logs
    const logs = students.map(s => ({
      date: dateStr,
      student_id: s.id,
      class: className,
      status: attendance[s.id] ? 'present' : 'absent'
    }));
    const { error: logError } = await supabase.from('attendance_logs').insert(logs);

    if (!logError) {
      // Recalculate percentage for all students
      for (const s of students) {
        const { data: history } = await supabase.from('attendance_logs').select('status').eq('student_id', s.id);
        if (history) {
          const present = history.filter(h => h.status === 'present').length;
          const total = history.length;
          const newPerc = total > 0 ? Math.round((present / total) * 100) : 0;
          await supabase.from('students').update({ attendance: newPerc }).eq('id', s.id);
        }
      }
      router.push('/admin/attendance');
    } else {
      alert("Error: " + logError.message);
      setSaving(false);
    }
  };

  // New Undo Function
  const clearRecord = async () => {
    const confirmClear = window.confirm("Are you sure you want to undo and clear all attendance records for this specific date?");
    if (!confirmClear) return;

    setSaving(true);
    
    // Delete the logs completely
    await supabase.from('attendance_logs').delete().eq('date', dateStr).eq('class', className);

    // Recalculate percentage now that this day is removed
    for (const s of students) {
      const { data: history } = await supabase.from('attendance_logs').select('status').eq('student_id', s.id);
      let newPerc = 0;
      if (history && history.length > 0) {
        const present = history.filter(h => h.status === 'present').length;
        newPerc = Math.round((present / history.length) * 100);
      }
      await supabase.from('students').update({ attendance: newPerc }).eq('id', s.id);
    }
    
    router.push('/admin/attendance');
  };

  return (
    <div className="min-h-screen bg-transparent p-6 pt-28 text-[var(--text)] font-sans pb-40">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 bg-[var(--card)] rounded-xl border border-[var(--border)] active:scale-90 shadow-sm transition-all">
            <ChevronLeft size={20} className="text-zinc-500" />
          </button>
          <div>
            <h2 className="text-xl font-black italic uppercase tracking-tighter text-[var(--text)]">
              {className} <span className="text-blue-500">Roll Call</span>
            </h2>
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest italic">{dateStr}</p>
          </div>
        </div>
        {isHoliday && <Sun className="text-orange-500 animate-pulse" size={24} />}
      </div>

      {isHoliday && (
        <div className="mb-6 p-5 bg-orange-500/10 border border-orange-500/20 rounded-[30px] text-center shadow-sm">
          <p className="text-[10px] font-black uppercase text-orange-600 tracking-widest">Holiday Mode Enabled</p>
          <p className="text-[8px] text-orange-600/60 font-black uppercase mt-1">Status locked to present</p>
        </div>
      )}

      {/* Student List */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center p-20"><Loader2 className="animate-spin text-blue-500" /></div>
        ) : (
          students.map(s => (
            <div 
              key={s.id} 
              onClick={() => toggleStatus(s.id)}
              className={`p-5 rounded-[32px] border transition-all flex items-center justify-between active:scale-[0.98] shadow-sm
                ${attendance[s.id] 
                  ? 'bg-[var(--card)] border-green-500/30' 
                  : 'bg-[var(--card)] border-red-500/30'}`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black italic border transition-colors
                  ${attendance[s.id] 
                    ? 'bg-green-500/10 border-green-500/20 text-green-600' 
                    : 'bg-red-500/10 border-red-500/20 text-red-600'}
                `}>
                  {s.name[0]}
                </div>
                <div>
                  <p className="font-black italic uppercase text-[var(--text)] leading-tight">{s.name}</p>
                  <p className="text-[9px] text-zinc-500 font-bold tracking-widest mt-1">ID: #{s.id}</p>
                </div>
              </div>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all
                ${attendance[s.id] 
                  ? 'bg-green-500 border-green-400 text-white shadow-[0_0_15px_rgba(34,197,94,0.4)]' 
                  : 'bg-red-500 border-red-400 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]'}
              `}>
                {attendance[s.id] ? <Check size={18} strokeWidth={4} /> : <X size={18} strokeWidth={4} />}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ACTION BUTTONS */}
      {!loading && students.length > 0 && (
        <div className="mt-12 flex flex-col gap-4">
          <button 
            onClick={saveToCloud}
            disabled={saving}
            className="w-full bg-blue-600 text-white py-6 rounded-[32px] flex items-center justify-center gap-4 font-black uppercase tracking-[4px] shadow-xl active:scale-95 transition-all disabled:opacity-30"
          >
            {saving ? <Loader2 className="animate-spin" /> : <><Save size={20} /> Push to Cloud</>}
          </button>

          {/* Conditional Undo Button: Only shows if there are existing records to delete */}
          {hasExistingRecords && (
            <button 
              onClick={clearRecord}
              disabled={saving}
              className="w-full bg-transparent border border-red-500/20 text-red-500 py-5 rounded-[32px] flex items-center justify-center gap-3 font-black uppercase tracking-widest active:scale-95 transition-all disabled:opacity-30 hover:bg-red-500/10"
            >
              <Trash2 size={16} /> Undo / Clear Record
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function MarkAttendancePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-transparent" />}>
      <AttendanceForm />
    </Suspense>
  );
}
