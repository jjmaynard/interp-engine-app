'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Only import CSS on client side
if (typeof window !== 'undefined') {
  import('leaflet/dist/leaflet.css');
}

interface MapLocation {
  lat: number;
  lng: number;
  mukey?: string;
  componentName?: string;
  mapUnitName?: string;
}

interface MapViewProps {
  onLocationClick?: (lat: number, lng: number) => void;
  markers?: MapLocation[];
  center?: [number, number];
  zoom?: number;
}

export function MapView({ 
  onLocationClick, 
  markers = [],
  center = [39.8283, -98.5795], // US center
  zoom = 4 
}: MapViewProps) {
  const [mounted, setMounted] = useState(false);
  const [MapComponents, setMapComponents] = useState<any>(null);

  useEffect(() => {
    // Dynamically import all react-leaflet components on client side only
    Promise.all([
      import('react-leaflet'),
      import('leaflet'),
      import('leaflet/dist/images/marker-icon.png'),
      import('leaflet/dist/images/marker-shadow.png')
    ]).then(([reactLeaflet, L, icon, iconShadow]) => {
      // Fix default marker icon
      const DefaultIcon = L.default.icon({
        iconUrl: icon.default.src,
        shadowUrl: iconShadow.default.src,
        iconSize: [25, 41],
        iconAnchor: [12, 41],
      });
      L.default.Marker.prototype.options.icon = DefaultIcon;
      
      setMapComponents(reactLeaflet);
      setMounted(true);
    });
  }, []);

  if (!mounted || !MapComponents) {
    return (
      <div className="w-full h-[600px] bg-gray-100 flex items-center justify-center rounded-lg">
        <p className="text-gray-500">Loading map...</p>
      </div>
    );
  }

  const { MapContainer, TileLayer, Marker, Popup, useMapEvents } = MapComponents;

  function LocationMarker() {
    useMapEvents({
      click(e: any) {
        if (onLocationClick) {
          onLocationClick(e.latlng.lat, e.latlng.lng);
        }
      },
    });
    return null;
  }

  return (
    <div className="w-full h-[600px] rounded-lg overflow-hidden shadow-lg">
      <MapContainer 
        center={center} 
        zoom={zoom} 
        style={{ height: '100%', width: '100%' }}
        className="z-0"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        <LocationMarker onLocationClick={onLocationClick} />
        
        {markers.map((marker, idx) => (
          <Marker 
            key={idx} 
            position={[marker.lat, marker.lng]}
          >
            <Popup>
              <div className="p-2">
                <p className="font-semibold">Location</p>
                <p className="text-sm">Lat: {marker.lat.toFixed(6)}</p>
                <p className="text-sm">Lng: {marker.lng.toFixed(6)}</p>
                {marker.mukey && (
                  <>
                    <p className="text-sm mt-2"><strong>MUKEY:</strong> {marker.mukey}</p>
                    {marker.componentName && (
                      <p className="text-sm"><strong>Component:</strong> {marker.componentName}</p>
                    )}
                    {marker.mapUnitName && (
                      <p className="text-sm"><strong>Map Unit:</strong> {marker.mapUnitName}</p>
                    )}
                  </>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
