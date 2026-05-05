'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, IndianRupee, Loader2, Plus, Search, ShieldCheck, User, ReceiptText, Clock, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

export default function FeeAdmin() {
  const router = useRouter();
  const [tab, setTab] = useState<'collect' | 'config'>('collect');
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState('All'); 
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  
  // Config States
  const [feeStructures, setFeeStructures] = useState<any[]>([]);
  const [newClass, setNewClass] = useState('5th');
  const [newTitle, setNewTitle] = useState('');
  const [newAmount, setNewAmount] = useState('');

  // Collect States
  const [studentFeeOptions, setStudentFeeOptions] = useState<any[]>([]);
  const [selectedFeeId, setSelectedFeeId] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [paidTillUpdate, setPaidTillUpdate] = useState('');
  const [studentHistory, setStudentHistory] = useState<any[]>([]); 

  const allClasses = ['All', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];
  const configClasses = ["5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"];

  useEffect(() => {
    const role = localStorage.getItem('role');
    if (role !== 'principal') { router.push('/admin'); return; }
    loadData();
  }, []);

  const loadData = async () => {
    const [{ data: stData }, { data: fsData }] = await Promise.all([
      supabase.from('students').select('*').order('name'),
      supabase.from('fee_structure').select('*')
    ]);
    if (stData) setStudents(stData);
    if (fsData) setFeeStructures(fsData);
  };

  const handleAddStructure = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await supabase.from('fee_structure').insert([{ class_name: newClass, fee_title: newTitle.toUpperCase(), amount: Number(newAmount) }]);
    setNewTitle(''); setNewAmount('');
    await loadData();
    setLoading(false);
  };

  const deleteStructure = async (id: string) => {
    if (confirm("Delete this fee template?")) {
      await supabase.from('fee_structure').delete().eq('id', id);
      loadData();
    }
  };

  // 🚀 NEW: DELETE PAYMENT HISTORY RECORD
  const handleDeletePayment = async (paymentId: string) => {
    if (confirm("Undo and delete this payment record permanently?")) {
      await supabase.from('fee_payments').delete().eq('id', paymentId);
      
      // Refresh the instant history below
      const { data: hist } = await supabase
        .from('fee_payments')
        .select('*')
        .eq('student_id', selectedStudent.id)
        .order('payment_date', { ascending: false });
      if (hist) setStudentHistory(hist);
    }
  };

  const handleSelectStudent = async (student: any) => {
    setSelectedStudent(student);
    setSearchTerm('');
    
    const options = feeStructures.filter(f => f.class_name === student.class);
    setStudentFeeOptions(options);
    
    if (options.length > 0) {
      setSelectedFeeId(options[0].id);
      setPayAmount(options[0].amount.toString());
      setPaidTillUpdate(options[0].fee_title); 
    } else {
      setPaidTillUpdate(student.paid_till || '');
    }

    const { data: hist } = await supabase
      .from('fee_payments')
      .select('*')
      .eq('student_id', student.id)
      .order('payment_date', { ascending: false });
    
    if (hist) setStudentHistory(hist);
  };

  const handleFeeSelectionChange = (e: any) => {
    const id = e.target.value;
    setSelectedFeeId(id);
    const fee = studentFeeOptions.find(f => f.id === id);
    if (fee) {
      setPayAmount(fee.amount.toString());
      setPaidTillUpdate(fee.fee_title); 
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const feeConfig = studentFeeOptions.find(f => f.id === selectedFeeId);
    
    await supabase.from('fee_payments').insert([{
      student_id: selectedStudent.id,
      fee_title: feeConfig ? feeConfig.fee_title : 'CUSTOM PAYMENT',
      amount_paid: Number(payAmount)
    }]);

    if (paidTillUpdate.trim() !== '') {
      await supabase.from('students').update({ paid_till: paidTillUpdate.toUpperCase().trim() }).eq('id', selectedStudent.id);
    }

    alert("Payment Logged Successfully!");
    setSelectedStudent(null);
    await loadData();
    setLoading(false);
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = selectedClassFilter === 'All' || s.class === selectedClassFilter;
    return matchesSearch && matchesClass;
  });

  return (
    <div className="min-h-screen bg-transparent p-6 pt-24 pb-40 text-[var(--text)] font-sans">
      <div className="max-w-md mx-auto space-y-8">
        <button onClick={() => router.push('/admin')} className="flex items-center gap-2 text-zinc-500 text-[10px] font-black uppercase tracking-widest active:scale-95"><ArrowLeft size={14} /> Admin Core</button>
        <div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter">Finance <span className="text-emerald-500">Node</span></h1>
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[3px] mt-1 italic opacity-60">Principal Access Only</p>
        </div>

        <div className="flex gap-2 bg-[var(--card)] p-1 rounded-[20px] border border-[var(--border)] shadow-sm">
          <button onClick={() => setTab('collect')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-[16px] transition-all ${tab === 'collect' ? 'bg-emerald-500 text-white shadow-lg' : 'text-zinc-500'}`}>Collection Desk</button>
          <button onClick={() => setTab('config')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-[16px] transition-all ${tab === 'config' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500'}`}>Configurator</button>
        </div>

        {tab === 'config' ? (
          <div className="space-y-8 animate-in fade-in">
            <form onSubmit={handleAddStructure} className="bg-[var(--card)] border border-[var(--border)] rounded-[32px] p-6 space-y-4 shadow-sm">
              <h3 className="text-xs font-black uppercase tracking-widest text-emerald-500 mb-2">Create Fee Template</h3>
              <select value={newClass} onChange={(e) => setNewClass(e.target.value)} className="w-full bg-[var(--background)] border border-[var(--border)] rounded-2xl p-4 text-sm font-bold outline-none text-[var(--text)] appearance-none">
                {configClasses.map(c => <option key={c} value={c}>Class {c}</option>)}
              </select>
              <input required type="text" placeholder="FEE TITLE (e.g. MAY TUITION)" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="w-full bg-[var(--background)] border border-[var(--border)] rounded-2xl p-4 text-sm font-bold uppercase outline-none text-[var(--text)]" />
              <input required type="number" placeholder="AMOUNT (₹)" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} className="w-full bg-[var(--background)] border border-[var(--border)] rounded-2xl p-4 text-sm font-bold outline-none text-[var(--text)]" />
              <button disabled={loading} className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-emerald-500/20">
                {loading ? <Loader2 className="animate-spin" /> : <><Plus size={16} /> Save Template</>}
              </button>
            </form>

            <div className="space-y-3">
              {feeStructures.map(f => (
                <div key={f.id} className="p-4 bg-[var(--card)] border border-[var(--border)] rounded-2xl flex justify-between items-center shadow-sm">
                  <div><p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">{f.class_name} Standard</p><p className="font-bold text-sm">{f.fee_title}</p></div>
                  <div className="flex items-center gap-4"><span className="font-black text-emerald-500">₹{f.amount}</span><button onClick={() => deleteStructure(f.id)} className="text-red-500 text-xs font-bold uppercase p-2">Del</button></div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in">
            {!selectedStudent ? (
              <>
                <div className="relative">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input type="text" placeholder="SEARCH STUDENT..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-[var(--card)] border border-[var(--border)] rounded-[24px] py-5 pl-12 pr-4 text-xs font-black outline-none text-[var(--text)] placeholder:text-zinc-500 uppercase tracking-widest shadow-sm" />
                </div>

                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {allClasses.map(cls => (
                    <button 
                      key={cls} 
                      onClick={() => setSelectedClassFilter(cls)} 
                      className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${selectedClassFilter === cls ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-[var(--card)] text-zinc-500 border border-[var(--border)]'}`}
                    >
                      {cls === 'All' ? 'All Classes' : `${cls} STD`}
                    </button>
                  ))}
                </div>

                <div className="bg-[var(--card)] border border-[var(--border)] rounded-[32px] overflow-hidden shadow-sm">
                  <div className="divide-y divide-[var(--border)]">
                    {filteredStudents.length === 0 ? (
                       <p className="p-10 text-[10px] font-black text-zinc-500 text-center uppercase tracking-widest">No student found</p>
                    ) : (
                      filteredStudents.map(s => (
                        <div key={s.id} onClick={() => handleSelectStudent(s)} className="p-5 hover:bg-emerald-500/5 cursor-pointer flex justify-between items-center group transition-colors">
                           <div>
                             <p className="font-black italic uppercase text-sm group-hover:text-emerald-500 transition-colors">{s.name}</p>
                             <p className="text-[9px] text-zinc-500 font-bold tracking-widest mt-1">ID: {s.id} • CLASS: {s.class}</p>
                           </div>
                           {/* Using simple truthy check here since Admin doesn't need to see the dynamic color calculation */}
                           <div className={`text-[8px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest ${s.paid_till ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>{s.paid_till || 'PENDING'}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-6">
                <form onSubmit={handlePaymentSubmit} className="bg-[var(--card)] border border-[var(--border)] rounded-[35px] p-6 space-y-5 shadow-xl relative overflow-hidden">
                  <div className="flex justify-between items-center border-b border-[var(--border)] pb-4 mb-4">
                    <div>
                      <h3 className="font-black italic uppercase text-xl text-emerald-500">{selectedStudent.name}</h3>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Class: {selectedStudent.class} • ID: {selectedStudent.id}</p>
                    </div>
                    <button type="button" onClick={() => setSelectedStudent(null)} className="text-[10px] font-black text-red-500 bg-red-500/10 px-4 py-2 rounded-xl uppercase tracking-widest active:scale-95">Cancel</button>
                  </div>

                  <div className="space-y-1">
                     <label className="text-[8px] font-black text-zinc-500 uppercase tracking-widest ml-2">Select Fee Type</label>
                     <select value={selectedFeeId} onChange={handleFeeSelectionChange} className="w-full bg-[var(--background)] border border-[var(--border)] rounded-2xl p-4 text-sm font-bold outline-none text-[var(--text)] appearance-none">
                       {studentFeeOptions.length === 0 && <option value="">No templates for this class</option>}
                       {studentFeeOptions.map(f => <option key={f.id} value={f.id}>{f.fee_title}</option>)}
                     </select>
                  </div>

                  <div className="space-y-1">
                     <label className="text-[8px] font-black text-zinc-500 uppercase tracking-widest ml-2">Amount Collecting (₹)</label>
                     <input required type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className="w-full bg-[var(--background)] border-2 border-emerald-500/50 rounded-2xl p-5 text-3xl font-black outline-none text-emerald-500 text-center shadow-inner" />
                  </div>

                  <div className="space-y-1 pt-2">
                     <label className="text-[8px] font-black text-blue-500 uppercase tracking-widest ml-2">Update Student's "Paid Till" Month</label>
                     <input type="text" value={paidTillUpdate} onChange={(e) => setPaidTillUpdate(e.target.value)} className="w-full bg-[var(--background)] border border-blue-500/30 rounded-2xl p-4 text-sm font-black uppercase outline-none text-blue-500 placeholder:text-blue-500/40" />
                     <p className="text-[7px] font-bold text-zinc-500 tracking-widest ml-2 mt-1 uppercase">*This is what the student sees on their dashboard</p>
                  </div>

                  <button disabled={loading} className="w-full py-5 mt-4 bg-emerald-500 text-white rounded-[24px] font-black uppercase tracking-[3px] text-xs flex items-center justify-center gap-2 active:scale-95 shadow-xl shadow-emerald-500/20">
                    {loading ? <Loader2 className="animate-spin" /> : <><ShieldCheck size={18} /> Confirm Payment</>}
                  </button>
                </form>

                <div className="pt-4">
                  <div className="flex items-center gap-2 mb-4 ml-2">
                    <ReceiptText size={16} className="text-zinc-500" />
                    <h2 className="text-[10px] font-black text-zinc-500 uppercase tracking-[4px]">Past Records</h2>
                  </div>
                  
                  {studentHistory.length > 0 ? (
                    <div className="space-y-3">
                      {studentHistory.map(payment => (
                        <div key={payment.id} className="p-4 bg-[var(--card)] border border-[var(--border)] rounded-[24px] flex justify-between items-center shadow-sm">
                           <div>
                             <h4 className="text-xs font-black uppercase italic text-[var(--text)]">{payment.fee_title}</h4>
                             <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest mt-1 flex items-center gap-1">
                               <Clock size={8} /> {format(new Date(payment.payment_date), 'dd MMM yyyy')}
                             </p>
                           </div>
                           <div className="flex items-center gap-4">
                             <span className="text-sm font-black italic text-emerald-500">₹{payment.amount_paid}</span>
                             {/* 🚀 NEW: DELETE BUTTON */}
                             <button onClick={() => handleDeletePayment(payment.id)} className="text-zinc-400 hover:text-red-500 p-2 active:scale-90 transition-colors">
                               <Trash2 size={16} />
                             </button>
                           </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-zinc-500/5 border border-dashed border-[var(--border)] rounded-[28px]">
                       <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 opacity-50 italic">No past payments found for this student.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
