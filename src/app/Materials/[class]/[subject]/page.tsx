'use client';
import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function PDFVault() {
  const { class: className, subject } = useParams();

  // This is a placeholder for your actual PDF list later
  const pdfs = [
    { title: "Chapter 01: The Basics", size: "2.4 MB", date: "May 1" },
    { title: "Chapter 02: Advanced Concepts", size: "1.8 MB", date: "May 5" }
  ];

  return (
    <main className="h-screen bg-[#050505] text-white p-6 relative overflow-hidden">
      <Link href={`/Materials/${className}`} className="text-zinc-500 text-sm font-bold uppercase tracking-widest mb-8 block">← Back to {className}</Link>
      <h1 className="text-3xl font-black italic uppercase tracking-tighter mb-10 capitalize">{subject} Vault</h1>

      <div className="space-y-4">
        {pdfs.map((pdf, i) => (
          <div key={i} className="p-5 rounded-[24px] bg-white/5 border border-white/10 backdrop-blur-xl flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-2xl text-red-500">📄</span>
              <div>
                <h4 className="text-sm font-bold">{pdf.title}</h4>
                <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest mt-1">{pdf.size} • {pdf.date}</p>
              </div>
            </div>
            <button className="w-10 h-10 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
              ⬇️
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}
