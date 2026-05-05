'use client';
import React, { useState, useEffect } from 'react';
import { ShieldCheck, Bell, Save, LogOut, Calendar as CalendarIcon, Trophy, UserPlus, UploadCloud, ListChecks, Users, Plus, IndianRupee } from 'lucide-react';
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
    <div className="px-6 pt-28 pb-40 min-h-svh bg-transparent font-sans text-[var(--text)]">
      <div className="flex justify-between items-center mb-8 px-2">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-600/10 rounded-2xl border border-blue-500/20 shadow-sm">
            <ShieldCheck className="text-blue-500" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black italic uppercase tracking-tighter">
              {userRole === 'principal' ? 'Master' : 'Staff'} <span className="text-blue-500">Core</span>
            </h2>
            <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-[4px]">
              {userRole === 'principal' ? `Admin: ${staffName}` : `Teacher: Class ${assignedClass}`}
            </p>
          </div>
        </div>
        <button onClick={handleLogout} className="p-3 bg-[var(--card)] rounded-xl text-zinc-500 border border-[var(--border)] active:scale-90 transition-all">
          <LogOut size={20} />
        </button>
      </div>

      <div className="p-6 bg-[var(--card)] border border-[var(--border)] rounded-[35px] shadow-sm mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Bell className="text-orange-500" size={18} />
          <h4 className="text-xs font-black uppercase tracking-widest text-[var(--text)]">
            {userRole === 'principal' ? 'Global Broadcast' : 'Class Notice'}
          </h4>
        </div>
        <textarea 
          value={notice}
          onChange={(e) => setNotice(e.target.value)}
          className="w-full h-24 bg-[var(--background)] border border-[var(--border)] rounded-2xl p-4 text-sm font-bold text-[var(--text)] focus:border-blue-500 outline-none transition-all resize-none mb-4 shadow-inner"
          placeholder="Type update here..."
        />
        <button onClick={handleUpdateNotice} className={`w-full py-4 rounded-2xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 ${saved ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'}`}>
          {saved ? "Cloud Synced!" : <><Save size={16} /> Update Board</>}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* 🛡️ ONLY PRINCIPAL SEES FINANCE AND STAFF MANAGEMENT */}
        {userRole === 'principal' && (
          <>
            <AdminCard onClick={() => router.push('/admin/fees')} icon={<IndianRupee className="text-emerald-500" />} label="Finance" title="Fee Ledger" detail="Collect & Setup" highlight />
            <AdminCard onClick={() => router.push('/admin/staff')} icon={<Users className="text-cyan-400" />} label="Management" title="Staff Hub" detail="Manage Teachers" />
          </>
        )}
        <AdminCard onClick={() => router.push('/admin/ledger')} icon={<UserPlus className="text-purple-500" />} label="Enrollment" title="Ledger" detail={`${studentCount} Students`} />
        <AdminCard onClick={() => router.push('/admin/attendance')} icon={<CalendarIcon className="text-blue-500" />} label="Attendance" title="Roll Call" detail="Cloud Hub" />
        <AdminCard onClick={() => router.push('/admin/marks')} icon={<Trophy className="text-yellow-500" />} label="Academic" title="Marks Entry" detail="Log Scores" />
        <AdminCard onClick={() => router.push('/admin/upload')} icon={<UploadCloud className="text-green-500" />} label="Library" title="PDF Vault" detail="Sync Notes" />
        <AdminCard onClick={() => router.push('/admin/syllabus')} icon={<ListChecks className="text-red-500" />} label="Planning" title="Syllabus" detail="Track Progress" />
      </div>
    </div>
  );
}

function AdminCard({ onClick, icon, label, title, detail, highlight }: any) {
  return (
    <div onClick={onClick} className={`p-6 bg-[var(--card)] border rounded-[32px] active:scale-95 transition-all cursor-pointer shadow-sm ${highlight ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-[var(--border)] hover:border-blue-500/30'}`}>
      <div className="mb-4">{icon}</div>
      <h5 className="text-[9px] font-black uppercase text-zinc-500 tracking-widest leading-none mb-1">{label}</h5>
      <p className="text-sm font-black text-[var(--text)] italic uppercase tracking-tight">{title}</p>
      <p className={`text-[9px] font-bold mt-2 uppercase ${highlight ? 'text-emerald-500' : 'text-blue-500/80'}`}>{detail}</p>
    </div>
  );
}
