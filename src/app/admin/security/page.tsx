'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ShieldCheck, Search, Loader2, CheckCircle2, Ban, Smartphone, RefreshCcw, AlertTriangle, Users } from 'lucide-react';
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

  const getStatusStyles = (status: string | null) => {
    if (status === 'pending') return { bar: '#f97316', badgeBg: '#ffedd5', badgeText: '#ea580c' };
    if (status === 'verified') return { bar: '#10b981', badgeBg: '#dcfce7', badgeText: '#16a34a' };
    if (status === 'blocked') return { bar: '#ef4444', badgeBg: '#fee2e2', badgeText: '#ef4444' };
    return { bar: '#cbd5e1', badgeBg: '#f1f5f9', badgeText: '#64748b' };
  };

  return (
    <div style={{ minHeight: '100svh', background: '#f8fafc', color: '#0f172a', padding: '24px 20px 120px', maxWidth: '500px', margin: '0 auto', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* Subpage Header (Matches "LEARNING LAB" style) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', paddingTop: '10px' }}>
        <button 
          onClick={() => router.back()}
          style={{ width: '44px', height: '44px', borderRadius: '14px', background: '#ffffff', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0f172a', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', flexShrink: 0 }}
        >
          <ChevronLeft size={24} strokeWidth={2.5} />
        </button>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
            <ShieldCheck size={14} color="#3b82f6" strokeWidth={2.5} />
            <p style={{ margin: 0, fontSize: '11px', fontWeight: 800, color: '#3b82f6', letterSpacing: '1px', textTransform: 'uppercase' }}>
              Admin Controls
            </p>
          </div>
          <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: '#0f172a', lineHeight: 1.1 }}>
            Security Gate
          </h1>
        </div>
      </div>

      {/* Tabs (Styled cleanly to fit light theme) */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '16px', marginBottom: '8px', WebkitOverflowScrolling: 'touch' }} className="hide-scrollbar">
        {[
          { id: 'pending', label: 'Pending' },
          { id: 'verified', label: 'Verified' },
          { id: 'blocked', label: 'Blocked' },
          { id: 'all', label: 'All Users' },
        ].map(tab => {
          const isActive = activeTab === tab.id;
          const count = tab.id === 'pending' ? requests.filter(r => r.device_status === 'pending').length : 0;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                flexShrink: 0, padding: '10px 18px', borderRadius: '20px', fontSize: '12px', fontWeight: 800, letterSpacing: '0.5px', textTransform: 'uppercase',
                display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s ease',
                background: isActive ? '#3b82f6' : '#ffffff',
                color: isActive ? '#ffffff' : '#64748b',
                border: isActive ? '1px solid #3b82f6' : '1px solid #e2e8f0',
                boxShadow: isActive ? '0 4px 10px rgba(59,130,246,0.2)' : 'none',
              }}
            >
              {tab.label}
              {count > 0 && (
                <span style={{ background: isActive ? '#ffffff' : '#f97316', color: isActive ? '#3b82f6' : '#ffffff', padding: '2px 6px', borderRadius: '8px', fontSize: '10px', fontWeight: 900 }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search Bar (Matches screenshots) */}
      <div style={{ position: 'relative', marginBottom: '24px' }}>
        <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
          <Search size={18} color="#94a3b8" />
        </div>
        <input 
          type="text" 
          placeholder="Search by name or ID..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ 
            width: '100%', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '24px', 
            padding: '16px 16px 16px 44px', fontSize: '14px', fontWeight: 600, color: '#0f172a', 
            outline: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', boxSizing: 'border-box'
          }}
        />
      </div>

      {/* List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: '16px' }}>
            <Loader2 className="animate-spin" size={32} color="#3b82f6" />
            <p style={{ margin: 0, fontSize: '12px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: '#94a3b8' }}>
              Syncing Data...
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 24px', borderRadius: '24px', background: '#ffffff', border: '1px solid #e2e8f0' }}>
            <p style={{ margin: 0, fontSize: '12px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: '#94a3b8' }}>
              No records found
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {filtered.map((student, index) => {
              const statusStyles = getStatusStyles(student.device_status);
              
              return (
                <motion.div 
                  key={student.id}
                  initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
                  style={{ 
                    background: '#ffffff', borderRadius: '20px', padding: '20px', position: 'relative', 
                    border: '1px solid #f1f5f9', boxShadow: '0 4px 15px rgba(0,0,0,0.02)'
                  }}
                >
                  {/* Left Accent Stripe (Matches exactly with your screenshot) */}
                  <div style={{ position: 'absolute', left: 0, top: '40px', bottom: '40px', width: '4px', borderRadius: '0 4px 4px 0', background: statusStyles.bar }} />

                  {/* Header Info */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', paddingLeft: '8px' }}>
                    <div style={{ minWidth: 0, flex: 1, paddingRight: '12px' }}>
                      <h4 style={{ margin: '0 0 6px 0', fontSize: '17px', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {student.name}
                      </h4>
                      <p style={{ margin: 0, fontSize: '10px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        ID: {student.id} • CLASS {student.class}
                      </p>
                    </div>
                    
                    {/* Status Badge */}
                    <div style={{ 
                      background: statusStyles.badgeBg, 
                      padding: '6px 12px', borderRadius: '8px', flexShrink: 0
                    }}>
                      <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: statusStyles.badgeText }}>
                        {student.device_status || 'UNBOUND'}
                      </span>
                    </div>
                  </div>

                  {/* Device Info (Pill shape, light border) */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#ffffff', padding: '12px 16px', borderRadius: '16px', border: '1px solid #f1f5f9', marginBottom: '20px', marginLeft: '8px' }}>
                    <Smartphone size={16} color="#94a3b8" />
                    <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'monospace' }}>
                      {student.pending_device_id || student.device_id || 'No device connected'}
                    </p>
                  </div>

                  {/* Action Buttons (Matches your screenshot styling) */}
                  <div style={{ display: 'flex', gap: '12px', marginLeft: '8px' }}>
                    {student.device_status === 'pending' && (
                      <>
                        <ActionButton 
                          onClick={() => approveDevice(student.id, student.pending_device_id)} loading={actionId === student.id} disabled={!!actionId}
                          icon={<CheckCircle2 size={16} color="#16a34a" />} label="APPROVE" bg="#dcfce7" text="#16a34a" border="1px solid #bbf7d0"
                        />
                        <ActionButton 
                          onClick={() => blockStudent(student.id)} loading={actionId === student.id} disabled={!!actionId}
                          icon={<Ban size={16} color="#ef4444" />} label="BLOCK" bg="#fee2e2" text="#ef4444" border="1px solid #fecaca"
                        />
                      </>
                    )}

                    {student.device_status === 'verified' && (
                      <>
                        <ActionButton 
                          onClick={() => resetDevice(student.id)} loading={actionId === student.id} disabled={!!actionId}
                          icon={<RefreshCcw size={16} color="#64748b" />} label="UNBIND" bg="#ffffff" text="#64748b" border="1px solid #e2e8f0"
                        />
                        <ActionButton 
                          onClick={() => blockStudent(student.id)} loading={actionId === student.id} disabled={!!actionId}
                          icon={<Ban size={16} color="#ef4444" />} label="BLOCK" bg="#fee2e2" text="#ef4444" border="1px solid #fecaca"
                        />
                      </>
                    )}

                    {student.device_status === 'blocked' && (
                      <ActionButton 
                        onClick={() => resetDevice(student.id)} loading={actionId === student.id} disabled={!!actionId}
                        icon={<RefreshCcw size={16} color="#64748b" />} label="UNBIND & LIFT BAN" bg="#ffffff" text="#64748b" border="1px solid #e2e8f0" fullWidth
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
  );
}

// Updated Action Button Component to match the PWA styling
function ActionButton({ onClick, loading, disabled, icon, label, bg, text, border, fullWidth }: any) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: fullWidth ? 'none' : 1, width: fullWidth ? '100%' : 'auto',
        background: bg, border: border,
        padding: '12px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled && !loading ? 0.6 : 1, transition: 'all 0.15s'
      }}
      onMouseDown={e => { if(!disabled) e.currentTarget.style.transform = 'scale(0.96)' }}
      onMouseUp={e => { if(!disabled) e.currentTarget.style.transform = 'scale(1)' }}
    >
      {loading ? <Loader2 size={16} className="animate-spin" color={text} /> : icon}
      <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: text }}>
        {label}
      </span>
    </button>
  );
}
