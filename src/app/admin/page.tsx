'use client';
import React, { useState, useEffect } from 'react';
import { ShieldCheck, Bell, Save, LogOut, Calendar as CalendarIcon, Trophy, UserPlus, UploadCloud, ListChecks, Users, IndianRupee, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AdminDashboard() {
  const [notice, setNotice] = useState("");
  const [studentCount, setStudentCount] = useState(0);
  const [saved, setSaved] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [assignedClass, setAssignedClass] = useState<string | null>(null);
  const [staffName, setStaffName] = useState<string | null>(null);
  const router = useRouter();

  const sanitizeClass = (cls: string | null) => {
    if (!cls) return "";
    return cls.toLowerCase().replace(/(st|nd|rd|th)/g, "").trim();
  };

  useEffect(() => {
    const role = localStorage.getItem('role');
    const userClass = localStorage.getItem('assignedClass');
    const name = localStorage.getItem('staffName');
    
    if (role !== 'principal' && role !== 'teacher') {
      router.push('/login');
      return;
    }

    setUserRole(role);
    setAssignedClass(userClass);
    setStaffName(name);

    const fetchAdminData = async () => {
      const cleanClass = sanitizeClass(userClass);
      const noticeKey = role === 'principal' ? 'global_notice' : `notice_class_${cleanClass}`;
      
      const { data: noticeData } = await supabase.from('config').select('value').eq('key', noticeKey).maybeSingle();
      if (noticeData) setNotice(noticeData.value);

      let query = supabase.from('students').select('*', { count: 'exact', head: true });
      if (role === 'teacher') query = query.eq('class', userClass);
      
      const { count } = await query;
      if (count !== null) setStudentCount(count);
    };
    fetchAdminData();
  }, [router]);

  const handleUpdateNotice = async () => {
    const role = localStorage.getItem('role');
    const cleanClass = sanitizeClass(assignedClass);
    const noticeKey = role === 'principal' ? 'global_notice' : `notice_class_${cleanClass}`;

    const { error } = await supabase.from('config').upsert({ key: noticeKey, value: notice });
    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push('/login');
  };

  return (
    <div className="px-6 pt-28 pb-40 min-h-svh bg-transparent font-sans text-[var(--text)] relative z-0">
      
      {/* ✨ Ambient Premium Glow Background */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[350px] h-[350px] rounded-full bg-blue-500/10 blur-[120px]"></div>
        <div className="absolute bottom-[10%] left-[-10%] w-[300px] h-[300px] rounded-full bg-emerald-500/10 blur-[100px]"></div>
      </div>

      <div className="flex justify-between items-center mb-10 px-2">
        <div className="flex items-center gap-4 relative">
          <Sparkles className="absolute -top-6 -left-3 text-blue-500/40 animate-pulse" size={32} />
          <div className="p-3 bg-blue-500/10 rounded-[20px] border border-blue-500/20 shadow-sm flex items-center justify-center">
            <ShieldCheck className="text-blue-500" size={28} />
          </div>
          <div>
            <h2 className="text-4xl font-black italic uppercase tracking-tighter leading-none text-[var(--text)]">
              {userRole === 'principal' ? 'Master' : 'Staff'} <span className="text-blue-500 drop-shadow-[0_0_15px_rgba(59,130,246,0.3)]">Core</span>
            </h2>
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[4px] mt-2 flex items-center gap-2">
              <span className="w-6 h-[1px] bg-zinc-400 block"></span> {userRole === 'principal' ? `Admin: ${staffName}` : `Class ${assignedClass}`}
            </p>
          </div>
        </div>
        <button onClick={handleLogout} className="p-3 bg-[var(--card)] rounded-2xl text-zinc-500 border border-[var(--border)] shadow-sm hover:text-red-500 hover:border-red-500/30 hover:bg-red-500/5 active:scale-90 transition-all">
          <LogOut size={20} />
        </button>
      </div>

      {/* 📢 Notice Board */}
      <div className="p-6 bg-[var(--card)]/80 backdrop-blur-xl border border-[var(--border)] rounded-[35px] shadow-[0_8px_30px_rgba(0,0,0,0.04)] mb-10 relative overflow-hidden group">
        <div className="absolute right-[-15px] top-[-15px] opacity-[0.03] -rotate-12 group-hover:rotate-0 transition-transform duration-500">
          <Bell size={100} className="text-blue-500" />
        </div>
        <div className="flex items-center gap-3 mb-4 relative z-10">
          <div className="p-2 bg-blue-500/10 rounded-xl">
            <Bell className="text-blue-500" size={16} />
          </div>
          <h4 className="text-xs font-black uppercase tracking-widest text-[var(--text)]">
            {userRole === 'principal' ? 'Global Broadcast' : 'Class Notice Update'}
          </h4>
        </div>
        <textarea 
          value={notice}
          onChange={(e) => setNotice(e.target.value)}
          className="w-full h-24 bg-[var(--background)] border border-[var(--border)] rounded-2xl p-4 text-sm font-bold text-[var(--text)] focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all resize-none mb-4 shadow-inner relative z-10"
          placeholder="Type update here..."
        />
        <button onClick={handleUpdateNotice} className={`w-full py-4 rounded-2xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 relative z-10 ${saved ? 'bg-emerald-500 text-white shadow-emerald-500/30' : 'bg-blue-600 text-white shadow-blue-500/30'}`}>
          {saved ? "Cloud Synced!" : <><Save size={16} /> Update Board</>}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* 🛡️ ONLY PRINCIPAL SEES FINANCE AND STAFF MANAGEMENT */}
        {userRole === 'principal' && (
          <>
            <AdminCard onClick={() => router.push('/admin/fees')} icon={<IndianRupee className="text-emerald-500" />} label="Finance Node" title="Fee Ledger" detail="Collect & Setup" borderAccent="border-l-emerald-500" iconBg="bg-emerald-500/10" textAccent="text-emerald-600 dark:text-emerald-500" />
            <AdminCard onClick={() => router.push('/admin/staff')} icon={<Users className="text-cyan-500" />} label="Management" title="Staff Hub" detail="Manage Teachers" borderAccent="border-l-cyan-500" iconBg="bg-cyan-500/10" textAccent="text-cyan-600 dark:text-cyan-500" />
          </>
        )}
        <AdminCard onClick={() => router.push('/admin/ledger')} icon={<UserPlus className="text-purple-500" />} label="Enrollment" title="Ledger" detail={`${studentCount} Students Active`} borderAccent="border-l-purple-500" iconBg="bg-purple-500/10" textAccent="text-purple-600 dark:text-purple-500" />
        <AdminCard onClick={() => router.push('/admin/attendance')} icon={<CalendarIcon className="text-blue-500" />} label="Attendance" title="Roll Call" detail="Cloud Synced" borderAccent="border-l-blue-500" iconBg="bg-blue-500/10" textAccent="text-blue-600 dark:text-blue-500" />
        <AdminCard onClick={() => router.push('/admin/marks')} icon={<Trophy className="text-yellow-500" />} label="Academic" title="Marks Entry" detail="Log Scores" borderAccent="border-l-yellow-500" iconBg="bg-yellow-500/10" textAccent="text-yellow-600 dark:text-yellow-500" />
        <AdminCard onClick={() => router.push('/admin/upload')} icon={<UploadCloud className="text-green-500" />} label="Library" title="PDF Vault" detail="Sync Notes" borderAccent="border-l-green-500" iconBg="bg-green-500/10" textAccent="text-green-600 dark:text-green-500" />
        <AdminCard onClick={() => router.push('/admin/syllabus')} icon={<ListChecks className="text-red-500" />} label="Planning" title="Syllabus" detail="Track Progress" borderAccent="border-l-red-500" iconBg="bg-red-500/10" textAccent="text-red-600 dark:text-red-500" />
      </div>
    </div>
  );
}

function AdminCard({ onClick, icon, label, title, detail, borderAccent, iconBg, textAccent }: any) {
  return (
    <div onClick={onClick} className={`p-5 bg-[var(--card)]/80 backdrop-blur-xl border border-[var(--border)] border-l-4 ${borderAccent} rounded-[32px] active:scale-95 transition-all cursor-pointer shadow-[0_5px_15px_rgba(0,0,0,0.03)] hover:shadow-lg hover:border-r-transparent hover:border-t-transparent hover:border-b-transparent relative overflow-hidden group`}>
      <div className={`mb-4 w-12 h-12 rounded-2xl flex items-center justify-center ${iconBg} border border-[var(--border)] shadow-sm group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <h5 className="text-[8px] font-black uppercase text-zinc-500 tracking-widest leading-none mb-1.5">{label}</h5>
      <p className="text-sm font-black text-[var(--text)] italic uppercase tracking-tight leading-none">{title}</p>
      <p className={`text-[8px] font-bold mt-2.5 uppercase tracking-widest ${textAccent}`}>{detail}</p>
    </div>
  );
}
