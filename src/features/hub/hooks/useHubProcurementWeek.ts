import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  hubApi,
  type AssignedHubDto,
  type HubProcurementDayPlan,
} from '../api/hubApi';

type HubProcurementWeekState = {
  plans: HubProcurementDayPlan[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const DAYS_IN_WINDOW = 7;

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
  const serverMessage = (error as { response?: { data?: { message?: string } } })
    ?.response?.data?.message;
  if (serverMessage) return serverMessage;
  if (error instanceof Error && error.message) return error.message;
  return 'Không thể tải kế hoạch hàng về Hub trong 7 ngày. Vui lòng thử lại.';
}

export function useHubProcurementWeek(
  assignedHubs: AssignedHubDto[],
): HubProcurementWeekState {
  const [plans, setPlans] = useState<HubProcurementDayPlan[]>([]);
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
      } else {
        setPlans(await hubApi.getProcurementWeek(assignedHubs, getSevenDates()));
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
  }, [load]));

  return {
    plans,
    loading,
    refreshing,
    error,
    refresh: useCallback(() => load(true), [load]),
  };
}
