import React, { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/colors';
import type { MarketProductDto } from '../../../types/api.types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProductPriceCardProps {
  product: MarketProductDto;
  pendingPrice?: number;
  onPriceChange: (productId: string, newPrice: number) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PRICE_STEP = 1000;

function formatPrice(value: number): string {
  return value.toLocaleString('vi-VN');
}

function formatRelativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h trước`;
  const days = Math.floor(hours / 24);
  return `${days} ngày trước`;
}

/** Pick a category icon based on category name. */
function getCategoryIcon(category: string): keyof typeof Ionicons.glyphMap {
  const lower = category.toLowerCase();
  if (lower.includes('rau') || lower.includes('củ')) return 'leaf';
  if (lower.includes('thịt') || lower.includes('heo') || lower.includes('bò')) return 'fish';
  if (lower.includes('hải') || lower.includes('tôm') || lower.includes('cá')) return 'water';
  if (lower.includes('trái') || lower.includes('cây')) return 'nutrition';
  if (lower.includes('gạo') || lower.includes('ngũ')) return 'cafe';
  return 'basket';
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProductPriceCard({
  product,
  pendingPrice,
  onPriceChange,
}: ProductPriceCardProps) {
  const outOfStock = product.availableQuantity <= 0;

  /** The price currently displayed (pending or original). */
  const displayPrice = pendingPrice ?? product.currentPrice;

  /** Whether this card has a pending change. */
  const isChanged = pendingPrice !== undefined && pendingPrice !== product.currentPrice;

  /** Price difference percentage vs original. */
  const diffPercent = useMemo(() => {
    if (product.currentPrice === 0) return 0;
    return ((displayPrice - product.currentPrice) / product.currentPrice) * 100;
  }, [displayPrice, product.currentPrice]);

  /** Step size: cheaper items get smaller steps. */
  const step = product.currentPrice < 20000 ? 500 : PRICE_STEP;

  const handleDecrease = useCallback(() => {
    const next = Math.max(0, displayPrice - step);
    onPriceChange(product.productId, next);
  }, [displayPrice, step, onPriceChange, product.productId]);

  const handleIncrease = useCallback(() => {
    onPriceChange(product.productId, displayPrice + step);
  }, [displayPrice, step, onPriceChange, product.productId]);

  const handleReset = useCallback(() => {
    onPriceChange(product.productId, product.currentPrice);
  }, [onPriceChange, product.productId, product.currentPrice]);

  /** Trend label + color based on diff. */
  const trend = useMemo(() => {
    if (Math.abs(diffPercent) < 0.01) {
      return { label: 'Giá không đổi', color: Colors.textMuted, icon: 'remove' as const };
    }
    if (diffPercent < 0) {
      return {
        label: `${Math.abs(diffPercent).toFixed(1)}% dưới giá TB`,
        color: Colors.primary,
        icon: 'trending-down' as const,
      };
    }
    return {
      label: `${diffPercent.toFixed(1)}% trên giá TB`,
      color: Colors.danger,
      icon: 'trending-up' as const,
    };
  }, [diffPercent]);

  return (
    <View style={styles.card}>
      {/* ─── Top: Category badge + Stock status ─── */}
      <View style={styles.topRow}>
        <View style={styles.categoryBadge}>
          <Ionicons
            name={getCategoryIcon(product.category)}
            size={14}
            color={Colors.primary}
            style={styles.categoryIcon}
          />
          <Text style={styles.categoryText}>{product.category}</Text>
        </View>

        <View
          style={[
            styles.stockBadge,
            outOfStock ? styles.stockBadgeDanger : styles.stockBadgeOk,
          ]}
        >
          <View
            style={[
              styles.stockDot,
              outOfStock ? styles.stockDotDanger : styles.stockDotOk,
            ]}
          />
          <Text
            style={[
              styles.stockText,
              outOfStock ? styles.stockTextDanger : styles.stockTextOk,
            ]}
          >
            {outOfStock ? 'Hết hàng' : 'Còn hàng'}
          </Text>
        </View>
      </View>

      {/* ─── Product name + unit ─── */}
      <Text style={styles.productName} numberOfLines={2}>
        {product.productName}
      </Text>
      <Text style={styles.productUnit}>Đơn vị: {product.unit}</Text>

      {/* ─── Price adjustment area ─── */}
      <View style={styles.priceSection}>
        <Text style={styles.priceLabel}>Đặt giá mới (đ/kg)</Text>

        <View style={styles.priceControls}>
          <Pressable
            style={({ pressed }) => [
              styles.priceBtn,
              styles.priceBtnMinus,
              pressed && styles.priceBtnPressed,
            ]}
            onPress={handleDecrease}
            disabled={outOfStock}
          >
            <Ionicons name="remove" size={22} color={Colors.primary} />
          </Pressable>

          <View style={styles.priceDisplay}>
            <Text
              style={[
                styles.priceValue,
                isChanged && styles.priceValueChanged,
                outOfStock && styles.priceValueDisabled,
              ]}
            >
              {formatPrice(displayPrice)}
            </Text>
            <Text style={styles.priceCurrency}>đ</Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.priceBtn,
              styles.priceBtnPlus,
              pressed && styles.priceBtnPressed,
            ]}
            onPress={handleIncrease}
            disabled={outOfStock}
          >
            <Ionicons name="add" size={22} color={Colors.onPrimary} />
          </Pressable>
        </View>

        {/* ─── Reset button (only when changed) ─── */}
        {isChanged && (
          <Pressable style={styles.resetBtn} onPress={handleReset}>
            <Ionicons name="refresh" size={14} color={Colors.primary} style={styles.resetIcon} />
            <Text style={styles.resetText}>Đặt lại giá gốc</Text>
          </Pressable>
        )}
      </View>

      {/* ─── Trend + info row ─── */}
      <View style={styles.bottomRow}>
        <View style={styles.trendRow}>
          <Ionicons name={trend.icon} size={14} color={trend.color} style={styles.trendIcon} />
          <Text style={[styles.trendText, { color: trend.color }]}>
            {trend.label}
          </Text>
        </View>

        <Text style={styles.updatedText}>
          {formatRelativeTime(product.updatedAt)}
        </Text>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    padding: 16,
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  // ─── Top row ─────────────────────────────
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryIcon: {
    marginRight: 4,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primary,
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 100,
  },
  stockBadgeOk: {
    backgroundColor: Colors.primaryLight,
  },
  stockBadgeDanger: {
    backgroundColor: Colors.dangerLight,
  },
  stockDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  stockDotOk: {
    backgroundColor: Colors.primary,
  },
  stockDotDanger: {
    backgroundColor: Colors.danger,
  },
  stockText: {
    fontSize: 11,
    fontWeight: '700',
  },
  stockTextOk: {
    color: Colors.primary,
  },
  stockTextDanger: {
    color: Colors.danger,
  },

  // ─── Product info ────────────────────────
  productName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    lineHeight: 22,
    marginBottom: 4,
  },
  productUnit: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '500',
    marginBottom: 10,
  },

  // ─── Price section ───────────────────────
  priceSection: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  priceLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
    letterSpacing: 0.3,
    marginBottom: 10,
  },
  priceControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  priceBtnMinus: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    marginRight: 16,
  },
  priceBtnPlus: {
    backgroundColor: Colors.primary,
  },
  priceBtnPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.93 }],
  },
  priceDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    minWidth: 120,
    justifyContent: 'center',
  },
  priceValue: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.primary,
    textAlign: 'center',
  },
  priceValueChanged: {
    color: Colors.primaryContainer,
  },
  priceValueDisabled: {
    color: Colors.textMuted,
  },
  priceCurrency: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
    marginLeft: 2,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  resetIcon: {
    marginRight: 4,
  },
  resetText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
    textDecorationLine: 'underline',
  },

  // ─── Bottom row ──────────────────────────
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendIcon: {
    marginRight: 4,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '700',
  },
  updatedText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
});
