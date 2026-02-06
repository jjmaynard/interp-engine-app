'use client';

import { useState, useEffect } from 'react';
import { Settings, FileText, GitBranch, CheckCircle2, Sparkles, Info } from 'lucide-react';
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
  const [propertyValues, setPropertyValues] = useState<Record<string, number | string | null>>({});

  // Load required properties when interpretation changes
  useEffect(() => {
    if (!selectedInterp) {
      setRequiredProps([]);
      setRuleTree([]);
      setResult(null);
      setActiveTab('properties');
      setPropertyValues({});
      return;
    }

    async function loadProperties() {
      setLoadingProps(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/interpret/${encodeURIComponent(selectedInterp)}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
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
  const handleEvaluate = async (propertyValues: Record<string, number | string | null>) => {
    if (!selectedInterp) return;
    
    console.log('[Client] Starting evaluation for:', selectedInterp);
    console.log('[Client] Property values being sent:', propertyValues);
    console.log('[Client] Number of properties:', Object.keys(propertyValues).length);
    console.log('[Client] First 3 property names:', Object.keys(propertyValues).slice(0, 3));
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `/api/interpret/${encodeURIComponent(selectedInterp)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ properties: propertyValues }),
        }
      );
      
      console.log('[Client] Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
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
    <div className="min-h-screen" style={{ backgroundColor: '#F8F4ED' }}>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Modern Header with Gradient */}
        <div className="mb-8 text-center">
          <div 
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 shadow-lg"
            style={{ background: 'linear-gradient(135deg, var(--color-lavender-500), var(--color-lavender-700))' }}
          >
            <Settings className="w-8 h-8 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-5xl font-bold mb-3" style={{ color: 'var(--color-charcoal-900)' }}>
            Soil Interpretation Engine
          </h1>
          <p className="text-lg max-w-2xl mx-auto" style={{ color: 'var(--color-slate-600)' }}>
            Evaluate soil interpretations using property data and fuzzy logic
          </p>
        </div>

      {error && (
        <div className="alert-error mb-6 p-4 rounded-lg">
          <p className="font-medium" style={{ color: 'var(--color-clay-800)' }}>Error</p>
          <p className="text-sm" style={{ color: 'var(--color-clay-700)' }}>{error}</p>
        </div>
      )}

      {/* Interpretation Selection */}
      <div 
        className="mb-6 p-6 rounded-2xl shadow-lg"
        style={{ backgroundColor: '#FFFFFF', border: '1px solid var(--color-slate-200)' }}
      >
        <InterpretationSelector
          value={selectedInterp}
          onChange={setSelectedInterp}
        />
        
        {selectedInterp && (
          <div 
            className="mt-4 p-4 rounded-xl"
            style={{ 
              background: 'linear-gradient(to right, var(--color-lavender-50), var(--color-sage-50))',
              border: '1px solid var(--color-lavender-200)'
            }}
          >
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--color-lavender-600)' }} />
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--color-lavender-900)' }}>
                  {selectedInterp}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--color-lavender-700)' }}>
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
            <div 
              className="rounded-2xl shadow-lg overflow-hidden"
              style={{ backgroundColor: '#FFFFFF', border: '1px solid var(--color-slate-200)' }}
            >
              <div style={{ 
                borderBottom: '1px solid var(--color-slate-200)',
                background: 'linear-gradient(to bottom, var(--color-ocean-50), var(--color-sky-50))'
              }}>
                <nav className="flex -mb-px p-1">
                  <button
                    onClick={() => setActiveTab('properties')}
                    className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium rounded-lg transition-all ${
                      activeTab === 'properties'
                        ? 'shadow-sm'
                        : ''
                    }`}
                    style={{
                      backgroundColor: activeTab === 'properties' ? '#FFFFFF' : 'transparent',
                      color: activeTab === 'properties' ? 'var(--color-lavender-600)' : 'var(--color-slate-600)',
                    }}
                  >
                    <FileText className="w-4 h-4" />
                    Property Input
                  </button>
                  <button
                    onClick={() => setActiveTab('tree')}
                    className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium rounded-lg transition-all ${
                      activeTab === 'tree'
                        ? 'shadow-sm'
                        : ''
                    }`}
                    style={{
                      backgroundColor: activeTab === 'tree' ? '#FFFFFF' : 'transparent',
                      color: activeTab === 'tree' ? 'var(--color-lavender-600)' : 'var(--color-slate-600)',
                    }}
                  >
                    <GitBranch className="w-4 h-4" />
                    Rule Tree
                  </button>
                </nav>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {activeTab === 'properties' ? (
                  <>
                    <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--color-charcoal-900)' }}>
                      Enter Property Values
                    </h2>
                    
                    {loadingProps ? (
                      <PropertyFormSkeleton count={5} />
                    ) : requiredProps.length > 0 ? (
                      <PropertyInputForm
                        properties={requiredProps}
                        onSubmit={handleEvaluate}
                        loading={loading}
                        values={propertyValues}
                        onValuesChange={setPropertyValues}
                      />
                    ) : (
                      <div className="p-8 text-center" style={{ color: 'var(--color-slate-500)' }}>
                        <p>No properties available for this interpretation.</p>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--color-charcoal-900)' }}>
                      Decision Rule Tree
                    </h2>
                    {ruleTree.length > 0 ? (
                      <RuleTreeVisualization
                        tree={ruleTree}
                        interpretationName={selectedInterp}
                        evaluationResults={result?.evaluationResults}
                        finalRating={result?.rating}
                        propertyValues={propertyValues}
                      />
                    ) : (
                      <div className="p-8 text-center" style={{ color: 'var(--color-slate-500)' }}>
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
              <div 
                className="p-6 rounded-2xl shadow-md"
                style={{
                  background: 'linear-gradient(to bottom right, var(--color-lavender-50), var(--color-lavender-100))',
                  border: '1px solid var(--color-lavender-200)'
                }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Info className="w-5 h-5" style={{ color: 'var(--color-lavender-600)' }} />
                  <h3 className="text-lg font-semibold" style={{ color: 'var(--color-lavender-900)' }}>
                  How to Use
                  </h3>
                </div>
                <ol className="text-sm space-y-2 list-decimal list-inside" style={{ color: 'var(--color-lavender-800)' }}>
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
                key={`result-${result.timestamp}`}
                result={result}
                interpretationName={selectedInterp}
              />
            )}
          </div>
        </div>
      )}

      {/* Initial state - No interpretation selected */}
      {!selectedInterp && (
        <div 
          className="p-12 rounded-2xl shadow-xl text-center"
          style={{ backgroundColor: '#FFFFFF', border: '1px solid var(--color-slate-200)' }}
        >
          <div className="max-w-md mx-auto">
            <h2 className="text-3xl font-bold mb-3" style={{ color: 'var(--color-charcoal-900)' }}>
              Get Started
            </h2>
            <p className="mb-6" style={{ color: 'var(--color-slate-600)' }}>
              Select a soil interpretation from the dropdown above to begin evaluating soil properties.
            </p>
            <div className="grid grid-cols-1 gap-3 text-sm">
              <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: 'var(--color-slate-50)' }}>
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--color-forest-600)' }} />
                <span className="text-left" style={{ color: 'var(--color-slate-700)' }}>Over 2,000 NRCS interpretations available</span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: 'var(--color-slate-50)' }}>
                <Sparkles className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--color-lavender-600)' }} />
                <span className="text-left" style={{ color: 'var(--color-slate-700)' }}>Fuzzy logic-based evaluation engine</span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: 'var(--color-slate-50)' }}>
                <GitBranch className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--color-ocean-600)' }} />
                <span className="text-left" style={{ color: 'var(--color-slate-700)' }}>Interactive property input and visualization</span>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
