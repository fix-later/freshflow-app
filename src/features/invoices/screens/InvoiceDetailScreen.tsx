import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import { WebView } from 'react-native-webview';
import { Colors } from '../../../constants/colors';
import { Text } from '../../../components/ui/Text';
import {
  invoiceApi,
  INVOICE_STATUS_LABEL,
  type InvoiceDto,
  type InvoiceStatus,
} from '../api/invoiceApi';
import { type RestaurantProfileStackParamList } from '../../../navigation/types';
import { formatQuantityWithUnit } from '../../../utils/quantity';
import { getApiErrorMessage } from '../../../services/errors/apiErrorMessages';

type Props = NativeStackScreenProps<RestaurantProfileStackParamList, 'InvoiceDetail'>;

const STATUS_COLOR: Record<InvoiceStatus, string> = {
  Draft: Colors.textMuted,
  PendingIssuance: Colors.warning,
  Issued: Colors.success,
  Failed: Colors.danger,
  Adjusted: Colors.textMuted,
  Cancelled: Colors.danger,
};

const STATUS_HINT: Partial<Record<InvoiceStatus, string>> = {
  Draft: 'Hóa đơn đang được khởi tạo, chưa gửi tới cơ quan thuế.',
  PendingIssuance:
    'Đang chờ phát hành. Nếu hồ sơ thuế của nhà hàng chưa đầy đủ (mã số thuế, tên pháp lý, địa chỉ), hóa đơn sẽ chưa thể phát hành — vui lòng kiểm tra ở mục "Hồ sơ thuế".',
  // Fallback for error codes we don't recognize below (e.g. a raw e-invoice-provider code).
  Failed: 'Phát hành thất bại sau nhiều lần thử. Vui lòng liên hệ FreshFlow để được hỗ trợ.',
};

// invoice.errorReason is a machine code (see BE's InvoiceBuyerValidator / InvoiceIssuanceService),
// never user-facing prose — map the ones we know to Vietnamese. PendingIssuance can carry the same
// buyer-info codes as Failed (MarkAwaitingBuyerInfo keeps retrying instead of giving up), so this
// applies to both statuses, not just Failed.
const INVOICE_ERROR_REASON_LABEL: Record<string, string> = {
  BUYER_TAX_CODE_REQUIRED: 'Nhà hàng chưa nhập mã số thuế trong hồ sơ thuế.',
  BUYER_TAX_CODE_INVALID: 'Mã số thuế trong hồ sơ thuế không hợp lệ.',
  BUYER_LEGAL_NAME_REQUIRED: 'Nhà hàng chưa nhập tên pháp lý trong hồ sơ thuế.',
  BUYER_ADDRESS_REQUIRED: 'Nhà hàng chưa nhập địa chỉ trong hồ sơ thuế.',
  INVOICE_LINE_UNIT_REQUIRED:
    'Một số sản phẩm trong đơn hàng thiếu đơn vị tính. Vui lòng liên hệ FreshFlow để được hỗ trợ.',
  PROVIDER_EXCEPTION: 'Hiện chưa thể phát hành hóa đơn điện tử. Vui lòng thử lại sau.',
};

function resolveStatusHint(invoice: InvoiceDto): string | undefined {
  const mappedReason = invoice.errorReason ? INVOICE_ERROR_REASON_LABEL[invoice.errorReason] : undefined;
  if (mappedReason) {
    return invoice.status === 'Failed' ? `Phát hành thất bại: ${mappedReason}` : mappedReason;
  }
  return STATUS_HINT[invoice.status];
}

function formatVnd(amount: number) {
  return amount.toLocaleString('vi-VN') + 'đ';
}

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function base64ArrayBuffer(arrayBuffer: ArrayBuffer): string {
  let base64 = '';
  const encodings = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const bytes = new Uint8Array(arrayBuffer);
  const byteRemainder = bytes.byteLength % 3;
  const mainLength = bytes.byteLength - byteRemainder;

  for (let i = 0; i < mainLength; i += 3) {
    const chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    base64 += encodings[(chunk & 16515072) >> 18]
      + encodings[(chunk & 258048) >> 12]
      + encodings[(chunk & 4032) >> 6]
      + encodings[chunk & 63];
  }

  if (byteRemainder === 1) {
    const chunk = bytes[mainLength];
    base64 += encodings[(chunk & 252) >> 2] + encodings[(chunk & 3) << 4] + '==';
  } else if (byteRemainder === 2) {
    const chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1];
    base64 += encodings[(chunk & 64512) >> 10]
      + encodings[(chunk & 1008) >> 4]
      + encodings[(chunk & 15) << 2]
      + '=';
  }

  return base64;
}

