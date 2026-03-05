'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Map, Edit3, Upload, Info, MapPin, Search, CheckCircle } from 'lucide-react'
import dynamic from 'next/dynamic'
import type { FieldMapRef } from '@/components/map/FieldMap'
import { geocodeAddress, type GeocodingResult } from '@/lib/spatial/geocoding'
import { parseFieldBoundaryFile, validatePolygonComplexity, type ParsedBoundary } from '@/lib/spatial/fileParser'

// Dynamically import FieldMap to avoid SSR issues
const FieldMap = dynamic(() => import('@/components/map/FieldMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-100">
      <div className="text-gray-500">Loading map...</div>
    </div>
  ),
})

type SelectionMode = 'browse' | 'draw' | 'upload'

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

export default function FieldSelectionPage() {
  const router = useRouter()
  const [mode, setMode] = useState<SelectionMode>('browse')
  const [showCSBLayer, setShowCSBLayer] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [parsedBoundary, setParsedBoundary] = useState<ParsedBoundary | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isParsingFile, setIsParsingFile] = useState(false)
  const fieldMapRef = useRef<FieldMapRef>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<GeocodingResult[]>([])
  const [searchError, setSearchError] = useState<string | null>(null)

  const handleFieldSelected = async (field: FieldData) => {
    console.log('Field selected:', field)
    
    setIsAnalyzing(true)
    
    try {
      // Store field data in sessionStorage for access by interpretation page
      sessionStorage.setItem('selectedField', JSON.stringify(field))
      
      // Navigate to interpretation page
      router.push('/interpret/auto')
    } catch (error) {
      console.error('Error processing field selection:', error)
      setIsAnalyzing(false)
    }
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    setIsSearching(true)
    setSearchError(null)
    setSearchResults([])

    try {
      const results = await geocodeAddress(searchQuery)
      
      if (results.length === 0) {
        setSearchError('No locations found. Try a different search term.')
        return
      }

      setSearchResults(results)

      // Automatically fly to first result
      const firstResult = results[0]
      if (fieldMapRef.current) {
        fieldMapRef.current.panToLocation(firstResult.lat, firstResult.lon, 13)
      }
    } catch (error) {
      console.error('Search error:', error)
      setSearchError(error instanceof Error ? error.message : 'Search failed')
    } finally {
      setIsSearching(false)
    }
  }

  const handleSelectSearchResult = (result: GeocodingResult) => {
    if (fieldMapRef.current) {
      fieldMapRef.current.panToLocation(result.lat, result.lon, 13)
    }
    setSearchResults([])
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadedFile(file)
    setUploadError(null)
    setParsedBoundary(null)
    setIsParsingFile(true)

    try {
      // Parse the file
      const boundary = await parseFieldBoundaryFile(file)

      // Validate complexity
      if (!validatePolygonComplexity(boundary.geometry, 1000)) {
        throw new Error('Field boundary is too complex (max 1,000 vertices)')
      }

      setParsedBoundary(boundary)

      // TODO: Display boundary on map
      // The FieldMap component will need to handle this via a prop or ref method
      console.log('File parsed successfully:', boundary)
    } catch (error) {
      console.error('File upload error:', error)
      setUploadError(error instanceof Error ? error.message : 'Failed to parse file')
      setUploadedFile(null)
    } finally {
      setIsParsingFile(false)
    }
  }

  const handleAnalyzeUploadedField = () => {
    if (!parsedBoundary) return

    const fieldData: FieldData = {
      name: parsedBoundary.name || uploadedFile?.name.replace(/\.[^/.]+$/, '') || 'Uploaded Field',
      area: parsedBoundary.acres * 4046.86, // Convert acres to square meters
      acres: parsedBoundary.acres,
      boundary: parsedBoundary.geometry,
      geometry: parsedBoundary.geometry,
      method: 'upload',
    }

    handleFieldSelected(fieldData)
  }

  const tabs = [
    {
      id: 'browse' as SelectionMode,
      label: 'Browse',
      icon: Map,
    },
    {
      id: 'draw' as SelectionMode,
      label: 'Draw',
      icon: Edit3,
    },
    {
      id: 'upload' as SelectionMode,
      label: 'Upload',
      icon: Upload,
    },
  ]

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left Panel - Selection Methods */}
      <div className="w-96 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Field Selection
          </h1>
          <p className="text-sm text-gray-600">
            Navigate to your field by entering an address, city, state, or coordinates, or manually navigate by scrolling and panning the map.
          </p>
        </div>

        {/* Search Section */}
        <div className="px-6 py-4 border-b border-gray-200">
          <form onSubmit={handleSearch} className="space-y-3">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setSearchError(null)
                }}
                placeholder='e.g., "Lincoln, NE" or "41.25, -95.95"'
                className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                disabled={isSearching}
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={isSearching || !searchQuery.trim()}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSearching ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Search Location
                </>
              )}
            </button>
          </form>

          {/* Search Error */}
          {searchError && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{searchError}</p>
            </div>
          )}

          {/* Search Results */}
          {searchResults.length > 1 && (
            <div className="mt-3 space-y-2">
              <p className="text-xs text-gray-600 font-medium">
                Multiple locations found - select one:
              </p>
              {searchResults.map((result, index) => (
                <button
                  key={index}
                  onClick={() => handleSelectSearchResult(result)}
                  className="w-full text-left p-2 hover:bg-gray-100 rounded-lg transition-colors text-sm border border-gray-200"
                >
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900 truncate">{result.display_name}</p>
                      <p className="text-xs text-gray-500">
                        {result.lat.toFixed(4)}, {result.lon.toFixed(4)}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selection Method Description */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
          <p className="text-sm text-gray-600 text-center">
            Then select your field using one of the methods below
          </p>
        </div>

        {/* Tab Navigation - Horizontal */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = mode === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setMode(tab.id)}
                  className={`flex-1 flex flex-col items-center gap-2 px-4 py-3 rounded-lg transition-all ${
                    isActive
                      ? 'bg-green-600 text-white shadow-md'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  <Icon className={`w-6 h-6 ${isActive ? 'text-white' : 'text-green-600'}`} />
                  <div className="font-semibold text-sm">{tab.label}</div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Mode-Specific Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {mode === 'browse' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-700">
                Navigate the map and click on a field boundary to select it for analysis.
              </p>
              
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800">
                  <strong>Zoom in to level 13+ to see interactive field boundaries.</strong> Click any field to analyze it.
                </p>
              </div>
            </div>
          )}

          {mode === 'draw' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-700">
                Use the drawing tools to manually outline your field boundary on the map.
              </p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-blue-800">
                    <p className="font-semibold mb-1">How to draw:</p>
                    <ul className="space-y-1">
                      <li>1. Click the polygon tool in the top-right</li>
                      <li>2. Click on the map to add vertices</li>
                      <li>3. Double-click to finish</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <h4 className="font-semibold text-gray-900 text-xs mb-2">Requirements:</h4>
                <ul className="text-xs text-gray-700 space-y-1">
                  <li>• Min: 0.5 acres / Max: 10,000 acres</li>
                  <li>• Maximum 1,000 vertices</li>
                </ul>
              </div>
            </div>
          )}

          {mode === 'upload' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-700">
                Upload a field boundary file in GeoJSON, KML, or Shapefile format.
              </p>

              <div>
                <label
                  htmlFor="file-upload"
                  className={`block w-full px-6 py-8 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${
                    isParsingFile
                      ? 'border-gray-300 bg-gray-50 cursor-not-allowed'
                      : 'border-gray-300 hover:border-green-500 hover:bg-green-50'
                  }`}
                >
                  <Upload className="w-10 h-10 mx-auto text-gray-400 mb-2" />
                  <span className="text-sm font-medium text-gray-700">
                    {isParsingFile ? 'Processing file...' : 'Click to upload or drag and drop'}
                  </span>
                  <p className="text-xs text-gray-500 mt-1">GeoJSON, KML, or Shapefile (.zip)</p>
                  <input
                    id="file-upload"
                    type="file"
                    className="hidden"
                    accept=".geojson,.json,.kml,.zip"
                    onChange={handleFileUpload}
                    disabled={isParsingFile}
                  />
                </label>

                {/* Parsing Status */}
                {isParsingFile && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <p className="text-sm text-blue-900">Parsing file...</p>
                  </div>
                )}

                {/* Upload Error */}
                {uploadError && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Info className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-red-900">Upload Failed</p>
                        <p className="text-xs text-red-700 mt-1">{uploadError}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Parsed Boundary Info */}
                {parsedBoundary && !uploadError && (
                  <div className="mt-3 space-y-3">
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-green-900">
                            {parsedBoundary.name || uploadedFile?.name}
                          </p>
                          <p className="text-xs text-green-700 mt-1">
                            Area: {parsedBoundary.acres.toFixed(2)} acres
                          </p>
                        </div>
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                    </div>

                    <button
                      onClick={handleAnalyzeUploadedField}
                      className="w-full px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                    >
                      Analyze Field
                    </button>
                  </div>
                )}
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <h4 className="font-semibold text-gray-900 text-xs mb-2">Supported Formats:</h4>
                <ul className="text-xs text-gray-700 space-y-1">
                  <li>• GeoJSON (.json, .geojson)</li>
                  <li>• KML (.kml) - requires @tmcw/togeojson</li>
                  <li>• Shapefile (.zip) - requires shapefile library</li>
                  <li>• Max size: 10,000 acres, 1,000 vertices</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Map */}
      <div className="flex-1 relative">
        {isAnalyzing && (
          <div className="absolute inset-0 bg-black bg-opacity-50 z-[2000] flex items-center justify-center">
            <div className="bg-white rounded-lg p-8 shadow-2xl">
              <div className="flex items-center gap-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                <div>
                  <p className="font-semibold text-gray-900">Processing field selection...</p>
                  <p className="text-sm text-gray-600">Redirecting to interpretation analysis</p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <FieldMap
          ref={fieldMapRef}
          mode={mode}
          searchQuery={searchQuery}
          showCSBLayer={showCSBLayer}
          onFieldSelected={handleFieldSelected}
          onCSBLayerToggle={() => setShowCSBLayer(!showCSBLayer)}
        />
      </div>
    </div>
  )
}
