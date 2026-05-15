'use client';
import React, { useState } from 'react';
import { Rocket, RotateCcw, Sparkles, Info, ArrowRightLeft, Settings2, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Custom Vertical Fraction Component for inline styles
const Frac = ({ n, d }: { n: React.ReactNode, d: React.ReactNode }) => (
  <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', verticalAlign: 'middle', margin: '0 4px', position: 'relative', top: '-0.1em' }}>
    <span style={{ borderBottom: '2.5px solid currentColor', padding: '0 4px', paddingBottom: '2px', lineHeight: 1 }}>{n}</span>
    <span style={{ paddingTop: '2px', padding: '0 4px', lineHeight: 1 }}>{d}</span>
  </span>
);

// Custom Outer Bracket Component
const Bracket = ({ children }: { children: React.ReactNode }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center' }}>
    <span style={{ fontSize: '24px', fontWeight: 300, margin: '0 2px', opacity: 0.7 }}>[</span>
    {children}
    <span style={{ fontSize: '24px', fontWeight: 300, margin: '0 2px', opacity: 0.7 }}>]</span>
  </span>
);

export default function KinematicsEngine() {
  const [inputs, setInputs] = useState({ s: '', u: '', v: '', a: '', t: '' });
  const [steps, setSteps] = useState<{ title: string, math: React.ReactNode }[]>([]);
  const [isFinal, setIsFinal] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Quick Converter State
  const [convVal, setConvVal] = useState('');
  const [convMode, setConvMode] = useState<'kmh_to_ms' | 'ms_to_kmh'>('kmh_to_ms');

  const reset = () => {
    setInputs({ s: '', u: '', v: '', a: '', t: '' });
    setSteps([]);
    setIsFinal(false);
    setErrorMsg('');
  };

  const updateInput = (key: string, val: string) => {
    setInputs(prev => ({ ...prev, [key]: val }));
    setIsFinal(false);
    setSteps([]);
    setErrorMsg('');
  };

  const getConvertedValue = () => {
    const num = parseFloat(convVal);
    if (isNaN(num)) return '--';
    if (convMode === 'kmh_to_ms') return (num * (5 / 18)).toFixed(2) + ' m/s';
    return (num * (18 / 5)).toFixed(2) + ' km/h';
  };

  const launchEngine = () => {
    setErrorMsg('');
    setSteps([]);
    setIsFinal(false);

    let S = parseFloat(inputs.s);
    let U = parseFloat(inputs.u);
    let V = parseFloat(inputs.v);
    let A = parseFloat(inputs.a);
    let T = parseFloat(inputs.t);

    const isK = (val: number) => !isNaN(val);
    const knownsCount = [S, U, V, A, T].filter(isK).length;

    if (knownsCount !== 3) {
      setErrorMsg("TARGET ERROR: Enter EXACTLY 3 variables to calculate the other 2.");
      return;
    }

    if (isK(T) && T < 0) {
      setErrorMsg("PHYSICS ERROR: Time (t) cannot be negative.");
      return;
    }

    let initialUnknowns: {key: string, name: string, unit: string}[] = [];
    if (!isK(S)) initialUnknowns.push({ key: 's', name: 'Displacement', unit: 'm' });
    if (!isK(U)) initialUnknowns.push({ key: 'u', name: 'Initial Vel', unit: 'm/s' });
    if (!isK(V)) initialUnknowns.push({ key: 'v', name: 'Final Vel', unit: 'm/s' });
    if (!isK(A)) initialUnknowns.push({ key: 'a', name: 'Acceleration', unit: 'm/s²' });
    if (!isK(T)) initialUnknowns.push({ key: 't', name: 'Time', unit: 's' });

    let newSteps: { title: string, math: React.ReactNode }[] = [];
    const add = (title: string, math: React.ReactNode) => newSteps.push({ title, math });

    try {
      if (!isK(V) && !isK(S)) { 
        add("Goal: Find Final Velocity (v)", <>1st Eq: v = u + at</>);
        add("Substitute Values", <>v = {U} + ({A})({T})</>);
        add("Multiply a × t", <>v = {U} + {Number((A * T).toFixed(2))}</>);
        V = U + A * T;
        add("Calculated Final Velocity", <>v = {V.toFixed(2)} m/s</>);
        
        add("Goal: Find Displacement (s)", <>2nd Eq: s = ut + <Frac n="1" d="2"/>at²</>);
        add("Substitute Values", <>s = ({U})({T}) + <Frac n="1" d="2"/>({A})({T})²</>);
        add("Calculate Inner Terms", <>s = {Number((U*T).toFixed(2))} + <Frac n="1" d="2"/>({A})({Number((T*T).toFixed(2))})</>);
        add("Multiply ½at²", <>s = {Number((U*T).toFixed(2))} + {Number((0.5*A*T*T).toFixed(2))}</>);
        S = U * T + 0.5 * A * T * T;
        add("Calculated Displacement", <>s = {S.toFixed(2)} m</>);

      } else if (!isK(A) && !isK(S)) { 
        add("Goal: Find Acceleration (a)", <>1st Eq Rearranged: a = <Frac n="v - u" d="t" /></>);
        add("Substitute Values", <>a = <Frac n={<>{V} - {U}</>} d={T} /></>);
        add("Simplify Numerator", <>a = <Frac n={Number((V - U).toFixed(2))} d={T} /></>);
        A = (V - U) / T;
        add("Calculated Acceleration", <>a = {A.toFixed(2)} m/s²</>);
        
        add("Goal: Find Displacement (s)", <>Avg Vel Eq: s = <Bracket><Frac n="u + v" d="2" /></Bracket> × t</>);
        add("Substitute Values", <>s = <Bracket><Frac n={<>{U} + {V}</>} d="2" /></Bracket> × {T}</>);
        add("Simplify Numerator", <>s = <Bracket><Frac n={Number((U + V).toFixed(2))} d="2" /></Bracket> × {T}</>);
        add("Divide by 2", <>s = {Number(((U + V) / 2).toFixed(2))} × {T}</>);
        S = ((U + V) / 2) * T;
        add("Calculated Displacement", <>s = {S.toFixed(2)} m</>);

      } else if (!isK(T) && !isK(S)) { 
        add("Goal: Find Time (t)", <>1st Eq Rearranged: t = <Frac n="v - u" d="a" /></>);
        add("Substitute Values", <>t = <Frac n={<>{V} - {U}</>} d={A} /></>);
        add("Simplify Numerator", <>t = <Frac n={Number((V - U).toFixed(2))} d={A} /></>);
        T = (V - U) / A;
        if (T < 0) throw new Error("Time is negative with these values.");
        add("Calculated Time", <>t = {T.toFixed(2)} s</>);
        
        add("Goal: Find Displacement (s)", <>3rd Eq Rearranged: s = <Frac n="v² - u²" d="2a" /></>);
        add("Substitute Values", <>s = <Frac n={<>({V})² - ({U})²</>} d={`2(${A})`} /></>);
        add("Square & Multiply Bottom", <>s = <Frac n={<>{Number((V*V).toFixed(2))} - {Number((U*U).toFixed(2))}</>} d={Number((2*A).toFixed(2))} /></>);
        add("Simplify Numerator", <>s = <Frac n={Number((V*V - U*U).toFixed(2))} d={Number((2*A).toFixed(2))} /></>);
        S = (V * V - U * U) / (2 * A);
        add("Calculated Displacement", <>s = {S.toFixed(2)} m</>);

      } else if (!isK(V) && !isK(T)) { 
        add("Goal: Find Final Velocity (v)", <>3rd Eq: v² = u² + 2as</>);
        add("Substitute Values", <>v² = ({U})² + 2({A})({S})</>);
        add("Square and Multiply", <>v² = {Number((U*U).toFixed(2))} + {Number((2*A*S).toFixed(2))}</>);
        let v2 = U * U + 2 * A * S;
        add("Sum to find v²", <>v² = {v2.toFixed(2)}</>);
        if (v2 < 0) throw new Error("Square root of a negative number (v² < 0)");
        V = Math.sqrt(v2); 
        add("Square Root to find v", <>v = &radic;{v2.toFixed(2)} = {V.toFixed(2)} m/s</>);
        
        add("Goal: Find Time (t)", <>1st Eq Rearranged: t = <Frac n="v - u" d="a" /></>);
        add("Substitute Values", <>t = <Frac n={<>{V.toFixed(2)} - {U}</>} d={A} /></>);
        add("Simplify Numerator", <>t = <Frac n={Number((V - U).toFixed(2))} d={A} /></>);
        T = (V - U) / A;
        add("Calculated Time", <>t = {T.toFixed(2)} s</>);

      } else if (!isK(U) && !isK(S)) { 
        add("Goal: Find Initial Velocity (u)", <>1st Eq Rearranged: u = v - at</>);
        add("Substitute Values", <>u = {V} - ({A})({T})</>);
        add("Multiply a × t", <>u = {V} - {Number((A*T).toFixed(2))}</>);
        U = V - A * T;
        add("Calculated Initial Velocity", <>u = {U.toFixed(2)} m/s</>);
        
        add("Goal: Find Displacement (s)", <>Rearranged 2nd Eq: s = vt - <Frac n="1" d="2" />at²</>);
        add("Substitute Values", <>s = ({V})({T}) - <Frac n="1" d="2" />({A})({T})²</>);
        add("Calculate Inner Terms", <>s = {Number((V*T).toFixed(2))} - <Frac n="1" d="2" />({A})({Number((T*T).toFixed(2))})</>);
        add("Multiply ½at²", <>s = {Number((V*T).toFixed(2))} - {Number((0.5*A*T*T).toFixed(2))}</>);
        S = V * T - 0.5 * A * T * T;
        add("Calculated Displacement", <>s = {S.toFixed(2)} m</>);

      } else if (!isK(U) && !isK(T)) { 
        add("Goal: Find Initial Velocity (u)", <>3rd Eq Rearranged: u² = v² - 2as</>);
        add("Substitute Values", <>u² = ({V})² - 2({A})({S})</>);
        let u2 = V * V - 2 * A * S;
        add("Simplify Inner Terms", <>u² = {Number((V*V).toFixed(2))} - {Number((2*A*S).toFixed(2))}</>);
        add("Subtract to find u²", <>u² = {u2.toFixed(2)}</>);
        if (u2 < 0) throw new Error("Square root of a negative number (u² < 0)");
        U = Math.sqrt(u2);
        add("Square Root to find u", <>u = &radic;{u2.toFixed(2)} = {U.toFixed(2)} m/s</>);
        
        add("Goal: Find Time (t)", <>t = <Frac n="v - u" d="a" /></>);
        add("Substitute Values", <>t = <Frac n={<>{V} - {U.toFixed(2)}</>} d={A} /></>);
        add("Simplify Numerator", <>t = <Frac n={Number((V - U).toFixed(2))} d={A} /></>);
        T = (V - U) / A;
        add("Calculated Time", <>t = {T.toFixed(2)} s</>);

      } else if (!isK(A) && !isK(V)) { 
        add("Goal: Find Acceleration (a)", <>2nd Eq Rearranged: a = <Frac n="2(s - ut)" d="t²" /></>);
        add("Substitute Values", <>a = <Frac n={<>2<Bracket>{S} - ({U})({T})</Bracket></>} d={`${T}²`} /></>);
        add("Multiply ut & Square t", <>a = <Frac n={<>2<Bracket>{S} - {Number((U*T).toFixed(2))}</Bracket></>} d={Number((T*T).toFixed(2))} /></>);
        add("Simplify Bracket", <>a = <Frac n={`2(${Number((S - U*T).toFixed(2))})`} d={Number((T*T).toFixed(2))} /></>);
        add("Simplify Numerator", <>a = <Frac n={Number((2*(S - U*T)).toFixed(2))} d={Number((T*T).toFixed(2))} /></>);
        A = 2 * (S - U * T) / (T * T);
        add("Calculated Acceleration", <>a = {A.toFixed(2)} m/s²</>);
        
        add("Goal: Find Final Velocity (v)", <>1st Eq: v = u + at</>);
        add("Substitute Values", <>v = {U} + ({A.toFixed(2)})({T})</>);
        add("Multiply a × t", <>v = {U} + {Number((A*T).toFixed(2))}</>);
        V = U + A * T;
        add("Calculated Final Velocity", <>v = {V.toFixed(2)} m/s</>);

      } else if (!isK(A) && !isK(U)) { 
        add("Goal: Find Initial Velocity (u)", <>Avg Vel Rearranged: u = <Bracket><Frac n="2s" d="t" /></Bracket> - v</>);
        add("Substitute Values", <>u = <Bracket><Frac n={`2(${S})`} d={T} /></Bracket> - {V}</>);
        add("Simplify Fraction", <>u = {Number((2*S/T).toFixed(2))} - {V}</>);
        U = (2 * S / T) - V;
        add("Calculated Initial Velocity", <>u = {U.toFixed(2)} m/s</>);
        
        add("Goal: Find Acceleration (a)", <>a = <Frac n="v - u" d="t" /></>);
        add("Substitute Values", <>a = <Frac n={<>{V} - {U.toFixed(2)}</>} d={T} /></>);
        add("Simplify Numerator", <>a = <Frac n={Number((V - U).toFixed(2))} d={T} /></>);
        A = (V - U) / T;
        add("Calculated Acceleration", <>a = {A.toFixed(2)} m/s²</>);

      } else if (!isK(V) && !isK(U)) { 
        add("Goal: Find Initial Velocity (u)", <>2nd Eq Rearranged: u = <Frac n={<>s - <Frac n="1" d="2" />at²</>} d="t" /></>);
        add("Substitute Values", <>u = <Frac n={<>{S} - <Frac n="1" d="2" />({A})({T})²</>} d={T} /></>);
        add("Square time (t²)", <>u = <Frac n={<>{S} - <Frac n="1" d="2" />({A})({Number((T*T).toFixed(2))})</>} d={T} /></>);
        add("Multiply Inner Terms", <>u = <Frac n={<>{S} - {Number((0.5*A*T*T).toFixed(2))}</>} d={T} /></>);
        add("Simplify Numerator", <>u = <Frac n={Number((S - 0.5*A*T*T).toFixed(2))} d={T} /></>);
        U = (S - 0.5 * A * T * T) / T;
        add("Calculated Initial Velocity", <>u = {U.toFixed(2)} m/s</>);
        
        add("Goal: Find Final Velocity (v)", <>v = u + at</>);
        add("Substitute Values", <>v = {U.toFixed(2)} + ({A})({T})</>);
        add("Multiply a × t", <>v = {U.toFixed(2)} + {Number((A*T).toFixed(2))}</>);
        V = U + A * T;
        add("Calculated Final Velocity", <>v = {V.toFixed(2)} m/s</>);

      } else if (!isK(A) && !isK(T)) { 
        add("Goal: Find Time (t)", <>Avg Vel Rearranged: t = <Frac n="2s" d="u + v" /></>);
        add("Substitute Values", <>t = <Frac n={`2(${S})`} d={<>{U} + {V}</>} /></>);
        add("Simplify", <>t = <Frac n={Number((2*S).toFixed(2))} d={Number((U+V).toFixed(2))} /></>);
        T = 2 * S / (U + V);
        if (T < 0) throw new Error("Time is negative with these values.");
        add("Calculated Time", <>t = {T.toFixed(2)} s</>);
        
        add("Goal: Find Acceleration (a)", <>a = <Frac n="v - u" d="t" /></>);
        add("Substitute Values", <>a = <Frac n={<>{V} - {U}</>} d={T.toFixed(2)} /></>);
        add("Simplify Numerator", <>a = <Frac n={Number((V - U).toFixed(2))} d={T.toFixed(2)} /></>);
        A = (V - U) / T;
        add("Calculated Acceleration", <>a = {A.toFixed(2)} m/s²</>);
      }
      
      const getFinalVal = (key: string) => {
        if (key === 's') return S;
        if (key === 'u') return U;
        if (key === 'v') return V;
        if (key === 'a') return A;
        if (key === 't') return T;
        return 0;
      };

      add("Target Variables Locked", (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', marginTop: '8px' }}>
           <div style={{ background: '#fff', padding: '12px 16px', borderRadius: '16px', border: '1px solid rgba(249,115,22,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '10px', fontWeight: 900, color: 'rgba(0,0,0,0.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>{initialUnknowns[0].name}</span>
              <span style={{ fontSize: '20px', fontWeight: 900, fontStyle: 'italic', color: '#ea580c' }}>{initialUnknowns[0].key} = {getFinalVal(initialUnknowns[0].key).toFixed(2)} <span style={{ fontSize: '14px' }}>{initialUnknowns[0].unit}</span></span>
           </div>
           <div style={{ background: '#fff', padding: '12px 16px', borderRadius: '16px', border: '1px solid rgba(249,115,22,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '10px', fontWeight: 900, color: 'rgba(0,0,0,0.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>{initialUnknowns[1].name}</span>
              <span style={{ fontSize: '20px', fontWeight: 900, fontStyle: 'italic', color: '#ea580c' }}>{initialUnknowns[1].key} = {getFinalVal(initialUnknowns[1].key).toFixed(2)} <span style={{ fontSize: '14px' }}>{initialUnknowns[1].unit}</span></span>
           </div>
        </div>
      ));

    } catch (e: any) {
      setErrorMsg(`PHYSICS ERROR: ${e.message}`);
      return;
    }

    setInputs({
      s: Number(S.toFixed(2)).toString(),
      u: Number(U.toFixed(2)).toString(),
      v: Number(V.toFixed(2)).toString(),
      a: Number(A.toFixed(2)).toString(),
      t: Number(T.toFixed(2)).toString()
    });

    // Framer motion sequential animation pattern
    setSteps(newSteps);
    setIsFinal(true);
  };

  const makeInput = (label: string, key: keyof typeof inputs, placeholder: string = "?", unit: string, spanAll: boolean = false) => (
    <div style={{ position: 'relative', gridColumn: spanAll ? '1 / -1' : 'span 1' }} key={key}>
      <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', fontWeight: 900, fontStyle: 'italic', color: 'rgba(255,255,255,0.9)', zIndex: 2 }}>{label}</span>
      <input 
        type="number" placeholder={placeholder} value={inputs[key]} onChange={(e) => updateInput(key, e.target.value)}
        style={{ 
          boxSizing: 'border-box',
          width: '100%', 
          background: 'rgba(255,255,255,0.15)', 
          border: '2px solid rgba(255,255,255,0.3)', 
          borderRadius: '18px', 
          padding: '14px 45px 14px 90px', 
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
        🚀
      </span>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '50px', height: '50px', background: 'rgba(255,255,255,0.25)', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
            <Rocket color="#fff" size={26} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 900, fontStyle: 'italic', lineHeight: 1.1, textTransform: 'uppercase' }}>KINEMATICS</h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '10px', fontWeight: 800, opacity: 0.8, letterSpacing: '1px', textTransform: 'uppercase' }}>PHYSICS ENGINE</p>
          </div>
        </div>
        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={reset} 
          style={{ background: '#fff', border: 'none', color: '#ea580c', width: '45px', height: '45px', borderRadius: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}
        >
          <RotateCcw size={22} strokeWidth={3} />
        </motion.button>
      </div>

      {/* QUICK CONVERTER */}
      <div style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', padding: '16px', borderRadius: '24px', marginBottom: '24px', position: 'relative', zIndex: 1, backdropFilter: 'blur(5px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Settings2 size={16} color="#fbbf24" />
          <span style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', color: '#fbbf24' }}>Quick Speed Converter</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input 
              type="number" 
              value={convVal} 
              onChange={(e) => setConvVal(e.target.value)}
              placeholder="0"
              style={{ boxSizing: 'border-box', width: '100%', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '14px', padding: '10px 40px 10px 16px', color: '#fff', fontSize: '14px', fontWeight: 900, fontStyle: 'italic', outline: 'none' }}
            />
            <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '10px', fontWeight: 900, opacity: 0.6 }}>{convMode === 'kmh_to_ms' ? 'km/h' : 'm/s'}</span>
          </div>
          <button 
            onClick={() => setConvMode(prev => prev === 'kmh_to_ms' ? 'ms_to_kmh' : 'kmh_to_ms')}
            style={{ padding: '10px', borderRadius: '14px', background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <ArrowRightLeft size={16} />
          </button>
          <div style={{ flex: 1, background: '#fff', borderRadius: '14px', padding: '10px 16px', color: '#ea580c', fontSize: '14px', fontWeight: 900, fontStyle: 'italic', textAlign: 'center', border: 'none' }}>
            {getConvertedValue()}
          </div>
        </div>
      </div>

      {/* Trajectory Visualizer */}
      <div style={{ background: 'rgba(0,0,0,0.15)', borderRadius: '24px', padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100px', marginBottom: '24px', position: 'relative', zIndex: 1 }}>
        <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.2)', borderRadius: '4px', position: 'relative', display: 'flex', alignItems: 'center' }}>
            <div style={{ position: 'absolute', left: isFinal ? '80%' : '0%', transition: 'all 1s cubic-bezier(0.4, 0, 0.2, 1)', display: 'flex', alignItems: 'center' }}>
                <Rocket size={32} color="#fff" style={{ transform: 'translateY(-50%) rotate(45deg)', filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.5))', opacity: isFinal ? 1 : 0.5 }} />
                {isFinal && <div style={{ width: '40px', height: '4px', background: 'linear-gradient(to left, #fff, transparent)', transform: 'translateY(-50%)', marginLeft: '-10px' }} />}
            </div>
            <div style={{ position: 'absolute', left: '8px', top: '16px', fontSize: '10px', fontWeight: 900, opacity: 0.6 }}>t = 0<br/>v = u</div>
            <div style={{ position: 'absolute', right: '8px', top: '16px', fontSize: '10px', fontWeight: 900, opacity: 0.6, textAlign: 'right' }}>t = {inputs.t || '?'}<br/>v = {inputs.v || '?'}</div>
        </div>
      </div>

      {/* Input Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px', position: 'relative', zIndex: 1 }}>
        {makeInput('Disp (s)', 's', '?', 'm', true)}
        {makeInput('Init V (u)', 'u', '?', 'm/s')}
        {makeInput('Fin V (v)', 'v', '?', 'm/s')}
        {makeInput('Accel (a)', 'a', '?', 'm/s²')}
        {makeInput('Time (t)', 't', '?', 's')}
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
        onClick={launchEngine} 
        style={{ width: '100%', background: '#fff', color: '#ea580c', border: 'none', borderRadius: '20px', padding: '18px', fontSize: '16px', fontWeight: 900, fontStyle: 'italic', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '1px', position: 'relative', zIndex: 1, boxShadow: '0 10px 20px rgba(0,0,0,0.15)', marginBottom: '20px' }}
      >
        LAUNCH ENGINE <Zap size={20} fill="#ea580c" />
      </motion.button>

      {/* Physics Steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', position: 'relative', zIndex: 1, marginBottom: '24px' }}>
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

      {/* Physics Glossary / Legend */}
      <div style={{ background: 'rgba(0,0,0,0.15)', padding: '20px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)', position: 'relative', zIndex: 1 }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px', color: '#fbbf24' }}>
          <Info size={16} /> Equations of Motion
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '11px', fontWeight: 900, color: 'rgba(255,255,255,0.7)' }}>
          <div><span style={{ color: '#fff', fontStyle: 'italic', fontSize: '14px' }}>s</span> = Displacement (m)</div>
          <div><span style={{ color: '#fff', fontStyle: 'italic', fontSize: '14px' }}>u</span> = Initial Vel (m/s)</div>
          <div><span style={{ color: '#fff', fontStyle: 'italic', fontSize: '14px' }}>v</span> = Final Vel (m/s)</div>
          <div><span style={{ color: '#fff', fontStyle: 'italic', fontSize: '14px' }}>a</span> = Acceleration (m/s²)</div>
          <div style={{ gridColumn: '1 / -1' }}><span style={{ color: '#fff', fontStyle: 'italic', fontSize: '14px' }}>t</span> = Time (s)</div>
        </div>
      </div>
    </div>
  );
}
