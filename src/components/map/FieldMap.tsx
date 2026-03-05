// Field Map Component with CLU boundaries, drawing tools, and layer controls
// Adapted for Soil Interpretation Engine

'use client'

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import { Layers, Square, MapPin, CheckCircle, AlertCircle } from 'lucide-react'
import { geeApi } from '@/lib/csbClient'
import type { CSBFieldDetails } from '@/lib/csbClient'

// State FIPS code to name mapping
const STATE_FIPS_TO_NAME: Record<string, string> = {
  '01': 'Alabama', '02': 'Alaska', '04': 'Arizona', '05': 'Arkansas', '06': 'California',
  '08': 'Colorado', '09': 'Connecticut', '10': 'Delaware', '11': 'District of Columbia',
  '12': 'Florida', '13': 'Georgia', '15': 'Hawaii', '16': 'Idaho', '17': 'Illinois',
  '18': 'Indiana', '19': 'Iowa', '20': 'Kansas', '21': 'Kentucky', '22': 'Louisiana',
  '23': 'Maine', '24': 'Maryland', '25': 'Massachusetts', '26': 'Michigan', '27': 'Minnesota',
  '28': 'Mississippi', '29': 'Missouri', '30': 'Montana', '31': 'Nebraska', '32': 'Nevada',
  '33': 'New Hampshire', '34': 'New Jersey', '35': 'New Mexico', '36': 'New York',
  '37': 'North Carolina', '38': 'North Dakota', '39': 'Ohio', '40': 'Oklahoma', '41': 'Oregon',
  '42': 'Pennsylvania', '44': 'Rhode Island', '45': 'South Carolina', '46': 'South Dakota',
  '47': 'Tennessee', '48': 'Texas', '49': 'Utah', '50': 'Vermont', '51': 'Virginia',
  '53': 'Washington', '54': 'West Virginia', '55': 'Wisconsin', '56': 'Wyoming',
  '72': 'Puerto Rico'
}

const getStateName = (fipsCode: string): string => {
  if (!fipsCode) return 'N/A'
  return STATE_FIPS_TO_NAME[fipsCode] || fipsCode
}

