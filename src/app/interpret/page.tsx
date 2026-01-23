'use client';

import { useState, useEffect } from 'react';
import type { PropertyData } from '@/lib/engine/evaluator';
import type { InterpretationResult, Property } from '@/types/interpretation';
import { InterpretationSelector } from '@/components/navigation/InterpretationSelector';
import { LoadingSkeleton, PropertyFormSkeleton } from '@/components/layout/LoadingSkeleton';

export default function InterpretPage() {
  const [selectedInterp, setSelectedInterp] = useState<string>('');
  const [requiredProps, setRequiredProps] = useState<Property[]>([]);
  const [propertyValues, setPropertyValues] = useState<PropertyData>({});
  const [result, setResult] = useState<InterpretationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load required properties when interpretation changes
  useEffect(() => {
    if (!selectedInterp) return;

    async function loadProps() {
      try {
        const response = await fetch(`/api/interpret/${selectedInterp}/properties`);
        const data = await response.json();
        
        if (data.success) {
          setRequiredProps(data.data);
          
          // Initialize property values with empty values
          const initialValues: PropertyData = {};
          data.data.forEach((prop: Property) => {
            initialValues[prop.propname] = undefined;
          });
          setPropertyValues(initialValues);
          setResult(null);
        } else {
          setError(data.error || 'Failed to load properties');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load properties');
      }
    }

    loadProps();
  }, [selectedInterp]);

  // Run evaluation
  const handleEvaluate = async () => {
    if (!selectedInterp) return;

    try {
      setError(null);
      const response = await fetch('/api/interpret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interpretationName: selectedInterp,
          propertyData: propertyValues,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setResult(data.data);
      } else {
        setError(data.error || 'Evaluation failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Evaluation failed');
    }
  };

  // Update property value
  const handlePropertyChange = (propName: string, value: string) => {
    const numValue = value === '' ? undefined : parseFloat(value);
    setPropertyValues(prev => ({
      ...prev,
      [propName]: numValue,
    }));
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Soil Interpretation Evaluator</h1>
        <p className="text-lg text-gray-600">
          Evaluate NRCS soil interpretations using property data and fuzzy logic
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <p className="font-medium">Error</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Interpretation Selection and Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Interpretation Selection */}
          <div className="p-6 bg-white rounded-lg shadow-md">
            <InterpretationSelector
              value={selectedInterp}
              onChange={setSelectedInterp}
            />
            
            {selectedInterp && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-900">
                  <span className="font-medium">Selected:</span> {selectedInterp}
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  {requiredProps.length} properties required for evaluation
                </p>
              </div>
            )}
          </div>

      {/* Property Inputs */}
      {requiredProps.length > 0 && (
        <div className="mb-8 p-6 bg-white rounded-lg shadow">
          <h2 className="text-2xl font-bold mb-4">Input Property Values</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {requiredProps.map((prop) => (
              <div key={prop.propname}>
                <label className="block text-sm font-medium mb-1">
                  {prop.propname}
                </label>
                <input
                  type="number"
                  step="any"
                  value={propertyValues[prop.propname] ?? ''}
                  onChange={(e) => handlePropertyChange(prop.propname, e.target.value)}
                  placeholder={`Enter ${prop.propname}`}
                  className="w-full p-2 border rounded"
                />
                {prop.propuom && (
                  <span className="text-xs text-gray-500">Unit: {prop.propuom}</span>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={handleEvaluate}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            Evaluate
          </button>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="mb-8 p-6 bg-white rounded-lg shadow">
          <h2 className="text-2xl font-bold mb-4">Evaluation Result</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Overall Rating</h3>
              <div className="text-4xl font-bold text-blue-600">
                {result.rating.toFixed(3)}
              </div>
              <div className="text-xl mt-2 text-gray-700">
                {result.ratingClass}
              </div>
              
              {/* Rating bar */}
              <div className="mt-4 bg-gray-200 rounded-full h-4">
                <div
                  className="bg-blue-600 h-4 rounded-full transition-all"
                  style={{ width: `${result.rating * 100}%` }}
                />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Rating Scale</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Well suited</span>
                  <span className="text-gray-500">0.9 - 1.0</span>
                </div>
                <div className="flex justify-between">
                  <span>Moderately well suited</span>
                  <span className="text-gray-500">0.7 - 0.9</span>
                </div>
                <div className="flex justify-between">
                  <span>Moderately suited</span>
                  <span className="text-gray-500">0.5 - 0.7</span>
                </div>
                <div className="flex justify-between">
                  <span>Marginally suited</span>
                  <span className="text-gray-500">0.3 - 0.5</span>
                </div>
                <div className="flex justify-between">
                  <span>Poorly suited</span>
                  <span className="text-gray-500">0.1 - 0.3</span>
                </div>
                <div className="flex justify-between">
                  <span>Not suited</span>
                  <span className="text-gray-500">0.0 - 0.1</span>
                </div>
              </div>
            </div>
          </div>

          {/* Property Values Used */}
          {Object.keys(result.propertyValues).length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2">Property Values Used</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                {Object.entries(result.propertyValues).map(([prop, value]) => (
                  <div key={prop} className="flex justify-between p-2 bg-gray-50 rounded">
                    <span className="font-medium">{prop}:</span>
                    <span>{value ?? 'N/A'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Evaluation Results */}
          {Object.keys(result.evaluationResults).length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2">Sub-Evaluation Results</h3>
              <div className="space-y-2">
                {Object.entries(result.evaluationResults).map(([evalName, rating]) => (
                  <div key={evalName} className="flex items-center gap-4">
                    <div className="flex-1 text-sm font-medium">{evalName}</div>
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full"
                        style={{ width: `${rating * 100}%` }}
                      />
                    </div>
                    <div className="w-16 text-right text-sm">{rating.toFixed(3)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Example Values */}
      <div className="p-6 bg-gray-50 rounded-lg">
        <h2 className="text-xl font-bold mb-4">Tips</h2>
        <ul className="list-disc list-inside space-y-2 text-sm text-gray-700">
          <li>Select an interpretation from the dropdown above</li>
          <li>Enter values for all required properties</li>
          <li>Click "Evaluate" to run the interpretation engine</li>
          <li>The result shows a fuzzy rating from 0 (not suited) to 1 (well suited)</li>
          <li>Sub-evaluations show how individual properties contribute to the final rating</li>
        </ul>
      </div>
    </div>
  );
}
