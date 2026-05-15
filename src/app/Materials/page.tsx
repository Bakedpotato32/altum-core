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
        router.replace('/login');
        return;
      }

      // Fetch student's class to bypass the selection screen
      const { data } = await supabase
        .from('students')
        .select('class')
        .eq('id', activeId)
        .single();

      if (data?.class) {
        // USING REPLACE INSTEAD OF PUSH KEEPS THE HISTORY STACK CLEAN
        router.replace(`/Materials/${data.class}`);
      } else {
        router.replace('/dashboard');
      }
    }

    performRedirect();
  }, [router]);

  return (
    <div style={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)' }}>
      <div style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid rgba(59,130,246,0.15)' }} className="animate-ping" />
        <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
          <Loader2 className="animate-spin" size={24} style={{ color: '#3b82f6' }} />
        </div>
      </div>
    </div>
  );
}
