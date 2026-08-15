import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  type StyleProp,
  type TextStyle,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandLogo } from '../../../components/ui/BrandLogo';
import { Text, TextInput } from '../../../components/ui/Text';
import { Colors } from '../../../constants/colors';
import { Fonts } from '../../../constants/fonts';
import {
  assistantApi,
  type PendingAssistantConfirmation,
} from '../api/assistantApi';
import { useCartStore } from '../../../store/cartStore';
import { restaurantApi, type DeliveryAddressDto } from '../../restaurant/api/restaurantApi';
import { describeApiCode } from '../../../services/errors/apiErrorMessages';

interface ChatMessage {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  pendingConfirmation?: PendingAssistantConfirmation | null;
  draftOrderId?: string | null;
}

const QUICK_PROMPTS = [
  'Tìm rau củ giá tốt hôm nay',
  'Gợi ý nguyên liệu cho 50 suất ăn',
  'Kiểm tra đơn hàng gần nhất',
];

function createSessionId() {
  return `mobile-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function resolveErrorMessage(status?: number, code?: string): string {
  if (code === 'ASSISTANT_PROVIDER_RATE_LIMITED' || status === 429) {
    return 'Trợ lý AI đang quá tải, vui lòng thử lại sau ít phút.';
  }
  if (code === 'ASSISTANT_PROVIDER_TIMEOUT' || status === 504) {
    return 'Trợ lý AI phản hồi quá chậm. Vui lòng thử lại.';
  }
  if (code === 'ASSISTANT_PROVIDER_AUTH_FAILED' || code === 'ASSISTANT_PROVIDER_UNAVAILABLE' || status === 502) {
    return 'Trợ lý AI tạm thời không khả dụng. Vui lòng thử lại sau.';
  }
  if (status === 401 || status === 403) {
    return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
  }
  if (code === 'DELIVERY_ADDRESS_REQUIRED') {
    return 'Nhà hàng chưa có địa chỉ giao hàng. Vui lòng thêm địa chỉ trong hồ sơ trước khi xác nhận đơn.';
  }
  return 'Trợ lý đang bận. Vui lòng thử lại sau ít phút.';
}

interface OrderPreview {
  wouldSucceed: boolean;
  totalAmount: number;
  resolvedScheduledFor: string | null;
  issues: { code: string; message: string }[];
}

function parsePreview(previewJson: string): OrderPreview | null {
  try {
    return JSON.parse(previewJson) as OrderPreview;
  } catch {
    return null;
  }
}

function formatPrice(value: number) {
  return `${value.toLocaleString('vi-VN')}đ`;
}

// ── Lightweight GFM-table rendering for assistant replies ──────────────────────
// The LLM often answers product lookups with a `| col | col |` markdown table; rendered as
// plain <Text> those pipes/dashes show up literally. This detects table blocks inline with
// regular text and renders just those as an actual table, leaving everything else untouched —
// full markdown (bold/links/etc.) is out of scope, only tables were the reported readability issue.
type ContentBlock =
  | { type: 'text'; content: string }
  | { type: 'table'; headers: string[]; rows: string[][] };

function isTableSeparatorLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.includes('|')) return false;
  return /^\|?(\s*:?-+:?\s*\|)*\s*:?-+:?\s*\|?$/.test(trimmed);
}

function parseTableRow(line: string): string[] {
  let trimmed = line.trim();
  if (trimmed.startsWith('|')) trimmed = trimmed.slice(1);
  if (trimmed.endsWith('|')) trimmed = trimmed.slice(0, -1);
  return trimmed.split('|').map((cell) => cell.trim());
}

function parseMessageContent(content: string): ContentBlock[] {
  const lines = content.split('\n');
  const blocks: ContentBlock[] = [];
  let textBuffer: string[] = [];
  let i = 0;

  const flushText = () => {
    const text = textBuffer.join('\n').trim();
    if (text) blocks.push({ type: 'text', content: text });
    textBuffer = [];
  };

  while (i < lines.length) {
    const line = lines[i];
    const nextLine = lines[i + 1];
    if (line.trim().includes('|') && nextLine !== undefined && isTableSeparatorLine(nextLine)) {
      flushText();
      const headers = parseTableRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().includes('|')) {
        rows.push(parseTableRow(lines[i]));
        i += 1;
      }
      blocks.push({ type: 'table', headers, rows });
      continue;
    }
    textBuffer.push(line);
    i += 1;
  }
  flushText();
  return blocks;
}

// Rough monospace-ish glyph width at fontSize 11 — each row lays out its cells independently
// (they're separate flex-row Views), so without a shared per-column width, a short data cell
// ("Bơ") and its longer header ("Tên sản phẩm") end up different widths and the columns drift
// out of alignment across rows. Estimating width from content length keeps every cell in a
// column the same size without needing an actual text-measurement pass.
const TABLE_CHAR_WIDTH = 6.5;
const TABLE_CELL_H_PADDING = 17; // paddingHorizontal 8 * 2 + ~1px border
const TABLE_MIN_COL_WIDTH = 56;
const TABLE_MAX_COL_WIDTH = 160;

function computeColumnWidths(headers: string[], rows: string[][]): number[] {
  return headers.map((header, columnIndex) => {
    const longest = Math.max(
      header.length,
      ...rows.map((row) => (row[columnIndex] ?? '').length),
    );
    const estimated = Math.ceil(longest * TABLE_CHAR_WIDTH) + TABLE_CELL_H_PADDING;
    return Math.min(TABLE_MAX_COL_WIDTH, Math.max(TABLE_MIN_COL_WIDTH, estimated));
  });
}

function MarkdownTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  const columnWidths = useMemo(() => computeColumnWidths(headers, rows), [headers, rows]);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.table}>
        <View style={[styles.tableRow, styles.tableHeaderRow]}>
          {headers.map((header, index) => (
            <View key={index} style={[styles.tableCell, { width: columnWidths[index] }]}>
              <Text style={styles.tableHeaderText}>{header}</Text>
            </View>
          ))}
        </View>
        {rows.map((row, rowIndex) => (
          <View
            key={rowIndex}
            style={[styles.tableRow, rowIndex % 2 === 1 && styles.tableRowAlt]}
          >
            {row.map((cell, cellIndex) => (
              <View key={cellIndex} style={[styles.tableCell, { width: columnWidths[cellIndex] }]}>
                <Text style={styles.tableCellText} numberOfLines={2}>{cell}</Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function MessageContent({
  content,
  textStyle,
}: {
  content: string;
  textStyle: StyleProp<TextStyle>;
}) {
  const blocks = useMemo(() => parseMessageContent(content), [content]);
  return (
    <>
      {blocks.map((block, index) =>
        block.type === 'table' ? (
          <MarkdownTable key={index} headers={block.headers} rows={block.rows} />
        ) : (
          <Text key={index} style={textStyle}>
            {block.content}
          </Text>
        ),
      )}
    </>
  );
}

function formatScheduledDate(iso: string | null) {
  if (!iso) return null;
  const date = new Date(iso);
  return date.toLocaleDateString('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function RestaurantAssistantScreen() {
  const navigation = useNavigation<any>();
  const sessionId = useRef(createSessionId());
  const { selectedMarketId } = useCartStore();
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Xin chào! Mình có thể tìm sản phẩm, kiểm tra giá và hỗ trợ tạo bản nháp đơn hàng cho nhà hàng.',
    },
  ]);

  const canSend = input.trim().length > 0 && !sending;

  // Required by BE's preview_confirmation/confirm_order tools (see assistantApi.chat's
  // deliveryAddressId comment) — re-fetches on focus so an address added via the "Thêm địa chỉ"
  // shortcut shows up immediately on returning to chat.
  const [deliveryAddresses, setDeliveryAddresses] = useState<DeliveryAddressDto[] | null>(null);
  const selectedAddress = deliveryAddresses?.[0] ?? null;

  useFocusEffect(
    useCallback(() => {
      restaurantApi
        .getDeliveryAddresses()
        .then(setDeliveryAddresses)
        .catch(() => setDeliveryAddresses([]));
    }, []),
  );

  const sendMessage = async (
    rawMessage: string,
    options?: { confirmOrderId?: string; hideUserMessage?: boolean },
  ) => {
    const message = rawMessage.trim();
    if (!message || sending) return;

    setSending(true);
    setInput('');
    if (!options?.hideUserMessage) {
      setMessages((current) => [
        ...current,
        { id: `user-${Date.now()}`, role: 'user', content: message },
      ]);
    }

    try {
      const response = await assistantApi.chat({
        sessionId: sessionId.current,
        message,
        marketId: selectedMarketId,
        deliveryAddressId: selectedAddress?.id,
        confirmOrderId: options?.confirmOrderId,
      });
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: response.reply,
          pendingConfirmation: response.pendingConfirmation,
          draftOrderId: response.draftOrderId,
        },
      ]);
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      const errorCode = (error as { response?: { data?: { code?: string } } })?.response?.data?.code;
      const vietnameseMessage = resolveErrorMessage(status, errorCode);
      setMessages((current) => [
        ...current,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: vietnameseMessage,
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const latestDraftId = useMemo(
    () => [...messages].reverse().find((message) => message.draftOrderId)?.draftOrderId ?? null,
    [messages],
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <BrandLogo width={116} />
          <View style={styles.aiBadge}>
            <Ionicons name="sparkles" size={14} color={Colors.onPrimary} />
            <Text style={styles.aiBadgeText}>AI</Text>
          </View>
        </View>

        <View style={styles.hero}>
          <View style={styles.heroOrb}>
            <Ionicons name="sparkles" size={30} color={Colors.primary} />
          </View>
          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>Trợ lý mua hàng</Text>
            <Text style={styles.heroSubtitle}>Hỏi giá, tìm hàng và chuẩn bị đơn bằng ngôn ngữ tự nhiên.</Text>
          </View>
        </View>

        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View
              style={[
                styles.messageRow,
                item.role === 'user' && styles.messageRowUser,
              ]}
            >
              {item.role === 'assistant' ? (
                <View style={styles.assistantAvatar}>
                  <Ionicons name="sparkles" size={15} color={Colors.onPrimary} />
                </View>
              ) : null}
              <View
                style={[
                  styles.messageBubble,
                  item.role === 'user' ? styles.userBubble : styles.assistantBubble,
                ]}
              >
                <MessageContent
                  content={item.content}
                  textStyle={[
                    styles.messageText,
                    item.role === 'user' && styles.userMessageText,
                  ]}
                />
                {item.pendingConfirmation ? (
                  <OrderPreviewCard
                    previewJson={item.pendingConfirmation.previewJson}
                    sending={sending}
                    onConfirm={() => {
                      if (!selectedAddress) {
                        Alert.alert(
                          'Chưa có địa chỉ giao hàng',
                          'Vui lòng thêm địa chỉ giao hàng trước khi xác nhận đơn.',
                          [
                            // Pushed onto this same stack (registered alongside
                            // AssistantChat) rather than switching to the Profile
                            // tab, so the header back button returns to the chat.
                            {
                              text: 'Thêm địa chỉ',
                              onPress: () => navigation.navigate('DeliveryAddresses'),
                            },
                            { text: 'Để sau', style: 'cancel' },
                          ],
                        );
                        return;
                      }
                      void sendMessage('Tôi xác nhận đơn hàng này.', {
                        confirmOrderId: item.pendingConfirmation?.orderId,
                        hideUserMessage: false,
                      });
                    }}
                  />
                ) : null}
                {item.draftOrderId ? (
                  <Pressable
                    style={styles.draftButton}
                    onPress={() =>
                      navigation.navigate('RestaurantTracking', {
                        screen: 'OrderDetail',
                        params: { orderId: item.draftOrderId },
                      })
                    }
                  >
                    <Text style={styles.draftButtonText}>Mở bản nháp</Text>
                    <Ionicons name="arrow-forward" size={15} color={Colors.primaryText} />
                  </Pressable>
                ) : null}
              </View>
            </View>
          )}
          ListHeaderComponent={
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.promptList}
            >
              {QUICK_PROMPTS.map((prompt) => (
                <Pressable
                  key={prompt}
                  style={styles.promptChip}
                  disabled={sending}
                  onPress={() => void sendMessage(prompt)}
                >
                  <Ionicons name="sparkles-outline" size={14} color={Colors.primaryText} />
                  <Text style={styles.promptText}>{prompt}</Text>
                </Pressable>
              ))}
            </ScrollView>
          }
          ListFooterComponent={
            sending ? (
              <View style={styles.typingRow}>
                <ActivityIndicator size="small" color={Colors.primaryText} />
                <Text style={styles.typingText}>FreshFlow AI đang trả lời...</Text>
              </View>
            ) : latestDraftId ? (
              <Pressable
                style={styles.latestDraft}
                onPress={() =>
                  navigation.navigate('RestaurantTracking', {
                    screen: 'OrderDetail',
                    params: { orderId: latestDraftId },
                  })
                }
              >
                <Ionicons name="document-text-outline" size={17} color={Colors.primaryText} />
                <Text style={styles.latestDraftText}>Xem bản nháp đang làm việc</Text>
              </Pressable>
            ) : null
          }
        />

        <View style={styles.composer}>
          <Text style={styles.disclaimer}>AI luôn yêu cầu bạn xác nhận trước khi chốt đơn.</Text>
          <View style={styles.inputWrap}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Bạn cần mua gì hôm nay?"
              placeholderTextColor={Colors.textMuted}
              style={styles.input}
              multiline
              maxLength={2000}
            />
            <Pressable
              style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
              disabled={!canSend}
              onPress={() => void sendMessage(input)}
            >
              {sending ? (
                <ActivityIndicator size="small" color={Colors.onPrimary} />
              ) : (
                <Ionicons name="arrow-up" size={20} color={Colors.onPrimary} />
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function OrderPreviewCard({
  previewJson,
  sending,
  onConfirm,
}: {
  previewJson: string;
  sending: boolean;
  onConfirm: () => void;
}) {
  const preview = parsePreview(previewJson);

  return (
    <View style={styles.previewCard}>
      {/* Tóm tắt tổng tiền */}
      {preview ? (
        <>
          <View style={styles.previewRow}>
            <Ionicons name="receipt-outline" size={14} color={Colors.primaryText} />
            <Text style={styles.previewLabel}>Tổng đơn hàng</Text>
            <Text style={styles.previewValue}>{formatPrice(preview.totalAmount)}</Text>
          </View>

          {preview.resolvedScheduledFor ? (
            <View style={styles.previewRow}>
              <Ionicons name="time-outline" size={14} color={Colors.primaryText} />
              <Text style={styles.previewLabel}>Giao lúc</Text>
              <Text style={styles.previewValue}>
                {formatScheduledDate(preview.resolvedScheduledFor)}
              </Text>
            </View>
          ) : null}

          {/* Cảnh báo nếu có vấn đề */}
          {!preview.wouldSucceed && preview.issues.length > 0 ? (
            <View style={styles.previewWarningBox}>
              <Ionicons name="warning-outline" size={14} color={Colors.warning} />
              <Text style={styles.previewWarningText}>
                {describeApiCode(
                  preview.issues[0]?.code,
                  preview.issues[0]?.message,
                  'Có vấn đề cần kiểm tra trước khi xác nhận.',
                )}
              </Text>
            </View>
          ) : null}

          <View style={styles.previewDivider} />
        </>
      ) : null}

      <Pressable
        style={[
          styles.confirmButton,
          preview && !preview.wouldSucceed && styles.confirmButtonWarn,
        ]}
        disabled={sending}
        onPress={onConfirm}
      >
        <Ionicons name="shield-checkmark-outline" size={17} color={Colors.onPrimary} />
        <Text style={styles.confirmButtonText}>
          {preview && !preview.wouldSucceed ? 'Xác nhận (có cảnh báo)' : 'Xác nhận đơn'}
        </Text>
      </Pressable>
    </View>
  );
}


const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  header: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: Colors.primary,
  },
  aiBadgeText: { fontSize: 11, color: Colors.onPrimary, fontFamily: Fonts.bold },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    margin: 16,
    marginBottom: 4,
    padding: 16,
    borderRadius: 20,
    backgroundColor: Colors.deepTeal,
  },
  heroOrb: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: 'rgba(80,240,163,0.14)',
  },
  heroText: { flex: 1 },
  heroTitle: { fontSize: 17, color: Colors.white, fontFamily: Fonts.bold },
  heroSubtitle: { marginTop: 4, fontSize: 11, lineHeight: 17, color: Colors.surfaceContainerHigh },
  messageList: { padding: 16, paddingTop: 10, gap: 12 },
  promptList: { gap: 8, paddingBottom: 4 },
  promptChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 16,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  promptText: { fontSize: 11, color: Colors.primaryText, fontFamily: Fonts.medium },
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  messageRowUser: { justifyContent: 'flex-end' },
  assistantAvatar: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: Colors.primary,
  },
  messageBubble: { maxWidth: '82%', padding: 12, borderRadius: 17 },
  assistantBubble: {
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: 5,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  userBubble: { backgroundColor: Colors.deepTeal, borderBottomRightRadius: 5 },
  messageText: { fontSize: 13, lineHeight: 20, color: Colors.textPrimary },
  userMessageText: { color: Colors.white },
  table: {
    marginTop: 6,
    marginBottom: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  tableRow: { flexDirection: 'row' },
  tableHeaderRow: { backgroundColor: Colors.primaryLight },
  tableRowAlt: { backgroundColor: Colors.surfaceContainerLow },
  tableCell: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  tableHeaderText: { fontSize: 11, fontFamily: Fonts.bold, color: Colors.primaryText },
  tableCellText: { fontSize: 11, color: Colors.textPrimary },
  confirmButton: {
    marginTop: 11,
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 13,
    backgroundColor: Colors.primary,
  },
  confirmButtonWarn: {
    backgroundColor: Colors.warning,
  },
  previewCard: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 6,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  previewLabel: {
    flex: 1,
    fontSize: 11,
    color: Colors.textSecondary,
  },
  previewValue: {
    fontSize: 12,
    color: Colors.textPrimary,
    fontFamily: Fonts.semibold,
  },
  previewWarningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
    padding: 7,
    borderRadius: 8,
    backgroundColor: 'rgba(230,168,23,0.10)',
  },
  previewWarningText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 15,
    color: Colors.textPrimary,
  },
  previewDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 2,
  },
  confirmButtonText: { fontSize: 12, color: Colors.onPrimary, fontFamily: Fonts.bold },
  draftButton: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  draftButtonText: { fontSize: 11, color: Colors.primaryText, fontFamily: Fonts.semibold },
  typingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  typingText: { fontSize: 11, color: Colors.textMuted },
  latestDraft: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    padding: 10,
    borderRadius: 13,
    backgroundColor: Colors.primaryLight,
  },
  latestDraftText: { fontSize: 11, color: Colors.primaryText, fontFamily: Fonts.semibold },
  composer: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  inputWrap: {
    minHeight: 50,
    maxHeight: 116,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingLeft: 14,
    paddingRight: 5,
    paddingVertical: 5,
    borderRadius: 18,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  input: { flex: 1, minHeight: 38, maxHeight: 100, paddingVertical: 9, fontSize: 13, color: Colors.textPrimary },
  sendButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: Colors.primary,
  },
  sendButtonDisabled: { opacity: 0.42 },
  disclaimer: { marginBottom: 6, fontSize: 10, fontFamily: Fonts.medium, textAlign: 'center', color: Colors.textMuted },
});
