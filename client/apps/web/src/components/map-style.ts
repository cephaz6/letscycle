/**
 * Shared MapLibre basemap config.
 *
 * Raster OpenStreetMap tiles: fine for development and the Liverpool MVP, but
 * OSM's public tiles are not for production load — a paid or self-hosted
 * provider is the swap before real traffic, per the PRD.
 */
export const OSM_STYLE = {
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

/** Liverpool city centre — the launch area, used when nothing is set yet. */
export const DEFAULT_CENTRE = { lat: 53.4084, lng: -2.9916 };
