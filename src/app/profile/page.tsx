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
    <div className="px-6 pt-28 pb-32 flex flex-col items-center bg-transparent min-h-screen">
      <input type="file" className="hidden" ref={fileInputRef} accept="image/*" onChange={handleImageUpload} />

      <div className="relative mb-8 mt-4">
        <div className="absolute inset-0 bg-blue-500/10 blur-3xl rounded-full" />
        <div className="relative w-32 h-32 bg-[var(--card)] border border-[var(--border)] rounded-[45px] flex items-center justify-center shadow-xl overflow-hidden">
          {uploading ? (
            <Loader2 className="text-blue-500 animate-spin" size={32} />
          ) : student?.avatar_url ? (
            <img src={student.avatar_url} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <User size={54} className="text-blue-500" />
          )}
        </div>
        <button onClick={() => fileInputRef.current?.click()} className="absolute bottom-1 right-1 p-3 bg-blue-600 rounded-2xl border-4 border-[var(--background)] shadow-xl active:scale-90 transition-all">
          <Camera size={16} className="text-white" />
        </button>
      </div>

      <div className="text-center mb-12">
        <h2 className="text-3xl font-black italic uppercase tracking-tighter text-[var(--text)] leading-none mb-2">{student?.name || "..."}</h2>
        <div className="inline-block px-4 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full">
           <p className="text-blue-500 text-[9px] font-black uppercase tracking-[3px]">{t('nodeId')}: {student?.id || "..."}</p>
        </div>
      </div>

      <div className="w-full space-y-4">
        <ProfileCard href="/profile/attendance" icon={<CalIcon size={20} className="text-orange-500" />} title={t('attendance')} subtitle={t('consistencyPulse')} />
        <ProfileCard href="/profile/performance" icon={<BarChart3 size={20} className="text-blue-500" />} title={t('performance')} subtitle={t('academicLedger')} />
      </div>
    </div>
  );
}

function ProfileCard({ href, icon, title, subtitle }: any) {
  return (
    <Link href={href} className="block group active:scale-[0.98] transition-all">
      <div className="p-5 bg-[var(--card)] border border-[var(--border)] rounded-[32px] flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-5">
          <div className="w-12 h-12 bg-zinc-500/5 rounded-2xl flex items-center justify-center border border-[var(--border)]">{icon}</div>
          <div>
            <h4 className="text-sm font-black uppercase tracking-tight text-[var(--text)]">{title}</h4>
            <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest leading-none">{subtitle}</p>
          </div>
        </div>
        <ChevronRight size={18} className="text-zinc-400 group-hover:translate-x-1 transition-transform" />
      </div>
    </Link>
  );
}
