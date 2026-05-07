'use client';
import React, { useState, useEffect } from 'react';
import { BookMarked, ArrowLeft, Loader2, Plus, Trash2, Save, Sparkles, AlertTriangle, Layers } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function SubjectManager() {
  const router = useRouter();
  const [activeClasses, setActiveClasses] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [classSubjects, setClassSubjects] = useState<string[]>([]);
  const [newSubject, setNewSubject] = useState('');
  const [loading, setLoading] = useState(true);
  const [fetchingSubjects, setFetchingSubjects] = useState(false);
  const [saving, setSaving] = useState(false);

  // Safely format class names into database keys (e.g., "12th Comm" -> "subjects_12th_comm")
  const getSubjectKey = (cls: string) => {
    return 'subjects_' + cls.toLowerCase().replace(/[^a-z0-9]/g, '_');
  };

  useEffect(() => {
    // 🛡️ Master Admin Only
    const role = localStorage.getItem('role');
    const assignedClass = localStorage.getItem('assignedClass') || '';
    const isMaster = role === 'principal' || assignedClass.toLowerCase() === 'all';
    
    if (!isMaster) {
      router.push('/admin');
      return;
    }
    fetchActiveClasses();
  }, [router]);

  // 1. First, load the dynamic classes we just created
  const fetchActiveClasses = async () => {
    setLoading(true);
    const { data } = await supabase.from('config').select('value').eq('key', 'active_classes').maybeSingle();
      
    if (data && data.value) {
      try {
        const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
        if (Array.isArray(parsed) && parsed.length > 0) {
            setActiveClasses(parsed);
            setSelectedClass(parsed[0]); // Select the first class by default
        }
      } catch (e) {
        console.error("Failed to parse classes", e);
      }
    }
    setLoading(false);
  };

  // 2. Whenever the selected class changes, load its specific subjects
  useEffect(() => {
    if (!selectedClass) return;
    
    const loadSubjectsForClass = async () => {
        setFetchingSubjects(true);
        const key = getSubjectKey(selectedClass);
        const { data } = await supabase.from('config').select('value').eq('key', key).maybeSingle();
        
        if (data && data.value) {
            try {
                const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
                setClassSubjects(Array.isArray(parsed) ? parsed : []);
            } catch(e) {
                setClassSubjects([]);
            }
        } else {
            // Default blank slate if no subjects exist yet for this custom class
            setClassSubjects([]); 
        }
        setFetchingSubjects(false);
    };

    loadSubjectsForClass();
  }, [selectedClass]);

  const handleAddSubject = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newSubject.trim();
    if (!trimmed) return;
    
    // Prevent duplicates
    if (classSubjects.some(s => s.toLowerCase() === trimmed.toLowerCase())) {
        alert("Subject already exists in this class!");
        return;
    }
    
    setClassSubjects([...classSubjects, trimmed]);
    setNewSubject('');
  };

  const handleRemoveSubject = (subjectToRemove: string) => {
    if(confirm(`Remove ${subjectToRemove} from ${selectedClass}? This will hide its materials from students.`)) {
        setClassSubjects(classSubjects.filter(s => s !== subjectToRemove));
    }
  };

  const saveToCloud = async () => {
    setSaving(true);
    const key = getSubjectKey(selectedClass);
    
    const { error } = await supabase
      .from('config')
      .upsert({ key: key, value: JSON.stringify(classSubjects) });
      
    setSaving(false);
    if (!error) {
      alert(`Subjects for ${selectedClass} securely synced to cloud! ☁️`);
    } else {
      alert("Failed to save: " + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-transparent p-6 pt-24 pb-40 text-[var(--text)] font-sans relative z-0">
      
      {/* ✨ Ambient Premium Glow Background */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[350px] h-[350px] rounded-full bg-rose-500/10 blur-[120px]"></div>
        <div className="absolute bottom-[10%] left-[-10%] w-[300px] h-[300px] rounded-full bg-red-500/10 blur-[100px]"></div>
      </div>

      <div className="max-w-md mx-auto space-y-8">
        
        {/* Header & Back Button */}
        <div>
          <button onClick={() => router.push('/admin')} className="flex items-center gap-2 text-zinc-500 hover:text-[var(--text)] transition-colors text-[10px] font-black uppercase tracking-widest mb-8 active:scale-95">
            <ArrowLeft size={16} /> Admin Core
          </button>

          <div className="flex items-center gap-4 relative">
            <Sparkles className="absolute -top-5 -left-3 text-rose-500/40 animate-pulse" size={32} />
            <div className="p-3 bg-rose-500/10 rounded-[20px] border border-rose-500/20 shadow-sm flex items-center justify-center">
              <BookMarked className="text-rose-500" size={28} />
            </div>
            <div>
              <h1 className="text-4xl font-black italic uppercase tracking-tighter leading-none text-[var(--text)]">
                Subject <span className="text-rose-500 drop-shadow-[0_0_15px_rgba(244,63,94,0.3)]">Config</span>
              </h1>
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[4px] mt-2 flex items-center gap-2">
                <span className="w-6 h-[1px] bg-zinc-400 block"></span> Curriculum Architecture
              </p>
            </div>
          </div>
        </div>

        {loading ? (
           <div className="flex justify-center py-20"><Loader2 className="animate-spin text-rose-500" size={32} /></div>
        ) : activeClasses.length === 0 ? (
           <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3">
              <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest leading-relaxed">
                  No classes found! Please add classes in the Class Config node first.
              </p>
          </div>
        ) : (
          <>
            {/* 🎯 SELECT TARGET CLASS */}
            <div className="space-y-2">
                <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-2 flex items-center gap-2">
                    <Layers size={14} /> Select Target Class
                </label>
                <div className="bg-[var(--background)] rounded-[20px] border border-[var(--border)] p-1 px-5 flex items-center shadow-inner focus-within:border-rose-500 focus-within:ring-4 focus-within:ring-rose-500/10 transition-all">
                    <select 
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value)}
                        className="w-full bg-transparent p-4 text-sm font-black uppercase text-[var(--text)] outline-none appearance-none"
                    >
                        {activeClasses.map(c => <option key={c} value={c}>{c} Standard</option>)}
                    </select>
                </div>
            </div>

            {/* 📝 ADD NEW SUBJECT FORM */}
            <div className="bg-[var(--card)]/90 backdrop-blur-2xl border border-[var(--border)] border-t-4 border-t-rose-500 rounded-[35px] p-6 shadow-xl relative">
                <form onSubmit={handleAddSubject} className="flex gap-2">
                    <input 
                    type="text" 
                    placeholder="e.g., Mathematics, Drawing..." 
                    value={newSubject} 
                    onChange={(e) => setNewSubject(e.target.value)} 
                    className="flex-1 bg-[var(--background)] border border-[var(--border)] rounded-[20px] p-4 text-sm font-black uppercase outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 text-[var(--text)] shadow-inner placeholder:text-zinc-500" 
                    />
                    <button type="submit" disabled={!newSubject.trim()} className="p-4 bg-rose-500 text-white rounded-[20px] active:scale-90 shadow-[0_5px_15px_rgba(244,63,94,0.3)] transition-all hover:bg-rose-400 disabled:opacity-50 disabled:shadow-none">
                    <Plus size={20} strokeWidth={3} />
                    </button>
                </form>
            </div>

            {/* 📚 MANAGE ACTIVE SUBJECTS */}
            <div className="pt-2">
                <div className="flex items-center justify-between mb-4 ml-2">
                    <h2 className="text-[10px] font-black text-zinc-500 uppercase tracking-[4px]">Curriculum for {selectedClass}</h2>
                    <span className="text-[9px] font-black text-[var(--background)] bg-[var(--text)] px-3 py-1.5 rounded-full shadow-sm">{classSubjects.length} Subjects</span>
                </div>

                <div className="bg-[var(--card)]/60 backdrop-blur-md border border-[var(--border)] rounded-[28px] overflow-hidden shadow-sm">
                    {fetchingSubjects ? (
                    <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-rose-500" size={24} /></div>
                    ) : classSubjects.length === 0 ? (
                    <div className="p-12 text-center text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-relaxed">
                        No subjects mapped to this class.<br/>Add a subject to initiate curriculum.
                    </div>
                    ) : (
                    <div className="divide-y divide-[var(--border)]">
                        {classSubjects.map((sub) => (
                        <div key={sub} className="p-4 px-6 flex items-center justify-between group hover:bg-[var(--background)]/50 transition-colors">
                            <span className="text-sm font-black uppercase text-[var(--text)] tracking-widest">{sub}</span>
                            <button onClick={() => handleRemoveSubject(sub)} className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-500/10 active:scale-90 transition-all">
                            <Trash2 size={16} />
                            </button>
                        </div>
                        ))}
                    </div>
                    )}
                </div>
            </div>

            {/* ☁️ MASTER SYNC BUTTON */}
            <button 
                onClick={saveToCloud}
                disabled={saving || fetchingSubjects}
                className="w-full p-6 bg-rose-600 text-white rounded-[24px] font-black uppercase tracking-[3px] text-xs flex items-center justify-center gap-3 transition-all active:scale-95 shadow-[0_10px_25px_rgba(225,29,72,0.3)] hover:bg-rose-500 disabled:opacity-50 disabled:shadow-none"
            >
                {saving ? <Loader2 className="animate-spin" /> : <><Save size={18} /> Sync {selectedClass} Subjects</>}
            </button>
          </>
        )}

      </div>
    </div>
  );
}
