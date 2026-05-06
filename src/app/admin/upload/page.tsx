'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Loader2, Trash2, Lock, UploadCloud, Sparkles, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AdminUpload() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [success, setSuccess] = useState(false);
  const [allMaterials, setAllMaterials] = useState<any[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [standard, setStandard] = useState("");
  const [subject, setSubject] = useState("");
  const [rawLink, setRawLink] = useState("");
  const [size, setSize] = useState("");

  const classes = ["5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"];
  const subjects = ["English", "Science", "Mathematics", "Social-Studies"];

  useEffect(() => {
    const role = localStorage.getItem('role');
    const assigned = localStorage.getItem('assignedClass');
    setUserRole(role);

    // 🛡️ ROLE LOCK: Teacher restricted to their class node
    if (role === 'teacher' && assigned) {
      setStandard(assigned);
    }
    fetchMaterials(role, assigned);
  }, []);

  const fetchMaterials = async (role: string | null, assigned: string | null) => {
    setFetching(true);
    let query = supabase.from('materials').select('*').order('created_at', { ascending: false });
    
    // 🛡️ DATA ISOLATION: Teachers only see their own class's library
    if (role === 'teacher' && assigned) {
      query = query.eq('class', assigned);
    }

    const { data } = await query;
    if (data) setAllMaterials(data);
    setFetching(false);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const normalizedSubject = subject.toLowerCase().trim();

    const { error } = await supabase.from('materials').insert([{ 
      title, 
      class: standard, 
      subject: normalizedSubject, 
      drive_id: rawLink, 
      size: size || "N/A" 
    }]);

    setLoading(false);
    if (!error) {
      setSuccess(true);
      setTitle(""); setRawLink(""); setSize("");
      fetchMaterials(userRole, standard);
      setTimeout(() => setSuccess(false), 3000);
    } else {
      alert("Error: " + error.message);
    }
  };
  return (
    <div className="min-h-screen bg-transparent p-6 pt-24 pb-40 text-[var(--text)] font-sans relative z-0">
      
      {/* ✨ Ambient Premium Glow Background */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[350px] h-[350px] rounded-full bg-green-500/10 blur-[120px]"></div>
        <div className="absolute bottom-[10%] left-[-10%] w-[300px] h-[300px] rounded-full bg-emerald-500/10 blur-[100px]"></div>
      </div>

      <div className="max-w-md mx-auto space-y-8">
        
        {/* Header & Back Button */}
        <div>
          <button onClick={() => router.push('/admin')} className="flex items-center gap-2 text-zinc-500 hover:text-[var(--text)] transition-colors text-[10px] font-black uppercase tracking-widest mb-8 active:scale-95">
            <ArrowLeft size={16} /> Admin Core
          </button>

          <div className="flex items-center gap-4 relative">
            <Sparkles className="absolute -top-5 -left-3 text-green-500/40 animate-pulse" size={32} />
            <div className="p-3 bg-green-500/10 rounded-[20px] border border-green-500/20 shadow-sm flex items-center justify-center">
              <UploadCloud className="text-green-500" size={28} />
            </div>
            <div>
              <h1 className="text-4xl font-black italic uppercase tracking-tighter leading-none text-[var(--text)]">
                Vault <span className="text-green-500 drop-shadow-[0_0_15px_rgba(34,197,94,0.3)]">Node</span>
              </h1>
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[4px] mt-2 flex items-center gap-2">
                <span className="w-6 h-[1px] bg-zinc-400 block"></span> {userRole === 'teacher' ? `Class ${standard} Library` : "Master Cloud Node"}
              </p>
            </div>
          </div>
        </div>

        {/* 📝 UPLOAD FORM */}
        <form onSubmit={handleUpload} className="bg-[var(--card)]/90 backdrop-blur-2xl border border-[var(--border)] border-t-4 border-t-green-500 rounded-[35px] p-7 space-y-5 shadow-xl relative overflow-visible">
          <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text)] mb-2 flex items-center gap-2">
            <FileText size={16} className="text-green-500" /> Push Document
          </h3>

          <input required type="text" placeholder="DOCUMENT TITLE" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-[var(--background)] border border-[var(--border)] rounded-[20px] p-5 text-sm font-black uppercase text-[var(--text)] outline-none focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all shadow-inner placeholder:text-zinc-500" />
          
          <div className="grid grid-cols-2 gap-4">
            {/* Standard select - Locked for Teachers */}
            <div className="relative">
              {userRole === 'teacher' && <Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-green-600 z-10" />}
              <select 
                required 
                disabled={userRole === 'teacher'}
                value={standard} 
                onChange={(e) => setStandard(e.target.value)} 
                className={`w-full bg-[var(--background)] border border-[var(--border)] rounded-[20px] p-5 text-xs font-black uppercase text-[var(--text)] outline-none appearance-none focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all shadow-inner ${userRole === 'teacher' ? 'pl-10 opacity-70' : ''}`}
              >
                <option value="">{userRole === 'teacher' ? `Class ${standard}` : "Standard"}</option>
                {classes.map(c => <option key={c} value={c}>Class {c}</option>)}
              </select>
            </div>

            <select required value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full bg-[var(--background)] border border-[var(--border)] rounded-[20px] p-5 text-xs font-black uppercase text-[var(--text)] outline-none appearance-none focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all shadow-inner">
              <option value="">Subject</option>
              {subjects.map(s => <option key={s} value={s}>{s.replace('-', ' ')}</option>)}
            </select>
          </div>

          <input required type="text" placeholder="DIRECT LINK / DRIVE ID" value={rawLink} onChange={(e) => setRawLink(e.target.value)} className="w-full bg-[var(--background)] border border-[var(--border)] rounded-[20px] p-5 text-sm font-black uppercase text-[var(--text)] outline-none focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all shadow-inner placeholder:text-zinc-500" />
          <input type="text" placeholder="FILE SIZE (e.g. 2.4MB)" value={size} onChange={(e) => setSize(e.target.value)} className="w-full bg-[var(--background)] border border-[var(--border)] rounded-[20px] p-5 text-sm font-black uppercase text-[var(--text)] outline-none focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all shadow-inner placeholder:text-zinc-500" />
          
          <button disabled={loading || success} className={`w-full p-6 rounded-[24px] font-black uppercase tracking-[3px] text-xs flex items-center justify-center gap-3 transition-all active:scale-95 shadow-[0_10px_25px_rgba(34,197,94,0.25)] mt-4 ${success ? 'bg-emerald-500 text-white shadow-emerald-500/30' : 'bg-green-500 text-black hover:bg-green-400 disabled:bg-zinc-500/10 disabled:text-zinc-500 disabled:shadow-none disabled:border disabled:border-[var(--border)]'}`}>
            {loading ? <Loader2 className="animate-spin text-black" /> : success ? "Deployed to Vault" : <><UploadCloud size={18} fill="currentColor" /> Push to Library</>}
          </button>
        </form>

        {/* 📚 MANAGE VAULT LEDGER */}
        <div className="pt-6">
          <div className="flex items-center justify-between mb-5 ml-2">
            <h2 className="text-[10px] font-black text-zinc-500 uppercase tracking-[4px]">Active Documents</h2>
            <span className="text-[9px] font-black text-[var(--background)] bg-[var(--text)] px-3 py-1.5 rounded-full shadow-sm">{allMaterials.length} Files</span>
          </div>

          {fetching ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin text-green-500" size={32} /></div>
          ) : (
            <div className="space-y-3">
              {allMaterials.length === 0 ? (
                <div className="text-center py-12 bg-[var(--card)]/30 border border-dashed border-[var(--border)] rounded-[35px]">
                  <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 opacity-50 italic leading-relaxed px-10">Vault is empty for this standard.</p>
                </div>
              ) : (
                allMaterials.map((file) => (
                  <div key={file.id} className="p-5 bg-[var(--card)]/60 backdrop-blur-md border border-[var(--border)] border-l-4 border-l-green-500 rounded-[24px] flex items-center justify-between shadow-sm group active:scale-[0.98] hover:shadow-md transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-600 dark:text-green-500">
                        <FileText size={16} />
                      </div>
                      <div>
                        <h4 className="text-sm font-black uppercase text-[var(--text)] italic tracking-tight leading-none mb-1.5 line-clamp-1">{file.title}</h4>
                        <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">
                          Class {file.class} • {file.subject} • {file.size}
                        </p>
                      </div>
                    </div>
                    <button onClick={async () => { if(confirm("Delete this document?")) { await supabase.from('materials').delete().eq('id', file.id); fetchMaterials(userRole, standard); } }} className="w-8 h-8 shrink-0 rounded-full bg-[var(--background)] border border-[var(--border)] flex items-center justify-center text-zinc-400 hover:text-red-500 hover:border-red-500/30 hover:bg-red-500/5 active:scale-90 transition-all">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
