'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  fetchForecastPipelineStatus,
  triggerForecastRecalculation,
} from '@/lib/api/alerts';
import type {
  DistrictForecastStatus,
  ForecastPipelineStatusResponse,
  ForecastTriggerResponse,
  WeatherState,
} from '@/lib/api/types';
import { ApiError } from '@/lib/api/client';

export interface UseDistrictForecastTelemetryOptions {
  /** Whether automatic fetching is enabled (default true) */
  enabled?: boolean;
  /** Optional polling interval in milliseconds (default 45000) */
  pollIntervalMs?: number;
}

export interface UseDistrictForecastTelemetryResult {
  /** Raw pipeline response from backend */
  data: ForecastPipelineStatusResponse | null;
  /** List of per-district statuses across all 7 operational corridors */
  districts: DistrictForecastStatus[];
  /** Map of district statuses keyed by lowercase slug */
  districtMap: Record<string, DistrictForecastStatus>;
  /** Global latest forecast cycle timestamp across all districts */
  globalLatestCycleAt: string | null;
  /** Whether the scheduler is running autonomously in FastAPI lifespan */
  schedulerEnabled: boolean;
  /** Whether an on-demand or cron run is currently executing */
  isRunInProgress: boolean;
  /** Loading state for status telemetry */
  isLoading: boolean;
  /** Loading state when triggering an on-demand run */
  isTriggering: boolean;
  /** Error from telemetry request if any */
  error: ApiError | null;
  /** Last trigger outcome message */
  triggerMessage: string | null;
  /** Resolves real-time status for a district by slug key, LGD code, or admin ID */
  getDistrictStatus: (keyOrId: string | number) => DistrictForecastStatus | undefined;
  /** Derives operational weather state with calm fallback */
  getDistrictWeatherState: (keyOrId: string | number) => WeatherState;
  /** Dispatches an immediate recalculation */
  triggerRecalculation: (district?: string) => Promise<ForecastTriggerResponse | null>;
  /** Refreshes telemetry */
  refetch: () => void;
}

const STATIC_BASELINE_CYCLE = '2026-10-04T06:00:00.000Z';

/** Fallback simulated statuses for operational districts when backend is booting or idle */
const DEFAULT_DISTRICT_STATUSES: Record<string, DistrictForecastStatus> = {
  wayanad: {
    key: 'wayanad',
    name: 'Wayanad',
    admin_id: 178,
    lgd_code: 555,
    danger_cells: 0,
    weather_state: 'CLEAR',
    last_cycle_at: STATIC_BASELINE_CYCLE,
  },
  kodagu: {
    key: 'kodagu',
    name: 'Kodagu',
    admin_id: 179,
    lgd_code: 540,
    danger_cells: 0,
    weather_state: 'CLEAR',
    last_cycle_at: STATIC_BASELINE_CYCLE,
  },
  barpeta: {
    key: 'barpeta',
    name: 'Barpeta',
    admin_id: 191,
    lgd_code: 277,
    danger_cells: 0,
    weather_state: 'CLEAR',
    last_cycle_at: STATIC_BASELINE_CYCLE,
  },
  rudraprayag: {
    key: 'rudraprayag',
    name: 'Rudraprayag',
    admin_id: 192,
    lgd_code: 55,
    danger_cells: 0,
    weather_state: 'CLEAR',
    last_cycle_at: STATIC_BASELINE_CYCLE,
  },
  srinagar: {
    key: 'srinagar',
    name: 'Srinagar',
    admin_id: 193,
    lgd_code: 12,
    danger_cells: 0,
    weather_state: 'CLEAR',
    last_cycle_at: STATIC_BASELINE_CYCLE,
  },
  dholpur: {
    key: 'dholpur',
    name: 'Dholpur',
    admin_id: 180,
    lgd_code: 98,
    danger_cells: 0,
    weather_state: 'CLEAR',
    last_cycle_at: STATIC_BASELINE_CYCLE,
  },
  morena: {
    key: 'morena',
    name: 'Morena',
    admin_id: 181,
    lgd_code: 417,
    danger_cells: 0,
    weather_state: 'CLEAR',
    last_cycle_at: STATIC_BASELINE_CYCLE,
  },
};

