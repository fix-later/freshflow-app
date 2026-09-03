import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { HubStackParamList } from '../../../navigation/types';
import { Text } from '../../../components/ui/Text';
import { Colors } from '../../../constants/colors';
import { hubApi, type HubInboundTask } from '../api/hubApi';
import { getApiErrorMessage } from '../../../services/errors/apiErrorMessages';
import { AssignedInboundTaskScreen } from './AssignedInboundTaskScreen';

type Props = NativeStackScreenProps<HubStackParamList, 'CheckIn'>;

export function CheckInScreen({ route, navigation }: Props) {
  const paramTask = route.params.assignedTask;
  const [task, setTask] = useState<HubInboundTask | undefined>(paramTask);
  const [loading, setLoading] = useState(!paramTask);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    hubApi.getMyWork()
      .then((work) => {
        const found = work.inboundTasks.find((item) => item.inboundId === route.params.batchId);
        setTask(found);
        if (!found) {
          setError('Không tìm thấy lô hàng này trong danh sách công việc của bạn. Lô có thể đã được xử lý hoặc chuyển cho nhân viên khác.');
        }
      })
      .catch((err) => setError(getApiErrorMessage(err, 'Không thể tải thông tin lô hàng.')))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    // Reached without an assignedTask — e.g. a notification tap that only carries
    // an inboundId (see notificationNavigation.ts) — so look the real task up
    // instead of ever rendering placeholder/sample data.
    if (!paramTask) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (task) {
    return <AssignedInboundTaskScreen task={task} navigation={navigation} />;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={styles.centered}>
        {loading ? (
          <>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.helperText}>Đang tải thông tin lô hàng...</Text>
          </>
        ) : (
          <>
            <Ionicons name="cloud-offline-outline" size={48} color={Colors.outline} />
            <Text style={styles.errorText}>{error}</Text>
            <View style={styles.actionRow}>
              <Pressable style={styles.retryButton} onPress={load}>
                <Ionicons name="refresh" size={16} color={Colors.onPrimary} />
                <Text style={styles.retryText}>Thử lại</Text>
              </Pressable>
              <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
                <Text style={styles.backText}>Quay lại</Text>
              </Pressable>
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  helperText: { fontSize: 13, color: Colors.textMuted, textAlign: 'center' },
  errorText: { fontSize: 14, color: Colors.error, textAlign: 'center', lineHeight: 20 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  retryButton: { flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 10, backgroundColor: Colors.primary, paddingHorizontal: 18, paddingVertical: 12 },
  retryText: { color: Colors.onPrimary, fontWeight: '700', fontSize: 14 },
  backButton: { borderRadius: 10, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 18, paddingVertical: 12 },
  backText: { color: Colors.textSecondary, fontWeight: '700', fontSize: 14 },
});
