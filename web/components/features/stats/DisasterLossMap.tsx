'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { Map as MapLibreMap } from 'maplibre-gl';
import { useTheme } from '@/components/providers';
import { resolveBasemapStyle, registerPMTilesProtocol } from '@/lib/map/basemap';
import { SOVEREIGN_INDIA_GEOJSON } from '@/lib/geo/indiaBoundary';
import { generateRecordedLossHexagons, type H3RecordedLossCell } from './statsData';
import 'maplibre-gl/dist/maplibre-gl.css';

export interface DisasterLossMapProps {
  centerLat?: number;
  centerLng?: number;
  zoom?: number;
  stateName?: string;
  className?: string;
  children?: React.ReactNode;
  showLegend?: boolean;
}

export const DisasterLossMap: React.FC<DisasterLossMapProps> = ({
  centerLat = 24.817,
  centerLng = 93.936, // Manipur / NE India default
  zoom = 8.5,
  stateName = 'Manipur',
  className = '',
  children,
  showLegend = true,
}) => {
  const { resolvedTheme } = useTheme();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [hoveredCell, setHoveredCell] = useState<H3RecordedLossCell | null>(null);

  const lossHexagons = useMemo(() => {
    return generateRecordedLossHexagons(centerLat, centerLng, stateName === 'All India');
  }, [centerLat, centerLng, stateName]);

  const geoJsonData: GeoJSON.FeatureCollection = useMemo(() => {
    return {
      type: 'FeatureCollection',
      features: lossHexagons.map((hex) => ({
        type: 'Feature',
        properties: {
          id: hex.id,
          label: hex.label,
          lives: hex.lives,
          category: hex.category,
          color: hex.color,
        },
        geometry: {
          type: 'Polygon',
          coordinates: [hex.polygon],
        },
      })),
    };
  }, [lossHexagons]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    let disposed = false;

    const initMap = async () => {
      await registerPMTilesProtocol();
      if (disposed || !mapContainerRef.current) return;

      maplibregl.setWorkerUrl('/maplibre-gl-worker.mjs');
      const isDark = resolvedTheme === 'dark';
      const initialStyle = resolveBasemapStyle(undefined, isDark);

      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: initialStyle,
        center: [centerLng, centerLat],
        zoom,
        pitch: 28,
        bearing: -10,
        attributionControl: false,
      });

      map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');

      map.on('load', () => {
        if (disposed) return;
        setMapLoaded(true);

        // Authoritative Sovereign India Boundary Source (Survey of India standard)
        map.addSource('sovereign-india-source', {
          type: 'geojson',
          data: SOVEREIGN_INDIA_GEOJSON,
        });

        // Sovereign Boundary Ambient Glow
        map.addLayer({
          id: 'sovereign-india-glow',
          type: 'line',
          source: 'sovereign-india-source',
          paint: {
            'line-color': isDark ? '#d49a45' : '#166534',
            'line-width': 5,
            'line-blur': 3,
            'line-opacity': 0.45,
          },
        });

        // Official Sovereign Perimeter Line (Complete J&K and Ladakh)
        map.addLayer({
          id: 'sovereign-india-line',
          type: 'line',
          source: 'sovereign-india-source',
          paint: {
            'line-color': isDark ? '#f59e0b' : '#166534',
            'line-width': 2.2,
            'line-opacity': 1.0,
          },
        });

        map.addSource('loss-hex-source', {
          type: 'geojson',
          data: geoJsonData,
        });

        // H3 Hexagon Fill Layer (100% Opaque, vivid color coding)
        map.addLayer({
          id: 'loss-hex-fill',
          type: 'fill',
          source: 'loss-hex-source',
          paint: {
            'fill-color': ['get', 'color'],
            'fill-opacity': 1.0,
          },
        });

        // H3 Hexagon Outline Layer (Crisp Honeycomb Edges)
        map.addLayer({
          id: 'loss-hex-outline',
          type: 'line',
          source: 'loss-hex-source',
          paint: {
            'line-color': ['get', 'color'],
            'line-width': 1.8,
            'line-opacity': 1.0,
          },
        });

        // Hover Highlight Layer (White outline 2.5px)
        map.addLayer({
          id: 'loss-hex-highlight',
          type: 'line',
          source: 'loss-hex-source',
          paint: {
            'line-color': '#ffffff',
            'line-width': 2.5,
            'line-opacity': 1,
          },
          filter: ['==', 'id', ''],
        });

        map.on('mousemove', 'loss-hex-fill', (e) => {
          if (e.features && e.features[0]) {
            map.getCanvas().style.cursor = 'pointer';
            const props = e.features[0].properties;
            if (props) {
              const cellId = String(props.id);
              map.setFilter('loss-hex-highlight', ['==', 'id', cellId]);
              setHoveredCell({
                id: cellId,
                h3Index: cellId,
                center: [0, 0],
                polygon: [],
                label: String(props.label),
                lives: Number(props.lives),
                category: props.category as H3RecordedLossCell['category'],
                color: String(props.color),
              });
            }
          }
        });

        map.on('mouseleave', 'loss-hex-fill', () => {
          map.getCanvas().style.cursor = '';
          map.setFilter('loss-hex-highlight', ['==', 'id', '']);
          setHoveredCell(null);
        });
      });

      mapRef.current = map;
    };

    initMap();

    return () => {
      disposed = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // Initialize once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fly to new center when selected district/state changes
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    mapRef.current.flyTo({
      center: [centerLng, centerLat],
      zoom,
      speed: 1.2,
      curve: 1.4,
      essential: true,
    });

    const source = mapRef.current.getSource('loss-hex-source') as maplibregl.GeoJSONSource | undefined;
    if (source) {
      source.setData(geoJsonData);
    }
  }, [centerLat, centerLng, geoJsonData, mapLoaded, zoom]);

  // Handle theme changes
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const isDark = resolvedTheme === 'dark';
    const newStyle = resolveBasemapStyle(undefined, isDark);
    mapRef.current.setStyle(newStyle);

    mapRef.current.once('styledata', () => {
      if (!mapRef.current) return;
      const isDarkNow = resolvedTheme === 'dark';

      if (!mapRef.current.getSource('sovereign-india-source')) {
        mapRef.current.addSource('sovereign-india-source', {
          type: 'geojson',
          data: SOVEREIGN_INDIA_GEOJSON,
        });

        mapRef.current.addLayer({
          id: 'sovereign-india-glow',
          type: 'line',
          source: 'sovereign-india-source',
          paint: {
            'line-color': isDarkNow ? '#d49a45' : '#166534',
            'line-width': 5,
            'line-blur': 3,
            'line-opacity': 0.45,
          },
        });

        mapRef.current.addLayer({
          id: 'sovereign-india-line',
          type: 'line',
          source: 'sovereign-india-source',
          paint: {
            'line-color': isDarkNow ? '#f59e0b' : '#166534',
            'line-width': 2.2,
            'line-opacity': 1.0,
          },
        });
      }

      if (!mapRef.current.getSource('loss-hex-source')) {
        mapRef.current.addSource('loss-hex-source', {
          type: 'geojson',
          data: geoJsonData,
        });

        mapRef.current.addLayer({
          id: 'loss-hex-fill',
          type: 'fill',
          source: 'loss-hex-source',
          paint: {
            'fill-color': ['get', 'color'],
            'fill-opacity': 1.0,
          },
        });

        mapRef.current.addLayer({
          id: 'loss-hex-outline',
          type: 'line',
          source: 'loss-hex-source',
          paint: {
            'line-color': ['get', 'color'],
            'line-width': 1.8,
            'line-opacity': 1.0,
          },
        });

        mapRef.current.addLayer({
          id: 'loss-hex-highlight',
          type: 'line',
          source: 'loss-hex-source',
          paint: {
            'line-color': '#ffffff',
            'line-width': 2.5,
            'line-opacity': 1,
          },
          filter: ['==', 'id', ''],
        });
      }
    });
  }, [resolvedTheme, geoJsonData, mapLoaded]);

  return (
    <div className={`relative w-full h-full rounded-2xl overflow-hidden ${className}`}>
      {/* MapLibre DOM Node */}
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

      {/* Floating State Badge */}
      <div className="absolute top-4 left-4 z-10 pointer-events-none">
        <div className="px-3 py-1.5 rounded-xl glass-card border border-line dark:border-white/10 text-xs font-mono font-bold text-ink dark:text-white shadow-lg flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          <span>Recorded Losses (H3): {stateName}</span>
        </div>
      </div>

      {/* Floating Zoom Controls at Top-Right */}
      <div className="absolute top-4 right-4 z-30 pointer-events-auto flex flex-col rounded-xl border border-line dark:border-white/10 glass-card text-ink dark:text-white backdrop-blur-xl shadow-xl overflow-hidden select-none">
        <button
          type="button"
          onClick={() => mapRef.current?.zoomIn()}
          className="p-2 text-text-secondary hover:text-ink dark:hover:text-white hover:bg-surface-2 dark:hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
          title="Zoom In"
          aria-label="Zoom In"
        >
          <span className="material-symbols-outlined text-base">add</span>
        </button>
        <div className="h-px w-full bg-line dark:bg-white/10" />
        <button
          type="button"
          onClick={() => mapRef.current?.zoomOut()}
          className="p-2 text-text-secondary hover:text-ink dark:hover:text-white hover:bg-surface-2 dark:hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
          title="Zoom Out"
          aria-label="Zoom Out"
        >
          <span className="material-symbols-outlined text-base">remove</span>
        </button>
      </div>

      {/* Hover Tooltip */}
      {hoveredCell && (
        <div className="absolute top-16 left-4 z-10 px-3.5 py-2 rounded-xl bg-black/85 backdrop-blur-md border border-white/20 text-white text-[11px] font-mono shadow-xl pointer-events-none">
          <div className="font-bold">{hoveredCell.label}</div>
          <div className="text-rose-400 font-semibold">{hoveredCell.lives} Lives Lost</div>
          <div className="text-[10px] text-text-muted">H3 Index: {hoveredCell.id}</div>
        </div>
      )}

      {/* Small Box Explaining Color Coding (Bottom-Right, Compact & Non-Obtrusive) */}
      {showLegend && (
        <div className="absolute bottom-3 right-3 z-20 glass-card p-2.5 rounded-xl border border-line dark:border-white/10 text-[9px] font-mono shadow-xl space-y-1 backdrop-blur-xl pointer-events-none select-none">
          <div className="font-bold text-ink dark:text-white uppercase tracking-wider text-[8px] flex items-center gap-1.5 border-b border-line dark:border-white/10 pb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            <span>RECORDED LOSSES</span>
          </div>
          <div className="space-y-0.5 pt-0.5">
            <div className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 inline-block shrink-0"
                style={{
                  backgroundColor: '#c54631',
                  clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                }}
              />
              <span className="text-text-secondary">501+ lives lost</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 inline-block shrink-0"
                style={{
                  backgroundColor: '#d77839',
                  clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                }}
              />
              <span className="text-text-secondary">101 – 500 lives</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 inline-block shrink-0"
                style={{
                  backgroundColor: '#d8ba56',
                  clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                }}
              />
              <span className="text-text-secondary">51 – 100 lives</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 inline-block shrink-0"
                style={{
                  backgroundColor: '#529977',
                  clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                }}
              />
              <span className="text-text-secondary">11 – 50 lives</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 inline-block shrink-0"
                style={{
                  backgroundColor: '#167a8b',
                  clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                }}
              />
              <span className="text-text-secondary">1 – 10 lives</span>
            </div>
          </div>
        </div>
      )}

      {/* Child Slots (e.g. Floating Case Study Card) */}
      {children}
    </div>
  );
};
