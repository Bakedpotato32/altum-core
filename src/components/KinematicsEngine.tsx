'use client';
import React, { useState } from 'react';
import { Rocket, RotateCcw, Sparkles, Info, ArrowRightLeft, Settings2 } from 'lucide-react';

// Custom Vertical Fraction Component for beautiful Math rendering
const Frac = ({ n, d }: { n: React.ReactNode, d: React.ReactNode }) => (
  <span className="inline-flex flex-col items-center justify-center align-middle mx-1 font-black italic relative -top-[0.1em]">
    <span className="border-b-[2.5px] border-current px-1 pb-[2px] leading-none">{n}</span>
    <span className="pt-[2px] px-1 leading-none">{d}</span>
  </span>
);

// Custom Outer Bracket Component
const Bracket = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex items-center">
    <span className="text-2xl font-light mx-[2px] opacity-70">[</span>
    {children}
    <span className="text-2xl font-light mx-[2px] opacity-70">]</span>
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
      setErrorMsg("Target Error: Enter EXACTLY 3 variables to calculate the other 2.");
      return;
    }

    if (isK(T) && T < 0) {
      setErrorMsg("Physics Error: Time (t) cannot be negative.");
      return;
    }

    // Track the initially unknown variables for the final display
    let initialUnknowns: {key: string, name: string, unit: string}[] = [];
    if (!isK(S)) initialUnknowns.push({ key: 's', name: 'Displacement', unit: 'm' });
    if (!isK(U)) initialUnknowns.push({ key: 'u', name: 'Initial Vel', unit: 'm/s' });
    if (!isK(V)) initialUnknowns.push({ key: 'v', name: 'Final Vel', unit: 'm/s' });
    if (!isK(A)) initialUnknowns.push({ key: 'a', name: 'Acceleration', unit: 'm/s²' });
    if (!isK(T)) initialUnknowns.push({ key: 't', name: 'Time', unit: 's' });

    let newSteps: { title: string, math: React.ReactNode }[] = [];
    const add = (title: string, math: React.ReactNode) => newSteps.push({ title, math });

    try {
      if (!isK(V) && !isK(S)) { // Known: u, a, t
        add("Goal: Find Final Velocity (v)", <>1st Eq: v = u + at</>);
        add("Substitute Values", <>v = {U} + ({A})({T})</>);
        add("Multiply a &times; t", <>v = {U} + {Number((A * T).toFixed(2))}</>);
        V = U + A * T;
        add("Calculated Final Velocity", <>v = {V.toFixed(2)} m/s</>);
        
        add("Goal: Find Displacement (s)", <>2nd Eq: s = ut + <Frac n="1" d="2"/>at²</>);
        add("Substitute Values", <>s = ({U})({T}) + <Frac n="1" d="2"/>({A})({T})²</>);
        add("Calculate Inner Terms", <>s = {Number((U*T).toFixed(2))} + <Frac n="1" d="2"/>({A})({Number((T*T).toFixed(2))})</>);
        add("Multiply <Frac n='1' d='2'/>at²", <>s = {Number((U*T).toFixed(2))} + {Number((0.5*A*T*T).toFixed(2))}</>);
        S = U * T + 0.5 * A * T * T;
        add("Calculated Displacement", <>s = {S.toFixed(2)} m</>);

      } else if (!isK(A) && !isK(S)) { // Known: u, v, t
        add("Goal: Find Acceleration (a)", <>1st Eq Rearranged: a = <Frac n="v - u" d="t" /></>);
        add("Substitute Values", <>a = <Frac n={<>{V} - {U}</>} d={T} /></>);
        add("Simplify Numerator", <>a = <Frac n={Number((V - U).toFixed(2))} d={T} /></>);
        A = (V - U) / T;
        add("Calculated Acceleration", <>a = {A.toFixed(2)} m/s²</>);
        
        add("Goal: Find Displacement (s)", <>Average Vel Eq: s = <Bracket><Frac n="u + v" d="2" /></Bracket> &times; t</>);
        add("Substitute Values", <>s = <Bracket><Frac n={<>{U} + {V}</>} d="2" /></Bracket> &times; {T}</>);
        add("Simplify Numerator", <>s = <Bracket><Frac n={Number((U + V).toFixed(2))} d="2" /></Bracket> &times; {T}</>);
        add("Divide by 2", <>s = {Number(((U + V) / 2).toFixed(2))} &times; {T}</>);
        S = ((U + V) / 2) * T;
        add("Calculated Displacement", <>s = {S.toFixed(2)} m</>);

      } else if (!isK(T) && !isK(S)) { // Known: u, v, a
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

      } else if (!isK(V) && !isK(T)) { // Known: s, u, a
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

      } else if (!isK(U) && !isK(S)) { // Known: v, a, t
        add("Goal: Find Initial Velocity (u)", <>1st Eq Rearranged: u = v - at</>);
        add("Substitute Values", <>u = {V} - ({A})({T})</>);
        add("Multiply a &times; t", <>u = {V} - {Number((A*T).toFixed(2))}</>);
        U = V - A * T;
        add("Calculated Initial Velocity", <>u = {U.toFixed(2)} m/s</>);
        
        add("Goal: Find Displacement (s)", <>Rearranged 2nd Eq: s = vt - <Frac n="1" d="2" />at²</>);
        add("Substitute Values", <>s = ({V})({T}) - <Frac n="1" d="2" />({A})({T})²</>);
        add("Calculate Inner Terms", <>s = {Number((V*T).toFixed(2))} - <Frac n="1" d="2" />({A})({Number((T*T).toFixed(2))})</>);
        add("Multiply <Frac n='1' d='2'/>at²", <>s = {Number((V*T).toFixed(2))} - {Number((0.5*A*T*T).toFixed(2))}</>);
        S = V * T - 0.5 * A * T * T;
        add("Calculated Displacement", <>s = {S.toFixed(2)} m</>);

      } else if (!isK(U) && !isK(T)) { // Known: v, a, s
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

      } else if (!isK(A) && !isK(V)) { // Known: s, u, t
        add("Goal: Find Acceleration (a)", <>2nd Eq Rearranged: a = <Frac n="2(s - ut)" d="t²" /></>);
        add("Substitute Values", <>a = <Frac n={<>2<Bracket>{S} - ({U})({T})</Bracket></>} d={`${T}²`} /></>);
        add("Multiply ut & Square t", <>a = <Frac n={<>2<Bracket>{S} - {Number((U*T).toFixed(2))}</Bracket></>} d={Number((T*T).toFixed(2))} /></>);
        add("Simplify Bracket", <>a = <Frac n={`2(${Number((S - U*T).toFixed(2))})`} d={Number((T*T).toFixed(2))} /></>);
        add("Simplify Numerator", <>a = <Frac n={Number((2*(S - U*T)).toFixed(2))} d={Number((T*T).toFixed(2))} /></>);
        A = 2 * (S - U * T) / (T * T);
        add("Calculated Acceleration", <>a = {A.toFixed(2)} m/s²</>);
        
        add("Goal: Find Final Velocity (v)", <>1st Eq: v = u + at</>);
        add("Substitute Values", <>v = {U} + ({A.toFixed(2)})({T})</>);
        add("Multiply a &times; t", <>v = {U} + {Number((A*T).toFixed(2))}</>);
        V = U + A * T;
        add("Calculated Final Velocity", <>v = {V.toFixed(2)} m/s</>);

      } else if (!isK(A) && !isK(U)) { // Known: s, v, t
        add("Goal: Find Initial Velocity (u)", <>Average Vel Rearranged: u = <Bracket><Frac n="2s" d="t" /></Bracket> - v</>);
        add("Substitute Values", <>u = <Bracket><Frac n={`2(${S})`} d={T} /></Bracket> - {V}</>);
        add("Simplify Fraction", <>u = {Number((2*S/T).toFixed(2))} - {V}</>);
        U = (2 * S / T) - V;
        add("Calculated Initial Velocity", <>u = {U.toFixed(2)} m/s</>);
        
        add("Goal: Find Acceleration (a)", <>a = <Frac n="v - u" d="t" /></>);
        add("Substitute Values", <>a = <Frac n={<>{V} - {U.toFixed(2)}</>} d={T} /></>);
        add("Simplify Numerator", <>a = <Frac n={Number((V - U).toFixed(2))} d={T} /></>);
        A = (V - U) / T;
        add("Calculated Acceleration", <>a = {A.toFixed(2)} m/s²</>);

      } else if (!isK(V) && !isK(U)) { // Known: s, a, t
        add("Goal: Find Initial Velocity (u)", <>2nd Eq Rearranged: u = <Frac n={<>s - <Frac n="1" d="2" />at²</>} d="t" /></>);
        add("Substitute Values", <>u = <Frac n={<>{S} - <Frac n="1" d="2" />({A})({T})²</>} d={T} /></>);
        add("Square time (t²)", <>u = <Frac n={<>{S} - <Frac n="1" d="2" />({A})({Number((T*T).toFixed(2))})</>} d={T} /></>);
        add("Multiply Inner Terms", <>u = <Frac n={<>{S} - {Number((0.5*A*T*T).toFixed(2))}</>} d={T} /></>);
        add("Simplify Numerator", <>u = <Frac n={Number((S - 0.5*A*T*T).toFixed(2))} d={T} /></>);
        U = (S - 0.5 * A * T * T) / T;
        add("Calculated Initial Velocity", <>u = {U.toFixed(2)} m/s</>);
        
        add("Goal: Find Final Velocity (v)", <>v = u + at</>);
        add("Substitute Values", <>v = {U.toFixed(2)} + ({A})({T})</>);
        add("Multiply a &times; t", <>v = {U.toFixed(2)} + {Number((A*T).toFixed(2))}</>);
        V = U + A * T;
        add("Calculated Final Velocity", <>v = {V.toFixed(2)} m/s</>);

      } else if (!isK(A) && !isK(T)) { // Known: s, u, v
        add("Goal: Find Time (t)", <>Average Vel Rearranged: t = <Frac n="2s" d="u + v" /></>);
        add("Substitute Values", <>t = <Frac n={`2(${S})`} d={<>{U} + {V}</>} /></>);
        add("Simplify Top & Bottom", <>t = <Frac n={Number((2*S).toFixed(2))} d={Number((U+V).toFixed(2))} /></>);
        T = 2 * S / (U + V);
        if (T < 0) throw new Error("Time is negative with these values.");
        add("Calculated Time", <>t = {T.toFixed(2)} s</>);
        
        add("Goal: Find Acceleration (a)", <>a = <Frac n="v - u" d="t" /></>);
        add("Substitute Values", <>a = <Frac n={<>{V} - {U}</>} d={T.toFixed(2)} /></>);
        add("Simplify Numerator", <>a = <Frac n={Number((V - U).toFixed(2))} d={T.toFixed(2)} /></>);
        A = (V - U) / T;
        add("Calculated Acceleration", <>a = {A.toFixed(2)} m/s²</>);
      }
      
      // FINAL SUMMARY STEP
      const getFinalVal = (key: string) => {
        if (key === 's') return S;
        if (key === 'u') return U;
        if (key === 'v') return V;
        if (key === 'a') return A;
        if (key === 't') return T;
        return 0;
      };

      add("Target Variables Locked", (
        <div className="flex flex-col gap-3 w-full mt-2">
           <div className="bg-background px-4 py-3 rounded-xl border border-orange-500/30 flex items-center justify-between shadow-inner relative overflow-hidden">
              <span className="text-[10px] font-bold text-text/40 uppercase tracking-widest relative z-10">{initialUnknowns[0].name}</span>
              <span className="text-xl font-black italic text-orange-500 relative z-10">{initialUnknowns[0].key} = {getFinalVal(initialUnknowns[0].key).toFixed(2)} <span className="text-sm">{initialUnknowns[0].unit}</span></span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-orange-500/10 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
           </div>
           <div className="bg-background px-4 py-3 rounded-xl border border-orange-500/30 flex items-center justify-between shadow-inner relative overflow-hidden">
              <span className="text-[10px] font-bold text-text/40 uppercase tracking-widest relative z-10">{initialUnknowns[1].name}</span>
              <span className="text-xl font-black italic text-orange-500 relative z-10">{initialUnknowns[1].key} = {getFinalVal(initialUnknowns[1].key).toFixed(2)} <span className="text-sm">{initialUnknowns[1].unit}</span></span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-orange-500/10 to-transparent -translate-x-full animate-[shimmer_2s_infinite_0.5s]" />
           </div>
        </div>
      ));

    } catch (e: any) {
      setErrorMsg(`Physics Error: ${e.message}`);
      return;
    }

    setInputs({
      s: Number(S.toFixed(2)).toString(),
      u: Number(U.toFixed(2)).toString(),
      v: Number(V.toFixed(2)).toString(),
      a: Number(A.toFixed(2)).toString(),
      t: Number(T.toFixed(2)).toString()
    });

    setSteps([]);
    newSteps.forEach((step, index) => {
      setTimeout(() => {
        setSteps(prev => [...prev, step]);
        if (index === newSteps.length - 1) setIsFinal(true);
      }, (index + 1) * 600);
    });
  };

  return (
    <div className="relative rounded-3xl bg-card border border-border p-5 overflow-hidden transition-all duration-300 hover:shadow-[0_0_30px_rgba(249,115,22,0.1)] group">
      <Rocket className="absolute -right-4 -top-4 w-24 h-24 text-orange-500/5 group-hover:scale-110 group-hover:rotate-12 transition-all duration-500" />
      
      <div className="flex items-center gap-2 mb-4 relative z-10">
        <div className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)] animate-pulse" />
        <span className="text-[10px] font-extrabold tracking-[0.2em] uppercase text-orange-500">Physics Engine</span>
      </div>
      
      <div className="flex justify-between items-start mb-6 relative z-10">
        <h3 className="text-xl font-black italic uppercase tracking-[-0.02em] text-text">
          Kinematics <span className="text-orange-500">Engine</span>
        </h3>
        <button onClick={reset} className="w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center hover:bg-orange-500/10 hover:text-orange-500 transition-colors active:scale-95">
          <RotateCcw className="w-5 h-5" />
        </button>
      </div>

      {/* QUICK CONVERTER */}
      <div className="mb-6 relative z-10 p-4 rounded-2xl bg-orange-500/5 border border-orange-500/20">
        <div className="flex items-center gap-2 mb-3">
          <Settings2 className="w-4 h-4 text-orange-500" />
          <span className="text-[10px] font-black tracking-widest uppercase text-orange-500">Quick Speed Converter</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input 
              type="number" 
              value={convVal} 
              onChange={(e) => setConvVal(e.target.value)}
              placeholder="0"
              className="w-full bg-background border border-border rounded-xl pl-3 pr-12 py-2 text-sm font-bold italic outline-none focus:border-orange-500 text-text transition-colors"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-text/40">{convMode === 'kmh_to_ms' ? 'km/h' : 'm/s'}</span>
          </div>
          <button 
            onClick={() => setConvMode(prev => prev === 'kmh_to_ms' ? 'ms_to_kmh' : 'kmh_to_ms')}
            className="p-2 rounded-xl bg-background border border-border hover:bg-orange-500/10 hover:border-orange-500/50 transition-colors"
          >
            <ArrowRightLeft className="w-4 h-4 text-text/60" />
          </button>
          <div className="flex-1 bg-card border border-border rounded-xl px-3 py-2 text-sm font-bold italic text-orange-500 text-center">
            {getConvertedValue()}
          </div>
        </div>
        <p className="text-[9px] font-bold text-text/30 mt-2 text-center">Convert to <span className="text-orange-500">m/s</span> before launching!</p>
      </div>

      {/* Trajectory Visualizer */}
      <div className="mb-6 relative z-10 bg-background/50 rounded-2xl border border-border p-6 flex flex-col justify-center items-center h-28 overflow-hidden">
        <div className="w-full relative h-1 bg-border rounded-full flex items-center">
            <div className={`absolute left-0 transition-all duration-1000 ease-in-out flex items-center ${isFinal ? 'left-[80%]' : ''}`}>
                <Rocket className={`w-8 h-8 ${isFinal ? 'text-orange-500' : 'text-text/20'} rotate-45 -translate-y-1/2 drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]`} />
                {isFinal && <div className="w-12 h-1 bg-gradient-to-l from-orange-500 to-transparent -translate-y-1/2 -ml-2" />}
            </div>
            <div className="absolute left-2 top-4 text-[10px] font-bold text-text/40">t = 0<br/>v = u</div>
            <div className="absolute right-2 top-4 text-[10px] font-bold text-text/40 text-right">t = {inputs.t || '?'}<br/>v = {inputs.v || '?'}</div>
        </div>
      </div>

      {/* Input Grid */}
      <div className="grid grid-cols-2 gap-3 mb-2 relative z-10">
        <div className="flex flex-col gap-1 col-span-2">
          <label className="text-[10px] font-bold uppercase text-text/50 pl-1">Displacement (s)</label>
          <div className="relative">
            <input type="number" placeholder="?" value={inputs.s} onChange={(e) => updateInput('s', e.target.value)} className="w-full bg-background border-2 border-border rounded-xl px-4 py-3 font-black italic outline-none focus:border-orange-500 text-text transition-colors" />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-text/30">m</span>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase text-text/50 pl-1">Initial Vel (u)</label>
          <div className="relative">
            <input type="number" placeholder="?" value={inputs.u} onChange={(e) => updateInput('u', e.target.value)} className="w-full bg-background border-2 border-border rounded-xl px-4 py-3 font-black italic outline-none focus:border-orange-500 text-text transition-colors" />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-text/30">m/s</span>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase text-text/50 pl-1">Final Vel (v)</label>
          <div className="relative">
            <input type="number" placeholder="?" value={inputs.v} onChange={(e) => updateInput('v', e.target.value)} className="w-full bg-background border-2 border-border rounded-xl px-4 py-3 font-black italic outline-none focus:border-orange-500 text-text transition-colors" />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-text/30">m/s</span>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase text-text/50 pl-1">Acceleration (a)</label>
          <div className="relative">
            <input type="number" placeholder="?" value={inputs.a} onChange={(e) => updateInput('a', e.target.value)} className="w-full bg-background border-2 border-border rounded-xl px-4 py-3 font-black italic outline-none focus:border-orange-500 text-text transition-colors" />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-text/30">m/s²</span>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase text-text/50 pl-1">Time (t)</label>
          <div className="relative">
            <input type="number" placeholder="?" value={inputs.t} onChange={(e) => updateInput('t', e.target.value)} className="w-full bg-background border-2 border-border rounded-xl px-4 py-3 font-black italic outline-none focus:border-orange-500 text-text transition-colors" />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-text/30">s</span>
          </div>
        </div>
      </div>

      {errorMsg && <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest text-center mt-3 animate-bounce relative z-10">{errorMsg}</p>}

      <button onClick={launchEngine} className="w-full mt-6 mb-6 group/btn relative rounded-2xl bg-orange-500 py-4 flex items-center justify-center gap-2 overflow-hidden transition-all active:scale-[0.98] shadow-[0_4px_0_rgb(194,65,12)] hover:translate-y-[2px] active:shadow-none active:translate-y-[4px]">
        <span className="text-sm font-black italic uppercase tracking-wider text-white relative z-10 flex items-center gap-2">
           <Rocket className="w-5 h-5" /> Launch Engine
        </span>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:animate-[shimmer_1.5s_infinite]" />
      </button>

      {/* Physics Steps */}
      <div className="space-y-3 relative z-10 mb-6">
        {steps.map((step, index) => {
          const isCurrent = index === steps.length - 1;
          return (
            <div key={index} className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-500 animate-in fade-in slide-in-from-top-4
                ${isCurrent && isFinal ? 'bg-orange-500/10 border-orange-500/40 shadow-[0_0_20px_rgba(249,115,22,0.15)]' : 'bg-background border-border'}`}
            >
              <span className={`text-[10px] font-bold uppercase tracking-wider mb-2 text-center ${isCurrent && isFinal ? 'text-orange-500' : 'text-text/40'}`}>
                {step.title}
              </span>
              <div className="flex flex-col items-center justify-center w-full text-center">
                <div className={`text-lg font-black italic tracking-tight flex items-center justify-center ${isCurrent && isFinal ? 'text-orange-500 w-full' : 'text-text'}`}>
                  {step.math}
                </div>
                {isCurrent && isFinal && <Sparkles className="w-6 h-6 text-orange-500 mt-3 animate-bounce" />}
              </div>
            </div>
          );
        })}
      </div>

      {/* Physics Glossary / Legend */}
      <div className="mt-2 p-5 rounded-2xl bg-orange-500/5 border border-orange-500/20 relative z-10">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-orange-500 mb-3 flex items-center gap-2">
          <Info className="w-4 h-4" /> Equations of Motion
        </h4>
        <div className="grid grid-cols-2 gap-3 text-xs font-bold text-text/60">
          <div><span className="text-orange-500 italic text-sm">s</span> = Displacement (m)</div>
          <div><span className="text-orange-500 italic text-sm">u</span> = Initial Vel. (m/s)</div>
          <div><span className="text-orange-500 italic text-sm">v</span> = Final Vel. (m/s)</div>
          <div><span className="text-orange-500 italic text-sm">a</span> = Acceleration (m/s²)</div>
          <div className="col-span-2"><span className="text-orange-500 italic text-sm">t</span> = Time (s)</div>
        </div>
      </div>
    </div>
  );
}
