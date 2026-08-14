import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  hubApi,
  type AssignedHubDto,
  type HubSortingDayPlan,
} from '../api/hubApi';
import { getApiErrorMessage } from '../../../services/errors/apiErrorMessages';

type HubSortingWeekState = {
  plans: HubSortingDayPlan[];
  warnings: string[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const DAYS_IN_WINDOW = 7;
const AUTO_REFRESH_INTERVAL_MS = 30_000;

function getVietnamDate(): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function getSevenDates(): string[] {
  const [year, month, day] = getVietnamDate().split('-').map(Number);
  const start = new Date(Date.UTC(year, month - 1, day));

  return Array.from({ length: DAYS_IN_WINDOW }, (_, offset) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + offset);
    return date.toISOString().slice(0, 10);
  });
}

function readErrorMessage(error: unknown): string {
  return getApiErrorMessage(error, 'Không thể tải đơn cần phân loại trong 7 ngày. Vui lòng thử lại.');
}

export function useHubSortingWeek(assignedHubs: AssignedHubDto[]): HubSortingWeekState {
  const [plans, setPlans] = useState<HubSortingDayPlan[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hubKey = useMemo(
    () => assignedHubs.map((hub) => hub.hubId).sort().join(','),
    [assignedHubs],
  );

  const load = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    setError(null);

    try {
      if (assignedHubs.length === 0) {
        setPlans([]);
        setWarnings([]);
      } else {
        const result = await hubApi.getSortingWeek(assignedHubs, getSevenDates());
        setPlans(result.plans);
        setWarnings(result.warnings);
      }
    } catch (loadError) {
      setError(readErrorMessage(loadError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [hubKey]);

  useFocusEffect(useCallback(() => {
    void load();
    const intervalId = setInterval(() => void load(), AUTO_REFRESH_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [load]));

  return {
    plans,
    warnings,
    loading,
    refreshing,
    error,
    refresh: useCallback(() => load(true), [load]),
  };
}
