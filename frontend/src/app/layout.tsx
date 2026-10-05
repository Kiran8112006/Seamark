import type { Metadata } from 'next';
import './globals.css';
import ClientShell from '@/components/ClientShell';

export const metadata: Metadata = {
  title: 'SEAMARK — Seafloor Mineral Reconnaissance System',
  description:
    'Low-Cost Deployable Seafloor Metal Detection Sensor for Ocean Resource Exploration. SIH 2026 Problem Statement 26064. Prototype Demonstration Interface.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <ClientShell>{children}</ClientShell>
      </body>
    </html>
  );
}
