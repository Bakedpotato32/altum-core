'use client';
import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, Bell, Save, LogOut, Calendar as CalendarIcon,
  Trophy, UserPlus, UploadCloud, ListChecks, Users, IndianRupee,
  Sparkles, Settings2, BookMarked, Loader2, GraduationCap, ChevronRight,
  FileBarChart
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type AdminCardProps = {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  title: string;
  detail: string;
  borderAccent: string;
  iconBg: string;
  textAccent: string;
  featured?: boolean;
};

export default function AdminDashboard() {
  const [notice, setNotice] = useState("");
  const [studentCount, setStudentCount] = useState(0);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [assignedClass, setAssignedClass] = useState<string | null>(null);
  const [staffName, setStaffName] = useState<string | null>(null);
  const router = useRouter();

  const sanitizeClass = (cls: string | null) => {
    if (!cls) return "";
    return cls.toLowerCase().replace(/(st|nd|rd|th)/g, "").trim();
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const isMasterAdmin = (role: string | null, cls: string | null) =>
    role === 'principal' || sanitizeClass(cls) === 'all';

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
      try {
        const cleanClass = sanitizeClass(userClass);
        const master = isMasterAdmin(role, userClass);
        const noticeKey = master ? 'global_notice' : `notice_class_${cleanClass}`;

        const { data: noticeData } = await supabase
          .from('config').select('value').eq('key', noticeKey).maybeSingle();
        if (noticeData) setNotice(noticeData.value);

        let query = supabase.from('students').select('*', { count: 'exact', head: true });
        if (role === 'teacher' && cleanClass !== 'all') {
          query = query.eq('class', userClass);
        }
        const { count } = await query;
        if (count !== null) setStudentCount(count);
      } catch (err) {
        console.error('Failed to fetch admin data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, [router]);

  const handleUpdateNotice = async () => {
    setSaving(true);
    const role = localStorage.getItem('role');
    const cleanClass = sanitizeClass(assignedClass);
    const master = isMasterAdmin(role, assignedClass);
    const noticeKey = master ? 'global_notice' : `notice_class_${cleanClass}`;

    const { error } = await supabase.from('config').upsert({ key: noticeKey, value: notice });
    setSaving(false);
    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push('/login');
  };

  const master = isMasterAdmin(userRole, assignedClass);

  if (loading) {
    return (
      <div className="min-h-svh flex flex-col items-center justify-center bg-transparent gap-4">
        <div className="p-4 bg-blue-500/10 rounded-[20px] border border-blue-500/20">
          <ShieldCheck className="text-blue-500 animate-pulse" size={32} />
        </div>
        <Loader2 className="text-blue-500 animate-spin" size={20} />
        <p className="text-[10px] font-black uppercase tracking-[4px] text-zinc-500">Loading Core...</p>
      </div>
    );
  }

  return (
    <div className="px-5 pt-14 pb-40 min-h-svh bg-transparent font-sans text-[var(--text)] relative z-0">

      {/* ── AMBIENT BACKGROUND ── */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[400px] h-[400px] rounded-full bg-blue-500/10 blur-[130px]" />
        <div className="absolute bottom-[10%] left-[-10%] w-[300px] h-[300px] rounded-full bg-emerald-500/8 blur-[100px]" />
        <div className="absolute top-[40%] left-[30%] w-[200px] h-[200px] rounded-full bg-purple-500/5 blur-[80px]" />
      </div>

      {/* ── HEADER ── */}
      <div className="flex justify-between items-start mb-8 px-1 pt-6">
        <div className="flex flex-col gap-1">
          <p className="text-[9px] font-black uppercase tracking-[5px] text-zinc-500 flex items-center gap-2">
            <Sparkles size={10} className="text-blue-400" />
            {getGreeting()}
          </p>
          <h2 className="text-3xl font-black italic uppercase tracking-tighter leading-none text-[var(--text)]">
            {staffName ?? (master ? 'Principal' : 'Teacher')}
          </h2>
          <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-[3px] mt-0.5">
            {master ? 'Master Admin · Altum Core' : `Class ${assignedClass} · Staff Panel`}
          </p>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <div className="p-2.5 bg-blue-500/10 rounded-2xl border border-blue-500/20">
            <ShieldCheck className="text-blue-500" size={20} />
          </div>
          <button
            onClick={handleLogout}
            className="p-2.5 bg-[var(--card)] rounded-2xl text-zinc-500 border border-[var(--border)] hover:text-red-500 hover:border-red-500/30 hover:bg-red-500/5 active:scale-90 transition-all"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>

      {/* ── STATS STRIP ── */}
      <div className="flex gap-3 mb-8 overflow-x-auto pb-1 scrollbar-hide">
        <StatChip
          icon={<GraduationCap size={13} className="text-purple-500" />}
          label="Students"
          value={String(studentCount)}
          bg="bg-purple-500/8 border-purple-500/15"
        />
        <StatChip
          icon={<ShieldCheck size={13} className="text-blue-500" />}
          label="Role"
          value={master ? 'Principal' : 'Teacher'}
          bg="bg-blue-500/8 border-blue-500/15"
        />
        {!master && (
          <StatChip
            icon={<Users size={13} className="text-cyan-500" />}
            label="Class"
            value={assignedClass ?? '—'}
            bg="bg-cyan-500/8 border-cyan-500/15"
          />
        )}
      </div>

      {/* ── NOTICE BOARD ── */}
      <div className="p-5 bg-[var(--card)]/80 backdrop-blur-xl border border-[var(--border)] rounded-[28px] shadow-sm mb-8 relative overflow-hidden group">
        <div className="absolute right-[-10px] top-[-10px] opacity-[0.04] -rotate-12 group-hover:rotate-0 transition-transform duration-700">
          <Bell size={90} className="text-blue-500" />
        </div>

        <div className="flex items-center justify-between mb-3 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-blue-500/10 rounded-xl">
              <Bell className="text-blue-500" size={14} />
            </div>
            <h4 className="text-[9px] font-black uppercase tracking-[4px] text-[var(--text)]">
              {master ? 'Global Broadcast' : 'Class Notice'}
            </h4>
          </div>
          <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">
            {notice.length}/600
          </span>
        </div>

        <textarea
          value={notice}
          onChange={(e) => setNotice(e.target.value.slice(0, 300))}
          className="w-full h-20 bg-[var(--background)] border border-[var(--border)] rounded-2xl p-3.5 text-sm font-semibold text-[var(--text)] focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all resize-none mb-3.5 shadow-inner relative z-10 placeholder:text-zinc-500 placeholder:font-normal"
          placeholder={master ? "Broadcast a message to all students..." : "Post a notice for your class..."}
        />

        <button
          onClick={handleUpdateNotice}
          disabled={saving}
          className={`w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[3px] transition-all active:scale-95 relative z-10 disabled:opacity-70 ${
            saved
              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
              : 'bg-blue-600 text-white shadow-lg shadow-blue-500/25 hover:bg-blue-500'
          }`}
        >
          {saving ? (
            <><Loader2 size={14} className="animate-spin" /> Syncing...</>
          ) : saved ? (
            '✓ Board Updated!'
          ) : (
            <><Save size={14} /> Update Board</>
          )}
        </button>
      </div>

      {/* ── SYSTEM CONFIG (MASTER ONLY) ── */}
      {master && (
        <div className="mb-8">
          <SectionLabel icon={<Settings2 size={12} />} label="System Config" />
          <div className="grid grid-cols-2 gap-3">
            <AdminCard
              onClick={() => router.push('/admin/classes')}
              icon={<ShieldCheck className="text-indigo-500" size={20} />}
              label="Structure"
              title="Class Config"
              detail="Add / Remove Classes"
              borderAccent="border-l-indigo-500"
              iconBg="bg-indigo-500/10"
              textAccent="text-indigo-500"
            />
            <AdminCard
              onClick={() => router.push('/admin/subjects')}
              icon={<BookMarked className="text-rose-500" size={20} />}
              label="Curriculum"
              title="Subject Config"
              detail="Manage by Class"
              borderAccent="border-l-rose-500"
              iconBg="bg-rose-500/10"
              textAccent="text-rose-500"
            />
          </div>
        </div>
      )}

      {/* ── FINANCE & STAFF (MASTER ONLY) ── */}
      {master && (
        <div className="mb-8">
          <SectionLabel icon={<IndianRupee size={12} />} label="Finance & HR" />
          <div className="grid grid-cols-2 gap-3">
            <AdminCard
              onClick={() => router.push('/admin/fees')}
              icon={<IndianRupee className="text-emerald-500" size={20} />}
              label="Finance Node"
              title="Fee Ledger"
              detail="Collect & Setup"
              borderAccent="border-l-emerald-500"
              iconBg="bg-emerald-500/10"
              textAccent="text-emerald-500"
              featured
            />
            <AdminCard
              onClick={() => router.push('/admin/staff')}
              icon={<Users className="text-cyan-500" size={20} />}
              label="Management"
              title="Staff Hub"
              detail="Manage Teachers"
              borderAccent="border-l-cyan-500"
              iconBg="bg-cyan-500/10"
              textAccent="text-cyan-500"
              featured
            />
          </div>
        </div>
      )}

      {/* ── CORE MODULES ── */}
      <SectionLabel icon={<ListChecks size={12} />} label="Core Modules" />
      <div className="grid grid-cols-2 gap-3">
        <AdminCard
          onClick={() => router.push('/admin/ledger')}
          icon={<UserPlus className="text-purple-500" size={20} />}
          label="Enrollment"
          title="Ledger"
          detail={`${studentCount} Active`}
          borderAccent="border-l-purple-500"
          iconBg="bg-purple-500/10"
          textAccent="text-purple-500"
        />
        <AdminCard
          onClick={() => router.push('/admin/attendance')}
          icon={<CalendarIcon className="text-blue-500" size={20} />}
          label="Attendance"
          title="Roll Call"
          detail="Cloud Synced"
          borderAccent="border-l-blue-500"
          iconBg="bg-blue-500/10"
          textAccent="text-blue-500"
        />
        <AdminCard
          onClick={() => router.push('/admin/marks')}
          icon={<Trophy className="text-yellow-500" size={20} />}
          label="Academic"
          title="Marks Entry"
          detail="Log Scores"
          borderAccent="border-l-yellow-500"
          iconBg="bg-yellow-500/10"
          textAccent="text-yellow-500"
        />
        <AdminCard
          onClick={() => router.push('/admin/upload')}
          icon={<UploadCloud className="text-green-500" size={20} />}
          label="Library"
          title="PDF Vault"
          detail="Sync Notes"
          borderAccent="border-l-green-500"
          iconBg="bg-green-500/10"
          textAccent="text-green-500"
        />
        <AdminCard
          onClick={() => router.push('/admin/syllabus')}
          icon={<ListChecks className="text-red-500" size={20} />}
          label="Planning"
          title="Syllabus"
          detail="Track Progress"
          borderAccent="border-l-red-500"
          iconBg="bg-red-500/10"
          textAccent="text-red-500"
        />
        <AdminCard
          onClick={() => router.push('/admin/reports')}
          icon={<FileBarChart className="text-blue-500" size={20} />}
          label="Analysis"
          title="Report Gen"
          detail="Export PDFs"
          borderAccent="border-l-blue-500"
          iconBg="bg-blue-500/10"
          textAccent="text-blue-500"
        />
      </div>

    </div>
  );
}

/* ── HELPER COMPONENTS ── */

function SectionLabel({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3 ml-1">
      <span className="text-zinc-500">{icon}</span>
      <span className="text-[9px] font-black text-zinc-500 uppercase tracking-[4px]">{label}</span>
      <div className="flex-1 h-[1px] bg-[var(--border)] ml-1" />
    </div>
  );
}

function StatChip({
  icon, label, value, bg
}: { icon: React.ReactNode; label: string; value: string; bg: string }) {
  return (
    <div className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl border ${bg} shrink-0`}>
      {icon}
      <div>
        <p className="text-[7px] font-black uppercase tracking-[3px] text-zinc-500 leading-none">{label}</p>
        <p className="text-xs font-black text-[var(--text)] leading-tight mt-0.5">{value}</p>
      </div>
    </div>
  );
}

function AdminCard({
  onClick, icon, label, title, detail,
  borderAccent, iconBg, textAccent, featured = false
}: AdminCardProps) {
  return (
    <div
      onClick={onClick}
      className={`
        ${featured ? 'p-5' : 'p-4'}
        bg-[var(--card)]/80 backdrop-blur-xl
        border border-[var(--border)] border-l-4 ${borderAccent}
        rounded-[26px] active:scale-95 transition-all cursor-pointer
        shadow-[0_4px_12px_rgba(0,0,0,0.04)]
        hover:shadow-md relative overflow-hidden group
      `}
    >
      {/* subtle corner shine */}
      <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-white/5 to-transparent rounded-bl-full pointer-events-none" />

      <div className={`mb-3 w-10 h-10 rounded-2xl flex items-center justify-center ${iconBg} border border-[var(--border)] group-hover:scale-110 transition-transform duration-200`}>
        {icon}
      </div>

      <p className="text-[7px] font-black uppercase text-zinc-500 tracking-[3px] leading-none mb-1">{label}</p>
      <p className="text-sm font-black text-[var(--text)] italic uppercase tracking-tight leading-tight">{title}</p>

      <div className="flex items-center justify-between mt-2">
        <p className={`text-[7px] font-bold uppercase tracking-widest ${textAccent}`}>{detail}</p>
        <ChevronRight size={10} className="text-zinc-500 group-hover:translate-x-0.5 transition-transform" />
      </div>
    </div>
  );
}
