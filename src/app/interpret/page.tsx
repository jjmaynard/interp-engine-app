'use client';

import { useState, useEffect } from 'react';
import type { InterpretationResult, Property, RuleNode } from '@/types/interpretation';
import { InterpretationSelector } from '@/components/navigation/InterpretationSelector';
import { PropertyFormSkeleton } from '@/components/layout/LoadingSkeleton';
import { PropertyInputForm } from '@/components/forms/PropertyInputForm';
import { InterpretationResultDisplay } from '@/components/results/InterpretationResult';
import { RuleTreeVisualization } from '@/components/visualization/RuleTreeVisualization';

export default function InterpretPage() {
  const [selectedInterp, setSelectedInterp] = useState<string>('');
  const [requiredProps, setRequiredProps] = useState<Property[]>([]);
  const [ruleTree, setRuleTree] = useState<RuleNode[]>([]);
  const [result, setResult] = useState<InterpretationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingProps, setLoadingProps] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load required properties when interpretation changes
  useEffect(() => {
    if (!selectedInterp) {
      setRequiredProps([]);
      setRuleTree([]);
      setResult(null);
      return;
    }

    async function loadProperties() {
      setLoadingProps(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/interpret/${encodeURIComponent(selectedInterp)}`);
        const data = await response.json();
        
        if (data.success && data.data.properties) {
          setRequiredProps(data.data.properties);
          setRuleTree(data.data.tree || []);
          setResult(null);
        } else {
          setError(data.error || 'Failed to load properties');
          setRequiredProps([]);
          setRuleTree([]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load properties');
        setRequiredProps([]);
        setRuleTree([]);
      } finally {
        setLoadingProps(false);
      }
    }
    
    loadProperties();
  }, [selectedInterp]);

  // Handle evaluation
  const handleEvaluate = async (propertyValues: Record<string, number | null>) => {
    if (!selectedInterp) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `/api/interpret/${encodeURIComponent(selectedInterp)}/evaluate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ properties: propertyValues }),
        }
      );
      
      const data = await response.json();
      
      if (data.success) {
        setResult(data.data);
      } else {
        setError(data.error || 'Evaluation failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Evaluation failed');
    } finally {
      setLoading(false);
    }
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

          {/* Property Input Form */}
          {selectedInterp && (
            <div className="p-6 bg-white rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4 text-gray-900">
                Enter Property Values
              </h2>
              
              {loadingProps ? (
                <PropertyFormSkeleton count={5} />
              ) : requiredProps.length > 0 ? (
                <PropertyInputForm
                  properties={requiredProps}
                  onSubmit={handleEvaluate}
                  loading={loading}
                />
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <p>No properties available for this interpretation.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column - Results and Info */}
        <div className="space-y-6">
          {/* Info Card */}
          {!result && (
            <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                How to Use
              </h3>
              <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
                <li>Select an interpretation from the dropdown</li>
                <li>Enter all required property values</li>
                <li>Click "Calculate Interpretation"</li>
                <li>View your results and export if needed</li>
              </ol>
            </div>
          )}

          {/* Results Display */}
          {result && selectedInterp && (
            <InterpretationResultDisplay
              result={result}
              interpretationName={selectedInterp}
            />
          )}
        </div>
      </div>

      {/* Rule Tree Visualization - Full Width Below */}
      {ruleTree.length > 0 && (
        <div className="mt-8">
          <RuleTreeVisualization
            tree={ruleTree}
            interpretationName={selectedInterp}
            evaluationResults={result?.evaluationResults}
          />
        </div>
      )}
    </div>
  );
}
