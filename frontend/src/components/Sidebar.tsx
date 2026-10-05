'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Radar,
  Radio,
  BarChart3,
  Map,
  Target,
  RotateCcw,
  Cpu,
  Box,
  ClipboardCheck,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import type { ReactNode } from 'react';

interface NavGroup {
  title: string;
  items: { label: string; href: string; icon: ReactNode }[];
}

const navigation: NavGroup[] = [
  {
    title: 'Operations',
    items: [
      { label: 'Overview', href: '/', icon: <LayoutDashboard size={15} /> },
      { label: 'Survey', href: '/survey', icon: <Radar size={15} /> },
      { label: 'Telemetry', href: '/telemetry', icon: <Radio size={15} /> },
    ],
  },
  {
    title: 'Analysis',
    items: [
      { label: 'Detection', href: '/detection', icon: <BarChart3 size={15} /> },
      { label: 'Seafloor Map', href: '/map', icon: <Map size={15} /> },
      { label: 'Targets', href: '/targets', icon: <Target size={15} /> },
      { label: 'Resurvey', href: '/resurvey', icon: <RotateCcw size={15} /> },
    ],
  },
  {
    title: 'System',
    items: [
      { label: 'Nodes', href: '/nodes', icon: <Cpu size={15} /> },
      { label: 'Integrity & Security', href: '/security', icon: <ShieldCheck size={15} /> },
      { label: '3D Sensor', href: '/sensor', icon: <Box size={15} /> },
      { label: 'Validation', href: '/validation', icon: <ClipboardCheck size={15} /> },
      { label: 'Configuration', href: '/configuration', icon: <Settings size={15} /> },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="flex flex-col bg-navy-900 text-navy-200 border-r border-navy-700 overflow-y-auto select-none"
      style={{ width: 210, minWidth: 210 }}
    >
      <nav className="flex-1 py-2">
        {navigation.map((group) => (
          <div key={group.title} className="mb-1">
            <div className="sidebar-section-title">{group.title}</div>
            {group.items.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`sidebar-link ${active ? 'active' : ''}`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-navy-800 text-[0.55rem] text-navy-500 uppercase tracking-wider">
        <div>SIH 2026 — PS 26064</div>
        <div className="mt-0.5">Simulation Data Only</div>
      </div>
    </aside>
  );
}
