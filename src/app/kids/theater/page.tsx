'use client';
import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Play, Tv, Popcorn, ChevronDown, ChevronUp, ListVideo, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type Video = { id: string; title: string; };
type Playlist = { id: string; title: string; icon: string; color: string; gradient: string; videos: Video[] };

const PLAYLISTS: Playlist[] = [
  {
    id: 'p1', title: 'Counting Numbers', icon: '🔢', color: '#0ea5e9', gradient: 'linear-gradient(135deg, #0ea5e9, #2563eb)',
    videos: [
      { id: 'ya0faqYZUfo', title: 'Learn 1 to 10 in English' },
      { id: 'EjT5SA9WrY4', title: 'Counting Numbers 1 to 10' },
      { id: 'EunRT7lhC7o', title: 'Hindi Numbers 1-10' },
      { id: '1loU56IzpjA', title: '1 to 100 in Hindi' },
      { id: 'KAZ9SeFuY20', title: 'Ginti 1 se 100 tak' },
    ]
  },
  {
    id: 'p2', title: 'Alphabets', icon: '🔤', color: '#ec4899', gradient: 'linear-gradient(135deg, #ec4899, #be123c)',
    videos: [
      { id: 'CTBW6vfuIRY', title: 'The ABC Song' },
      { id: 'x6OqsUvnDDM', title: 'ABC Song by Doggyland' },
      { id: 'Jf_1d6a6Rqo', title: 'Hindi Varnamala' },
      { id: 'WVNHRQ8v6LY', title: 'Varnamala Geet' },
      { id: 'yCjJyiqpAuU', title: 'Phonics Song' },
    ]
  },
  {
    id: 'p3', title: 'Learning Colors', icon: '🎨', color: '#8b5cf6', gradient: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
    videos: [
      { id: 'Ra5Xxrlb-kw', title: 'Let\'s Learn Colors' },
      { id: 'sAs1EWt6eLk', title: 'Learn Colors with Fruits' },
      { id: 'ft1Cr20Xdas', title: 'Colors, Numbers & Shapes' },
      { id: 'z0E228p2aE4', title: 'The Color Song for Kids' },
      { id: 'ybt2jhCQ3lA', title: 'Learn Colors with Balloons' },
    ]
  },
  {
    id: 'p4', title: 'Animal Sounds', icon: '🦁', color: '#10b981', gradient: 'linear-gradient(135deg, #10b981, #059669)',
    videos: [
      { id: 'pTrC_McU62Q', title: 'Animal Sounds for Kids' },
      { id: 'oKzgUaHuJIQ', title: 'Pets for Children' },
      { id: 'ATAaRsF80s4', title: '51 Wild & Farm Animals' },
      { id: 'wV2T-ynloCw', title: '35 Amazing Animal Sounds' },
      { id: 't99ULJjCsaM', title: 'Wheels on the Bus (Animals)' },
    ]
  },
  {
    id: 'p9', title: 'Space & Planets', icon: '🚀', color: '#4f46e5', gradient: 'linear-gradient(135deg, #4f46e5, #312e81)',
    videos: [
      { id: 'awM6BCpxRaE', title: 'The Planet Song (Solar System)' },
      { id: 'DmJfVQ7BRp0', title: '8 Planets with Lyrics' },
      { id: 'ya0faqYZUfo', title: 'Astronauts in Space' },
      { id: 'EjT5SA9WrY4', title: 'Sun, Moon, and Stars' },
      { id: 'EunRT7lhC7o', title: 'Rocket Ship Launch!' },
    ]
  }
];

