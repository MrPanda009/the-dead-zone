'use client';

import { useMemo } from 'react';
import type { Layer, PickingInfo } from '@deck.gl/core';
import { H3HexagonLayer } from '@deck.gl/geo-layers';
import { PathLayer, PolygonLayer } from '@deck.gl/layers';
import {
  FillStyleExtension,
  PathStyleExtension,
  type FillStyleExtensionProps,
  type PathStyleExtensionProps,
} from '@deck.gl/extensions';
import { cellToBoundary } from 'h3-js';

import type { HazardCell } from '@/lib/api/types';
import {
  CHANNEL_COLOR,
  CHANNEL_OUTLINE_COLOR,
  CHAR_BELT_BOUNDARY_COLOR,
  CHAR_BELT_BOUNDARY_DASH,
  DEFAULT_REGIME_VISIBILITY,
  HARD_ZERO_COLOR,
  HOVER_OUTLINE_COLOR,
  LOW_CONFIDENCE_HATCH_COLOR,
  NO_COVERAGE_OUTLINE_COLOR,
  SELECTED_OUTLINE_COLOR,
  SUSCEPTIBILITY_RAMP,
  type RGBAColor,
  type RegimeVisibility,
} from '@/lib/map/constants';
import {
  cellFillColor,
  cellLineColor,
  isScoredCell,
  normaliseConfidence,
  renderClassFor,
} from '@/lib/map/colorScale';
import { createHatchAtlas, HATCH_PATTERN_NAME } from '@/lib/map/hatchPattern';
import { regimeBoundaryPaths, type BoundaryPath } from '@/lib/map/regimeBoundary';

export interface UseHazardHexLayersOptions {
  cells: HazardCell[];
  /** Ascending quantile breaks from the API legend. */
  breaks: number[];
  /** Layer confidence maximum, used to normalise before thresholding. */
  confidenceCeiling: number;
  /** Fill opacity multiplier in [0, 1]. */
  opacity?: number;
  /** Draws a hatch over cells whose normalised confidence falls below `confidenceThreshold`. */
  showConfidenceHatch?: boolean;
  confidenceThreshold?: number;
  /** Hides cells the pipeline could not observe. */
  showNoCoverage?: boolean;
  /** Hides cells that are safe by FR-3.17 construction. */
  showHardZero?: boolean;
  /** Per-regime visibility. Cells without a regime are always drawn. */
  visibleRegimes?: RegimeVisibility;
  /** Dashed outline around the char-belt corridor. */
  showCharBoundary?: boolean;
  selectedH3?: string | null;
  hoveredH3?: string | null;
  ramp?: RGBAColor[];
  onCellClick?: (cell: HazardCell | null) => void;
  onCellHover?: (cell: HazardCell | null) => void;
}

/**
 * Builds the deck.gl layer stack for a hazard layer.
 *
 * Cells are split into four visually distinct groups rather than one ramp, because
 * `susceptibility === 0` carries different meanings in this dataset:
 *   - measured    → the quantile ramp (char-belt cells use their own amber ramp)
 *   - hard_zero   → safe by FR-3.17 construction, off-ramp neutral fill
 *   - no_coverage → never observed, outline only and never filled
 *   - channel     → active river channel, slate fill; a placeholder score, not "safe"
 * Collapsing these would paint blind cells and rivers as the safest ground in the district.
 */
