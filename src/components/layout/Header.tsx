'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Sprout } from 'lucide-react';

export function Header() {
  return (
    <header 
      className="text-white shadow-xl"
      style={{
        backgroundColor: 'var(--color-ocean-900)',
      }}
    >
      <div className="container mx-auto px-4 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 flex items-center justify-center bg-white/15 rounded-xl backdrop-blur-sm border border-white/20 shadow-lg">
              <Image 
                src="/usda-logo-white.png" 
                alt="USDA Logo" 
                width={42} 
                height={42}
                className="object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="bg-white/10 backdrop-blur-sm rounded-full px-2.5 py-0.5 border border-white/20">
                  <div className="flex items-center gap-1.5">
                    <Image 
                      src="/nrcs.png" 
                      alt="NRCS" 
                      width={14} 
                      height={14}
                      className="object-contain"
                    />
                    <span className="text-xs font-bold tracking-wider" style={{ color: 'var(--color-ocean-50)' }}>
                      NRCS
                    </span>
                  </div>
                </div>
              </div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight" style={{ letterSpacing: '-0.01em' }}>
                Soil Interpretation Engine
              </h1>
            </div>
          </div>
          
          <nav className="hidden md:flex items-center gap-2">
            <Link 
              href="/" 
              className="text-sm font-medium px-4 py-2 rounded-lg transition-all"
              style={{ color: 'var(--color-ocean-100)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.color = '#ffffff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--color-ocean-100)';
              }}
            >
              Home
            </Link>
            <Link 
              href="/interpret" 
              className="text-sm font-medium px-4 py-2 rounded-lg transition-all"
              style={{ color: 'var(--color-ocean-100)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.color = '#ffffff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--color-ocean-100)';
              }}
            >
              Interpretations
            </Link>
            <Link 
              href="/api/interpret" 
              target="_blank"
              className="text-sm font-medium px-4 py-2 rounded-lg transition-all"
              style={{ color: 'var(--color-ocean-100)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.color = '#ffffff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--color-ocean-100)';
              }}
            >
              API Docs
            </Link>
          </nav>

          <button className="md:hidden text-white hover:text-white/80 transition-colors p-2 rounded-lg hover:bg-white/10">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
