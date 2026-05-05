'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, ChevronLeft, Trash2, Loader2, X, ShieldCheck, Plus, Filter, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function StudentLedger() {
  const [students, setStudents] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClass, setSelectedClass] = useState("All");
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const router = useRouter();

  const [newName, setNewName] = useState("");
  const [newClass, setNewClass] = useState("10th");
  const [isEnrolling, setIsEnrolling] = useState(false);

  const allClasses = ['All', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];

  const sanitizeClass = (cls: string | null) => {
    if (!cls) return "";
    return cls.toLowerCase().replace(/(st|nd|rd|th|standard|class)/g, "").trim();
  };

  useEffect(() => { 
    const role = localStorage.getItem('role');
    const assigned = localStorage.getItem('assignedClass');
    setUserRole(role);

    if (role === 'teacher' && assigned) {
      const match = allClasses.find(c => sanitizeClass(c) === sanitizeClass(assigned)) || assigned;
      setSelectedClass(match);
      setNewClass(match);
    }
    fetchStudents(); 
  }, []);

  async function fetchStudents() {
    setLoading(true);
    // Fetch all then filter in JS to avoid string matching issues
    const { data } = await supabase.from('students').select('*').order('name', { ascending: true });
    if (data) setStudents(data);
    setLoading(false);
  }

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setIsEnrolling(true);
    const newID = 'MX' + Math.floor(1000 + Math.random() * 9000); // Simple ID gen
    const { error } = await supabase.from('students').insert([{ id: newID, name: newName.trim(), class: newClass, attendance: 0 }]);
    if (!error) { 
      setNewName(""); 
      setShowAddModal(false); 
      fetchStudents(); 
    }
    setIsEnrolling(false);
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.id.includes(searchTerm.toUpperCase());
    const cleanSelected = sanitizeClass(selectedClass);
    const matchesClass = selectedClass === 'All' || sanitizeClass(s.class) === cleanSelected;
    return matchesSearch && matchesClass;
  });

  return (
    <div className="min-h-screen bg-transparent p-6 pt-28 font-sans text-[var(--text)] pb-40">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.back()} className="p-2 bg-[var(--card)] rounded-xl border border-[var(--border)] active:scale-90"><ChevronLeft size={20} /></button>
        <div>
          <h1 className="text-2xl font-black italic uppercase tracking-tighter leading-none">Student <span className="text-blue-500">Ledger</span></h1>
          <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mt-1 italic">{filteredStudents.length} Records Shown</p>
        </div>
      </div>

      <button onClick={() => setShowAddModal(true)} className="w-full mb-6 py-4 bg-blue-600/10 border border-blue-500/20 rounded-2xl flex items-center justify-center gap-3 active:scale-95 shadow-sm">
        <Plus size={18} className="text-blue-500" />
        <span className="text-[10px] font-black uppercase tracking-[2px] text-blue-500">Enroll New Student</span>
      </button>

      {userRole === 'teacher' ? (
        <div className="mb-4 flex items-center gap-2 px-4 py-2 bg-blue-500/5 border border-blue-500/20 rounded-xl w-fit">
          <Lock size={12} className="text-blue-500" />
          <span className="text-[9px] font-black uppercase text-blue-500 tracking-widest">Locked to Class {selectedClass}</span>
        </div>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-4 mb-4">
          {allClasses.map(cls => (
            <button key={cls} onClick={() => setSelectedClass(cls)} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${selectedClass === cls ? 'bg-blue-600 text-white shadow-lg' : 'bg-[var(--card)] text-zinc-500 border border-[var(--border)]'}`}>
              {cls === 'All' ? 'All Classes' : `${cls} Standard`}
            </button>
          ))}
        </div>
      )}

      <div className="bg-[var(--card)] border border-[var(--border)] rounded-[35px] overflow-hidden shadow-sm">
        <div className="divide-y divide-[var(--border)]">
          {loading ? <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-blue-500" /></div> : filteredStudents.length === 0 ? <div className="p-10 text-center text-zinc-500 text-xs font-black uppercase">No students found</div> :
            filteredStudents.map((student) => (
              <div key={student.id} className="p-5 flex items-center justify-between">
                <div className="text-left">
                  <p className="text-sm font-black italic uppercase text-[var(--text)] leading-tight">{student.name}</p>
                  <p className="text-[9px] text-blue-500 font-black tracking-widest">#{student.id} • {student.class}</p>
                </div>
                <div className="text-right flex items-center gap-4">
                  <span className={`text-xs font-black italic ${parseInt(student.attendance) < 75 ? 'text-orange-500' : 'text-green-500'}`}>{student.attendance}%</span>
                  <button onClick={async () => { if(confirm("Remove?")) { await supabase.from('students').delete().eq('id', student.id); fetchStudents(); }}} className="text-zinc-400 p-2"><Trash2 size={16} /></button>
                </div>
              </div>
            ))
          }
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-6 backdrop-blur-md bg-black/40">
          <form onSubmit={handleEnroll} className="relative w-full max-w-sm bg-[var(--card)] border border-[var(--border)] rounded-[40px] p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-black italic uppercase text-[var(--text)]">Enroll <span className="text-blue-500">New</span></h2>
              <button type="button" onClick={() => setShowAddModal(false)} className="text-zinc-500"><X size={24}/></button>
            </div>
            <div className="space-y-6">
              <input required type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="STUDENT FULL NAME" className="w-full bg-zinc-500/5 border border-[var(--border)] rounded-2xl py-5 px-6 text-xs font-black uppercase text-[var(--text)] outline-none focus:border-blue-500" />
              <select disabled={userRole === 'teacher'} value={newClass} onChange={(e) => setNewClass(e.target.value)} className="w-full bg-zinc-500/5 border border-[var(--border)] rounded-2xl py-5 px-6 text-xs font-black uppercase text-[var(--text)] outline-none appearance-none">
                {allClasses.filter(c => c !== 'All').map(cls => <option key={cls} value={cls}>{cls} Grade</option>)}
              </select>
              <button type="submit" disabled={isEnrolling} className="w-full bg-blue-600 text-white py-6 rounded-[28px] flex items-center justify-center gap-3 font-black uppercase tracking-[3px] text-xs active:scale-95 transition-all shadow-lg">
                {isEnrolling ? <Loader2 className="animate-spin" /> : <>Complete Enrollment <ShieldCheck size={18}/></>}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
