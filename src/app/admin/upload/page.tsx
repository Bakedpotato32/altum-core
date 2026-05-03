'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Loader2, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AdminUpload() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [success, setSuccess] = useState(false);
  const [allMaterials, setAllMaterials] = useState<any[]>([]);

  const [title, setTitle] = useState("");
  const [standard, setStandard] = useState("");
  const [subject, setSubject] = useState("");
  const [rawLink, setRawLink] = useState("");
  const [size, setSize] = useState("");

  const classes = ["5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"];
  const subjects = ["English", "Science", "Mathematics", "Social-Studies"];

  const fetchMaterials = async () => {
    setFetching(true);
    const { data } = await supabase.from('materials').select('*').order('created_at', { ascending: false });
    if (data) setAllMaterials(data);
    setFetching(false);
  };

  useEffect(() => { fetchMaterials(); }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Normalize subject to lowercase to match the student-side fetch logic
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
      fetchMaterials();
      setTimeout(() => setSuccess(false), 3000);
    } else {
      alert("Error: " + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-transparent p-6 pt-28 pb-32 text-[var(--text)] font-sans">
      <div className="max-w-md mx-auto space-y-12">
        <button onClick={() => router.push('/admin')} className="flex items-center gap-2 text-zinc-500 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all">
          <ArrowLeft size={14} /> Admin Core
        </button>

        <div className="space-y-8">
          <h1 className="text-3xl font-black italic uppercase tracking-tighter">Vault <span className="text-blue-500">Uploader</span></h1>
          <form onSubmit={handleUpload} className="space-y-4">
            <input required type="text" placeholder="Document Title" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 text-sm font-bold text-[var(--text)] outline-none focus:border-blue-500 transition-all shadow-sm" />
            
            <div className="grid grid-cols-2 gap-4">
              <select required value={standard} onChange={(e) => setStandard(e.target.value)} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 text-sm font-bold text-[var(--text)] outline-none">
                <option value="">Standard</option>
                {classes.map(c => <option key={c} value={c} className="bg-[var(--card)]">Class {c}</option>)}
              </select>
              <select required value={subject} onChange={(e) => setSubject(e.target.value)} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 text-sm font-bold text-[var(--text)] outline-none capitalize">
                <option value="">Subject</option>
                {subjects.map(s => <option key={s} value={s} className="bg-[var(--card)]">{s}</option>)}
              </select>
            </div>

            <input required type="text" placeholder="Direct Download Link / ID" value={rawLink} onChange={(e) => setRawLink(e.target.value)} className="w-full bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 text-sm font-bold text-[var(--text)] outline-none focus:border-blue-500 transition-all shadow-sm" />
            <input type="text" placeholder="File Size (e.g. 2.4MB)" value={size} onChange={(e) => setSize(e.target.value)} className="w-full bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 text-sm font-bold text-[var(--text)] outline-none focus:border-blue-500 transition-all shadow-sm" />
            
            <button disabled={loading || success} className={`w-full p-5 rounded-[30px] font-black uppercase tracking-[2px] text-xs flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg mt-4 ${success ? 'bg-green-600 text-white' : 'bg-blue-600 text-white shadow-blue-500/10'}`}>
              {loading ? <Loader2 className="animate-spin" /> : success ? "Deployed" : "Push to Library"}
            </button>
          </form>
        </div>

        <div className="space-y-4">
          <h2 className="text-zinc-500 text-[10px] font-black uppercase tracking-[4px] ml-2">Manage Vault</h2>
          {fetching ? <div className="flex justify-center"><Loader2 className="animate-spin text-blue-500" /></div> : (
            <div className="space-y-3">
              {allMaterials.map((file) => (
                <div key={file.id} className="p-4 bg-[var(--card)] border border-[var(--border)] rounded-2xl flex items-center justify-between shadow-sm">
                  <div>
                    <h4 className="text-xs font-black uppercase text-[var(--text)] leading-none mb-1">{file.title}</h4>
                    <p className="text-[8px] font-bold text-zinc-500 uppercase">Class {file.class} • {file.subject}</p>
                  </div>
                  <button onClick={async () => { if(confirm("Delete?")) { await supabase.from('materials').delete().eq('id', file.id); fetchMaterials(); } }} className="text-zinc-400 hover:text-red-500 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
