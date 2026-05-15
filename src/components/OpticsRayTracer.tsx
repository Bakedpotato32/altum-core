'use client';
import React, { useState } from 'react';
import { Lightbulb, RotateCcw, Sparkles, Target, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Custom Vertical Fraction Component for inline styles
const Frac = ({ n, d }: { n: React.ReactNode, d: React.ReactNode }) => (
  <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', verticalAlign: 'middle', margin: '0 4px', position: 'relative', top: '-0.1em' }}>
    <span style={{ borderBottom: '2.5px solid currentColor', padding: '0 4px', paddingBottom: '2px', lineHeight: 1 }}>{n}</span>
    <span style={{ paddingTop: '2px', padding: '0 4px', lineHeight: 1 }}>{d}</span>
  </span>
);

export default function OpticsRayTracer() {
  const [deviceType, setDeviceType] = useState<'mirror' | 'lens'>('mirror');
  const [deviceShape, setDeviceShape] = useState<'concave' | 'convex'>('concave');
  
  const [inputs, setInputs] = useState({ u: '', f: '', h: '5' }); 
  const [steps, setSteps] = useState<{ title: string, math: React.ReactNode }[]>([]);
  const [nature, setNature] = useState<{ real: boolean, erect: boolean, magSize: string } | null>(null);
  const [isFinal, setIsFinal] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const reset = () => {
    setSteps([]);
    setNature(null);
    setIsFinal(false);
    setErrorMsg('');
  };

  const updateInput = (key: string, val: string) => {
    setInputs(prev => ({ ...prev, [key]: val }));
    reset();
  };

  const traceRays = () => {
    reset();
    let u_mag = parseFloat(inputs.u);
    let f_mag = parseFloat(inputs.f);
    let h_obj = parseFloat(inputs.h);

    if (isNaN(u_mag) || u_mag <= 0 || isNaN(f_mag) || f_mag <= 0) {
      setErrorMsg("INPUT ERROR: Object distance (u) and Focal length (f) must be > 0.");
      return;
    }

    let newSteps: { title: string, math: React.ReactNode }[] = [];
    const add = (title: string, math: React.ReactNode) => newSteps.push({ title, math });

    // Step 1: Sign Convention
    let U = -Math.abs(u_mag); // Object is always on the left
    let F = deviceShape === 'concave' ? -Math.abs(f_mag) : Math.abs(f_mag);
    
    add("Cartesian Sign Convention", (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '14px', lineHeight: 1.2 }}>
            <span>Object (Left): <strong style={{ color: '#fbbf24' }}>u = {U} cm</strong></span>
            <span>{deviceShape.charAt(0).toUpperCase() + deviceShape.slice(1)} {deviceType}: <strong style={{ color: '#fbbf24' }}>f = {F} cm</strong></span>
        </div>
    ));

    let V = 0;
    let M = 0;

    // Step 2 & 3: Mirror or Lens Formula
    try {
        if (deviceType === 'mirror') {
            add("Mirror Formula", <> <Frac n="1" d="v" /> + <Frac n="1" d="u" /> = <Frac n="1" d="f" /> </>);
            add("Rearrange for Image (v)", <> <Frac n="1" d="v" /> = <Frac n="1" d="f" /> - <Frac n="1" d="u" /> </>);
            add("Substitute Values", <> <Frac n="1" d="v" /> = <Frac n="1" d={F} /> - <Frac n="1" d={U} /> </>);
            
            let inv_f = 1 / F;
            let inv_u = 1 / U;
            let inv_v = inv_f - inv_u;
            
            add("Calculate Decimal Inverse", <> <Frac n="1" d="v" /> = {inv_f.toFixed(4)} - ({inv_u.toFixed(4)}) </>);
            add("Sum Inverses", <> <Frac n="1" d="v" /> = {inv_v.toFixed(4)} </>);
            
            if (inv_v === 0) throw new Error("Image forms at infinity.");
            V = 1 / inv_v;
            add("Image Distance Locked", <>v = {V.toFixed(2)} cm</>);

            // Magnification for Mirror: m = -v/u
            add("Magnification Formula", <>m = <Frac n="-v" d="u" /></>);
            add("Substitute Values", <>m = <Frac n={`-(${V.toFixed(2)})`} d={U} /></>);
            M = -V / U;
            add("Magnification Locked", <>m = {M.toFixed(2)}</>);

        } else {
            // Lens Formula
            add("Lens Formula", <> <Frac n="1" d="v" /> - <Frac n="1" d="u" /> = <Frac n="1" d="f" /> </>);
            add("Rearrange for Image (v)", <> <Frac n="1" d="v" /> = <Frac n="1" d="f" /> + <Frac n="1" d="u" /> </>);
            add("Substitute Values", <> <Frac n="1" d="v" /> = <Frac n="1" d={F} /> + <Frac n="1" d={U} /> </>);
            
            let inv_f = 1 / F;
            let inv_u = 1 / U;
            let inv_v = inv_f + inv_u;
            
            add("Calculate Decimal Inverse", <> <Frac n="1" d="v" /> = {inv_f.toFixed(4)} + ({inv_u.toFixed(4)}) </>);
            add("Sum Inverses", <> <Frac n="1" d="v" /> = {inv_v.toFixed(4)} </>);
            
            if (inv_v === 0) throw new Error("Image forms at infinity.");
            V = 1 / inv_v;
            add("Image Distance Locked", <>v = {V.toFixed(2)} cm</>);

            // Magnification for Lens: m = v/u
            add("Magnification Formula", <>m = <Frac n="v" d="u" /></>);
            add("Substitute Values", <>m = <Frac n={V.toFixed(2)} d={U} /></>);
            M = V / U;
            add("Magnification Locked", <>m = {M.toFixed(2)}</>);
        }

        // Determine Nature
        let isReal = false;
        if (deviceType === 'mirror') {
            isReal = V < 0; 
        } else {
            isReal = V > 0; 
        }
        
        let isErect = M > 0;
        let magSize = Math.abs(M) > 1 ? 'Magnified' : (Math.abs(M) < 1 ? 'Diminished' : 'Same Size');

        let H_prime = isNaN(h_obj) ? 0 : M * h_obj;
        if (!isNaN(h_obj) && h_obj > 0) {
             add("Image Height (h')", <>h' = m &times; h = {M.toFixed(2)} &times; {h_obj} = {H_prime.toFixed(2)} cm</>);
        }

        setNature({ real: isReal, erect: isErect, magSize });

    } catch (e: any) {
        setErrorMsg(`PHYSICS ERROR: ${e.message}`);
        return;
    }

    setSteps(newSteps);
    setIsFinal(true);
  };

  const makeInput = (label: string, key: keyof typeof inputs, placeholder: string = "?", unit: string, subtitle?: string) => (
    <div style={{ position: 'relative' }} key={key}>
      {/* 
        FIXED OVERLAP: Set a fixed maxWidth for the label container 
        so it wraps instead of pushing into the input text.
      */}
      <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', zIndex: 2, maxWidth: '120px' }}>
          <span style={{ fontSize: '12px', fontWeight: 900, fontStyle: 'italic', color: 'rgba(255,255,255,0.9)' }}>{label}</span>
          {subtitle && <span style={{ fontSize: '8px', color: '#fde047', fontWeight: 700, textTransform: 'uppercase', marginTop: '2px', lineHeight: 1.1 }}>{subtitle}</span>}
      </div>
      <input 
        type="number" placeholder={placeholder} value={inputs[key]} onChange={(e) => updateInput(key, e.target.value)}
        style={{ 
          boxSizing: 'border-box',
          width: '100%', 
          background: 'rgba(255,255,255,0.15)', 
          border: '2px solid rgba(255,255,255,0.3)', 
          borderRadius: '18px', 
          /* FIXED OVERLAP: Increased left padding significantly to make room for long labels/subtitles */
          padding: subtitle ? '14px 45px 14px 145px' : '14px 45px 14px 110px', 
          color: '#fff', 
          fontSize: '18px', 
          fontWeight: 900, 
          fontStyle: 'italic', 
          textAlign: 'left', 
          outline: 'none', 
          backdropFilter: 'blur(5px)' 
        }}
      />
      <span style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', fontWeight: 900, opacity: 0.6, zIndex: 2 }}>{unit}</span>
    </div>
  );

  return (
    <div style={{
      background: 'linear-gradient(135deg, #f97316, #ea580c)',
      borderRadius: '32px',
      padding: '24px',
      color: '#fff',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: '0 15px 35px rgba(249, 115, 22, 0.3)',
      maxWidth: '500px',
      margin: '0 auto'
    }}>
      {/* Background Watermark */}
      <span style={{ position: 'absolute', right: '-10px', top: '20px', fontSize: '140px', opacity: 0.15, pointerEvents: 'none', zIndex: 0 }}>
        🔦
      </span>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '50px', height: '50px', background: 'rgba(255,255,255,0.25)', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
            <Lightbulb color="#fff" size={26} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 900, fontStyle: 'italic', lineHeight: 1.1, textTransform: 'uppercase' }}>RAY TRACER</h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '10px', fontWeight: 800, opacity: 0.8, letterSpacing: '1px', textTransform: 'uppercase' }}>OPTICS ENGINE</p>
          </div>
        </div>
        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={() => { setInputs({u: '', f: '', h: '5'}); reset(); }} 
          style={{ background: '#fff', border: 'none', color: '#ea580c', width: '45px', height: '45px', borderRadius: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}
        >
          <RotateCcw size={22} strokeWidth={3} />
        </motion.button>
      </div>

      {/* Toggles */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.15)', padding: '6px', borderRadius: '18px', backdropFilter: 'blur(5px)' }}>
            <button onClick={() => { setDeviceType('mirror'); reset(); }} style={{ flex: 1, padding: '10px 0', border: 'none', borderRadius: '14px', background: deviceType === 'mirror' ? '#fff' : 'transparent', color: deviceType === 'mirror' ? '#ea580c' : '#fff', fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.2s ease', boxShadow: deviceType === 'mirror' ? '0 4px 10px rgba(0,0,0,0.1)' : 'none' }}>Mirror</button>
            <button onClick={() => { setDeviceType('lens'); reset(); }} style={{ flex: 1, padding: '10px 0', border: 'none', borderRadius: '14px', background: deviceType === 'lens' ? '#fff' : 'transparent', color: deviceType === 'lens' ? '#ea580c' : '#fff', fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.2s ease', boxShadow: deviceType === 'lens' ? '0 4px 10px rgba(0,0,0,0.1)' : 'none' }}>Lens</button>
        </div>
        <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.15)', padding: '6px', borderRadius: '18px', backdropFilter: 'blur(5px)' }}>
            <button onClick={() => { setDeviceShape('concave'); reset(); }} style={{ flex: 1, padding: '10px 0', border: 'none', borderRadius: '14px', background: deviceShape === 'concave' ? '#fff' : 'transparent', color: deviceShape === 'concave' ? '#ea580c' : '#fff', fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.2s ease', boxShadow: deviceShape === 'concave' ? '0 4px 10px rgba(0,0,0,0.1)' : 'none' }}>Concave</button>
            <button onClick={() => { setDeviceShape('convex'); reset(); }} style={{ flex: 1, padding: '10px 0', border: 'none', borderRadius: '14px', background: deviceShape === 'convex' ? '#fff' : 'transparent', color: deviceShape === 'convex' ? '#ea580c' : '#fff', fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.2s ease', boxShadow: deviceShape === 'convex' ? '0 4px 10px rgba(0,0,0,0.1)' : 'none' }}>Convex</button>
        </div>
      </div>

      {/* Interactive Visualizer Map (Accurate SVG Shapes) */}
      <div style={{ background: 'rgba(0,0,0,0.15)', borderRadius: '24px', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '112px', marginBottom: '24px', position: 'relative', zIndex: 1 }}>
         <div style={{ width: '100%', position: 'relative', height: '2px', background: 'rgba(255,255,255,0.3)' }}>
             
             {/* Device Center (SVG Rendered) */}
             <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                 {deviceType === 'lens' ? (
                     <svg width="24" height="64" viewBox="0 0 24 64" style={{ overflow: 'visible', filter: 'drop-shadow(0 0 4px rgba(251, 191, 36, 0.4))' }}>
                         {deviceShape === 'convex' ? (
                             // Convex Lens ()
                             <path d="M 12 0 Q 24 32 12 64 Q 0 32 12 0 Z" fill="rgba(251, 191, 36, 0.2)" stroke="#fbbf24" strokeWidth="2" />
                         ) : (
                             // Concave Lens ><
                             <path d="M 2 0 L 22 0 Q 12 32 22 64 L 2 64 Q 12 32 2 0 Z" fill="rgba(251, 191, 36, 0.2)" stroke="#fbbf24" strokeWidth="2" />
                         )}
                     </svg>
                 ) : (
                     <svg width="16" height="64" viewBox="0 0 16 64" style={{ overflow: 'visible', filter: 'drop-shadow(0 0 6px rgba(251, 191, 36, 0.8))' }}>
                         {deviceShape === 'concave' ? (
                             // Concave Mirror |) (Reflective surface on left, curves inwards away from obj)
                             <path d="M 2 0 Q 16 32 2 64" fill="none" stroke="#fbbf24" strokeWidth="4" strokeLinecap="round" />
                         ) : (
                             // Convex Mirror |( (Reflective surface on left, curves outwards towards obj)
                             <path d="M 14 0 Q 0 32 14 64" fill="none" stroke="#fbbf24" strokeWidth="4" strokeLinecap="round" />
                         )}
                     </svg>
                 )}
                 <span style={{ fontSize: '9px', fontWeight: 900, color: '#fbbf24', marginTop: '6px', textTransform: 'uppercase', position: 'absolute', bottom: '-26px', whiteSpace: 'nowrap' }}>{deviceShape} {deviceType}</span>
             </div>

             {/* Object Vector */}
             <div style={{ position: 'absolute', left: '15%', bottom: '0', display: 'flex', flexDirection: 'column', alignItems: 'center' }} className="animate-bounce">
                <span style={{ fontSize: '10px', fontWeight: 900, fontStyle: 'italic', color: '#fff', position: 'absolute', top: '-18px' }}>Obj</span>
                <div style={{ width: '4px', height: '32px', background: '#fff', borderRadius: '4px 4px 0 0', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: '-4px', left: '-3px', width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderBottom: '6px solid #fff' }} />
                </div>
             </div>
             
             {/* Ray line indicator */}
             <div style={{ position: 'absolute', left: '15%', top: '-32px', width: '35%', height: '1px', borderTop: '2px dashed rgba(255,255,255,0.5)' }} />
         </div>
      </div>

      {/* Input Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', marginBottom: '16px', position: 'relative', zIndex: 1 }}>
        {makeInput('Obj. Dist (u)', 'u', 'e.g. 20', 'cm', 'KEEP POSITIVE, ENGINE ADDS (-)')}
        {makeInput('Focal L. (f)', 'f', 'e.g. 15', 'cm')}
        {makeInput('Obj. Height (h)', 'h', 'opt.', 'cm')}
      </div>

      <AnimatePresence>
        {errorMsg && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <p style={{ margin: '0 0 16px 0', padding: '12px', background: 'rgba(239, 68, 68, 0.4)', borderLeft: '4px solid #ef4444', borderRadius: '8px', fontSize: '10px', fontWeight: 900, color: '#fee2e2', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'center', backdropFilter: 'blur(5px)' }}>
              {errorMsg}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button 
        whileTap={{ scale: 0.96 }}
        onClick={traceRays} 
        style={{ width: '100%', background: '#fff', color: '#ea580c', border: 'none', borderRadius: '20px', padding: '18px', fontSize: '16px', fontWeight: 900, fontStyle: 'italic', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '1px', position: 'relative', zIndex: 1, boxShadow: '0 10px 20px rgba(0,0,0,0.15)', marginBottom: '20px' }}
      >
        TRACE RAYS <Target size={20} color="#ea580c" strokeWidth={3} />
      </motion.button>

      {/* Steps List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', position: 'relative', zIndex: 1 }}>
        <AnimatePresence>
          {isFinal && steps.map((step, index) => {
            const isLast = index === steps.length - 1;
            return (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.3 }}
                style={{ 
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px', borderRadius: '20px', 
                  background: 'rgba(255,255,255,0.15)',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.2)',
                  backdropFilter: 'blur(10px)'
                }}
              >
                <span style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', opacity: 0.8, textAlign: 'center' }}>
                  {step.title}
                </span>
                <div style={{ fontSize: '20px', fontWeight: 900, fontStyle: 'italic', letterSpacing: '1px', textAlign: 'center', width: '100%' }}>
                  {step.math}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Nature of Image Dashboard */}
      <AnimatePresence>
        {isFinal && nature && (
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: steps.length * 0.3 + 0.2, type: 'spring' }}
                style={{ marginTop: '16px', padding: '20px', background: '#fff', borderRadius: '24px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', position: 'relative', zIndex: 1 }}
            >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}>
                    <Eye size={16} color="#ea580c" />
                    <h4 style={{ margin: 0, fontSize: '12px', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '1px', color: '#ea580c' }}>NATURE OF IMAGE</h4>
                    <Eye size={16} color="#ea580c" />
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    <div style={{ background: nature.real ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)', border: `1px solid ${nature.real ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)'}`, padding: '12px 4px', borderRadius: '16px', textAlign: 'center' }}>
                        <p style={{ margin: '0 0 4px 0', fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', color: nature.real ? '#10b981' : '#3b82f6' }}>Type</p>
                        <p style={{ margin: 0, fontSize: '12px', fontWeight: 900, fontStyle: 'italic', color: nature.real ? '#047857' : '#1d4ed8' }}>{nature.real ? 'REAL' : 'VIRTUAL'}</p>
                    </div>
                    <div style={{ background: nature.erect ? 'rgba(59, 130, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)', border: `1px solid ${nature.erect ? 'rgba(59, 130, 246, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`, padding: '12px 4px', borderRadius: '16px', textAlign: 'center' }}>
                        <p style={{ margin: '0 0 4px 0', fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', color: nature.erect ? '#3b82f6' : '#10b981' }}>Orient.</p>
                        <p style={{ margin: 0, fontSize: '12px', fontWeight: 900, fontStyle: 'italic', color: nature.erect ? '#1d4ed8' : '#047857' }}>{nature.erect ? 'ERECT' : 'INVERTED'}</p>
                    </div>
                    <div style={{ background: 'rgba(249, 115, 22, 0.1)', border: '1px solid rgba(249, 115, 22, 0.2)', padding: '12px 4px', borderRadius: '16px', textAlign: 'center' }}>
                        <p style={{ margin: '0 0 4px 0', fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', color: '#ea580c' }}>Size</p>
                        <p style={{ margin: 0, fontSize: '10px', fontWeight: 900, fontStyle: 'italic', color: '#c2410c' }}>{nature.magSize}</p>
                    </div>
                </div>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
