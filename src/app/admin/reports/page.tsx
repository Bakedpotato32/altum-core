'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Loader2, Download, FileBarChart, Filter, Award, Star } from 'lucide-react';
import { useRouter } from 'next/navigation';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { format } from 'date-fns';

export default function ReportCardGenerator() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [activeClasses, setActiveClasses] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [scores, setScores] = useState<any[]>([]);

  useEffect(() => {
    const fetchClasses = async () => {
      const { data } = await supabase.from('config').select('value').eq('key', 'active_classes').maybeSingle();
      if (data && data.value) {
        try {
          const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
          if (Array.isArray(parsed)) setActiveClasses(parsed);
        } catch (e) { console.error(e); }
      }
    };
    fetchClasses();
  }, []);

  useEffect(() => {
    if (!selectedClass) { setStudents([]); setSelectedStudent(null); return; }
    const fetchStudents = async () => {
      setLoading(true);
      const { data } = await supabase.from('students').select('*').eq('class', selectedClass).order('name');
      if (data) setStudents(data);
      setLoading(false);
    };
    fetchStudents();
  }, [selectedClass]);

  useEffect(() => {
    if (!selectedStudent) { setScores([]); return; }
    const fetchScores = async () => {
      setLoading(true);
      const { data, error } = await supabase.from('test_scores').select('*').eq('student_id', selectedStudent.id);
      if (error) console.error("Error fetching scores:", error);
      if (data) setScores(data.reverse());
      setLoading(false);
    };
    fetchScores();
  }, [selectedStudent]);

  let totalMarks = 0;
  let marksObtained = 0;
  scores.forEach(s => {
    totalMarks += Number(s.total_marks) || 0;
    marksObtained += Number(s.marks_obtained) || 0;
  });
  const overallPercentage = totalMarks > 0 ? ((marksObtained / totalMarks) * 100).toFixed(1) : '0.0';

  const getGrade = (perc: number) => {
    if (perc >= 90) return { letter: 'A+', label: 'Outstanding', color: '#059669', light: '#f0fdf4', border: '#bbf7d0' };
    if (perc >= 80) return { letter: 'A',  label: 'Excellent',   color: '#2563eb', light: '#eff6ff', border: '#bfdbfe' };
    if (perc >= 70) return { letter: 'B',  label: 'Very Good',   color: '#7c3aed', light: '#f5f3ff', border: '#ddd6fe' };
    if (perc >= 60) return { letter: 'C',  label: 'Good',        color: '#d97706', light: '#fffbeb', border: '#fde68a' };
    if (perc >= 50) return { letter: 'D',  label: 'Average',     color: '#ea580c', light: '#fff7ed', border: '#fed7aa' };
    return                 { letter: 'F',  label: 'Needs Work',  color: '#dc2626', light: '#fef2f2', border: '#fecaca' };
  };

  const getGradeAccent = (perc: number) => {
    if (perc >= 80) return { color: '#10b981', bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.25)', glow: 'rgba(16,185,129,0.3)' };
    if (perc >= 60) return { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',  border: 'rgba(59,130,246,0.25)', glow: 'rgba(59,130,246,0.3)' };
    if (perc >= 40) return { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.25)', glow: 'rgba(245,158,11,0.3)' };
    return              { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',    border: 'rgba(239,68,68,0.25)',  glow: 'rgba(239,68,68,0.3)'  };
  };

  const handleGeneratePdf = async () => {
    const element = document.getElementById('report-card');
    if (!element || !selectedStudent) return;
    setGenerating(true);
    
    try {
      window.scrollTo(0, 0); // Reset scroll to prevent capture offset

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        scrollY: -window.scrollY
      });

      const imgData = canvas.toDataURL('image/png');
      
      // CRITICAL FIX: Create a custom PDF matching the EXACT canvas size
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`${selectedStudent.name.replace(/\s+/g, '_')}_Report_Card.pdf`);
    } catch (error) {
      console.error("PDF Gen Error:", error);
      alert("Failed to generate PDF.");
    }
    setGenerating(false);
  };
  const pct = Number(overallPercentage);
  const ac = getGradeAccent(pct);
  const grade = getGrade(pct);
  const rowPct = (s: any) => s.total_marks > 0 ? Math.round((Number(s.marks_obtained) / Number(s.total_marks)) * 100) : 0;
  const rowColor = (p: number) => p >= 80 ? '#059669' : p >= 60 ? '#2563eb' : p >= 40 ? '#d97706' : '#dc2626';

  return (
    <div className="min-h-screen pb-40 font-sans" style={{ background: 'var(--background)', color: 'var(--text)' }}>

      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: 340, height: 340, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)', filter: 'blur(60px)' }} />
        <div style={{ position: 'absolute', bottom: '10%', left: '-10%', width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)', filter: 'blur(60px)' }} />
      </div>

      <div className="max-w-md mx-auto px-5 pt-24">

        <button onClick={() => router.push('/admin')} className="flex items-center gap-1.5 mb-10 active:scale-95 transition-transform" style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text)', opacity: 0.4 }}>
          <ArrowLeft size={15} strokeWidth={3} /> Admin Core
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
          <div style={{ width: 52, height: 52, borderRadius: 18, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(59,130,246,0.2)', flexShrink: 0 }}>
            <FileBarChart size={24} style={{ color: '#3b82f6' }} />
          </div>
          <div>
            <h1 style={{ fontSize: 38, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-0.03em', lineHeight: 0.92, color: 'var(--text)' }}>
              Report <span style={{ color: '#3b82f6', textShadow: '0 0 24px rgba(59,130,246,0.35)' }}>Gen</span>
            </h1>
            <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--text)', opacity: 0.3, marginTop: 6 }}>Automated PDF Node</p>
          </div>
        </div>

        <div style={{ borderRadius: 28, background: 'var(--card)', border: '1px solid var(--border)', borderTop: '4px solid #3b82f6', padding: '22px 20px', marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { value: selectedClass, onChange: (e: any) => setSelectedClass(e.target.value), opts: [<option key="" value="">Select Class</option>, ...activeClasses.map(c => <option key={c} value={c}>{c}</option>)], disabled: false, spin: false },
            { value: selectedStudent ? selectedStudent.id : '', onChange: (e: any) => { const s = students.find((x: any) => x.id === e.target.value); setSelectedStudent(s || null); }, opts: [<option key="" value="">{students.length === 0 && selectedClass ? 'No Students' : 'Select Student'}</option>, ...students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)], disabled: !selectedClass || students.length === 0, spin: loading && !selectedStudent },
          ].map((sel, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--background)', borderRadius: 16, border: '1px solid var(--border)', padding: '4px 16px', opacity: sel.disabled ? 0.5 : 1 }}>
              {sel.spin ? <Loader2 size={14} className="animate-spin" style={{ color: '#3b82f6', flexShrink: 0 }} /> : <Filter size={14} style={{ color: 'var(--text)', opacity: 0.3, flexShrink: 0 }} />}
              <select value={sel.value} onChange={sel.onChange} disabled={sel.disabled} style={{ flex: 1, background: 'transparent', border: 'none', padding: '14px 0', fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text)', outline: 'none', fontFamily: 'inherit', appearance: 'none' }}>
                {sel.opts}
              </select>
            </div>
          ))}
          <button onClick={handleGeneratePdf} disabled={!selectedStudent || generating} className="active:scale-95 transition-transform" style={{ width: '100%', padding: '18px', borderRadius: 18, background: !selectedStudent || generating ? 'rgba(59,130,246,0.4)' : 'linear-gradient(135deg, #1d4ed8, #3b82f6)', color: '#fff', fontSize: 11, fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', border: 'none', cursor: !selectedStudent || generating ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, boxShadow: !selectedStudent || generating ? 'none' : '0 10px 28px rgba(59,130,246,0.35)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 60%)', pointerEvents: 'none' }} />
            {generating ? <Loader2 size={18} className="animate-spin" style={{ position: 'relative', zIndex: 1 }} /> : <><Download size={17} style={{ position: 'relative', zIndex: 1 }} /><span style={{ position: 'relative', zIndex: 1 }}>Export PDF Report</span></>}
          </button>
        </div>

        {selectedStudent && !loading && (
          <div style={{ borderRadius: 28, background: `linear-gradient(135deg, ${ac.bg} 0%, var(--card) 100%)`, border: `1px solid ${ac.border}`, padding: '20px 22px', marginBottom: 20, position: 'relative', overflow: 'hidden', boxShadow: `0 12px 36px ${ac.glow}`, animation: 'fadeSlideIn 0.35s ease both' }}>
            <div style={{ position: 'absolute', right: -10, bottom: -16, fontSize: 90, fontWeight: 900, fontStyle: 'italic', color: ac.color, opacity: 0.06, lineHeight: 1, pointerEvents: 'none', userSelect: 'none' }}>{grade.letter}</div>
            <p style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.22em', textTransform: 'uppercase', color: ac.color, opacity: 0.8, marginBottom: 10 }}>Live Performance</p>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 14, position: 'relative', zIndex: 1 }}>
              <span style={{ fontSize: 48, fontWeight: 900, fontStyle: 'italic', letterSpacing: '-0.04em', lineHeight: 0.9, color: ac.color, textShadow: `0 0 24px ${ac.glow}` }}>{overallPercentage}%</span>
              <div style={{ textAlign: 'right', paddingBottom: 4 }}>
                <p style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text)', opacity: 0.3, marginBottom: 4 }}>Grade</p>
                <span style={{ fontSize: 28, fontWeight: 900, fontStyle: 'italic', color: ac.color }}>{grade.letter}</span>
              </div>
            </div>
            <div style={{ height: 5, background: 'rgba(128,128,128,0.1)', borderRadius: 5, overflow: 'hidden', marginBottom: 12 }}>
              <div style={{ height: '100%', width: `${pct}%`, borderRadius: 5, background: `linear-gradient(90deg, ${ac.color}, ${ac.color}cc)`, boxShadow: `0 0 10px ${ac.glow}`, transition: 'width 0.8s ease' }} />
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              {[{ label: 'Obtained', value: marksObtained }, { label: 'Total', value: totalMarks }, { label: 'Tests', value: scores.length }].map((s, i) => (
                <div key={i}>
                  <p style={{ fontSize: 14, fontWeight: 900, fontStyle: 'italic', color: 'var(--text)', letterSpacing: '-0.02em', lineHeight: 1 }}>{s.value}</p>
                  <p style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text)', opacity: 0.3, marginTop: 3 }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        {selectedStudent && (
          <div id="report-card" style={{ width: '100%', background: '#ffffff', fontFamily: 'system-ui, -apple-system, Arial, sans-serif', display: 'block', position: 'relative' }}>
            <div style={{ height: 10, background: 'linear-gradient(90deg, #1e3a8a 0%, #2563eb 50%, #60a5fa 100%)' }} />
            <div style={{ height: 6, background: '#1e3a8a', display: 'flex', alignItems: 'center', paddingLeft: 20, gap: 6 }}>
              {[...Array(60)].map((_, i) => <div key={i} style={{ width: 2, height: 2, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />)}
            </div>

            <div style={{ padding: '24px 24px 28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, paddingBottom: 16, borderBottom: '2px solid #1e3a8a' }}>
                <div>
                  <div style={{ fontSize: 28, fontWeight: 900, fontStyle: 'italic', letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 5 }}>
                    <span style={{ color: '#2563eb' }}>ALTUM</span><span style={{ color: '#18181b' }}>CORE</span>
                  </div>
                  <div style={{ fontSize: 7.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.28em', color: '#6b7280' }}>Academic Performance Report</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <div style={{ width: 24, height: 3, background: '#2563eb', borderRadius: 2 }} />
                    <div style={{ width: 16, height: 3, background: '#60a5fa', borderRadius: 2 }} />
                    <div style={{ width: 8, height: 3, background: '#bfdbfe', borderRadius: 2 }} />
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 7, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.22em', color: '#9ca3af', marginBottom: 4 }}>Date Generated</div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: '#18181b' }}>{format(new Date(), 'MMM dd, yyyy')}</div>
                </div>
              </div>

              <div style={{ display: 'flex', border: '1.5px solid #e5e7eb', borderRadius: 14, overflow: 'hidden', marginBottom: 20 }}>
                <div style={{ background: 'linear-gradient(160deg, #1e3a8a 0%, #2563eb 100%)', padding: '18px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minWidth: 88, gap: 8 }}>
                  {selectedStudent.avatar_url ? (
                    <img src={selectedStudent.avatar_url} alt="" style={{ width: 52, height: 52, borderRadius: 12, objectFit: 'cover', border: '2px solid rgba(255,255,255,0.4)' }} />
                  ) : (
                    <div style={{ width: 52, height: 52, borderRadius: 12, background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 900, fontStyle: 'italic', color: '#fff' }}>
                      {selectedStudent.name[0]}
                    </div>
                  )}
                  <div style={{ fontSize: 7, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.65)', textAlign: 'center', lineHeight: 1.3 }}>{selectedStudent.class}</div>
                </div>

                <div style={{ flex: 1, padding: '16px 18px', background: '#f9fafb', borderLeft: '1px solid #e5e7eb', borderRight: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: 22, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-0.02em', color: '#111827', lineHeight: 1.1, marginBottom: 8 }}>{selectedStudent.name}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#6b7280' }}>ID: {selectedStudent.id}</div>
                    <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#6b7280' }}>Class: {selectedStudent.class}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 110 }}>
                  <div style={{ flex: 1, padding: '12px 14px', background: selectedStudent.paid_till ? '#f0fdf4' : '#fef2f2', borderBottom: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ fontSize: 7, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.18em', color: selectedStudent.paid_till ? '#16a34a' : '#dc2626', marginBottom: 4 }}>Fee Status</div>
                    <div style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', color: selectedStudent.paid_till ? '#16a34a' : '#dc2626' }}>
                      {selectedStudent.paid_till ? `✓ ${selectedStudent.paid_till}` : '✗ PENDING'}
                    </div>
                  </div>
                  <div style={{ flex: 1, padding: '12px 14px', background: '#f8faff', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ fontSize: 7, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#2563eb', marginBottom: 4 }}>Attendance</div>
                    <div style={{ fontSize: 20, fontWeight: 900, fontStyle: 'italic', letterSpacing: '-0.02em', color: Number(selectedStudent.attendance) < 75 ? '#ea580c' : '#16a34a' }}>
                      {selectedStudent.attendance}%
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.22em', color: '#111827', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div style={{ width: 18, height: 18, borderRadius: 6, background: '#1e3a8a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Star size={10} style={{ color: '#fff' }} fill="#fff" />
                  </div>
                  Test Scores
                </div>

                {scores.length === 0 ? (
                  <div style={{ padding: 20, textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em', border: '1px dashed #e5e7eb', borderRadius: 10 }}>No test scores recorded yet.</div>
                ) : (
                  <div style={{ border: '1.5px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 72px 52px', background: 'linear-gradient(90deg, #1e3a8a, #2563eb)', padding: '10px 14px', gap: 6 }}>
                      {['Subject', 'Assessment', 'Score', '%'].map((h, i) => (
                        <div key={h} style={{ fontSize: 8, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'rgba(255,255,255,0.8)', textAlign: i >= 2 ? 'right' : 'left' }}>{h}</div>
                      ))}
                    </div>
                    {scores.map((score, i) => {
                      const p = rowPct(score);
                      const rc = rowColor(p);
                      return (
                        <div key={score.id} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 72px 52px', padding: '10px 14px', gap: 6, background: i % 2 === 0 ? '#ffffff' : '#f9fafb', borderTop: '1px solid #f3f4f6', alignItems: 'center' }}>
                          <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#111827' }}>{score.subject}</div>
                          <div style={{ fontSize: 10, fontWeight: 600, color: '#4b5563', textTransform: 'uppercase' }}>{score.test_name}</div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: 13, fontWeight: 900, fontStyle: 'italic', color: '#1d4ed8' }}>{score.marks_obtained}</span>
                            <span style={{ fontSize: 9, color: '#9ca3af' }}>/{score.total_marks}</span>
                          </div>
                          <div style={{ textAlign: 'right', fontSize: 11, fontWeight: 900, color: rc }}>{p}%</div>
                        </div>
                      );
                    })}
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 72px 52px', padding: '10px 14px', gap: 6, background: '#f0f4ff', borderTop: '2px solid #bfdbfe', alignItems: 'center' }}>
                      <div style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#1e3a8a', gridColumn: '1 / 3' }}>Total</div>
                      <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 900, fontStyle: 'italic', color: '#1d4ed8' }}>{marksObtained}<span style={{ fontSize: 9, color: '#9ca3af' }}>/{totalMarks}</span></div>
                      <div style={{ textAlign: 'right', fontSize: 11, fontWeight: 900, color: rowColor(pct) }}>{overallPercentage}%</div>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 18px', background: grade.light, border: `1.5px solid ${grade.border}`, borderRadius: 14, marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 7.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.22em', color: grade.color, opacity: 0.7, marginBottom: 6 }}>Overall Result</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ fontSize: 32, fontWeight: 900, fontStyle: 'italic', letterSpacing: '-0.03em', color: '#111827', lineHeight: 1 }}>{overallPercentage}%</div>
                    <div style={{ padding: '6px 14px', borderRadius: 10, background: grade.color, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                      <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{grade.letter}</div>
                      <div style={{ fontSize: 7, fontWeight: 700, color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{grade.label}</div>
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ width: 110, height: 1, background: '#d1d5db', marginBottom: 6 }} />
                  <div style={{ fontSize: 7, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.22em', color: '#9ca3af' }}>Principal</div>
                </div>
              </div>

              <div style={{ textAlign: 'center', paddingTop: 4 }}>
                <div style={{ fontSize: 7, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#d1d5db' }}>This is a computer-generated report — Altum Core Institute</div>
              </div>
            </div>

            <div style={{ height: 8, background: 'linear-gradient(90deg, #1e3a8a 0%, #2563eb 50%, #60a5fa 100%)' }} />
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        select option { font-family: inherit; }
      `}</style>
    </div>
  );
}
