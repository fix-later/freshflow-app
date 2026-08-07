import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';
import { marketProcurementApi } from '../api/marketProcurementApi';

const FALLBACK_REFRESH_INTERVAL_MS = 30_000;

interface ProcurementTaskAssignedEvent {
  batchId: string;
  marketId: string;
  assignedAt: string;
}

interface MarketAgentTaskRealtimeValue {
  actionableTaskCount: number;
  isRealtimeConnected: boolean;
  latestAssignment: ProcurementTaskAssignedEvent | null;
  revision: number;
  syncNow: () => Promise<void>;
}

const MarketAgentTaskRealtimeContext = createContext<MarketAgentTaskRealtimeValue | null>(null);

function isActionable(status: string): boolean {
  return status === 'Built' || status === 'Manifested' || status === 'Purchasing';
}

export function MarketAgentTaskRealtimeProvider({ children }: { children: ReactNode }) {
  const [actionableTaskCount, setActionableTaskCount] = useState(0);
  const [latestAssignment, setLatestAssignment] = useState<ProcurementTaskAssignedEvent | null>(null);
  const [revision, setRevision] = useState(0);
  const knownTaskIdsRef = useRef(new Set<string>());
  const hasTaskBaselineRef = useRef(false);
  const mountedRef = useRef(true);

  const syncNow = useCallback(async () => {
    try {
      const tasks = await marketProcurementApi.getTasksInNextSevenDays();
      if (!mountedRef.current) return;

      const previousIds = knownTaskIdsRef.current;
      const newlyDiscovered = tasks.filter((task) => !previousIds.has(task.id));
      tasks.forEach((task) => previousIds.add(task.id));
      setActionableTaskCount(tasks.filter((task) => isActionable(task.status)).length);

      if (newlyDiscovered.length > 0 && hasTaskBaselineRef.current) {
        const newest = newlyDiscovered
          .filter((task) => task.assignedAt)
          .sort((left, right) => (right.assignedAt ?? '').localeCompare(left.assignedAt ?? ''))[0];
        if (newest?.assignedAt) {
          setLatestAssignment({
            batchId: newest.id,
            marketId: newest.marketId,
            assignedAt: newest.assignedAt,
          });
          setRevision((value) => value + 1);
        }
      }
      hasTaskBaselineRef.current = true;
    } catch (error) {
      console.warn('Procurement task fallback refresh failed:', error);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void syncNow();

    const intervalId = setInterval(() => void syncNow(), FALLBACK_REFRESH_INTERVAL_MS);
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void syncNow();
    });

    return () => {
      mountedRef.current = false;
      clearInterval(intervalId);
      appStateSubscription.remove();
    };
  }, [syncNow]);

  const value = useMemo<MarketAgentTaskRealtimeValue>(() => ({
    actionableTaskCount,
    isRealtimeConnected: false,
    latestAssignment,
    revision,
    syncNow,
  }), [actionableTaskCount, latestAssignment, revision, syncNow]);

  return (
    <MarketAgentTaskRealtimeContext.Provider value={value}>
      {children}
    </MarketAgentTaskRealtimeContext.Provider>
  );
}

export function useMarketAgentTaskRealtime(): MarketAgentTaskRealtimeValue {
  const value = useContext(MarketAgentTaskRealtimeContext);
  if (!value) {
    throw new Error('useMarketAgentTaskRealtime must be used inside MarketAgentTaskRealtimeProvider.');
  }
  return value;
}
