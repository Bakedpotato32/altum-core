'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, UserPlus, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AddStudent() {
  const [formData, setFormData] = useState({ id: '', name: '', class: '', attendance: '100' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [activeClasses, setActiveClasses] = useState<string[]>([]);
  const router = useRouter();

  // 🔥 NEW RANDOM ID GENERATOR
  const generateRandomID = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const l1 = chars.charAt(Math.floor(Math.random() * chars.length));
    const l2 = chars.charAt(Math.floor(Math.random() * chars.length));
    const nums = Math.floor(1000 + Math.random() * 9000);
    return `${l1}${l2}${nums}`;
  };

  useEffect(() => {
    // Generate initial ID
    setFormData(prev => ({ ...prev, id: generateRandomID() }));

    // Fetch dynamic classes
    const fetchClasses = async () => {
      const { data } = await supabase.from('config').select('value').eq('key', 'active_classes').maybeSingle();
      if (data && data.value) {
        try {
          const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
          if (Array.isArray(parsed) && parsed.length > 0) {
            setActiveClasses(parsed);
            setFormData(prev => ({ ...prev, class: parsed[0] }));
          }
        } catch (e) {
          console.error(e);
        }
      }
    };
    fetchClasses();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase
      .from('students')
      .insert([
        { 
          id: formData.id.trim(), 
          name: formData.name.trim(), 
          class: formData.class.trim(), 
          attendance: parseInt(formData.attendance) 
        }
      ]);

    if (!error) {
      setSuccess(true);
      setTimeout(() => router.push('/admin/ledger'), 1500);
    } else {
      alert("Error: " + error.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] p-6 pt-24 text-[var(--text)] font-sans pb-40">
      <button onClick={() => router.back()} className="mb-8 p-3 bg-[var(--card)] rounded-2xl border border-[var(--border)] active:scale-90 transition-all shadow-sm">
        <ChevronLeft size={20} />
      </button>

      <div className="mb-10">
        <h1 className="text-3xl font-black italic uppercase tracking-tighter">New <span className="text-blue-500">Entry</span></h1>
        <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mt-1">Add Student to Database</p>
      </div>

      <form onSubmit={handleAdd} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-4 flex items-center justify-between">
            Access Code (ID)
            <button type="button" onClick={() => setFormData(prev => ({ ...prev, id: generateRandomID() }))} className="flex items-center gap-1 text-blue-500 active:scale-90">
              <RefreshCw size={10} /> Regenerate
            </button>
          </label>
          <input 
            required
            placeholder="e.g. AB1234"
            value={formData.id}
            onChange={e => setFormData({...formData, id: e.target.value.toUpperCase()})}
            className="w-full bg-[var(--card)] border border-[var(--border)] rounded-2xl py-4 px-6 text-sm font-bold text-[var(--text)] focus:border-blue-500 outline-none transition-all shadow-sm"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-4">Full Name</label>
          <input 
            required
            placeholder="e.g. Rahul Kumar"
            value={formData.name}
            onChange={e => setFormData({...formData, name: e.target.value})}
            className="w-full bg-[var(--card)] border border-[var(--border)] rounded-2xl py-4 px-6 text-sm font-bold text-[var(--text)] focus:border-blue-500 outline-none transition-all shadow-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-4">Class</label>
            <select 
              required
              value={formData.class}
              onChange={e => setFormData({...formData, class: e.target.value})}
              className="w-full bg-[var(--card)] border border-[var(--border)] rounded-2xl py-4 px-6 text-sm font-bold text-[var(--text)] focus:border-blue-500 outline-none transition-all shadow-sm appearance-none"
            >
              {activeClasses.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-4">Attendance %</label>
            <input 
              type="number"
              value={formData.attendance}
              onChange={e => setFormData({...formData, attendance: e.target.value})}
              className="w-full bg-[var(--card)] border border-[var(--border)] rounded-2xl py-4 px-6 text-sm font-bold text-[var(--text)] focus:border-blue-500 outline-none transition-all shadow-sm"
            />
          </div>
        </div>

        <button 
          disabled={loading || success}
          className={`w-full py-5 rounded-[24px] mt-8 flex items-center justify-center gap-3 text-xs font-black uppercase tracking-widest transition-all active:scale-95
            ${success ? 'bg-green-600 text-white' : 'bg-blue-600 text-white shadow-[0_15px_30px_rgba(59,130,246,0.3)]'}
          `}
        >
          {loading ? <Loader2 className="animate-spin" /> : success ? <><CheckCircle2 size={18}/> Registered!</> : <><UserPlus size={18}/> Add to Database</>}
        </button>
      </form>
    </div>
  );
}
