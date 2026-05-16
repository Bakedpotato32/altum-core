'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ShieldCheck, Search, Loader2, CheckCircle2, Ban, Smartphone, RefreshCcw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

type StudentDevice = {
  id: string;
  name: string;
  class: string;
  device_id: string | null;
  pending_device_id: string | null;
  device_status: 'verified' | 'pending' | 'blocked' | null;
};

export default function SecurityGate() {
  const router = useRouter();
  const [requests, setRequests] = useState<StudentDevice[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'verified' | 'blocked'>('pending');

  useEffect(() => {
    const role = localStorage.getItem('role');
    if (role !== 'principal') {
      router.push('/dashboard');
    } else {
      fetchRequests();
    }
  }, [router]);

  const fetchRequests = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('students')
      .select('id, name, class, device_id, pending_device_id, device_status')
      .order('device_status', { ascending: false }); 
    
    if (data) setRequests(data);
    setLoading(false);
  };

  const approveDevice = async (studentId: string, newDeviceId: string | null) => {
    if (!newDeviceId) return;
    setActionId(studentId);
    const { error } = await supabase.from('students').update({ 
      device_id: newDeviceId, device_status: 'verified', pending_device_id: null 
    }).eq('id', studentId);
    
    if (!error) fetchRequests();
    setActionId(null);
  };

  const blockStudent = async (studentId: string) => {
    const confirm = window.confirm("Block this student's device? They will not be able to log in.");
    if (!confirm) return;

    setActionId(studentId);
    await supabase.from('students').update({ device_status: 'blocked' }).eq('id', studentId);
    fetchRequests();
    setActionId(null);
  };

  const resetDevice = async (studentId: string) => {
    const confirm = window.confirm("Unbind this device? The student will be prompted to register their current device on their next login.");
    if (!confirm) return;

    setActionId(studentId);
    await supabase.from('students').update({ 
      device_id: null, 
      pending_device_id: null,
      device_status: null 
    }).eq('id', studentId);
    fetchRequests();
    setActionId(null);
  };

  const filtered = requests.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) || r.id.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeTab === 'all') return matchesSearch;
    if (activeTab === 'pending') return matchesSearch && r.device_status === 'pending';
    if (activeTab === 'verified') return matchesSearch && r.device_status === 'verified';
    if (activeTab === 'blocked') return matchesSearch && r.device_status === 'blocked';
    return false;
  });

  // Updated to return vibrant gradients instead of flat colors
  const getStatusStyles = (status: string | null) => {
    if (status === 'pending') return { gradient: 'linear-gradient(135deg, #F59E0B, #EA580C)', shadow: 'rgba(245, 158, 11, 0.4)', text: '#fff' };
    if (status === 'verified') return { gradient: 'linear-gradient(135deg, #10B981, #059669)', shadow: 'rgba(16, 185, 129, 0.4)', text: '#fff' };
    if (status === 'blocked') return { gradient: 'linear-gradient(135deg, #EF4444, #B91C1C)', shadow: 'rgba(239, 68, 68, 0.4)', text: '#fff' };
    return { gradient: 'linear-gradient(135deg, #94A3B8, #64748B)', shadow: 'rgba(148, 163, 184, 0.4)', text: '#fff' };
  };

  return (
    <div style={{ minHeight: '100svh', background: '#f8fafc', color: '#0f172a', padding: '24px 20px 120px', maxWidth: '500px', margin: '0 auto', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', fontFamily: 'system-ui, -apple-system, sans-serif', position: 'relative', overflowX: 'hidden' }}>
      
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* --- PLAYFUL ADMIN BACKGROUND (Optimized) --- */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '-5%', left: '-10%', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.15)', filter: 'blur(80px)', transform: 'translateZ(0)', willChange: 'transform' }} />
        <div style={{ position: 'absolute', bottom: '10%', right: '-10%', width: '350px', height: '350px', borderRadius: '50%', background: 'rgba(139, 92, 246, 0.15)', filter: 'blur(100px)', transform: 'translateZ(0)', willChange: 'transform' }} />
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
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
              <ShieldCheck size={16} color="#3b82f6" strokeWidth={3} />
              <p style={{ margin: 0, fontSize: '11px', fontWeight: 900, color: '#3b82f6', letterSpacing: '1px', textTransform: 'uppercase' }}>
                Admin Controls
              </p>
            </div>
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', background: 'linear-gradient(135deg, #1E3A8A, #3B82F6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1.1 }}>
              Security Gate
            </h1>
          </div>
        </div>

        {/* Glassmorphic Tabs */}
        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '16px', marginBottom: '8px', WebkitOverflowScrolling: 'touch' }} className="hide-scrollbar">
          {[
            { id: 'pending', label: 'Pending' },
            { id: 'verified', label: 'Verified' },
            { id: 'blocked', label: 'Blocked' },
            { id: 'all', label: 'All' },
          ].map(tab => {
            const isActive = activeTab === tab.id;
            const count = tab.id === 'pending' ? requests.filter(r => r.device_status === 'pending').length : 0;

            return (
              <motion.button
                key={tab.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  flexShrink: 0, padding: '12px 20px', borderRadius: '20px', fontSize: '12px', fontWeight: 900, letterSpacing: '0.5px', textTransform: 'uppercase',
                  display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
                  background: isActive ? 'linear-gradient(135deg, #3B82F6, #6366F1)' : 'rgba(255,255,255,0.6)',
                  color: isActive ? '#ffffff' : '#64748b',
                  border: isActive ? 'none' : '1px solid rgba(255,255,255,0.8)',
                  backdropFilter: 'blur(10px)',
                  boxShadow: isActive ? '0 8px 20px rgba(59,130,246,0.3)' : '0 4px 10px rgba(0,0,0,0.02)',
                }}
              >
                {tab.label}
                {count > 0 && (
                  <span style={{ background: isActive ? '#ffffff' : '#F59E0B', color: isActive ? '#3b82f6' : '#ffffff', padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 900, boxShadow: isActive ? 'none' : '0 2px 5px rgba(245,158,11,0.4)' }}>
                    {count}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Glassmorphic Search Bar */}
        <div style={{ position: 'relative', marginBottom: '24px' }}>
          <div style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <Search size={20} color="#64748b" strokeWidth={2.5} />
          </div>
          <input 
            type="text" 
            placeholder="Search by name or ID..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ 
              width: '100%', background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(10px)', 
              border: '2px solid rgba(255,255,255,0.8)', borderRadius: '24px', 
              padding: '18px 18px 18px 52px', fontSize: '14px', fontWeight: 800, color: '#0f172a', 
              outline: 'none', boxShadow: '0 8px 25px rgba(0,0,0,0.04)', boxSizing: 'border-box'
            }}
          />
        </div>

        {/* List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: '16px' }}>
              <Loader2 className="animate-spin" size={40} color="#3b82f6" />
              <p style={{ margin: 0, fontSize: '12px', fontWeight: 900, letterSpacing: '1px', textTransform: 'uppercase', color: '#64748b' }}>
                SYNCING SECURE DATA...
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 24px', borderRadius: '30px', background: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(10px)', border: '2px dashed rgba(148, 163, 184, 0.3)' }}>
              <ShieldCheck size={48} color="#cbd5e1" style={{ margin: '0 auto 16px' }} />
              <p style={{ margin: 0, fontSize: '14px', fontWeight: 900, letterSpacing: '1px', textTransform: 'uppercase', color: '#94a3b8' }}>
                NO RECORDS FOUND
              </p>
            </div>
          ) : (
            <AnimatePresence>
              {filtered.map((student, index) => {
                const statusStyles = getStatusStyles(student.device_status);
                
                return (
                  <motion.div 
                    key={student.id}
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
                    style={{ 
                      background: 'rgba(255, 255, 255, 0.65)', backdropFilter: 'blur(12px)', 
                      borderRadius: '28px', padding: '24px', position: 'relative', 
                      border: '1px solid rgba(255, 255, 255, 0.9)', 
                      boxShadow: '0 10px 30px rgba(0,0,0,0.03)'
                    }}
                  >
                    {/* Header Info */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                      <div style={{ minWidth: 0, flex: 1, paddingRight: '12px' }}>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '20px', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.5px' }}>
                          {student.name}
                        </h4>
                        <p style={{ margin: 0, fontSize: '10px', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
                          ID: <span style={{ color: '#3b82f6' }}>{student.id}</span> • CLASS {student.class}
                        </p>
                      </div>
                      
                      {/* Vibrant Status Badge */}
                      <div style={{ 
                        background: statusStyles.gradient, 
                        boxShadow: `0 4px 15px ${statusStyles.shadow}`,
                        padding: '8px 14px', borderRadius: '12px', flexShrink: 0
                      }}>
                        <span style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', color: statusStyles.text }}>
                          {student.device_status || 'UNBOUND'}
                        </span>
                      </div>
                    </div>

                    {/* Device Info (Frosted Inset) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.5)', padding: '14px 16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.8)', marginBottom: '20px', boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.02)' }}>
                      <div style={{ background: '#f1f5f9', padding: '8px', borderRadius: '10px' }}>
                        <Smartphone size={18} color="#64748b" strokeWidth={2.5} />
                      </div>
                      <p style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'monospace' }}>
                        {student.pending_device_id || student.device_id || 'NO DEVICE CONNECTED'}
                      </p>
                    </div>

                    {/* Action Buttons (Framer Motion Upgraded) */}
                    <div style={{ display: 'flex', gap: '12px' }}>
                      {student.device_status === 'pending' && (
                        <>
                          <ActionButton 
                            onClick={() => approveDevice(student.id, student.pending_device_id)} loading={actionId === student.id} disabled={!!actionId}
                            icon={<CheckCircle2 size={18} strokeWidth={2.5} />} label="APPROVE" 
                            gradient="linear-gradient(135deg, #10B981, #059669)" shadow="rgba(16, 185, 129, 0.4)"
                          />
                          <ActionButton 
                            onClick={() => blockStudent(student.id)} loading={actionId === student.id} disabled={!!actionId}
                            icon={<Ban size={18} strokeWidth={2.5} />} label="BLOCK" 
                            gradient="linear-gradient(135deg, #EF4444, #B91C1C)" shadow="rgba(239, 68, 68, 0.4)"
                          />
                        </>
                      )}

                      {student.device_status === 'verified' && (
                        <>
                          <ActionButton 
                            onClick={() => resetDevice(student.id)} loading={actionId === student.id} disabled={!!actionId}
                            icon={<RefreshCcw size={18} strokeWidth={2.5} />} label="UNBIND" 
                            gradient="linear-gradient(135deg, #64748b, #475569)" shadow="rgba(100, 116, 139, 0.4)"
                          />
                          <ActionButton 
                            onClick={() => blockStudent(student.id)} loading={actionId === student.id} disabled={!!actionId}
                            icon={<Ban size={18} strokeWidth={2.5} />} label="BLOCK" 
                            gradient="linear-gradient(135deg, #EF4444, #B91C1C)" shadow="rgba(239, 68, 68, 0.4)"
                          />
                        </>
                      )}

                      {student.device_status === 'blocked' && (
                        <ActionButton 
                          onClick={() => resetDevice(student.id)} loading={actionId === student.id} disabled={!!actionId}
                          icon={<RefreshCcw size={18} strokeWidth={2.5} />} label="UNBIND & LIFT BAN" 
                          gradient="linear-gradient(135deg, #3B82F6, #2563EB)" shadow="rgba(59, 130, 246, 0.4)" fullWidth
                        />
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>

      </div>
    </div>
  );
}

// Upgraded to use Framer Motion and Gradients
interface ActionButtonProps {
  onClick: () => void;
  loading: boolean;
  disabled: boolean;
  icon: React.ReactNode;
  label: string;
  gradient: string;
  shadow: string;
  fullWidth?: boolean;
}

function ActionButton({ onClick, loading, disabled, icon, label, gradient, shadow, fullWidth }: ActionButtonProps) {
  return (
    <motion.button
      whileTap={!disabled ? { scale: 0.95 } : {}}
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: fullWidth ? 'none' : 1, width: fullWidth ? '100%' : 'auto',
        background: gradient,
        border: 'none',
        boxShadow: disabled ? 'none' : `0 8px 20px ${shadow}`,
        padding: '14px', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled && !loading ? 0.5 : 1,
        color: '#ffffff'
      }}
    >
      {loading ? <Loader2 size={18} strokeWidth={3} className="animate-spin" /> : icon}
      <span style={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label}
      </span>
    </motion.button>
  );
}