function safeInvoiceFilePart(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '') || 'FreshFlow';
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

export function InvoiceDetailScreen({ route, navigation }: Props) {
  const { invoiceId } = route.params;
  const safeAreaInsets = useSafeAreaInsets();
  const [invoice, setInvoice] = useState<InvoiceDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [pdfVisible, setPdfVisible] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [sharingPdf, setSharingPdf] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await invoiceApi.getInvoiceById(invoiceId);
      setInvoice(data);
    } catch {
      setError('Không thể tải chi tiết hóa đơn.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleRefresh = () => {
    setRefreshing(true);
    void load();
  };

  const openOrder = () => {
    navigation.getParent<any>()?.navigate('RestaurantTracking', {
      screen: 'OrderDetail',
      params: { orderId: invoice!.orderId },
    });
  };

  const loadPdf = async (): Promise<string> => {
    if (pdfBase64) return pdfBase64;
    const buffer = await invoiceApi.getInvoicePdf(invoiceId);
    if (!buffer.byteLength) throw new Error('Không thể mở bản hóa đơn.');
    const encoded = base64ArrayBuffer(buffer);
    setPdfBase64(encoded);
    return encoded;
  };

  const handleOpenInvoiceDocument = async () => {
    if (!invoice || invoice.status !== 'Issued') {
      Alert.alert('Hóa đơn chưa sẵn sàng', 'Vui lòng chờ hóa đơn được phát hành.');
      return;
    }

    if (!invoice.isSandbox) {
      if (invoice.lookupUrl) {
        await Linking.openURL(invoice.lookupUrl).catch(() => {
          Alert.alert('Không thể mở hóa đơn', 'Vui lòng thử lại sau.');
        });
      } else {
        Alert.alert('Chưa có liên kết hóa đơn', 'Vui lòng liên hệ FreshFlow để được hỗ trợ.');
      }
      return;
    }

    setLoadingPdf(true);
    try {
      await loadPdf();
      setPdfVisible(true);
    } catch (pdfError: unknown) {
      Alert.alert('Không thể mở hóa đơn', getApiErrorMessage(pdfError, 'Vui lòng thử lại sau.'));
    } finally {
      setLoadingPdf(false);
    }
  };

  const handleSharePdf = async () => {
    if (!invoice || sharingPdf) return;
    setSharingPdf(true);
    try {
      const encoded = await loadPdf();
      if (!FileSystem.cacheDirectory) throw new Error('Không thể lưu bản hóa đơn.');
      const identity = safeInvoiceFilePart(invoice.number ?? invoice.id.slice(0, 8));
      const targetUri = `${FileSystem.cacheDirectory}Hoa_don_FreshFlow_${identity}.pdf`;
      await FileSystem.writeAsStringAsync(targetUri, encoded, {
        encoding: FileSystem.EncodingType.Base64,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(targetUri, {
          mimeType: 'application/pdf',
          UTI: 'com.adobe.pdf',
          dialogTitle: 'Chia sẻ hóa đơn FreshFlow',
        });
      } else {
        Alert.alert('Đã lưu hóa đơn', `File được lưu tại:\n${targetUri}`);
      }
    } catch (shareError: unknown) {
      Alert.alert('Không thể chia sẻ hóa đơn', getApiErrorMessage(shareError, 'Vui lòng thử lại sau.'));
    } finally {
      setSharingPdf(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.screen} edges={['bottom']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !invoice) {
    return (
      <SafeAreaView style={styles.screen} edges={['bottom']}>
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
          <Text style={styles.errorText}>{error ?? 'Không tìm thấy hóa đơn.'}</Text>
          <Pressable style={styles.retryBtn} onPress={() => { setLoading(true); void load(); }}>
            <Text style={styles.retryText}>Thử lại</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const statusHint = resolveStatusHint(invoice);

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[Colors.primary]} />
        }
      >
        {/* ─── Header ─────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.invoiceNumber}>{invoice.number ?? 'Chưa cấp số'}</Text>
              {invoice.serial && <Text style={styles.serial}>Ký hiệu: {invoice.serial}</Text>}
            </View>
            <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[invoice.status] + '22' }]}>
              <Text style={[styles.statusText, { color: STATUS_COLOR[invoice.status] }]}>
                {INVOICE_STATUS_LABEL[invoice.status]}
              </Text>
            </View>
          </View>
          {statusHint && (
            <View style={styles.hintBox}>
              <Ionicons name="information-circle-outline" size={16} color={Colors.textSecondary} />
              <Text style={styles.hintText}>{statusHint}</Text>
            </View>
          )}
          {invoice.status === 'Issued' ? (
            <Pressable
              style={[styles.pdfButton, loadingPdf && styles.pdfButtonDisabled]}
              disabled={loadingPdf}
              onPress={() => void handleOpenInvoiceDocument()}
            >
              {loadingPdf ? (
                <ActivityIndicator size="small" color={Colors.onPrimary} />
              ) : (
                <Ionicons
                  name={invoice.isSandbox ? 'document-text-outline' : 'open-outline'}
                  size={18}
                  color={Colors.onPrimary}
                />
              )}
              <Text style={styles.pdfButtonText}>
                {invoice.isSandbox ? 'Xem bản hóa đơn' : 'Mở hóa đơn điện tử'}
              </Text>
            </Pressable>
          ) : null}
          <View style={styles.separator} />
          <Row label="Ngày tạo" value={formatDate(invoice.createdAt)} />
          <Row label="Ngày phát hành" value={formatDate(invoice.issuedAt)} />
          {invoice.taxAuthorityCode && <Row label="Mã cơ quan thuế" value={invoice.taxAuthorityCode} />}

          <View style={styles.actionRow}>
            <Pressable style={[styles.lookupBtn, styles.actionBtn]} onPress={openOrder}>
              <Ionicons name="receipt-outline" size={16} color={Colors.primaryText} />
              <Text style={styles.lookupBtnText}>Xem đơn hàng</Text>
            </Pressable>
            {invoice.lookupUrl && (
              <Pressable
                style={[styles.lookupBtn, styles.actionBtn]}
                onPress={() => Linking.openURL(invoice.lookupUrl!).catch(() => {})}
              >
                <Ionicons name="open-outline" size={16} color={Colors.primaryText} />
                <Text style={styles.lookupBtnText}>Tra cứu thuế</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* ─── Buyer info ─────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardSection}>Thông tin người mua</Text>
          <Row label="Mã số thuế" value={invoice.buyerTaxCode || '—'} />
          <Row label="Tên pháp lý" value={invoice.buyerLegalName || '—'} />
          <Row label="Địa chỉ" value={invoice.buyerAddress || '—'} />
          <Row label="Email" value={invoice.buyerEmail || '—'} />
        </View>

        {/* ─── Lines ──────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardSection}>Chi tiết hàng hóa</Text>
          {invoice.lines.map((line, index) => (
            <View key={`${line.productName}-${index}`} style={styles.lineItem}>
              <View style={styles.lineHeader}>
                <Text style={styles.lineName} numberOfLines={2}>{line.productName}</Text>
                <Text style={styles.lineTotal}>{formatVnd(line.lineTotal)}</Text>
              </View>
              <Text style={styles.lineSub}>
                {formatQuantityWithUnit(line.quantity, line.unit)} x {formatVnd(line.unitPrice)} · VAT{' '}
                {line.vatRateCode} ({line.vatRatePercent}%)
              </Text>
              {index < invoice.lines.length - 1 && <View style={styles.lineSeparator} />}
            </View>
          ))}
        </View>

        {/* ─── Totals ─────────────────────────── */}
        <View style={styles.card}>
          <Row label="Tạm tính" value={formatVnd(invoice.subTotal)} />
          <Row label="Thuế VAT" value={formatVnd(invoice.vatAmount)} />
          <View style={styles.separator} />
          <View style={styles.row}>
            <Text style={styles.totalLabel}>Tổng cộng</Text>
            <Text style={styles.totalValue}>{formatVnd(invoice.total)}</Text>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={pdfVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setPdfVisible(false)}
      >
        <View
          style={[
            styles.pdfScreen,
            {
              paddingTop: safeAreaInsets.top,
              paddingBottom: safeAreaInsets.bottom,
            },
          ]}
        >
          <View
            style={[
              styles.pdfHeader,
              {
                paddingLeft: Math.max(12, safeAreaInsets.left + 12),
                paddingRight: Math.max(12, safeAreaInsets.right + 12),
              },
            ]}
          >
            <Pressable style={styles.pdfHeaderButton} onPress={() => setPdfVisible(false)}>
              <Ionicons name="close" size={24} color={Colors.textPrimary} />
            </Pressable>
            <View style={styles.pdfHeaderTitleWrap}>
              <Text style={styles.pdfHeaderTitle}>Bản hóa đơn</Text>
              <Text style={styles.pdfHeaderSubtitle}>{invoice.number ?? invoice.id.slice(0, 8)}</Text>
            </View>
            <Pressable
              style={styles.pdfHeaderButton}
              disabled={sharingPdf}
              onPress={() => void handleSharePdf()}
            >
              {sharingPdf ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Ionicons name="share-outline" size={22} color={Colors.primaryText} />
              )}
            </Pressable>
          </View>

          {pdfBase64 ? (
            <WebView
              style={styles.pdfWebView}
              originWhitelist={['*']}
              allowFileAccess
              allowUniversalAccessFromFileURLs
              source={{
                html: `<!doctype html>
                  <html>
                    <head>
                      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=4">
                      <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js"></script>
                      <style>
                        html, body { margin: 0; min-height: 100%; background: #525659; font-family: sans-serif; }
                        #pages { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 12px; }
                        canvas { width: 100% !important; height: auto !important; background: white; box-shadow: 0 3px 14px rgba(0,0,0,.35); }
                        #status { color: white; padding: 28px 12px; text-align: center; }
                      </style>
                    </head>
                    <body>
                      <div id="pages"><div id="status">Đang hiển thị hóa đơn...</div></div>
                      <script>
                        (async function () {
                          try {
                            const binary = atob('${pdfBase64}');
                            const bytes = new Uint8Array(binary.length);
                            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                            const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
                            document.getElementById('status').remove();
                            for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
                              const page = await pdf.getPage(pageNumber);
                              const viewport = page.getViewport({ scale: 2 });
                              const canvas = document.createElement('canvas');
                              canvas.width = viewport.width;
                              canvas.height = viewport.height;
                              document.getElementById('pages').appendChild(canvas);
                              await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
                            }
                          } catch (_) {
                            document.getElementById('status').innerText = 'Không thể hiển thị bản hóa đơn. Vui lòng đóng và thử lại.';
                          }
                        })();
                      </script>
                    </body>
                  </html>`,
              }}
            />
          ) : (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  loadingText: { fontSize: 14, color: Colors.textMuted },
  errorText: { fontSize: 14, color: Colors.error, textAlign: 'center', maxWidth: 260 },
  retryBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryText: { color: Colors.onPrimary, fontWeight: '700', fontSize: 14 },

  content: { padding: 16, gap: 16, paddingBottom: 40 },

  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  cardSection: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },

  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  invoiceNumber: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  serial: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: '700' },

  hintBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
  },
  hintText: { flex: 1, fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },

  pdfButton: {
    minHeight: 46,
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  pdfButtonDisabled: { opacity: 0.65 },
  pdfButtonText: { fontSize: 14, fontWeight: '700', color: Colors.onPrimary },

  separator: { height: 1, backgroundColor: Colors.surfaceContainerHigh, marginVertical: 10 },

  row: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingVertical: 6, gap: 8 },
  rowLabel: { fontSize: 13, color: Colors.textSecondary },
  rowValue: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary, maxWidth: '60%', textAlign: 'right' },

  actionRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  actionBtn: { flex: 1 },
  lookupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
  },
  lookupBtnText: { fontSize: 13, fontWeight: '700', color: Colors.primaryText },

  lineItem: { paddingVertical: 8 },
  lineHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  lineName: { flex: 1, fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  lineTotal: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  lineSub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  lineSeparator: { height: 1, backgroundColor: Colors.surfaceContainerHigh, marginTop: 10 },

  totalLabel: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  totalValue: { fontSize: 17, fontWeight: '800', color: Colors.primaryText },

  pdfScreen: { flex: 1, backgroundColor: '#525659' },
  pdfHeader: {
    minHeight: 62,
    paddingHorizontal: 12,
    backgroundColor: Colors.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pdfHeaderButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceContainerLow,
  },
  pdfHeaderTitleWrap: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  pdfHeaderTitle: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  pdfHeaderSubtitle: { marginTop: 2, fontSize: 11, color: Colors.textMuted },
  pdfWebView: { flex: 1, backgroundColor: '#525659' },
});
