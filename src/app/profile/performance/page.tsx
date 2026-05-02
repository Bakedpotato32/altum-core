'use client';
import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Award, BookOpen, Target, ChevronRight } from 'lucide-react';

export default function PerformanceLedger() {
  // ADMIN DATA: In the future, this comes from your database
  const [studentMarks] = useState({
    english: { test: 19, mid: 99, final: 0, total: 100 },
    science: { test: 19, mid: 99, final: 0, total: 100 },
    maths: { test: 19, mid: 99, final: 0, total: 100 },
  });

  // AUTO-CALCULATION LOGIC
  const performance = useMemo(() => {
    const subjects = Object.values(studentMarks);
    const totalObtained = subjects.reduce((acc, s) => acc + s.test + (s.mid * 0.8), 0); 
    const totalPossible = subjects.length * 100;
    const rating = Math.round((totalObtained / totalPossible) * 100);
    
    return { rating, totalObtained };
  }, [studentMarks]);

  return (
    <div className="px-6 pt-28 pb-32">
      {/* Hero Core Rating Card */}
      <div className="relative mb-8 p-8 bg-gradient-to-br from-blue-600 to-indigo-900 rounded-[40px] overflow-hidden shadow-[0_20px_50px_rgba(59,130,246,0.3)]">
        <div className="absolute top-[-10%] right-[-10%] w-32 h-32 bg-white/10 blur-3xl rounded-full" />
        <TrendingUp className="absolute right-6 top-6 text-white/20" size={60} />
        
        <p className="text-[10px] font-black uppercase tracking-[4px] text-blue-100 mb-2 opacity-80">Overall Performance</p>
        <div className="flex items-baseline gap-2">
          <h2 className="text-6xl font-black italic text-white leading-none">{performance.rating}</h2>
          <span className="text-xl font-bold text-blue-200">/100</span>
        </div>
        <p className="text-xs font-bold text-blue-100 mt-4">Current Core Rating</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white/[0.03] border border-white/10 p-5 rounded-[30px] backdrop-blur-md">
          <Award size={18} className="text-orange-400 mb-3" />
          <h5 className="text-sm font-black text-white uppercase tracking-wider">Rank #1</h5>
          <p className="text-[9px] font-bold text-zinc-500 uppercase">In Class 10th</p>
        </div>
        <div className="bg-white/[0.03] border border-white/10 p-5 rounded-[30px] backdrop-blur-md">
          <Target size={18} className="text-green-400 mb-3" />
          <h5 className="text-sm font-black text-white uppercase tracking-wider">Top 1%</h5>
          <p className="text-[9px] font-bold text-zinc-500 uppercase">Attendance link</p>
        </div>
      </div>

      <h3 className="text-[10px] font-black uppercase tracking-[4px] text-zinc-500 mb-6 px-2">Subject Ledger</h3>

      {/* Subject Cards */}
      <div className="space-y-4">
        <SubjectRow name="English" marks={studentMarks.english} color="bg-blue-500" />
        <SubjectRow name="Science" marks={studentMarks.science} color="bg-purple-500" />
        <SubjectRow name="Mathematics" marks={studentMarks.maths} color="bg-green-500" />
      </div>

      {/* Motivational Footer */}
      <div className="mt-10 p-6 bg-white/[0.02] border border-white/5 rounded-[32px] flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 rounded-2xl">
            <BookOpen size={20} className="text-blue-500" />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase text-zinc-200">Exam Roadmap</h4>
            <p className="text-[9px] font-bold text-zinc-500 uppercase">Finals start in 45 days</p>
          </div>
        </div>
        <ChevronRight size={18} className="text-zinc-700" />
      </div>
    </div>
  );
}

function SubjectRow({ name, marks, color }: any) {
  const percentage = Math.round(((marks.test + marks.mid) / (marks.total + 20)) * 100);

  return (
    <motion.div 
      whileTap={{ scale: 0.98 }}
      className="p-6 bg-white/[0.03] border border-white/10 rounded-[32px] backdrop-blur-xl"
    >
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-sm font-black italic uppercase text-white tracking-widest">{name}</h4>
        <span className="text-xs font-black text-zinc-400">{percentage}%</span>
      </div>
      
      {/* Progress Bar */}
      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden mb-4">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className={`h-full ${color} shadow-[0_0_10px_rgba(59,130,246,0.5)]`}
        />
      </div>

      <div className="flex gap-6">
        <MarkMini label="Tests" val={marks.test} total={20} />
        <MarkMini label="Mid-Term" val={marks.mid} total={100} />
      </div>
    </motion.div>
  );
}

function MarkMini({ label, val, total }: any) {
  return (
    <div>
      <p className="text-[8px] font-black uppercase text-zinc-600 tracking-widest mb-1">{label}</p>
      <p className="text-xs font-bold text-zinc-300">{val}<span className="text-[10px] text-zinc-600">/{total}</span></p>
    </div>
  );
}
