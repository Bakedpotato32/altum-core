'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase'; 
import { Trophy, Zap, ArrowLeft, Loader2, CheckCircle2, Filter, Lock, Trash2, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function MarksEntry() {
  const router = useRouter();
  
  // Master State
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [allScores, setAllScores] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState(""); // 🚀 New: On-screen error tracking
  
  // Form State
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [subject, setSubject] = useState('');
  const [testName, setTestName] = useState('');
  const [marks, setMarks] = useState('');
  const [total, setTotal] = useState('');
  const [userRole, setUserRole] = useState<string | null>(null);

  const classes = ["5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"];

  const sanitizeClass = (cls: string | null) => {
    if (!cls) return "";
    return cls.toLowerCase().replace(/(st|nd|rd|th)/g, "").trim();
  };

  // 🚀 Fetch Everything Once Function
  const loadData = async () => {
    try {
      const [{ data: stData }, { data: scData, error: scError }] = await Promise.all([
        supabase.from('students').select('*'),
        // Removed .order() to prevent database crashes if 'created_at' column is missing
        supabase.from('test_scores').select('*') 
      ]);
      
      if (stData) setAllStudents(stData);
      
      if (scData) {
        setAllScores(scData.reverse()); // Reverse in JavaScript instead to show newest first
      } else if (scError) {
        setErrorMsg("History Error: " + scError.message);
      }
    } catch (err: any) {
      setErrorMsg("Network Error: Could not connect to database.");
    }
  };

  useEffect(() => {
    const role = localStorage.getItem('role');
    const assigned = localStorage.getItem('assignedClass');
    setUserRole(role);

    if (role === 'teacher' && assigned) {
      const matchingClass = classes.find(c => sanitizeClass(c) === sanitizeClass(assigned)) || assigned;
      setSelectedClass(matchingClass);
    }

    loadData();
  }, []);

  const filteredStudents = selectedClass 
    ? allStudents.filter(s => sanitizeClass(s.class) === sanitizeClass(selectedClass))
    : [];

  const displayedScores = allScores
    .filter(score => filteredStudents.some(s => s.id === score.student_id))
    .slice(0, 15);

  // 🚀 Bulletproof Submit (No HTML5 Form Blocking)
  const handleSubmit = async (e: React.MouseEvent) => {
    e.preventDefault();
    setErrorMsg(""); // Clear old errors

    if (!selectedStudent || !marks || !total || !subject || !testName) {
      setErrorMsg("Missing Data: Please fill all fields before deploying.");
      return;
    }
    
    setLoading(true);
    const { error } = await supabase.from('test_scores').insert([
      {
        student_id: selectedStudent,
        subject: subject.toUpperCase().trim(),
        test_name: testName.toUpperCase().trim(),
        marks_obtained: Number(marks),
        total_marks: Number(total),
      },
    ]);

    if (error) {
      setErrorMsg("Database Sync Failed: " + error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setMarks('');
      setTotal(''); 
      await loadData(); // Silently refreshes history table
      setLoading(false);
      setTimeout(() => setSuccess(false), 2000);
    }
  };

  // 🚀 Bulletproof Delete (Bypasses PWA popup blockers)
  const handleDelete = async (id: string) => {
    setLoading(true);
    await supabase.from('test_scores').delete().eq('id', id);
    await loadData(); 
    setLoading(false);
  };

  const getStudentName = (id: string) => {
    const student = allStudents.find(s => s.id === id);
    return student ? student.name : id;
  };

  return (
    <div className="min-h-screen bg-transparent p-6 pt-28 pb-32 font-sans text-[var(--text)]">
      <div className="max-w-md mx-auto space-y-8">
        <button onClick={() => router.back()} className="text-zinc-500 flex items-center gap-2 text-xs font-bold uppercase tracking-widest active:scale-95 transition-all"><ArrowLeft size={16} /> Back</button>
        <div>
          <h1 className="text-3xl font-black italic tracking-tighter flex items-center gap-3 uppercase"><Trophy className="text-yellow-500" size={28} /> Marks Entry</h1>
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-[3px] mt-1 italic opacity-60">Education Node</p>
        </div>

        {/* Changed from <form> to <div> to bypass silent mobile validation blocks */}
        <div className="space-y-4">
          <div className={`bg-[var(--card)] rounded-[24px] border border-[var(--border)] p-1 px-4 flex items-center shadow-sm ${userRole === 'teacher' ? 'opacity-70' : ''}`}>
            {userRole === 'teacher' ? <Lock size={16} className="text-blue-500" /> : <Filter size={16} className="text-zinc-500" />}
            <select 
              disabled={userRole === 'teacher'}
              value={selectedClass}
              onChange={(e) => {
                  setSelectedClass(e.target.value);
                  setSelectedStudent(''); 
              }}
              className="w-full bg-transparent p-4 text-sm font-bold text-[var(--text)] outline-none appearance-none"
            >
              <option value="">{userRole === 'teacher' ? `Locked: Class ${selectedClass}` : 'Step 1: Select Class'}</option>
              {classes.map(c => <option key={c} value={c}>Class {c}</option>)}
            </select>
          </div>

          <div className={`bg-[var(--card)] rounded-[24px] border transition-all p-1 px-4 shadow-sm ${selectedClass ? 'border-blue-500' : 'border-[var(--border)] opacity-50'}`}>
            <select disabled={!selectedClass} value={selectedStudent} onChange={(e) => setSelectedStudent(e.target.value)} className="w-full bg-transparent p-4 text-sm font-bold text-[var(--text)] outline-none appearance-none">
              <option value="">{selectedClass ? `Step 2: Select Student` : "Select class first"}</option>
              {filteredStudents.map(s => <option key={s.id} value={s.id}>{s.name} (ID: {s.id})</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4">
            <input type="text" placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 text-sm font-bold text-[var(--text)] outline-none focus:border-blue-500 transition-all shadow-sm" />
            <input type="text" placeholder="Test Name" value={testName} onChange={(e) => setTestName(e.target.value)} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 text-sm font-bold text-[var(--text)] outline-none focus:border-blue-500 transition-all shadow-sm" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-zinc-500 uppercase ml-2 tracking-widest">Score</label>
              <input type="number" placeholder="0" value={marks} onChange={(e) => setMarks(e.target.value)} className="w-full bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 text-2xl font-black text-[var(--text)] outline-none focus:border-blue-500 shadow-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-zinc-500 uppercase ml-2 tracking-widest">Total</label>
              <input type="number" placeholder="100" value={total} onChange={(e) => setTotal(e.target.value)} className="w-full bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 text-2xl font-black text-[var(--text)] outline-none focus:border-blue-500 shadow-sm" />
            </div>
          </div>

          {/* 🆕 ERROR DISPLAY */}
          {errorMsg && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3">
              <AlertTriangle className="text-red-500 shrink-0" size={18} />
              <p className="text-[10px] font-black uppercase tracking-widest text-red-500 leading-relaxed">{errorMsg}</p>
            </div>
          )}

          <button 
            type="button" // Changed from submit to button
            onClick={handleSubmit}
            disabled={loading || success}
            className={`w-full p-6 rounded-[28px] font-black uppercase tracking-[2px] text-xs flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg mt-4
              ${success ? 'bg-green-600 text-white' : 'bg-blue-600 text-white shadow-blue-500/10 disabled:bg-zinc-500/20 disabled:shadow-none'}
            `}
          >
            {loading ? <Loader2 className="animate-spin" /> : success ? <><CheckCircle2 size={18} /> Data Logged!</> : <><Zap size={18} fill="currentColor" /> Deploy Scores</>}
          </button>
        </div>

        <div className="pt-8 border-t border-[var(--border)]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[10px] font-black text-zinc-500 uppercase tracking-[3px]">Class History</h2>
            <span className="text-[8px] font-bold text-zinc-400 bg-[var(--card)] border border-[var(--border)] px-2 py-1 rounded-md">{displayedScores.length} Records</span>
          </div>
          
          {displayedScores.length > 0 ? (
            <div className="space-y-3">
              {displayedScores.map((score) => (
                <div key={score.id} className="p-4 bg-[var(--card)] border border-[var(--border)] rounded-2xl flex items-center justify-between shadow-sm active:scale-[0.98] transition-all">
                  <div>
                    <h4 className="text-xs font-black uppercase text-[var(--text)] leading-none mb-1">{getStudentName(score.student_id)}</h4>
                    <p className="text-[8px] font-bold text-zinc-500 uppercase">{score.subject} • {score.test_name}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-black italic text-blue-500">{score.marks_obtained}/{score.total_marks}</span>
                    <button onClick={() => handleDelete(score.id)} disabled={loading} className="text-zinc-400 hover:text-red-500 transition-colors p-2 disabled:opacity-50">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 bg-[var(--card)] rounded-2xl border border-dashed border-[var(--border)]">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 opacity-60">No scores logged yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