/**
 * Hook providing real-time multi-district forecast telemetry, scheduler observability,
 * and on-demand trigger actions for the Assess and Hazard platforms.
 */
export function useDistrictForecastTelemetry(
  options: UseDistrictForecastTelemetryOptions = {},
): UseDistrictForecastTelemetryResult {
  const { enabled = true, pollIntervalMs = 45000 } = options;

  const [data, setData] = useState<ForecastPipelineStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(enabled);
  const [isTriggering, setIsTriggering] = useState<boolean>(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [triggerMessage, setTriggerMessage] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<number>(0);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();

    const loadTelemetry = () => {
      fetchForecastPipelineStatus(controller.signal)
        .then((res) => {
          setData(res);
          setError(null);
        })
        .catch((err) => {
          if (err instanceof DOMException && err.name === 'AbortError') return;
          setError(
            err instanceof ApiError
              ? err
              : new ApiError('Failed to load forecast telemetry', 0, 'STATUS_ERROR'),
          );
        })
        .finally(() => {
          setIsLoading(false);
        });
    };

    loadTelemetry();

    const interval = setInterval(loadTelemetry, pollIntervalMs);

    return () => {
      clearInterval(interval);
      controller.abort();
    };
  }, [enabled, pollIntervalMs, refreshToken]);


  const districts = useMemo(() => {
    if (data?.districts && data.districts.length > 0) {
      return data.districts;
    }
    return Object.values(DEFAULT_DISTRICT_STATUSES);
  }, [data]);

  const districtMap = useMemo(() => {
    return districts.reduce((acc, d) => {
      acc[d.key.toLowerCase()] = d;
      return acc;
    }, {} as Record<string, DistrictForecastStatus>);
  }, [districts]);

  const getDistrictStatus = useCallback(
    (keyOrId: string | number): DistrictForecastStatus | undefined => {
      const query = String(keyOrId).toLowerCase().trim();
      return districts.find(
        (d) =>
          d.key.toLowerCase() === query ||
          d.name.toLowerCase() === query ||
          String(d.admin_id) === query ||
          String(d.lgd_code) === query ||
          (query === 'north' && (d.key === 'rudraprayag' || d.key === 'srinagar')) ||
          (query === 'east' && d.key === 'barpeta') ||
          (query === 'south' && d.key === 'wayanad') ||
          (query === 'central' && (d.key === 'morena' || d.key === 'dholpur')),
      );
    },
    [districts],
  );

  const getDistrictWeatherState = useCallback(
    (keyOrId: string | number): WeatherState => {
      const match = getDistrictStatus(keyOrId);
      if (!match) return 'CLEAR';
      return match.weather_state;
    },
    [getDistrictStatus],
  );

  const triggerRecalculation = useCallback(
    async (district?: string): Promise<ForecastTriggerResponse | null> => {
      setIsTriggering(true);
      setTriggerMessage(null);
      try {
        const res = await triggerForecastRecalculation({
          district: district ? district.toLowerCase() : undefined,
          live: true,
          dry_run: false,
        });
        setTriggerMessage(res.message || 'Forecast ingestion cycle enqueued (202 Accepted).');
        // Trigger a status refresh after a short delay
        setTimeout(() => setRefreshToken((t) => t + 1), 2000);
        return res;
      } catch (err) {
        const msg =
          err instanceof ApiError ? err.message : 'Failed to trigger forecast recalculation';
        setTriggerMessage(msg);
        return null;
      } finally {
        setIsTriggering(false);
      }
    },
    [],
  );

  const refetch = useCallback(() => {
    setRefreshToken((t) => t + 1);
  }, []);

  return {
    data,
    districts,
    districtMap,
    globalLatestCycleAt: data?.global_latest_cycle_at ?? null,
    schedulerEnabled: data?.scheduler_enabled ?? true,
    isRunInProgress: data?.is_run_in_progress ?? false,
    isLoading,
    isTriggering,
    error,
    triggerMessage,
    getDistrictStatus,
    getDistrictWeatherState,
    triggerRecalculation,
    refetch,
  };
}
