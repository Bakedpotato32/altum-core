'use client';
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase'; 
import { Trophy, Zap, ArrowLeft, Loader2, CheckCircle2, Filter, Lock, Trash2, Search, User, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function MarksEntry() {
  const router = useRouter();
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [allScores, setAllScores] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [dbError, setDbError] = useState(""); // 🚀 Failsafe Error Display
  
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
      // 🛡️ CRITICAL FIX: Removed .order('created_at') which was silently crashing the query
      const [{ data: stData }, { data: scData, error: scError }] = await Promise.all([
        supabase.from('students').select('*').order('name', { ascending: true }),
        supabase.from('test_scores').select('*') 
      ]);
      
      if (stData) setAllStudents(stData);
      
      if (scData) {
        // Reverse in JavaScript so we don't stress the database
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
    setDbError(""); // Clear errors

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
    <div className="min-h-screen bg-transparent p-6 pt-28 pb-40 font-sans text-[var(--text)]">
      <div className="max-w-md mx-auto space-y-8">
        <button onClick={() => router.back()} className="text-zinc-500 flex items-center gap-2 text-xs font-bold uppercase tracking-widest active:scale-95 transition-all">
          <ArrowLeft size={16} /> Back
        </button>

        <div>
          <h1 className="text-3xl font-black italic tracking-tighter uppercase flex items-center gap-3">
            <Trophy className="text-yellow-500" size={28} /> Marks Entry
          </h1>
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-[3px] mt-1 italic opacity-60">Education Node</p>
        </div>

        {dbError && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3">
             <AlertTriangle className="text-red-500 shrink-0" size={18} />
             <p className="text-[10px] font-black uppercase tracking-widest text-red-500 leading-relaxed">{dbError}</p>
          </div>
        )}

        <div className="space-y-4">
          <div className={`bg-[var(--card)] rounded-[24px] border border-[var(--border)] p-1 px-4 flex items-center shadow-sm ${userRole === 'teacher' ? 'opacity-80' : ''}`}>
            {userRole === 'teacher' ? <Lock size={16} className="text-blue-500" /> : <Filter size={16} className="text-zinc-500" />}
            <select 
              disabled={userRole === 'teacher'}
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full bg-transparent p-4 text-sm font-bold text-[var(--text)] outline-none appearance-none"
            >
              <option value="">Select Class</option>
              {classes.map(c => <option key={c} value={c}>Class {c}</option>)}
            </select>
          </div>

          <div className="relative" ref={searchRef}>
            <div 
              className={`bg-[var(--card)] rounded-[24px] border transition-all p-2 px-4 flex items-center shadow-sm ${isSearchOpen ? 'border-blue-500 ring-4 ring-blue-500/5' : 'border-[var(--border)]'}`}
              onClick={() => setIsSearchOpen(true)}
            >
              <Search size={18} className="text-zinc-500 mr-3" />
              <input 
                type="text"
                placeholder={selectedStudent ? selectedStudent.name : "Tap to Search Student..."}
                value={searchTerm}
                onChange={(e) => {setSearchTerm(e.target.value); setIsSearchOpen(true);}}
                className="w-full bg-transparent p-3 text-sm font-bold outline-none placeholder:text-zinc-600"
              />
            </div>

            {isSearchOpen && selectedClass && (
              <div className="absolute top-16 left-0 w-full bg-[var(--card)] border border-[var(--border)] rounded-[28px] shadow-2xl z-50 max-h-64 overflow-y-auto p-2 backdrop-blur-2xl">
                {filteredSearchStudents.length > 0 ? (
                  filteredSearchStudents.map(s => (
                    <div 
                      key={s.id} 
                      onClick={() => {setSelectedStudent(s); setIsSearchOpen(false); setSearchTerm('');}}
                      className="p-4 hover:bg-blue-500/10 rounded-2xl flex items-center justify-between cursor-pointer group transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-zinc-500/10 flex items-center justify-center text-zinc-500 group-hover:text-blue-500"><User size={14}/></div>
                        <span className="text-sm font-black uppercase italic tracking-tight">{s.name}</span>
                      </div>
                      <span className="text-[9px] font-bold text-zinc-500 bg-zinc-500/5 px-2 py-1 rounded-md">ID: ***{s.id.slice(-3)}</span>
                    </div>
                  ))
                ) : (
                  <p className="p-4 text-[10px] font-bold text-zinc-500 text-center uppercase tracking-widest">No student found</p>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4">
            <input type="text" placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 text-sm font-bold text-[var(--text)] outline-none focus:border-blue-500 transition-all shadow-sm" />
            <input type="text" placeholder="Test Name" value={testName} onChange={(e) => setTestName(e.target.value)} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 text-sm font-bold text-[var(--text)] outline-none focus:border-blue-500 transition-all shadow-sm" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1 text-center">
               <span className="text-[8px] font-black uppercase text-zinc-500 tracking-widest">Score</span>
               <input type="number" placeholder="0" value={marks} onChange={(e) => setMarks(e.target.value)} className="w-full bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 text-2xl font-black text-center text-[var(--text)] outline-none focus:border-blue-500 shadow-sm" />
            </div>
            <div className="space-y-1 text-center">
               <span className="text-[8px] font-black uppercase text-zinc-500 tracking-widest">Total</span>
               <input type="number" placeholder="100" value={total} onChange={(e) => setTotal(e.target.value)} className="w-full bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 text-2xl font-black text-center text-[var(--text)] outline-none focus:border-blue-500 shadow-sm" />
            </div>
          </div>

          <button 
            type="button"
            onClick={handleSubmit}
            disabled={loading || !selectedStudent || success}
            className={`w-full p-6 rounded-[28px] font-black uppercase tracking-[2px] text-xs flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg mt-4
              ${success ? 'bg-green-600 text-white shadow-green-500/20' : 'bg-blue-600 text-white shadow-blue-500/10 disabled:bg-zinc-500/20 disabled:shadow-none'}
            `}
          >
            {loading ? <Loader2 className="animate-spin" /> : success ? <><CheckCircle2 size={18} /> Data Logged!</> : <><Zap size={18} fill="currentColor" /> Deploy Scores</>}
          </button>
        </div>

        <div className="pt-10 border-t border-[var(--border)]">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[10px] font-black text-zinc-500 uppercase tracking-[4px] ml-2">Class History</h2>
            <span className="text-[8px] font-bold text-zinc-400 bg-[var(--card)] border border-[var(--border)] px-3 py-1 rounded-full">{classHistory.length} Total Records</span>
          </div>

          {classHistory.length > 0 ? (
            <div className="space-y-4">
              {classHistory.slice(0, 15).map((score) => (
                <div key={score.id} className="p-5 bg-[var(--card)] border border-[var(--border)] rounded-[32px] flex items-center justify-between shadow-sm group active:scale-[0.98] transition-all">
                  <div>
                    <h4 className="text-xs font-black uppercase text-[var(--text)] italic tracking-tight">
                      {allStudents.find(s => s.id === score.student_id)?.name || "Unknown Student"}
                    </h4>
                    <p className="text-[8px] font-bold text-zinc-500 uppercase mt-1 tracking-tighter opacity-60">
                      {score.subject} • {score.test_name}
                    </p>
                  </div>
                  <div className="flex items-center gap-5">
                    <span className="text-sm font-black italic text-blue-500 tracking-tighter">
                      {score.marks_obtained}/{score.total_marks}
                    </span>
                    <button onClick={() => handleDelete(score.id)} className="text-zinc-400 hover:text-red-500 transition-colors p-2 active:scale-90">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-zinc-500/5 border border-dashed border-[var(--border)] rounded-[40px]">
               <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 opacity-40 italic leading-relaxed px-10">No scores have been logged for Class {selectedClass} yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
