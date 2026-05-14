'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ShieldCheck, Search, Loader2, CheckCircle2, Ban, Smartphone, RefreshCcw, AlertTriangle, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type StudentDevice = {
  id: string;
  name: string;
  class: string;
  device_id: string | null;
  pending_device_id: string | null;
  device_status: 'verified' | 'pending' | 'blocked' | null;
};

export default function SecurityGate() {
  const router = useRouter();
  const [requests, setRequests] = useState<StudentDevice[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'verified' | 'blocked'>('pending');

  useEffect(() => {
    const role = localStorage.getItem('role');
    if (role !== 'principal') {
      router.push('/dashboard');
    } else {
      fetchRequests();
    }
  }, [router]);

  const fetchRequests = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('students')
      .select('id, name, class, device_id, pending_device_id, device_status')
      .order('device_status', { ascending: false }); 
    
    if (data) setRequests(data);
    setLoading(false);
  };

  const approveDevice = async (studentId: string, newDeviceId: string | null) => {
    if (!newDeviceId) return;
    setActionId(studentId);
    const { error } = await supabase.from('students').update({ 
      device_id: newDeviceId, device_status: 'verified', pending_device_id: null 
    }).eq('id', studentId);
    
    if (!error) fetchRequests();
    setActionId(null);
  };

  const blockStudent = async (studentId: string) => {
    const confirm = window.confirm("Block this student's device? They will not be able to log in.");
    if (!confirm) return;

    setActionId(studentId);
    await supabase.from('students').update({ device_status: 'blocked' }).eq('id', studentId);
    fetchRequests();
    setActionId(null);
  };

  const resetDevice = async (studentId: string) => {
    const confirm = window.confirm("Unbind this device? The student will be prompted to register their current device on their next login.");
    if (!confirm) return;

    setActionId(studentId);
    await supabase.from('students').update({ 
      device_id: null, 
      pending_device_id: null,
      device_status: null 
    }).eq('id', studentId);
    fetchRequests();
    setActionId(null);
  };

  const filtered = requests.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) || r.id.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeTab === 'all') return matchesSearch;
    if (activeTab === 'pending') return matchesSearch && r.device_status === 'pending';
    if (activeTab === 'verified') return matchesSearch && r.device_status === 'verified';
    if (activeTab === 'blocked') return matchesSearch && r.device_status === 'blocked';
    return false;
  });

  return (
    <div className="min-h-screen pb-32 font-sans bg-background text-text px-5 pt-24 relative overflow-hidden">
      
      <button onClick={() => router.back()} className="flex items-center gap-1.5 mb-8 active:scale-95 transition-transform text-[10px] font-black tracking-[0.18em] uppercase text-zinc-500 hover:text-text">
        <ChevronLeft size={16} strokeWidth={3} /> Back to Admin
      </button>

      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mb-5 shadow-sm">
            <ShieldCheck size={28} className="text-orange-500" />
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tighter leading-none mb-2">
            Security <span className="text-orange-500">Gate</span>
          </h1>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Device Binding Control</p>
        </div>
        <button onClick={fetchRequests} className="p-3 bg-card border border-border rounded-2xl shadow-sm hover:bg-zinc-500/5 transition-colors">
          <RefreshCcw size={18} className={loading ? 'animate-spin text-orange-500' : 'text-zinc-500'} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto hide-scrollbar mb-6">
        {[
          { id: 'pending', label: 'Pending', icon: <AlertTriangle size={12} /> },
          { id: 'verified', label: 'Verified', icon: <CheckCircle2 size={12} /> },
          { id: 'blocked', label: 'Blocked', icon: <Ban size={12} /> },
          { id: 'all', label: 'All Users', icon: <Users size={12} /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === tab.id 
                ? 'bg-text text-background shadow-md' 
                : 'bg-card border border-border text-zinc-500 hover:text-text'
            }`}
          >
            {tab.icon} {tab.label}
            {tab.id === 'pending' && requests.filter(r => r.device_status === 'pending').length > 0 && (
              <span className="w-4 h-4 rounded-full bg-orange-500 text-white flex items-center justify-center text-[8px]">
                {requests.filter(r => r.device_status === 'pending').length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* FIXED SEARCH BAR */}
      <div className="relative mb-6 flex items-center">
        <div className="absolute left-4 top-0 bottom-0 flex items-center justify-center pointer-events-none">
          <Search className="text-zinc-500" size={16} />
        </div>
        <input 
          type="text" placeholder="Search by name or ID..." value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-card border border-border rounded-2xl py-4 pl-12 pr-4 text-xs font-bold text-text uppercase outline-none focus:border-orange-500 transition-colors shadow-sm"
        />
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 size={24} className="animate-spin text-orange-500" />
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Scanning Database...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-card border border-dashed border-border rounded-[2rem]">
            <ShieldCheck size={32} className="text-zinc-400 mx-auto mb-3" />
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">No matching records found</p>
          </div>
        ) : (
          filtered.map((student) => (
            <div key={student.id} className={`p-5 rounded-3xl bg-card border shadow-sm flex flex-col gap-4 transition-all ${
              student.device_status === 'pending' ? 'border-orange-500/50' : 'border-border'
            }`}>
              
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-sm font-black italic uppercase text-text mb-1">{student.name}</h4>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">ID: {student.id} • Class {student.class}</p>
                </div>
                <span className={`text-[8px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest ${
                  student.device_status === 'blocked' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 
                  student.device_status === 'pending' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30 animate-pulse' : 
                  student.device_status === 'verified' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                  'bg-zinc-500/10 text-zinc-500 border border-border'
                }`}>
                  {student.device_status || 'Unbound'}
                </span>
              </div>

              {(student.device_id || student.pending_device_id) && (
                <div className="flex items-center gap-2 px-3 py-2 bg-background border border-border rounded-xl">
                  <Smartphone size={12} className="text-zinc-500" />
                  <p className="text-[9px] font-bold text-zinc-500 truncate font-mono">
                    {student.pending_device_id || student.device_id}
                  </p>
                </div>
              )}

              <div className="flex gap-2 mt-2">
                {student.device_status === 'pending' && (
                  <>
                    <button onClick={() => approveDevice(student.id, student.pending_device_id)} disabled={!!actionId} className="flex-1 bg-emerald-500 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                      {actionId === student.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Approve
                    </button>
                    <button onClick={() => blockStudent(student.id)} disabled={!!actionId} className="flex-1 bg-red-500 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                      {actionId === student.id ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />} Block
                    </button>
                  </>
                )}

                {student.device_status === 'verified' && (
                  <>
                    <button onClick={() => resetDevice(student.id)} disabled={!!actionId} className="flex-1 bg-background border border-border text-text py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                      {actionId === student.id ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />} Unbind Device
                    </button>
                    <button onClick={() => blockStudent(student.id)} disabled={!!actionId} className="flex-1 bg-background border border-border text-text py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white hover:border-red-500 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                      {actionId === student.id ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />} Block
                    </button>
                  </>
                )}

                {student.device_status === 'blocked' && (
                  <button onClick={() => resetDevice(student.id)} disabled={!!actionId} className="w-full bg-background border border-border text-text py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500/10 hover:text-emerald-500 hover:border-emerald-500/30 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                    {actionId === student.id ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />} Lift Ban & Unbind
                  </button>
                )}
              </div>

            </div>
          ))
        )}
      </div>

    </div>
  );
}
