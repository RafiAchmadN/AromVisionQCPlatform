import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AromVision',
  description: 'Enterprise-grade AI quality control platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="antialiased">{children}</body>
    </html>
  );
}
