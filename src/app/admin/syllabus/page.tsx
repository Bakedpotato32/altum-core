'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { CheckCircle2, Circle, Plus, Trash2, ArrowLeft, Loader2, Lock, ListChecks, Sparkles, Target, BookOpen } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SyllabusManager() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [chapters, setChapters] = useState<any[]>([]);
  const [targetClass, setTargetClass] = useState(""); 
  const [targetSubject, setTargetSubject] = useState("");
  const [newChapter, setNewChapter] = useState("");
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isMasterAdmin, setIsMasterAdmin] = useState(false);

  // Dynamic States
  const [activeClasses, setActiveClasses] = useState<string[]>([]);
  const [classSubjects, setClassSubjects] = useState<string[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);

  const sanitizeClass = (cls: string | null) => {
    if (!cls) return "";
    return cls.toLowerCase().replace(/(st|nd|rd|th|standard|class)/g, "").trim();
  };

  const getSubjectKey = (cls: string) => {
    return 'subjects_' + cls.toLowerCase().replace(/[^a-z0-9]/g, '_');
  };

  useEffect(() => {
    const role = localStorage.getItem('role');
    const assigned = localStorage.getItem('assignedClass');
    setUserRole(role);

    const isMaster = role === 'principal' || sanitizeClass(assigned) === 'all';
    setIsMasterAdmin(isMaster);

    if (!isMaster && assigned) {
      setTargetClass(assigned);
    }
    
    fetchActiveClasses();
  }, []);

  const fetchActiveClasses = async () => {
    const { data } = await supabase.from('config').select('value').eq('key', 'active_classes').maybeSingle();
    if (data && data.value) {
      try {
        const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
        if (Array.isArray(parsed)) setActiveClasses(parsed);
      } catch (e) {
        console.error("Failed to parse classes", e);
      }
    }
  };

  useEffect(() => {
    if (!targetClass) {
      setClassSubjects([]);
      return;
    }
    
    const fetchSubjects = async () => {
      setLoadingSubjects(true);
      const key = getSubjectKey(targetClass);
      const { data } = await supabase.from('config').select('value').eq('key', key).maybeSingle();
      
      if (data && data.value) {
        try {
          const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
          setClassSubjects(Array.isArray(parsed) ? parsed : []);
        } catch (e) {
          setClassSubjects([]);
        }
      } else {
        setClassSubjects([]);
      }
      setTargetSubject(""); 
      setLoadingSubjects(false);
    };

    fetchSubjects();
  }, [targetClass]);

  const fetchSyllabus = async () => {
    if (!targetClass || !targetSubject) return;
    setLoading(true);
    
    const { data } = await supabase.from('syllabus').select('*').eq('subject', targetSubject.toLowerCase()).order('order_index', { ascending: true });
    
    if (data) {
      // Direct string match is safer now since we use dynamic dropdowns
      const filtered = data.filter(ch => ch.class === targetClass);
      setChapters(filtered);
    }
    setLoading(false);
  };

  useEffect(() => { fetchSyllabus(); }, [targetClass, targetSubject]);

  const addChapter = async () => {
    if (!newChapter || !targetClass || !targetSubject) return;
    const { error } = await supabase.from('syllabus').insert([{ 
      class: targetClass, 
      subject: targetSubject.toLowerCase(), 
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
    if(confirm("Delete chapter?")) {
      await supabase.from('syllabus').delete().eq('id', id);
      fetchSyllabus();
    }
  };

  return (
    <div className="min-h-screen bg-transparent p-6 pt-24 pb-40 text-[var(--text)] font-sans relative z-0">
      
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[350px] h-[350px] rounded-full bg-red-500/10 blur-[120px]"></div>
        <div className="absolute bottom-[10%] left-[-10%] w-[300px] h-[300px] rounded-full bg-orange-500/10 blur-[100px]"></div>
      </div>

      <div className="max-w-md mx-auto space-y-8">
        
        <div>
          <button onClick={() => router.push('/admin')} className="flex items-center gap-2 text-zinc-500 hover:text-[var(--text)] transition-colors text-[10px] font-black uppercase tracking-widest mb-8 active:scale-95">
            <ArrowLeft size={16} /> Admin Core
          </button>

          <div className="flex items-center gap-4 relative">
            <Sparkles className="absolute -top-5 -left-3 text-red-500/40 animate-pulse" size={32} />
            <div className="p-3 bg-red-500/10 rounded-[20px] border border-red-500/20 shadow-sm flex items-center justify-center">
              <ListChecks className="text-red-500" size={28} />
            </div>
            <div>
              <h1 className="text-4xl font-black italic uppercase tracking-tighter leading-none text-[var(--text)]">
                Syllabus <span className="text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.3)]">Tracker</span>
              </h1>
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[4px] mt-2 flex items-center gap-2">
                <span className="w-6 h-[1px] bg-zinc-400 block"></span> Manage Progress
              </p>
            </div>
          </div>
        </div>

        <div className="bg-[var(--card)]/80 backdrop-blur-2xl border border-[var(--border)] border-t-4 border-t-red-500 rounded-[35px] p-6 space-y-5 shadow-xl relative overflow-visible">
          <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text)] mb-2 flex items-center gap-2">
            <Target size={16} className="text-red-500" /> Curriculum Setup
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-zinc-500 uppercase ml-1 tracking-widest flex items-center gap-1">Target Class</label>
              <div className="relative">
                {!isMasterAdmin && <Lock size={12} className="absolute left-4 top-1/2 -translate-y-1/2 text-red-500 z-10" />}
                <select disabled={!isMasterAdmin} value={targetClass} onChange={(e) => setTargetClass(e.target.value)} className={`w-full bg-[var(--background)] border border-[var(--border)] rounded-[20px] p-4 text-sm font-black uppercase outline-none text-[var(--text)] appearance-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all shadow-inner ${!isMasterAdmin ? 'pl-10 opacity-70' : ''}`}>
                  <option value="">Select</option>
                  {activeClasses.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-zinc-500 uppercase ml-1 tracking-widest flex items-center gap-1">Subject Node</label>
              <div className="relative">
                {loadingSubjects && <Loader2 size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-red-500 animate-spin z-10" />}
                <select value={targetSubject} onChange={(e) => setTargetSubject(e.target.value)} disabled={!targetClass || classSubjects.length === 0} className="w-full bg-[var(--background)] border border-[var(--border)] rounded-[20px] p-4 text-sm font-black uppercase outline-none text-[var(--text)] appearance-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all shadow-inner disabled:opacity-50">
                  <option value="">{classSubjects.length === 0 && targetClass ? "No Subjects" : "Select"}</option>
                  {classSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <input type="text" placeholder="NEW CHAPTER NAME..." value={newChapter} onChange={(e) => setNewChapter(e.target.value)} disabled={!targetSubject} className="flex-1 bg-[var(--background)] border border-[var(--border)] rounded-[20px] p-4 text-sm font-black uppercase outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10 text-[var(--text)] shadow-inner placeholder:text-zinc-500 disabled:opacity-50" />
            <button onClick={addChapter} disabled={!newChapter || !targetClass || !targetSubject} className="p-4 bg-red-500 text-white rounded-[20px] active:scale-90 shadow-[0_5px_15px_rgba(239,68,68,0.3)] transition-transform hover:bg-red-400 disabled:opacity-50 disabled:shadow-none"><Plus size={20} strokeWidth={3} /></button>
          </div>
        </div>

        <div className="pt-4">
          <div className="flex items-center justify-between mb-5 ml-2">
            <h2 className="text-[10px] font-black text-zinc-500 uppercase tracking-[4px] flex items-center gap-2"><BookOpen size={14}/> Active Syllabus</h2>
            <span className="text-[9px] font-black text-[var(--background)] bg-[var(--text)] px-3 py-1.5 rounded-full shadow-sm">{chapters.length} Chapters</span>
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="flex justify-center py-10"><Loader2 className="animate-spin text-red-500" size={32} /></div>
            ) : !targetSubject ? (
              <div className="py-12 text-center border border-dashed border-[var(--border)] rounded-[35px] bg-[var(--card)]/30">
                <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest opacity-50 px-10 leading-relaxed">Select a class and subject to view syllabus.</p>
              </div>
            ) : chapters.length === 0 ? (
              <div className="py-12 text-center border border-dashed border-[var(--border)] rounded-[35px] bg-[var(--card)]/30">
                <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest opacity-50 px-10 leading-relaxed">No chapters plotted for {targetClass} {targetSubject}.</p>
              </div>
            ) : (
              chapters.map((ch, index) => (
                <div key={ch.id} className={`p-4 bg-[var(--card)]/80 backdrop-blur-md border border-[var(--border)] rounded-[24px] flex items-center justify-between shadow-sm group active:scale-[0.98] transition-all hover:shadow-md ${ch.is_completed ? 'border-emerald-500/30' : 'border-l-4 border-l-red-500'}`}>
                  <div className="flex items-center gap-4">
                    <button onClick={() => toggleComplete(ch.id, ch.is_completed)} className="active:scale-90 transition-transform">
                      {ch.is_completed ? (
                         <CheckCircle2 className="text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]" size={26} />
                      ) : (
                         <Circle className="text-zinc-400 hover:text-red-400 transition-colors" size={26} strokeWidth={2} />
                      )}
                    </button>
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black text-zinc-500 tracking-widest uppercase mb-0.5">Chapter {index + 1}</span>
                      <span className={`text-sm font-black uppercase italic tracking-tight transition-colors line-clamp-2 ${ch.is_completed ? 'text-zinc-500 line-through opacity-60' : 'text-[var(--text)]'}`}>
                        {ch.chapter_name}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => deleteChapter(ch.id)} className="w-8 h-8 shrink-0 rounded-full bg-[var(--background)] border border-[var(--border)] flex items-center justify-center text-zinc-400 hover:text-red-500 hover:border-red-500/30 hover:bg-red-500/5 active:scale-90 transition-all">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
