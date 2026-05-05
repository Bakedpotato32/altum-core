'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function NativeAppBehavior() {
  const pathname = usePathname();
  const [lastPress, setLastPress] = useState(0);

  useEffect(() => {
    // Only trap the back button on the main screens so they don't get stuck on sub-pages
    if (pathname === '/dashboard' || pathname === '/admin') {
      
      // Push a dummy state into the browser history to trap the back button
      window.history.pushState(null, '', window.location.href);

      const handleBackPress = () => {
        const now = new Date().getTime();
        
        // If they press back twice within 2 seconds, force close/exit the app
        if (now - lastPress < 2000) {
          window.history.go(-10); 
        } else {
          // First press: Trap them and record the time
          setLastPress(now);
          window.history.pushState(null, '', window.location.href);
        }
      };

      window.addEventListener('popstate', handleBackPress);
      return () => window.removeEventListener('popstate', handleBackPress);
    }
  }, [pathname, lastPress]);

  return null; // This is a "Ghost" component, it has no UI.
}
