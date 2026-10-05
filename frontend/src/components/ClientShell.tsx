'use client';
import { StoreProvider } from '@/store';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import DemoControls from '@/components/DemoControls';

export default function ClientShell({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      <div className="flex flex-col h-screen overflow-hidden">
        <Header />
        <DemoControls />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-auto p-4">
            {children}
          </main>
        </div>
      </div>
    </StoreProvider>
  );
}
