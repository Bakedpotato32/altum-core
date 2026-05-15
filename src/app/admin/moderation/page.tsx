'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Search, Loader2, UserX, ImageMinus, Edit3, ShieldAlert, RefreshCcw, Save, Trash2, Ban, UploadCloud, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type StudentMod = {
  id: string;
  name: string;
  class: string;
  avatar_url: string | null;
  pfp_locked: boolean;
  device_status: string | null;
};

export default function ModerationPage() {
  const router = useRouter();
  const [students, setStudents] = useState<StudentMod[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'has_pfp' | 'locked' | 'frozen'>('all');
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    const role = localStorage.getItem('role');
    if (role !== 'principal') {
      router.push('/dashboard');
    } else {
      fetchStudents();
    }
  }, [router]);

  const fetchStudents = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('students')
      .select('id, name, class, avatar_url, pfp_locked, device_status')
      .order('class', { ascending: true });
    
    if (data) setStudents(data);
    setLoading(false);
  };

  const saveName = async (id: string) => {
    if (!editName.trim()) return;
    setActionLoading(`name-${id}`);
    const { error } = await supabase.from('students').update({ name: editName }).eq('id', id);
    if (!error) {
      setStudents(prev => prev.map(s => s.id === id ? { ...s, name: editName } : s));
      setEditingId(null);
    }
    setActionLoading(null);
  };

  const deletePfp = async (id: string) => {
    const confirm = window.confirm("Delete this user's profile picture?");
    if (!confirm) return;
    setActionLoading(`pfp-${id}`);
    await supabase.from('students').update({ avatar_url: null }).eq('id', id);
    setStudents(prev => prev.map(s => s.id === id ? { ...s, avatar_url: null } : s));
    setActionLoading(null);
  };

  const uploadPfp = async (e: React.ChangeEvent<HTMLInputElement>, studentId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setActionLoading(`upload-${studentId}`);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${studentId}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars') 
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      await supabase.from('students').update({ avatar_url: publicUrl }).eq('id', studentId);
      setStudents(prev => prev.map(s => s.id === studentId ? { ...s, avatar_url: publicUrl } : s));
      
    } catch (error: any) {
      alert('Upload failed. Do you have an "avatars" bucket set up? Error: ' + error.message);
    } finally {
      setActionLoading(null);
    }
  };

  const togglePfpLock = async (id: string, currentStatus: boolean) => {
    setActionLoading(`lock-${id}`);
    await supabase.from('students').update({ pfp_locked: !currentStatus }).eq('id', id);
    setStudents(prev => prev.map(s => s.id === id ? { ...s, pfp_locked: !currentStatus } : s));
    setActionLoading(null);
  };

  const toggleFreeze = async (id: string, currentStatus: string | null) => {
    const isFrozen = currentStatus === 'blocked';
    const newStatus = isFrozen ? 'verified' : 'blocked';
    const confirmMessage = isFrozen ? "Unfreeze this account?" : "FREEZE this account? They will be locked out immediately.";
    if (!window.confirm(confirmMessage)) return;

    setActionLoading(`freeze-${id}`);
    await supabase.from('students').update({ device_status: newStatus }).eq('id', id);
    setStudents(prev => prev.map(s => s.id === id ? { ...s, device_status: newStatus } : s));
    setActionLoading(null);
  };

  const filtered = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.id.toLowerCase().includes(searchQuery.toLowerCase());
    if (filter === 'all') return matchesSearch;
    if (filter === 'has_pfp') return matchesSearch && s.avatar_url !== null;
    if (filter === 'locked') return matchesSearch && s.pfp_locked === true;
    if (filter === 'frozen') return matchesSearch && s.device_status === 'blocked';
    return false;
  });

  return (
    <div className="min-h-screen pb-32 bg-[#f8fafc] text-slate-900 px-5 pt-6 relative overflow-x-hidden font-sans">
      
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* Subpage Header */}
      <div className="flex items-center gap-4 mb-6 pt-2">
        <button 
          onClick={() => router.back()}
          className="w-11 h-11 rounded-[14px] bg-white border border-slate-200 flex items-center justify-center text-slate-900 shadow-[0_2px_8px_rgba(0,0,0,0.02)] shrink-0 active:scale-95 transition-transform"
        >
          <ChevronLeft size={24} strokeWidth={2.5} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-1.5 mb-0.5">
            <ShieldCheck size={14} className="text-red-500" strokeWidth={2.5} />
            <p className="m-0 text-[11px] font-extrabold text-red-500 tracking-wider uppercase">
              Admin Controls
            </p>
          </div>
          <h1 className="m-0 text-[26px] font-black italic uppercase text-slate-900 leading-tight">
            Profile <span className="text-red-500">Mod</span>
          </h1>
        </div>
        <button 
          onClick={fetchStudents} 
          className="w-11 h-11 rounded-[14px] bg-white border border-slate-200 flex items-center justify-center text-slate-400 shadow-[0_2px_8px_rgba(0,0,0,0.02)] shrink-0 active:scale-95 transition-transform"
        >
          <RefreshCcw size={20} className={loading ? 'animate-spin text-red-500' : ''} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto hide-scrollbar mb-6 pb-2">
        {[
          { id: 'all', label: 'All Users' },
          { id: 'has_pfp', label: 'Has PFP' },
          { id: 'locked', label: 'PFP Locked' },
          { id: 'frozen', label: 'Frozen Accts' },
        ].map(tab => {
          const isActive = filter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              className={`shrink-0 px-4 py-2.5 rounded-full text-[11px] font-extrabold tracking-wide uppercase transition-all whitespace-nowrap flex items-center gap-2 ${
                isActive 
                  ? 'bg-red-500 text-white shadow-[0_4px_10px_rgba(239,68,68,0.2)] border-transparent' 
                  : 'bg-white text-slate-500 border border-slate-200'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="text-slate-400" size={18} />
        </div>
        <input 
          type="text" 
          placeholder="Search by name or ID..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white border border-slate-200 rounded-[24px] py-4 pl-11 pr-4 text-sm font-bold text-slate-900 outline-none shadow-[0_2px_8px_rgba(0,0,0,0.02)] focus:border-red-500 transition-colors"
        />
      </div>

      {/* Student List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Loader2 size={32} className="animate-spin text-red-500" />
            <p className="text-xs font-extrabold uppercase tracking-wide text-slate-400">Syncing Data...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 px-6 bg-white border border-slate-200 rounded-[24px]">
            <ShieldAlert size={32} className="text-slate-300 mx-auto mb-3" />
            <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wide">No matching records found</p>
          </div>
        ) : (
          filtered.map((student) => {
            // Determine accent color based on status
            let accentColor = "bg-blue-500";
            if (student.device_status === 'blocked') accentColor = "bg-red-500";
            else if (student.pfp_locked) accentColor = "bg-orange-500";

            return (
              <div key={student.id} className="p-5 rounded-[20px] bg-white border border-slate-100 shadow-[0_4px_15px_rgba(0,0,0,0.02)] relative overflow-hidden flex flex-col gap-5">
                
                {/* Left Accent Stripe */}
                <div className={`absolute left-0 top-6 bottom-6 w-1 rounded-r-md ${accentColor}`} />

                {/* Top Row: Avatar & Info */}
                <div className="flex items-center gap-4 pl-2">
                  
                  {/* AVATAR WITH HOVER ACTIONS */}
                  <div className="w-[60px] h-[60px] rounded-[16px] bg-slate-50 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center relative group">
                    {student.avatar_url ? (
                      <img src={student.avatar_url} alt="pfp" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl font-black text-slate-300">{student.name[0]}</span>
                    )}
                    
                    {/* Action Overlay */}
                    <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1 transition-opacity">
                      
                      {/* Upload New PFP */}
                      <label className="cursor-pointer p-1 text-white hover:text-blue-400 transition-colors">
                        {actionLoading === `upload-${student.id}` ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadPfp(e, student.id)} />
                      </label>

                      {/* Delete Current PFP */}
                      {student.avatar_url && (
                        <button onClick={() => deletePfp(student.id)} className="p-1 text-white hover:text-red-400 transition-colors">
                          {actionLoading === `pfp-${student.id}` ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                        </button>
                      )}
                    </div>

                    {student.pfp_locked && (
                      <div className="absolute -bottom-1 -right-1 bg-orange-500 text-white p-1 rounded-lg border-2 border-white z-10 shadow-sm">
                        <ImageMinus size={10} strokeWidth={3} />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 pr-2">
                    {editingId === student.id ? (
                      <div className="flex items-center gap-2 mb-1.5">
                        <input 
                          type="text" 
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-[10px] px-3 py-1.5 text-sm font-black italic uppercase text-slate-900 outline-none focus:border-red-500"
                        />
                        <button onClick={() => saveName(student.id)} className="w-8 h-8 flex items-center justify-center bg-blue-500 text-white rounded-[10px] shrink-0">
                          {actionLoading === `name-${student.id}` ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mb-1.5">
                        <h4 className="text-[17px] font-black italic uppercase text-slate-900 truncate m-0 leading-none">{student.name}</h4>
                        <button onClick={() => { setEditingId(student.id); setEditName(student.name); }} className="text-slate-300 hover:text-blue-500 transition-colors shrink-0">
                          <Edit3 size={14} strokeWidth={2.5} />
                        </button>
                      </div>
                    )}
                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide truncate m-0">
                      ID: {student.id} • CLASS {student.class}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pl-2">
                  {/* Lock PFP Button */}
                  <button 
                    onClick={() => togglePfpLock(student.id, student.pfp_locked)}
                    disabled={!!actionLoading}
                    className={`flex-1 py-3 px-2 rounded-[14px] text-[10px] font-extrabold uppercase tracking-wide flex items-center justify-center gap-1.5 transition-all border active:scale-95 ${
                      student.pfp_locked 
                        ? 'bg-[#fff7ed] text-orange-600 border-orange-200' 
                        : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                    } ${!!actionLoading && 'opacity-60 cursor-not-allowed active:scale-100'}`}
                  >
                    {actionLoading === `lock-${student.id}` ? <Loader2 size={14} className="animate-spin" /> : <ImageMinus size={14} />}
                    {student.pfp_locked ? 'Unlock PFP' : 'Lock PFP'}
                  </button>

                  {/* Freeze Account Button */}
                  <button 
                    onClick={() => toggleFreeze(student.id, student.device_status)}
                    disabled={!!actionLoading}
                    className={`flex-1 py-3 px-2 rounded-[14px] text-[10px] font-extrabold uppercase tracking-wide flex items-center justify-center gap-1.5 transition-all border active:scale-95 ${
                      student.device_status === 'blocked'
                        ? 'bg-red-500 text-white border-red-500 shadow-[0_4px_12px_rgba(239,68,68,0.3)]' 
                        : 'bg-[#fef2f2] text-red-500 border-red-200 hover:bg-red-50'
                    } ${!!actionLoading && 'opacity-60 cursor-not-allowed active:scale-100'}`}
                  >
                    {actionLoading === `freeze-${student.id}` ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />}
                    {student.device_status === 'blocked' ? 'Unfreeze' : 'Freeze Login'}
                  </button>
                </div>

              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
