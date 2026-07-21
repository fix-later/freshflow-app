import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { hubApi, type AssignedHubDto, type HubInboundTask } from '../api/hubApi';

type HubWorkState = {
  assignedHubs: AssignedHubDto[];
  inboundTasks: HubInboundTask[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

function readErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return 'Không thể tải công việc được phân công. Vui lòng thử lại.';
}

export function useHubWork(): HubWorkState {
  const [assignedHubs, setAssignedHubs] = useState<AssignedHubDto[]>([]);
  const [inboundTasks, setInboundTasks] = useState<HubInboundTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    setError(null);

    try {
      const work = await hubApi.getMyWork();
      setAssignedHubs(work.assignedHubs);
      setInboundTasks(work.inboundTasks);
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
    }, [load]),
  );

  const refresh = useCallback(() => load(true), [load]);

  return {
    assignedHubs,
    inboundTasks,
    loading,
    refreshing,
    error,
    refresh,
  };
}
