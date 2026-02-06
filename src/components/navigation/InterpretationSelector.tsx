'use client';

import { useState, useEffect, useMemo } from 'react';
import { Filter } from 'lucide-react';

interface Interpretation {
  name?: string;
  rulename?: string;
  propertyCount: number;
  property_count?: number;
}

interface InterpretationSelectorProps {
  value: string;
  onChange: (name: string) => void;
  className?: string;
}

// Category definitions based on NASIS interpretation prefixes
const CATEGORIES = [
  { value: 'all', label: 'All Categories', prefixes: [] },
  { value: 'agriculture', label: 'Crop & Agriculture', prefixes: ['AGR', 'NCCPI', 'CPI', 'SOH', 'CPS', 'AWM'] },
  { value: 'forestry', label: 'Forestry & Timber', prefixes: ['FOR'] },
  { value: 'rangeland', label: 'Rangeland & Pasture', prefixes: ['GRL', 'FSG', 'RNG'] },
  { value: 'wetlands', label: 'Wetlands & Wildlife', prefixes: ['WLF', 'WMS'] },
  { value: 'developed', label: 'Developed & Urban', prefixes: ['ENG', 'URB', 'REC'] },
  { value: 'conservation', label: 'Natural Areas & Conservation', prefixes: ['MIL', 'BLM', 'SAS', 'CZSS', 'NPS', 'USFS', 'GNB'] },
  { value: 'specialized', label: 'Specialized Applications', prefixes: ['DHS', 'TROP', 'PFAS', 'FOTG', 'PRGM', 'SVI', 'CCH'] },
  { value: 'other', label: 'Other & State-Specific', prefixes: ['MO', 'NEIRT', 'RTF', 'Wine'] }
] as const;

function getInterpretationCategory(name: string): string {
  const nameStr = Array.isArray(name) ? name[0] : name;
  const upperName = nameStr.toUpperCase();
  
  for (const category of CATEGORIES.slice(1)) { // Skip 'all'
    for (const prefix of category.prefixes) {
      if (upperName.startsWith(prefix + ' -') || upperName.startsWith(prefix + '-')) {
        return category.value;
      }
    }
  }
  return 'other';
}

export function InterpretationSelector({ 
  value, 
  onChange, 
  className = '' 
}: InterpretationSelectorProps) {
  const [interpretations, setInterpretations] = useState<Interpretation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    async function loadInterpretations() {
      try {
        const response = await fetch('/api/interpret');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        if (data.success) {
          console.log('First interpretation raw:', JSON.stringify(data.data[0]));
          console.log('First 3 interpretations:', data.data.slice(0, 3));
          setInterpretations(data.data);
        } else {
          setError('Failed to load interpretations');
        }
      } catch (err) {
        console.error('Error loading interpretations:', err);
        setError('Error loading interpretations');
      } finally {
        setLoading(false);
      }
    }

    loadInterpretations();
  }, []);

  const filteredInterpretations = useMemo(() => {
    const filtered = interpretations.filter(interp => {
      const nameStr = interp.name || interp.rulename || 'Unknown';
      
      // Filter by category
      if (selectedCategory !== 'all') {
        const interpCategory = getInterpretationCategory(nameStr);
        if (interpCategory !== selectedCategory) {
          return false;
        }
      }
      
      // Filter by search term
      if (searchTerm) {
        return nameStr.toLowerCase().includes(searchTerm.toLowerCase());
      }
      
      return true;
    });
    
    // Sort alphabetically by name
    return filtered.sort((a, b) => {
      const nameA = (a.name || a.rulename || 'Unknown').toLowerCase();
      const nameB = (b.name || b.rulename || 'Unknown').toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [interpretations, selectedCategory, searchTerm]);

  // Get category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: interpretations.length };
    
    interpretations.forEach(interp => {
      const nameStr = interp.name || interp.rulename || 'Unknown';
      const category = getInterpretationCategory(nameStr);
      counts[category] = (counts[category] || 0) + 1;
    });
    
    return counts;
  }, [interpretations]);

  const selectedInterp = interpretations.find(i => {
    const nameStr = i.name || i.rulename || 'Unknown';
    return nameStr === value;
  });

  if (loading) {
    return (
      <div className={`${className}`}>
        <div className="animate-pulse">
          <div className="h-10 bg-gray-200 rounded-md"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className}`}>
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Select Interpretation
      </label>
      
      {/* Category Filter */}
      <div className="mb-3">
        <div className="flex items-center gap-2 mb-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <label className="text-xs font-medium text-gray-600">Filter by Category</label>
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => {
            setSelectedCategory(e.target.value);
            setSearchTerm('');
          }}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          {CATEGORIES.map(cat => (
            <option key={cat.value} value={cat.value}>
              {cat.label} {categoryCounts[cat.value] ? `(${categoryCounts[cat.value]})` : ''}
            </option>
          ))}
        </select>
      </div>
      
      {/* Selected value display */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 text-left bg-white border border-gray-300 rounded-lg shadow-sm hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {selectedInterp ? (selectedInterp.name || selectedInterp.rulename) : 'Choose an interpretation...'}
            </p>
          </div>
          <svg 
            className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-20 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-hidden">
            {/* Search */}
            <div className="p-3 border-b border-gray-200">
              <input
                type="text"
                placeholder="Search interpretations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            {/* List */}
            <div className="overflow-y-auto max-h-80">
              {filteredInterpretations.length === 0 ? (
                <div className="p-4 text-sm text-gray-500 text-center">
                  No interpretations found
                </div>
              ) : (
                <div className="py-2">
                  {filteredInterpretations.map((interp, index) => {
                    const nameStr = interp.name || interp.rulename || 'Unknown';
                    return (
                      <button
                        key={`${nameStr}-${index}`}
                        type="button"
                        onClick={() => {
                          onChange(nameStr);
                          setIsOpen(false);
                          setSearchTerm('');
                        }}
                        className={`w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors ${
                          value === nameStr ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                        }`}
                      >
                        <div className="text-sm font-medium text-gray-900">
                          {nameStr}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-gray-200 bg-gray-50">
              <p className="text-xs text-gray-600">
                Showing {filteredInterpretations.length} of {interpretations.length} interpretations
                {selectedCategory !== 'all' && (
                  <span className="ml-1">
                    in {CATEGORIES.find(c => c.value === selectedCategory)?.label}
                  </span>
                )}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
