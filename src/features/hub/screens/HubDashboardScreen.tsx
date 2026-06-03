import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../../constants/colors';

export function HubDashboardScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hub Dashboard</Text>
      <Text style={styles.sub}>Hàng về trong ngày và tuyến giao</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  title: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  sub: { fontSize: 14, color: Colors.textSecondary, marginTop: 6 },
});
