'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert, ShieldCheck, ChevronLeft, Search, Filter, Loader2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function ChatModerationPage() {
    const router = useRouter();
    const [students, setStudents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'blocked'>('all');
    const [classFilter, setClassFilter] = useState<string>('all');

    useEffect(() => {
        const fetchStudents = async () => {
            const { data } = await supabase
                .from('students')
                .select('id, name, class, chat_banned, avatar_url')
                .order('name'); 
            if (data) setStudents(data);
            setLoading(false);
        };
        fetchStudents();
    }, []);

    const toggleBan = async (targetId: string, currentStatus: boolean) => {
        const newStatus = !currentStatus;
        await supabase.from('students').update({ chat_banned: newStatus }).eq('id', targetId);
        setStudents(students.map(s => s.id === targetId ? { ...s, chat_banned: newStatus } : s));
    };

    // Get unique classes for the dropdown filter
    const uniqueClasses = Array.from(new Set(students.map(s => s.class).filter(Boolean)));

    // Apply all filters
    const filteredStudents = students.filter(student => {
        const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase()) || student.id.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' ? true : statusFilter === 'blocked' ? student.chat_banned === true : student.chat_banned === false;
        const matchesClass = classFilter === 'all' ? true : student.class === classFilter;
        return matchesSearch && matchesStatus && matchesClass;
    });

    return (
        <div className="min-h-screen bg-background pb-20">
            {/* Header */}
            <div className="pt-16 pb-6 px-5 bg-card border-b border-border shadow-sm sticky top-0 z-50">
                <div className="flex items-center gap-4 mb-4">
                    <button onClick={() => router.back()} className="w-10 h-10 rounded-2xl bg-background border border-border flex items-center justify-center active:scale-95 transition-transform">
                        <ChevronLeft className="w-6 h-6 text-text" />
                    </button>
                    <div>
                        <h1 className="text-xl font-black italic uppercase tracking-[-0.02em] text-text leading-none flex items-center gap-2">
                            Chat <span className="text-red-500">Moderation</span>
                        </h1>
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Manage Hub Access</p>
                    </div>
                </div>

                {/* Filters Row */}
                <div className="flex flex-col gap-3">
                    <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
                        <input 
                            type="text" 
                            placeholder="Search by name or ID..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-background border border-border rounded-2xl py-3 pl-10 pr-4 text-xs font-bold outline-none focus:border-red-500/50 transition-all text-text"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 bg-zinc-800 rounded-full text-zinc-400 hover:text-white">
                                <X size={10} />
                            </button>
                        )}
                    </div>
                    
                    <div className="flex gap-2 overflow-x-auto custom-scroll pb-1">
                        {/* Status Toggles */}
                        <div className="flex bg-background border border-border rounded-xl p-1 shrink-0">
                            {(['all', 'active', 'blocked'] as const).map(status => (
                                <button
                                    key={status}
                                    onClick={() => setStatusFilter(status)}
                                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${statusFilter === status ? (status === 'blocked' ? 'bg-red-500 text-white shadow-sm' : 'bg-card text-text shadow-sm') : 'text-zinc-500 hover:text-text'}`}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>

                        {/* Class Dropdown */}
                        <select 
                            value={classFilter} 
                            onChange={(e) => setClassFilter(e.target.value)}
                            className="bg-background border border-border rounded-xl px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-text outline-none shrink-0"
                        >
                            <option value="all">All Batches</option>
                            {uniqueClasses.map(cls => (
                                <option key={cls} value={cls}>{cls}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Student List */}
            <div className="p-5 space-y-3">
                {loading ? (
                    <div className="flex justify-center py-10"><Loader2 className="animate-spin text-red-500" /></div>
                ) : filteredStudents.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-border rounded-[2rem]">
                        <p className="text-xs font-black text-zinc-500 uppercase tracking-widest italic">No students found</p>
                    </div>
                ) : (
                    filteredStudents.map(student => (
                        <div key={student.id} className="flex items-center justify-between p-4 rounded-3xl border border-border bg-card shadow-sm transition-all hover:border-zinc-500/30">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden border border-zinc-700 shrink-0">
                                    {student.avatar_url ? <img src={student.avatar_url} alt="pfp" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-zinc-500 text-xs font-black">{student.name.charAt(0)}</div>}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <p className="text-sm font-black text-text leading-none">{student.name}</p>
                                        <span className="text-[8px] font-black uppercase text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">{student.class}</span>
                                    </div>
                                    <p className="text-[10px] font-bold tracking-widest text-zinc-500">{student.id}</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => toggleBan(student.id, student.chat_banned)}
                                className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm active:scale-95
                                    ${student.chat_banned ? 'bg-red-500 text-white shadow-[0_4px_0_rgb(185,28,28)] active:translate-y-[4px] active:shadow-none' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 hover:bg-emerald-500/20'}`}
                            >
                                {student.chat_banned ? <><ShieldAlert size={14}/> Muted</> : <><ShieldCheck size={14}/> Active</>}
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
