'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    // This immediately sends the user to your login page
    router.replace('/login');
  }, [router]);

  return (
    <main className="h-screen bg-black flex items-center justify-center">
      {/* A simple glowing loader while it redirects */}
      <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
    </main>
  );
}
