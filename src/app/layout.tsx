import type { Metadata } from 'next';
import './globals.css';
import { LanguageProvider } from '@/contexts/language-context';

export const metadata: Metadata = {
  title: 'AromVision',
  description: 'Enterprise-grade AI quality control platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="antialiased">
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
