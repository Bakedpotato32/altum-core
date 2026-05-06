'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, IndianRupee, Loader2, Plus, Search, ShieldCheck, User, ReceiptText, Clock, Trash2, Sparkles, Wallet, Save } from 'lucide-react';
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

  const handleDeletePayment = async (paymentId: string) => {
    if (confirm("Undo and delete this payment record permanently?")) {
      await supabase.from('fee_payments').delete().eq('id', paymentId);
      
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
    <div className="min-h-screen bg-transparent p-6 pt-24 pb-40 text-[var(--text)] font-sans relative z-0">
      
      {/* ✨ Ambient Premium Glow Background */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[350px] h-[350px] rounded-full bg-emerald-500/10 blur-[120px]"></div>
        <div className="absolute bottom-[10%] left-[-10%] w-[300px] h-[300px] rounded-full bg-blue-500/10 blur-[100px]"></div>
      </div>

      <div className="max-w-md mx-auto space-y-8">
        
        {/* Header & Back Button */}
        <div>
          <button onClick={() => router.push('/admin')} className="flex items-center gap-2 text-zinc-500 hover:text-[var(--text)] transition-colors text-[10px] font-black uppercase tracking-widest mb-8 active:scale-95">
            <ArrowLeft size={16} /> Admin Core
          </button>

          <div className="flex items-center gap-4 relative">
            <Sparkles className="absolute -top-5 -left-3 text-emerald-500/40 animate-pulse" size={32} />
            <div className="p-3 bg-emerald-500/10 rounded-[20px] border border-emerald-500/20 shadow-sm flex items-center justify-center">
              <IndianRupee className="text-emerald-500" size={28} />
            </div>
            <div>
              <h1 className="text-4xl font-black italic uppercase tracking-tighter leading-none text-[var(--text)]">
                Finance <span className="text-emerald-500 drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]">Node</span>
              </h1>
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[4px] mt-2 flex items-center gap-2">
                <span className="w-6 h-[1px] bg-zinc-400 block"></span> Principal Access
              </p>
            </div>
          </div>
        </div>

        {/* 🎛️ Premium Segmented Tab Control */}
        <div className="flex gap-2 bg-[var(--card)]/80 backdrop-blur-xl p-1.5 rounded-[24px] border border-[var(--border)] shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
          <button onClick={() => setTab('collect')} className={`flex-1 py-3.5 text-[10px] font-black uppercase tracking-widest rounded-[20px] transition-all duration-300 ${tab === 'collect' ? 'bg-emerald-500 text-white shadow-[0_4px_15px_rgba(16,185,129,0.3)]' : 'text-zinc-500 hover:bg-zinc-500/5'}`}>
            Collection Desk
          </button>
          <button onClick={() => setTab('config')} className={`flex-1 py-3.5 text-[10px] font-black uppercase tracking-widest rounded-[20px] transition-all duration-300 ${tab === 'config' ? 'bg-[var(--text)] text-[var(--background)] shadow-lg' : 'text-zinc-500 hover:bg-zinc-500/5'}`}>
            Configurator
          </button>
        </div>

        {tab === 'config' ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* 🛠️ Configurator Form */}
            <form onSubmit={handleAddStructure} className="bg-[var(--card)]/80 backdrop-blur-xl border border-[var(--border)] border-l-4 border-l-emerald-500 rounded-[35px] p-6 space-y-5 shadow-sm">
              <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text)] mb-2 flex items-center gap-2">
                <Plus size={16} className="text-emerald-500" /> Create Fee Template
              </h3>
              
              <div className="space-y-3">
                <select value={newClass} onChange={(e) => setNewClass(e.target.value)} className="w-full bg-[var(--background)] border border-[var(--border)] rounded-2xl p-4 text-sm font-bold outline-none text-[var(--text)] focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all appearance-none">
                  {configClasses.map(c => <option key={c} value={c}>Class {c}</option>)}
                </select>
                <input required type="text" placeholder="FEE TITLE (e.g. MAY TUITION)" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="w-full bg-[var(--background)] border border-[var(--border)] rounded-2xl p-4 text-sm font-bold uppercase outline-none text-[var(--text)] focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all placeholder:text-zinc-500" />
                <input required type="number" placeholder="AMOUNT (₹)" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} className="w-full bg-[var(--background)] border border-[var(--border)] rounded-2xl p-4 text-sm font-bold outline-none text-[var(--text)] focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all placeholder:text-zinc-500" />
              </div>
              
              <button disabled={loading} className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 active:scale-95 shadow-[0_8px_20px_rgba(16,185,129,0.25)] transition-all disabled:opacity-50">
                {loading ? <Loader2 className="animate-spin" /> : <><Save size={16} /> Save Template</>}
              </button>
            </form>

            <div className="space-y-3">
              <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[4px] ml-2 mb-4">Saved Templates</h4>
              {feeStructures.map(f => (
                <div key={f.id} className="p-5 bg-[var(--card)]/60 backdrop-blur-md border border-[var(--border)] rounded-[24px] flex justify-between items-center shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:border-emerald-500/30 transition-colors">
                  <div>
                    <p className="text-[9px] text-emerald-500 font-black uppercase tracking-widest mb-1">{f.class_name} Standard</p>
                    <p className="font-black text-sm uppercase italic tracking-tight">{f.fee_title}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xl font-black text-[var(--text)] tracking-tighter">₹{f.amount}</span>
                    <button onClick={() => deleteStructure(f.id)} className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-colors active:scale-90">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
              {feeStructures.length === 0 && (
                 <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-center py-10 opacity-50">No templates found.</p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {!selectedStudent ? (
              <>
                {/* 🔍 Premium Search Bar */}
                <div className="relative">
                  <Search size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input type="text" placeholder="SEARCH STUDENT..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-[var(--card)]/80 backdrop-blur-xl border border-[var(--border)] rounded-[28px] py-6 pl-14 pr-6 text-sm font-black outline-none text-[var(--text)] placeholder:text-zinc-500 uppercase tracking-widest shadow-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all" />
                </div>

                {/* 🚀 Filter Chips */}
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {allClasses.map(cls => (
                    <button 
                      key={cls} 
                      onClick={() => setSelectedClassFilter(cls)} 
                      className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${selectedClassFilter === cls ? 'bg-emerald-500 border-emerald-500 text-white shadow-[0_5px_15px_rgba(16,185,129,0.3)] scale-105' : 'bg-[var(--card)]/50 backdrop-blur-md text-zinc-500 border-[var(--border)] hover:bg-[var(--card)]'}`}
                    >
                      {cls === 'All' ? 'All Classes' : `${cls} STD`}
                    </button>
                  ))}
                </div>

                {/* 📋 Student List */}
                <div className="space-y-3">
                  {filteredStudents.length === 0 ? (
                     <div className="py-16 text-center border border-dashed border-[var(--border)] rounded-[35px] bg-[var(--card)]/30">
                       <User size={40} className="text-zinc-600 mx-auto mb-3 opacity-50" />
                       <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest opacity-70">No student found</p>
                     </div>
                  ) : (
                    filteredStudents.map(s => (
                      <div key={s.id} onClick={() => handleSelectStudent(s)} className="p-5 bg-[var(--card)]/80 backdrop-blur-xl border border-[var(--border)] rounded-[28px] hover:border-emerald-500/40 hover:shadow-md cursor-pointer flex justify-between items-center group transition-all">
                         <div className="flex items-center gap-4">
                           <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 font-black italic text-lg border border-blue-500/20 group-hover:scale-110 transition-transform">
                             {s.name[0]}
                           </div>
                           <div>
                             <p className="font-black italic uppercase text-[var(--text)] text-md leading-none group-hover:text-emerald-500 transition-colors">{s.name}</p>
                             <p className="text-[9px] text-zinc-500 font-bold tracking-widest mt-1.5">ID: {s.id} • CLASS: {s.class}</p>
                           </div>
                         </div>
                         <div className={`text-[8px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest border ${s.paid_till ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400' : 'bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400'}`}>
                           {s.paid_till || 'PENDING'}
                         </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : (
              <div className="space-y-6">
                {/* 💳 PAYMENT FORM */}
                <form onSubmit={handlePaymentSubmit} className="bg-[var(--card)]/90 backdrop-blur-2xl border border-[var(--border)] border-t-4 border-t-emerald-500 rounded-[35px] p-7 space-y-6 shadow-xl relative overflow-hidden">
                  <div className="flex justify-between items-center border-b border-[var(--border)] pb-5 mb-2">
                    <div>
                      <h3 className="font-black italic uppercase text-2xl text-[var(--text)] tracking-tighter leading-none">{selectedStudent.name}</h3>
                      <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mt-2 flex items-center gap-2">
                        <span className="w-4 h-[1px] bg-zinc-400 block"></span> {selectedStudent.class} • {selectedStudent.id}
                      </p>
                    </div>
                    <button type="button" onClick={() => setSelectedStudent(null)} className="text-[9px] font-black text-red-500 bg-red-500/10 hover:bg-red-500 hover:text-white px-4 py-2.5 rounded-xl uppercase tracking-widest active:scale-95 transition-colors">
                      Cancel
                    </button>
                  </div>

                  <div className="space-y-1.5">
                     <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-2 flex items-center gap-1">
                       <Wallet size={12}/> Select Fee Type
                     </label>
                     <select value={selectedFeeId} onChange={handleFeeSelectionChange} className="w-full bg-[var(--background)] border border-[var(--border)] rounded-2xl p-4 text-sm font-bold outline-none text-[var(--text)] appearance-none focus:border-emerald-500 transition-colors">
                       {studentFeeOptions.length === 0 && <option value="">No templates for this class</option>}
                       {studentFeeOptions.map(f => <option key={f.id} value={f.id}>{f.fee_title}</option>)}
                     </select>
                  </div>

                  <div className="space-y-1.5">
                     <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-2 flex items-center gap-1">
                       <IndianRupee size={12} /> Amount Collecting
                     </label>
                     <input required type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className="w-full bg-[var(--background)] border border-[var(--border)] rounded-2xl p-6 text-4xl font-black italic tracking-tighter outline-none text-[var(--text)] text-center shadow-inner focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all" />
                  </div>

                  <div className="space-y-1.5 pt-2">
                     <label className="text-[9px] font-black text-blue-500 uppercase tracking-widest ml-2 flex items-center gap-1">
                       <Clock size={12} /> Target "Paid Till" Month
                     </label>
                     <input type="text" value={paidTillUpdate} onChange={(e) => setPaidTillUpdate(e.target.value)} className="w-full bg-blue-500/5 border border-blue-500/30 rounded-2xl p-4 text-sm font-black uppercase outline-none text-blue-600 dark:text-blue-400 placeholder:text-blue-500/40 focus:ring-4 focus:ring-blue-500/20 transition-all" />
                     <p className="text-[7px] font-bold text-zinc-500 tracking-widest ml-2 mt-1 uppercase">*Controls the color of the badge on student dashboard</p>
                  </div>

                  <button disabled={loading} className="w-full py-5 mt-4 bg-emerald-500 text-white rounded-[24px] font-black uppercase tracking-[3px] text-xs flex items-center justify-center gap-3 active:scale-95 shadow-[0_10px_25px_rgba(16,185,129,0.3)] transition-all hover:bg-emerald-400 disabled:opacity-50">
                    {loading ? <Loader2 className="animate-spin" /> : <><ShieldCheck size={20} /> Confirm Payment</>}
                  </button>
                </form>

                {/* 🧾 INSTANT STUDENT HISTORY LEDGER */}
                <div className="pt-6">
                  <div className="flex items-center gap-2 mb-5 ml-2">
                    <ReceiptText size={18} className="text-zinc-400" />
                    <h2 className="text-[10px] font-black text-zinc-500 uppercase tracking-[4px]">Digital Receipts</h2>
                  </div>
                  
                  {studentHistory.length > 0 ? (
                    <div className="space-y-3">
                      {studentHistory.map(payment => (
                        <div key={payment.id} className="p-4 bg-[var(--card)]/60 backdrop-blur-md border border-[var(--border)] rounded-[24px] flex justify-between items-center shadow-sm">
                           <div className="flex items-center gap-3">
                             <div className="w-10 h-10 rounded-full bg-zinc-500/10 flex items-center justify-center text-zinc-500">
                               <ReceiptText size={16} />
                             </div>
                             <div>
                               <h4 className="text-xs font-black uppercase italic text-[var(--text)]">{payment.fee_title}</h4>
                               <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest mt-1">
                                 {format(new Date(payment.payment_date), 'dd MMM yyyy')}
                               </p>
                             </div>
                           </div>
                           <div className="flex items-center gap-4">
                             <span className="text-sm font-black italic text-[var(--text)] tracking-tighter">₹{payment.amount_paid}</span>
                             <button onClick={() => handleDeletePayment(payment.id)} className="w-8 h-8 rounded-full bg-[var(--background)] border border-[var(--border)] flex items-center justify-center text-zinc-400 hover:text-red-500 hover:border-red-500/30 hover:bg-red-500/5 active:scale-90 transition-all">
                               <Trash2 size={14} />
                             </button>
                           </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10 bg-[var(--card)]/30 border border-dashed border-[var(--border)] rounded-[28px]">
                       <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 opacity-50 italic">No past payments logged.</p>
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
