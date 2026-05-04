'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase'; 
import { Trophy, Zap, ArrowLeft, Loader2, CheckCircle2, Filter, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function MarksEntry() {
  const router = useRouter();
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [subject, setSubject] = useState('');
  const [testName, setTestName] = useState('');
  const [marks, setMarks] = useState('');
  const [total, setTotal] = useState('');
  const [userRole, setUserRole] = useState<string | null>(null);

  const classes = ["5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"];

  useEffect(() => {
    const role = localStorage.getItem('role');
    const assigned = localStorage.getItem('assignedClass');
    setUserRole(role);

    // 🛡️ Teacher Isolation Logic
    if (role === 'teacher' && assigned) {
      setSelectedClass(assigned);
    }

    async function getStudents() {
      let query = supabase.from('students').select('id, name, class');
      if (role === 'teacher' && assigned) {
        query = query.eq('class', assigned);
      }
      const { data } = await query;
      if (data) setAllStudents(data);
    }
    getStudents();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      const filtered = allStudents.filter(s => s.class === selectedClass);
      setFilteredStudents(filtered);
      setSelectedStudent(''); 
    }
  }, [selectedClass, allStudents]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return alert("Select a student");
    setLoading(true);

    const { error } = await supabase.from('test_scores').insert([
      {
        student_id: selectedStudent,
        subject: subject.toUpperCase(),
        test_name: testName.toUpperCase(),
        marks_obtained: parseInt(marks),
        total_marks: parseInt(total),
      },
    ]);

    setLoading(false);
    if (!error) {
      setSuccess(true);
      setMarks('');
      setSubject('');
      setTestName('');
      setTimeout(() => setSuccess(false), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-transparent p-6 pt-28 pb-32 font-sans text-[var(--text)]">
      <div className="max-w-md mx-auto space-y-8">
        
        <button onClick={() => router.back()} className="text-zinc-500 flex items-center gap-2 text-xs font-bold uppercase tracking-widest active:scale-95 transition-all">
          <ArrowLeft size={16} /> Back
        </button>

        <div>
          <h1 className="text-3xl font-black italic tracking-tighter flex items-center gap-3 uppercase">
            <Trophy className="text-yellow-500" size={28} /> Marks Entry
          </h1>
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-[3px] mt-1 italic opacity-60">Education Node</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* STEP 1: CLASS SELECTION (LOCKED FOR TEACHERS) */}
          <div className={`bg-[var(--card)] rounded-[24px] border border-[var(--border)] p-1 px-4 flex items-center shadow-sm ${userRole === 'teacher' ? 'opacity-70' : ''}`}>
            {userRole === 'teacher' ? <Lock size={16} className="text-blue-500" /> : <Filter size={16} className="text-zinc-500" />}
            <select 
              required
              disabled={userRole === 'teacher'}
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full bg-transparent p-4 text-sm font-bold text-[var(--text)] outline-none appearance-none"
            >
              <option value="">{userRole === 'teacher' ? `Locked: Class ${selectedClass}` : 'Step 1: Select Class'}</option>
              {classes.map(c => (
                <option key={c} value={c} className="bg-[var(--card)] text-[var(--text)]">Class {c}</option>
              ))}
            </select>
          </div>

          {/* STEP 2: STUDENT SELECTION (FILTERED AUTOMATICALLY) */}
          <div className={`bg-[var(--card)] rounded-[24px] border transition-all p-1 px-4 shadow-sm ${selectedClass ? 'border-blue-500' : 'border-[var(--border)] opacity-50'}`}>
            <select 
              required
              disabled={!selectedClass}
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              className="w-full bg-transparent p-4 text-sm font-bold text-[var(--text)] outline-none appearance-none"
            >
              <option value="" className="bg-[var(--card)]">
                {selectedClass ? `Step 2: Select Student` : "Select class first"}
              </option>
              {filteredStudents.map(s => (
                <option key={s.id} value={s.id} className="bg-[var(--card)] text-[var(--text)]">{s.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4">
            <input required type="text" placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 text-sm font-bold text-[var(--text)] outline-none focus:border-blue-500 transition-all shadow-sm" />
            <input required type="text" placeholder="Test Name" value={testName} onChange={(e) => setTestName(e.target.value)} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 text-sm font-bold text-[var(--text)] outline-none focus:border-blue-500 transition-all shadow-sm" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-zinc-500 uppercase ml-2 tracking-widest">Score</label>
              <input required type="number" placeholder="00" value={marks} onChange={(e) => setMarks(e.target.value)} className="w-full bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 text-2xl font-black text-[var(--text)] outline-none focus:border-blue-500 shadow-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-zinc-500 uppercase ml-2 tracking-widest">Total</label>
              <input required type="number" placeholder="100" value={total} onChange={(e) => setTotal(e.target.value)} className="w-full bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 text-2xl font-black text-[var(--text)] outline-none focus:border-blue-500 shadow-sm" />
            </div>
          </div>

          <button 
            disabled={loading || !selectedStudent || success}
            className={`w-full p-6 rounded-[28px] font-black uppercase tracking-[2px] text-xs flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg mt-4
              ${success ? 'bg-green-600 text-white' : 'bg-blue-600 text-white shadow-blue-500/10 disabled:bg-zinc-500/20'}
            `}
          >
            {loading ? <Loader2 className="animate-spin" /> : success ? <><CheckCircle2 size={18} /> Data Logged!</> : <><Zap size={18} fill="currentColor" /> Deploy Scores</>}
          </button>
        </form>
      </div>
    </div>
  );
}
