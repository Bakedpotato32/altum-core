'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Triangle } from 'lucide-react';
import TrigSniper from '@/components/TrigSniper';

export default function TrigonometryPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen pb-32 font-sans bg-background text-text">
      {/* Ambient background orbs */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div className="absolute top-[10%] -left-[10%] w-[300px] h-[300px] rounded-full bg-emerald-500/5 blur-[80px]" />
      </div>

      {/* Header */}
      <div className="px-5 pt-16 pb-6 sticky top-0 bg-background/80 backdrop-blur-md z-50 border-b border-border">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.back()}
            className="w-10 h-10 rounded-2xl bg-card border border-border flex items-center justify-center active:scale-95 transition-transform"
          >
            <ChevronLeft className="w-6 h-6 text-text" />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Triangle className="w-3 h-3 text-emerald-500" />
              <p className="text-[10px] font-extrabold tracking-[0.22em] uppercase text-emerald-500">
                Ratio Engine
              </p>
            </div>
            <h1 className="text-2xl font-black italic uppercase tracking-[-0.02em] leading-none text-text">
              Trig-Target Sniper
            </h1>
          </div>
        </div>
      </div>

      {/* Solver Component Wrapper */}
      <div className="px-5 pt-8">
        <TrigSniper />
      </div>
    </div>
  );
}
