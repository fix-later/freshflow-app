import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Colors } from '../../../constants/colors';
import { Text } from '../../../components/ui/Text';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PriceDashboardHeaderProps {
  marketName: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PriceDashboardHeader({
  marketName,
}: PriceDashboardHeaderProps) {
  return (
    <View style={styles.summaryHeader}>
      <View style={styles.titleRow}>
        <View style={styles.titleCopy}>
          <Text style={styles.eyebrow}>CẬP NHẬT GIÁ VÀ TỒN KHO</Text>
          <Text style={styles.subtitleText} numberOfLines={1}>{marketName}</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  summaryHeader: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  subtitleText: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  titleCopy: { flex: 1, minWidth: 0 },
  eyebrow: { fontSize: 9, fontWeight: '800', color: Colors.textMuted, marginBottom: 3 },
});
