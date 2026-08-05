import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { Colors } from "../../../constants/colors";
import { useAuthStore } from "../../../store/authStore";
import { Button } from "../../../components/ui/Button";
import { Logo } from "../../../components/ui/Logo";
import { authApi, UnsupportedRoleError } from "../api/authApi";

// BE sends "Account locked until {ISO 8601 UTC}." (LoginCommandHandler.cs) —
// pull just the timestamp out and render it in Vietnamese instead of echoing
// the raw English/ISO string into the alert.
function formatLockedUntil(message: string): string | null {
  const match = message.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  if (!match) return null;
  const date = new Date(`${match[0]}Z`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function LoginScreen() {
  const navigation = useNavigation();
  const { signIn, sessionExpired, clearSessionExpired } = useAuthStore();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!identifier.trim() || !password) return;
    setIsLoading(true);
    try {
      const { user, accessToken, approvalStatus } = await authApi.login(
        identifier.trim(),
        password,
      );
      signIn(user, accessToken);
      if (user.role === "RESTAURANT" && approvalStatus === "pending") {
        Alert.alert(
          "Tài khoản đang chờ duyệt",
          "Hồ sơ nhà hàng của bạn đang chờ FreshFlow phê duyệt. Bạn có thể xem trước ứng dụng nhưng sẽ chưa đặt hàng được cho tới khi được duyệt.",
          [{ text: "Đã hiểu" }],
        );
      }
    } catch (err: any) {
      if (err instanceof UnsupportedRoleError) {
        Alert.alert("Không hỗ trợ trên ứng dụng", err.message, [{ text: "Đã hiểu" }]);
        return;
      }

      const code: string = err?.response?.data?.code ?? "";
      const rawMessage: string = err?.response?.data?.message ?? "";

      let title = "Đăng nhập thất bại";
      let body = "Đã có lỗi xảy ra. Vui lòng thử lại.";

      if (code === "INVALID_CREDENTIALS") {
        title = "Sai thông tin đăng nhập";
        body =
          "Email/số điện thoại hoặc mật khẩu không đúng. Vui lòng kiểm tra lại.";
      } else if (code === "ACCOUNT_LOCKED") {
        const lockedUntil = formatLockedUntil(rawMessage);
        title = "Tài khoản bị khóa";
        body = lockedUntil
          ? `Tài khoản tạm thời bị khóa do đăng nhập sai nhiều lần.\nVui lòng thử lại sau ${lockedUntil}.`
          : "Tài khoản tạm thời bị khóa do đăng nhập sai nhiều lần. Vui lòng thử lại sau.";
      } else if (code === "ACCOUNT_INACTIVE") {
        title = "Tài khoản bị vô hiệu hóa";
        body = "Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ hỗ trợ.";
      } else if (!err?.response) {
        title = "Không có kết nối mạng";
        body = "Vui lòng kiểm tra kết nối internet và thử lại.";
      }

      Alert.alert(title, body, [{ text: "Đã hiểu" }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ─── Brand Section ─────────────── */}
          <View style={styles.brandSection}>
            <View style={styles.brandDeco} />
            <Logo width={180} dark />
            <Text style={styles.brandSub}>Đăng nhập để tiếp tục</Text>
          </View>

          {/* ─── Session Expired Banner ──────── */}
          {sessionExpired && (
            <View style={styles.expiredBanner}>
              <Ionicons name="time-outline" size={18} color="#92400E" />
              <Text style={styles.expiredText}>
                Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.
              </Text>
              <Pressable onPress={clearSessionExpired} hitSlop={8}>
                <Ionicons name="close" size={18} color="#92400E" />
              </Pressable>
            </View>
          )}

          {/* ─── Form Card ─────────────────── */}
          <View style={styles.formCard}>
            {/* Email / SĐT */}
            <Text style={styles.label}>Email hoặc Số điện thoại</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="person-outline"
                size={18}
                color={Colors.textMuted}
              />
              <TextInput
                style={styles.input}
                value={identifier}
                onChangeText={setIdentifier}
                placeholder="email@example.com hoặc SĐT"
                placeholderTextColor={Colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Password */}
            <Text style={[styles.label, { marginTop: 16 }]}>Mật khẩu</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={Colors.textMuted}
              />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={Colors.textMuted}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={8}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={Colors.textMuted}
                />
              </Pressable>
            </View>

            {/* Forgot password */}
            <Pressable
              style={styles.forgotRow}
              onPress={() => navigation.navigate("ForgotPassword" as never)}
            >
              <Text style={styles.forgotText}>Quên mật khẩu?</Text>
            </Pressable>

            {/* Login button */}
            <Button
              title={isLoading ? "ĐANG ĐĂNG NHẬP..." : "ĐĂNG NHẬP"}
              variant="primary"
              size="lg"
              fullWidth
              onPress={handleLogin}
              disabled={!identifier.trim() || !password || isLoading}
              style={styles.loginButton}
            />

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>hoặc</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Register link */}
            <View style={styles.registerRow}>
              <Text style={styles.registerText}>Chưa có tài khoản? </Text>
              <Pressable
                onPress={() => navigation.navigate("Register" as never)}
              >
                <Text style={styles.registerLink}>Đăng ký ngay</Text>
              </Pressable>
            </View>
          </View>

          {/* Bottom spacer */}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default LoginScreen;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },

  // ─── Brand ───────────────────────────────
  brandSection: {
    backgroundColor: Colors.deepTeal,
    paddingTop: 48,
    paddingBottom: 48,
    alignItems: "center",
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: "hidden",
  },
  brandDeco: {
    position: "absolute",
    top: -60,
    right: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  brandSub: {
    marginTop: 14,
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.7)",
  },

  // ─── Form ────────────────────────────────
  formCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: 20,
    marginTop: -20,
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textSecondary,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    height: 50,
    backgroundColor: "#F1F5F9",
    borderRadius: 14,
    paddingHorizontal: 14,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.textPrimary,
    height: "100%",
    padding: 0,
  },
  forgotRow: {
    alignSelf: "flex-end",
    marginTop: 12,
  },
  forgotText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.secondary,
  },

  // ─── Button ──────────────────────────────
  loginButton: {
    marginTop: 20,
    borderRadius: 14,
  },

  // ─── Divider ─────────────────────────────
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 24,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    fontSize: 13,
    color: Colors.textMuted,
  },

  // ─── Register ────────────────────────────
  registerRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },
  registerText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  registerLink: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.secondary,
  },

  bottomSpacer: {
    height: 40,
  },

  // ─── Session Expired Banner ───────────────
  expiredBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: "#FEF3C7",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#FCD34D",
  },
  expiredText: {
    flex: 1,
    fontSize: 13,
    color: "#92400E",
    lineHeight: 18,
    fontWeight: "500",
  },
});
