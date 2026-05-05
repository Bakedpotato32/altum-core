'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Loader2, IndianRupee, ShieldCheck, ShieldAlert, Clock, ReceiptText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

export default function StudentFeeDiary() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  const checkClearance = (paidTill: string | null) => {
    if (!paidTill || paidTill.toUpperCase() === 'PENDING') return false;
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const currentMonth = new Date().getMonth(); 
    const currentYear = new Date().getFullYear();

    const str = paidTill.toUpperCase();
    let parsedMonth = -1;
    let parsedYear = currentYear;

    months.forEach((m, idx) => { if (str.includes(m)) parsedMonth = idx; });
    const yearMatch = str.match(/\d{4}/);
    if (yearMatch) parsedYear = parseInt(yearMatch[0]);

    if (parsedMonth === -1) return true; 
    if (parsedYear > currentYear) return true;
    if (parsedYear < currentYear) return false;
    return parsedMonth >= currentMonth;
  };

  useEffect(() => {
    const activeId = localStorage.getItem('studentId');
    if (!activeId) { router.push('/login'); return; }

    const fetchFees = async () => {
      setLoading(true);
      const [{ data: stData }, { data: histData }] = await Promise.all([
        supabase.from('students').select('*').eq('id', activeId).single(),
        supabase.from('fee_payments').select('*').eq('student_id', activeId).order('payment_date', { ascending: false })
      ]);
      
      if (stData) setStudent(stData);
      if (histData) setHistory(histData);
      setLoading(false);
    };
    fetchFees();
  }, []);

  if (loading || !student) return <div className="h-svh bg-[var(--background)] flex items-center justify-center"><Loader2 className="text-emerald-500 animate-spin" /></div>;

  const isCleared = checkClearance(student.paid_till);

  return (
    <div className="min-h-screen bg-transparent p-6 pt-28 pb-40 font-sans text-[var(--text)]">
      <div className="max-w-md mx-auto space-y-8">
        <button onClick={() => router.back()} className="text-zinc-500 flex items-center gap-2 text-xs font-bold uppercase tracking-widest active:scale-95 transition-all">
          <ArrowLeft size={16} /> Dashboard
        </button>

        <div>
          <h1 className="text-3xl font-black italic tracking-tighter uppercase flex items-center gap-3">
            Fee <span className="text-emerald-500">Diary</span>
          </h1>
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-[3px] mt-1 italic opacity-60">Finance Node</p>
        </div>

        {/* 🛡️ SMART CLEARANCE STATUS */}
        <div className={`p-8 rounded-[35px] border relative overflow-hidden shadow-lg transition-colors ${isCleared ? 'bg-emerald-500 border-emerald-400' : 'bg-red-500 border-red-400'}`}>
          {isCleared ? <ShieldCheck size={120} className="absolute right-[-20px] bottom-[-20px] text-white/10 -rotate-12" /> : <ShieldAlert size={120} className="absolute right-[-20px] bottom-[-20px] text-white/10 -rotate-12" />}
          
          <div className="relative z-10">
            <h3 className={`text-[10px] font-black uppercase tracking-[4px] mb-2 ${isCleared ? 'text-emerald-100' : 'text-red-100'}`}>Current Status</h3>
            {isCleared ? (
              <>
                <p className="text-3xl font-black italic uppercase text-white tracking-tighter leading-none mb-1">Cleared</p>
                <p className="text-sm font-bold text-emerald-100 uppercase tracking-widest">Till: {student.paid_till}</p>
              </>
            ) : (
              <>
                <p className="text-3xl font-black italic uppercase text-white tracking-tighter leading-none mb-1">Pending</p>
                <p className="text-sm font-bold text-red-100 uppercase tracking-widest">{student.paid_till ? `Overdue since ${student.paid_till}` : 'Contact Administration'}</p>
              </>
            )}
          </div>
        </div>

        <div className="pt-6">
          <div className="flex items-center gap-2 mb-6 ml-2">
             <ReceiptText size={16} className="text-zinc-500" />
             <h2 className="text-[10px] font-black text-zinc-500 uppercase tracking-[4px]">Payment History</h2>
          </div>

          {history.length > 0 ? (
            <div className="space-y-4">
              {history.map(payment => (
                <div key={payment.id} className="p-5 bg-[var(--card)] border border-[var(--border)] rounded-[28px] flex items-center justify-between shadow-sm">
                   <div className="flex items-center gap-4">
                     <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                       <IndianRupee size={18} />
                     </div>
                     <div>
                       <h4 className="text-sm font-black uppercase italic text-[var(--text)] tracking-tight leading-none mb-1">{payment.fee_title}</h4>
                       <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                         <Clock size={10} /> {format(new Date(payment.payment_date), 'dd MMM yyyy')}
                       </p>
                     </div>
                   </div>
                   <span className="text-lg font-black italic text-emerald-500 tracking-tighter">₹{payment.amount_paid}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-zinc-500/5 border border-dashed border-[var(--border)] rounded-[40px]">
               <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 opacity-40 italic px-10 leading-relaxed">No payment records found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
