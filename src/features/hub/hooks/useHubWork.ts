import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { hubApi, type AssignedHubDto, type HubInboundTask } from '../api/hubApi';
import { getApiErrorMessage } from '../../../services/errors/apiErrorMessages';

type HubWorkState = {
  assignedHubs: AssignedHubDto[];
  inboundTasks: HubInboundTask[];
  warnings: string[];
  lastSyncedAt: Date | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const AUTO_REFRESH_INTERVAL_MS = 30_000;

function readErrorMessage(error: unknown): string {
  return getApiErrorMessage(error, 'Không thể tải công việc được phân công. Vui lòng thử lại.');
}

export function useHubWork(): HubWorkState {
  const [assignedHubs, setAssignedHubs] = useState<AssignedHubDto[]>([]);
  const [inboundTasks, setInboundTasks] = useState<HubInboundTask[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    setError(null);
    setWarnings([]);

    try {
      const work = await hubApi.getMyWork();
      setAssignedHubs(work.assignedHubs);
      setInboundTasks(work.inboundTasks);
      setWarnings(work.warnings);
      setLastSyncedAt(new Date());
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
      // The MA handover is propagated asynchronously. Retry quickly while the
      // Hub screen is fresh, then fall back to the normal background interval.
      const firstRetryId = setTimeout(() => void load(), 3_000);
      const secondRetryId = setTimeout(() => void load(), 10_000);
      const intervalId = setInterval(() => {
        void load();
      }, AUTO_REFRESH_INTERVAL_MS);

      return () => {
        clearTimeout(firstRetryId);
        clearTimeout(secondRetryId);
        clearInterval(intervalId);
      };
    }, [load]),
  );

  const refresh = useCallback(() => load(true), [load]);

  return {
    assignedHubs,
    inboundTasks,
    warnings,
    lastSyncedAt,
    loading,
    refreshing,
    error,
    refresh,
  };
}
