import { validateDataFiles, getInterpretationSummaries } from '@/lib/data/loader';
import { dataCache } from '@/lib/data/cache';

export default function Home() {
  // Validate data on page load
  const validation = validateDataFiles();
  const summaries = getInterpretationSummaries();
  const cacheStats = dataCache.getCacheStats();

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-bold text-slate-900">
            NRCS Soil Interpretation Engine
          </h1>
          <p className="text-xl text-slate-600">
            Fuzzy Logic-Based Decision Support System
          </p>
        </div>

        {/* Status Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Data Validation Card */}
          <div className={`bg-white rounded-lg shadow-md p-6 border-t-4 ${
            validation.valid ? 'border-green-500' : 'border-red-500'
          }`}>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${
                validation.valid ? 'bg-green-500' : 'bg-red-500'
              }`}></span>
              Data Validation
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Status:</span>
                <span className={`font-medium ${
                  validation.valid ? 'text-green-600' : 'text-red-600'
                }`}>
                  {validation.valid ? 'Valid ✓' : 'Invalid ✗'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Interpretations:</span>
                <span className="font-medium">{validation.stats.interpretations}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Evaluations:</span>
                <span className="font-medium">{validation.stats.evaluations.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Properties:</span>
                <span className="font-medium">{validation.stats.properties.toLocaleString()}</span>
              </div>
            </div>
            {validation.errors.length > 0 && (
              <div className="mt-4 p-3 bg-red-50 rounded text-xs text-red-700">
                {validation.errors.map((error, i) => (
                  <div key={i}>• {error}</div>
                ))}
              </div>
            )}
          </div>

          {/* Cache Status Card */}
          <div className="bg-white rounded-lg shadow-md p-6 border-t-4 border-blue-500">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-500"></span>
              Cache Status
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Interpretations:</span>
                <span className={`font-medium ${
                  cacheStats.isCached.interpretations ? 'text-green-600' : 'text-slate-400'
                }`}>
                  {cacheStats.isCached.interpretations ? 'Cached' : 'Not Cached'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Evaluations:</span>
                <span className={`font-medium ${
                  cacheStats.isCached.evaluations ? 'text-green-600' : 'text-slate-400'
                }`}>
                  {cacheStats.isCached.evaluations ? 'Cached' : 'Not Cached'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Properties:</span>
                <span className={`font-medium ${
                  cacheStats.isCached.properties ? 'text-green-600' : 'text-slate-400'
                }`}>
                  {cacheStats.isCached.properties ? 'Cached' : 'Not Cached'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">TTL:</span>
                <span className="font-medium">{(cacheStats.cacheTTL / 1000 / 60).toFixed(0)} min</span>
              </div>
            </div>
          </div>

          {/* Project Status Card */}
          <div className="bg-white rounded-lg shadow-md p-6 border-t-4 border-purple-500">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-purple-500"></span>
              Project Status
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Phase 1:</span>
                <span className="font-medium text-green-600">Complete ✓</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Phase 2:</span>
                <span className="font-medium text-yellow-600">In Progress</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Phase 3:</span>
                <span className="font-medium text-slate-400">Planned</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Phase 4:</span>
                <span className="font-medium text-slate-400">Planned</span>
              </div>
            </div>
          </div>
        </div>

        {/* Available Interpretations */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold mb-4 text-slate-900">
            Available Interpretations
          </h2>
          <div className="space-y-3">
            {summaries.map((summary, index) => (
              <div
                key={index}
                className="border border-slate-200 rounded-lg p-4 hover:border-blue-400 hover:shadow transition"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900">{summary.name}</h3>
                    <div className="mt-2 flex gap-4 text-sm text-slate-600">
                      <span>Properties: {summary.propertyCount}</span>
                      {summary.hasProperties && (
                        <span className="text-green-600">✓ Ready</span>
                      )}
                    </div>
                  </div>
                  <button
                    disabled
                    className="px-4 py-2 bg-slate-100 text-slate-400 rounded-md text-sm cursor-not-allowed"
                  >
                    Evaluate (Phase 4)
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Next Steps */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-md p-6 border border-blue-200">
          <h2 className="text-2xl font-bold mb-4 text-slate-900">
            🚀 Next Steps
          </h2>
          <div className="space-y-3 text-slate-700">
            <div className="flex items-start gap-3">
              <span className="text-green-600 font-bold">✓</span>
              <span>Phase 1 Complete: Project foundation, types, and data loading</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-yellow-600 font-bold">→</span>
              <span>Phase 2: Implement interpretation engine core (evaluations, operators, hedges)</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-slate-400 font-bold">○</span>
              <span>Phase 3: Build API routes and server actions</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-slate-400 font-bold">○</span>
              <span>Phase 4: Create frontend components (forms, results display)</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-slate-500">
          <p>USDA Natural Resources Conservation Service</p>
          <p className="mt-1">Soil Interpretation Engine v1.0.0</p>
        </div>
      </div>
    </main>
  );
}
