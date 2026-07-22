'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import maplibregl, { type Map as MapLibreMap, type Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Landmark, MapPin, ShieldCheck, ShoppingCart, Users } from 'lucide-react';
import {
  useMeetPoints,
  type MeetPoint,
  type MeetPointCategory,
} from '@letscycle/api-client';
import { Badge, Skeleton, Text, cn } from '@letscycle/ui';
import { useAuth } from '@/features/auth';
import { DEFAULT_CENTRE, OSM_STYLE } from '@/components/map-style';

const CATEGORY: Record<MeetPointCategory, { label: string; icon: typeof MapPin }> = {
  policeStation: { label: 'Police station', icon: ShieldCheck },
  supermarket: { label: 'Supermarket', icon: ShoppingCart },
  library: { label: 'Library', icon: Landmark },
  communityCentre: { label: 'Community centre', icon: Users },
};

function formatDistance(metres: number | null): string {
  if (metres === null) return '';
  return metres < 1000 ? `${Math.round(metres)} m` : `${(metres / 1000).toFixed(1)} km`;
}

/** Verified public places to hand items over, nearest to the member first. */
export function MeetPointsView() {
  const { user } = useAuth();
  const home = user?.homeLocation ?? null;
  const [selected, setSelected] = useState<string | null>(null);

  const params = useMemo(
    () => (home ? { lat: home.lat, lng: home.lng, radiusKm: 15, limit: 20 } : null),
    [home],
  );
  const { data, isLoading, isError } = useMeetPoints(params);
  const points = useMemo(() => data ?? [], [data]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold tracking-tight">Safe meet points</h1>
      <Text muted className="mb-5 mt-1 text-sm">
        Public, well-lit places to hand something over. Meeting at one of these is the
        safest way to complete a swap.
      </Text>

      {!home ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
          <MapPin className="size-10 text-muted-foreground" />
          <div>
            <p className="font-semibold">Set your location first</p>
            <Text muted className="mx-auto mt-1 max-w-sm text-sm">
              We show meet points near you — add a home location and they’ll appear here.
            </Text>
          </div>
          <Link
            href="/settings"
            className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Set my location
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
          <MeetPointsMap
            points={points}
            centre={home}
            selectedId={selected}
            onSelect={setSelected}
          />

          <div className="lg:max-h-128 lg:overflow-y-auto">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-xl" />
                ))}
              </div>
            ) : isError ? (
              <Text muted className="text-sm">
                Couldn’t load meet points right now.
              </Text>
            ) : points.length === 0 ? (
              <Text muted className="text-sm">
                No verified meet points within 15 km yet.
              </Text>
            ) : (
              <ul className="space-y-2">
                {points.map((p) => {
                  const meta = CATEGORY[p.category];
                  const Icon = meta.icon;
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => setSelected(p.id)}
                        className={cn(
                          'w-full rounded-xl border p-3 text-left transition-colors',
                          selected === p.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border bg-card hover:bg-accent/40',
                        )}
                      >
                        <span className="flex items-start gap-2.5">
                          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                            <Icon className="size-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center justify-between gap-2">
                              <span className="truncate font-semibold">{p.name}</span>
                              <span className="shrink-0 text-xs text-muted-foreground">
                                {formatDistance(p.distanceMetres)}
                              </span>
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {p.address}
                            </span>
                            <Badge variant="muted" className="mt-1.5">
                              {meta.label}
                            </Badge>
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MeetPointsMap({
  points,
  centre,
  selectedId,
  onSelect,
}: {
  points: MeetPoint[];
  centre: { lat: number; lng: number };
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Map<string, Marker>>(new Map());
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;
    const map = new maplibregl.Map({
      container,
      style: OSM_STYLE,
      center: [centre.lng ?? DEFAULT_CENTRE.lng, centre.lat ?? DEFAULT_CENTRE.lat],
      zoom: 12,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    // "You" marker, muted so the meet points stand out.
    new maplibregl.Marker({ color: '#64748b' })
      .setLngLat([centre.lng, centre.lat])
      .setPopup(new maplibregl.Popup({ offset: 24 }).setText('Your area'))
      .addTo(map);
    mapRef.current = map;
    // Capture the marker map now — the ref may point elsewhere by cleanup time.
    const markers = markersRef.current;
    return () => {
      map.remove();
      mapRef.current = null;
      markers.clear();
    };
    // Set up once; markers are synced separately.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync markers to the loaded points.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    for (const [, marker] of markersRef.current) marker.remove();
    markersRef.current.clear();

    for (const p of points) {
      const marker = new maplibregl.Marker({ color: '#16a34a' })
        .setLngLat([p.location.lng, p.location.lat])
        .setPopup(
          new maplibregl.Popup({ offset: 24 }).setHTML(
            `<strong>${p.name}</strong><br/>${p.address}`,
          ),
        )
        .addTo(map);
      marker.getElement().addEventListener('click', () => onSelectRef.current(p.id));
      markersRef.current.set(p.id, marker);
    }
  }, [points]);

  // Fly to a point chosen from the list.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedId) return;
    const point = points.find((p) => p.id === selectedId);
    if (!point) return;
    map.easeTo({ center: [point.location.lng, point.location.lat], zoom: 15 });
    markersRef.current.get(selectedId)?.togglePopup();
  }, [selectedId, points]);

  return (
    <div
      ref={containerRef}
      className="h-80 w-full overflow-hidden rounded-2xl border border-border lg:h-128"
    />
  );
}
