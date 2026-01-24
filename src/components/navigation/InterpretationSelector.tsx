'use client';

import { useState, useEffect } from 'react';

interface Interpretation {
  name: string;
  propertyCount: number;
}

interface InterpretationSelectorProps {
  value: string;
  onChange: (name: string) => void;
  className?: string;
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
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    async function loadInterpretations() {
      try {
        const response = await fetch('/api/interpret');
        const data = await response.json();
        
        if (data.success) {
          setInterpretations(data.data);
        } else {
          setError('Failed to load interpretations');
        }
      } catch (err) {
        setError('Error loading interpretations');
      } finally {
        setLoading(false);
      }
    }

    loadInterpretations();
  }, []);

  const filteredInterpretations = interpretations.filter(interp => {
    const nameStr = Array.isArray(interp.name) ? interp.name[0] : interp.name;
    return nameStr.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const selectedInterp = interpretations.find(i => {
    const nameStr = Array.isArray(i.name) ? i.name[0] : i.name;
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
      
      {/* Selected value display */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 text-left bg-white border border-gray-300 rounded-lg shadow-sm hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {selectedInterp ? (Array.isArray(selectedInterp.name) ? selectedInterp.name[0] : selectedInterp.name) : 'Choose an interpretation...'}
            </p>
            {selectedInterp && (
              <p className="text-xs text-gray-500 mt-1">
                {selectedInterp.propertyCount} properties required
              </p>
            )}
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
                  {filteredInterpretations.map((interp) => {
                    const nameStr = Array.isArray(interp.name) ? interp.name[0] : interp.name;
                    return (
                      <button
                        key={nameStr}
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
                        <div className="text-xs text-gray-500 mt-1">
                          {interp.propertyCount} properties
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
                {interpretations.length} interpretations available
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
