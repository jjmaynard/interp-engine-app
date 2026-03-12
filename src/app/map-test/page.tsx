'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import MapView with no SSR to avoid "window is not defined" error
const MapView = dynamic(
  () => import('@/components/map/MapView').then((mod) => mod.MapView),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-[600px] bg-gray-100 flex items-center justify-center rounded-lg">
        <p className="text-gray-500">Loading map...</p>
      </div>
    )
  }
);

interface MapLocation {
  lat: number;
  lng: number;
  mukey?: string;
  componentName?: string;
  mapUnitName?: string;
}

export default function MapTestPage() {
  const [markers, setMarkers] = useState<MapLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastClick, setLastClick] = useState<{ lat: number; lng: number } | null>(null);

  const handleLocationClick = async (lat: number, lng: number) => {
    setLastClick({ lat, lng });
    setLoading(true);
    setError(null);

    try {
      // Call Python service to get MUKEY
      const response = await fetch('http://localhost:8000/spatial/calculate-by-location', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          latitude: lat,
          longitude: lng,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to get soil data');
      }

      const data = await response.json();

      // Add marker with soil information
      const newMarker: MapLocation = {
        lat,
        lng,
        mukey: data.mukey,
        componentName: data.component_name,
        mapUnitName: data.map_unit_name,
      };

      setMarkers([...markers, newMarker]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Phase 6: Map-Based Soil Interpretation
        </h1>
        <p className="text-gray-600 mb-6">
          Click anywhere on the map to get soil information at that location.
        </p>

        {/* Status Display */}
        <div className="mb-4 space-y-2">
          {loading && (
            <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
              Loading soil data...
            </div>
          )}
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              <strong>Error:</strong> {error}
            </div>
          )}
          
          {lastClick && !loading && !error && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
              <strong>Success!</strong> Soil data retrieved for ({lastClick.lat.toFixed(6)}, {lastClick.lng.toFixed(6)})
            </div>
          )}
        </div>

        {/* Map */}
        <MapView 
          onLocationClick={handleLocationClick}
          markers={markers}
        />

        {/* Markers Info */}
        {markers.length > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">
              Queried Locations ({markers.length})
            </h2>
            <div className="space-y-4">
              {markers.map((marker, idx) => (
                <div key={idx} className="border-l-4 border-blue-500 pl-4">
                  <p className="text-sm text-gray-600">
                    Location {idx + 1}: {marker.lat.toFixed(6)}, {marker.lng.toFixed(6)}
                  </p>
                  {marker.mukey && (
                    <>
                      <p className="font-semibold">MUKEY: {marker.mukey}</p>
                      <p>Component: {marker.componentName}</p>
                      <p>Map Unit: {marker.mapUnitName}</p>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
