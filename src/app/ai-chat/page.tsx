'use client';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Zap, Loader2, Sparkles } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';

export default function AIChat() {
  const { t } = useLanguage();
  const [messages, setMessages] = useState([
    { id: 1, isGreeting: true, text: "", sender: 'ai' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');

    const chatContext = messages
      .slice(-4)
      .map(m => `${m.sender === 'user' ? 'User' : 'Altu'}: ${m.isGreeting ? t('altuGreeting') : m.text}`)
      .join('\n');

    const messageWithHistory = `Past Chat Context:\n${chatContext}\n\nCurrent Question: ${userMessage}`;

    setMessages(prev => [...prev, { id: Date.now(), isGreeting: false, text: userMessage, sender: 'user' }]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageWithHistory }),
      });

      const data = await response.json();

      if (data.text) {
        setMessages(prev => [...prev, { id: Date.now(), isGreeting: false, text: data.text, sender: 'ai' }]);
      } else {
        throw new Error("Empty response");
      }
    } catch (error) {
      console.error("Altu Error:", error);
      setMessages(prev => [...prev, { id: Date.now(), isGreeting: false, text: t('networkError'), sender: 'ai' }]);
    } finally {
      setIsLoading(false);
    }
  };return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100svh', background: 'var(--background)', overflow: 'hidden', position: 'relative' }}>

      {/* Ambient orbs */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div style={{ position: 'absolute', top: '-5%', right: '-10%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)', filter: 'blur(50px)' }} />
        <div style={{ position: 'absolute', bottom: '20%', left: '-10%', width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 70%)', filter: 'blur(50px)' }} />
      </div>

      {/* ── Message List ── */}
      <div
        ref={scrollRef}
        style={{ flex: 1, overflowY: 'auto', padding: '128px 20px 220px', display: 'flex', flexDirection: 'column', gap: 20 }}
        className="scrollbar-hide"
      >
        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            const isAI = msg.sender === 'ai';
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 14, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                style={{ display: 'flex', justifyContent: isAI ? 'flex-start' : 'flex-end' }}
              >
                <div style={{ maxWidth: '82%', position: 'relative' }}>

                  {/* AI avatar dot */}
                  {isAI && (
                    <div style={{ position: 'absolute', top: -10, left: -8, width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--background)', boxShadow: '0 4px 12px rgba(59,130,246,0.4)', zIndex: 1 }}>
                      <Bot size={13} style={{ color: '#fff' }} />
                    </div>
                  )}

                  {/* Bubble */}
                  <div style={{
                    padding: '14px 18px',
                    borderRadius: 24,
                    borderTopLeftRadius: isAI ? 6 : 24,
                    borderTopRightRadius: isAI ? 24 : 6,
                    background: isAI
                      ? 'var(--card)'
                      : 'linear-gradient(135deg, #2563eb, #3b82f6)',
                    border: isAI ? '1px solid var(--border)' : 'none',
                    boxShadow: isAI
                      ? '0 4px 20px rgba(0,0,0,0.06)'
                      : '0 8px 28px rgba(59,130,246,0.35)',
                    position: 'relative',
                    overflow: 'hidden',
                  }}>
                    {/* Shine on user bubble */}
                    {!isAI && (
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 60%)', pointerEvents: 'none' }} />
                    )}
                    <p style={{
                      fontSize: 12,
                      fontWeight: 800,
                      fontStyle: 'italic',
                      textTransform: 'uppercase',
                      letterSpacing: '0.03em',
                      lineHeight: 1.65,
                      color: isAI ? 'var(--text)' : '#fff',
                      position: 'relative',
                      zIndex: 1,
                      margin: 0,
                    }}>
                      {msg.isGreeting ? t('altuGreeting') : msg.text}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}

          {/* Typing indicator */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{ display: 'flex', justifyContent: 'flex-start' }}
            >
              <div style={{ padding: '14px 20px', borderRadius: 24, borderTopLeftRadius: 6, background: 'var(--card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <Loader2 size={14} className="animate-spin" style={{ color: '#3b82f6' }} />
                <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.25em', textTransform: 'uppercase', color: 'var(--text)', opacity: 0.4 }}>
                  {t('altuThinking')}
                </span>
                {/* Pulsing dots */}
                <div style={{ display: 'flex', gap: 3 }}>
                  {[0,1,2].map(i => (
                    <div key={i} className="animate-bounce" style={{ width: 4, height: 4, borderRadius: '50%', background: '#3b82f6', opacity: 0.6, animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>{/* ── Gradient fade at bottom ── */}
      <div
        className="fixed pointer-events-none z-10"
        style={{ bottom: 0, left: 0, right: 0, height: 200, background: 'linear-gradient(to top, var(--background) 40%, rgba(0,0,0,0) 100%)' }}
      />

      {/* ── Input Bar ── */}
      <div style={{ position: 'fixed', bottom: 112, left: 0, right: 0, padding: '0 16px', zIndex: 30 }}>
        <form
          onSubmit={handleSend}
          style={{
            display: 'flex',
            alignItems: 'center',
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 28,
            padding: '6px 6px 6px 18px',
            boxShadow: '0 8px 40px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.05)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            gap: 10,
          }}
        >
          {/* Altu icon inside input */}
          <div style={{ flexShrink: 0, width: 28, height: 28, borderRadius: 10, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={13} style={{ color: '#3b82f6' }} />
          </div>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            placeholder={isLoading ? t('altuProcessing') : t('typeDoubt')}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: 11,
              fontWeight: 800,
              fontStyle: 'italic',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--text)',
              fontFamily: 'inherit',
              padding: '12px 0',
            }}
          />

          {/* Send button */}
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="active:scale-90 transition-transform"
            style={{
              width: 46,
              height: 46,
              borderRadius: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer',
              flexShrink: 0,
              background: isLoading || !input.trim()
                ? 'rgba(128,128,128,0.1)'
                : 'linear-gradient(135deg, #2563eb, #3b82f6)',
              color: isLoading || !input.trim() ? 'rgba(128,128,128,0.4)' : '#fff',
              boxShadow: isLoading || !input.trim() ? 'none' : '0 6px 20px rgba(59,130,246,0.4)',
              transition: 'background 0.2s, box-shadow 0.2s, color 0.2s',
            }}
          >
            {isLoading
              ? <Loader2 size={17} className="animate-spin" />
              : <Zap size={19} fill="currentColor" />
            }
          </button>
        </form>
      </div>

      <style>{`
        input::placeholder { opacity: 0.3; }
      `}</style>
    </div>
  );
}