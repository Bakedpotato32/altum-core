
'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { UserPlus, ArrowLeft, RefreshCw, Trash2, Users, Sparkles, Copy, CheckCircle2, KeyRound } from 'lucide-react';

export default function StaffHub() {
  const [name, setName] = useState('');
  const [assignedClass, setAssignedClass] = useState('');
  const [generatedId, setGeneratedId] = useState('');
  const [loading, setLoading] = useState(false);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);
  const router = useRouter();

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
    setCopied(false);
  };

  const handleCopyId = () => {
    if (!generatedId) return;
    navigator.clipboard.writeText(generatedId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
      setCopied(false);
      fetchStaff(); 
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
    <div className="min-h-screen bg-transparent p-6 pt-24 pb-40 text-[var(--text)] font-sans relative z-0">
      
      {/* ✨ Ambient Premium Glow Background */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[350px] h-[350px] rounded-full bg-cyan-500/10 blur-[120px]"></div>
        <div className="absolute bottom-[10%] left-[-10%] w-[300px] h-[300px] rounded-full bg-blue-500/10 blur-[100px]"></div>
      </div>

      <div className="max-w-md mx-auto space-y-8">
        
        {/* Header & Back Button */}
        <div>
          <button onClick={() => router.back()} className="flex items-center gap-2 text-zinc-500 hover:text-[var(--text)] transition-colors text-[10px] font-black uppercase tracking-widest mb-8 active:scale-95">
            <ArrowLeft size={16} /> Admin Core
          </button>

          <div className="flex items-center gap-4 relative">
            <Sparkles className="absolute -top-5 -left-3 text-cyan-500/40 animate-pulse" size={32} />
            <div className="p-3 bg-cyan-500/10 rounded-[20px] border border-cyan-500/20 shadow-sm flex items-center justify-center">
              <UserPlus className="text-cyan-500" size={28} />
            </div>
            <div>
              <h1 className="text-4xl font-black italic uppercase tracking-tighter leading-none text-[var(--text)]">
                Staff <span className="text-cyan-500 drop-shadow-[0_0_15px_rgba(6,182,212,0.3)]">Hub</span>
              </h1>
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[4px] mt-2 flex items-center gap-2">
                <span className="w-6 h-[1px] bg-zinc-400 block"></span> Management Node
              </p>
            </div>
          </div>
        </div>

        {/* 📝 REGISTRATION FORM */}
        <form onSubmit={handleAddStaff} className="bg-[var(--card)]/90 backdrop-blur-2xl border border-[var(--border)] border-t-4 border-t-cyan-500 rounded-[35px] p-7 space-y-6 shadow-xl relative overflow-hidden">
          <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text)] flex items-center gap-2">
            <KeyRound size={16} className="text-cyan-500" /> Register Staff Node
          </h3>

          <div className="space-y-4">
              <input 
                  type="text" placeholder="TEACHER NAME" value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-2xl p-4 text-sm font-black uppercase outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 transition-all placeholder:text-zinc-500"
              />
              <input 
                  type="text" placeholder="ASSIGN CLASS (E.G. 10)" value={assignedClass}
                  onChange={(e) => setAssignedClass(e.target.value)}
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-2xl p-4 text-sm font-black uppercase outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 transition-all placeholder:text-zinc-500"
              />
              
              {/* 🔐 SECURE ID GENERATOR */}
              <div className="space-y-1.5 pt-2">
                <label className="text-[9px] font-black text-cyan-500 uppercase tracking-widest ml-2">Access Token</label>
                <div className="flex items-center gap-2">
                    <div className="flex-1 bg-cyan-500/5 p-4 rounded-2xl border border-cyan-500/30 font-mono font-black tracking-widest text-center text-cyan-600 dark:text-cyan-400 shadow-inner flex items-center justify-between">
                        <span className="flex-1">{generatedId || "--------"}</span>
                        {generatedId && (
                           <button type="button" onClick={handleCopyId} className="text-cyan-500 hover:text-cyan-400 active:scale-90 transition-all">
                             {copied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
                           </button>
                        )}
                    </div>
                    <button type="button" onClick={generateSecureId} className="p-4 bg-[var(--text)] rounded-2xl active:rotate-180 transition-all duration-500 shadow-lg">
                        <RefreshCw size={20} className="text-[var(--background)]" />
                    </button>
                </div>
              </div>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-cyan-500 text-white py-5 mt-2 rounded-[24px] font-black uppercase tracking-[3px] text-xs flex items-center justify-center gap-3 active:scale-95 shadow-[0_10px_25px_rgba(6,182,212,0.3)] transition-all hover:bg-cyan-400 disabled:opacity-50">
              {loading ? <Loader2 className="animate-spin" /> : "Deploy Staff Node"}
          </button>
        </form>

        {/* 👥 STAFF LIST */}
        <div className="pt-4">
          <div className="flex items-center gap-2 mb-5 ml-2">
              <Users size={16} className="text-zinc-500" />
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[4px]">Active Staff</span>
          </div>

          <div className="space-y-3">
            {staffList.length === 0 ? (
               <div className="py-12 text-center border border-dashed border-[var(--border)] rounded-[35px] bg-[var(--card)]/30">
                 <Users size={32} className="text-zinc-600 mx-auto mb-3 opacity-50" />
                 <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest opacity-70">No staff deployed yet</p>
               </div>
            ) : (
              staffList.map((staff) => (
                <div key={staff.id} className="p-5 bg-[var(--card)]/80 backdrop-blur-xl border border-[var(--border)] rounded-[28px] flex justify-between items-center group active:scale-[0.98] hover:border-cyan-500/40 hover:shadow-md transition-all">
                  <div className="flex items-center gap-4">
                    {/* Avatar Badge */}
                    <div className="w-12 h-12 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-600 dark:text-cyan-400 font-black italic text-lg border border-cyan-500/20 group-hover:scale-110 transition-transform">
                      {staff.name[0]}
                    </div>
                    
                    <div className="flex flex-col">
                      <h3 className="text-sm font-black uppercase italic tracking-tight text-[var(--text)] leading-tight">{staff.name}</h3>
                      <p className="text-[10px] font-mono font-bold text-cyan-600 dark:text-cyan-500 tracking-widest mt-1">ID: {staff.id}</p>
                      <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mt-0.5">Class {staff.assigned_class}</p>
                    </div>
                  </div>
                  
                  <button onClick={() => deleteStaff(staff.id)} className="w-10 h-10 bg-[var(--background)] border border-[var(--border)] rounded-full flex items-center justify-center text-zinc-400 hover:text-red-500 hover:border-red-500/30 hover:bg-red-500/5 active:scale-90 transition-all">
                     <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