// Format pattern type for display
const formatPatternType = (pattern: string | undefined): string => {
  if (!pattern) return 'N/A'
  return pattern
    .replace('two_crop', '2-crop')
    .replace('three_crop', '3-crop')
    .replace('four_crop', '4-crop')
    .replace('_', ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

interface FieldMapProps {
  mode: 'browse' | 'draw' | 'upload'
  searchQuery?: string
  showCSBLayer?: boolean
  onFieldSelected?: (field: any) => void
  onCSBLayerToggle?: () => void
  onMapReady?: (controls: { panToLocation: (lat: number, lng: number, zoom?: number) => void }) => void
}

export interface FieldMapRef {
  panToLocation: (lat: number, lng: number, zoom?: number) => void
}

const FieldMap = forwardRef<FieldMapRef, FieldMapProps>(({
  mode,
  searchQuery,
  showCSBLayer = true,
  onFieldSelected,
  onCSBLayerToggle,
  onMapReady,
}, ref) => {
  const mapRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const drawnItemsRef = useRef<any>(null)
  const drawControlRef = useRef<any>(null)
  const [drawnPolygon, setDrawnPolygon] = useState<any>(null)
  const [polygonArea, setPolygonArea] = useState<number>(0)
  const [validationError, setValidationError] = useState<string>('')
  const [mapInitialized, setMapInitialized] = useState(false)
  const [selectedCSBField, setSelectedCSBField] = useState<CSBFieldDetails | null>(null)
  const [isSelectingField, setIsSelectingField] = useState(false)
  const [showCSBTileLayer, setShowCSBTileLayer] = useState(true)
  const [isEditingBoundary, setIsEditingBoundary] = useState(false)
  const csbLayerRef = useRef<any>(null)
  const csbGeoJsonLayerRef = useRef<any>(null)
  const selectedFieldLayerRef = useRef<any>(null)
  const editableFieldGroupRef = useRef<any>(null)
  const editControlRef = useRef<any>(null)
  const [layerPanelCollapsed, setLayerPanelCollapsed] = useState(false)
  const [isInEditMode, setIsInEditMode] = useState(false)
  const mapClickHandlerRef = useRef<((e: any) => void) | null>(null)
  const vertexMarkersRef = useRef<any[]>([])
  const [customFieldName, setCustomFieldName] = useState<string>('')
  const [leafletLoaded, setLeafletLoaded] = useState(false)

  // Dynamically import Leaflet and related libraries
  useEffect(() => {
    if (typeof window === 'undefined') return

    const loadLeaflet = async () => {
      try {
        // Load Leaflet first
        const leafletModule = await import('leaflet')
        const L = leafletModule.default
        
        // Store in window BEFORE loading leaflet-draw (it needs global L)
        ;(window as any).L = L
        
        // Now load leaflet-draw and turf
        const [leafletDrawModule, turfModule] = await Promise.all([
          import('leaflet-draw'),
          import('@turf/turf')
        ])
        
        const turf = turfModule
        
        // Import CSS
        await Promise.all([
          import('leaflet/dist/leaflet.css'),
          import('leaflet-draw/dist/leaflet.draw.css')
        ])

        // Fix default marker icons
        delete (L.Icon.Default.prototype as any)._getIconUrl
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: '/marker-icon-2x.png',
          iconUrl: '/marker-icon.png',
          shadowUrl: '/marker-shadow.png',
        })

        // Store turf in window for access in effects
        ;(window as any).turf = turf

        setLeafletLoaded(true)
      } catch (error) {
        console.error('Error loading Leaflet:', error)
      }
    }

    loadLeaflet()
  }, [])

  // Expose methods to parent component via ref
  useImperativeHandle(ref, () => ({
    panToLocation: (lat: number, lng: number, zoom: number = 14) => {
      if (mapRef.current) {
        const L = (window as any).L
        mapRef.current.setView([lat, lng], zoom, { animate: true })
        
        const marker = L.marker([lat, lng], {
          icon: L.icon({
            iconUrl: '/marker-icon.png',
            iconRetinaUrl: '/marker-icon-2x.png',
            shadowUrl: '/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
          })
        }).addTo(mapRef.current)
        
        setTimeout(() => {
          if (mapRef.current) {
            mapRef.current.removeLayer(marker)
          }
        }, 5000)
      }
    }
  }))

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current || !leafletLoaded) return

    const L = (window as any).L
    if (!L) return

    // Initialize map
    const map = L.map(containerRef.current, {
      center: [41.5868, -93.6250], // Iowa center
      zoom: 7,
      zoomControl: false,
      minZoom: 3,
      maxZoom: 18,
    })

    // Add zoom control to bottom right
    L.control.zoom({
      position: 'bottomright',
    }).addTo(map)

    // Add scale control
    L.control.scale({
      position: 'bottomleft',
      imperial: true,
      metric: true,
    }).addTo(map)

    // Define base layers with satellite imagery
    const baseLayers = {
      'Satellite Hybrid': L.layerGroup([
        L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          {
            attribution: 'Tiles © Esri',
            maxZoom: 19,
          }
        ),
        L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
          {
            attribution: 'Labels © Esri',
            maxZoom: 19,
          }
        ),
      ]),
      'Satellite': L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: 'Tiles © Esri',
          maxZoom: 19,
        }
      ),
      'OpenStreetMap': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }),
    }

    // Add default base layer
    baseLayers['Satellite Hybrid'].addTo(map)

    // Add layer control
    L.control.layers(baseLayers, {}, { position: 'topright' }).addTo(map)

    // Create custom pane for selected field
    map.createPane('selectedFieldPane')
    map.getPane('selectedFieldPane').style.zIndex = '650'

    mapRef.current = map
    setMapInitialized(true)

    // Expose map controls to parent component
    if (onMapReady) {
      onMapReady({
        panToLocation: (lat: number, lng: number, zoom: number = 14) => {
          map.setView([lat, lng], zoom, { animate: true })
          
          const marker = L.marker([lat, lng], {
            icon: L.icon({
              iconUrl: '/marker-icon.png',
              iconRetinaUrl: '/marker-icon-2x.png',
              shadowUrl: '/marker-shadow.png',
              iconSize: [25, 41],
              iconAnchor: [12, 41],
            })
          }).addTo(map)
          
          setTimeout(() => {
            map.removeLayer(marker)
          }, 5000)
        }
      })
    }

    // Cleanup
    return () => {
      map.remove()
      mapRef.current = null
      setMapInitialized(false)
    }
  }, [leafletLoaded, onMapReady])

  // Handle drawing controls
  useEffect(() => {
    if (!mapRef.current || !mapInitialized || !leafletLoaded) return

    const L = (window as any).L
    const turf = (window as any).turf
    const map = mapRef.current

    setValidationError('')

    if (mode !== 'draw' && drawControlRef.current) {
      map.removeControl(drawControlRef.current)
      drawControlRef.current = null
      if (drawnItemsRef.current) {
        map.removeLayer(drawnItemsRef.current)
        drawnItemsRef.current = null
      }
      return
    }

    if (mode === 'draw' && !drawnItemsRef.current) {
      const drawnItems = new L.FeatureGroup()
      map.addLayer(drawnItems)
      drawnItemsRef.current = drawnItems

      const drawControl = new L.Control.Draw({
        position: 'topright',
        draw: {
          polygon: {
            allowIntersection: false,
            showArea: true,
            metric: false,
            shapeOptions: {
              color: '#16a34a',
              weight: 3,
              fillOpacity: 0.2,
            },
          },
          rectangle: {
            shapeOptions: {
              color: '#2563eb',
              weight: 3,
              fillOpacity: 0.2,
            },
          },
          circle: false,
          polyline: false,
          marker: false,
          circlemarker: false,
        },
        edit: {
          featureGroup: drawnItems,
          remove: true,
        },
      })
      map.addControl(drawControl)
      drawControlRef.current = drawControl

      // Handle polygon creation
      map.on(L.Draw.Event.CREATED, (e: any) => {
        const layer = e.layer
        drawnItems.addLayer(layer)

        const geoJSON = layer.toGeoJSON()
        const areaSquareMeters = turf.area(geoJSON)
        const areaAcres = areaSquareMeters * 0.000247105

        if (areaAcres < 0.5) {
          setValidationError('Field must be at least 0.5 acres')
          drawnItems.removeLayer(layer)
          return
        }

        if (areaAcres > 10000) {
          setValidationError('Field exceeds maximum size of 10,000 acres')
          drawnItems.removeLayer(layer)
          return
        }

        const coordinates = geoJSON.geometry.coordinates[0]
        if (coordinates.length > 1000) {
          setValidationError('Field boundary is too complex (max 1000 points)')
          drawnItems.removeLayer(layer)
          return
        }

        setValidationError('')
        setDrawnPolygon(geoJSON)
        setPolygonArea(areaAcres)
      })

      map.on(L.Draw.Event.EDITED, (e: any) => {
        const layers = e.layers
        layers.eachLayer((layer: any) => {
          const geoJSON = layer.toGeoJSON()
          const areaSquareMeters = turf.area(geoJSON)
          const areaAcres = areaSquareMeters * 0.000247105

          if (areaAcres < 0.5 || areaAcres > 10000) {
            setValidationError('Invalid area after edit')
            return
          }

          setDrawnPolygon(geoJSON)
          setPolygonArea(areaAcres)
        })
      })

      map.on(L.Draw.Event.DELETED, () => {
        setDrawnPolygon(null)
        setPolygonArea(0)
        setValidationError('')
      })
    }

    if (mode === 'browse') {
      if (!editableFieldGroupRef.current) {
        const editableGroup = new L.FeatureGroup()
        map.addLayer(editableGroup)
        editableFieldGroupRef.current = editableGroup
      }

      if (!editControlRef.current) {
        const editControl = new L.Control.Draw({
          position: 'topright',
          draw: false,
          edit: {
            featureGroup: editableFieldGroupRef.current,
            edit: {
              selectedPathOptions: {
                opacity: 0.8,
                dashArray: '10, 10',
                fill: true,
                fillOpacity: 0.3
              }
            },
            remove: false
          }
        })

        map.addControl(editControl)
        editControlRef.current = editControl
      }

      map.on('draw:editstart', () => {
        setIsInEditMode(true)
        vertexMarkersRef.current.forEach((marker: any) => marker.remove())
      })

      map.on('draw:editstop', () => {
        setIsInEditMode(false)
        if (selectedFieldLayerRef.current) {
          const polygon = selectedFieldLayerRef.current
          const latlngs = polygon.getLatLngs()[0]
          
          vertexMarkersRef.current.forEach((marker: any) => marker.remove())
          vertexMarkersRef.current = []
          
          latlngs.forEach((latlng: any) => {
            const vertexMarker = L.circleMarker(latlng, {
              radius: 5,
              fillColor: '#ffffff',
              color: '#3b82f6',
              weight: 2,
              fillOpacity: 1,
              opacity: 1,
            })
            vertexMarker.addTo(map)
            vertexMarkersRef.current.push(vertexMarker)
          })
        }
      })

      map.on(L.Draw.Event.EDITED, (e: any) => {
        const layers = e.layers
        layers.eachLayer((layer: any) => {
          const latlngs = layer.getLatLngs()[0]
          
          const coordinates = latlngs.map((latlng: any) => [latlng.lng, latlng.lat])
          coordinates.push(coordinates[0])
          
          const geoJSON = {
            type: 'Polygon' as const,
            coordinates: [coordinates]
          }
          
          const feature = {
            type: 'Feature' as const,
            geometry: geoJSON,
            properties: {}
          }
          
          const areaSquareMeters = turf.area(feature)
          const areaAcres = areaSquareMeters * 0.000247105
          
          if (selectedCSBField) {
            const updatedField = {
              ...selectedCSBField,
              geometry: geoJSON,
              acres: areaAcres
            }
            setSelectedCSBField(updatedField)
            
            if (onFieldSelected) {
              onFieldSelected(updatedField)
            }
          }

          vertexMarkersRef.current.forEach((marker: any) => marker.remove())
          vertexMarkersRef.current = []
          
          latlngs.forEach((latlng: any) => {
            const vertexMarker = L.circleMarker(latlng, {
              radius: 5,
              fillColor: '#ffffff',
              color: '#3b82f6',
              weight: 2,
              fillOpacity: 1,
              opacity: 1,
            })
            if (mapRef.current) {
              vertexMarker.addTo(mapRef.current)
              vertexMarkersRef.current.push(vertexMarker)
            }
          })
        })
      })
    }

    return () => {
      if (mode !== 'browse' && editControlRef.current && mapRef.current) {
        mapRef.current.removeControl(editControlRef.current)
        editControlRef.current = null
      }
    }
  }, [mode, mapInitialized, leafletLoaded])

  // CSB Layer effect
  useEffect(() => {
    if (!mapRef.current || !mapInitialized || !leafletLoaded) return
    if (mode !== 'browse') return

    const L = (window as any).L
    const map = mapRef.current
    let updateTimeout: NodeJS.Timeout

    const loadCSBTileLayer = async () => {
      try {
        const tileResponse = await geeApi.getCSBTileURL({
          opacity: 0.7,
          min_complexity: 1,
          max_complexity: 4
        })

        if (csbLayerRef.current) {
          map.removeLayer(csbLayerRef.current)
        }

        const csbTileLayer = L.tileLayer(tileResponse.tile_url, {
          attribution: 'USDA CSB - Crop Rotation Complexity',
          opacity: 0.7,
          minZoom: 10,
          maxZoom: 20
        })

        csbTileLayer.addTo(map)
        csbLayerRef.current = csbTileLayer
      } catch (error) {
        // Suppress generic network errors for optional CSB layer
        const msg = error instanceof Error ? error.message : String(error);
        if (msg.includes('Network Error')) {
           console.warn('[CSB] Service unavailable (Network Error) - Tile layer skipped');
        } else {
           console.warn('[CSB] Error loading CSB tile layer:', error);
        }
      }
    }

    const updateInteractiveLayer = async () => {
      try {
        const zoom = map.getZoom()
        
        if (zoom < 13) {
          if (csbGeoJsonLayerRef.current) {
            map.removeLayer(csbGeoJsonLayerRef.current)
            csbGeoJsonLayerRef.current = null
          }
          return
        }

        let limit = 500
        if (zoom >= 15) {
          limit = 2000
        } else if (zoom >= 13) {
          limit = 1000
        }

        const bounds = map.getBounds()
        
        const response = await geeApi.getCSBBounds({
          minLon: bounds.getWest(),
          minLat: bounds.getSouth(),
          maxLon: bounds.getEast(),
          maxLat: bounds.getNorth(),
          limit: limit
        })

        if (csbGeoJsonLayerRef.current) {
          map.removeLayer(csbGeoJsonLayerRef.current)
        }

        const geoJsonLayer = L.geoJSON(response, {
          style: {
            color: '#FF6B35',
            weight: 2,
            opacity: 0.8,
            fillOpacity: 0
          },
          onEachFeature: (feature: any, layer: any) => {
            if (feature.properties) {
              const props = feature.properties
              const acres = props.acres || props.CSBACRES || props.ACRES
              const fieldId = props.clu_id || props.CSBID || props.CLU_ID || feature.id
              const complexity = props.rotation_complexity || props.ROTATION_COMPLEXITY || 'N/A'
              
              layer.bindTooltip(
                `<strong>Field ID:</strong> ${fieldId || 'Unknown'}<br/>` +
                `<strong>Acres:</strong> ${acres ? acres.toFixed(2) : 'N/A'}<br/>` +
                `<strong>Rotation:</strong> ${complexity === 1 ? 'Monoculture' : 
                  complexity === 2 ? '2-crop rotation' : 
                  complexity === 3 ? '3-crop rotation' : 
                  complexity >= 4 ? 'Diverse (4+ crops)' : 'N/A'}`,
                { sticky: true }
              )

              layer.on({
                mouseover: (e: any) => {
                  const target = e.target
                  target.setStyle({
                    color: '#16a34a',
                    weight: 3,
                    opacity: 1,
                    fillOpacity: 0.2,
                    fillColor: '#16a34a'
                  })
                  target.bringToFront()
                },
                mouseout: (e: any) => {
                  const target = e.target
                  target.setStyle({
                    color: '#FF6B35',
                    weight: 2,
                    opacity: 0.8,
                    fillOpacity: 0
                  })
                }
              })
            }
          }
        }).addTo(map)

        csbGeoJsonLayerRef.current = geoJsonLayer
      } catch (error) {
        console.error('[CSB] Error loading interactive layer:', error)
      }
    }

    if (showCSBLayer) {
      loadCSBTileLayer()

      const handleMapChange = () => {
        clearTimeout(updateTimeout)
        updateTimeout = setTimeout(updateInteractiveLayer, 500)
      }

      map.on('moveend', handleMapChange)
      map.on('zoomend', handleMapChange)

      updateInteractiveLayer()

      const handleMapClick = async (e: any) => {
        if (mode !== 'browse' || isInEditMode) {
          return
        }

        setIsSelectingField(true)
        setValidationError('')

        try {
          const field = await geeApi.queryFieldAtPoint(e.latlng.lat, e.latlng.lng)
          
          if (field) {
            setSelectedCSBField(field)
            
            if (selectedFieldLayerRef.current) {
              if (editableFieldGroupRef.current) {
                editableFieldGroupRef.current.clearLayers()
              }
              map.removeLayer(selectedFieldLayerRef.current)
            }
            vertexMarkersRef.current.forEach((marker: any) => marker.remove())
            vertexMarkersRef.current = []

            const coords = (field.geometry as any).coordinates[0]
            const latlngs = coords.map((coord: number[]) => [coord[1], coord[0]])
            
            const editablePolygon = L.polygon(latlngs, {
              color: '#3b82f6',
              weight: 3,
              fillColor: '#3b82f6',
              fillOpacity: 0.15,
            })

            if (editableFieldGroupRef.current) {
              editableFieldGroupRef.current.addLayer(editablePolygon)
            }
            
            selectedFieldLayerRef.current = editablePolygon

            vertexMarkersRef.current.forEach((marker: any) => marker.remove())
            vertexMarkersRef.current = []

            latlngs.forEach((latlng: [number, number]) => {
              const vertexMarker = L.circleMarker(latlng, {
                radius: 5,
                fillColor: '#ffffff',
                color: '#3b82f6',
                weight: 2,
                fillOpacity: 1,
                opacity: 1,
                interactive: false,
              })
              vertexMarker.addTo(map)
              vertexMarkersRef.current.push(vertexMarker)
            })
            
            editablePolygon.on('click', (e: any) => {
              if (!isInEditMode) {
                L.DomEvent.stopPropagation(e)
              }
            })

            map.fitBounds(editablePolygon.getBounds(), { padding: [50, 50] })
            setTimeout(() => {
              const currentZoom = map.getZoom()
              map.setZoom(currentZoom - 1)
            }, 100)
          } else {
            setValidationError('No field found at this location. Try clicking inside a field boundary.')
          }
        } catch (error) {
          console.error('Error selecting field:', error)
          setValidationError('Failed to select field. Please try again.')
        } finally {
          setIsSelectingField(false)
        }
      }

      if (mode === 'browse') {
        map.on('click', handleMapClick)
        mapClickHandlerRef.current = handleMapClick
      }

      return () => {
        clearTimeout(updateTimeout)
        map.off('moveend', handleMapChange)
        map.off('zoomend', handleMapChange)
        if (mode === 'browse' && mapClickHandlerRef.current) {
          map.off('click', mapClickHandlerRef.current)
        }
        if (csbGeoJsonLayerRef.current) {
          map.removeLayer(csbGeoJsonLayerRef.current)
          csbGeoJsonLayerRef.current = null
        }
      }
    } else {
      if (csbGeoJsonLayerRef.current) {
        map.removeLayer(csbGeoJsonLayerRef.current)
        csbGeoJsonLayerRef.current = null
      }
    }
  }, [showCSBLayer, mapInitialized, mode, leafletLoaded, isInEditMode])

  if (!leafletLoaded) {
    return (
      <div className="relative w-full h-full flex items-center justify-center bg-gray-100">
        <div className="text-gray-500">Loading map...</div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />

      {/* Layer Controls for Browse Mode */}
      {mode === 'browse' && onCSBLayerToggle && (
        <div 
          className="absolute top-4 rounded-lg shadow-2xl z-[1000] overflow-hidden transition-all duration-300"
          style={{ 
            backgroundColor: 'rgba(255, 255, 255, 0.95)', 
            border: '1px solid #e5e7eb',
            right: layerPanelCollapsed ? '74px' : '74px',
            width: layerPanelCollapsed ? '40px' : '240px'
          }}
        >
          {layerPanelCollapsed ? (
            <button
              onClick={() => setLayerPanelCollapsed(false)}
              className="p-3 hover:bg-gray-50 transition-colors w-full"
              title="Expand Layers"
            >
              <Layers className="w-4 h-4 mx-auto" style={{ color: '#16a34a' }} />
            </button>
          ) : (
            <>
              <div className="px-4 py-3 flex items-center justify-between" style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
                  <Layers className="w-4 h-4" style={{ color: '#16a34a' }} />
                  Map Layers
                </h3>
                <button
                  onClick={() => setLayerPanelCollapsed(true)}
                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                  title="Collapse"
                >
                  <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-4 space-y-3">
                <label className="flex items-center gap-3 text-sm cursor-pointer hover:bg-gray-50 -mx-2 px-2 py-1 rounded transition-colors">
                  <input
                    type="checkbox"
                    checked={showCSBLayer}
                    onChange={onCSBLayerToggle}
                    className="w-4 h-4 rounded"
                    style={{ accentColor: '#3b82f6' }}
                  />
                  <span className="text-gray-700">Field Boundaries (CSB)</span>
                </label>
                <label className="flex items-center gap-3 text-sm cursor-pointer hover:bg-gray-50 -mx-2 px-2 py-1 rounded transition-colors">
                  <input
                    type="checkbox"
                    checked={showCSBTileLayer}
                    onChange={(e) => {
                      const checked = e.target.checked
                      setShowCSBTileLayer(checked)
                      if (csbLayerRef.current && mapRef.current) {
                        if (checked) {
                          mapRef.current.addLayer(csbLayerRef.current)
                        } else {
                          mapRef.current.removeLayer(csbLayerRef.current)
                        }
                      }
                    }}
                    className="w-4 h-4 rounded"
                    style={{ accentColor: '#3b82f6' }}
                  />
                  <span className="text-gray-700">Rotation History</span>
                </label>
              </div>

              {/* Crop Rotation Complexity Legend */}
              <div style={{ borderTop: '1px solid #e5e7eb' }}>
                <div className="px-4 py-3" style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  <h3 className="font-semibold text-gray-900 text-xs">
                    Crop Rotation Complexity
                  </h3>
                </div>
                <div className="p-3 space-y-2">
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ef4444' }}></div>
                    <span className="text-gray-700">Monoculture (1 crop)</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: '#f97316' }}></div>
                    <span className="text-gray-700">2-crop rotation</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: '#22c55e' }}></div>
                    <span className="text-gray-700">3-crop rotation</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: '#3b82f6' }}></div>
                    <span className="text-gray-700">Diverse (4+ crops)</span>
                  </div>
                  <div className="pt-2 mt-2 text-xs text-gray-500 border-t border-gray-200">
                    Zoom in (13+) for field details
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Browse Instructions */}
      {mode === 'browse' && !selectedCSBField && (
        <div 
          className="absolute bottom-4 left-1/2 transform -translate-x-1/2 rounded-lg shadow-2xl px-4 py-3 z-[1000]"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #e5e7eb' }}
        >
          <div className="flex items-center gap-2 text-sm">
            <div className="p-1.5 rounded" style={{ backgroundColor: '#f0fdf4' }}>
              <MapPin className="w-4 h-4" style={{ color: '#16a34a' }} />
            </div>
            <span className="text-gray-700 font-medium">
              {isSelectingField ? 'Loading field...' : 'Click on a field boundary to select it'}
            </span>
          </div>
        </div>
      )}

      {/* CSB Field Selection Confirmation */}
      {mode === 'browse' && selectedCSBField && (
        <div 
          className="absolute top-4 left-4 rounded-lg shadow-2xl z-[1000]"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.98)', border: '1px solid #e5e7eb', minWidth: '400px', maxWidth: '450px' }}
        >
          <div className="px-4 py-3" style={{ backgroundColor: '#f0fdf4', borderBottom: '1px solid #bbf7d0' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" style={{ color: '#16a34a' }} />
                <h3 className="font-semibold text-gray-900 text-sm">Field Selected</h3>
              </div>
              <button
                onClick={() => {
                  setSelectedCSBField(null)
                  setCustomFieldName('')
                  if (selectedFieldLayerRef.current && mapRef.current) {
                    mapRef.current.removeLayer(selectedFieldLayerRef.current)
                    selectedFieldLayerRef.current = null
                  }
                  if (editableFieldGroupRef.current) {
                    editableFieldGroupRef.current.clearLayers()
                  }
                  vertexMarkersRef.current.forEach((marker: any) => marker.remove())
                  vertexMarkersRef.current = []
                }}
                className="text-gray-500 hover:text-gray-700 text-xs font-medium"
              >
                Clear
              </button>
            </div>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <span className="text-gray-600 text-xs">CLU ID:</span>
                <div className="font-semibold text-gray-900 text-sm">{selectedCSBField.clu_id || 'N/A'}</div>
              </div>
              <div>
                <span className="text-gray-600 text-xs">Area:</span>
                <div className="text-xl font-bold" style={{ color: '#16a34a' }}>
                  {selectedCSBField.acres != null ? selectedCSBField.acres.toFixed(2) : 'N/A'} <span className="text-sm font-normal">acres</span>
                </div>
              </div>
              <div>
                <span className="text-gray-600 text-xs">State:</span>
                <div className="font-semibold text-gray-900 text-sm">{getStateName(selectedCSBField.state)}</div>
              </div>
              <div>
                <span className="text-gray-600 text-xs">County:</span>
                <div className="font-semibold text-gray-900 text-sm">{selectedCSBField.county || 'N/A'}</div>
              </div>
            </div>

            {/* Rotation Analysis */}
            {selectedCSBField.rotation_analysis && selectedCSBField.sustainability_metrics && (
              <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: '#f0fdf4', border: '1px solid #86efac' }}>
                <h4 className="font-semibold text-gray-900 text-xs mb-2">Crop Rotation Analysis (2017-2023)</h4>
                
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600">Sustainability Score:</span>
                    <span className="text-sm font-bold" style={{ 
                      color: selectedCSBField.sustainability_metrics.total_score >= 75 ? '#16a34a' : 
                             selectedCSBField.sustainability_metrics.total_score >= 50 ? '#f59e0b' : '#dc2626'
                    }}>
                      {selectedCSBField.sustainability_metrics.total_score}/100 - {selectedCSBField.sustainability_metrics.rating}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full transition-all" 
                      style={{ 
                        width: `${selectedCSBField.sustainability_metrics.total_score}%`,
                        backgroundColor: selectedCSBField.sustainability_metrics.total_score >= 75 ? '#16a34a' : 
                                       selectedCSBField.sustainability_metrics.total_score >= 50 ? '#f59e0b' : '#dc2626'
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs mb-2">
                  <div>
                    <span className="text-gray-600">Pattern:</span>
                    <div className="font-semibold text-gray-900">{formatPatternType(selectedCSBField.rotation_analysis.pattern_type)}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Unique Crops:</span>
                    <div className="font-semibold text-gray-900">{selectedCSBField.rotation_analysis.unique_crops}</div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1">
                  {selectedCSBField.sustainability_metrics.has_cover_crops && (
                    <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: '#86efac', color: '#166534' }}>
                      +{selectedCSBField.sustainability_metrics.cover_crop_bonus} Cover Crops
                    </span>
                  )}
                  {selectedCSBField.sustainability_metrics.has_nitrogen_fixers && (
                    <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: '#86efac', color: '#166534' }}>
                      +{selectedCSBField.sustainability_metrics.nitrogen_fixation_bonus} N-Fixers
                    </span>
                  )}
                </div>

                {selectedCSBField.crop_names && Object.keys(selectedCSBField.crop_names).length > 0 && (
                  <div className="mt-3 pt-3 border-t border-green-200">
                    <span className="text-xs text-gray-600 font-semibold">7-Year Rotation:</span>
                    <div className="mt-1 space-y-1">
                      {Object.entries(selectedCSBField.crop_names)
                        .sort(([yearA], [yearB]) => yearB.localeCompare(yearA))
                        .slice(0, 7)
                        .map(([year, crop]) => (
                          <div key={year} className="flex justify-between text-xs">
                            <span className="text-gray-600">{year}:</span>
                            <span className="font-medium text-gray-900">{crop}</span>
                          </div>
                        ))
                      }
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Custom Field Name */}
            <div className="mb-4">
              <label htmlFor="fieldName" className="block text-xs font-semibold text-gray-700 mb-2">
                Field Name (Optional)
              </label>
              <input
                id="fieldName"
                type="text"
                value={customFieldName}
                onChange={(e) => setCustomFieldName(e.target.value)}
                placeholder={`Field ${selectedCSBField.clu_id || 'Unknown'}`}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                This name will be used to identify the field in analysis pages
              </p>
            </div>

            <button
              onClick={() => {
                if (onFieldSelected) {
                  onFieldSelected({
                    name: customFieldName.trim() || `Field ${selectedCSBField.clu_id || 'Unknown'}`,
                    area: selectedCSBField.acres || 0,
                    acres: selectedCSBField.acres || 0,
                    boundary: selectedCSBField.geometry,
                    clu_id: selectedCSBField.clu_id,
                    state: selectedCSBField.state,
                    county: selectedCSBField.county,
                    geometry: selectedCSBField.geometry,
                    method: 'csb-selected',
                  })
                }
              }}
              className="w-full px-4 py-3 rounded-lg font-semibold text-white transition-colors"
              style={{ backgroundColor: '#16a34a' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#15803d'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#16a34a'}
            >
              Analyze This Field
            </button>
          </div>
        </div>
      )}

      {/* Drawn Polygon Info */}
      {mode === 'draw' && drawnPolygon && (
        <div 
          className="absolute bottom-4 left-1/2 transform -translate-x-1/2 rounded-lg shadow-2xl z-[1000]"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.98)', border: '1px solid #e5e7eb', minWidth: '400px' }}
        >
          <div className="px-4 py-3" style={{ backgroundColor: '#f0fdf4', borderBottom: '1px solid #bbf7d0' }}>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" style={{ color: '#16a34a' }} />
              <h3 className="font-semibold text-gray-900 text-sm">Field Boundary Drawn</h3>
            </div>
          </div>
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-gray-600 text-xs">Total Area:</span>
                <div className="text-2xl font-bold" style={{ color: '#16a34a' }}>
                  {polygonArea.toFixed(2)} <span className="text-sm font-normal">acres</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-gray-600 text-xs">Vertices:</span>
                <div className="text-lg font-semibold text-gray-900">
                  {drawnPolygon.geometry.coordinates[0].length - 1}
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                if (onFieldSelected) {
                  onFieldSelected({
                    name: 'Custom Drawn Field',
                    area: polygonArea,
                    boundary: drawnPolygon,
                    clu_id: `custom-${Date.now()}`,
                    method: 'drawn',
                  })
                }
              }}
              className="w-full px-4 py-3 rounded-lg font-semibold text-white transition-colors"
              style={{ backgroundColor: '#16a34a' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#15803d'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#16a34a'}
            >
              Analyze This Field
            </button>
          </div>
        </div>
      )}

      {/* Validation Error */}
      {validationError && (
        <div 
          className="absolute top-4 right-4 rounded-lg shadow-2xl z-[1000] max-w-sm"
          style={{ backgroundColor: 'rgba(254, 242, 242, 0.98)', border: '1px solid #fecaca' }}
        >
          <div className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#dc2626' }} />
              <div>
                <h3 className="font-semibold text-sm mb-1" style={{ color: '#991b1b' }}>
                  Validation Error
                </h3>
                <p className="text-xs" style={{ color: '#991b1b' }}>
                  {validationError}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
})

FieldMap.displayName = 'FieldMap'

export default FieldMap
