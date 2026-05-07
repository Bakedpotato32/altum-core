'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

export default function MaterialsRedirect() {
  const router = useRouter();

  useEffect(() => {
    const activeId = localStorage.getItem('studentId');
    
    async function performRedirect() {
      if (!activeId) {
        router.push('/login');
        return;
      }

      // Fetch student's class to bypass the selection screen
      const { data } = await supabase
        .from('students')
        .select('class')
        .eq('id', activeId)
        .single();

      if (data?.class) {
        router.push(`/Materials/${data.class}`);
      } else {
        router.push('/dashboard');
      }
    }

    performRedirect();
  }, [router]);

  return (
    <div className="h-svh flex items-center justify-center" style={{ background: '#FFFFFF' }}>
      <div style={{ position: 'relative' }}>
        {/* Subtle light pulse effect */}
        <div className="absolute inset-0 rounded-full animate-ping" style={{ border: '2px solid rgba(59,130,246,0.1)' }} />
        <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.15)' }}>
          <Loader2 className="animate-spin" size={24} style={{ color: '#3b82f6' }} />
        </div>
      </div>
    </div>
  );
}
