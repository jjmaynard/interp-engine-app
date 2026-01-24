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
  
  const getRatingColor = (rating: number) => {
    if (rating >= 0.9) return 'bg-green-500';
    if (rating >= 0.7) return 'bg-yellow-500';
    if (rating >= 0.4) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getRatingTextColor = (rating: number) => {
    if (rating >= 0.9) return 'text-green-700';
    if (rating >= 0.7) return 'text-yellow-700';
    if (rating >= 0.4) return 'text-orange-700';
    return 'text-red-700';
  };

  const getRatingBgColor = (rating: number) => {
    if (rating >= 0.9) return 'bg-green-50';
    if (rating >= 0.7) return 'bg-yellow-50';
    if (rating >= 0.4) return 'bg-orange-50';
    return 'bg-red-50';
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
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 text-white">
        <h2 className="text-2xl font-bold">{interpretationName}</h2>
        <p className="text-sm text-blue-100 mt-1">
          Evaluated on {new Date(result.timestamp).toLocaleString()}
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Overall Rating */}
        <div>
          <h3 className="text-lg font-semibold mb-3 text-gray-900">Overall Rating</h3>
          <div className="space-y-3">
            {/* Progress bar */}
            <div className="w-full bg-gray-200 rounded-full h-12 overflow-hidden shadow-inner">
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
                {result.ratingClass}
              </span>
            </div>
          </div>
        </div>

        {/* Input Values */}
        <div>
          <h3 className="text-lg font-semibold mb-3 text-gray-900">Input Values</h3>
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Property
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Value
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Object.entries(result.propertyValues).map(([key, value]) => (
                  <tr key={key} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                      {key}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono">
                      {value !== null ? (
                        <span className="text-gray-900">{value}</span>
                      ) : (
                        <span className="text-gray-400">N/A</span>
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
            <h3 className="text-lg font-semibold mb-3 text-gray-900">Evaluation Breakdown</h3>
            <div className="space-y-3">
              {Object.entries(result.evaluationResults).map(([key, value]) => (
                <div key={key} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 font-medium">{key}</span>
                    <span className="text-gray-900 font-semibold">
                      {(value * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
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
            background: #2563eb !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
}
