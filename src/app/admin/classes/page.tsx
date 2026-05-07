'use client';
import React, { useState, useEffect } from 'react';
import { ShieldCheck, ArrowLeft, Loader2, Plus, Trash2, Save, Sparkles, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function ClassManager() {
  const router = useRouter();
  const [activeClasses, setActiveClasses] = useState<string[]>([]);
  const [newClass, setNewClass] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // 🛡️ Ensure only Master Admins can access this
    const role = localStorage.getItem('role');
    const assignedClass = localStorage.getItem('assignedClass') || '';
    const isMaster = role === 'principal' || assignedClass.toLowerCase() === 'all';
    
    if (!isMaster) {
      router.push('/admin');
      return;
    }
    fetchClasses();
  }, [router]);

  const fetchClasses = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('config')
      .select('value')
      .eq('key', 'active_classes')
      .maybeSingle();
      
    if (data && data.value) {
      try {
        const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
        if (Array.isArray(parsed)) setActiveClasses(parsed);
      } catch (e) {
        console.error("Failed to parse classes", e);
      }
    } else {
      // If no config exists yet, default to the original hardcoded list so you don't start blank
      setActiveClasses(["5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"]);
    }
    setLoading(false);
  };

  const handleAddClass = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newClass.trim();
    if (!trimmed) return;
    
    // Prevent duplicates (case-insensitive check)
    if (activeClasses.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
        alert("This class already exists!");
        return;
    }
    
    setActiveClasses([...activeClasses, trimmed]);
    setNewClass('');
  };

  const handleRemoveClass = (classToRemove: string) => {
    if(confirm(`WARNING: Removing ${classToRemove} will lock out all teachers assigned to it and hide its data. Proceed?`)) {
        setActiveClasses(activeClasses.filter(c => c !== classToRemove));
    }
  };

  const saveToCloud = async () => {
    setSaving(true);
    // Upsert into the config table as a stringified JSON array
    const { error } = await supabase
      .from('config')
      .upsert({ key: 'active_classes', value: JSON.stringify(activeClasses) });
      
    setSaving(false);
    if (!error) {
      alert("Class structure securely synced to cloud! ☁️");
    } else {
      alert("Failed to save: " + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-transparent p-6 pt-24 pb-40 text-[var(--text)] font-sans relative z-0">
      
      {/* ✨ Ambient Premium Glow Background */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[350px] h-[350px] rounded-full bg-indigo-500/10 blur-[120px]"></div>
        <div className="absolute bottom-[10%] left-[-10%] w-[300px] h-[300px] rounded-full bg-blue-500/10 blur-[100px]"></div>
      </div>

      <div className="max-w-md mx-auto space-y-8">
        
        {/* Header & Back Button */}
        <div>
          <button onClick={() => router.push('/admin')} className="flex items-center gap-2 text-zinc-500 hover:text-[var(--text)] transition-colors text-[10px] font-black uppercase tracking-widest mb-8 active:scale-95">
            <ArrowLeft size={16} /> Admin Core
          </button>

          <div className="flex items-center gap-4 relative">
            <Sparkles className="absolute -top-5 -left-3 text-indigo-500/40 animate-pulse" size={32} />
            <div className="p-3 bg-indigo-500/10 rounded-[20px] border border-indigo-500/20 shadow-sm flex items-center justify-center">
              <ShieldCheck className="text-indigo-500" size={28} />
            </div>
            <div>
              <h1 className="text-4xl font-black italic uppercase tracking-tighter leading-none text-[var(--text)]">
                Class <span className="text-indigo-500 drop-shadow-[0_0_15px_rgba(99,102,241,0.3)]">Config</span>
              </h1>
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[4px] mt-2 flex items-center gap-2">
                <span className="w-6 h-[1px] bg-zinc-400 block"></span> System Architecture Node
              </p>
            </div>
          </div>
        </div>

        {/* ⚠️ WARNING BANNER */}
        <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl flex items-start gap-3">
            <AlertTriangle size={18} className="text-orange-500 shrink-0 mt-0.5" />
            <p className="text-[9px] font-bold text-orange-500 uppercase tracking-widest leading-relaxed">
                Changes here affect the entire platform. Removing a class will instantly hide it from students and lock out assigned teachers until re-added.
            </p>
        </div>

        {/* 📝 ADD NEW CLASS FORM */}
        <div className="bg-[var(--card)]/90 backdrop-blur-2xl border border-[var(--border)] border-t-4 border-t-indigo-500 rounded-[35px] p-6 shadow-xl relative">
          <form onSubmit={handleAddClass} className="flex gap-2">
            <input 
              type="text" 
              placeholder="e.g., LKG, 5A, 12th Comm" 
              value={newClass} 
              onChange={(e) => setNewClass(e.target.value)} 
              className="flex-1 bg-[var(--background)] border border-[var(--border)] rounded-[20px] p-4 text-sm font-black uppercase outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 text-[var(--text)] shadow-inner placeholder:text-zinc-500" 
            />
            <button type="submit" disabled={!newClass.trim()} className="p-4 bg-indigo-500 text-white rounded-[20px] active:scale-90 shadow-[0_5px_15px_rgba(99,102,241,0.3)] transition-all hover:bg-indigo-400 disabled:opacity-50 disabled:shadow-none">
              <Plus size={20} strokeWidth={3} />
            </button>
          </form>
        </div>

        {/* 📚 MANAGE ACTIVE CLASSES */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-4 ml-2">
            <h2 className="text-[10px] font-black text-zinc-500 uppercase tracking-[4px]">Active Classes in Database</h2>
            <span className="text-[9px] font-black text-[var(--background)] bg-[var(--text)] px-3 py-1.5 rounded-full shadow-sm">{activeClasses.length} Nodes</span>
          </div>

          <div className="bg-[var(--card)]/60 backdrop-blur-md border border-[var(--border)] rounded-[28px] overflow-hidden shadow-sm">
            {loading ? (
              <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-indigo-500" size={24} /></div>
            ) : activeClasses.length === 0 ? (
              <div className="p-12 text-center text-[10px] font-black text-zinc-500 uppercase tracking-widest">No classes configured.</div>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {activeClasses.map((cls) => (
                  <div key={cls} className="p-4 px-6 flex items-center justify-between group hover:bg-[var(--background)]/50 transition-colors">
                    <span className="text-sm font-black uppercase text-[var(--text)] tracking-widest">{cls}</span>
                    <button onClick={() => handleRemoveClass(cls)} className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-500/10 active:scale-90 transition-all">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ☁️ MASTER SYNC BUTTON */}
        <button 
          onClick={saveToCloud}
          disabled={saving || loading}
          className="w-full p-6 bg-indigo-600 text-white rounded-[24px] font-black uppercase tracking-[3px] text-xs flex items-center justify-center gap-3 transition-all active:scale-95 shadow-[0_10px_25px_rgba(79,70,229,0.3)] hover:bg-indigo-500 disabled:opacity-50 disabled:shadow-none"
        >
          {saving ? <Loader2 className="animate-spin" /> : <><Save size={18} /> Sync Structure to Cloud</>}
        </button>

      </div>
    </div>
  );
}
