'use client';
import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck, Bell, Save, LogOut, Calendar as CalendarIcon,
  Trophy, UserPlus, UploadCloud, ListChecks, Users, IndianRupee,
  Sparkles, Settings2, BookMarked, Loader2, GraduationCap, ChevronRight,
  FileBarChart, Sunrise, Sunset, Moon, Activity, Gamepad2,
  Search, RefreshCcw, ShieldAlert, MessagesSquare
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
  pulse?: boolean;
};

// --- COMPONENT: PERMANENT DEVICE SECURITY GATE ---
function DeviceSecurityGate() {
  const [requests, setRequests] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('students')
      .select('id, name, class, device_id, pending_device_id, device_status')
      .order('device_status', { ascending: false }); 
    
    if (data) setRequests(data);
    setLoading(false);
  };

  useEffect(() => { fetchRequests(); }, []);

  const approveDevice = async (studentId: string, newDeviceId: string) => {
    setActionId(studentId);
    const { error } = await supabase.from('students').update({ 
      device_id: newDeviceId, device_status: 'verified', pending_device_id: null 
    }).eq('id', studentId);
    if (!error) fetchRequests();
    setActionId(null);
  };

  const blockStudent = async (studentId: string) => {
    setActionId(studentId);
    await supabase.from('students').update({ device_status: 'blocked' }).eq('id', studentId);
    fetchRequests();
    setActionId(null);
  };

  const filtered = requests.filter(r => 
    (r.device_status !== 'verified' || searchQuery !== '') && 
    r.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="mb-8 animate-fade-up" style={{ animationDelay: '150ms' }}>
      <div className="bg-card border border-border rounded-[2rem] p-5 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-orange-500/10 rounded-xl border border-orange-500/20">
              <ShieldCheck className="text-orange-500" size={18} />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-[2px] text-text">Security Gate</h3>
              <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-tighter">Device Binding Control</p>
            </div>
          </div>
          <button onClick={fetchRequests} className="p-2 hover:bg-zinc-500/10 rounded-xl transition-colors">
            <RefreshCcw size={14} className={loading ? 'animate-spin text-orange-500' : 'text-zinc-400'} />
          </button>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={12} />
          <input 
            type="text" placeholder="Search student device..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-background border border-border rounded-2xl py-2.5 pl-10 pr-4 text-[10px] font-bold uppercase outline-none focus:border-orange-500 transition-colors"
          />
        </div>

        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
          {loading ? (
             <div className="flex justify-center py-6"><Loader2 size={20} className="animate-spin text-orange-500" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-border rounded-[1.5rem]">
              <p className="text-[10px] font-black text-zinc-400 uppercase italic">All Systems Secure</p>
            </div>
          ) : (
            filtered.map((student) => (
              <div key={student.id} className="p-4 rounded-[1.5rem] bg-background border border-border flex flex-col gap-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-[11px] font-black italic uppercase text-text">{student.name}</h4>
                    <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-tighter">ID: {student.id} • {student.class}</p>
                  </div>
                  <span className={`text-[7px] font-black px-2 py-0.5 rounded-md uppercase ${
                    student.device_status === 'blocked' ? 'bg-red-500 text-white' : 
                    student.device_status === 'pending' ? 'bg-orange-500 text-white animate-pulse' : 'bg-emerald-500/10 text-emerald-500'
                  }`}>
                    {student.device_status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => approveDevice(student.id, student.pending_device_id || student.device_id)} disabled={!!actionId || student.device_status === 'verified'} className="bg-emerald-500 text-white py-2 rounded-xl text-[9px] font-black uppercase active:scale-95 disabled:opacity-30">Approve</button>
                  <button onClick={() => blockStudent(student.id)} disabled={!!actionId || student.device_status === 'blocked'} className="bg-red-500 text-white py-2 rounded-xl text-[9px] font-black uppercase active:scale-95 disabled:opacity-30">Block</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// --- SHARED UI COMPONENTS ---
function SectionTitle({ icon, label }: { icon: React.ReactNode, label: string }) {
  return (
    <div className="flex items-center gap-2 mb-4 px-1">
      <div className="p-1.5 bg-zinc-500/10 rounded-lg text-zinc-500">{icon}</div>
      <h3 className="text-[10px] font-black uppercase tracking-[3px] text-zinc-500">{label}</h3>
    </div>
  );
}

function StatCard({ icon, label, value, color, iconColor, delay, pulse }: StatCardProps) {
  return (
    <div className={`${color} p-4 rounded-[2rem] animate-scale-in shadow-sm ${pulse ? 'ring-2 ring-orange-500/50' : ''}`} style={{ animationDelay: `${100 + (delay ?? 0) * 50}ms` }}>
      <div className={`${iconColor} mb-2 ${pulse ? 'animate-pulse' : ''}`}>{icon}</div>
      <p className="text-[8px] font-black uppercase tracking-wider text-zinc-500 mb-0.5">{label}</p>
      <p className="text-lg font-black italic tracking-tight text-text leading-none">{value}</p>
    </div>
  );
}

function AdminCard({ onClick, icon, label, title, detail, borderAccent, iconBg, textAccent, featured, delay }: AdminCardProps) {
  return (
    <button onClick={onClick} className={`group relative flex flex-col items-start p-5 rounded-[2rem] bg-card border border-border text-left transition-all duration-300 hover:shadow-xl hover:-translate-y-1 active:scale-95 animate-fade-up overflow-hidden ${featured ? 'col-span-1 shadow-sm' : 'shadow-sm'}`} style={{ animationDelay: `${300 + (delay ?? 0) * 50}ms` }}>
      {/* Faint Background Icon */}
      <div className={`absolute -right-4 -top-4 w-24 h-24 opacity-[0.04] dark:opacity-[0.02] ${textAccent} transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-12`}>
        {icon}
      </div>
      
      <div className={`w-12 h-12 rounded-2xl ${iconBg} ${textAccent} flex items-center justify-center mb-4 transition-all duration-300 group-hover:scale-110 group-hover:shadow-md`}>
        {icon}
      </div>
      
      <p className={`text-[8px] font-black uppercase tracking-[2px] ${textAccent} mb-1.5`}>{label}</p>
      <h3 className="text-sm font-black italic uppercase tracking-tight text-text leading-none mb-1.5">{title}</h3>
      
      <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
        <p className="text-[9px] font-bold text-zinc-500">{detail}</p>
        <ChevronRight size={10} className="text-zinc-500" />
      </div>
      
      {/* Bottom accent bar */}
      <div className={`absolute bottom-0 left-0 h-1 w-0 ${borderAccent.replace('border-', 'bg-')} transition-all duration-500 group-hover:w-full`} />
    </button>
  );
}

function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-background z-[100] flex flex-col items-center justify-center gap-4">
      <div className="w-16 h-16 relative">
        <div className="absolute inset-0 border-4 border-blue-500/10 rounded-full" />
        <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
      <p className="text-[10px] font-black uppercase tracking-[4px] text-blue-500 animate-pulse">Syncing Altum Core</p>
    </div>
  );
}

export default function AdminDashboard() {
  const [notice, setNotice] = useState("");
  const [studentCount, setStudentCount] = useState(0);
  const [pendingSecurity, setPendingSecurity] = useState(0);
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

        const { data: noticeData } = await supabase.from('config').select('value').eq('key', noticeKey).maybeSingle();
        if (noticeData) setNotice(noticeData.value);

        let query = supabase.from('students').select('*', { count: 'exact', head: true });
        if (role === 'teacher' && cleanClass !== 'all') query = query.eq('class', userClass);
        const { count } = await query;
        if (count !== null) setStudentCount(count);

        const { count: pCount } = await supabase.from('students').select('*', { count: 'exact', head: true }).eq('device_status', 'pending');
        setPendingSecurity(pCount || 0);

      } catch (err) { console.error(err); } finally { setTimeout(() => setLoading(false), 400); }
    };

    fetchAdminData();
  }, [router]);

  const handleUpdateNotice = async () => {
    setSaving(true);
    const role = localStorage.getItem('role');
    const master = isMasterAdmin(role, assignedClass);
    const noticeKey = master ? 'global_notice' : `notice_class_${sanitizeClass(assignedClass)}`;
    await supabase.from('config').upsert({ key: noticeKey, value: notice });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [notice]);

  if (loading) return <LoadingScreen />;

  return (
    <div className="min-h-svh bg-background text-text relative overflow-x-hidden selection:bg-blue-500/30">
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .animate-fade-up { animation: fadeUp 0.6s ease-out forwards; opacity: 0; }
        .animate-scale-in { animation: scaleIn 0.5s ease-out forwards; opacity: 0; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 20px; }
      `}</style>

      {/* Ambient Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue-500/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-purple-500/5 blur-[100px]" />
      </div>

      <div className="relative z-10 px-5 pt-24 pb-40 min-h-svh">
        
        {/* Header */}
        <header className="flex items-start justify-between mb-8 animate-fade-up">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-black text-lg shadow-[0_4px_20px_rgba(59,130,246,0.3)] ring-2 ring-white ring-offset-2 ring-offset-background uppercase">
              {staffName ? staffName.slice(0,2) : 'PA'}
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                {getGreetingIcon()}
                <p className="text-[10px] font-black uppercase tracking-[3px] text-zinc-500">{getGreeting()}</p>
              </div>
              <h1 className="text-2xl font-black text-text tracking-tight leading-none">{staffName ?? 'Principal'}</h1>
              <span className="mt-1.5 inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-blue-500/10 text-blue-600 border border-blue-500/20">
                {isMasterAdmin(userRole, assignedClass) ? 'Master Admin' : `Class ${assignedClass}`}
              </span>
            </div>
          </div>
          <button onClick={() => { localStorage.clear(); router.push('/login'); }} className="p-3 rounded-2xl bg-card border border-border text-zinc-500 hover:text-red-500 hover:bg-red-500/5 transition-colors shadow-sm"><LogOut size={18} /></button>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <StatCard icon={<GraduationCap size={18} />} label="Students" value={String(studentCount)} color="bg-card border border-border" iconColor="text-purple-500" delay={0} />
          <StatCard icon={<ShieldCheck size={18} />} label="Security" value={pendingSecurity > 0 ? `${pendingSecurity} Alert` : 'Secure'} color="bg-card border border-border" iconColor={pendingSecurity > 0 ? "text-orange-500" : "text-blue-500"} delay={1} pulse={pendingSecurity > 0} />
          <StatCard icon={<Activity size={18} />} label="Status" value="Live" color="bg-card border border-border" iconColor="text-emerald-500" delay={2} />
        </div>

        {/* --- SECURITY GATE --- */}
        {isMasterAdmin(userRole, assignedClass) && <DeviceSecurityGate />}

        {/* Notice Board */}
        <div className="mb-8 animate-fade-up" style={{ animationDelay: '200ms' }}>
          <div className="bg-card rounded-[2rem] p-5 border border-border shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-500/10 rounded-xl border border-blue-500/20">
                  <Bell className="text-blue-500" size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-[3px] text-text">Global Broadcast</h3>
                  <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-tighter">Visible to all students</p>
                </div>
              </div>
              <span className="text-[9px] font-bold text-zinc-500 bg-background px-2 py-1 rounded-md border border-border">
                {notice.length}/300
              </span>
            </div>
            
            <textarea 
              ref={textareaRef}
              value={notice} 
              onChange={(e) => setNotice(e.target.value.slice(0, 300))} 
              rows={3} 
              className="w-full bg-background border border-border rounded-2xl p-4 text-sm font-semibold outline-none focus:border-blue-500 transition-colors mb-4 resize-none" 
              placeholder="Write notice..." 
            />
            
            <button 
              onClick={handleUpdateNotice} 
              disabled={saving} 
              className={`w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-[3px] transition-all active:scale-[0.98] ${saved ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'}`}
            >
              {saved ? <><Sparkles size={14} /> Board Updated</> : saving ? <><Loader2 size={14} className="animate-spin" /> Syncing...</> : <><Save size={14} /> Update Board</>}
            </button>
          </div>
        </div>

        {/* System Config */}
        {isMasterAdmin(userRole, assignedClass) && (
          <section className="mb-8 animate-fade-up" style={{ animationDelay: '300ms' }}>
            <SectionTitle icon={<Settings2 size={13} />} label="System Config" />
            <div className="grid grid-cols-2 gap-3">
              <AdminCard onClick={() => router.push('/admin/classes')} icon={<ShieldCheck size={22} />} label="Structure" title="Class Config" detail="Add / Remove" borderAccent="border-indigo-500" iconBg="bg-indigo-500/10" textAccent="text-indigo-500" delay={0} />
              <AdminCard onClick={() => router.push('/admin/subjects')} icon={<BookMarked size={22} />} label="Curriculum" title="Subject Config" detail="Manage" borderAccent="border-rose-500" iconBg="bg-rose-500/10" textAccent="text-rose-500" delay={1} />
            </div>
          </section>
        )}

        {/* Finance & Staff */}
        {isMasterAdmin(userRole, assignedClass) && (
          <section className="mb-8 animate-fade-up" style={{ animationDelay: '400ms' }}>
            <SectionTitle icon={<IndianRupee size={13} />} label="Finance & HR" />
            <div className="grid grid-cols-2 gap-3">
              <AdminCard onClick={() => router.push('/admin/fees')} icon={<IndianRupee size={22} />} label="Finance" title="Fee Ledger" detail="Collect & Setup" borderAccent="border-emerald-500" iconBg="bg-emerald-500/10" textAccent="text-emerald-500" delay={0} />
              <AdminCard onClick={() => router.push('/admin/staff')} icon={<Users size={22} />} label="Management" title="Staff Hub" detail="Teachers" borderAccent="border-cyan-500" iconBg="bg-cyan-500/10" textAccent="text-cyan-500" delay={1} />
            </div>
          </section>
        )}

        {/* Core Modules */}
        <section className="mb-8 animate-fade-up" style={{ animationDelay: '500ms' }}>
          <SectionTitle icon={<ListChecks size={13} />} label="Core Modules" />
          <div className="grid grid-cols-2 gap-3">
            <AdminCard onClick={() => router.push('/admin/ledger')} icon={<UserPlus size={22} />} label="Enrollment" title="Ledger" detail={`${studentCount} Active`} borderAccent="border-purple-500" iconBg="bg-purple-500/10" textAccent="text-purple-500" delay={0} />
            <AdminCard onClick={() => router.push('/admin/attendance')} icon={<CalendarIcon size={22} />} label="Attendance" title="Roll Call" detail="Cloud Synced" borderAccent="border-blue-500" iconBg="bg-blue-500/10" textAccent="text-blue-500" delay={1} />
            <AdminCard onClick={() => router.push('/admin/marks')} icon={<Trophy size={22} />} label="Academic" title="Marks Entry" detail="Log Scores" borderAccent="border-yellow-500" iconBg="bg-yellow-500/10" textAccent="text-yellow-500" delay={2} />
            <AdminCard onClick={() => router.push('/admin/upload')} icon={<UploadCloud size={22} />} label="Library" title="PDF Vault" detail="Sync Notes" borderAccent="border-green-500" iconBg="bg-green-500/10" textAccent="text-green-500" delay={3} />
            <AdminCard onClick={() => router.push('/admin/syllabus')} icon={<ListChecks size={22} />} label="Planning" title="Syllabus" detail="Track" borderAccent="border-red-500" iconBg="bg-red-500/10" textAccent="text-red-500" delay={4} />
            <AdminCard onClick={() => router.push('/admin/reports')} icon={<FileBarChart size={22} />} label="Analysis" title="Report Gen" detail="Export PDFs" borderAccent="border-blue-500" iconBg="bg-blue-500/10" textAccent="text-blue-500" delay={5} />
          </div>
        </section>

        {/* Campus & Social */}
        {isMasterAdmin(userRole, assignedClass) && (
          <section className="animate-fade-up" style={{ animationDelay: '600ms' }}>
            <SectionTitle icon={<MessagesSquare size={13} />} label="Campus & Social" />
            <div className="grid grid-cols-2 gap-3">
              <AdminCard onClick={() => router.push('/admin/chat-mod')} icon={<ShieldAlert size={22} />} label="Moderation" title="Global Hub" detail="Manage Access" borderAccent="border-red-500" iconBg="bg-red-500/10" textAccent="text-red-500" delay={0} />
              
              {/* FIXED ARCADE DB BUTTON */}
              <AdminCard 
                onClick={() => router.push('/admin/arcade')} 
                icon={<Trophy size={22} />} 
                label="Entertainment" 
                title="Arcade DB" 
                detail="Leaderboards" 
                borderAccent="border-orange-500" 
                iconBg="bg-orange-500/10" 
                textAccent="text-orange-500" 
                delay={1} 
              />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
