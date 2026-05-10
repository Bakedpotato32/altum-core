'use client';
import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck, Bell, Save, LogOut, Calendar as CalendarIcon,
  Trophy, UserPlus, UploadCloud, ListChecks, Users, IndianRupee,
  Sparkles, Settings2, BookMarked, Loader2, GraduationCap, ChevronRight,
  FileBarChart, Sunrise, Sunset, Moon, Activity
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
  delay?: number;
};

type StatCardProps = {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  iconColor: string;
  delay?: number;
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  const getGreetingIcon = () => {
    const hour = new Date().getHours();
    if (hour < 12) return <Sunrise size={14} className="text-amber-500" />;
    if (hour < 17) return <Sunset size={14} className="text-orange-500" />;
    return <Moon size={14} className="text-indigo-500" />;
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
        setTimeout(() => setLoading(false), 400);
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
      setTimeout(() => setSaved(false), 3000);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push('/login');
  };

  const master = isMasterAdmin(userRole, assignedClass);
  const initials = staffName
    ? staffName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : master ? 'PA' : 'T';

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [notice]);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-svh bg-background text-text relative overflow-x-hidden selection:bg-blue-500/30">
      {/* Global Animations */}
      <style>{`
        @keyframes mesh {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes success-pop {
          0% { transform: scale(0.8); opacity: 0; }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }
        .mesh-blob {
          animation: mesh 20s ease-in-out infinite;
        }
        .animate-fade-up {
          animation: fadeUp 0.6s ease-out forwards;
          opacity: 0;
        }
        .animate-scale-in {
          animation: scaleIn 0.5s ease-out forwards;
          opacity: 0;
        }
        .skeleton {
          background: linear-gradient(90deg, rgba(0,0,0,0.03) 25%, rgba(0,0,0,0.06) 50%, rgba(0,0,0,0.03) 75%);
          background-size: 1000px 100%;
          animation: shimmer 2s infinite;
        }
        .card-shine {
          position: relative;
          overflow: hidden;
        }
        .card-shine::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(0,0,0,0.03), transparent);
          transition: left 0.7s;
        }
        .card-shine:hover::before {
          left: 100%;
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* Ambient Background - Light Theme */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue-400/10 blur-[120px] mesh-blob" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-purple-400/10 blur-[100px] mesh-blob" style={{ animationDelay: '-5s' }} />
        <div className="absolute top-[40%] right-[20%] w-[300px] h-[300px] rounded-full bg-emerald-400/8 blur-[80px] mesh-blob" style={{ animationDelay: '-10s' }} />
      </div>

      <div className="relative z-10 px-5 pt-14 pb-40 min-h-svh">
        
        {/* Header */}
        <header className="flex items-start justify-between mb-8 animate-fade-up" style={{ animationDelay: '0ms' }}>
          <div className="flex items-center gap-4">
            {/* Avatar — Fixed with visible border, shadow, and depth */}
            <div className="relative group">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-black text-lg shadow-[0_4px_20px_rgba(59,130,246,0.3)] ring-2 ring-white ring-offset-2 ring-offset-background transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_6px_28px_rgba(59,130,246,0.4)]">
                {initials}
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-background rounded-full flex items-center justify-center ring-2 ring-white">
                <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                {getGreetingIcon()}
                <p className="text-[10px] font-black uppercase tracking-[3px] text-zinc-500">{getGreeting()}</p>
              </div>
              <h1 className="text-2xl font-black text-text tracking-tight leading-none">
                {staffName ?? (master ? 'Principal' : 'Teacher')}
              </h1>
              <div className="flex items-center gap-2 mt-1.5">
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                  master 
                    ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20' 
                    : 'bg-purple-500/10 text-purple-600 border border-purple-500/20'
                }`}>
                  {master ? 'Master Admin' : `Class ${assignedClass}`}
                </span>
                <span className="text-[9px] text-zinc-500 font-medium">· Altum Core</span>
              </div>
            </div>
          </div>
          
          <button
            onClick={handleLogout}
            className="group p-3 rounded-2xl bg-card border border-border text-zinc-500 transition-all duration-300 hover:text-red-500 hover:border-red-500/30 hover:bg-red-500/5 hover:shadow-lg active:scale-90"
          >
            <LogOut size={18} className="transition-transform group-hover:rotate-180 duration-500" />
          </button>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 mb-8 animate-fade-up" style={{ animationDelay: '100ms' }}>
          <StatCard
            icon={<GraduationCap size={18} />}
            label="Students"
            value={String(studentCount)}
            color="bg-purple-500/10 border-purple-500/20"
            iconColor="text-purple-500"
            delay={0}
          />
          <StatCard
            icon={<ShieldCheck size={18} />}
            label="Access"
            value={master ? 'Full' : 'Limited'}
            color="bg-blue-500/10 border-blue-500/20"
            iconColor="text-blue-500"
            delay={1}
          />
          {!master && (
            <StatCard
              icon={<Users size={18} />}
              label="Class"
              value={assignedClass ?? '—'}
              color="bg-cyan-500/10 border-cyan-500/20"
              iconColor="text-cyan-500"
              delay={2}
            />
          )}
          {master && (
            <StatCard
              icon={<Activity size={18} />}
              label="Status"
              value="Active"
              color="bg-emerald-500/10 border-emerald-500/20"
              iconColor="text-emerald-500"
              delay={2}
            />
          )}
        </div>

        {/* Notice Board */}
        <div className="mb-8 animate-fade-up" style={{ animationDelay: '200ms' }}>
          <div className="relative bg-card/80 backdrop-blur-xl rounded-3xl p-5 overflow-hidden border border-border shadow-sm hover:shadow-md transition-shadow duration-300">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[80px] pointer-events-none" />
            
            <div className="flex items-center justify-between mb-4 relative z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20">
                  <Bell className="text-blue-500" size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-[3px] text-text">
                    {master ? 'Global Broadcast' : 'Class Notice'}
                  </h3>
                  <p className="text-[9px] text-zinc-500 mt-0.5 font-medium">
                    {master ? 'Visible to all students' : `Only Class ${assignedClass}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-16 rounded-full bg-zinc-200 overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${Math.min((notice.length / 300) * 100, 100)}%` }}
                  />
                </div>
                <span className="text-[9px] font-bold text-zinc-500 tabular-nums">
                  {notice.length}/300
                </span>
              </div>
            </div>

            <div className="relative z-10 mb-4">
              <textarea
                ref={textareaRef}
                value={notice}
                onChange={(e) => setNotice(e.target.value.slice(0, 300))}
                rows={3}
                className="w-full bg-background border border-border rounded-2xl p-4 text-sm font-semibold text-text placeholder:text-zinc-500 focus:border-blue-500 focus:ring-[3px] focus:ring-blue-500/10 outline-none transition-all resize-none leading-relaxed shadow-inner"
                placeholder={master ? "Broadcast a message to all students..." : "Post a notice for your class..."}
              />
            </div>

            <button
              onClick={handleUpdateNotice}
              disabled={saving}
              className={`relative w-full py-3.5 rounded-2xl flex items-center justify-center gap-2.5 text-[11px] font-black uppercase tracking-[3px] transition-all duration-300 active:scale-[0.98] overflow-hidden disabled:opacity-60 ${
                saved
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                  : 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 hover:bg-blue-500'
              }`}
            >
              {saved ? (
                <span className="flex items-center gap-2 animate-[success-pop_0.4s_ease-out]">
                  <Sparkles size={14} /> Board Updated
                </span>
              ) : saving ? (
                <><Loader2 size={14} className="animate-spin" /> Syncing...</>
              ) : (
                <><Save size={14} /> Update Board</>
              )}
            </button>
          </div>
        </div>

        {/* System Config */}
        {master && (
          <section className="mb-8 animate-fade-up" style={{ animationDelay: '300ms' }}>
            <SectionTitle icon={<Settings2 size={13} />} label="System Config" />
            <div className="grid grid-cols-2 gap-3">
              <AdminCard
                onClick={() => router.push('/admin/classes')}
                icon={<ShieldCheck size={22} />}
                label="Structure"
                title="Class Config"
                detail="Add / Remove"
                borderAccent="border-indigo-500"
                iconBg="bg-indigo-500/10"
                textAccent="text-indigo-500"
                delay={0}
              />
              <AdminCard
                onClick={() => router.push('/admin/subjects')}
                icon={<BookMarked size={22} />}
                label="Curriculum"
                title="Subject Config"
                detail="Manage"
                borderAccent="border-rose-500"
                iconBg="bg-rose-500/10"
                textAccent="text-rose-500"
                delay={1}
              />
            </div>
          </section>
        )}

        {/* Finance & Staff */}
        {master && (
          <section className="mb-8 animate-fade-up" style={{ animationDelay: '400ms' }}>
            <SectionTitle icon={<IndianRupee size={13} />} label="Finance & HR" />
            <div className="grid grid-cols-2 gap-3">
              <AdminCard
                onClick={() => router.push('/admin/fees')}
                icon={<IndianRupee size={22} />}
                label="Finance"
                title="Fee Ledger"
                detail="Collect & Setup"
                borderAccent="border-emerald-500"
                iconBg="bg-emerald-500/10"
                textAccent="text-emerald-500"
                featured
                delay={0}
              />
              <AdminCard
                onClick={() => router.push('/admin/staff')}
                icon={<Users size={22} />}
                label="Management"
                title="Staff Hub"
                detail="Teachers"
                borderAccent="border-cyan-500"
                iconBg="bg-cyan-500/10"
                textAccent="text-cyan-500"
                featured
                delay={1}
              />
            </div>
          </section>
        )}

        {/* Core Modules */}
        <section className="animate-fade-up" style={{ animationDelay: '500ms' }}>
          <SectionTitle icon={<ListChecks size={13} />} label="Core Modules" />
          <div className="grid grid-cols-2 gap-3">
            <AdminCard
              onClick={() => router.push('/admin/ledger')}
              icon={<UserPlus size={22} />}
              label="Enrollment"
              title="Ledger"
              detail={`${studentCount} Active`}
              borderAccent="border-purple-500"
              iconBg="bg-purple-500/10"
              textAccent="text-purple-500"
              delay={0}
            />
            <AdminCard
              onClick={() => router.push('/admin/attendance')}
              icon={<CalendarIcon size={22} />}
              label="Attendance"
              title="Roll Call"
              detail="Cloud Synced"
              borderAccent="border-blue-500"
              iconBg="bg-blue-500/10"
              textAccent="text-blue-500"
              delay={1}
            />
            <AdminCard
              onClick={() => router.push('/admin/marks')}
              icon={<Trophy size={22} />}
              label="Academic"
              title="Marks Entry"
              detail="Log Scores"
              borderAccent="border-yellow-500"
              iconBg="bg-yellow-500/10"
              textAccent="text-yellow-500"
              delay={2}
            />
            <AdminCard
              onClick={() => router.push('/admin/upload')}
              icon={<UploadCloud size={22} />}
              label="Library"
              title="PDF Vault"
              detail="Sync Notes"
              borderAccent="border-green-500"
              iconBg="bg-green-500/10"
              textAccent="text-green-500"
              delay={3}
            />
            <AdminCard
              onClick={() => router.push('/admin/syllabus')}
              icon={<ListChecks size={22} />}
              label="Planning"
              title="Syllabus"
              detail="Track"
              borderAccent="border-red-500"
              iconBg="bg-red-500/10"
              textAccent="text-red-500"
              delay={4}
            />
            <AdminCard
              onClick={() => router.push('/admin/reports')}
              icon={<FileBarChart size={22} />}
              label="Analysis"
              title="Report Gen"
              detail="Export PDFs"
              borderAccent="border-blue-500"
              iconBg="bg-blue-500/10"
              textAccent="text-blue-500"
              delay={5}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

