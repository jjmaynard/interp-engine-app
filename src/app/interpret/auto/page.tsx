'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, Calendar, Loader2, CheckCircle2, XCircle, AlertCircle, Search } from 'lucide-react'
import { getMapUnitsFromGeometry } from '@/lib/spatial/mukey-query'
import { PropertyInputForm } from '@/components/forms/PropertyInputForm'
import { InterpretationResultDisplay } from '@/components/results/InterpretationResult'
import type { Property, PropertyValue, InterpretationResult as InterpResult } from '@/types/interpretation'

const makePropertyDisplayKey = (property: Property): string =>
  `${property.propname} [ID:${property.propiid}]`

const toPrimitiveValue = (value: number | string | null | PropertyValue): number | string | null => {
  if (value && typeof value === 'object' && 'value' in value) {
    return value.value
  }
  return value
}

interface FieldData {
  name: string
  area: number
  acres: number
  boundary: any
  clu_id?: string
  state?: string
  county?: string
  geometry?: any
  method: string
}

// Available interpretations
const AVAILABLE_INTERPRETATIONS = [
  'ENG - Septic Tank Absorption Fields',
  'ENG - Dwellings With Basements',
  'ENG - Dwellings W/O Basements',
  'ENG - Local Roads and Streets',
  'ENG - Lawn, Landscape, Golf Fairway',
  'ENG - Small Commercial Buildings',
  'ENG - Construction Materials; Roadfill',
  'ENG - Construction Materials; Topsoil',
  'ENG - Daily Cover for Landfill',
  'ENG - Shallow Excavations',
]

