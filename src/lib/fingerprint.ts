export const getDeviceId = () => {
  if (typeof window === 'undefined') return 'server';
  
  const navigator = window.navigator;
  const screen = window.screen;
  
  // Combine hardware traits into a single string
  const data = [
    navigator.userAgent,
    navigator.language,
    screen.colorDepth,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency, // CPU Cores
  ].join('|');

  // Simple hash function to turn the string into a short ID
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; 
  }
  return 'AC-' + Math.abs(hash).toString(16);
};
