'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Camera, Calendar as CalIcon, BarChart3, User, ChevronRight, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/lib/LanguageContext';
import { supabase } from '@/lib/supabase';

export default function Profile() {
  const { t } = useLanguage();
  const [student, setStudent] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    const id = localStorage.getItem('studentId');
    if (!id) return;
    const fetchStudent = async () => {
      const { data } = await supabase.from('students').select('*').eq('id', id).single();
      if (data) setStudent(data);
    };
    fetchStudent();
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !student?.id) return;
    setUploading(true);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const size = Math.min(img.width, img.height);
      const startX = (img.width - size) / 2;
      const startY = (img.height - size) / 2;
      canvas.width = 400;
      canvas.height = 400;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, startX, startY, size, size, 0, 0, 400, 400);
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const fileName = `${student.id}_${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, blob, { contentType: 'image/jpeg', upsert: true });
        if (uploadError) {
          alert('Upload failed: ' + uploadError.message);
          setUploading(false);
          return;
        }
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
        const publicUrl = urlData.publicUrl;
        await supabase.from('students').update({ avatar_url: publicUrl }).eq('id', student.id);
        setStudent((prev: any) => ({ ...prev, avatar_url: publicUrl }));
        setUploading(false);
      }, 'image/jpeg', 0.8);
    };
    img.src = URL.createObjectURL(file);
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen pb-32 font-sans bg-background text-text">
      <input type="file" className="hidden" ref={fileInputRef} accept="image/*" onChange={handleImageUpload} />

      {/* Ambient orbs */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div className="absolute -top-[5%] left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-blue-500/10 blur-[60px]" />
        <div className="absolute bottom-[10%] -right-[10%] w-64 h-64 rounded-full bg-orange-500/8 blur-[60px]" />
      </div>

      <div className="flex flex-col items-center px-5 pt-32">
        {/* Avatar section */}
        <div className="relative mb-7 mt-4">
          {/* Outer glow ring */}
          <div className="absolute -inset-1.5 rounded-full bg-gradient-to-br from-blue-500/30 to-indigo-500/20 blur-xl z-0" />

          {/* Gradient border ring */}
          <div className="relative z-10 w-32 h-32 rounded-full p-[3px] bg-gradient-to-br from-blue-500 via-indigo-500 to-blue-500">
            <div className="w-full h-full rounded-full overflow-hidden bg-background flex items-center justify-center">
              {uploading ? (
                <Loader2 className="animate-spin w-8 h-8 text-blue-500" />
              ) : student?.avatar_url ? (
                <img src={student.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-5xl font-black italic text-blue-500">
                  {student?.name?.[0] || <User size={48} className="text-blue-500" />}
                </span>
              )}
            </div>
          </div>

          {/* Camera button - SOLID, no transparency */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-1 right-1 z-20 w-9 h-9 rounded-xl bg-blue-500 border-[3px] border-background flex items-center justify-center shadow-lg shadow-blue-500/40 active:scale-90 transition-transform cursor-pointer"
          >
            <Camera size={15} className="text-white" />
          </button>
        </div>

        {/* Name & ID */}
        <div className="text-center mb-10">
          <h2 className="text-4xl font-black italic uppercase tracking-[-0.03em] leading-[0.95] text-text mb-3">
            {student?.name || '...'}
          </h2>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {student?.class && (
              <div className="px-3.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20">
                <span className="text-[9px] font-black tracking-[0.2em] uppercase text-indigo-400">
                  Class {student.class}
                </span>
              </div>
            )}
            <div className="px-3.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20">
              <span className="text-[9px] font-black tracking-[0.2em] uppercase text-blue-400">
                {t('nodeId')}: {student?.id || '...'}
              </span>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent mb-7" />

        {/* Cards grid */}
        <div className="w-full flex flex-col gap-3">
          <ProfileCard
            href="/profile/attendance"
            icon={<CalIcon size={22} className="text-orange-500" />}
            iconBg="rgba(249,115,22,0.08)"
            iconBorder="rgba(249,115,22,0.2)"
            iconGlow="rgba(249,115,22,0.2)"
            accentColor="#f97316"
            title={t('attendance')}
            subtitle={t('consistencyPulse')}
            index={0}
          />
          <ProfileCard
            href="/profile/performance"
            icon={<BarChart3 size={22} className="text-blue-500" />}
            iconBg="rgba(59,130,246,0.08)"
            iconBorder="rgba(59,130,246,0.2)"
            iconGlow="rgba(59,130,246,0.2)"
            accentColor="#3b82f6"
            title={t('performance')}
            subtitle={t('academicLedger')}
            index={1}
          />
        </div>
      </div>

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function ProfileCard({ href, icon, iconBg, iconBorder, iconGlow, accentColor, title, subtitle, index }: any) {
  return (
    <Link
      href={href}
      className="group block active:scale-[0.98] transition-transform duration-150"
      style={{ animation: 'fadeSlideIn 0.35s ease both', animationDelay: `${index * 0.08}s` }}
    >
      <div className="relative rounded-2xl bg-card border border-border p-4 flex items-center justify-between gap-3.5 overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
        {/* Left accent bar */}
        <div
          className="absolute left-0 top-[20%] bottom-[20%] w-1 rounded-r-full transition-all group-hover:top-[12%] group-hover:bottom-[12%]"
          style={{ background: accentColor, boxShadow: `0 0 10px ${iconGlow}` }}
        />

        {/* Radial shimmer on hover */}
        <div
          className="absolute inset-0 pointer-events-none rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ background: `radial-gradient(ellipse at left, ${iconBg} 0%, transparent 65%)` }}
        />

        <div className="flex items-center gap-4 relative z-10 flex-1 pl-2">
          {/* Icon box */}
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
            style={{ background: iconBg, border: `1px solid ${iconBorder}`, boxShadow: `0 4px 14px ${iconGlow}` }}
          >
            {icon}
          </div>

          {/* Text */}
          <div>
            <h4 className="text-base font-black italic uppercase tracking-[-0.01em] text-text leading-tight mb-1">
              {title}
            </h4>
            <p className="text-[8px] font-black tracking-[0.2em] uppercase opacity-70" style={{ color: accentColor }}>
              {subtitle}
            </p>
          </div>
        </div>

        {/* Arrow button */}
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all group-hover:scale-110 group-hover:rotate-3"
          style={{ background: iconBg, border: `1px solid ${iconBorder}` }}
        >
          <ChevronRight size={15} style={{ color: accentColor }} />
        </div>
      </div>
    </Link>
  );
}