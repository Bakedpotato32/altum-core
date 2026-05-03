'use client';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Zap, Loader2 } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';

export default function AIChat() {
  const { t } = useLanguage();
  // We use a flag (isGreeting) instead of hardcoded text so it translates dynamically!
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
  };

  return (
    <div className="flex flex-col h-screen bg-transparent overflow-hidden">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 pt-32 pb-60 space-y-8 scrollbar-hide">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div 
              key={msg.id} 
              initial={{ opacity: 0, y: 10, scale: 0.95 }} 
              animate={{ opacity: 1, y: 0, scale: 1 }} 
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] p-5 rounded-[28px] relative shadow-xl ${
                msg.sender === 'user' 
                ? 'bg-blue-600 text-white rounded-tr-none' 
                : 'bg-[var(--card)] border border-[var(--border)] text-[var(--text)] rounded-tl-none'
              }`}>
                <p className="text-[11px] font-black italic uppercase tracking-wider leading-relaxed">
                  {msg.isGreeting ? t('altuGreeting') : msg.text}
                </p>
                {msg.sender === 'ai' && (
                  <div className="absolute -top-3 -left-2 w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center border-2 border-[var(--background)] shadow-lg">
                    <Bot size={14} className="text-white" />
                  </div>
                )}
              </div>
            </motion.div>
          ))}
          
          {isLoading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
              <div className="bg-[var(--card)] border border-[var(--border)] p-4 rounded-[20px] rounded-tl-none flex items-center gap-3">
                <Loader2 size={16} className="animate-spin text-blue-500" />
                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{t('altuThinking')}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="fixed bottom-[115px] left-0 right-0 px-6 z-30">
        <form 
          onSubmit={handleSend} 
          className="relative flex items-center bg-[var(--card)] border border-[var(--border)] rounded-[32px] p-2 pl-6 shadow-[0_20px_50px_rgba(0,0,0,0.1)] backdrop-blur-xl"
        >
          <input 
            type="text" 
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            disabled={isLoading}
            placeholder={isLoading ? t('altuProcessing') : t('typeDoubt')} 
            className="flex-1 bg-transparent border-none outline-none text-xs font-black uppercase tracking-widest text-[var(--text)] placeholder:text-zinc-600 py-4" 
          />
          <button 
            type="submit" 
            disabled={isLoading || !input.trim()}
            className={`w-12 h-12 rounded-[22px] flex items-center justify-center transition-all shadow-lg ${
              isLoading || !input.trim() ? 'bg-zinc-800 text-zinc-500' : 'bg-blue-600 text-white active:scale-90'
            }`}
          >
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Zap size={20} fill="currentColor" />}
          </button>
        </form>
      </div>
      <div className="fixed bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[var(--background)] via-[var(--background)]/90 to-transparent pointer-events-none z-10" />
    </div>
  );
}
