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
                       style={{ textDecoration: 'underline', fontWeight: 900, wordBreak: 'break-all', color: isMe ? '#fff' : '#3b82f6' }}>
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

        if (imageFile) {
            let fileToUpload = imageFile;
            try {
                const options = { maxSizeMB: 0.2, maxWidthOrHeight: 1080, useWebWorker: false };
                fileToUpload = await imageCompression(imageFile, options);
            } catch (error) {
                console.warn("Compression failed, using original file.", error);
            }
            const fileExt = fileToUpload.name.split('.').pop() || 'jpg';
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
            const { data, error } = await supabase.storage.from('chat-images').upload(fileName, fileToUpload);
            
            if (data) {
                const { data: publicUrlData } = supabase.storage.from('chat-images').getPublicUrl(fileName);
                uploadedImageUrl = publicUrlData.publicUrl;
            } else if (error) {
                alert("Image upload failed. Try again.");
                setIsUploading(false);
                return;
            }
        }

        setNewMessage(''); 
        setImageFile(null);
        setReplyingTo(null);

        const { error } = await supabase.from('global_chat').insert([{
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

        // --- TRIGGER PUSH NOTIFICATIONS ---
        if (!error) {
            try {
                const previewText = textToSend.length > 40 ? textToSend.substring(0, 40) + '...' : textToSend;

                if (textToSend.includes('@everyone')) {
                    // 1. Broadcast to Everyone
                    fetch('/api/send-push', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            broadcast: true,
                            title: '💬 Global Hub: @everyone',
                            body: `${myProfile.name}: ${previewText || 'Sent an attachment'}`,
                            url: '/ai-chat'
                        })
                    }).catch(err => console.error("Broadcast push failed:", err));
                    
                } else if (replyData?.sender_id && replyData.sender_id !== myProfile.id) {
                    // 2. Ping the specific person being replied to
                    fetch('/api/send-push', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            userId: replyData.sender_id,
                            title: '💬 New Reply',
                            body: `${myProfile.name} replied to you: ${previewText || 'Sent an attachment'}`,
                            url: '/ai-chat'
                        })
                    }).catch(err => console.error("Reply push failed:", err));
                }
            } catch (err) {
                console.error("Push error:", err);
            }
        }
        // ----------------------------------

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
        if (e.target.files && e.target.files[0]) setImageFile(e.target.files[0]);
    };

    const formatTime = (isoString: string) => {
        const date = new Date(isoString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    if (isBanned) {
        return (
            <div style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyItems: 'center', padding: '0 32px', textAlign: 'center', paddingBottom: '80px' }}>
                <div style={{ width: '80px', height: '80px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', border: '2px solid rgba(239, 68, 68, 0.2)' }}>
                    <ShieldAlert size={40} color="#ef4444" />
                </div>
                <h1 style={{ fontSize: '24px', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--text)', marginBottom: '8px' }}>Access Revoked</h1>
                <p style={{ fontSize: '14px', fontWeight: 700, color: '#64748b', marginBottom: '32px', maxWidth: '250px', lineHeight: 1.6 }}>Your chat privileges have been suspended. Contact Karan Sir.</p>
                <a href="https://wa.me/917054937918" style={{ width: '100%', maxWidth: '240px', padding: '16px', borderRadius: '24px', background: '#10b981', color: '#fff', fontSize: '14px', fontWeight: 900, textTransform: 'uppercase', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 10px 25px rgba(16, 185, 129, 0.3)' }}>Contact Admin</a>
            </div>
        );
    }

    return (
        // FIXED: Locked the main container to the viewport. No document scrolling allowed.
        <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', background: 'var(--background)', overflow: 'hidden', zIndex: 10 }}>
            
            {/* STATIC HEADER (Will not move) */}
            <div style={{ flexShrink: 0, background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', borderBottom: '1px solid var(--border)', padding: '16px 20px', paddingTop: '30px', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '18px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6', border: '1px solid #bfdbfe', flexShrink: 0 }}>
                        <MessagesSquare size={22} />
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--text)', lineHeight: 1 }}>Global Hub</h1>
                        <p style={{ margin: '4px 0 0 0', fontSize: '10px', fontWeight: 900, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            <Clock size={10} color="#3b82f6" /> Disappears in 24h
                        </p>
                    </div>
                </div>
                <div style={{ background: '#fff7ed', border: '1px solid #ffedd5', borderRadius: '12px', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#f97316' }}>
                    <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', lineHeight: 1 }}>Swipe messages to reply.</span>
                </div>
            </div>

            {/* SCROLLING MESSAGE LIST (Only this part scrolls) */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 16px 24px 16px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {messages.map((msg) => {
                    const isMe = msg.sender_id === currentUserId;
                    return (
                        <div key={msg.id} style={{ position: 'relative', display: 'flex', width: '100%', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                            
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
                                style={{ position: 'relative', display: 'flex', gap: '10px', maxWidth: '85%', flexDirection: isMe ? 'row-reverse' : 'row' }}
                            >
                                {/* Swipe Reply Icons */}
                                {!isMe && <div style={{ position: 'absolute', left: '-45px', top: '50%', transform: 'translateY(-50%)', color: '#3b82f6', opacity: 0.4 }}><Reply size={22} /></div>}
                                {isMe && <div style={{ position: 'absolute', right: '-45px', top: '50%', transform: 'translateY(-50%) rotate(180deg) scaleY(-1)', color: '#3b82f6', opacity: 0.4 }}><Reply size={22} /></div>}

                                {/* Avatar */}
                                <div style={{ flexShrink: 0, marginTop: '4px' }}>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#f1f5f9', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                        {msg.sender_avatar ? <img src={msg.sender_avatar} alt="pfp" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '10px', fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>{msg.sender_name.charAt(0)}</span>}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', padding: '0 4px', flexDirection: isMe ? 'row-reverse' : 'row' }}>
                                        <span style={{ fontSize: '10px', fontWeight: 900, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{msg.sender_name}</span>
                                        <span style={{ fontSize: '7px', fontWeight: 900, color: '#3b82f6', background: '#eff6ff', padding: '2px 6px', borderRadius: '4px', border: '1px solid #bfdbfe', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{msg.sender_batch}</span>
                                    </div>

                                    {/* Message Bubble */}
                                    <div style={{ 
                                        padding: '10px 16px', fontSize: '14px', fontWeight: 600, lineHeight: 1.5, wordBreak: 'break-word',
                                        background: isMe ? '#3b82f6' : 'var(--card)', color: isMe ? '#fff' : 'var(--text)',
                                        borderRadius: '20px', borderTopRightRadius: isMe ? '4px' : '20px', borderTopLeftRadius: !isMe ? '4px' : '20px',
                                        border: isMe ? 'none' : '1px solid var(--border)', boxShadow: '0 4px 10px rgba(0,0,0,0.03)'
                                    }}>
                                        {/* Reply Snippet */}
                                        {msg.reply_to_msg && (
                                            <div style={{ marginBottom: '8px', padding: '8px', borderRadius: '8px', borderLeft: '4px solid', borderColor: isMe ? 'rgba(255,255,255,0.4)' : '#3b82f6', background: isMe ? 'rgba(0,0,0,0.1)' : '#f8fafc', fontSize: '11px', lineHeight: 1.4 }}>
                                                <p style={{ margin: '0 0 2px 0', fontWeight: 900, textTransform: 'uppercase', fontSize: '9px', color: isMe ? 'rgba(255,255,255,0.8)' : '#64748b' }}>Replying to {msg.reply_to_name}</p>
                                                <div style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{msg.reply_to_msg}</div>
                                            </div>
                                        )}

                                        {/* Image Display */}
                                        {msg.image_url && (
                                            <div style={{ marginBottom: '8px', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.05)' }}>
                                                <img src={msg.image_url} alt="attached" style={{ width: '100%', height: 'auto', objectFit: 'cover', maxHeight: '250px' }} loading="lazy" />
                                            </div>
                                        )}

                                        {/* Text content */}
                                        {renderMessageText(msg.message, isMe)}
                                    </div>

                                    {/* Footer: Time & Unsend */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', padding: '0 4px', flexDirection: isMe ? 'row-reverse' : 'row' }}>
                                        <span style={{ fontSize: '9px', fontWeight: 800, color: '#94a3b8' }}>{formatTime(msg.created_at)}</span>
                                        {isMe && (
                                            <button onClick={() => unsendMessage(msg)} style={{ background: 'transparent', border: 'none', padding: 0, color: '#94a3b8', cursor: 'pointer' }} title="Unsend">
                                                <Trash2 size={12} />
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

            {/* STATIC INPUT AREA (Locked to the bottom of the flex container) */}
            <div style={{ flexShrink: 0, padding: '10px 20px 110px 20px', background: 'var(--background)', width: '100%' }}>
                <AnimatePresence>
                    {/* Reply Preview Box */}
                    {replyingTo && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderBottom: 'none', padding: '12px', borderTopLeftRadius: '24px', borderTopRightRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 -4px 20px rgba(0,0,0,0.05)', maxWidth: '600px', margin: '0 auto' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderLeft: '4px solid #3b82f6', paddingLeft: '12px', overflow: 'hidden' }}>
                                <Reply size={16} color="#3b82f6" style={{ flexShrink: 0 }} />
                                <div style={{ overflow: 'hidden' }}>
                                    <p style={{ margin: 0, fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', color: '#3b82f6' }}>Replying to {replyingTo.sender_name}</p>
                                    <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{replyingTo.message}</p>
                                </div>
                            </div>
                            <button onClick={() => setReplyingTo(null)} style={{ padding: '6px', background: '#f1f5f9', borderRadius: '50%', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={14} /></button>
                        </motion.div>
                    )}

                    {/* Image Preview Box */}
                    {imageFile && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} style={{ background: 'var(--card)', border: '1px solid var(--border)', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 -4px 20px rgba(0,0,0,0.05)', borderBottom: replyingTo ? '1px solid var(--border)' : 'none', borderTopLeftRadius: replyingTo ? '0' : '24px', borderTopRightRadius: replyingTo ? '0' : '24px', maxWidth: '600px', margin: '0 auto' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border)', flexShrink: 0 }}>
                                    <img src={URL.createObjectURL(imageFile)} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                                <div>
                                    <p style={{ margin: 0, fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', color: '#3b82f6' }}>Image Attached</p>
                                    <p style={{ margin: 0, fontSize: '9px', fontWeight: 800, color: '#94a3b8', maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{imageFile.name}</p>
                                </div>
                            </div>
                            <button onClick={() => setImageFile(null)} style={{ padding: '6px', background: '#f1f5f9', borderRadius: '50%', border: 'none', color: '#64748b', cursor: 'pointer', flexShrink: 0 }}><X size={14} /></button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Input Bar */}
                <form onSubmit={sendMessage} style={{ position: 'relative', width: '100%', maxWidth: '600px', margin: '0 auto', boxSizing: 'border-box' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--card)', border: '1px solid var(--border)', padding: '6px', boxShadow: '0 10px 30px rgba(0,0,0,0.08)', borderRadius: (replyingTo || imageFile) ? '0 0 24px 24px' : '28px', borderTop: (replyingTo || imageFile) ? 'none' : '1px solid var(--border)', boxSizing: 'border-box' }}>
                        
                        {/* Hidden File Input */}
                        <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageSelect} style={{ display: 'none' }} />
                        
                        <button type="button" onClick={() => fileInputRef.current?.click()} style={{ width: '44px', height: '44px', borderRadius: '18px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6', border: 'none', cursor: 'pointer', flexShrink: 0, transition: 'background 0.2s' }}>
                            <ImagePlus size={20} />
                        </button>

                        <input
                            type="text" value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder={isUploading ? "Uploading..." : "Message the hub..."}
                            disabled={isUploading}
                            style={{ flex: 1, background: 'transparent', border: 'none', padding: '12px 8px', fontSize: '16px', fontWeight: 700, outline: 'none', color: 'var(--text)', opacity: isUploading ? 0.5 : 1, minWidth: 0, boxSizing: 'border-box' }}
                        />
                        
                        <button type="submit" disabled={(!newMessage.trim() && !imageFile) || isUploading} style={{ width: '48px', height: '48px', borderRadius: '20px', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', border: 'none', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)', cursor: 'pointer', flexShrink: 0, opacity: ((!newMessage.trim() && !imageFile) || isUploading) ? 0.4 : 1, transition: 'transform 0.2s' }} onMouseDown={e => e.currentTarget.style.transform = 'scale(0.92)'} onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}>
                            {isUploading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} style={{ marginLeft: '2px' }} />}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
