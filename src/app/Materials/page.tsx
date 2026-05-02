'use client';
import React, { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Book, ChevronLeft, FileDown, Download, ExternalLink } from 'lucide-react';

// Wrapper to handle Next.js Suspense requirement for useSearchParams
export default function MaterialsPage() {
  return (
    <Suspense fallback={<div className="min-h-svh bg-[#050508]" />}>
      <MaterialsContent />
    </Suspense>
  );
}

function MaterialsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get current view from URL, default to 'classes'
  const view = searchParams.get('step') || 'classes';
  const selectedClass = searchParams.get('class') || '';
  const selectedSubject = searchParams.get('subject') || '';

  const classes = ["5th", "6th", "7th", "8th", "9th", "10th"];
  const subjects = ["English", "Science", "Mathematics", "Social Studies"];
  const files = [
    { id: 1, title: "Chapter 1: The Living World", type: "PDF", size: "1.2 MB" },
    { id: 2, title: "English Grammar: Tenses", type: "Note", size: "400 KB" },
  ];

  // Navigation Logic using URL
  const goToSubjects = (cls: string) => {
    router.push(`?step=subjects&class=${cls}`);
  };

  const goToFiles = (sub: string) => {
    router.push(`?step=files&class=${selectedClass}&subject=${sub}`);
  };

  const goBack = () => {
    router.back(); // Let the system handle the back action
  };

  return (
    <div className="px-6 pt-28 pb-32 min-h-svh bg-[#050508]">
      
      {/* Visual Back Button */}
      <AnimatePresence>
        {view !== 'classes' && (
          <motion.button 
            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
            onClick={goBack}
            className="flex items-center gap-2 text-blue-500 mb-6 bg-blue-500/10 px-4 py-2 rounded-xl border border-blue-500/20 active:scale-95 transition-all"
          >
            <ChevronLeft size={16} />
            <span className="text-[10px] font-black uppercase tracking-widest">Go Back</span>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {/* VIEW 1: CLASSES */}
        {view === 'classes' && (
          <motion.div key="classes" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[4px] mb-8">Materials / Library</p>
            <div className="grid grid-cols-2 gap-4">
              {classes.map((cls) => (
                <button 
                  key={cls}
                  onClick={() => goToSubjects(cls)}
                  className="p-8 bg-[#0f0f12] border border-white/10 rounded-[35px] active:scale-95 transition-all shadow-xl text-center"
                >
                  <h2 className="text-3xl font-black italic text-white">{cls}</h2>
                  <p className="text-[9px] font-bold text-zinc-600 uppercase mt-1">Standard</p>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* VIEW 2: SUBJECTS */}
        {view === 'subjects' && (
          <motion.div key="subjects" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <p className="text-[10px] font-black text-blue-500 uppercase tracking-[4px] mb-2">{selectedClass} Standard</p>
            <h2 className="text-2xl font-black italic uppercase text-white mb-8">Select Subject</h2>
            <div className="space-y-4">
              {subjects.map((sub) => (
                <button 
                  key={sub}
                  onClick={() => goToFiles(sub)}
                  className="w-full p-6 bg-[#0f0f12] border border-white/10 rounded-[32px] flex items-center justify-between shadow-lg active:scale-[0.98] transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-500/10 rounded-2xl"><Book size={20} className="text-blue-500" /></div>
                    <span className="text-sm font-black uppercase tracking-wider text-zinc-100">{sub}</span>
                  </div>
                  <ExternalLink size={16} className="text-zinc-700" />
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* VIEW 3: FILES */}
        {view === 'files' && (
          <motion.div key="files" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
            <p className="text-[10px] font-black text-blue-500 uppercase tracking-[4px] mb-2">{selectedClass} / {selectedSubject}</p>
            <h2 className="text-2xl font-black italic uppercase text-white mb-8">Study Files</h2>
            <div className="space-y-4">
              {files.map((file) => (
                <div key={file.id} className="p-5 bg-[#0f0f12] border border-white/10 rounded-[30px] flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-zinc-800/50 rounded-2xl text-zinc-400"><FileDown size={20} /></div>
                    <div>
                      <h4 className="text-xs font-black uppercase text-zinc-200">{file.title}</h4>
                      <p className="text-[9px] font-bold text-zinc-600 uppercase">{file.type} • {file.size}</p>
                    </div>
                  </div>
                  <button className="p-3 bg-blue-600 rounded-xl text-white shadow-lg active:scale-90 transition-all">
                    <Download size={18} />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
