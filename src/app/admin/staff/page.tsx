'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { UserPlus, ArrowLeft, RefreshCw, ShieldCheck, Copy, CheckCircle2, Trash2, Users } from 'lucide-react';

export default function StaffHub() {
  const [name, setName] = useState('');
  const [assignedClass, setAssignedClass] = useState('');
  const [generatedId, setGeneratedId] = useState('');
  const [loading, setLoading] = useState(false);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  // Fetch the staff list to show in the UI
  const fetchStaff = async () => {
    const { data } = await supabase.from('staff').select('*').order('created_at', { ascending: false });
    if (data) setStaffList(data);
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const generateSecureId = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setGeneratedId(result);
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !assignedClass || !generatedId) {
      alert("Fill all fields and generate an ID!");
      return;
    }
    setLoading(true);

    const { error } = await supabase.from('staff').insert([{ 
      id: generatedId, 
      name: name.toUpperCase(), 
      role: 'teacher', 
      assigned_class: assignedClass 
    }]);

    if (!error) {
      setName('');
      setAssignedClass('');
      setGeneratedId('');
      fetchStaff(); // Refresh the list
    }
    setLoading(false);
  };

  const deleteStaff = async (id: string) => {
    if (confirm("Remove this staff member?")) {
      await supabase.from('staff').delete().eq('id', id);
      fetchStaff();
    }
  };

  return (
    <div className="px-6 pt-28 pb-20 min-h-svh bg-[var(--background)] font-sans text-[var(--text)]">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-zinc-500 mb-8 active:scale-95 transition-all">
        <ArrowLeft size={18} /> <span className="text-xs font-black uppercase tracking-widest">Back to Admin</span>
      </button>

      <div className="flex items-center gap-4 mb-10">
        <div className="p-4 bg-cyan-500/10 rounded-3xl border border-cyan-500/20">
          <UserPlus className="text-cyan-400" size={28} />
        </div>
        <div>
          <h2 className="text-3xl font-black italic uppercase tracking-tighter leading-none">Staff <span className="text-cyan-400">Hub</span></h2>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[4px] mt-1">Management Node</p>
        </div>
      </div>

      {/* REGISTRATION FORM */}
      <div className="p-6 bg-[var(--card)] border border-[var(--border)] rounded-[35px] mb-12">
        <form onSubmit={handleAddStaff} className="space-y-5">
            <input 
                type="text" placeholder="TEACHER NAME" value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[var(--background)] border border-[var(--border)] rounded-2xl p-4 font-black uppercase text-xs outline-none focus:border-cyan-500 transition-all"
            />
            <input 
                type="text" placeholder="ASSIGN CLASS (E.G. 10)" value={assignedClass}
                onChange={(e) => setAssignedClass(e.target.value)}
                className="w-full bg-[var(--background)] border border-[var(--border)] rounded-2xl p-4 font-black uppercase text-xs outline-none focus:border-cyan-500 transition-all"
            />
            
            <div className="flex items-center gap-2">
                <div className="flex-1 bg-black/40 p-4 rounded-2xl border border-white/5 font-mono font-black tracking-widest text-center text-cyan-400">
                    {generatedId || "--------"}
                </div>
                <button type="button" onClick={generateSecureId} className="p-4 bg-zinc-800 rounded-2xl active:rotate-180 transition-all duration-500">
                    <RefreshCw size={20} className="text-white" />
                </button>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-cyan-500 text-black py-5 rounded-2xl font-black uppercase tracking-[2px] active:scale-95 transition-all">
                {loading ? "SYNCING..." : "DEPLOY STAFF NODE"}
            </button>
        </form>
      </div>

      {/* STAFF LIST (Matching Enrollment UI) */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4 px-2 opacity-50">
            <Users size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest">Active Staff Members</span>
        </div>

        {staffList.map((staff) => (
          <div key={staff.id} className="p-5 bg-[var(--card)] border border-[var(--border)] rounded-[30px] flex justify-between items-center group active:scale-[0.98] transition-all">
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-black uppercase italic tracking-tight">{staff.name}</h3>
              <p className="text-[10px] font-mono font-bold text-cyan-500 tracking-widest">#{staff.id}</p>
              <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">{staff.assigned_class} Standard</p>
            </div>
            
            <button onClick={() => deleteStaff(staff.id)} className="p-3 bg-red-500/10 rounded-xl text-red-500 opacity-40 hover:opacity-100 transition-opacity">
               <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
