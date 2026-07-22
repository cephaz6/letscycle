'use client';

import { useEffect, useRef, useState } from 'react';
import maplibregl, { type Map as MapLibreMap, type Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { LocateFixed, Search } from 'lucide-react';
import type { HomeLocation } from '@letscycle/api-client';
import { Button, Input, cn } from '@letscycle/ui';

interface GeocodeResult {
  label: string;
  lat: number;
  lng: number;
}

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
 * Picker for an approximate home location, with three ways in: aim the pin
 * (click/drag), type an address or postcode, or paste coordinates. "Use my
 * location" asks the browser. The value is deliberately approximate — it drives
 * distance matching and search, and is never shown to other members.
 *
 * Geocoding uses Nominatim, whose usage policy caps automated traffic; like the
 * tiles it wants a proper provider before real load.
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
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');

  // Keep the coordinate fields showing the current pin.
  useEffect(() => {
    setManualLat(value ? String(value.lat) : '');
    setManualLng(value ? String(value.lng) : '');
  }, [value]);

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

  /** Address/postcode lookup, for people who'd rather type than aim a pin. */
  async function search(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setError(null);
    setSearching(true);
    setResults([]);
    try {
      const url =
        `https://nominatim.openstreetmap.org/search?format=json&limit=5` +
        `&countrycodes=gb&q=${encodeURIComponent(q)}`;
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error('lookup failed');
      const rows = (await res.json()) as {
        display_name: string;
        lat: string;
        lon: string;
      }[];
      if (rows.length === 0) {
        setError('No matches — try a postcode, or drop a pin instead.');
        return;
      }
      setResults(
        rows.map((r) => ({
          label: r.display_name,
          lat: Number(r.lat),
          lng: Number(r.lon),
        })),
      );
    } catch {
      setError('Address lookup is unavailable — drop a pin instead.');
    } finally {
      setSearching(false);
    }
  }

  function applyManual(e: React.FormEvent): void {
    e.preventDefault();
    const lat = Number.parseFloat(manualLat);
    const lng = Number.parseFloat(manualLng);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      return setError('Latitude must be between -90 and 90.');
    }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      return setError('Longitude must be between -180 and 180.');
    }
    setError(null);
    onChangeRef.current({
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6)),
      accuracyMetres: value?.accuracyMetres ?? DEFAULT_ACCURACY_METRES,
    });
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div
          ref={containerRef}
          className="h-64 w-full overflow-hidden rounded-xl border border-border sm:h-72"
        />

        {/* Type-it-instead alternative to aiming the pin. */}
        <div className="flex flex-col gap-3">
          <form onSubmit={(e) => void search(e)} className="space-y-1.5">
            <label htmlFor="loc-search" className="block text-sm font-medium">
              Search address or postcode
            </label>
            <div className="flex gap-2">
              <Input
                id="loc-search"
                placeholder="e.g. L1 8JQ"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <Button
                type="submit"
                variant="outline"
                className="shrink-0 rounded-full"
                disabled={searching}
              >
                <Search className="size-4" />
                <span className="sr-only">Search</span>
              </Button>
            </div>
          </form>

          {searching && <p className="text-xs text-muted-foreground">Searching…</p>}

          {results.length > 0 && (
            <ul className="max-h-32 overflow-y-auto rounded-lg border border-border">
              {results.map((r) => (
                <li key={`${r.lat},${r.lng}`}>
                  <button
                    type="button"
                    onClick={() => {
                      onChangeRef.current({
                        lat: Number(r.lat.toFixed(6)),
                        lng: Number(r.lng.toFixed(6)),
                        accuracyMetres: DEFAULT_ACCURACY_METRES,
                      });
                      setResults([]);
                      setQuery('');
                    }}
                    className="block w-full px-3 py-2 text-left text-xs transition-colors hover:bg-accent"
                  >
                    {r.label}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={applyManual} className="space-y-1.5">
            <span className="block text-sm font-medium">Or enter coordinates</span>
            <div className="flex gap-2">
              <Input
                aria-label="Latitude"
                inputMode="decimal"
                placeholder="Lat"
                value={manualLat}
                onChange={(e) => setManualLat(e.target.value)}
              />
              <Input
                aria-label="Longitude"
                inputMode="decimal"
                placeholder="Lng"
                value={manualLng}
                onChange={(e) => setManualLng(e.target.value)}
              />
              <Button type="submit" variant="outline" className="shrink-0 rounded-full">
                Set
              </Button>
            </div>
          </form>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="self-start rounded-full"
            disabled={locating}
            onClick={useMyLocation}
          >
            <LocateFixed className="size-4" />
            {locating ? 'Locating…' : 'Use my location'}
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {value
          ? `Pinned at ${value.lat.toFixed(4)}, ${value.lng.toFixed(4)}`
          : 'Click the map, drag the pin, or use the form.'}
      </p>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
