'use client';
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase'; 
import { Trophy, Zap, ArrowLeft, Loader2, CheckCircle2, Filter, Lock, Trash2, Search, User, AlertTriangle, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function MarksEntry() {
  const router = useRouter();
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [allScores, setAllScores] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [dbError, setDbError] = useState(""); 
  
  // Search & Selection State
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [subject, setSubject] = useState('');
  const [testName, setTestName] = useState('');
  const [marks, setMarks] = useState('');
  const [total, setTotal] = useState('');
  const [userRole, setUserRole] = useState<string | null>(null);

  const classes = ["5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"];

  const sanitizeClass = (cls: string | null) => {
    if (!cls) return "";
    return cls.toLowerCase().replace(/(st|nd|rd|th|standard|class)/g, "").trim();
  };

  const loadData = async () => {
    try {
      const [{ data: stData }, { data: scData, error: scError }] = await Promise.all([
        supabase.from('students').select('*').order('name', { ascending: true }),
        supabase.from('test_scores').select('*') 
      ]);
      
      if (stData) setAllStudents(stData);
      
      if (scData) {
        setAllScores(scData.reverse()); 
      } else if (scError) {
        setDbError("Database Error: " + scError.message);
      }
    } catch (err: any) {
      setDbError("Network Error: Check connection.");
    }
  };

  useEffect(() => {
    const role = localStorage.getItem('role');
    const assigned = localStorage.getItem('assignedClass');
    setUserRole(role);
    
    if (role === 'teacher' && assigned) {
      const match = classes.find(c => sanitizeClass(c) === sanitizeClass(assigned)) || assigned;
      setSelectedClass(match);
    }
    
    loadData();

    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredSearchStudents = allStudents
    .filter(s => sanitizeClass(s.class) === sanitizeClass(selectedClass))
    .filter(s => 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const classHistory = allScores.filter(score => {
    const student = allStudents.find(st => st.id === score.student_id);
    return student && sanitizeClass(student.class) === sanitizeClass(selectedClass);
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDbError(""); 

    if (!selectedStudent) return alert("Select a student first!");
    setLoading(true);

    const { error } = await supabase.from('test_scores').insert([
      {
        student_id: selectedStudent.id,
        subject: subject.toUpperCase().trim(),
        test_name: testName.toUpperCase().trim(),
        marks_obtained: Number(marks),
        total_marks: Number(total),
      },
    ]);

    setLoading(false);
    if (!error) {
      setSuccess(true);
      setMarks('');
      setSearchTerm('');
      setSelectedStudent(null);
      await loadData(); 
      setTimeout(() => setSuccess(false), 2000);
    } else {
      setDbError("Sync Failed: " + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Permanently delete this record?")) {
      await supabase.from('test_scores').delete().eq('id', id);
      await loadData();
    }
  };
  return (
    <div className="min-h-screen bg-transparent p-6 pt-24 pb-40 font-sans text-[var(--text)] relative z-0">
      
      {/* ✨ Ambient Premium Glow Background */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[350px] h-[350px] rounded-full bg-yellow-500/10 blur-[120px]"></div>
        <div className="absolute bottom-[10%] left-[-10%] w-[300px] h-[300px] rounded-full bg-orange-500/10 blur-[100px]"></div>
      </div>

      <div className="max-w-md mx-auto space-y-8">
        
        {/* Header & Back Button */}
        <div>
          <button onClick={() => router.back()} className="flex items-center gap-2 text-zinc-500 hover:text-[var(--text)] transition-colors text-[10px] font-black uppercase tracking-widest mb-8 active:scale-95">
            <ArrowLeft size={16} /> Admin Core
          </button>

          <div className="flex items-center gap-4 relative">
            <Sparkles className="absolute -top-5 -left-3 text-yellow-500/40 animate-pulse" size={32} />
            <div className="p-3 bg-yellow-500/10 rounded-[20px] border border-yellow-500/20 shadow-sm flex items-center justify-center">
              <Trophy className="text-yellow-500" size={28} />
            </div>
            <div>
              <h1 className="text-4xl font-black italic uppercase tracking-tighter leading-none text-[var(--text)]">
                Marks <span className="text-yellow-500 drop-shadow-[0_0_15px_rgba(234,179,8,0.3)]">Entry</span>
              </h1>
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[4px] mt-2 flex items-center gap-2">
                <span className="w-6 h-[1px] bg-zinc-400 block"></span> Education Node
              </p>
            </div>
          </div>
        </div>

        {dbError && (
          <div className="p-5 bg-red-500/10 backdrop-blur-md border border-red-500/20 rounded-[24px] flex items-center gap-4 shadow-sm animate-in fade-in slide-in-from-top-2">
             <AlertTriangle className="text-red-500 shrink-0" size={20} />
             <p className="text-[10px] font-black uppercase tracking-widest text-red-500 leading-relaxed">{dbError}</p>
          </div>
        )}

        {/* 📝 ENTRY FORM */}
        <div className="bg-[var(--card)]/90 backdrop-blur-2xl border border-[var(--border)] border-t-4 border-t-yellow-500 rounded-[35px] p-6 space-y-5 shadow-xl relative overflow-visible">
          
          <div className={`bg-[var(--background)] rounded-[20px] border border-[var(--border)] p-1 px-5 flex items-center shadow-inner transition-opacity ${userRole === 'teacher' ? 'opacity-70' : ''}`}>
            {userRole === 'teacher' ? <Lock size={16} className="text-yellow-600" /> : <Filter size={16} className="text-zinc-500" />}
            <select 
              disabled={userRole === 'teacher'}
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full bg-transparent p-4 text-sm font-black uppercase text-[var(--text)] outline-none appearance-none focus:text-yellow-500 transition-colors"
            >
              <option value="">Select Class</option>
              {classes.map(c => <option key={c} value={c}>Class {c}</option>)}
            </select>
          </div>

          <div className="relative" ref={searchRef}>
            <div 
              className={`bg-[var(--background)] rounded-[20px] border transition-all p-2 px-5 flex items-center shadow-inner ${isSearchOpen ? 'border-yellow-500 ring-4 ring-yellow-500/10' : 'border-[var(--border)]'}`}
              onClick={() => setIsSearchOpen(true)}
            >
              <Search size={18} className={`${selectedStudent ? 'text-yellow-500' : 'text-zinc-500'} mr-3 transition-colors`} />
              <input 
                type="text"
                placeholder={selectedStudent ? selectedStudent.name : "Search Student..."}
                value={searchTerm}
                onChange={(e) => {setSearchTerm(e.target.value); setIsSearchOpen(true);}}
                className={`w-full bg-transparent p-3 text-sm font-black uppercase outline-none placeholder:text-zinc-500 ${selectedStudent ? 'text-yellow-600 dark:text-yellow-500' : 'text-[var(--text)]'}`}
              />
            </div>

            {isSearchOpen && selectedClass && (
              <div className="absolute top-16 left-0 w-full bg-[var(--card)]/95 backdrop-blur-3xl border border-[var(--border)] rounded-[24px] shadow-2xl z-50 max-h-64 overflow-y-auto p-2">
                {filteredSearchStudents.length > 0 ? (
                  filteredSearchStudents.map(s => (
                    <div 
                      key={s.id} 
                      onClick={() => {setSelectedStudent(s); setIsSearchOpen(false); setSearchTerm('');}}
                      className="p-4 hover:bg-yellow-500/10 rounded-2xl flex items-center justify-between cursor-pointer group transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-zinc-500/10 flex items-center justify-center text-zinc-500 group-hover:text-yellow-500 group-hover:bg-yellow-500/20 transition-all font-black italic text-sm border border-[var(--border)]">
                          {s.name[0]}
                        </div>
                        <span className="text-sm font-black uppercase italic tracking-tight group-hover:text-yellow-600 dark:group-hover:text-yellow-500 transition-colors">{s.name}</span>
                      </div>
                      <span className="text-[9px] font-bold text-zinc-500 tracking-widest uppercase">ID: {s.id}</span>
                    </div>
                  ))
                ) : (
                  <p className="p-5 text-[10px] font-bold text-zinc-500 text-center uppercase tracking-widest">No student found</p>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <input type="text" placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} className="bg-[var(--background)] border border-[var(--border)] rounded-[20px] p-5 text-xs font-black uppercase text-[var(--text)] outline-none focus:border-yellow-500 focus:ring-4 focus:ring-yellow-500/10 transition-all shadow-inner placeholder:text-zinc-500" />
            <input type="text" placeholder="Test Name" value={testName} onChange={(e) => setTestName(e.target.value)} className="bg-[var(--background)] border border-[var(--border)] rounded-[20px] p-5 text-xs font-black uppercase text-[var(--text)] outline-none focus:border-yellow-500 focus:ring-4 focus:ring-yellow-500/10 transition-all shadow-inner placeholder:text-zinc-500" />
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="space-y-2">
               <span className="text-[9px] font-black uppercase text-zinc-500 tracking-widest ml-2">Score</span>
               <input type="number" placeholder="0" value={marks} onChange={(e) => setMarks(e.target.value)} className="w-full bg-[var(--background)] border border-[var(--border)] rounded-[24px] p-6 text-4xl font-black italic tracking-tighter text-center text-[var(--text)] outline-none focus:border-yellow-500 focus:ring-4 focus:ring-yellow-500/10 transition-all shadow-inner" />
            </div>
            <div className="space-y-2">
               <span className="text-[9px] font-black uppercase text-zinc-500 tracking-widest ml-2">Total Marks</span>
               <input type="number" placeholder="100" value={total} onChange={(e) => setTotal(e.target.value)} className="w-full bg-[var(--background)] border border-[var(--border)] rounded-[24px] p-6 text-4xl font-black italic tracking-tighter text-center text-[var(--text)] outline-none focus:border-yellow-500 focus:ring-4 focus:ring-yellow-500/10 transition-all shadow-inner" />
            </div>
          </div>

          <button 
            type="button"
            onClick={handleSubmit}
            disabled={loading || !selectedStudent || success}
            className={`w-full p-6 mt-4 rounded-[24px] font-black uppercase tracking-[3px] text-xs flex items-center justify-center gap-3 transition-all active:scale-95 shadow-[0_10px_25px_rgba(234,179,8,0.25)]
              ${success ? 'bg-green-500 text-white shadow-green-500/30' : 'bg-yellow-500 text-black hover:bg-yellow-400 disabled:bg-zinc-500/10 disabled:text-zinc-500 disabled:shadow-none disabled:border disabled:border-[var(--border)]'}
            `}
          >
            {loading ? <Loader2 className="animate-spin text-black" /> : success ? <><CheckCircle2 size={20} /> Data Logged!</> : <><Zap size={18} fill="currentColor" /> Deploy Scores</>}
          </button>
        </div>

        {/* 📚 HISTORY LEDGER */}
        <div className="pt-6">
          <div className="flex items-center justify-between mb-5 ml-2">
            <h2 className="text-[10px] font-black text-zinc-500 uppercase tracking-[4px]">Class Ledger</h2>
            <span className="text-[9px] font-black text-[var(--background)] bg-[var(--text)] px-3 py-1.5 rounded-full shadow-sm">{classHistory.length} Records</span>
          </div>

          {classHistory.length > 0 ? (
            <div className="space-y-3">
              {classHistory.slice(0, 15).map((score) => (
                <div key={score.id} className="p-5 bg-[var(--card)]/60 backdrop-blur-md border border-[var(--border)] border-l-4 border-l-yellow-500 rounded-[24px] flex items-center justify-between shadow-sm group active:scale-[0.98] hover:shadow-md transition-all">
                  <div>
                    <h4 className="text-sm font-black uppercase text-[var(--text)] italic tracking-tight leading-none mb-1.5">
                      {allStudents.find(s => s.id === score.student_id)?.name || "Unknown Student"}
                    </h4>
                    <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">
                      {score.subject} • {score.test_name}
                    </p>
                  </div>
                  <div className="flex items-center gap-5">
                    <span className="text-xl font-black italic text-yellow-600 dark:text-yellow-500 tracking-tighter drop-shadow-sm">
                      {score.marks_obtained}<span className="text-sm text-zinc-400">/{score.total_marks}</span>
                    </span>
                    <button onClick={() => handleDelete(score.id)} className="w-8 h-8 rounded-full bg-[var(--background)] border border-[var(--border)] flex items-center justify-center text-zinc-400 hover:text-red-500 hover:border-red-500/30 hover:bg-red-500/5 active:scale-90 transition-all">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-[var(--card)]/30 border border-dashed border-[var(--border)] rounded-[35px]">
               <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 opacity-50 italic leading-relaxed px-10">No scores logged for Class {selectedClass} yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