/* ==================== SUB COMPONENTS ==================== */

function SectionTitle({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-4 ml-1">
      <span className="text-zinc-500">{icon}</span>
      <span className="text-[9px] font-black text-zinc-500 uppercase tracking-[4px]">{label}</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

function StatCard({ icon, label, value, color, iconColor, delay = 0 }: StatCardProps) {
  return (
    <div 
      className={`group relative p-4 rounded-3xl border ${color} transition-all duration-300 hover:-translate-y-1 hover:shadow-md active:scale-95 cursor-default overflow-hidden animate-fade-up`}
      style={{ animationDelay: `${delay * 100}ms` }}
    >
      <div className="relative z-10">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${iconColor} bg-white/60 shadow-sm`}>
          {icon}
        </div>
        <p className="text-[8px] font-black text-zinc-500 uppercase tracking-[2px] mb-1.5">{label}</p>
        <p className="text-xl font-black text-text tracking-tight">{value}</p>
      </div>
    </div>
  );
}

function AdminCard({
  onClick, icon, label, title, detail,
  borderAccent, iconBg, textAccent, featured = false, delay = 0
}: AdminCardProps) {
  return (
    <div
      onClick={onClick}
      className={`
        ${featured ? 'p-5' : 'p-4'}
        group relative bg-card/80 backdrop-blur-md
        border border-border border-l-[3px] ${borderAccent.replace('border-l-', 'border-')}
        rounded-2xl cursor-pointer
        transition-all duration-500 ease-out
        hover:bg-card hover:shadow-lg hover:-translate-y-1.5
        active:scale-[0.97]
        card-shine
        animate-fade-up
      `}
      style={{ animationDelay: `${delay * 80}ms` }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`${iconBg} p-2.5 rounded-xl border border-border transition-all duration-500 group-hover:scale-110 group-hover:shadow-md`}>
          <div className={textAccent}>{icon}</div>
        </div>
        {featured && (
          <div className="px-1.5 py-0.5 rounded-md bg-border/50 border border-border">
            <Sparkles size={10} className="text-zinc-500" />
          </div>
        )}
      </div>

      <p className="text-[8px] font-black text-zinc-500 uppercase tracking-[3px] mb-1.5">{label}</p>
      <p className="text-[15px] font-black text-text italic uppercase tracking-tight leading-none mb-3">
        {title}
      </p>

      <div className="flex items-center justify-between">
        <span className={`text-[8px] font-bold uppercase tracking-[2px] ${textAccent}`}>
          {detail}
        </span>
        <div className="w-6 h-6 rounded-full bg-border/30 border border-border flex items-center justify-center group-hover:bg-border/50 transition-all duration-300">
          <ChevronRight size={12} className="text-zinc-500 group-hover:text-text transition-all duration-300 group-hover:translate-x-0.5" />
        </div>
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-svh bg-background flex flex-col items-center justify-center gap-6 p-6">
      <style>{`
        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }
        .skeleton {
          background: linear-gradient(90deg, rgba(0,0,0,0.03) 25%, rgba(0,0,0,0.06) 50%, rgba(0,0,0,0.03) 75%);
          background-size: 1000px 100%;
          animation: shimmer 2s infinite;
        }
      `}</style>
      
      <div className="w-full max-w-md space-y-6 px-5">
        {/* Header Skeleton */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl skeleton" />
          <div className="space-y-2 flex-1">
            <div className="h-3 w-20 rounded-full skeleton" />
            <div className="h-5 w-40 rounded-full skeleton" />
          </div>
        </div>

        {/* Stats Skeleton */}
        <div className="grid grid-cols-3 gap-3">
          {[1,2,3].map(i => (
            <div key={i} className="h-24 rounded-3xl skeleton" />
          ))}
        </div>

        {/* Notice Skeleton */}
        <div className="h-48 rounded-3xl skeleton" />

        {/* Cards Skeleton */}
        <div className="grid grid-cols-2 gap-3">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-32 rounded-2xl skeleton" />
          ))}
        </div>
      </div>
    </div>
  );
}
