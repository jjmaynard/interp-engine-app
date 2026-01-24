'use client';

import { useState, useEffect } from 'react';
import { Sprout, FileText, GitBranch, CheckCircle2, Sparkles, Info } from 'lucide-react';
import type { InterpretationResult, Property, RuleNode } from '@/types/interpretation';
import { InterpretationSelector } from '@/components/navigation/InterpretationSelector';
import { PropertyFormSkeleton } from '@/components/layout/LoadingSkeleton';
import { PropertyInputForm } from '@/components/forms/PropertyInputForm';
import { InterpretationResultDisplay } from '@/components/results/InterpretationResult';
import { RuleTreeVisualization } from '@/components/visualization/RuleTreeVisualization';

type TabType = 'properties' | 'tree';

export default function InterpretPage() {
  const [selectedInterp, setSelectedInterp] = useState<string>('');
  const [requiredProps, setRequiredProps] = useState<Property[]>([]);
  const [ruleTree, setRuleTree] = useState<RuleNode[]>([]);
  const [result, setResult] = useState<InterpretationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingProps, setLoadingProps] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('properties');

  // Load required properties when interpretation changes
  useEffect(() => {
    if (!selectedInterp) {
      setRequiredProps([]);
      setRuleTree([]);
      setResult(null);
      setActiveTab('properties');
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
    
    console.log('[Client] Starting evaluation for:', selectedInterp);
    console.log('[Client] Property values being sent:', propertyValues);
    console.log('[Client] Number of properties:', Object.keys(propertyValues).length);
    console.log('[Client] First 3 property names:', Object.keys(propertyValues).slice(0, 3));
    
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
      
      console.log('[Client] Response status:', response.status);
      
      const data = await response.json();
      
      console.log('[Client] Response data:', data);
      
      if (data.success) {
        setResult(data.data);
        console.log('[Client] Result rating:', data.data.rating);
        console.log('[Client] Result rating class:', data.data.ratingClass);
      } else {
        setError(data.error || 'Evaluation failed');
        console.error('[Client] Evaluation failed:', data.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Evaluation failed');
      console.error('[Client] Error during evaluation:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Modern Header with Gradient */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-green-500 mb-4 shadow-lg">
            <Sprout className="w-8 h-8 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent mb-3">
            NRCS Soil Interpretation Engine
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Evaluate soil interpretations using property data and fuzzy logic
          </p>
        </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <p className="font-medium">Error</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Interpretation Selection */}
      <div className="mb-6 p-6 bg-white rounded-2xl shadow-lg border border-gray-100">
        <InterpretationSelector
          value={selectedInterp}
          onChange={setSelectedInterp}
        />
        
        {selectedInterp && (
          <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-green-50 border border-blue-100 rounded-xl">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900">
                  {selectedInterp}
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  {requiredProps.length} properties required for evaluation
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content - Only show if interpretation is selected */}
      {selectedInterp && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Tabs and Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tab Navigation */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="border-b border-gray-100">
                <nav className="flex -mb-px p-1 bg-gray-50">
                  <button
                    onClick={() => setActiveTab('properties')}
                    className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium rounded-lg transition-all ${
                      activeTab === 'properties'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                                        <FileText className="w-4 h-4" />
                    Property Input
                  </button>
                  <button
                    onClick={() => setActiveTab('tree')}
                    className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium rounded-lg transition-all ${
                      activeTab === 'tree'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                                        <GitBranch className="w-4 h-4" />
                    }`}
                  >
                    Rule Tree
                  </button>
                </nav>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {activeTab === 'properties' ? (
                  <>
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
                  </>
                ) : (
                  <>
                    <h2 className="text-xl font-semibold mb-4 text-gray-900">
                      Decision Rule Tree
                    </h2>
                    {ruleTree.length > 0 ? (
                      <RuleTreeVisualization
                        tree={ruleTree}
                        interpretationName={selectedInterp}
                        evaluationResults={result?.evaluationResults}
                      />
                    ) : (
                      <div className="p-8 text-center text-gray-500">
                        <p>No rule tree available for this interpretation.</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Results and Info */}
          <div className="space-y-6">
            {/* Info Card */}
            {!result && (
              <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-2xl shadow-md">
                <div className="flex items-center gap-2 mb-3">
                  <Info className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-blue-900">
                  How to Use
                  </h3>
                </div>
                <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
                  <li>Select an interpretation from the dropdown</li>
                  <li>Enter property values in the Property Input tab</li>
                  <li>Click "Calculate Interpretation"</li>
                  <li>View results and rule tree visualization</li>
                </ol>
              </div>
            )}

            {/* Results Display */}
            {result && (
              <InterpretationResultDisplay
                result={result}
                interpretationName={selectedInterp}
              />
            )}
          </div>
        </div>
      )}

      {/* Initial state - No interpretation selected */}
      {!selectedInterp && (
        <div className="p-12 bg-white rounded-2xl shadow-xl border border-gray-100 text-center">
          <div className="max-w-md mx-auto">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-green-500 mb-6 shadow-lg">
              <Sprout className="w-10 h-10 text-white" strokeWidth={2.5} />
            </div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent mb-3">
              Get Started
            </h2>
            <p className="text-gray-600 mb-6">
              Select a soil interpretation from the dropdown above to begin evaluating soil properties.
            </p>
            <div className="grid grid-cols-1 gap-3 text-sm">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span className="text-gray-700 text-left">Over 2,000 NRCS interpretations available</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <span className="text-gray-700 text-left">Fuzzy logic-based evaluation engine</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <GitBranch className="w-5 h-5 text-purple-600 flex-shrink-0" />
                <span className="text-gray-700 text-left">Interactive property input and visualization</span>
              </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
