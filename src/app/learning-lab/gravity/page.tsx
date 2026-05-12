'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import GravityScale from '@/components/GravityScale';

export default function GravityPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen p-5 pt-24 pb-32 bg-background">
      
      {/* Back Button */}
      <button 
        onClick={() => router.push('/learning-lab')}
        className="w-10 h-10 mb-6 rounded-2xl bg-card border border-border flex items-center justify-center shadow-sm active:scale-95 transition-transform"
      >
        <ChevronLeft className="w-6 h-6 text-text" />
      </button>

      {/* The Simulation Component */}
      <GravityScale />

    </div>
  );
}
