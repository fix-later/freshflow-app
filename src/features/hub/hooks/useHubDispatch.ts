import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  hubDispatchApi,
  type HubDispatchPlan,
} from '../api/hubDispatchApi';

type HubDispatchState = {
  plan: HubDispatchPlan | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const AUTO_REFRESH_INTERVAL_MS = 30_000;

function getVietnamServiceDate(): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function readErrorMessage(error: unknown): string {
  const serverMessage = (error as { response?: { data?: { message?: string } } })
    ?.response?.data?.message;
  if (serverMessage) return serverMessage;
  if (error instanceof Error && error.message) return error.message;
  return 'Không thể tải kế hoạch phân xe hôm nay. Vui lòng thử lại.';
}

export function useHubDispatch(): HubDispatchState {
  const [plan, setPlan] = useState<HubDispatchPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    setError(null);

    try {
      setPlan(await hubDispatchApi.getPlan(getVietnamServiceDate()));
    } catch (loadError) {
      setError(readErrorMessage(loadError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
      const intervalId = setInterval(() => {
        void load();
      }, AUTO_REFRESH_INTERVAL_MS);

      return () => clearInterval(intervalId);
    }, [load]),
  );

  return {
    plan,
    loading,
    refreshing,
    error,
    refresh: useCallback(() => load(true), [load]),
  };
}
