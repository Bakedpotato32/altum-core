'use client';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { Check, X, Save, ChevronLeft, Loader2, Sun, Trash2, Users, CheckCheck } from 'lucide-react';
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

      const { data: holidayData } = await supabase
        .from('holidays').select('*').eq('date', dateStr).maybeSingle();
      if (holidayData) setIsHoliday(true);

      const { data: allStudents } = await supabase
        .from('students').select('*').order('name', { ascending: true });
      const { data: existingLogs } = await supabase
        .from('attendance_logs').select('*').eq('date', dateStr);

      if (allStudents) {
        const filtered = allStudents.filter(s =>
          sanitizeClass(s.class) === cleanClass ||
          s.class.toLowerCase() === className.toLowerCase()
        );
        const classLogs = existingLogs?.filter(l =>
          sanitizeClass(l.class) === cleanClass ||
          l.class.toLowerCase() === className.toLowerCase()
        ) || [];

        setStudents(filtered);
        if (classLogs.length > 0) setHasExistingRecords(true);

        const initialStatus: Record<string, boolean> = {};
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

  const markAll = (status: boolean) => {
    const updated: Record<string, boolean> = {};
    students.forEach(s => { updated[s.id] = status; });
    setAttendance(updated);
  };const saveToCloud = async () => {
    setSaving(true);
    await supabase.from('attendance_logs')
      .delete().eq('date', dateStr).eq('class', className);

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

  const undoAttendance = async () => {
    if (!confirm("Delete today's attendance for this class?")) return;
    setSaving(true);
    const { error } = await supabase.from('attendance_logs')
      .delete().eq('date', dateStr).eq('class', className);
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
      const { data: history } = await supabase
        .from('attendance_logs').select('status').eq('student_id', s.id);
      if (history) {
        const present = history.filter(h => h.status === 'present').length;
        const total = history.length;
        const newPerc = total > 0 ? Math.round((present / total) * 100) : 0;
        await supabase.from('students').update({ attendance: newPerc }).eq('id', s.id);
      }
    }
  };

  const presentCount = Object.values(attendance).filter(Boolean).length;
  const absentCount = students.length - presentCount;

  return (
    <div className="min-h-screen bg-transparent px-5 pt-14 pb-40 text-[var(--text)] font-sans">

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between mb-6 pt-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2.5 bg-[var(--card)] rounded-2xl border border-[var(--border)] active:scale-90 transition-all"
          >
            <ChevronLeft size={18} className="text-zinc-500" />
          </button>
          <div>
            <h2 className="text-xl font-black italic uppercase tracking-tighter leading-none">
              {className} <span className="text-blue-500">Roll Call</span>
            </h2>
            <p className="text-[9px] font-black text-zinc-500 uppercase tracking-[3px] mt-0.5">
              {dateStr}
            </p>
          </div>
        </div>
        {isHoliday && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl">
            <Sun size={12} className="text-yellow-500 animate-pulse" />
            <span className="text-[8px] font-black text-yellow-600 uppercase tracking-widest">Holiday</span>
          </div>
        )}
      </div>

      {/* ── SUMMARY BAR ── */}
      {!loading && students.length > 0 && (
        <div className="flex gap-3 mb-5">
          <div className="flex-1 p-3 bg-green-500/8 border border-green-500/15 rounded-2xl text-center">
            <p className="text-[7px] font-black uppercase tracking-[3px] text-zinc-500">Present</p>
            <p className="text-xl font-black text-green-500">{presentCount}</p>
          </div>
          <div className="flex-1 p-3 bg-red-500/8 border border-red-500/15 rounded-2xl text-center">
            <p className="text-[7px] font-black uppercase tracking-[3px] text-zinc-500">Absent</p>
            <p className="text-xl font-black text-red-500">{absentCount}</p>
          </div>
          <div className="flex-1 p-3 bg-[var(--card)] border border-[var(--border)] rounded-2xl text-center">
            <p className="text-[7px] font-black uppercase tracking-[3px] text-zinc-500">Total</p>
            <p className="text-xl font-black text-[var(--text)]">{students.length}</p>
          </div>
        </div>
      )}

      {/* ── BULK ACTIONS ── */}
      {!loading && students.length > 0 && !isHoliday && (
        <div className="flex gap-2 mb-5">
          <button
            onClick={() => markAll(true)}
            className="flex-1 py-2.5 bg-green-500/10 border border-green-500/20 rounded-2xl text-[8px] font-black text-green-600 uppercase tracking-widest flex items-center justify-center gap-1.5 active:scale-95 transition-all"
          >
            <CheckCheck size={12} /> All Present
          </button>
          <button
            onClick={() => markAll(false)}
            className="flex-1 py-2.5 bg-red-500/10 border border-red-500/20 rounded-2xl text-[8px] font-black text-red-500 uppercase tracking-widest flex items-center justify-center gap-1.5 active:scale-95 transition-all"
          >
            <X size={12} /> All Absent
          </button>
        </div>
      )}{/* ── STUDENT LIST ── */}
      <div className="space-y-2.5">
        {loading ? (
          <div className="py-20 flex flex-col items-center gap-3">
            <Loader2 className="animate-spin text-blue-500" size={24} />
            <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Loading Students...</p>
          </div>
        ) : students.length === 0 ? (
          <div className="py-20 text-center">
            <Users size={28} className="text-zinc-400 mx-auto mb-3" />
            <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">
              No students found for {className}
            </p>
          </div>
        ) : (
          students.map((s, index) => (
            <div
              key={s.id}
              onClick={() => toggleStatus(s.id)}
              className={`
                p-4 rounded-[24px] border transition-all flex items-center justify-between
                active:scale-[0.98] cursor-pointer select-none
                ${attendance[s.id]
                  ? 'bg-[var(--card)] border-green-500/25 shadow-[0_2px_8px_rgba(34,197,94,0.06)]'
                  : 'bg-[var(--card)] border-red-500/25 shadow-[0_2px_8px_rgba(239,68,68,0.06)]'}
              `}
            >
              <div className="flex items-center gap-3">
                <div className={`
                  w-11 h-11 rounded-2xl flex items-center justify-center
                  text-base font-black italic border shrink-0
                  ${attendance[s.id]
                    ? 'bg-green-500/10 border-green-500/20 text-green-600'
                    : 'bg-red-500/10 border-red-500/20 text-red-500'}
                `}>
                  {s.name[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-black italic uppercase text-[var(--text)] text-sm leading-tight">
                    {s.name}
                  </p>
                  <p className="text-[8px] text-zinc-500 font-bold tracking-widest mt-0.5">
                    #{String(index + 1).padStart(2, '0')} · {s.id}
                  </p>
                </div>
              </div>
              <div className={`
                w-9 h-9 rounded-full flex items-center justify-center border transition-all shrink-0
                ${attendance[s.id]
                  ? 'bg-green-500 border-green-400 text-white shadow-md shadow-green-500/30'
                  : 'bg-red-500 border-red-400 text-white shadow-md shadow-red-500/30'}
              `}>
                {attendance[s.id]
                  ? <Check size={16} strokeWidth={3} />
                  : <X size={16} strokeWidth={3} />}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── ACTION BUTTONS ── */}
      {!loading && students.length > 0 && (
        <div className="mt-10 flex flex-col gap-3">
          <button
            onClick={saveToCloud}
            disabled={saving || isHoliday}
            className="w-full bg-blue-600 text-white py-5 rounded-[28px] flex items-center justify-center gap-3 font-black uppercase tracking-[3px] text-sm shadow-xl shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-40"
          >
            {saving
              ? <><Loader2 className="animate-spin" size={18} /> Syncing...</>
              : <><Save size={18} /> Push to Cloud</>}
          </button>

          {hasExistingRecords && (
            <button
              onClick={undoAttendance}
              disabled={saving}
              className="w-full bg-[var(--card)] text-red-500 py-4 rounded-[24px] flex items-center justify-center gap-2.5 font-black uppercase tracking-widest text-xs border border-red-500/20 active:scale-95 transition-all disabled:opacity-40 hover:bg-red-500/5"
            >
              {saving
                ? <Loader2 className="animate-spin" size={16} />
                : <><Trash2 size={15} /> Undo Roll Call</>}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function MarkAttendancePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={24} />
      </div>
    }>
      <AttendanceForm />
    </Suspense>
  );
}