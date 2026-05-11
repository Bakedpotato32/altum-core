'use client';
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ShieldCheck, Smartphone, CheckCircle, XCircle, Loader2, User } from 'lucide-react';

export default function DeviceManager() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    // Fetch students who are either pending or blocked
    const { data } = await supabase
      .from('students')
      .select('id, name, class, device_id, pending_device_id, device_status')
      .neq('device_status', 'verified');
    
    if (data) setRequests(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const approveDevice = async (studentId: string, newDeviceId: string) => {
    setActionId(studentId);
    const { error } = await supabase
      .from('students')
      .update({ 
        device_id: newDeviceId, 
        device_status: 'verified',
        pending_device_id: null 
      })
      .eq('id', studentId);

    if (!error) {
      setRequests(prev => prev.filter(r => r.id !== studentId));
    }
    setActionId(null);
  };

  const blockStudent = async (studentId: string) => {
    setActionId(studentId);
    await supabase
      .from('students')
      .update({ device_status: 'blocked' })
      .eq('id', studentId);
    fetchRequests();
    setActionId(null);
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-blue-500" /></div>;

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <div className="flex items-center gap-3 mb-6 bg-blue-500/10 p-4 rounded-2xl border border-blue-500/20">
        <ShieldCheck className="text-blue-500" />
        <h2 className="text-sm font-black uppercase tracking-widest text-blue-500">Device Security Gate</h2>
      </div>

      {requests.length === 0 ? (
        <div className="text-center py-10 border-2 border-dashed border-border rounded-3xl">
          <p className="text-xs font-bold text-text/30 uppercase italic">No pending security alerts.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((student) => (
            <div key={student.id} className="bg-card border border-border rounded-3xl p-5 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                    <User size={20} />
                  </div>
                  <div>
                    <h3 className="font-black italic uppercase text-text">{student.name}</h3>
                    <p className="text-[10px] font-bold text-text/40">ID: {student.id} • CLASS: {student.class}</p>
                  </div>
                </div>
                <span className={`text-[8px] font-black px-2 py-1 rounded-md uppercase tracking-tighter ${student.device_status === 'blocked' ? 'bg-red-500 text-white' : 'bg-orange-500 text-white animate-pulse'}`}>
                  {student.device_status}
                </span>
              </div>

              <div className="bg-background rounded-xl p-3 mb-4 border border-border flex items-center gap-3">
                <Smartphone size={14} className="text-text/40" />
                <p className="text-[9px] font-mono text-text/60 truncate">REQ_ID: {student.pending_device_id || 'N/A'}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  disabled={!!actionId || !student.pending_device_id}
                  onClick={() => approveDevice(student.id, student.pending_device_id)}
                  className="flex items-center justify-center gap-2 bg-emerald-500 text-white py-3 rounded-xl text-[10px] font-black uppercase active:scale-95 transition-transform disabled:opacity-50"
                >
                  <CheckCircle size={14} /> Approve Device
                </button>
                <button
                  disabled={!!actionId}
                  onClick={() => blockStudent(student.id)}
                  className="flex items-center justify-center gap-2 bg-red-500 text-white py-3 rounded-xl text-[10px] font-black uppercase active:scale-95 transition-transform disabled:opacity-50"
                >
                  <XCircle size={14} /> {student.device_status === 'blocked' ? 'Keep Blocked' : 'Block Access'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
