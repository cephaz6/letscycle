'use client';

import { useEffect, useRef, useState } from 'react';
import maplibregl, { type Map as MapLibreMap, type Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { LocateFixed } from 'lucide-react';
import type { HomeLocation } from '@letscycle/api-client';
import { Button, cn } from '@letscycle/ui';

/** Liverpool city centre — the launch area, used when nothing is set yet. */
const DEFAULT_CENTRE = { lat: 53.4084, lng: -2.9916 };
const DEFAULT_ACCURACY_METRES = 500;

/**
 * Raster OpenStreetMap tiles. Fine for development and the MVP; a paid tile
 * provider (or self-hosted) is the swap before real traffic, per the PRD — OSM's
 * public tiles are not for production load.
 */
const OSM_STYLE = {
  version: 8 as const,
  sources: {
    osm: {
      type: 'raster' as const,
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [{ id: 'osm', type: 'raster' as const, source: 'osm' }],
};

/**
 * Drop-a-pin picker for an approximate home location. Click or drag the marker;
 * "Use my location" asks the browser. The value is deliberately approximate —
 * it drives distance matching and search, and is never shown to other members.
 */
export function LocationPicker({
  value,
  onChange,
  className,
}: {
  value: HomeLocation | null;
  onChange: (next: HomeLocation) => void;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  // Keep the latest callback without re-running the map setup effect.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    const start = value ?? { ...DEFAULT_CENTRE, accuracyMetres: DEFAULT_ACCURACY_METRES };
    const map = new maplibregl.Map({
      container,
      style: OSM_STYLE,
      center: [start.lng, start.lat],
      zoom: value ? 14 : 11,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    const marker = new maplibregl.Marker({ draggable: true, color: '#16a34a' })
      .setLngLat([start.lng, start.lat])
      .addTo(map);

    function emit(lng: number, lat: number): void {
      onChangeRef.current({
        lat: Number(lat.toFixed(6)),
        lng: Number(lng.toFixed(6)),
        accuracyMetres: DEFAULT_ACCURACY_METRES,
      });
    }

    marker.on('dragend', () => {
      const { lng, lat } = marker.getLngLat();
      emit(lng, lat);
    });
    map.on('click', (e) => {
      marker.setLngLat(e.lngLat);
      emit(e.lngLat.lng, e.lngLat.lat);
    });

    mapRef.current = map;
    markerRef.current = marker;
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // Set up once; later value changes are pushed in the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reflect an externally-set value (e.g. "use my location") on the map.
  useEffect(() => {
    if (!value || !mapRef.current || !markerRef.current) return;
    markerRef.current.setLngLat([value.lng, value.lat]);
    mapRef.current.easeTo({ center: [value.lng, value.lat], zoom: 14 });
  }, [value]);

  function useMyLocation(): void {
    if (!navigator.geolocation) {
      setError('Your browser can’t share a location.');
      return;
    }
    setError(null);
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        onChangeRef.current({
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
          accuracyMetres: Math.max(
            50,
            Math.round(pos.coords.accuracy || DEFAULT_ACCURACY_METRES),
          ),
        });
      },
      () => {
        setLocating(false);
        setError('Couldn’t get your location — drop a pin instead.');
      },
      { enableHighAccuracy: false, timeout: 10_000 },
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div
        ref={containerRef}
        className="h-64 w-full overflow-hidden rounded-xl border border-border"
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full"
          disabled={locating}
          onClick={useMyLocation}
        >
          <LocateFixed className="size-4" />
          {locating ? 'Locating…' : 'Use my location'}
        </Button>
        <span className="text-xs text-muted-foreground">
          {value
            ? `Pinned at ${value.lat.toFixed(4)}, ${value.lng.toFixed(4)}`
            : 'Click the map or drag the pin'}
        </span>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