export function useHazardHexLayers(options: UseHazardHexLayersOptions): Layer[] {
  const {
    cells,
    breaks,
    confidenceCeiling,
    opacity = 1,
    showConfidenceHatch = true,
    confidenceThreshold = 0.5,
    showNoCoverage = true,
    showHardZero = true,
    visibleRegimes = DEFAULT_REGIME_VISIBILITY,
    showCharBoundary = true,
    selectedH3 = null,
    hoveredH3 = null,
    ramp = SUSCEPTIBILITY_RAMP,
    onCellClick,
    onCellHover,
  } = options;

  // Hidden regimes are dropped up front so every layer below, hatch and boundary included,
  // agrees on what is on screen.
  const shownCells = useMemo(
    () => cells.filter((cell) => !cell.hazard_regime || visibleRegimes[cell.hazard_regime] !== false),
    [cells, visibleRegimes],
  );

  const { measured, hardZero, noCoverage, channel } = useMemo(() => {
    const groups = {
      measured: [] as HazardCell[],
      hardZero: [] as HazardCell[],
      noCoverage: [] as HazardCell[],
      channel: [] as HazardCell[],
    };
    for (const cell of shownCells) {
      const renderClass = renderClassFor(cell);
      if (renderClass === 'measured') groups.measured.push(cell);
      else if (renderClass === 'hard_zero') groups.hardZero.push(cell);
      else if (renderClass === 'channel') groups.channel.push(cell);
      else groups.noCoverage.push(cell);
    }
    return groups;
  }, [shownCells]);

  const charBoundary = useMemo<BoundaryPath[]>(
    () => (showCharBoundary ? regimeBoundaryPaths(shownCells, 'char_belt') : []),
    [shownCells, showCharBoundary],
  );

  // Only the cells that actually fall below the threshold get geometry built for them;
  // on a well-observed layer this list is empty and the layer is skipped entirely.
  const lowConfidencePolygons = useMemo(() => {
    if (!showConfidenceHatch) return [];
    return shownCells
      .filter(
        (cell) =>
          isScoredCell(cell) &&
          normaliseConfidence(cell.confidence, confidenceCeiling) < confidenceThreshold,
      )
      .map((cell) => ({
        h3: cell.h3,
        polygon: cellToBoundary(cell.h3, true),
      }));
  }, [shownCells, confidenceCeiling, confidenceThreshold, showConfidenceHatch]);

  const hatch = useMemo(() => createHatchAtlas(), []);

  const breaksKey = breaks.join(',');

  return useMemo(() => {
    const layers: Layer[] = [];

    const handleClick = (info: PickingInfo) => {
      onCellClick?.((info.object as HazardCell | undefined) ?? null);
    };
    const handleHover = (info: PickingInfo) => {
      onCellHover?.((info.object as HazardCell | undefined) ?? null);
    };

    // 0. Active river channel. Drawn beneath everything so land cells always sit above it.
    if (channel.length > 0) {
      layers.push(
        new H3HexagonLayer<HazardCell>({
          id: 'hazard-hex-channel',
          data: channel,
          getHexagon: (cell) => cell.h3,
          getFillColor: [
            CHANNEL_COLOR[0],
            CHANNEL_COLOR[1],
            CHANNEL_COLOR[2],
            Math.round(CHANNEL_COLOR[3] * opacity),
          ],
          filled: true,
          stroked: true,
          getLineColor: CHANNEL_OUTLINE_COLOR,
          getLineWidth: 1,
          lineWidthUnits: 'pixels',
          extruded: false,
          pickable: true,
          onClick: handleClick,
          onHover: handleHover,
          updateTriggers: { getFillColor: [opacity] },
        }),
      );
    }

    // 1. Cells safe by construction (FR-3.17). Drawn first so measured cells sit above.
    if (showHardZero && hardZero.length > 0) {
      layers.push(
        new H3HexagonLayer<HazardCell>({
          id: 'hazard-hex-hard-zero',
          data: hardZero,
          getHexagon: (cell) => cell.h3,
          getFillColor: [
            HARD_ZERO_COLOR[0],
            HARD_ZERO_COLOR[1],
            HARD_ZERO_COLOR[2],
            Math.round(HARD_ZERO_COLOR[3] * opacity),
          ],
          filled: true,
          stroked: false,
          extruded: false,
          pickable: true,
          onClick: handleClick,
          onHover: handleHover,
          updateTriggers: { getFillColor: [opacity] },
        }),
      );
    }

    // 2. Measured cells on the quantile ramp.
    layers.push(
      new H3HexagonLayer<HazardCell>({
        id: 'hazard-hex-measured',
        data: measured,
        getHexagon: (cell) => cell.h3,
        getFillColor: (cell) => cellFillColor(cell, breaks, opacity, ramp),
        filled: true,
        stroked: true,
        getLineColor: (cell) => cellLineColor(cell, breaks, 0.95, ramp),
        getLineWidth: 1.5,
        lineWidthUnits: 'pixels',
        extruded: false,
        pickable: true,
        onClick: handleClick,
        onHover: handleHover,
        updateTriggers: {
          getFillColor: [breaksKey, opacity, ramp],
          getLineColor: [breaksKey, ramp],
        },
      }),
    );

    // 3. Unobserved cells: outline only. A fill here would assert a measurement that
    //    was never made.
    if (showNoCoverage && noCoverage.length > 0) {
      layers.push(
        new H3HexagonLayer<HazardCell>({
          id: 'hazard-hex-no-coverage',
          data: noCoverage,
          getHexagon: (cell) => cell.h3,
          filled: false,
          stroked: true,
          extruded: false,
          getLineColor: NO_COVERAGE_OUTLINE_COLOR,
          getLineWidth: 1,
          lineWidthUnits: 'pixels',
          lineWidthMinPixels: 1,
          pickable: true,
          onClick: handleClick,
          onHover: handleHover,
        }),
      );
    }

    // 4. Confidence hatch (FR-9.3: "rendered as a hatch pattern, not a solid colour").
    //    PolygonLayer rather than H3HexagonLayer because FillStyleExtension needs the
    //    polygon path — H3HexagonLayer falls back to a ColumnLayer that cannot pattern.
    if (hatch && lowConfidencePolygons.length > 0) {
      layers.push(
        new PolygonLayer<
          { h3: string; polygon: number[][] },
          FillStyleExtensionProps<{ h3: string; polygon: number[][] }>
        >({
          id: 'hazard-hex-low-confidence',
          data: lowConfidencePolygons,
          getPolygon: (d) => d.polygon,
          getFillColor: LOW_CONFIDENCE_HATCH_COLOR,
          filled: true,
          stroked: false,
          extruded: false,
          pickable: false,
          fillPatternAtlas: hatch.atlas,
          fillPatternMapping: hatch.mapping,
          getFillPattern: () => HATCH_PATTERN_NAME,
          getFillPatternScale: 240,
          getFillPatternOffset: [0, 0],
          extensions: [new FillStyleExtension({ pattern: true })],
        }),
      );
    }

    // 4b. Dashed outline tracing the char-belt corridor. Dash needs PathLayer; an H3 layer's
    //     stroke is always solid.
    if (charBoundary.length > 0) {
      layers.push(
        new PathLayer<BoundaryPath, PathStyleExtensionProps<BoundaryPath>>({
          id: 'hazard-char-belt-boundary',
          data: charBoundary,
          getPath: (path) => path,
          getColor: CHAR_BELT_BOUNDARY_COLOR,
          getWidth: 2,
          widthUnits: 'pixels',
          widthMinPixels: 1.5,
          getDashArray: CHAR_BELT_BOUNDARY_DASH,
          dashJustified: true,
          pickable: false,
          extensions: [new PathStyleExtension({ dash: true })],
        }),
      );
    }

    // 5. Hover and selection outlines, drawn last so they are never occluded.
    const outlined = [
      { id: 'hazard-hex-hover', h3: hoveredH3, color: HOVER_OUTLINE_COLOR, width: 1.5 },
      { id: 'hazard-hex-selected', h3: selectedH3, color: SELECTED_OUTLINE_COLOR, width: 2.5 },
    ];

    for (const { id, h3, color, width } of outlined) {
      if (!h3) continue;
      layers.push(
        new H3HexagonLayer<{ h3: string }>({
          id,
          data: [{ h3 }],
          getHexagon: (d) => d.h3,
          filled: false,
          stroked: true,
          extruded: false,
          getLineColor: color,
          getLineWidth: width,
          lineWidthUnits: 'pixels',
          lineWidthMinPixels: width,
          pickable: false,
        }),
      );
    }

    return layers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    measured,
    hardZero,
    noCoverage,
    channel,
    charBoundary,
    lowConfidencePolygons,
    hatch,
    breaksKey,
    opacity,
    ramp,
    showHardZero,
    showNoCoverage,
    selectedH3,
    hoveredH3,
    onCellClick,
    onCellHover,
  ]);
}
