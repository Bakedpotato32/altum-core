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

  const [activeClasses, setActiveClasses] = useState<string[]>([]);
  const [feeStructures, setFeeStructures] = useState<any[]>([]);
  const [newClass, setNewClass] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newAmount, setNewAmount] = useState('');

  const [studentFeeOptions, setStudentFeeOptions] = useState<any[]>([]);
  const [selectedFeeId, setSelectedFeeId] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [paidTillUpdate, setPaidTillUpdate] = useState('');
  const [studentHistory, setStudentHistory] = useState<any[]>([]);

  useEffect(() => {
    const role = localStorage.getItem('role');
    const assignedClass = localStorage.getItem('assignedClass') || '';
    const isMaster = role === 'principal' || assignedClass.toLowerCase() === 'all';
    if (!isMaster) { router.push('/admin'); return; }
    loadData();
  }, []);

  const loadData = async () => {
    const { data: configData } = await supabase.from('config').select('value').eq('key', 'active_classes').maybeSingle();
    let dynamicClasses: string[] = [];
    if (configData && configData.value) {
      try {
        const parsed = typeof configData.value === 'string' ? JSON.parse(configData.value) : configData.value;
        if (Array.isArray(parsed)) {
          dynamicClasses = parsed;
          setActiveClasses(parsed);
          if (parsed.length > 0) setNewClass(parsed[0]);
        }
      } catch (e) { console.error("Parse error", e); }
    }
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
      const { data: hist } = await supabase.from('fee_payments').select('*').eq('student_id', selectedStudent.id).order('payment_date', { ascending: false });
      if (hist) setStudentHistory(hist);
    }
  };

  const handleSelectStudent = async (student: any) => {
    setSelectedStudent(student);
    setSearchTerm('');
    const options = feeStructures.filter(f => f.class_name.toLowerCase() === student.class.toLowerCase());
    setStudentFeeOptions(options);
    if (options.length > 0) {
      setSelectedFeeId(options[0].id);
      setPayAmount(options[0].amount.toString());
      setPaidTillUpdate(options[0].fee_title);
    } else {
      setPaidTillUpdate(student.paid_till || '');
    }
    const { data: hist } = await supabase.from('fee_payments').select('*').eq('student_id', student.id).order('payment_date', { ascending: false });
    if (hist) setStudentHistory(hist);
  };

  const handleFeeSelectionChange = (e: any) => {
    const id = e.target.value;
    setSelectedFeeId(id);
    const fee = studentFeeOptions.find(f => f.id === id);
    if (fee) { setPayAmount(fee.amount.toString()); setPaidTillUpdate(fee.fee_title); }
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
    const matchesClass = selectedClassFilter === 'All' || s.class.toLowerCase() === selectedClassFilter.toLowerCase();
    return matchesSearch && matchesClass;
  });

  // ── NEW: Stats ──
  const clearedCount = students.filter(s => s.paid_till && s.paid_till.toUpperCase() !== 'PENDING').length;
  const pendingCount = students.length - clearedCount;return (
    <div className="min-h-screen pb-40 font-sans" style={{ background: 'var(--background)', color: 'var(--text)' }}>

      {/* Ambient orbs */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: 350, height: 350, borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%)', filter: 'blur(60px)' }} />
        <div style={{ position: 'absolute', bottom: '10%', left: '-10%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.07) 0%, transparent 70%)', filter: 'blur(60px)' }} />
      </div>

      <div className="max-w-md mx-auto px-5 pt-24">

        {/* ── Back ── */}
        <button onClick={() => router.push('/admin')} className="flex items-center gap-1.5 mb-10 active:scale-95 transition-transform" style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text)', opacity: 0.4 }}>
          <ArrowLeft size={15} strokeWidth={3} /> Admin Core
        </button>

        {/* ── Header ── */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 10 }}>
            <div style={{ width: 52, height: 52, borderRadius: 18, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(16,185,129,0.2)', flexShrink: 0 }}>
              <IndianRupee size={24} style={{ color: '#10b981' }} />
            </div>
            <div>
              <h1 style={{ fontSize: 38, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-0.03em', lineHeight: 0.92, color: 'var(--text)' }}>
                Finance <span style={{ color: '#10b981', textShadow: '0 0 24px rgba(16,185,129,0.35)' }}>Node</span>
              </h1>
              <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--text)', opacity: 0.3, marginTop: 6 }}>Master Access</p>
            </div>
          </div>

          {/* ── NEW: Stats Bar ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 16 }}>
            {[
              { label: 'Total',   value: students.length, color: '#3b82f6', bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.2)'  },
              { label: 'Cleared', value: clearedCount,    color: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)' },
              { label: 'Pending', value: pendingCount,    color: '#ef4444', bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.2)'  },
            ].map((stat, i) => (
              <div key={i} style={{ borderRadius: 18, background: stat.bg, border: `1px solid ${stat.border}`, padding: '12px 10px', textAlign: 'center' }}>
                <p style={{ fontSize: 22, fontWeight: 900, fontStyle: 'italic', letterSpacing: '-0.03em', color: stat.color, lineHeight: 1, marginBottom: 3 }}>{stat.value}</p>
                <p style={{ fontSize: 8, fontWeight: 900, letterSpacing: '0.18em', textTransform: 'uppercase', color: stat.color, opacity: 0.7 }}>{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Tabs ── */}
        <div style={{ display: 'flex', gap: 8, background: 'var(--card)', padding: 6, borderRadius: 22, border: '1px solid var(--border)', marginBottom: 24 }}>
          {(['collect', 'config'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className="active:scale-95 transition-transform" style={{ flex: 1, padding: '12px', fontSize: 10, fontWeight: 900, letterSpacing: '0.15em', textTransform: 'uppercase', borderRadius: 16, border: 'none', cursor: 'pointer', transition: 'all 0.25s', background: tab === t ? (t === 'collect' ? '#10b981' : 'var(--text)') : 'transparent', color: tab === t ? (t === 'collect' ? '#fff' : 'var(--background)') : 'rgba(128,128,128,0.6)', boxShadow: tab === t ? (t === 'collect' ? '0 4px 16px rgba(16,185,129,0.3)' : '0 4px 16px rgba(0,0,0,0.15)') : 'none' }}>
              {t === 'collect' ? 'Collection Desk' : 'Configurator'}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════ */}
        {/* CONFIG TAB                         */}
        {/* ══════════════════════════════════ */}
        {tab === 'config' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Add template form */}
            <form onSubmit={handleAddStructure} style={{ borderRadius: 28, background: 'var(--card)', border: '1px solid var(--border)', borderLeft: '4px solid #10b981', padding: '22px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Plus size={15} style={{ color: '#10b981' }} />
                <h3 style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text)' }}>Create Fee Template</h3>
              </div>

              {(['select', 'title', 'amount'] as const).map((field) => (
                field === 'select' ? (
                  <select key={field} value={newClass} onChange={(e) => setNewClass(e.target.value)} style={{ width: '100%', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 16px', fontSize: 13, fontWeight: 700, color: 'var(--text)', outline: 'none', fontFamily: 'inherit', appearance: 'none' }}>
                    {activeClasses.length === 0 && <option value="">No Classes Configured</option>}
                    {activeClasses.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                ) : field === 'title' ? (
                  <input key={field} required type="text" placeholder="FEE TITLE (e.g. MAY TUITION)" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} style={{ width: '100%', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 16px', fontSize: 13, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text)', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                ) : (
                  <input key={field} required type="number" placeholder="AMOUNT (₹)" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} style={{ width: '100%', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 16px', fontSize: 13, fontWeight: 800, color: 'var(--text)', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                )
              ))}

              <button disabled={loading || !newClass} className="active:scale-95 transition-transform" style={{ width: '100%', padding: '14px', borderRadius: 14, background: '#10b981', color: '#fff', fontSize: 10, fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 8px 20px rgba(16,185,129,0.3)', opacity: loading || !newClass ? 0.5 : 1 }}>
                {loading ? <Loader2 size={16} className="animate-spin" /> : <><Save size={15} /> Save Template</>}
              </button>
            </form>

            {/* Templates list */}
            <p style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.25em', textTransform: 'uppercase', color: 'var(--text)', opacity: 0.3, paddingLeft: 4 }}>Saved Templates</p>
            {feeStructures.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 24px', borderRadius: 24, background: 'var(--card)', border: '1px dashed var(--border)', opacity: 0.5 }}>
                <p style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text)', opacity: 0.4 }}>No templates found.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {feeStructures.map((f, index) => (
                  <div key={f.id} style={{ borderRadius: 22, background: 'var(--card)', border: '1px solid var(--border)', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', animation: 'fadeSlideIn 0.3s ease both', animationDelay: `${index * 0.05}s`, position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: 3, borderRadius: '0 3px 3px 0', background: '#10b981' }} />
                    <div style={{ paddingLeft: 8 }}>
                      <p style={{ fontSize: 8, fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#10b981', marginBottom: 4 }}>{f.class_name}</p>
                      <p style={{ fontSize: 14, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--text)' }}>{f.fee_title}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <span style={{ fontSize: 20, fontWeight: 900, fontStyle: 'italic', color: 'var(--text)', letterSpacing: '-0.02em' }}>₹{f.amount}</span>
                      <button onClick={() => deleteStructure(f.id)} className="active:scale-90 transition-transform" style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', cursor: 'pointer' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>) : (
          /* ══════════════════════════════════ */
          /* COLLECT TAB                        */
          /* ══════════════════════════════════ */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {!selectedStudent ? (
              <>
                {/* Search */}
                <div style={{ position: 'relative' }}>
                  <Search size={16} style={{ position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)', color: 'var(--text)', opacity: 0.3, pointerEvents: 'none' }} />
                  <input type="text" placeholder="SEARCH STUDENT..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: '100%', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 20, padding: '16px 20px 16px 46px', fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text)', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                </div>

                {/* Class filter tabs */}
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }} className="no-scrollbar">
                  {['All', ...activeClasses].map(cls => (
                    <button key={cls} onClick={() => setSelectedClassFilter(cls)} className="active:scale-95 transition-transform" style={{ flexShrink: 0, padding: '9px 18px', borderRadius: 12, fontSize: 9, fontWeight: 900, letterSpacing: '0.18em', textTransform: 'uppercase', border: selectedClassFilter === cls ? '1px solid rgba(16,185,129,0.4)' : '1px solid var(--border)', background: selectedClassFilter === cls ? 'rgba(16,185,129,0.1)' : 'var(--card)', color: selectedClassFilter === cls ? '#10b981' : 'var(--text)', opacity: selectedClassFilter === cls ? 1 : 0.4, cursor: 'pointer', boxShadow: selectedClassFilter === cls ? '0 4px 12px rgba(16,185,129,0.2)' : 'none', whiteSpace: 'nowrap' }}>
                      {cls}
                    </button>
                  ))}
                </div>

                {/* Student list */}
                {filteredStudents.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 24px', borderRadius: 28, background: 'var(--card)', border: '1px dashed var(--border)', opacity: 0.5 }}>
                    <User size={36} style={{ color: 'var(--text)', opacity: 0.2, margin: '0 auto 12px' }} />
                    <p style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text)', opacity: 0.4 }}>No student found</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {filteredStudents.map((s, index) => {
                      const isCleared = s.paid_till && s.paid_till.toUpperCase() !== 'PENDING';
                      return (
                        <div key={s.id} onClick={() => handleSelectStudent(s)} className="active:scale-[0.98] transition-transform" style={{ borderRadius: 22, background: 'var(--card)', border: '1px solid var(--border)', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, cursor: 'pointer', animation: 'fadeSlideIn 0.3s ease both', animationDelay: `${index * 0.03}s`, position: 'relative', overflow: 'hidden' }}>
                          <div style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: 3, borderRadius: '0 3px 3px 0', background: isCleared ? '#10b981' : '#ef4444' }} />
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0, paddingLeft: 8 }}>
                            <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              {s.avatar_url ? (
                                <img src={s.avatar_url} alt={s.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                              ) : (
                                <span style={{ fontSize: 16, fontWeight: 900, fontStyle: 'italic', color: '#3b82f6' }}>{s.name[0]}</span>
                              )}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <p style={{ fontSize: 14, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</p>
                              <p style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text)', opacity: 0.3, marginTop: 3 }}>ID: {s.id} · {s.class}</p>
                            </div>
                          </div>
                          <div style={{ flexShrink: 0, padding: '5px 10px', borderRadius: 10, background: isCleared ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${isCleared ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}` }}>
                            <span style={{ fontSize: 8, fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', color: isCleared ? '#10b981' : '#ef4444' }}>{s.paid_till || 'PENDING'}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              /* Payment Form */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ borderRadius: 28, background: 'var(--card)', border: '1px solid var(--border)', borderTop: '4px solid #10b981', padding: '22px 20px', display: 'flex', flexDirection: 'column', gap: 18 }}>
                  {/* Student header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
                    <div>
                      <h3 style={{ fontSize: 22, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-0.02em', color: 'var(--text)', lineHeight: 1, marginBottom: 6 }}>{selectedStudent.name}</h3>
                      <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text)', opacity: 0.35 }}>{selectedStudent.class} · {selectedStudent.id}</p>
                    </div>
                    <button type="button" onClick={() => setSelectedStudent(null)} className="active:scale-90 transition-transform" style={{ padding: '8px 14px', borderRadius: 12, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: 9, fontWeight: 900, letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer' }}>Cancel</button>
                  </div>

                  <form onSubmit={handlePaymentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Fee type */}
                    <div>
                      <label style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text)', opacity: 0.4, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}><Wallet size={11} /> Select Fee Type</label>
                      <select value={selectedFeeId} onChange={handleFeeSelectionChange} style={{ width: '100%', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 16px', fontSize: 13, fontWeight: 700, color: 'var(--text)', outline: 'none', fontFamily: 'inherit', appearance: 'none' }}>
                        {studentFeeOptions.length === 0 && <option value="">No templates for this class</option>}
                        {studentFeeOptions.map(f => <option key={f.id} value={f.id}>{f.fee_title}</option>)}
                      </select>
                    </div>

                    {/* Amount */}
                    <div>
                      <label style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text)', opacity: 0.4, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}><IndianRupee size={11} /> Amount Collecting</label>
                      <input required type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} style={{ width: '100%', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px', fontSize: 36, fontWeight: 900, fontStyle: 'italic', letterSpacing: '-0.03em', color: '#10b981', textAlign: 'center', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                    </div>

                    {/* Paid till */}
                    <div>
                      <label style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}><Clock size={11} /> Target "Paid Till" Month</label>
                      <input type="text" value={paidTillUpdate} onChange={(e) => setPaidTillUpdate(e.target.value)} style={{ width: '100%', background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 14, padding: '14px 16px', fontSize: 13, fontWeight: 900, textTransform: 'uppercase', color: '#3b82f6', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                      <p style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text)', opacity: 0.25, marginTop: 6, paddingLeft: 4 }}>*Controls badge color on student dashboard</p>
                    </div>

                    <button disabled={loading} className="active:scale-95 transition-transform" style={{ width: '100%', padding: '18px', borderRadius: 18, background: 'linear-gradient(135deg, #059669, #10b981)', color: '#fff', fontSize: 11, fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, boxShadow: '0 10px 28px rgba(16,185,129,0.35)', position: 'relative', overflow: 'hidden', opacity: loading ? 0.6 : 1 }}>
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 60%)', pointerEvents: 'none' }} />
                      {loading ? <Loader2 size={18} className="animate-spin" /> : <><ShieldCheck size={18} /> Confirm Payment</>}
                    </button>
                  </form>
                </div>

                {/* Payment history */}
                <p style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.25em', textTransform: 'uppercase', color: 'var(--text)', opacity: 0.3, paddingLeft: 4, display: 'flex', alignItems: 'center', gap: 6 }}><ReceiptText size={12} /> Digital Receipts</p>
                {studentHistory.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', borderRadius: 22, background: 'var(--card)', border: '1px dashed var(--border)', opacity: 0.5 }}>
                    <p style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text)', opacity: 0.4 }}>No past payments logged.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {studentHistory.map((payment, index) => (
                      <div key={payment.id} style={{ borderRadius: 20, background: 'var(--card)', border: '1px solid var(--border)', padding: '13px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, animation: 'fadeSlideIn 0.3s ease both', animationDelay: `${index * 0.05}s`, position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: 3, borderRadius: '0 3px 3px 0', background: '#10b981' }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingLeft: 8 }}>
                          <div style={{ width: 38, height: 38, borderRadius: 13, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <ReceiptText size={16} style={{ color: '#10b981' }} />
                          </div>
                          <div>
                            <h4 style={{ fontSize: 12, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--text)', lineHeight: 1.1, marginBottom: 4 }}>{payment.fee_title}</h4>
                            <p style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text)', opacity: 0.3 }}>{format(new Date(payment.payment_date), 'dd MMM yyyy')}</p>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                          <span style={{ fontSize: 16, fontWeight: 900, fontStyle: 'italic', color: '#10b981', letterSpacing: '-0.02em' }}>₹{payment.amount_paid}</span>
                          <button onClick={() => handleDeletePayment(payment.id)} className="active:scale-90 transition-transform" style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', cursor: 'pointer' }}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        input::placeholder, select { font-family: inherit; }
      `}</style>
    </div>
  );
}