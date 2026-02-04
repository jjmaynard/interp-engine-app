'use client';

import { useEffect } from 'react';
import type { InterpretationResult } from '@/types/interpretation';

interface InterpretationResultDisplayProps {
  result: InterpretationResult;
  interpretationName: string;
}

export function InterpretationResultDisplay({
  result,
  interpretationName,
}: InterpretationResultDisplayProps) {
  
  useEffect(() => {
    console.log('[ResultDisplay] Component rendered with result:', {
      rating: result.rating,
      ratingClass: result.ratingClass,
      timestamp: result.timestamp,
      evaluationResultsCount: Object.keys(result.evaluationResults || {}).length
    });
  }, [result]);
  
  // Determine if this is a productivity/suitability interpretation (higher is better)
  // vs a limitation/hazard interpretation (lower is better)
  const isProductivityType = () => {
    const name = interpretationName.toUpperCase();
    
    // Productivity/Suitability types (higher rating = better = green)
    const productivityPrefixes = [
      'NCCPI', 'CPI', 'SQI', 'SOH', // Productivity indices
      'AGR -  SQI', 'AGR - SQI', // Soil Quality Index
      'SUITABILITY', 'PRODUCTIVITY', 'INDEX',
      'YIELD', 'POTENTIAL', 'QUALITY'
    ];
    
    return productivityPrefixes.some(prefix => name.includes(prefix));
  };
  
  const isProductivity = isProductivityType();
  
  const getRatingColor = (rating: number) => {
    if (isProductivity) {
      // For productivity/suitability: high = green, low = red
      if (rating >= 0.9) return 'bg-green-500';
      if (rating >= 0.7) return 'bg-yellow-500';
      if (rating >= 0.4) return 'bg-orange-500';
      return 'bg-red-500';
    } else {
      // For limitations/hazards: low = green, high = red
      if (rating >= 0.9) return 'bg-red-500';
      if (rating >= 0.7) return 'bg-orange-500';
      if (rating >= 0.4) return 'bg-yellow-500';
      return 'bg-green-500';
    }
  };

  const getRatingTextColor = (rating: number) => {
    if (isProductivity) {
      if (rating >= 0.9) return 'text-green-700';
      if (rating >= 0.7) return 'text-yellow-700';
      if (rating >= 0.4) return 'text-orange-700';
      return 'text-red-700';
    } else {
      if (rating >= 0.9) return 'text-red-700';
      if (rating >= 0.7) return 'text-orange-700';
      if (rating >= 0.4) return 'text-yellow-700';
      return 'text-green-700';
    }
  };

  const getRatingBgColor = (rating: number) => {
    if (isProductivity) {
      if (rating >= 0.9) return 'bg-green-50';
      if (rating >= 0.7) return 'bg-yellow-50';
      if (rating >= 0.4) return 'bg-orange-50';
      return 'bg-red-50';
    } else {
      if (rating >= 0.9) return 'bg-red-50';
      if (rating >= 0.7) return 'bg-orange-50';
      if (rating >= 0.4) return 'bg-yellow-50';
      return 'bg-green-50';
    }
  };

  // Get appropriate rating class label based on interpretation type
  const getRatingClassLabel = () => {
    if (isProductivity) {
      // For productivity/suitability: higher is better
      if (result.rating >= 0.9) return 'Very High';
      if (result.rating >= 0.7) return 'High';
      if (result.rating >= 0.4) return 'Moderate';
      if (result.rating >= 0.1) return 'Low';
      return 'Very Low';
    } else {
      // For limitations/hazards: use standard NRCS classes
      return result.ratingClass;
    }
  };

  const exportAsJSON = () => {
    const dataStr = JSON.stringify(result, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `interpretation_${interpretationName.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const exportAsCSV = () => {
    // Create CSV content
    const rows = [
      ['Property', 'Value'],
      ...Object.entries(result.propertyValues).map(([key, value]) => [
        key,
        value !== null ? value.toString() : 'N/A'
      ]),
      [],
      ['Overall Rating', result.rating.toString()],
      ['Rating Class', result.ratingClass],
      ['Timestamp', result.timestamp.toISOString()],
    ];

    const csvContent = rows.map(row => row.join(',')).join('\n');
    const dataUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
    const exportFileDefaultName = `interpretation_${interpretationName.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.csv`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return (
    <div className="rounded-lg shadow-lg overflow-hidden" style={{ backgroundColor: '#FFFFFF' }}>
      {/* Header */}
      <div 
        className="px-6 py-4 text-white"
        style={{ background: 'linear-gradient(to right, var(--color-lavender-500), var(--color-lavender-600))' }}
      >
        <h2 className="text-2xl font-bold">{interpretationName}</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--color-lavender-100)' }}>
          Evaluated on {new Date(result.timestamp).toLocaleString()}
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Overall Rating */}
        <div>
          <h3 className="text-lg font-semibold mb-3" style={{ color: 'var(--color-charcoal-900)' }}>Overall Rating</h3>
          <div className="space-y-3">
            {/* Progress bar */}
            <div className="w-full rounded-full h-12 overflow-hidden shadow-inner" style={{ backgroundColor: 'var(--color-slate-200)' }}>
              <div
                className={`h-12 rounded-full ${getRatingColor(result.rating)} flex items-center justify-end pr-4 transition-all duration-700 ease-out`}
                style={{ width: `${Math.max(result.rating * 100, 3)}%` }}
              >
                <span className="text-white font-bold text-lg drop-shadow">
                  {(result.rating * 100).toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Rating class badge */}
            <div className={`inline-flex items-center px-4 py-2 rounded-full ${getRatingBgColor(result.rating)}`}>
              <span className={`text-sm font-semibold ${getRatingTextColor(result.rating)} uppercase tracking-wide`}>
                {getRatingClassLabel()}
              </span>
            </div>
          </div>
        </div>

        {/* Input Values */}
        <div>
          <h3 className="text-lg font-semibold mb-3" style={{ color: 'var(--color-charcoal-900)' }}>Input Values</h3>
          <div className="overflow-x-auto rounded-lg" style={{ border: '1px solid var(--color-slate-200)' }}>
            <table className="min-w-full" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead style={{ backgroundColor: 'var(--color-slate-50)' }}>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--color-slate-600)', borderBottom: '1px solid var(--color-slate-200)' }}>
                    Property
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--color-slate-600)', borderBottom: '1px solid var(--color-slate-200)' }}>
                    Value
                  </th>
                </tr>
              </thead>
              <tbody style={{ backgroundColor: '#FFFFFF' }}>
                {Object.entries(result.propertyValues).map(([key, value]) => (
                  <tr key={key} className="transition-colors" style={{ borderBottom: '1px solid var(--color-slate-200)' }}>
                    <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--color-charcoal-800)' }}>
                      {key}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono">
                      {value !== null ? (
                        <span style={{ color: 'var(--color-charcoal-900)' }}>{value}</span>
                      ) : (
                        <span style={{ color: 'var(--color-slate-400)' }}>N/A</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Evaluation Breakdown */}
        {result.evaluationResults && Object.keys(result.evaluationResults).length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3" style={{ color: 'var(--color-charcoal-900)' }}>Evaluation Breakdown</h3>
            <div className="space-y-3">
              {Object.entries(result.evaluationResults)
                .filter(([key]) => isNaN(Number(key))) // Filter out numeric keys (evaliid)
                .map(([key, value]) => (
                <div key={key} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium" style={{ color: 'var(--color-slate-700)' }}>{key}</span>
                    <span className="font-semibold" style={{ color: 'var(--color-charcoal-900)' }}>
                      {(value * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full rounded-full h-2 overflow-hidden" style={{ backgroundColor: 'var(--color-slate-200)' }}>
                    <div
                      className={`h-2 rounded-full ${getRatingColor(value)} transition-all duration-500`}
                      style={{ width: `${value * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
          <button
            onClick={exportAsJSON}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export JSON
          </button>
          
          <button
            onClick={exportAsCSV}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export CSV
          </button>
          
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print
          </button>
        </div>
      </div>

      {/* Print styles */}
      <style jsx>{`
        @media print {
          .bg-gradient-to-r {
            background: var(--color-lavender-600) !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
}
