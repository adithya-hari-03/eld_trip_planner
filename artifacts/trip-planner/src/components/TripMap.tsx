import React, { useEffect } from "react";
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

// Fix default icon paths
L.Icon.Default.mergeOptions({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
});

import { Stop, RouteGeometry } from "@workspace/api-client-react";

interface TripMapProps {
  geometry: RouteGeometry;
  stops: Stop[];
}

function MapBounds({ coordinates }: { coordinates: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (coordinates && coordinates.length > 0) {
      const bounds = L.latLngBounds(coordinates);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [coordinates, map]);
  return null;
}

const getStopColor = (kind: string) => {
  switch (kind) {
    case "start": return "bg-green-500";
    case "pickup": return "bg-blue-500";
    case "dropoff": return "bg-red-500";
    case "fuel": return "bg-amber-500";
    case "rest_30min": return "bg-slate-500";
    case "rest_10hr": return "bg-indigo-500";
    case "reset_34hr": return "bg-purple-500";
    case "end_of_day": return "bg-gray-500";
    default: return "bg-primary";
  }
};

const createCustomIcon = (stop: Stop, index: number) => {
  const colorClass = getStopColor(stop.kind);
  return L.divIcon({
    className: "custom-div-icon",
    html: `<div class="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white shadow-md ${colorClass}">${index + 1}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

export function TripMap({ geometry, stops }: TripMapProps) {
  const coordinates = geometry.coordinates.map(coord => [coord[1], coord[0]] as [number, number]);

  return (
    <div className="w-full h-full min-h-[400px] rounded-lg overflow-hidden border border-border shadow-sm">
      <MapContainer
        center={[39.8283, -98.5795]} // Center of US
        zoom={4}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Polyline positions={coordinates} pathOptions={{ color: "hsl(var(--primary))", weight: 4, opacity: 0.8 }} />
        <MapBounds coordinates={coordinates} />
        
        {stops.map((stop, index) => (
          <Marker
            key={`${stop.kind}-${index}`}
            position={[stop.lat, stop.lon]}
            icon={createCustomIcon(stop, index)}
          >
            <Popup>
              <div className="p-1">
                <div className="font-bold text-sm mb-1">{stop.label}</div>
                <div className="text-xs text-muted-foreground mb-2 capitalize">{stop.kind.replace(/_/g, ' ')}</div>
                <div className="text-xs grid grid-cols-2 gap-x-2 gap-y-1">
                  <span className="font-medium">Arrival:</span><span>{new Date(stop.arrivalTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  <span className="font-medium">Departure:</span><span>{new Date(stop.departureTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  <span className="font-medium">Duration:</span><span>{stop.durationHours} hrs</span>
                  <span className="font-medium">Miles:</span><span>{stop.mileMarker} mi</span>
                </div>
                {stop.notes && (
                  <div className="mt-2 text-xs italic text-muted-foreground border-t pt-1">
                    {stop.notes}
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
