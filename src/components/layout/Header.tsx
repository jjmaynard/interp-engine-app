import Link from 'next/link';
import Image from 'next/image';

export function Header() {
  return (
    <header className="bg-blue-900 text-white shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center">
              <Image 
                src="/usda-logo-white.png" 
                alt="USDA Logo" 
                width={40} 
                height={40}
                className="object-contain"
              />
            </div>
            <div>
              <h1 className="text-xl font-bold">NRCS Soil Interpretation Engine</h1>
            </div>
          </div>
          
          <nav className="hidden md:flex items-center gap-6">
            <Link 
              href="/" 
              className="hover:text-blue-200 transition-colors"
            >
              Home
            </Link>
            <Link 
              href="/interpret" 
              className="hover:text-blue-200 transition-colors"
            >
              Interpretations
            </Link>
            <Link 
              href="/api/interpret" 
              target="_blank"
              className="hover:text-blue-200 transition-colors"
            >
              API Docs
            </Link>
          </nav>

          <button className="md:hidden text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
