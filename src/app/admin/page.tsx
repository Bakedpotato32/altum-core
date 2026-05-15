'use client';
import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck, Bell, Save, LogOut, Calendar as CalendarIcon,
  Trophy, UserPlus, UploadCloud, ListChecks, Users, IndianRupee,
  Sparkles, Settings2, BookMarked, Loader2, GraduationCap, ChevronRight,
  FileBarChart, Sunrise, Sunset, Moon, Activity, ShieldAlert, MessagesSquare, UserX
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';

type AdminCardProps = {
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  gradient: string;
  watermark: string;
  delay?: number;
};

type StatCardProps = {
  icon: React.ReactNode;
  label: string;
  value: string;
  gradient: string;
  delay?: number;
  pulse?: boolean;
};

// --- SHARED UI COMPONENTS ---

function SectionTitle({ icon, label }: { icon: React.ReactNode, label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', paddingLeft: '4px', opacity: 0.7 }}>
      {React.cloneElement(icon as React.ReactElement, { color: '#64748b' })}
      <h3 style={{ margin: 0, fontSize: '12px', fontWeight: 900, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#64748b' }}>
        {label}
      </h3>
    </div>
  );
}

function StatCard({ icon, label, value, gradient, delay, pulse }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: (delay || 0) * 0.1 }}
      style={{ background: gradient, borderRadius: '24px', padding: '16px 12px', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', position: 'relative', overflow: 'hidden', color: '#fff' }}
    >
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }} className={pulse ? 'animate-pulse' : ''}>
        <div style={{ width: '36px', height: '36px', borderRadius: '12px', background: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.3)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {React.cloneElement(icon as React.ReactElement, { color: '#fff', size: 18 })}
        </div>
      </div>
      <p style={{ margin: '0 0 4px 0', fontSize: '24px', fontWeight: 900, fontStyle: 'italic', lineHeight: 1, color: '#fff' }}>
        {value}
      </p>
      <p style={{ margin: 0, fontSize: '9px', fontWeight: 900, letterSpacing: '1px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.9)' }}>
        {label}
      </p>
    </motion.div>
  );
}

// THE 1:1 CUBE CARD
function AdminCard({ onClick, icon, title, subtitle, gradient, watermark, delay }: AdminCardProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: (delay || 0) * 0.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      style={{ 
        aspectRatio: '1/1', // Forces a perfect square
        background: gradient, 
        borderRadius: '32px', 
        padding: '20px', 
        position: 'relative', 
        overflow: 'hidden', 
        cursor: 'pointer',
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'space-between',
        boxShadow: '0 12px 30px rgba(0,0,0,0.1)', 
        transition: 'transform 0.2s ease'
      }}
    >
      {/* Background Watermark */}
      <span style={{ position: 'absolute', right: '-15px', bottom: '-20px', fontSize: '100px', opacity: 0.15, pointerEvents: 'none', lineHeight: 1 }}>
        {watermark}
      </span>

      {/* Top: Icon */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 1 }}>
        <div style={{ width: '52px', height: '52px', background: 'rgba(255,255,255,0.25)', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.3)' }}>
          {React.cloneElement(icon as React.ReactElement, { color: 'white', size: 26 })}
        </div>
        <ChevronRight size={24} color="white" style={{ opacity: 0.7 }} />
      </div>

      {/* Bottom: Text */}
      <div style={{ zIndex: 1 }}>
        <h4 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: '#fff', lineHeight: 1.1 }}>
          {title}
        </h4>
        <p style={{ margin: 0, fontSize: '10px', fontWeight: 900, letterSpacing: '1px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.9)' }}>
          {subtitle}
        </p>
      </div>
    </motion.div>
  );
}

