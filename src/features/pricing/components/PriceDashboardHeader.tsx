import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Colors } from '../../../constants/colors';
import { Fonts } from '../../../constants/fonts';
import { Text } from '../../../components/ui/Text';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PriceDashboardHeaderProps {
  marketName: string;
  productCount: number;
  categoryCount?: number;
  outOfStockCount?: number;
  pendingCount?: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PriceDashboardHeader({
  marketName,
  productCount,
  categoryCount,
  outOfStockCount,
  pendingCount,
}: PriceDashboardHeaderProps) {
  return (
    <View style={styles.summaryHeader}>
      <Text style={styles.subtitleText}>{marketName}</Text>
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text numeric style={styles.statVal}>{productCount}</Text>
          <Text style={styles.statLabel}>Sản phẩm</Text>
        </View>
        <View style={styles.statDivider} />
        {categoryCount !== undefined && (
          <>
            <View style={styles.statBox}>
            <Text numeric style={[styles.statVal, { color: Colors.primaryText }]}>{categoryCount}</Text>
              <Text style={styles.statLabel}>Loại sản phẩm</Text>
            </View>
            <View style={styles.statDivider} />
          </>
        )}
        {outOfStockCount !== undefined && (
          <>
            <View style={styles.statBox}>
              <Text
                numeric
                style={[
                  styles.statVal,
                  { color: outOfStockCount > 0 ? Colors.danger : Colors.textPrimary },
                ]}
              >
                {outOfStockCount}
              </Text>
              <Text style={styles.statLabel}>Hết hàng</Text>
            </View>
            <View style={styles.statDivider} />
          </>
        )}
        {pendingCount !== undefined && pendingCount > 0 && (
          <View style={styles.statBox}>
            <Text numeric style={[styles.statVal, { color: Colors.primaryText }]}>{pendingCount}</Text>
            <Text style={styles.statLabel}>Chờ lưu</Text>
          </View>
        )}
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
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statVal: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: Fonts.monoBold,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.border,
  },
});
