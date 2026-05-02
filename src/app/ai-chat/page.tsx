'use client';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Zap } from 'lucide-react';

export default function AIChat() {
  const [messages, setMessages] = useState([
    { id: 1, text: "Hi there! I'm Core AI. Need help with Science or English today?", sender: 'ai' }
  ]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = { id: Date.now(), text: input, sender: 'user' };
    setMessages([...messages, userMsg]);
    setInput('');

    setTimeout(() => {
      const aiMsg = { 
        id: Date.now() + 1, 
        text: "That's a great question! Let me analyze that for you...", 
        sender: 'ai' 
      };
      setMessages(prev => [...prev, aiMsg]);
    }, 1000);
  };

  return (
    // 'relative' here allows us to pin the input box at the bottom
    <div className="relative flex flex-col h-svh bg-[#050508] overflow-hidden">
      
      {/* 1. Header Spacer */}
      <div className="h-28 flex-shrink-0" />

      {/* 2. Scrollable Chat Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-6 pt-4 pb-40 space-y-6 scroll-smooth"
      >
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] p-4 rounded-[24px] relative shadow-xl
                ${msg.sender === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-none' 
                  : 'bg-[#121215] border border-white/5 text-zinc-200 rounded-tl-none'}
              `}>
                <p className="text-sm font-medium leading-relaxed">{msg.text}</p>
                {msg.sender === 'ai' && (
                  <div className="absolute -top-3 -left-2 w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center backdrop-blur-md border border-blue-500/30">
                    <Bot size={12} className="text-blue-400" />
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* 3. PINNED Input Section (The Fix) */}
      <div className="absolute bottom-0 left-0 right-0 px-6 pb-32 pt-10 bg-gradient-to-t from-[#050508] via-[#050508] to-transparent pointer-events-none">
        <form 
          onSubmit={handleSend}
          className="relative flex items-center bg-[#111114] border border-white/10 rounded-[28px] p-2 pl-5 focus-within:border-blue-500/50 transition-all shadow-2xl pointer-events-auto"
        >
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your doubt..."
            className="flex-1 bg-transparent border-none outline-none text-sm font-bold text-white placeholder:text-zinc-700 py-3"
          />
          <button 
            type="submit"
            className="w-12 h-12 bg-blue-600 text-white rounded-[20px] flex items-center justify-center active:scale-90 transition-all"
          >
            <Zap size={20} fill="currentColor" />
          </button>
        </form>
      </div>
    </div>
  );
}
