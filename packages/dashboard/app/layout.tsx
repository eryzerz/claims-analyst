import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Claims Analyst — Fraud Detection Dashboard',
  description: 'AI-powered healthcare claims fraud detection system',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-background text-foreground antialiased min-h-screen font-sans">
        {children}
      </body>
    </html>
  );
}
