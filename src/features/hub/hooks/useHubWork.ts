import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { hubApi, type AssignedHubDto, type HubInboundTask } from '../api/hubApi';

type HubWorkState = {
  assignedHubs: AssignedHubDto[];
  inboundTasks: HubInboundTask[];
  warnings: string[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const AUTO_REFRESH_INTERVAL_MS = 30_000;

function readErrorMessage(error: unknown): string {
  const serverMessage = (error as { response?: { data?: { message?: unknown } } })
    ?.response?.data?.message;
  if (typeof serverMessage === 'string' && serverMessage.length > 0) return serverMessage;
  if (error instanceof Error && error.message) return error.message;
  return 'Không thể tải công việc được phân công. Vui lòng thử lại.';
}

export function useHubWork(): HubWorkState {
  const [assignedHubs, setAssignedHubs] = useState<AssignedHubDto[]>([]);
  const [inboundTasks, setInboundTasks] = useState<HubInboundTask[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
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

  const refresh = useCallback(() => load(true), [load]);

  return {
    assignedHubs,
    inboundTasks,
    warnings,
    loading,
    refreshing,
    error,
    refresh,
  };
}