export default function VideoTheater() {
  const router = useRouter();
  const [activeVideo, setActiveVideo] = useState<{video: Video, playlist: Playlist}>({
    video: PLAYLISTS[0].videos[0],
    playlist: PLAYLISTS[0]
  });
  const [expandedPlaylistId, setExpandedPlaylistId] = useState<string>(PLAYLISTS[0].id);
  const topRef = useRef<HTMLDivElement>(null);

  const handleVideoSelect = (video: Video, playlist: Playlist) => {
    setActiveVideo({ video, playlist });
    topRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#fff', overflowY: 'auto', overflowX: 'hidden', boxSizing: 'border-box', fontFamily: 'sans-serif' }}>
      <div ref={topRef} />
      
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* Ambient Orbs */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '5%', right: '-10%', width: '320px', height: '320px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.05)', filter: 'blur(60px)' }} />
        <div style={{ position: 'absolute', top: '20%', left: '-10%', width: '250px', height: '250px', borderRadius: '50%', background: 'rgba(249, 115, 22, 0.03)', filter: 'blur(60px)' }} />
      </div>

      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
        
        {/* HEADER & PLAYER (STUCK TO TOP) */}
        <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #f1f5f9', padding: '32px 20px 16px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', maxWidth: '600px', margin: '0 auto 16px' }}>
            <button 
              onClick={() => router.push('/kids')} 
              style={{ width: '45px', height: '45px', borderRadius: '14px', background: '#fff', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
            >
              <ChevronLeft size={24} strokeWidth={2.5} />
            </button>
            <div style={{ background: '#fff7ed', border: '1px solid #ffedd5', borderRadius: '14px', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b' }}>
              <Popcorn size={18} />
              <span style={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}>Theater</span>
            </div>
          </div>

          {/* PLAYER FRAME */}
          <div style={{ width: '100%', maxWidth: '600px', margin: '0 auto' }}>
            <div style={{ width: '100%', aspectRatio: '16/9', background: '#000', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.15)', border: '4px solid #fff' }}>
              <iframe
                style={{ width: '100%', height: '100%', border: 'none' }}
                src={`https://www.youtube-nocookie.com/embed/${activeVideo.video.id}?autoplay=1&modestbranding=1&rel=0&playsinline=1`}
                title={activeVideo.video.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            
            <div style={{ marginTop: '16px', padding: '0 8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <div style={{ background: activeVideo.playlist.gradient, padding: '2px 8px', borderRadius: '6px' }}>
                    <span style={{ fontSize: '9px', fontWeight: 900, color: '#fff', textTransform: 'uppercase' }}>{activeVideo.playlist.title}</span>
                </div>
                <span style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Now Playing</span>
              </div>
              <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: '#1e293b', lineHeight: 1.2 }}>
                {activeVideo.video.title}
              </h1>
            </div>
          </div>
        </div>

        {/* PLAYLISTS SECTION */}
        <div style={{ width: '100%', maxWidth: '600px', margin: '0 auto', padding: '24px 20px 100px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', opacity: 0.6 }}>
            <ListVideo size={18} color="#64748b" />
            <span style={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#64748b' }}>Video Collections</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {PLAYLISTS.map((playlist) => {
              const isExpanded = expandedPlaylistId === playlist.id;
              
              return (
                <div key={playlist.id} style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: '28px', overflow: 'hidden', boxShadow: '0 8px 20px rgba(0,0,0,0.02)' }}>
                  <button 
                    onClick={() => setExpandedPlaylistId(isExpanded ? '' : playlist.id)}
                    style={{ width: '100%', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: 'none', background: 'none', cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: playlist.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                        {playlist.icon}
                      </div>
                      <div style={{ textAlign: 'left' }}>
                        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 900, textTransform: 'uppercase', color: '#1e293b' }}>{playlist.title}</h3>
                        <p style={{ margin: 0, fontSize: '10px', fontWeight: 800, color: '#94a3b8' }}>{playlist.videos.length} VIDEOS</p>
                      </div>
                    </div>
                    <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }} 
                        animate={{ height: 'auto', opacity: 1 }} 
                        exit={{ height: 0, opacity: 0 }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', padding: '0 20px 24px' }} className="hide-scrollbar">
                          {playlist.videos.map((video) => {
                            const isPlaying = activeVideo.video.id === video.id;
                            return (
                              <button
                                key={video.id}
                                onClick={() => handleVideoSelect(video, playlist)}
                                style={{ flexShrink: 0, width: '160px', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}
                              >
                                <div style={{ 
                                  width: '100%', aspectRatio: '16/9', borderRadius: '16px', overflow: 'hidden', marginBottom: '8px', 
                                  border: isPlaying ? '3px solid #f59e0b' : '1px solid #f1f5f9',
                                  boxShadow: isPlaying ? '0 8px 20px rgba(245, 158, 11, 0.2)' : '0 4px 10px rgba(0,0,0,0.05)',
                                  position: 'relative'
                                }}>
                                  <img 
                                    src={`https://img.youtube.com/vi/${video.id}/mqdefault.jpg`} 
                                    alt={video.title} 
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                  />
                                  {!isPlaying && (
                                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                      <Play size={20} color="#fff" fill="#fff" />
                                    </div>
                                  )}
                                </div>
                                <h4 style={{ margin: 0, fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', color: isPlaying ? '#f59e0b' : '#64748b', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.3 }}>
                                  {video.title}
                                </h4>
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </div>
  );
}
