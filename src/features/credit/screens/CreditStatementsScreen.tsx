import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import { WebView } from 'react-native-webview';
import { Colors } from '../../../constants/colors';
import { Text } from '../../../components/ui/Text';
import {
  creditApi,
  getTransactionTypeColor,
  getTransactionTypeLabel,
  type CreditStatementDto,
  type CreditStatementLineDto,
  type CreditStatementSummaryDto,
} from '../api/creditApi';
import { restaurantApi } from '../../restaurant/api/restaurantApi';
import { type RestaurantProfileStackParamList } from '../../../navigation/types';
import { getApiErrorMessage } from '../../../services/errors/apiErrorMessages';

type Props = NativeStackScreenProps<RestaurantProfileStackParamList, 'CreditStatements'>;

const STATEMENT_PAGE_SIZE = 20;

// Backend always renders statement periods/dates in Asia/Ho_Chi_Minh (see
// StatementPdfRenderer), even though PeriodStart/PeriodEnd are stored as UTC
// boundaries of a VN calendar month. Pin the same zone here so the on-screen
// detail agrees with the PDF instead of drifting a day/month off on devices
// that aren't set to VN time.
const VN_TIMEZONE = 'Asia/Ho_Chi_Minh';

function formatVnd(amount: number) {
  return amount.toLocaleString('vi-VN') + 'đ';
}

function formatPeriod(start: string, end: string) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const inclusiveEnd = new Date(endDate.getTime() - 1);
  const opts: Intl.DateTimeFormatOptions = { timeZone: VN_TIMEZONE };

  return `${startDate.toLocaleDateString('vi-VN', opts)} - ${inclusiveEnd.toLocaleDateString('vi-VN', opts)}`;
}

function formatMonthTitle(periodStart: string) {
  const d = new Date(periodStart);
  if (Number.isNaN(d.getTime())) return 'Tháng —';
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  return `Tháng ${month}/${year}`;
}

function base64ArrayBuffer(arrayBuffer: ArrayBuffer): string {
  let base64 = '';
  const encodings = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const bytes = new Uint8Array(arrayBuffer);
  const byteLength = bytes.byteLength;
  const byteRemainder = byteLength % 3;
  const mainLength = byteLength - byteRemainder;

  let a: number, b: number, c: number, d: number;
  let chunk: number;

  for (let i = 0; i < mainLength; i += 3) {
    chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    a = (chunk & 16515072) >> 18;
    b = (chunk & 258048) >> 12;
    c = (chunk & 4032) >> 6;
    d = chunk & 63;
    base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d];
  }

  if (byteRemainder === 1) {
    chunk = bytes[mainLength];
    a = (chunk & 252) >> 2;
    b = (chunk & 3) << 4;
    base64 += encodings[a] + encodings[b] + '==';
  } else if (byteRemainder === 2) {
    chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1];
    a = (chunk & 64512) >> 10;
    b = (chunk & 1008) >> 4;
    c = (chunk & 15) << 2;
    base64 += encodings[a] + encodings[b] + encodings[c] + '=';
  }

  return base64;
}

function StatementCard({
  item,
  onPressDetail,
}: {
  item: CreditStatementSummaryDto;
  onPressDetail: (item: CreditStatementSummaryDto) => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <Text style={styles.cardMonth}>{formatMonthTitle(item.periodStart)}</Text>
          <Text style={styles.periodText}>{formatPeriod(item.periodStart, item.periodEnd)}</Text>
        </View>
        <Text style={styles.generatedDate}>
          Chốt ngày {new Date(item.generatedAt).toLocaleDateString('vi-VN', { timeZone: VN_TIMEZONE })}
        </Text>
      </View>

      <View style={styles.cardDivider} />

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Số dư đầu kỳ</Text>
          <Text style={styles.statValue}>{formatVnd(item.openingBalance)}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Số dư cuối kỳ</Text>
          <Text style={styles.statValue}>{formatVnd(item.closingBalance)}</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Tổng nợ phát sinh</Text>
          <Text style={[styles.statValue, { color: Colors.danger }]}>
            –{formatVnd(item.totalCharges)}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Tổng đã thanh toán</Text>
          <Text style={[styles.statValue, { color: Colors.primaryText }]}>
            +{formatVnd(item.totalSettlements)}
          </Text>
        </View>
      </View>

      {item.totalRefunds > 0 ? (
        <View style={styles.refundRow}>
          <Text style={styles.statLabel}>Tổng hoàn tiền</Text>
          <Text style={[styles.statValue, { color: Colors.primaryText }]}>
            +{formatVnd(item.totalRefunds)}
          </Text>
        </View>
      ) : null}

      <View style={styles.cardDivider} />

      <Pressable style={styles.detailBtn} onPress={() => onPressDetail(item)}>
        <Ionicons name="document-text-outline" size={17} color={Colors.primaryText} />
        <Text style={styles.detailBtnText}>Xem chi tiết & PDF</Text>
        <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
      </Pressable>
    </View>
  );
}