export default function AutoInterpretPage() {
  const router = useRouter()
  const [fieldData, setFieldData] = useState<FieldData | null>(null)
  const [mukey, setMukey] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Interpretation selection
  const [selectedInterpretation, setSelectedInterpretation] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Results
  const [result, setResult] = useState<InterpResult | null>(null)

  // Property management
  const [enhancedProperties, setEnhancedProperties] = useState<Property[]>([])
  const [ssurgoValues, setSsurgoValues] = useState<Record<string, number | string | null>>({})
  const [propertyValues, setPropertyValues] = useState<Record<string, number | string | null>>({})
  const [isModified, setIsModified] = useState(false)
  const [isLoadingProps, setIsLoadingProps] = useState(false)
  const [isRecalculating, setIsRecalculating] = useState(false)

  useEffect(() => {
    // Retrieve field data from sessionStorage
    const storedField = sessionStorage.getItem('selectedField')
    if (storedField) {
      try {
        const field = JSON.parse(storedField)
        setFieldData(field)
        getMukey(field)
      } catch (err) {
        console.error('Error parsing field data:', err)
        setError('Failed to load field data')
        setIsLoading(false)
      }
    } else {
      setError('No field data found. Please select a field first.')
      setIsLoading(false)
    }
  }, [])

  const getMukey = async (field: FieldData) => {
    try {
      let mukeyValue: string | undefined

      // Check if we have a pre-loaded MUKEY
      if ((field as any).mukey && typeof (field as any).mukey === 'string' && (field as any).mukey.length < 10) {
        mukeyValue = (field as any).mukey
        console.log(`Using pre-loaded MUKEY: ${mukeyValue}`)
      }

      // For CSB fields or drawn/uploaded fields, query SDA to get MUKEY from geometry
      if (!mukeyValue && field.geometry) {
        console.log('Querying SSURGO for MUKEY from field geometry...')
        const mapUnits = await getMapUnitsFromGeometry(field.geometry)
        
        if (mapUnits.length === 0) {
          setError('No soil map units found for this field location')
          setIsLoading(false)
          return
        }

        mukeyValue = mapUnits[0].mukey
        console.log(`Found ${mapUnits.length} map units. Using MUKEY: ${mukeyValue} (${mapUnits[0].muname})`)
      }

      if (!mukeyValue) {
        setError('No MUKEY or field geometry available for interpretation')
        setIsLoading(false)
        return
      }

      setMukey(mukeyValue)
      setIsLoading(false)
    } catch (err) {
      console.error('Error querying soil map units:', err)
      setError(err instanceof Error ? err.message : 'Failed to query soil data')
      setIsLoading(false)
    }
  }

  const runInterpretation = async () => {
    if (!selectedInterpretation || !mukey) return

    setIsRunning(true)
    setIsLoadingProps(true)
    setError(null)

    try {
      // Phase 1: Auto-fetch SSURGO data and run initial evaluation
      const autoResponse = await fetch('/api/interpret/auto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interpretationName: selectedInterpretation,
          mukey: mukey,
        }),
      })

      if (!autoResponse.ok) {
        const errorData = await autoResponse.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to fetch SSURGO data')
      }

      const autoData = await autoResponse.json()

      console.log('[Auto Interpret] Auto API Response:', {
        success: autoData.success,
        rating: autoData.interpretation?.result?.rating,
        ratingClass: autoData.interpretation?.result?.ratingClass,
        propertyCount: Object.keys(autoData.properties?.values || {}).length,
      })

      // Phase 2: Fetch property metadata to get property names, units, and choices
      const metaResponse = await fetch(`/api/interpret/${encodeURIComponent(selectedInterpretation)}`)

      if (!metaResponse.ok) {
        throw new Error('Failed to fetch property metadata')
      }

      const metaData = await metaResponse.json()
      const properties = metaData.data.properties as Property[]

      // Ensure each property has a unique display key so duplicate propnames don't overwrite each other in UI state
      const propsWithUniqueKeys: Property[] = properties.map((prop) => ({
        ...prop,
        propname: makePropertyDisplayKey(prop),
      }))

      console.log('[Auto Interpret] Fetched metadata for', properties.length, 'properties')
      setEnhancedProperties(propsWithUniqueKeys)

      // Phase 3: Map property values to form state keyed by display-key
      // Use valuesByName (propname-keyed) when available — avoids propiid mismatch between
      // Python service (uses tree propiids) and Next.js engine (may pick different propiid
      // when properties_enhanced.json has multiple entries for the same propname).
      const propertyIdValues = autoData.properties.values   // keyed by Python propiid
      const propertyValuesByName = autoData.properties.valuesByName || {}  // keyed by propname
      const propertyNameValues: Record<string, number | string | null> = {}

      propsWithUniqueKeys.forEach((prop: Property) => {
        // Strip the [ID:X] display suffix to get canonical propname for lookup
        const canonicalName = prop.propname.replace(/\s*\[ID:\d+\]$/, '')

        // Prefer propname-keyed lookup (robust across propiid mismatches)
        const byName = propertyValuesByName[canonicalName]
        if (byName !== undefined) {
          propertyNameValues[prop.propname] = byName
          return
        }

        // Fallback: direct propiid lookup (works when IDs match)
        const byId = propertyIdValues[prop.propiid]
        if (byId !== undefined) {
          propertyNameValues[prop.propname] = byId
        }
      })

      console.log('[Auto Interpret] Mapped property values:', {
        count: Object.keys(propertyNameValues).length,
        sample: Object.entries(propertyNameValues).slice(0, 3)
      })

      // Phase 4: Transform result propertyValues to use names instead of IDs
      const originalResult = autoData.interpretation.result
      const transformedResult = {
        ...originalResult,
        propertyValues: propertyNameValues // Use property names as keys instead of IDs
      }

      // Phase 5: Set state
      setSsurgoValues(propertyNameValues) // Store original SSURGO values
      setPropertyValues(propertyNameValues) // Initialize working copy
      setResult(transformedResult)
      setIsModified(false)

    } catch (err) {
      console.error('Error running interpretation:', err)
      setError(err instanceof Error ? err.message : 'Failed to run interpretation')
    } finally {
      setIsRunning(false)
      setIsLoadingProps(false)
    }
  }

  const handleRecalculate = async (values: Record<string, number | string | null | PropertyValue>) => {
    if (!selectedInterpretation) return

    setIsRecalculating(true)
    setError(null)

    try {
      // Convert display keys back to canonical names and include id aliases for evaluator lookup
      const normalizedValues: Record<string, number | string | null> = {}
      enhancedProperties.forEach((prop) => {
        const displayKey = prop.propname
        const canonicalName = displayKey.replace(/\s*\[ID:\d+\]$/, '')
        const value = toPrimitiveValue(values[displayKey])
        if (value !== undefined) {
          normalizedValues[canonicalName] = value
          normalizedValues[String(prop.propiid)] = value
        }
      })

      const response = await fetch(`/api/interpret/${encodeURIComponent(selectedInterpretation)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ properties: normalizedValues }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Recalculation failed')
      }

      const data = await response.json()
      setResult(data.data)

      // Check if modified from SSURGO
      const hasChanges = Object.keys(ssurgoValues).some(
        key => ssurgoValues[key] !== toPrimitiveValue(values[key])
      )
      setIsModified(hasChanges)

      console.log('[Auto Interpret] Recalculated with user values, modified:', hasChanges)

    } catch (err) {
      console.error('Error recalculating:', err)
      setError(err instanceof Error ? err.message : 'Recalculation failed')
    } finally {
      setIsRecalculating(false)
    }
  }

  const handleResetToSsurgo = () => {
    setPropertyValues({...ssurgoValues})
    setIsModified(false)
    console.log('[Auto Interpret] Reset to SSURGO values')
  }

  const handlePropertyValuesChange = (values: Record<string, number | string | null | PropertyValue>) => {
    const normalizedValues: Record<string, number | string | null> = {}
    Object.entries(values).forEach(([key, value]) => {
      normalizedValues[key] = toPrimitiveValue(value)
    })
    setPropertyValues(normalizedValues)
  }

  const filteredInterpretations = AVAILABLE_INTERPRETATIONS.filter(interp =>
    interp.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-green-600" />
          <span className="text-gray-600">Loading field data...</span>
        </div>
      </div>
    )
  }

  if (error && !fieldData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <div className="flex items-start gap-3">
            <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900 mb-1">Error</h3>
              <p className="text-red-700 text-sm mb-4">{error}</p>
              <button
                onClick={() => router.push('/field-selection')}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
              >
                Return to Field Selection
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Soil Interpretation Analysis
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Select an interpretation to evaluate for this field
              </p>
            </div>
            <button
              onClick={() => router.push('/field-selection')}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-sm font-medium"
            >
              ← Back to Field Selection
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Field Information Card */}
        {fieldData && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Field Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Field Name</p>
                  <p className="font-medium text-gray-900">{fieldData.name}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Area</p>
                  <p className="font-medium text-gray-900">{fieldData.acres.toFixed(2)} acres</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Selection Method</p>
                  <p className="font-medium text-gray-900 capitalize">{fieldData.method}</p>
                </div>
              </div>
              {mukey && (
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">MUKEY</p>
                    <p className="font-medium text-gray-900">{mukey}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Interpretation Selector */}
        {!selectedInterpretation && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Select an Interpretation
            </h2>
            
            {/* Search Box */}
            <div className="mb-4 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search interpretations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>

            {/* Interpretation List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredInterpretations.map((interp) => (
                <button
                  key={interp}
                  onClick={() => setSelectedInterpretation(interp)}
                  className="w-full text-left px-4 py-3 border border-gray-200 rounded-lg hover:bg-green-50 hover:border-green-300 transition-colors"
                >
                  <p className="font-medium text-gray-900">{interp}</p>
                </button>
              ))}
              {filteredInterpretations.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>No interpretations match your search</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Selected Interpretation & Results */}
        {selectedInterpretation && (
          <div className="space-y-6">
            {/* Interpretation Header */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  {selectedInterpretation}
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedInterpretation(null)
                      setResult(null)
                      setEnhancedProperties([])
                      setPropertyValues({})
                      setSsurgoValues({})
                      setIsModified(false)
                    }}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-sm font-medium"
                  >
                    Change Interpretation
                  </button>
                  {!result && (
                    <button
                      onClick={runInterpretation}
                      disabled={isRunning || !mukey}
                      className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isRunning && <Loader2 className="w-4 h-4 animate-spin" />}
                      {isRunning ? 'Loading SSURGO Data...' : 'Fetch SSURGO & Evaluate'}
                    </button>
                  )}
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-red-900 mb-1">Error</h4>
                      <p className="text-red-700 text-sm">{error}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Two-column layout: Property Form + Results */}
            {result && enhancedProperties.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Property Form (2/3 width) */}
                <div className="lg:col-span-2">
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          Property Values
                        </h3>
                        {isModified && (
                          <p className="text-sm text-orange-600 mt-1">
                            Modified from SSURGO values
                          </p>
                        )}
                      </div>
                      <button
                        onClick={handleResetToSsurgo}
                        disabled={!isModified || isRecalculating}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Reset to SSURGO
                      </button>
                    </div>

                    <PropertyInputForm
                      properties={enhancedProperties}
                      onSubmit={handleRecalculate}
                      loading={isRecalculating}
                      values={propertyValues}
                      onValuesChange={handlePropertyValuesChange}
                      allowNullValues={true}
                    />
                  </div>
                </div>

                {/* Right: Results (1/3 width) */}
                <div className="lg:col-span-1">
                  <InterpretationResultDisplay
                    result={result}
                    interpretationName={selectedInterpretation}
                  />
                </div>
              </div>
            )}

            {/* Loading state for property metadata */}
            {isLoadingProps && !result && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
                <div className="flex flex-col items-center justify-center gap-4">
                  <Loader2 className="w-8 h-8 animate-spin text-green-600" />
                  <p className="text-gray-600">Loading property metadata...</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
