'use client';

export function Footer() {
  return (
    <footer 
      className="mt-auto"
      style={{ backgroundColor: 'var(--color-slate-900)', color: 'var(--color-slate-300)' }}
    >
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-white font-semibold mb-3">About</h3>
            <p className="text-sm" style={{ color: 'var(--color-slate-400)' }}>
              The NRCS Soil Interpretation Engine evaluates soil properties using 
              fuzzy logic and hierarchical rule trees to provide interpretations 
              for land use planning.
            </p>
          </div>
          
          <div>
            <h3 className="text-white font-semibold mb-3">Resources</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a 
                  href="https://www.nrcs.usda.gov/wps/portal/nrcs/main/soils/survey/" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors"
                  style={{ color: 'var(--color-slate-400)' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-ocean-400)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-slate-400)'}
                >
                  NRCS Web Soil Survey
                </a>
              </li>
              <li>
                <a 
                  href="https://www.nrcs.usda.gov/resources/data-and-reports/ssurgo" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors"
                  style={{ color: 'var(--color-slate-400)' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-ocean-400)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-slate-400)'}
                >
                  SSURGO Database
                </a>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-white font-semibold mb-3">Contact</h3>
            <p className="text-sm" style={{ color: 'var(--color-slate-400)' }}>
              For questions or feedback about this tool, please contact NRCS.
            </p>
          </div>
        </div>
        
        <div 
          className="mt-8 pt-8 text-sm text-center"
          style={{ borderTop: '1px solid var(--color-slate-800)', color: 'var(--color-slate-500)' }}
        >
          <p>
            &copy; {new Date().getFullYear()} USDA Natural Resources Conservation Service. 
            Built with Next.js and PostgreSQL.
          </p>
        </div>
      </div>
    </footer>
  );
}