export function CreditStatementsScreen({ route }: Props) {
  const routeRestaurantId = route.params?.restaurantId;
  const [activeRestaurantId, setActiveRestaurantId] = useState<string | null>(routeRestaurantId ?? null);

  const [statements, setStatements] = useState<CreditStatementSummaryDto[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Statement Detail Modal state
  const [selectedSummary, setSelectedSummary] = useState<CreditStatementSummaryDto | null>(null);
  const [statementDetail, setStatementDetail] = useState<CreditStatementDto | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [modalTab, setModalTab] = useState<'detail' | 'pdf'>('detail');
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);

  // Compute default target month (previous month) for generating statement
  const now = new Date();
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const defaultTargetYear = prevMonthDate.getFullYear();
  const defaultTargetMonth = prevMonthDate.getMonth() + 1;

  const resolveRestaurantId = useCallback(async (): Promise<string | null> => {
    if (activeRestaurantId) return activeRestaurantId;
    if (routeRestaurantId) {
      setActiveRestaurantId(routeRestaurantId);
      return routeRestaurantId;
    }
    try {
      const approval = await restaurantApi.getApprovalStatus();
      const id = approval.restaurantId;
      if (id) setActiveRestaurantId(id);
      return id;
    } catch {
      return null;
    }
  }, [activeRestaurantId, routeRestaurantId]);

  const load = useCallback(async () => {
    try {
      const targetId = await resolveRestaurantId();
      if (!targetId) {
        setError('Không tìm thấy thông tin nhà hàng');
        return;
      }
      const res = await creditApi.getStatements(targetId, {
        pageSize: STATEMENT_PAGE_SIZE,
      });
      setStatements(res.data);
      setNextCursor(res.meta.nextCursor);
      setLoadMoreError(false);
      setError(null);
    } catch {
      setError('Không thể tải danh sách sao kê');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [resolveRestaurantId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleRefresh = () => {
    setRefreshing(true);
    void load();
  };

  const loadMore = useCallback(async () => {
    const targetId = activeRestaurantId || (await resolveRestaurantId());
    if (!targetId || !nextCursor || loadingMore) return;

    setLoadingMore(true);
    setLoadMoreError(false);
    try {
      const res = await creditApi.getStatements(targetId, {
        cursor: nextCursor,
        pageSize: STATEMENT_PAGE_SIZE,
      });
      setStatements((current) => {
        const existingIds = new Set(current.map((item) => item.id));
        return [...current, ...res.data.filter((item) => !existingIds.has(item.id))];
      });
      setNextCursor(res.meta.nextCursor);
    } catch {
      setLoadMoreError(true);
    } finally {
      setLoadingMore(false);
    }
  }, [activeRestaurantId, loadingMore, nextCursor, resolveRestaurantId]);

  const handleGenerate = async () => {
    const targetId = activeRestaurantId || (await resolveRestaurantId());
    if (!targetId) {
      Alert.alert('Lỗi', 'Không tìm thấy thông tin nhà hàng.');
      return;
    }
    Alert.alert(
      'Tạo sao kê',
      `Tạo sao kê tín dụng cho Tháng ${defaultTargetMonth}/${defaultTargetYear} (tháng vừa kết thúc)?`,
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: `Tạo T${defaultTargetMonth}/${defaultTargetYear}`,
          onPress: async () => {
            setGenerating(true);
            try {
              const newStatement = await creditApi.generateStatement(
                targetId,
                defaultTargetYear,
                defaultTargetMonth,
              );
              setStatements((prev) => {
                const exists = prev.findIndex((s) => s.id === newStatement.id);
                if (exists >= 0) {
                  return prev.map((s, i) => (i === exists ? newStatement : s));
                }
                return [newStatement, ...prev];
              });
              Alert.alert('Thành công', `Đã tạo sao kê Tháng ${defaultTargetMonth}/${defaultTargetYear}`);
            } catch (err: unknown) {
              Alert.alert('Không thể tạo sao kê', getApiErrorMessage(err, 'Đã xảy ra lỗi. Vui lòng thử lại.'));
            } finally {
              setGenerating(false);
            }
          },
        },
      ],
    );
  };

  const handleOpenDetail = async (summaryItem: CreditStatementSummaryDto) => {
    const targetId = activeRestaurantId || (await resolveRestaurantId());
    if (!targetId) return;
    setSelectedSummary(summaryItem);
    setModalTab('detail');
    setPdfBase64(null);
    setLoadingDetail(true);
    setStatementDetail(null);
    try {
      const detail = await creditApi.getStatementById(targetId, summaryItem.id);
      setStatementDetail(detail);
    } catch {
      Alert.alert('Lỗi', 'Không thể tải chi tiết sao kê. Vui lòng thử lại.');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleFetchAndShowPdf = async (statementId: string) => {
    const targetId = activeRestaurantId || (await resolveRestaurantId());
    if (!targetId) return;
    setDownloadingPdf(true);
    try {
      const buffer = await creditApi.getStatementPdf(targetId, statementId);
      if (buffer && buffer.byteLength > 0) {
        const b64 = base64ArrayBuffer(buffer);
        setPdfBase64(b64);
        setModalTab('pdf');
      } else {
        Alert.alert('Thông báo', 'File PDF sao kê chưa có dữ liệu.');
      }
    } catch {
      Alert.alert('Lỗi', 'Không thể tải file PDF sao kê từ máy chủ.');
    } finally {
      setDownloadingPdf(false);
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

  if (error) {
    return (
      <SafeAreaView style={styles.screen} edges={['bottom']}>
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={() => { setLoading(true); void load(); }}>
            <Text style={styles.retryText}>Thử lại</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <FlatList
        data={statements}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <StatementCard item={item} onPressDetail={(st) => void handleOpenDetail(st)} />
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[Colors.primary]} />
        }
        ListHeaderComponent={
          <Pressable
            style={[styles.generateBtn, generating && styles.generateBtnDisabled]}
            onPress={handleGenerate}
            disabled={generating}
          >
            {generating ? (
              <ActivityIndicator size="small" color={Colors.onPrimary} />
            ) : (
              <>
                <Ionicons name="add-circle-outline" size={20} color={Colors.onPrimary} />
                <Text style={styles.generateBtnText}>
                  Tạo sao kê Tháng {defaultTargetMonth}/{defaultTargetYear}
                </Text>
              </>
            )}
          </Pressable>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="documents-outline" size={52} color={Colors.outline} />
            <Text style={styles.emptyTitle}>Chưa có sao kê</Text>
            <Text style={styles.emptySub}>
              Nhấn nút trên để tạo sao kê cho Tháng {defaultTargetMonth}/{defaultTargetYear} vừa kết thúc.
            </Text>
          </View>
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footer}>
              <ActivityIndicator size="small" color={Colors.primary} />
            </View>
          ) : loadMoreError ? (
            <Pressable style={styles.footer} onPress={() => void loadMore()}>
              <Text style={styles.loadMoreError}>Không tải được trang tiếp theo · Thử lại</Text>
            </Pressable>
          ) : null
        }
        onEndReached={() => void loadMore()}
        onEndReachedThreshold={0.25}
      />

      {/* Statement Detail & PDF Modal */}
      <Modal
        visible={Boolean(selectedSummary)}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedSummary(null)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelectedSummary(null)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />

            {selectedSummary ? (
              modalTab === 'pdf' ? (
                <>
                  <View style={styles.sheetHeader}>
                    <Pressable
                      style={styles.backTabBtn}
                      onPress={() => setModalTab('detail')}
                    >
                      <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
                      <Text style={styles.backTabText}>Quay lại chi tiết</Text>
                    </Pressable>
                    <Pressable onPress={() => setSelectedSummary(null)}>
                      <Ionicons name="close-circle" size={26} color={Colors.textMuted} />
                    </Pressable>
                  </View>

                  {pdfBase64 ? (
                    <View style={styles.webViewContainer}>
                      <WebView
                        originWhitelist={['*']}
                        allowFileAccess
                        allowUniversalAccessFromFileURLs
                        source={{
                          html: `
                            <!DOCTYPE html>
                            <html>
                              <head>
                                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=3.0">
                                <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js"></script>
                                <style>
                                  html, body { margin: 0; padding: 0; width: 100%; background: #525659; font-family: sans-serif; }
                                  #pdf-container { display: flex; flex-direction: column; align-items: center; padding: 10px; }
                                  canvas { width: 100% !important; height: auto !important; margin-bottom: 12px; border-radius: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
                                </style>
                              </head>
                              <body>
                                <div id="pdf-container">
                                  <div id="status" style="color:white;padding:20px;text-align:center">Đang tải trang PDF...</div>
                                </div>
                                <script>
                                  try {
                                    const b64 = "${pdfBase64}";
                                    const pdfData = atob(b64);
                                    const loadingTask = pdfjsLib.getDocument({ data: pdfData });
                                    loadingTask.promise.then(pdf => {
                                      const statusEl = document.getElementById('status');
                                      if (statusEl) statusEl.style.display = 'none';
                                      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                                        pdf.getPage(pageNum).then(page => {
                                          const scale = 2.0;
                                          const viewport = page.getViewport({ scale });
                                          const canvas = document.createElement('canvas');
                                          const context = canvas.getContext('2d');
                                          canvas.height = viewport.height;
                                          canvas.width = viewport.width;
                                          document.getElementById('pdf-container').appendChild(canvas);
                                          page.render({ canvasContext: context, viewport: viewport });
                                        });
                                      }
                                    }).catch(err => {
                                      document.getElementById('status').innerText = 'Vui lòng xem chi tiết danh sách giao dịch tại tab Chi tiết.';
                                    });
                                  } catch (e) {
                                    document.getElementById('status').innerText = 'Vui lòng xem chi tiết danh sách giao dịch tại tab Chi tiết.';
                                  }
                                </script>
                              </body>
                            </html>
                          `,
                        }}
                        style={{ flex: 1 }}
                      />
                    </View>
                  ) : (
                    <View style={styles.modalCentered}>
                      <ActivityIndicator size="large" color={Colors.primary} />
                      <Text style={styles.loadingText}>Đang nạp file PDF...</Text>
                    </View>
                  )}
                </>
              ) : (
                <>
                  <View style={styles.sheetHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sheetTitle}>
                        Chi tiết {formatMonthTitle(selectedSummary.periodStart)}
                      </Text>
                      <Text style={styles.sheetSubtitle}>
                        {formatPeriod(selectedSummary.periodStart, selectedSummary.periodEnd)}
                      </Text>
                    </View>
                    <Pressable onPress={() => setSelectedSummary(null)}>
                      <Ionicons name="close-circle" size={26} color={Colors.textMuted} />
                    </Pressable>
                  </View>

                  {loadingDetail ? (
                    <View style={styles.modalCentered}>
                      <ActivityIndicator size="large" color={Colors.primary} />
                      <Text style={styles.loadingText}>Đang tải chi tiết sao kê...</Text>
                    </View>
                  ) : (
                    <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: '75%' }}>
                      <View style={styles.detailSummaryBox}>
                        <View style={styles.statsRow}>
                          <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Đầu kỳ</Text>
                            <Text style={styles.statValue}>{formatVnd(selectedSummary.openingBalance)}</Text>
                          </View>
                          <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Cuối kỳ</Text>
                            <Text style={styles.statValue}>{formatVnd(selectedSummary.closingBalance)}</Text>
                          </View>
                        </View>
                        <View style={styles.statsRow}>
                          <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Nợ phát sinh</Text>
                            <Text style={[styles.statValue, { color: Colors.danger }]}>
                              –{formatVnd(selectedSummary.totalCharges)}
                            </Text>
                          </View>
                          <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Đã thanh toán</Text>
                            <Text style={[styles.statValue, { color: Colors.primaryText }]}>
                              +{formatVnd(selectedSummary.totalSettlements)}
                            </Text>
                          </View>
                        </View>
                        {statementDetail?.dueDate ? (
                          <View style={styles.dueDateRow}>
                            <Ionicons name="calendar-outline" size={16} color={Colors.warning} />
                            <Text style={styles.dueDateText}>
                              Hạn thanh toán: {new Date(statementDetail.dueDate).toLocaleDateString('vi-VN', { timeZone: VN_TIMEZONE })}
                            </Text>
                          </View>
                        ) : null}
                      </View>

                      <Text style={styles.linesSectionTitle}>Danh sách giao dịch trong kỳ</Text>

                      {statementDetail?.lines && statementDetail.lines.length > 0 ? (
                        statementDetail.lines.map((line: CreditStatementLineDto, idx: number) => {
                          const typeLower = (line.type || '').toLowerCase();
                          const label = getTransactionTypeLabel(line.type);
                          const color = getTransactionTypeColor(line.type);
                          const isCharge = typeLower === 'charge';
                          const sign = isCharge ? '−' : '+';

                          return (
                            <View key={line.transactionId || idx} style={styles.lineItem}>
                              <View style={[styles.lineIcon, { backgroundColor: `${color}18` }]}>
                                <Ionicons
                                  name={isCharge ? 'remove-circle-outline' : 'add-circle-outline'}
                                  size={20}
                                  color={color}
                                />
                              </View>
                              <View style={styles.lineInfo}>
                                <Text style={styles.lineLabel}>{label}</Text>
                                {line.note || line.reference ? (
                                  <Text style={styles.lineNote} numberOfLines={1}>
                                    {line.note || line.reference}
                                  </Text>
                                ) : null}
                                <Text style={styles.lineDate}>
                                  {new Date(line.occurredAt).toLocaleString('vi-VN', {
                                    timeZone: VN_TIMEZONE,
                                    day: '2-digit',
                                    month: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </Text>
                              </View>
                              <View style={styles.lineAmountWrap}>
                                <Text numeric style={[styles.lineAmount, { color }]}>
                                  {sign}{formatVnd(Math.abs(line.amount))}
                                </Text>
                                <Text numeric style={styles.lineBalance}>
                                  Dư: {formatVnd(line.balanceAfter)}
                                </Text>
                              </View>
                            </View>
                          );
                        })
                      ) : (
                        <Text style={styles.noLinesText}>Không có dòng giao dịch nào trong kỳ này</Text>
                      )}
                    </ScrollView>
                  )}

                  <View style={styles.modalActionRow}>
                    <Pressable
                      style={[styles.pdfBtn, downloadingPdf && styles.generateBtnDisabled]}
                      disabled={downloadingPdf}
                      onPress={() => void handleFetchAndShowPdf(selectedSummary.id)}
                    >
                      {downloadingPdf ? (
                        <ActivityIndicator size="small" color={Colors.onPrimary} />
                      ) : (
                        <>
                          <Ionicons name="document-text-outline" size={20} color={Colors.onPrimary} />
                          <Text style={styles.pdfBtnText}>Xem file PDF sao kê</Text>
                        </>
                      )}
                    </Pressable>
                  </View>
                </>
              )
            ) : null}
          </View>
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

  list: { padding: 16, gap: 12 },

  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 4,
  },
  generateBtnDisabled: { opacity: 0.6 },
  generateBtnText: { color: Colors.onPrimary, fontWeight: '700', fontSize: 15 },

  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardHeaderLeft: { flex: 1, gap: 2 },
  cardMonth: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  periodText: { fontSize: 11, color: Colors.textMuted },
  generatedDate: { fontSize: 11, color: Colors.textMuted },

  cardDivider: { height: 1, backgroundColor: Colors.surfaceContainerHigh },

  statsRow: { flexDirection: 'row', gap: 12 },
  statItem: { flex: 1, gap: 3 },
  statLabel: { fontSize: 11, color: Colors.textMuted },
  statValue: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  refundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  detailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  detailBtnText: { flex: 1, marginLeft: 8, fontSize: 13, fontWeight: '600', color: Colors.textPrimary },

  empty: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
    gap: 8,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginTop: 8 },
  emptySub: { fontSize: 13, color: Colors.textMuted, textAlign: 'center', lineHeight: 18 },
  footer: { minHeight: 52, alignItems: 'center', justifyContent: 'center', padding: 12 },
  loadMoreError: { fontSize: 12, color: Colors.error, textAlign: 'center' },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '88%',
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.outlineVariant,
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  sheetSubtitle: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  modalCentered: { padding: 40, alignItems: 'center', gap: 12 },
  detailSummaryBox: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    gap: 10,
    marginBottom: 16,
  },
  dueDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceContainerHigh,
  },
  dueDateText: { fontSize: 12, fontWeight: '600', color: Colors.warning },
  linesSectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, marginBottom: 10 },
  lineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceContainerHigh,
  },
  lineIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lineInfo: { flex: 1 },
  lineLabel: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  lineNote: { fontSize: 11, color: Colors.textMuted },
  lineDate: { fontSize: 10, color: Colors.textMuted, marginTop: 2 },
  lineAmountWrap: { alignItems: 'flex-end' },
  lineAmount: { fontSize: 13, fontWeight: '700' },
  lineBalance: { fontSize: 10, color: Colors.textMuted },
  noLinesText: { fontSize: 13, color: Colors.textMuted, fontStyle: 'italic', paddingVertical: 16 },
  modalActionRow: { paddingTop: 16, marginTop: 8 },
  pdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
  },
  pdfBtnText: { color: Colors.onPrimary, fontWeight: '700', fontSize: 15 },
  backTabBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backTabText: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  webViewContainer: { height: 480, borderRadius: 14, overflow: 'hidden', marginVertical: 8 },
  pdfViewerContainer: { flex: 1, backgroundColor: Colors.background },
  pdfViewerHeader: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
    backgroundColor: Colors.surface,
  },
  pdfViewerTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  pdfCloseBtn: { padding: 4 },
  pdfWebView: { flex: 1 },
});

