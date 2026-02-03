export function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-white font-semibold mb-3">About</h3>
            <p className="text-sm text-gray-400">
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
                  className="hover:text-blue-400 transition-colors"
                >
                  NRCS Web Soil Survey
                </a>
              </li>
              <li>
                <a 
                  href="https://www.nrcs.usda.gov/resources/data-and-reports/ssurgo" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-400 transition-colors"
                >
                  SSURGO Database
                </a>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-white font-semibold mb-3">Contact</h3>
            <p className="text-sm text-gray-400">
              For questions or feedback about this tool, please contact NRCS.
            </p>
          </div>
        </div>
        
        <div className="border-t border-gray-800 mt-8 pt-8 text-sm text-center text-gray-500">
          <p>
            &copy; {new Date().getFullYear()} USDA Natural Resources Conservation Service. 
            Built with Next.js and PostgreSQL.
          </p>
        </div>
      </div>
    </footer>
  );
}
