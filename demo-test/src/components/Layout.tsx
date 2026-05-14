'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 font-sans">
      <nav className="border-b border-gray-800 mb-8 bg-gray-900/50 backdrop-blur sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex gap-2 overflow-x-auto">
          <NavLink href="/" active={pathname === '/'}>1. Setup</NavLink>
          <NavLink href="/identity" active={pathname === '/identity'}>2. Identity</NavLink>
          <NavLink href="/escrow" active={pathname === '/escrow'}>3. Escrow</NavLink>
          <NavLink href="/dashboard" active={pathname === '/dashboard'}>4. Dashboard</NavLink>
        </div>
      </nav>
      
      <div className="max-w-5xl mx-auto px-6 pb-12">
        {children}
      </div>
    </div>
  );
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`px-4 py-2 border font-mono text-sm rounded cursor-pointer whitespace-nowrap transition-all ${
        active
          ? 'border-blue-600 bg-blue-600/10 text-blue-400 font-bold shadow-lg shadow-blue-500/10'
          : 'border-gray-800 bg-gray-900/80 text-gray-400 hover:border-gray-700 hover:text-gray-200'
      }`}
    >
      {children}
    </Link>
  );
}