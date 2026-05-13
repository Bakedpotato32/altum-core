'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Send, ShieldAlert, Clock, MessagesSquare, AlertTriangle, 
    Reply, X, Trash2, ImagePlus, Loader2
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import imageCompression from 'browser-image-compression';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface ChatMessage {
    id: string;
    sender_id: string; 
    sender_name: string;
    sender_batch: string;
    sender_avatar: string;
    message: string;
    image_url?: string;
    created_at: string;
    reply_to_id?: string;
    reply_to_name?: string;
    reply_to_msg?: string;
}

export default function GlobalChat() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    
    const [isBanned, setIsBanned] = useState(false);
    const [myProfile, setMyProfile] = useState({ id: '', name: '', batch: '', avatar: '' });
    const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);

    const currentUserId = typeof window !== 'undefined' ? localStorage.getItem('studentId') || 'UNKNOWN' : '';
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => { scrollToBottom(); }, [messages]);

    useEffect(() => {
        if (currentUserId === 'UNKNOWN') return;

        const fetchProfile = async () => {
            const { data } = await supabase.from('students').select('name, class, avatar_url, chat_banned').eq('id', currentUserId).single();
            if (data) {
                if (data.chat_banned) setIsBanned(true);
                else setMyProfile({ id: currentUserId, name: data.name || 'Student', batch: data.class || 'Batch-1', avatar: data.avatar_url || '' });
            }
        };
        fetchProfile();

        const fetchMessages = async () => {
            const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            const { data } = await supabase.from('global_chat').select('*').gte('created_at', yesterday).order('created_at', { ascending: true });
            if (data) setMessages(data);
        };
        fetchMessages();

        const channel = supabase.channel('public:global_chat')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'global_chat' }, (payload) => {
                setMessages((prev) => [...prev, payload.new as ChatMessage]);
            })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'global_chat' }, (payload) => {
                setMessages((prev) => prev.filter(msg => msg.id !== payload.old.id));
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [currentUserId]);

    const renderMessageText = (text: string, isMe: boolean) => {
        if (!text) return null;
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const parts = text.split(urlRegex);
        
        return parts.map((part, i) => {
            if (part.match(urlRegex)) {
                return (
                    <a key={i} href={part} target="_blank" rel="noopener noreferrer" 
                       className={`underline font-black break-all ${isMe ? 'text-white hover:text-blue-200' : 'text-blue-500 hover:text-blue-600'}`}>
                        {part}
                    </a>
                );
            }
            return <span key={i}>{part}</span>;
        });
    };

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((!newMessage.trim() && !imageFile) || isBanned || isUploading) return;

        setIsUploading(true);
        const textToSend = newMessage;
        const replyData = replyingTo;
        let uploadedImageUrl = null;

        // --- BULLETPROOF IMAGE UPLOAD LOGIC ---
        if (imageFile) {
            let fileToUpload = imageFile;
            
            try {
                // Try compression without Web Worker to avoid Next.js crashes
                const options = {
                    maxSizeMB: 0.2,
                    maxWidthOrHeight: 1080,
                    useWebWorker: false 
                };
                fileToUpload = await imageCompression(imageFile, options);
            } catch (error) {
                console.warn("Compression failed, using original file.", error);
                // Fallback: If compression fails, just use the original file
            }

            // Upload the file (compressed or original)
            const fileExt = fileToUpload.name.split('.').pop() || 'jpg';
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
            
            const { data, error } = await supabase.storage.from('chat-images').upload(fileName, fileToUpload);
            
            if (data) {
                const { data: publicUrlData } = supabase.storage.from('chat-images').getPublicUrl(fileName);
                uploadedImageUrl = publicUrlData.publicUrl;
            } else if (error) {
                console.error("Upload Error:", error);
                alert("Image upload failed. Try again.");
                setIsUploading(false);
                return;
            }
        }

        setNewMessage(''); 
        setImageFile(null);
        setReplyingTo(null);

        await supabase.from('global_chat').insert([{
            sender_id: myProfile.id,
            sender_name: myProfile.name,
            sender_batch: myProfile.batch,
            sender_avatar: myProfile.avatar,
            message: textToSend,
            image_url: uploadedImageUrl,
            reply_to_id: replyData?.id || null,
            reply_to_name: replyData?.sender_name || null,
            reply_to_msg: replyData?.message || null
        }]);

        setIsUploading(false);
    };

    const unsendMessage = async (msg: ChatMessage) => {
        if (confirm("Unsend this message?")) {
            await supabase.from('global_chat').delete().eq('id', msg.id);
            
            if (msg.image_url) {
                const fileName = msg.image_url.split('/').pop();
                if (fileName) await supabase.storage.from('chat-images').remove([fileName]);
            }
        }
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setImageFile(e.target.files[0]);
        }
    };

    const formatTime = (isoString: string) => {
        const date = new Date(isoString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    if (isBanned) {
        return (
            <div className="min-h-[80vh] flex flex-col items-center justify-center px-8 text-center pb-20">
                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border-2 border-red-500/20">
                    <ShieldAlert className="w-10 h-10 text-red-500" />
                </div>
                <h1 className="text-2xl font-black italic uppercase text-text mb-2">Access Revoked</h1>
                <p className="text-sm font-bold text-zinc-500 mb-8 max-w-[250px] leading-relaxed">Your chat privileges have been suspended. Contact Karan Sir.</p>
                <a href="https://wa.me/917054937918" className="w-full max-w-[240px] py-4 rounded-2xl bg-emerald-500 text-white text-sm font-black uppercase shadow-lg flex items-center justify-center gap-2">Contact Admin</a>
            </div>
        );
    }

    return (
        <div className="relative flex flex-col min-h-full">
            
            {/* STICKY HEADER */}
            <div className="sticky top-0 z-[40] bg-background/90 backdrop-blur-xl border-b border-border px-5 py-4 mt-2">
                <div className="flex items-center gap-4 mb-3">
                    <div className="w-11 h-11 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20 shadow-inner shrink-0"><MessagesSquare size={22} /></div>
                    <div>
                        <h1 className="text-xl font-black italic uppercase tracking-tighter text-text leading-none">Global Hub</h1>
                        <p className="text-[10px] font-black text-zinc-500 flex items-center gap-1 uppercase tracking-widest mt-1"><Clock size={10} className="text-blue-500" /> Disappears in 24h</p>
                    </div>
                </div>
                <div className="bg-orange-500/5 border border-orange-500/10 rounded-xl py-2 px-3 flex items-center justify-center gap-2 text-orange-500/80">
                    <AlertTriangle size={12} className="shrink-0" /><span className="text-[8px] font-black uppercase tracking-widest leading-none text-center">Swipe messages to reply.</span>
                </div>
            </div>

            {/* MESSAGE LIST */}
            <div className="flex-1 px-4 pt-6 pb-64 space-y-6">
                {messages.map((msg) => {
                    const isMe = msg.sender_id === currentUserId;
                    return (
                        <div key={msg.id} className={`relative flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
                            
                            <motion.div 
                                drag="x"
                                dragConstraints={{ left: isMe ? -100 : 0, right: isMe ? 0 : 100 }}
                                dragSnapToOrigin={true}
                                dragElastic={0.15}
                                onDragEnd={(_, info) => {
                                    const threshold = isMe ? -60 : 60;
                                    const triggered = isMe ? info.offset.x < threshold : info.offset.x > threshold;
                                    if (triggered) {
                                        setReplyingTo(msg);
                                        if (window.navigator.vibrate) window.navigator.vibrate(10);
                                    }
                                }}
                                className={`relative flex gap-2.5 max-w-[85%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                            >
                                {/* Swipe Reply Icons */}
                                {!isMe && <div className="absolute left-[-45px] top-1/2 -translate-y-1/2 text-blue-500 opacity-40"><Reply size={22} /></div>}
                                {isMe && <div className="absolute right-[-45px] top-1/2 -translate-y-1/2 text-blue-500 opacity-40"><Reply size={22} className="-scale-x-100" /></div>}

                                <div className="shrink-0 mt-1">
                                    <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center overflow-hidden shadow-sm">
                                        {msg.sender_avatar ? <img src={msg.sender_avatar} alt="pfp" className="w-full h-full object-cover" /> : <span className="text-[10px] font-black text-zinc-500 uppercase">{msg.sender_name.charAt(0)}</span>}
                                    </div>
                                </div>

                                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                    <div className={`flex items-center gap-2 mb-1 px-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                        <span className="text-[10px] font-black text-text uppercase tracking-tight">{msg.sender_name}</span>
                                        <span className="text-[7px] font-black text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/10 uppercase tracking-tighter">{msg.sender_batch}</span>
                                    </div>

                                    <div className={`px-4 py-2.5 shadow-sm text-sm font-medium leading-relaxed break-words rounded-2xl ${isMe ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-card border border-border text-text rounded-tl-sm'}`}>
                                        
                                        {/* Reply Snippet */}
                                        {msg.reply_to_msg && (
                                            <div className={`mb-2 p-2 rounded-lg border-l-4 text-[11px] leading-snug line-clamp-2 ${isMe ? 'bg-black/20 border-white/40 text-white/80' : 'bg-zinc-500/10 border-blue-500 text-zinc-400'}`}>
                                                <p className="font-black uppercase text-[9px] mb-0.5">Replying to {msg.reply_to_name}</p>
                                                {msg.reply_to_msg}
                                            </div>
                                        )}

                                        {/* Image Display */}
                                        {msg.image_url && (
                                            <div className="mb-2 max-w-full rounded-xl overflow-hidden border border-black/10">
                                                <img src={msg.image_url} alt="attached" className="w-full h-auto object-cover max-h-[250px]" loading="lazy" />
                                            </div>
                                        )}

                                        {/* Text with Clickable Links */}
                                        {renderMessageText(msg.message, isMe)}
                                    </div>

                                    {/* Footer: Time & Unsend */}
                                    <div className={`flex items-center gap-2 mt-1 px-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                        <span className="text-[8px] font-bold text-zinc-500 opacity-60">{formatTime(msg.created_at)}</span>
                                        {isMe && (
                                            <button onClick={() => unsendMessage(msg)} className="text-zinc-500 hover:text-red-500 transition-colors" title="Unsend">
                                                <Trash2 size={10} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* INPUT AREA + PREVIEWS */}
            <div className="fixed bottom-[115px] left-5 right-5 z-[60]">
                <AnimatePresence>
                    
                    {/* Reply Preview Box */}
                    {replyingTo && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="bg-card/95 backdrop-blur-md border-2 border-border border-b-0 p-3 rounded-t-2xl flex items-center justify-between shadow-lg">
                            <div className="flex items-center gap-3 border-l-4 border-blue-500 pl-3 overflow-hidden">
                                <Reply size={14} className="text-blue-500 shrink-0" />
                                <div className="overflow-hidden">
                                    <p className="text-[9px] font-black uppercase text-blue-500">Replying to {replyingTo.sender_name}</p>
                                    <p className="text-xs font-bold text-zinc-400 truncate">{replyingTo.message}</p>
                                </div>
                            </div>
                            <button onClick={() => setReplyingTo(null)} className="p-1.5 bg-zinc-800 rounded-full text-zinc-400 hover:text-white"><X size={14} /></button>
                        </motion.div>
                    )}

                    {/* Image Preview Box */}
                    {imageFile && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className={`bg-card/95 backdrop-blur-md border-2 border-border p-3 flex items-center justify-between shadow-lg ${replyingTo ? 'border-y-0' : 'border-b-0 rounded-t-2xl'}`}>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg overflow-hidden border border-border shrink-0">
                                    <img src={URL.createObjectURL(imageFile)} alt="preview" className="w-full h-full object-cover" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase text-blue-500">Image Attached</p>
                                    <p className="text-[9px] font-bold text-zinc-500 truncate max-w-[150px]">{imageFile.name}</p>
                                </div>
                            </div>
                            <button onClick={() => setImageFile(null)} className="p-1.5 bg-zinc-800 rounded-full text-zinc-400 hover:text-white shrink-0"><X size={14} /></button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Input Bar */}
                <form onSubmit={sendMessage} className="relative group max-w-xl mx-auto">
                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl blur opacity-20 group-focus-within:opacity-40 transition-opacity" />
                    <div className={`relative flex items-center gap-1.5 bg-card border-2 border-border p-1.5 shadow-2xl transition-all ${replyingTo || imageFile ? 'rounded-b-[1.5rem] border-t-0' : 'rounded-[1.5rem]'}`}>
                        
                        {/* Hidden File Input */}
                        <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageSelect} className="hidden" />
                        
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="w-11 h-11 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 hover:bg-blue-500/20 transition-colors shrink-0">
                            <ImagePlus size={18} />
                        </button>

                        <input
                            type="text" value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder={isUploading ? "Uploading..." : "Message the hub..."}
                            disabled={isUploading}
                            className="flex-1 w-full bg-transparent pl-2 pr-2 py-3 text-sm font-bold placeholder:text-zinc-500 outline-none text-text disabled:opacity-50"
                        />
                        
                        <button type="submit" disabled={(!newMessage.trim() && !imageFile) || isUploading} className="w-12 h-11 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg active:scale-90 transition-all disabled:opacity-30 shrink-0">
                            {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Send size={18} className="ml-0.5" />}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
