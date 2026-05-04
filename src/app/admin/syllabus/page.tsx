'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { CheckCircle2, Circle, Plus, Trash2, ArrowLeft, Loader2, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SyllabusManager() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [chapters, setChapters] = useState<any[]>([]);
  const [targetClass, setTargetClass] = useState("10th");
  const [targetSubject, setTargetSubject] = useState("mathematics");
  const [newChapter, setNewChapter] = useState("");
  const [userRole, setUserRole] = useState<string | null>(null);

  const classes = ["5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"];
  const subjects = ["mathematics", "science", "english", "social-studies"];

  useEffect(() => {
    const role = localStorage.getItem('role');
    const assigned = localStorage.getItem('assignedClass');
    setUserRole(role);

    // 🛡️ LOCK LOGIC: Teacher can only edit their class
    if (role === 'teacher' && assigned) {
      setTargetClass(assigned);
    }
  }, []);

  const fetchSyllabus = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('syllabus')
      .select('*')
      .eq('class', targetClass)
      .eq('subject', targetSubject)
      .order('order_index', { ascending: true });
    if (data) setChapters(data);
    setLoading(false);
  };

  useEffect(() => { 
    fetchSyllabus(); 
  }, [targetClass, targetSubject]);

  const addChapter = async () => {
    if (!newChapter) return;
    const { error } = await supabase.from('syllabus').insert([{ 
      class: targetClass, 
      subject: targetSubject, 
      chapter_name: newChapter.toUpperCase(), 
      order_index: chapters.length + 1 
    }]);
    if (!error) { setNewChapter(""); fetchSyllabus(); }
  };

  const toggleComplete = async (id: string, currentState: boolean) => {
    await supabase.from('syllabus').update({ is_completed: !currentState }).eq('id', id);
    fetchSyllabus();
  };

  const deleteChapter = async (id: string) => {
    if(confirm("Delete this chapter?")) {
      await supabase.from('syllabus').delete().eq('id', id);
      fetchSyllabus();
    }
  };

  return (
    <div className="min-h-screen bg-transparent p-6 pt-24 pb-32 text-[var(--text)] font-sans">
      <div className="max-w-md mx-auto space-y-8">
        <button onClick={() => router.push('/admin')} className="flex items-center gap-2 text-zinc-500 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all">
          <ArrowLeft size={14} /> Admin Core
        </button>

        <div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter">Syllabus <span className="text-blue-500">Tracker</span></h1>
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[3px] mt-1 italic opacity-60">Manage Class Progress</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[8px] font-black text-zinc-500 uppercase ml-2 tracking-widest opacity-60">Target Class</label>
            <div className="relative">
              {userRole === 'teacher' && <Lock size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500 z-10" />}
              <select 
                disabled={userRole === 'teacher'}
                value={targetClass} 
                onChange={(e) => setTargetClass(e.target.value)} 
                className={`w-full bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 text-sm font-bold outline-none text-[var(--text)] appearance-none ${userRole === 'teacher' ? 'pl-8 opacity-70' : ''}`}
              >
                {classes.map(c => <option key={c} value={c} className="bg-[var(--card)]">Class {c}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[8px] font-black text-zinc-500 uppercase ml-2 tracking-widest opacity-60">Subject</label>
            <select value={targetSubject} onChange={(e) => setTargetSubject(e.target.value)} className="w-full bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 text-sm font-bold outline-none capitalize text-[var(--text)] appearance-none">
              {subjects.map(s => <option key={s} value={s} className="bg-[var(--card)]">{s.replace('-',' ')}</option>)}
            </select>
          </div>
        </div>

        {/* INPUT AREA */}
        <div className="flex gap-2">
          <input 
            type="text" 
            placeholder="New Chapter Name..." 
            value={newChapter} 
            onChange={(e) => setNewChapter(e.target.value)} 
            className="flex-1 bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 text-sm font-bold outline-none focus:border-blue-500 text-[var(--text)] placeholder:text-zinc-700 transition-all" 
          />
          <button onClick={addChapter} className="p-4 bg-blue-600 text-white rounded-2xl active:scale-90 shadow-lg shadow-blue-500/10">
            <Plus size={20} />
          </button>
        </div>

        {/* LIST AREA */}
        <div className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin text-blue-500" /></div>
          ) : chapters.length === 0 ? (
            <div className="py-10 text-center text-zinc-500 font-bold italic border border-dashed border-[var(--border)] rounded-3xl bg-[var(--card)]/30 uppercase text-[10px] tracking-widest">
              No chapters for Class {targetClass} {targetSubject}
            </div>
          ) : (
            chapters.map((ch) => (
              <div key={ch.id} className="p-5 bg-[var(--card)] border border-[var(--border)] rounded-[28px] flex items-center justify-between shadow-sm active:scale-[0.98] transition-all">
                <div className="flex items-center gap-4">
                  <button onClick={() => toggleComplete(ch.id, ch.is_completed)}>
                    {ch.is_completed ? <CheckCircle2 className="text-green-500" /> : <Circle className="text-zinc-400" />}
                  </button>
                  <span className={`text-sm font-bold uppercase italic tracking-tight ${ch.is_completed ? 'text-zinc-500 line-through' : 'text-[var(--text)]'}`}>
                    {ch.chapter_name}
                  </span>
                </div>
                <button onClick={() => deleteChapter(ch.id)} className="p-2 text-zinc-400 hover:text-red-500 transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
