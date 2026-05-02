'use client';
import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function SubjectSelection() {
  const { class: className } = useParams();

  return (
    <main className="h-screen bg-[#050505] text-white p-6 relative overflow-hidden">
       <Link href="/Materials" className="text-zinc-500 text-sm font-bold uppercase tracking-widest mb-8 block">← Back to Hub</Link>
       <h1 className="text-3xl font-black italic uppercase tracking-tighter mb-2 underline decoration-blue-500 decoration-4 underline-offset-8">Class {className}</h1>
       <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-10">Choose Subject</p>

       <Link href={`/Materials/${className}/english`}>
         <div className="p-6 rounded-[28px] bg-white/5 border border-white/10 flex items-center justify-between active:scale-95 transition-all">
           <div className="flex items-center gap-5">
             <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center text-2xl">📖</div>
             <div>
               <h3 className="font-bold text-lg italic">English</h3>
               <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Core Curriculum</p>
             </div>
           </div>
           <span className="text-blue-500">→</span>
         </div>
       </Link>
    </main>
  );
}
