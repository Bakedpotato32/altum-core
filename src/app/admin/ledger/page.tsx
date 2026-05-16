'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, ChevronLeft, Trash2, Loader2, X, ShieldCheck, Plus, Lock, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

export default function StudentLedger() {
  const [students, setStudents] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClass, setSelectedClass] = useState("All");
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isMasterAdmin, setIsMasterAdmin] = useState(false);
  const router = useRouter();

  // Dynamic Classes
  const [activeClasses, setActiveClasses] = useState<string[]>([]);

  const [newName, setNewName] = useState("");
  const [newClass, setNewClass] = useState("");
  const [isEnrolling, setIsEnrolling] = useState(false);

  const sanitizeClass = (cls: string | null) => {
    if (!cls) return "";
    return cls.toLowerCase().replace(/(st|nd|rd|th|standard|class)/g, "").trim();
  };

  useEffect(() => { 
    const role = localStorage.getItem('role');
    const assigned = localStorage.getItem('assignedClass');
    setUserRole(role);

    const isMaster = role === 'principal' || sanitizeClass(assigned) === 'all';
    setIsMasterAdmin(isMaster);

    fetchActiveClasses(isMaster, assigned);
    fetchStudents(); 
  }, []);

  const fetchActiveClasses = async (isMaster: boolean, assigned: string | null) => {
    const { data } = await supabase.from('config').select('value').eq('key', 'active_classes').maybeSingle();
    if (data && data.value) {
      try {
        const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
        if (Array.isArray(parsed)) {
          setActiveClasses(parsed);
          
          if (!isMaster && assigned) {
            const match = parsed.find(c => sanitizeClass(c) === sanitizeClass(assigned)) || assigned;
            setSelectedClass(match);
            setNewClass(match);
          } else if (parsed.length > 0) {
            setNewClass(parsed[0]);
          }
        }
      } catch (e) {
        console.error("Failed to parse classes", e);
      }
    }
  };

  async function fetchStudents() {
    setLoading(true);
    const { data } = await supabase.from('students').select('*').order('name', { ascending: true });
    if (data) setStudents(data);
    setLoading(false);
  }

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newClass) return;
    setIsEnrolling(true);
    
    // 🔥 NEW RANDOM ID GENERATOR: 2 Letters + 4 Numbers
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const l1 = chars.charAt(Math.floor(Math.random() * chars.length));
    const l2 = chars.charAt(Math.floor(Math.random() * chars.length));
    const nums = Math.floor(1000 + Math.random() * 9000);
    const newID = `${l1}${l2}${nums}`; 

    const { error } = await supabase.from('students').insert([{ id: newID, name: newName.trim(), class: newClass, attendance: 0 }]);
    if (!error) { 
      setNewName(""); 
      setShowAddModal(false); 
      fetchStudents(); 
    }
    setIsEnrolling(false);
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.id.includes(searchTerm.toUpperCase());
    const cleanSelected = sanitizeClass(selectedClass);
    const matchesClass = selectedClass === 'All' || sanitizeClass(s.class) === cleanSelected;
    return matchesSearch && matchesClass;
  });

  const filterTabs = ['All', ...activeClasses];

  return (
    <div style={{ minHeight: '100svh', background: '#f8fafc', color: '#0f172a', padding: '24px 20px 120px', maxWidth: '500px', margin: '0 auto', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', fontFamily: 'system-ui, -apple-system, sans-serif', position: 'relative', overflowX: 'hidden' }}>
      
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* --- PLAYFUL ADMIN BACKGROUND --- */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '-5%', left: '-10%', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(14, 165, 233, 0.15)', filter: 'blur(80px)', transform: 'translateZ(0)', willChange: 'transform' }} />
        <div style={{ position: 'absolute', bottom: '10%', right: '-10%', width: '350px', height: '350px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.15)', filter: 'blur(100px)', transform: 'translateZ(0)', willChange: 'transform' }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', paddingTop: '10px' }}>
          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={() => router.back()}
            style={{ width: '44px', height: '44px', borderRadius: '16px', background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0f172a', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', flexShrink: 0 }}
          >
            <ChevronLeft size={24} strokeWidth={3} />
          </motion.button>
          
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
              <Users size={16} color="#0EA5E9" strokeWidth={3} />
              <p style={{ margin: 0, fontSize: '11px', fontWeight: 900, color: '#0EA5E9', letterSpacing: '1px', textTransform: 'uppercase' }}>
                Records Database
              </p>
            </div>
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', background: 'linear-gradient(135deg, #0EA5E9, #3B82F6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1.1 }}>
              Student Ledger
            </h1>
          </div>
        </div>

        {/* Enroll Button */}
        <motion.button 
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowAddModal(true)} 
          style={{ width: '100%', marginBottom: '24px', padding: '16px', background: 'linear-gradient(135deg, #0EA5E9, #2563EB)', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', cursor: 'pointer', border: 'none', boxShadow: '0 8px 25px rgba(14, 165, 233, 0.4)' }}
        >
          <Plus size={20} color="#ffffff" strokeWidth={3} />
          <span style={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', color: '#ffffff' }}>Enroll New Student</span>
        </motion.button>

        {/* Lock or Tabs */}
        {!isMasterAdmin ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '16px', marginBottom: '16px', width: 'fit-content' }}>
            <Lock size={14} color="#3b82f6" strokeWidth={2.5} />
            <span style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', color: '#3b82f6', letterSpacing: '1px' }}>Locked to Class {selectedClass}</span>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '16px', marginBottom: '8px', WebkitOverflowScrolling: 'touch' }} className="hide-scrollbar">
            {filterTabs.map(cls => {
              const isActive = selectedClass === cls;
              return (
                <motion.button
                  key={cls}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedClass(cls)}
                  style={{
                    flexShrink: 0, padding: '12px 20px', borderRadius: '20px', fontSize: '12px', fontWeight: 900, letterSpacing: '0.5px', textTransform: 'uppercase',
                    cursor: 'pointer',
                    background: isActive ? 'linear-gradient(135deg, #0EA5E9, #3B82F6)' : 'rgba(255,255,255,0.6)',
                    color: isActive ? '#ffffff' : '#64748b',
                    border: isActive ? 'none' : '1px solid rgba(255,255,255,0.8)',
                    backdropFilter: 'blur(10px)',
                    boxShadow: isActive ? '0 8px 20px rgba(14, 165, 233, 0.3)' : '0 4px 10px rgba(0,0,0,0.02)',
                  }}
                >
                  {cls === 'All' ? 'ALL CLASSES' : cls}
                </motion.button>
              );
            })}
          </div>
        )}

        {/* Glassmorphic Search Bar */}
        <div style={{ position: 'relative', marginBottom: '24px' }}>
          <div style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <Search size={20} color="#64748b" strokeWidth={2.5} />
          </div>
          <input 
            type="text" 
            placeholder="Search by name or ID..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ 
              width: '100%', background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(10px)', 
              border: '2px solid rgba(255,255,255,0.8)', borderRadius: '24px', 
              padding: '18px 18px 18px 52px', fontSize: '14px', fontWeight: 800, color: '#0f172a', 
              outline: 'none', boxShadow: '0 8px 25px rgba(0,0,0,0.04)', boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Stats Header */}
        <p style={{ margin: '0 0 16px 8px', fontSize: '10px', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '2px' }}>
          {filteredStudents.length} {filteredStudents.length === 1 ? 'RECORD' : 'RECORDS'} SHOWN
        </p>

        {/* List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: '16px' }}>
              <Loader2 className="animate-spin" size={40} color="#0EA5E9" />
              <p style={{ margin: 0, fontSize: '12px', fontWeight: 900, letterSpacing: '1px', textTransform: 'uppercase', color: '#64748b' }}>
                FETCHING LEDGER...
              </p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 24px', borderRadius: '30px', background: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(10px)', border: '2px dashed rgba(148, 163, 184, 0.3)' }}>
              <Users size={48} color="#cbd5e1" style={{ margin: '0 auto 16px' }} />
              <p style={{ margin: 0, fontSize: '14px', fontWeight: 900, letterSpacing: '1px', textTransform: 'uppercase', color: '#94a3b8' }}>
                NO STUDENTS FOUND
              </p>
            </div>
          ) : (
            <AnimatePresence>
              {filteredStudents.map((student, index) => {
                const att = parseInt(student.attendance);
                const isLowAtt = att < 75;
                const stripeGradient = isLowAtt ? 'linear-gradient(135deg, #F97316, #EA580C)' : 'linear-gradient(135deg, #10B981, #059669)';

                return (
                  <motion.div 
                    key={student.id}
                    initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }}
                    style={{ 
                      background: 'rgba(255, 255, 255, 0.65)', backdropFilter: 'blur(12px)', 
                      borderRadius: '24px', padding: '20px', position: 'relative', 
                      border: '1px solid rgba(255, 255, 255, 0.9)', 
                      boxShadow: '0 10px 30px rgba(0,0,0,0.02)',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                    }}
                  >
                    {/* Left Accent Stripe */}
                    <div style={{ position: 'absolute', left: 0, top: '24px', bottom: '24px', width: '4px', borderRadius: '0 4px 4px 0', background: stripeGradient }} />

                    <div style={{ paddingLeft: '8px', minWidth: 0 }}>
                      <h4 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.5px' }}>
                        {student.name}
                      </h4>
                      <p style={{ margin: 0, fontSize: '10px', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1.5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        ID: <span style={{ color: '#0EA5E9' }}>{student.id}</span> • CLASS {student.class}
                      </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <span style={{ fontSize: '18px', fontWeight: 900, fontStyle: 'italic', color: isLowAtt ? '#f97316' : '#10b981', lineHeight: 1 }}>
                          {student.attendance}%
                        </span>
                        <span style={{ fontSize: '8px', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>
                          ATTENDANCE
                        </span>
                      </div>
                      
                      <motion.button 
                        whileTap={{ scale: 0.8 }}
                        onClick={async () => { if(confirm("Remove this student completely?")) { await supabase.from('students').delete().eq('id', student.id); fetchStudents(); }}} 
                        style={{ width: '40px', height: '40px', background: 'rgba(254, 226, 226, 0.5)', border: '1px solid rgba(254, 202, 202, 0.8)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', cursor: 'pointer' }}
                      >
                        <Trash2 size={16} strokeWidth={2.5} />
                      </motion.button>
                    </div>

                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Enroll Modal (Glassmorphic) */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)' }}
          >
            <motion.form 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              onSubmit={handleEnroll} 
              style={{ width: '100%', maxWidth: '400px', background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255, 255, 255, 1)', borderRadius: '40px', padding: '32px', boxShadow: '0 25px 50px rgba(0,0,0,0.15)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: '#0f172a' }}>
                  Enroll <span style={{ color: '#0EA5E9' }}>New</span>
                </h2>
                <motion.button whileTap={{ scale: 0.8 }} type="button" onClick={() => setShowAddModal(false)} style={{ width: '36px', height: '36px', background: '#f1f5f9', border: 'none', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', cursor: 'pointer' }}>
                  <X size={18} strokeWidth={3} />
                </motion.button>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <input 
                  required type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="STUDENT FULL NAME" 
                  style={{ width: '100%', background: '#ffffff', border: '2px solid #e2e8f0', borderRadius: '20px', padding: '20px 24px', fontSize: '14px', fontWeight: 900, textTransform: 'uppercase', color: '#0f172a', outline: 'none', boxSizing: 'border-box' }} 
                />
                
                <div style={{ position: 'relative' }}>
                  <select 
                    disabled={!isMasterAdmin} value={newClass} onChange={(e) => setNewClass(e.target.value)} 
                    style={{ width: '100%', background: !isMasterAdmin ? '#f8fafc' : '#ffffff', border: '2px solid #e2e8f0', borderRadius: '20px', padding: '20px 24px', fontSize: '14px', fontWeight: 900, textTransform: 'uppercase', color: '#0f172a', outline: 'none', appearance: 'none', boxSizing: 'border-box' }}
                  >
                    {activeClasses.map(cls => <option key={cls} value={cls}>{cls}</option>)}
                  </select>
                  <div style={{ position: 'absolute', right: '24px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                    <ChevronLeft size={20} color="#94a3b8" style={{ transform: 'rotate(-90deg)' }} />
                  </div>
                </div>

                <motion.button 
                  whileTap={!isEnrolling ? { scale: 0.95 } : {}}
                  type="submit" disabled={isEnrolling} 
                  style={{ width: '100%', background: 'linear-gradient(135deg, #0EA5E9, #2563EB)', color: '#ffffff', padding: '20px', borderRadius: '24px', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', fontSize: '13px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', cursor: isEnrolling ? 'not-allowed' : 'pointer', boxShadow: '0 8px 25px rgba(14, 165, 233, 0.4)', marginTop: '8px' }}
                >
                  {isEnrolling ? <Loader2 size={20} className="animate-spin" /> : <>Complete <ShieldCheck size={20} strokeWidth={2.5} /></>}
                </motion.button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
