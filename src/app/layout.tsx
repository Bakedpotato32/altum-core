import "./globals.css";
import ClientLayout from "./ClientLayout";
import Script from "next/script";

export const metadata = {
  title: 'AltumCore',
  description: 'AltumCore Educational Portal',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, viewport-fit=cover, status-bar-style=black-translucent" />
        <meta name="theme-color" content="#f8fafc" />
        <Script src="https://cdn.tailwindcss.com" strategy="beforeInteractive" />
      </head>
      <body className="antialiased font-sans overscroll-none touch-manipulation" suppressHydrationWarning>
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}