function LoadingScreen() {
  return (
    <div style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--background)' }}>
      <Loader2 className="animate-spin" color="#3b82f6" size={36} style={{ marginBottom: '16px' }} />
      <p style={{ margin: 0, fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', color: '#3b82f6' }} className="animate-pulse">Syncing Core</p>
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
    if (hour < 12) return <Sunrise size={18} color="#f59e0b" />;
    if (hour < 17) return <Sunset size={18} color="#f97316" />;
    return <Moon size={18} color="#8b5cf6" />;
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
    <div style={{ minHeight: '100svh', background: 'var(--background)', color: 'var(--text)', padding: '30px 20px 100px', maxWidth: '500px', margin: '0 auto', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
      
      {/* Ambient Orbs */}
      <div style={{ position: 'fixed', inset: 0, zIndex: -10, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '320px', height: '320px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)', filter: 'blur(60px)' }} />
      </div>

      {/* Header */}
      <motion.header initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '20px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '24px', fontWeight: 900, boxShadow: '0 8px 20px rgba(59, 130, 246, 0.3)', border: '2px solid #fff' }}>
            {staffName ? staffName.slice(0,2).toUpperCase() : 'AD'}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              {getGreetingIcon()}
              <p style={{ margin: 0, fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#64748b' }}>{getGreeting()}</p>
            </div>
            <h1 style={{ margin: '0 0 6px 0', fontSize: '26px', fontWeight: 900, fontStyle: 'italic', color: 'var(--text)', lineHeight: 1, letterSpacing: '-0.5px' }}>{staffName ?? 'Principal'}</h1>
            <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: '8px', background: '#eff6ff', border: '1px solid #bfdbfe', color: '#3b82f6', fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}>
              {isMasterAdmin(userRole, assignedClass) ? 'MASTER ADMIN' : `CLASS ${assignedClass}`}
            </span>
          </div>
        </div>
        <button 
          onClick={() => { localStorage.clear(); router.push('/login'); }} 
          style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'var(--card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', transition: 'transform 0.2s' }}
          onMouseDown={e => e.currentTarget.style.transform = 'scale(0.9)'}
          onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <LogOut size={20} />
        </button>
      </motion.header>

      {/* Stats Grid - Now Vibrant */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '32px' }}>
        <StatCard icon={<GraduationCap />} label="STUDENTS" value={String(studentCount)} gradient="linear-gradient(135deg, #a855f7, #7e22ce)" delay={0} />
        <StatCard icon={<ShieldCheck />} label="SECURITY" value={pendingSecurity > 0 ? `${pendingSecurity} ALERT` : 'SECURE'} gradient={pendingSecurity > 0 ? "linear-gradient(135deg, #f97316, #ea580c)" : "linear-gradient(135deg, #10b981, #059669)"} delay={1} pulse={pendingSecurity > 0} />
        <StatCard icon={<Activity />} label="STATUS" value="LIVE" gradient="linear-gradient(135deg, #3b82f6, #1d4ed8)" delay={2} />
      </div>

      {/* Notice Board */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} style={{ marginBottom: '36px' }}>
        <div style={{ background: 'var(--card)', borderRadius: '32px', padding: '24px', border: '1px solid var(--border)', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Bell color="#3b82f6" size={22} />
              </div>
              <div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--text)', fontStyle: 'italic' }}>Global Broadcast</h3>
                <p style={{ margin: 0, fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: '#94a3b8' }}>Visible to all students</p>
              </div>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 900, color: '#94a3b8', background: '#f8fafc', padding: '6px 10px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              {notice.length}/300
            </span>
          </div>
          
          <textarea 
            ref={textareaRef}
            value={notice} 
            onChange={(e) => setNotice(e.target.value.slice(0, 300))} 
            rows={3} 
            style={{ width: '100%', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '24px', padding: '20px', fontSize: '15px', fontWeight: 600, outline: 'none', color: 'var(--text)', resize: 'none', marginBottom: '16px', boxSizing: 'border-box' }}
            placeholder="Write notice..." 
          />
          
          <button 
            onClick={handleUpdateNotice} 
            disabled={saving} 
            style={{ width: '100%', padding: '18px', borderRadius: '22px', background: saved ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff', fontSize: '13px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', boxShadow: saved ? '0 10px 25px rgba(16,185,129,0.3)' : '0 10px 25px rgba(59,130,246,0.3)', transition: 'transform 0.2s' }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            {saved ? <><Sparkles size={18} /> Board Updated</> : saving ? <><Loader2 size={18} className="animate-spin" /> Syncing...</> : <><Save size={18} /> Update Board</>}
          </button>
        </div>
      </motion.div>

      {/* Security & Access */}
      {isMasterAdmin(userRole, assignedClass) && (
        <section style={{ marginBottom: '32px' }}>
          <SectionTitle icon={<ShieldCheck size={18} />} label="SECURITY & ACCESS" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
            <AdminCard onClick={() => router.push('/admin/security')} icon={<ShieldCheck />} title="Security" subtitle={pendingSecurity > 0 ? `${pendingSecurity} PENDING` : 'ALL SECURE'} gradient="linear-gradient(135deg, #f97316, #ea580c)" watermark="🛡️" delay={1} />
            <AdminCard onClick={() => router.push('/admin/moderation')} icon={<UserX />} title="Mod Tools" subtitle="LOCK & FREEZE" gradient="linear-gradient(135deg, #ef4444, #b91c1c)" watermark="🛑" delay={2} />
          </div>
        </section>
      )}

      {/* System Config */}
      {isMasterAdmin(userRole, assignedClass) && (
        <section style={{ marginBottom: '32px' }}>
          <SectionTitle icon={<Settings2 size={18} />} label="SYSTEM CONFIG" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
            <AdminCard onClick={() => router.push('/admin/classes')} icon={<Settings2 />} title="Classes" subtitle="ADD / REMOVE" gradient="linear-gradient(135deg, #6366f1, #4f46e5)" watermark="⚙️" delay={3} />
            <AdminCard onClick={() => router.push('/admin/subjects')} icon={<BookMarked />} title="Subjects" subtitle="MANAGE" gradient="linear-gradient(135deg, #ec4899, #be185d)" watermark="📚" delay={4} />
          </div>
        </section>
      )}

      {/* Finance & Staff */}
      {isMasterAdmin(userRole, assignedClass) && (
        <section style={{ marginBottom: '32px' }}>
          <SectionTitle icon={<IndianRupee size={18} />} label="FINANCE & HR" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
            <AdminCard onClick={() => router.push('/admin/fees')} icon={<IndianRupee />} title="Fee Ledger" subtitle="COLLECT DUES" gradient="linear-gradient(135deg, #10b981, #059669)" watermark="💸" delay={5} />
            <AdminCard onClick={() => router.push('/admin/staff')} icon={<Users />} title="Staff Hub" subtitle="MANAGEMENT" gradient="linear-gradient(135deg, #06b6d4, #0284c7)" watermark="👔" delay={6} />
          </div>
        </section>
      )}

      {/* Core Modules */}
      <section style={{ marginBottom: '32px' }}>
        <SectionTitle icon={<ListChecks size={18} />} label="CORE MODULES" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
          <AdminCard onClick={() => router.push('/admin/ledger')} icon={<UserPlus />} title="Ledger" subtitle={`${studentCount} ACTIVE`} gradient="linear-gradient(135deg, #a855f7, #7e22ce)" watermark="📖" delay={7} />
          <AdminCard onClick={() => router.push('/admin/attendance')} icon={<CalendarIcon />} title="Roll Call" subtitle="ATTENDANCE" gradient="linear-gradient(135deg, #3b82f6, #1d4ed8)" watermark="📅" delay={8} />
          <AdminCard onClick={() => router.push('/admin/marks')} icon={<Trophy />} title="Marks Entry" subtitle="LOG SCORES" gradient="linear-gradient(135deg, #eab308, #ca8a04)" watermark="🏅" delay={9} />
          <AdminCard onClick={() => router.push('/admin/upload')} icon={<UploadCloud />} title="PDF Vault" subtitle="SYNC NOTES" gradient="linear-gradient(135deg, #14b8a6, #0f766e)" watermark="☁️" delay={10} />
          <AdminCard onClick={() => router.push('/admin/syllabus')} icon={<ListChecks />} title="Syllabus" subtitle="TRACK PROGRESS" gradient="linear-gradient(135deg, #f43f5e, #e11d48)" watermark="📈" delay={11} />
          <AdminCard onClick={() => router.push('/admin/reports')} icon={<FileBarChart />} title="Report Gen" subtitle="EXPORT PDFS" gradient="linear-gradient(135deg, #0ea5e9, #0369a1)" watermark="📊" delay={12} />
        </div>
      </section>

      {/* Campus & Social */}
      {isMasterAdmin(userRole, assignedClass) && (
        <section>
          <SectionTitle icon={<MessagesSquare size={18} />} label="CAMPUS & SOCIAL" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
            <AdminCard onClick={() => router.push('/admin/chat-mod')} icon={<ShieldAlert />} title="Global Hub" subtitle="MODERATION" gradient="linear-gradient(135deg, #f43f5e, #ea580c)" watermark="💬" delay={13} />
            <AdminCard onClick={() => router.push('/admin/arcade')} icon={<Trophy />} title="Arcade DB" subtitle="LEADERBOARDS" gradient="linear-gradient(135deg, #d946ef, #9333ea)" watermark="🕹️" delay={14} />
          </div>
        </section>
      )}

    </div>
  );
}
