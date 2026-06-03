import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../constants/colors';

export function SplashScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>FreshFlow</Text>
      <Text style={styles.tagline}>Nền tảng thu mua thực phẩm thông minh</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary },
  logo: { fontSize: 36, fontWeight: '800', color: '#FFFFFF' },
  tagline: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 8 },
});
