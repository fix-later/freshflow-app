import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../../constants/colors';

export function TrackOrderScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Theo dõi đơn hàng</Text>
      {/* TODO: replace with react-native-maps after: npx expo install react-native-maps */}
      <Text style={styles.sub}>Vị trí tài xế real-time qua SignalR</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  title: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  sub: { fontSize: 14, color: Colors.textSecondary, marginTop: 6 },
});
