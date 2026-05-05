
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
  const className = searchParams.get('class') || '';

  const [students, setStudents] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isHoliday, setIsHoliday] = useState(false);
  const [hasExistingRecords, setHasExistingRecords] = useState(false);

  const sanitizeClass = (cls: string | null) => {
    if (!cls) return "";
    return cls.toLowerCase().replace(/(st|nd|rd|th|standard|class)/g, "").trim();
  };

  useEffect(() => {
    async function init() {
      if (!className) return;
      setLoading(true);
      const cleanClass = sanitizeClass(className);

      const { data: holidayData } = await supabase.from('holidays').select('*').eq('date', dateStr).maybeSingle();
      if (holidayData) setIsHoliday(true);

      const { data: allStudents } = await supabase.from('students').select('*').order('name', { ascending: true });
      const { data: existingLogs } = await supabase.from('attendance_logs').select('*').eq('date', dateStr);

      if (allStudents) {
        const filtered = allStudents.filter(s => sanitizeClass(s.class) === cleanClass);
        const classLogs = existingLogs?.filter(l => sanitizeClass(l.class) === cleanClass) || [];
        
        setStudents(filtered);
        const initialStatus: Record<string, boolean> = {};
        
        if (classLogs.length > 0) setHasExistingRecords(true);

        filtered.forEach(s => {
          const log = classLogs.find(l => l.student_id === s.id);
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
    await supabase.from('attendance_logs').delete().eq('date', dateStr).eq('class', className);
    
    const logs = students.map(s => ({
      date: dateStr,
      student_id: s.id,
      class: className, 
      status: attendance[s.id] ? 'present' : 'absent'
    }));
    
    const { error: logError } = await supabase.from('attendance_logs').insert(logs);

    if (!logError) {
      await recalculateStudentPercentages();
      router.push('/admin/attendance');
    } else {
      alert("Error: " + logError.message);
      setSaving(false);
    }
  };

  // 🚀 UNDO FUNCTION RESTORED
  const undoAttendance = async () => {
    if (!confirm("Are you sure you want to completely delete today's attendance records for this class?")) return;
    setSaving(true);

    const { error } = await supabase.from('attendance_logs').delete().eq('date', dateStr).eq('class', className);
    
    if (!error) {
      await recalculateStudentPercentages();
      router.push('/admin/attendance');
    } else {
      alert("Error undoing: " + error.message);
      setSaving(false);
    }
  };

  const recalculateStudentPercentages = async () => {
    for (const s of students) {
      const { data: history } = await supabase.from('attendance_logs').select('status').eq('student_id', s.id);
      if (history) {
        const present = history.filter(h => h.status === 'present').length;
        const total = history.length;
        const newPerc = total > 0 ? Math.round((present / total) * 100) : 0;
        await supabase.from('students').update({ attendance: newPerc }).eq('id', s.id);
      }
    }
  };

  return (
    <div className="min-h-screen bg-transparent p-6 pt-28 text-[var(--text)] font-sans pb-40 text-center">
      <div className="flex items-center justify-between mb-8 max-w-md mx-auto">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 bg-[var(--card)] rounded-xl border border-[var(--border)] active:scale-90">
            <ChevronLeft size={20} className="text-zinc-500" />
          </button>
          <div className="text-left">
            <h2 className="text-xl font-black italic uppercase tracking-tighter">{className} <span className="text-blue-500">Roll Call</span></h2>
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{dateStr}</p>
          </div>
        </div>
        {isHoliday && <Sun className="text-orange-500 animate-pulse" size={24} />}
      </div>

      <div className="max-w-md mx-auto space-y-3">
        {loading ? <div className="p-20"><Loader2 className="animate-spin text-blue-500 mx-auto" /></div> : 
          students.map(s => (
            <div key={s.id} onClick={() => toggleStatus(s.id)} className={`p-5 rounded-[32px] border transition-all flex items-center justify-between active:scale-[0.98] ${attendance[s.id] ? 'bg-[var(--card)] border-green-500/30' : 'bg-[var(--card)] border-red-500/30'}`}>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black italic border ${attendance[s.id] ? 'bg-green-500/10 border-green-500/20 text-green-600' : 'bg-red-500/10 border-red-500/20 text-red-600'}`}>{s.name[0]}</div>
                <div className="text-left">
                  <p className="font-black italic uppercase text-[var(--text)] leading-tight">{s.name}</p>
                  <p className="text-[9px] text-zinc-500 font-bold tracking-widest">ID: #{s.id}</p>
                </div>
              </div>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all ${attendance[s.id] ? 'bg-green-500 border-green-400 text-white shadow-lg' : 'bg-red-500 border-red-400 text-white shadow-lg'}`}>
                {attendance[s.id] ? <Check size={18} strokeWidth={4} /> : <X size={18} strokeWidth={4} />}
              </div>
            </div>
          ))
        }
        {!loading && students.length === 0 && <p className="py-20 text-zinc-500 font-black uppercase text-[10px] tracking-widest">No students found for {className}</p>}
      </div>

      {!loading && students.length > 0 && (
        <div className="mt-12 max-w-md mx-auto flex flex-col gap-4">
          <button onClick={saveToCloud} disabled={saving} className="w-full bg-blue-600 text-white py-6 rounded-[32px] flex items-center justify-center gap-4 font-black uppercase tracking-[4px] shadow-xl active:scale-95 disabled:opacity-30">
            {saving ? <Loader2 className="animate-spin" /> : <><Save size={20} /> Push to Cloud</>}
          </button>

          {/* 🚀 UNDO BUTTON RESTORED */}
          {hasExistingRecords && (
            <button onClick={undoAttendance} disabled={saving} className="w-full bg-[var(--card)] text-red-500 py-5 rounded-[28px] flex items-center justify-center gap-3 font-black uppercase tracking-widest border border-red-500/20 active:scale-95 disabled:opacity-30 transition-all hover:bg-red-500/10">
              {saving ? <Loader2 className="animate-spin" /> : <><Trash2 size={18} /> Undo Roll Call</>}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function MarkAttendancePage() { return <Suspense fallback={null}><AttendanceForm /></Suspense>; }
