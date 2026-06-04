import { useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Colors } from "../../../constants/colors";
import { useAuthStore } from "../../../store/authStore";

// ─── Configuration ─────────────────────────
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CONTAINER_PADDING = 20;
const GAP = 16;
const PRODUCT_CARD_WIDTH = (SCREEN_WIDTH - CONTAINER_PADDING * 2 - GAP) / 2;

// ─── Assets ────────────────────────────────
const IMAGES = {
  avatar:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuA1j0sl2_XxNRo9UV_2sE1VIJXj7hvh5VyS_ZOAENav4RlhZg1fuKgWvF-k88gJ65PRiD0CsNU7xRuJpgGeVAYS2xPwbz9r6dvESRu0e59SX76GLaYk5gCEG9Cz__WTSen0Ti-HV9G-lV-tLyidh4LN4YANog30q3Takv_lcHEeMLP3rIYSc02jLz8YJZMPPlc-35t39oAj9tC7SaYwSYJrcWuJFscim01qEjaMPkSAyc456XPJ9dnBo3KCbS1H8kGyE_WIH8znskon",
  hero: "https://lh3.googleusercontent.com/aida-public/AB6AXuAuxh--i7t6RopJF5JvNg2i6g91FbQxEDiOhgp8Kr6FuDFo4eWw_Wprn5PvG484b7jiJXtpwC_ObEsN-G1gSIgF_Zg-KPZBUizV--LSXB_jXC_lqeQIqDmNBGYmE9PQ4Kq93vgpWjSjLAlLhpBm7zCIr8u1Pu0IIZ2Lvx_onO8uGjBctbVnx14dW5cBrdpGbFh3pPFO0kqgbaF9i1wTYIwLO9RVEFsoFn--NB7VQ_4qQhxseqLvCIr4YfwqGBVGR1lgFopea4k8mZP6",
  hocMon:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuD9VcUush4POrDO1s0xblyUJbyQXSnMwZpiN6IDkaZDuHbQbGtTE2qBaVQIeCZoJNolSH7CQya8wX95eNuVU4VrVl2lMxmEl5HZxL30-KkeK4rWS5sdX7EXNu0TAjaJkQ0r-bpZzwsMjztPIhQE--LBI0mQmI8Vwz_fvBhdJ4ktUJ30AizjvVIzaBovjdLw4-6_7MFVfHGIOHmhr3vclIsqKBGapup7h7z0i7ZXVN5oJuq6o3K9t5fsSZ7ZiM24t6Ag83Zw_KgOvlb2",
  binhDien:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuBHDV92Mw0xmriVCQ98teZy_68mq2FMtzpI7VrBVeS5TczAeWLengPI9SWaX9KyBKMhDqA8eYLOuqDDbwz1I6Y-d9uEUT2Sw8uXPm5HMP5O364JZe5lH2o8O3pRlo8M9XpsBSKHxJzwxRCCaMFUCXpFD2tm55GjGNcWSqJoTUcqLO9Tr1I1gxFmzBwYGec_7wWyK60d4tfBR0bPFiJ3GXSk0Ox7PNVw9AIcsCxYrg2COJPf6nlJc9RywoY2AeH0iAuuvRokP-Z5JOT8",
  thuDuc:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuDBBJeu8GwORr6MXEpPwpmBLjkY_U4Vbj1I2JrohJqRXssSno30m9kG3aed-Zf9Oi3WzBh7jKSBu_eAzmENhk0jc5ATVkxXx9s1Yv4U6qAJqMRIWktDvgCJfkHkMY7tKSUCMIcn_ukvXqYbwDD07SVw4qa4_u6kgNvKGOzNGyqUHqgeMxWt9KcaKm0MpmnQSQvbQWC01nBc1SGt4RkEcBdbHiZ-xTnqLOgtNEzLsePNlvxa1cjR1R4sLDuwRNwwZLss74H4nJpfmCX6",
  product1:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuCpNmioWu3RcCo5qH-wjAd9iGXCHWxP8xD-_IY3TBIaBILs7Tpo8ac69BZe7onQ7dzKiW8OH8zUJ8bVyAoGBF7UuVE0mcs6yaONEIu05slSeJ3QnUHqnkmcYWWIUTP2Oj2Iw7a5z7dGljdAbeJu4Q5oXNRYeehEJZVvP5zezZY2qELYP_CokbqXnvH5gD9vNNOs-yl5FMR-_Ad2k7hWoega8o5vAbhkpsIzzZKqIVLzy9S47RFxuENj1284aVknkGS2LovdwtgCV1BA",
  product2:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuDEyhTV3epLiauByDIP9phKhM_fHuH9vAu2TmxestRUK5v0khf4az4AJS39duFaruGfXT05eeVPGY37VveU4ihPbAgcHVr65Gl0DtCUE6dHNRyKUR8Mx7jYbvR6V5sKawyzEC1ul0V3_Wy1bLrMy4P22_cF6nDDEyvGLlKcR4PkBO6-aAKm6WTeOLe2J0H2q6u0ASC_yGXgjx5RPJ1ChZYnNshdAdBefR8EMLchiEEsrlpM2U6NTzknyAme3tRUgVoCS8rH1A-gAgJk",
  product3:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuCsMvZrC0XtIwK4EvLEtr-jTFqJE51yft4KGo4zgUQ1-xyOWlVqV54YMc9kYMl44U-W40FzqVlNkz4f5mLAc1u1rWIty0gfRnCQRa9Jb-s9fFuJo9lxcn0RZG6kpISkPff3NPrRPxYMIRN_HIJSbeYUP4N3RHBRoB9f4Hl1PS-WVRpePagJeJabcT8QIAsuezvqV0ToPfdKuwM6nug1JJNDSx0VRN0x_Z2FS6w-hvc6ntDgLhrQ6m3yDKM0sDou6a9aeZsXvPvfHmBv",
  product4:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuA099yREG6DarbVMsiUA-zwfWaNtyYa_bcQTDVsshzOw399SfKW7IzohgC_HZ1N7OX0AdJnIDAfPVP4D6dSMQrGRAOO3XAQ4o8tNX-fTxx2uMmGM-3rsC23nyk5JUY8HY6GT5xrK8_9wT4VGhGTiDq2i1U4sMy-Aqfmg4Ym8SbyyZnK2PlGlNY-Eew-UEIc8cmNqzGNWOeBgs-cUGn0OTs_2HwyYAs2DOJptrKcHd0kT7I5Z4FI7TVSGpa2gHdcNd_1Bk3TzYFLPOny",
  product5:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuBrpVzfZqA5W7DNl50MDESNVkx-Dt5vftNZHZU06wWYb6YfxmcIWuT2IBadsolIowInuQCO3XYuxu2goRJUjMRLz4FpuyZSco1wcXgXXWplZ-hP-lXQWC6hYY45NlafyUzYQKndvDF1Mwyxv13Ea-bJSQNy-Nl8v_aIrWfGrbgwfk9_2X20UEbhmQDwaccvAUfhy2zyk2jzv_PATXvj90B_micnWG0d39UOrwC0GP6OfKYDy5jMYAd6PHT7p_bJpmDu3qxiLfN8909C",
  deliveryBot:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuCMEEoJwbj1fp-1Lo-PxSSypWZEHCEkdtgJ8eXmIVsKspjNtJXpnHV68l34zGE5XR5MdgvAmHvzZB4upLoU2g41umYoecTI3YLhhbzl5uyfps42OH-6EGoCfMmtZlTjdWGP7lOf9CSKL1YjVOdHtgT01_hrfyFGP6vnpzGMyELM4bZP2cNPLh3gGbeP9SyBb_RJr3i-945nRcDHNSj9zvMPto7cyAhABu5VT0A_IHFC26FUHmaUi5vJcMPEPK_JpOtu3ik6q7AjvZxL",
};

// ─── Data ──────────────────────────────────
const MARKETS = [
  {
    id: "hoc-mon",
    name: "Hóc Môn",
    subtitle: "Vựa Rau Lớn Nhất",
    trend: "-5% hôm nay",
    image: IMAGES.hocMon,
    type: "down",
  },
  {
    id: "binh-dien",
    name: "Bình Điền",
    subtitle: "Trung Tâm Hải Sản",
    trend: "+2% biến động",
    image: IMAGES.binhDien,
    type: "up",
  },
  {
    id: "thu-duc",
    name: "Thủ Đức",
    subtitle: "Đầu Mối Trái Cây",
    trend: "-3% giá tuần",
    image: IMAGES.thuDuc,
    type: "down",
  },
];

const PRODUCTS = [
  {
    id: "p1",
    name: "Cà chua VietGAP Hóc Môn",
    market: "Hóc Môn",
    price: 25000,
    oldPrice: 28000,
    trend: "2% vs hqua",
    badge: "Bán chạy",
    badgeType: "secondary",
    trendType: "down",
    image: IMAGES.product1,
  },
  {
    id: "p2",
    name: "Khoai tây Đà Lạt Loại 1",
    market: "Đà Lạt",
    price: 18500,
    trend: "5% vs hqua",
    badge: "Grade A",
    badgeType: "tertiary",
    trendType: "up",
    image: IMAGES.product2,
  },
  {
    id: "p3",
    name: "Hành tím Vĩnh Châu sạch",
    market: "Thủ Đức",
    price: 32000,
    trend: "Ổn định",
    trendType: "flat",
    image: IMAGES.product3,
  },
  {
    id: "p4",
    name: "Bơ sáp Đắk Lắk Size L",
    market: "Đà Lạt",
    price: 45000,
    trend: "-1% vs hqua",
    badge: "Sắp hết",
    badgeType: "error",
    trendType: "down",
    image: IMAGES.product4,
  },
  {
    id: "p5",
    name: "Tỏi Phan Rang sạch",
    market: "Bình Điền",
    price: 0,
    outOfStock: true,
    badge: "Hết hàng",
    badgeType: "muted",
    image: IMAGES.product5,
  },
];

function formatPrice(p: number) {
  return p.toLocaleString("vi-VN") + "đ";
}

// ─── Screen ────────────────────────────────
export function OrderListScreen() {
  const { user, signOut } = useAuthStore();
  const [showCart, setShowCart] = useState(false);

  const handleLogout = () => {
    Alert.alert("Đăng xuất", "Bạn muốn đăng xuất khỏi FreshFlow?", [
      { text: "Huỷ", style: "cancel" },
      { text: "Đăng xuất", style: "destructive", onPress: signOut },
    ]);
  };

  const renderProduct = ({ item }: { item: (typeof PRODUCTS)[0] }) => (
    <View
      style={[
        styles.productCard,
        item.outOfStock && styles.productCardDisabled,
      ]}
    >
      {/* Image Area */}
      <View style={styles.productImageArea}>
        <Image source={{ uri: item.image }} style={styles.productImg} />
        {item.badge && (
          <View
            style={[
              styles.pBadge,
              item.badgeType === "secondary" && styles.pBadgeSecondary,
              item.badgeType === "tertiary" && styles.pBadgeTertiary,
              item.badgeType === "error" && styles.pBadgeError,
              item.badgeType === "muted" && styles.pBadgeMuted,
            ]}
          >
            <Text style={styles.pBadgeText}>{item.badge}</Text>
          </View>
        )}
        <Pressable style={styles.heartBtn}>
          <Ionicons
            name="heart-outline"
            size={16}
            color={Colors.onSurfaceVariant}
          />
        </Pressable>
      </View>

      {/* Info Area */}
      <View style={styles.productInfo}>
        <Text style={styles.productMarketText}>{item.market}</Text>
        <Text style={styles.productNameText} numberOfLines={2}>
          {item.name}
        </Text>

        <View style={styles.trendRow}>
          {item.trendType === "down" && (
            <MaterialIcons
              name="arrow-downward"
              size={14}
              color={Colors.primary}
            />
          )}
          {item.trendType === "up" && (
            <MaterialIcons name="arrow-upward" size={14} color={Colors.error} />
          )}
          {item.trendType === "flat" && (
            <MaterialIcons
              name="horizontal-rule"
              size={14}
              color={Colors.onSurfaceVariant}
            />
          )}
          <Text
            style={[
              styles.trendLabel,
              item.trendType === "down" && styles.trendDownColor,
              item.trendType === "up" && styles.trendUpColor,
              item.trendType === "flat" && styles.trendFlatColor,
            ]}
          >
            {item.trend || "Ổn định"}
          </Text>
        </View>

        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.cardPrice}>
              {item.outOfStock ? "--" : formatPrice(item.price)}
            </Text>
            {!item.outOfStock && <Text style={styles.cardUnit}>/kg</Text>}
          </View>
          <Pressable
            style={[
              styles.addToCartBtn,
              item.outOfStock && styles.addToCartDisabled,
            ]}
            disabled={item.outOfStock}
          >
            <MaterialIcons
              name={item.outOfStock ? "block" : "add-shopping-cart"}
              size={18}
              color={item.outOfStock ? Colors.onSurfaceVariant : "#FFF"}
            />
          </Pressable>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* ─── FIXED HEADER ──────────────────── */}
      <View style={styles.appHeader}>
        <View style={styles.headerTop}>
          <View style={styles.headerLogo}>
            <MaterialIcons
              name="agriculture"
              size={28}
              color={Colors.primary}
            />
            <Text style={styles.headerLogoText}>FreshFlow</Text>
          </View>
          <View style={styles.headerIcons}>
            <Pressable style={styles.hIconButton}>
              <MaterialIcons
                name="notifications"
                size={24}
                color={Colors.onSurfaceVariant}
              />
              <View style={styles.hBadgeDot} />
            </Pressable>
            <Pressable onPress={handleLogout}>
              <Image source={{ uri: IMAGES.avatar }} style={styles.hAvatar} />
            </Pressable>
          </View>
        </View>
      </View>

      <FlatList
        data={PRODUCTS}
        renderItem={renderProduct}
        keyExtractor={(p) => p.id}
        numColumns={2}
        columnWrapperStyle={styles.productRow}
        contentContainerStyle={styles.mainScroll}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* ─── HERO ALERT ────────────────────── */}
            <View style={styles.heroBox}>
              <Image source={{ uri: IMAGES.hero }} style={styles.heroImg} />
              <View style={styles.heroOverlay} />
              <View style={styles.heroContent}>
                <View style={styles.heroAlertTag}>
                  <Text style={styles.heroAlertTagText}>Cảnh báo giá giảm</Text>
                </View>
                <Text style={styles.heroTitle}>
                  Ưu đãi đặt hàng sớm - Giảm 15% tất cả mặt hàng Rau Củ
                </Text>
                <Text style={styles.heroSub}>
                  Đặt hàng trước 22:00 hôm nay để nhận ưu đãi tốt nhất từ Chợ
                  Đầu Mối Hóc Môn.
                </Text>
                <Pressable style={styles.heroButton}>
                  <Text style={styles.heroButtonText}>Đặt hàng ngay</Text>
                </Pressable>
              </View>
            </View>

            {/* ─── BENTO MARKETS ─────────────────── */}
            <View style={styles.secTitleRow}>
              <Text style={styles.secTitle}>Thị trường Đầu Mối</Text>
              <Text style={styles.secAction}>Xem bản đồ giá</Text>
            </View>
            <View style={styles.marketBento}>
              {MARKETS.map((m, i) => (
                <View
                  key={m.id}
                  style={[styles.marketCard, i === 0 && styles.marketCardWide]}
                >
                  <Image source={{ uri: m.image }} style={styles.marketImg} />
                  <View style={styles.marketMask} />
                  <View style={styles.marketContent}>
                    <Text style={styles.marketSubText}>{m.subtitle}</Text>
                    <Text style={styles.marketTitleText}>{m.name}</Text>
                    <View style={styles.marketTrendRow}>
                      <MaterialIcons
                        name={
                          m.type === "down" ? "trending-down" : "trending-up"
                        }
                        size={16}
                        color={m.type === "down" ? "#4ADE80" : "#FBBF24"}
                      />
                      <Text
                        style={[
                          styles.marketTrendTxt,
                          { color: m.type === "down" ? "#4ADE80" : "#FBBF24" },
                        ]}
                      >
                        {m.trend}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>

            {/* ─── PRODUCT LIST HEADER ────────────── */}
            <View style={styles.secTitleRow}>
              <Text style={styles.secTitle}>Hàng Sáng Nay</Text>
              <Text style={styles.secCount}>24 Items</Text>
            </View>
          </>
        }
        ListFooterComponent={
          <>
            {/* ─── STATS SECTION ─────────────────── */}
            <View style={styles.statsLayout}>
              {[
                {
                  icon: "verified" as const,
                  v: "100%",
                  l: "Kiểm duyệt nguồn gốc",
                },
                {
                  icon: "support-agent" as const,
                  v: "24/7",
                  l: "Hỗ trợ thu mua",
                },
                {
                  icon: "payments" as const,
                  v: "Tiết kiệm",
                  l: "Chiết khấu tới 15%",
                },
                {
                  icon: "speed" as const,
                  v: "Thần tốc",
                  l: "Giao hàng hỏa tốc",
                },
              ].map((s, i) => (
                <View key={i} style={styles.statCell}>
                  <MaterialIcons
                    name={s.icon as any}
                    size={32}
                    color={Colors.primary}
                  />
                  <Text style={styles.statVal}>{s.v}</Text>
                  <Text style={styles.statLbl}>{s.l}</Text>
                </View>
              ))}
            </View>

            {/* ─── FOOTER ──────────────────────────── */}
            <View style={styles.footerSection}>
              {/* Brand & Desc */}
              <View style={styles.footerBrand}>
                <MaterialIcons name="agriculture" size={28} color={Colors.primary} />
                <Text style={styles.footerBrandText}>FreshFlow</Text>
              </View>
              <Text style={styles.footerDesc}>
                Nền tảng thu mua thực phẩm B2B thông minh. Kết nối nhà hàng với các chợ đầu mối lớn nhất TP.HCM.
              </Text>

              {/* Contact info */}
              <View style={styles.footerInfoSection}>
                <View style={styles.footerInfoRow}>
                  <MaterialIcons name="phone" size={16} color={Colors.primary} />
                  <Text style={styles.footerInfoText}>1900 1234 56</Text>
                </View>
                <View style={styles.footerInfoRow}>
                  <MaterialIcons name="email" size={16} color={Colors.primary} />
                  <Text style={styles.footerInfoText}>info@freshflow.vn</Text>
                </View>
                <View style={styles.footerInfoRow}>
                  <MaterialIcons name="location-on" size={16} color={Colors.primary} />
                  <Text style={styles.footerInfoText}>123 Nguyễn Huệ, Quận 1, TP.HCM</Text>
                </View>
                <View style={styles.footerInfoRow}>
                  <MaterialIcons name="schedule" size={16} color={Colors.primary} />
                  <Text style={styles.footerInfoText}>06:00 - 20:00 • T2 - CN</Text>
                </View>
              </View>

              {/* Divider */}
              <View style={styles.footerDivider} />

              {/* Social + Copy */}
              <View style={styles.footerSocialRow}>
                <Ionicons name="logo-facebook" size={22} color={Colors.outline} />
                <Ionicons name="globe-outline" size={22} color={Colors.outline} />
                <Ionicons name="call-outline" size={22} color={Colors.outline} />
              </View>
              <Text style={styles.footerCopyText}>© 2024 FreshFlow Supply Chain Dynamics.</Text>
            </View>
          </>
        }
      />

      {/* ─── FLOATING CART FAB ─────────────── */}
      <Pressable style={styles.cartFab} onPress={() => setShowCart(true)}>
        <MaterialIcons name="shopping-cart" size={24} color="#FFF" />
        <View style={styles.cartFabBadge}>
          <Text style={styles.cartFabBadgeText}>3</Text>
        </View>
      </Pressable>

      {/* ─── CART FULL SCREEN MODAL ────────── */}
      <Modal
        visible={showCart}
        animationType="slide"
        onRequestClose={() => setShowCart(false)}
      >
        <SafeAreaView style={styles.cartScreen} edges={['top']}>
          {/* Header */}
          <View style={styles.cartScreenHeader}>
            <Pressable onPress={() => setShowCart(false)} style={styles.cartScreenClose}>
              <MaterialIcons name="arrow-back" size={24} color={Colors.onSurface} />
            </Pressable>
            <Text style={styles.cartScreenTitle}>Giỏ hàng</Text>
            <Text style={styles.cartScreenClear}>Xoá tất cả</Text>
          </View>

          {/* Body */}
          <FlatList
            data={[
              { id: '1', name: 'Cà chua VietGAP Hóc Môn', market: 'Hóc Môn', unit: 'Kg', price: 25000, qty: 2, image: IMAGES.product1 },
              { id: '2', name: 'Khoai tây Đà Lạt Loại 1', market: 'Đà Lạt', unit: 'Kg', price: 18500, qty: 1, image: IMAGES.product2 },
              { id: '3', name: 'Nấm đùi gà xuất khẩu', market: 'Hóc Môn', unit: 'Kg', price: 65000, qty: 1, image: IMAGES.product3 },
            ]}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.cartScreenList}
            renderItem={({ item }) => (
              <View style={styles.cartScreenItem}>
                <Image source={{ uri: item.image }} style={styles.cartScreenItemImg} />
                <View style={styles.cartScreenItemInfo}>
                  <Text style={styles.cartScreenItemName}>{item.name}</Text>
                  <Text style={styles.cartScreenItemMarket}>{item.market} • {item.unit}</Text>
                  <Text style={styles.cartScreenItemPrice}>
                    {(item.price * item.qty).toLocaleString('vi-VN')}đ
                  </Text>
                </View>
                <View style={styles.cartScreenItemQty}>
                  <Pressable style={styles.cartScreenQtyBtn}>
                    <MaterialIcons name="remove" size={16} color={Colors.primary} />
                  </Pressable>
                  <Text style={styles.cartScreenQtyText}>{item.qty}</Text>
                  <Pressable style={styles.cartScreenQtyBtn}>
                    <MaterialIcons name="add" size={16} color={Colors.primary} />
                  </Pressable>
                </View>
              </View>
            )}
            ListHeaderComponent={
              <View style={styles.cartScreenVoucherSection}>
                <View style={styles.cartScreenVoucherRow}>
                  <MaterialIcons name="discount" size={18} color={Colors.outline} />
                  <TextInput
                    style={styles.cartScreenVoucherInput}
                    placeholder="Nhập mã giảm giá"
                    placeholderTextColor={Colors.outline}
                  />
                  <Pressable style={styles.cartScreenVoucherBtn}>
                    <Text style={styles.cartScreenVoucherBtnText}>Áp dụng</Text>
                  </Pressable>
                </View>
              </View>
            }
            ListFooterComponent={
              <View style={styles.cartScreenSummary}>
                <View style={styles.cartScreenSummaryRow}>
                  <Text style={styles.cartScreenSummaryLabel}>Tạm tính</Text>
                  <Text style={styles.cartScreenSummaryValue}>123.500đ</Text>
                </View>
                <View style={styles.cartScreenSummaryRow}>
                  <Text style={styles.cartScreenSummaryLabel}>Phí vận chuyển</Text>
                  <Text style={styles.cartScreenSummaryValue}>15.000đ</Text>
                </View>
                <View style={styles.cartScreenSummaryRow}>
                  <Text style={styles.cartScreenSummaryLabel}>Giảm giá</Text>
                  <Text style={[styles.cartScreenSummaryValue, { color: Colors.error }]}>–5.000đ</Text>
                </View>
                <View style={styles.cartScreenSummaryDivider} />
                <View style={styles.cartScreenSummaryRow}>
                  <Text style={styles.cartScreenSummaryTotal}>Tổng cộng</Text>
                  <Text style={styles.cartScreenSummaryTotalValue}>133.500đ</Text>
                </View>
              </View>
            }
          />

          {/* Footer Bar */}
          <View style={styles.cartScreenCheckoutBar}>
            <View>
              <Text style={styles.cartScreenCheckoutLabel}>Tạm tính</Text>
              <Text style={styles.cartScreenCheckoutTotal}>133.500đ</Text>
            </View>
            <Pressable style={styles.cartScreenCheckoutBtn}>
              <Text style={styles.cartScreenCheckoutBtnText}>Tiến hành thanh toán</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

export default OrderListScreen;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  mainScroll: { paddingBottom: 160 },

  // ─── Header ────────────────────────────────
  appHeader: {
    backgroundColor: Colors.surface,
    paddingHorizontal: CONTAINER_PADDING,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    height: 56,
  },
  headerLogo: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerLogoText: {
    fontSize: 24,
    fontFamily: "Inter-Bold",
    color: Colors.primary,
    letterSpacing: -0.5,
  },
  headerIcons: { flexDirection: "row", alignItems: "center", gap: 16 },
  hIconButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
  },
  hBadgeDot: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.error,
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  hAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },

  // ─── Hero ──────────────────────────────────
  heroBox: {
    marginHorizontal: CONTAINER_PADDING,
    minHeight: 230,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: Colors.secondaryContainer,
  },
  heroImg: { ...StyleSheet.absoluteFillObject },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,107,44,0.7)",
  },
  heroContent: {
    flex: 1,
    paddingVertical: 28,
    paddingHorizontal: CONTAINER_PADDING,
    justifyContent: "center",
  },
  heroAlertTag: {
    backgroundColor: Colors.primary,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 10,
  },
  heroAlertTagText: {
    color: "#FFF",
    fontSize: 10,
    fontFamily: "Inter-Bold",
    textTransform: "uppercase",
  },
  heroTitle: {
    fontSize: 18,
    fontFamily: "Inter-Bold",
    color: "#FFF",
    lineHeight: 24,
  },
  heroSub: {
    fontSize: 12,
    fontFamily: "Inter-Regular",
    color: "rgba(255,255,255,0.85)",
    marginTop: 6,
    lineHeight: 18,
  },
  heroButton: {
    backgroundColor: Colors.primary,
    alignSelf: "flex-start",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 14,
  },
  heroButtonText: { color: "#FFF", fontFamily: "Inter-Bold", fontSize: 13 },

  // ─── Market ────────────────────────────────
  secTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: CONTAINER_PADDING,
    marginTop: 32,
    marginBottom: 16,
  },
  secTitle: { fontSize: 24, fontFamily: "Inter-Bold", color: Colors.onSurface },
  secAction: {
    color: Colors.primary,
    fontFamily: "Inter-SemiBold",
    fontSize: 14,
  },
  secCount: {
    color: Colors.onSurfaceVariant,
    fontSize: 14,
    fontFamily: "Inter-Medium",
  },
  marketBento: {
    paddingHorizontal: CONTAINER_PADDING,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GAP,
  },
  marketCard: {
    height: 200,
    borderRadius: 20,
    overflow: "hidden",
    width: (SCREEN_WIDTH - CONTAINER_PADDING * 2 - GAP) / 2,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  marketCardWide: { width: SCREEN_WIDTH - CONTAINER_PADDING * 2 },
  marketImg: { ...StyleSheet.absoluteFillObject },
  marketMask: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  marketContent: { flex: 1, padding: 20, justifyContent: "flex-end" },
  marketSubText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    fontFamily: "Inter-Medium",
    textTransform: "uppercase",
  },
  marketTitleText: {
    color: "#FFF",
    fontSize: 24,
    fontFamily: "Inter-Bold",
    marginTop: 4,
  },
  marketTrendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  marketTrendTxt: { fontSize: 14, fontFamily: "Inter-Bold" },

  // ─── Product Card ──────────────────────────
  productRow: {
    paddingHorizontal: CONTAINER_PADDING,
    gap: GAP,
    marginBottom: GAP,
  },
  productCard: {
    width: PRODUCT_CARD_WIDTH,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  productCardDisabled: { opacity: 0.6 },
  productImageArea: {
    width: "100%",
    height: 140,
    backgroundColor: Colors.surfaceContainerLow,
    overflow: "hidden",
  },
  productImg: { width: "100%", height: "100%", resizeMode: "cover" },
  productInfo: { padding: 16, flexGrow: 1 },
  productMarketText: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.outline,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  productNameText: {
    fontSize: 14,
    fontFamily: "Inter-SemiBold",
    color: Colors.onSurface,
    marginTop: 4,
    height: 40,
    lineHeight: 18,
  },
  cardName: {
    fontSize: 14,
    fontFamily: "Inter-SemiBold",
    color: Colors.onSurface,
    lineHeight: 20,
    marginBottom: 4,
  },
  trendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 12,
    marginTop: 4,
  },
  trendLabel: { fontSize: 12, fontFamily: "Inter-Bold", color: Colors.primary },
  trendDownColor: { color: "#16A34A" },
  trendUpColor: { color: Colors.error },
  trendFlatColor: { color: Colors.onSurfaceVariant },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardPrice: {
    fontSize: 18,
    fontFamily: "Inter-Bold",
    color: Colors.onSurface,
  },
  cardUnit: {
    fontSize: 12,
    fontFamily: "Inter-Medium",
    color: Colors.onSurfaceVariant,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  addBtnDisabled: { backgroundColor: Colors.surfaceVariant, elevation: 0 },
  pBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  pBadgePrimary: { backgroundColor: Colors.primary },
  pBadgeSecondary: { backgroundColor: Colors.secondaryContainer },
  pBadgeTertiary: { backgroundColor: Colors.tertiaryContainer },
  pBadgeError: { backgroundColor: Colors.error },
  pBadgeMuted: { backgroundColor: Colors.surfaceVariant },
  pBadgeText: { fontSize: 10, fontFamily: "Inter-Bold", color: "#FFF" },
  heartBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.8)",
    alignItems: "center",
    justifyContent: "center",
  },
  addToCartBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  addToCartDisabled: { backgroundColor: Colors.surfaceVariant },

  // ─── Promo ─────────────────────────────────
  promoBox: {
    margin: CONTAINER_PADDING,
    backgroundColor: Colors.primary,
    borderRadius: 24,
    padding: 32,
    flexDirection: "row",
    overflow: "hidden",
  },
  promoText: { flex: 1, zIndex: 10 },
  promoTitle: {
    color: "#FFF",
    fontSize: 24,
    fontFamily: "Inter-Bold",
    lineHeight: 32,
  },
  promoSub: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 16,
    fontFamily: "Inter-Regular",
    marginTop: 12,
    lineHeight: 24,
  },
  promoActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginTop: 24,
  },
  promoActionBtn: {
    backgroundColor: "#FFF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  promoActionText: {
    color: Colors.primary,
    fontFamily: "Inter-Bold",
    fontSize: 15,
  },
  promoTime: { flexDirection: "row", alignItems: "center", gap: 8 },
  promoTimeText: { color: "#FFF", fontFamily: "Inter-SemiBold", fontSize: 14 },
  promoImgArea: {
    width: 140,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  promoBgIcon: { opacity: 0.2, position: "absolute" },
  promoImg: { width: 140, height: 140, resizeMode: "contain" },

  // ─── Stats ─────────────────────────────────
  statsLayout: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: CONTAINER_PADDING,
    paddingVertical: 40,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  statCell: { width: "50%", alignItems: "center", paddingVertical: 24 },
  statVal: {
    fontSize: 24,
    fontFamily: "Inter-Bold",
    color: Colors.onSurface,
    marginTop: 12,
  },
  statLbl: {
    fontSize: 14,
    fontFamily: "Inter-Medium",
    color: Colors.outline,
    textAlign: "center",
    marginTop: 4,
  },

  // ─── Footer ────────────────────────────────
  footerSection: {
    paddingHorizontal: CONTAINER_PADDING,
    paddingVertical: 36,
    backgroundColor: Colors.surfaceContainerLow,
    marginTop: 8,
  },
  footerBrand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  footerBrandText: {
    fontSize: 22,
    fontFamily: "Inter-Bold",
    color: Colors.primary,
  },
  footerDesc: {
    fontSize: 13,
    fontFamily: "Inter-Regular",
    color: Colors.outline,
    lineHeight: 20,
    marginBottom: 20,
  },
  footerInfoSection: {
    gap: 12,
  },
  footerInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  footerInfoText: {
    fontSize: 13,
    fontFamily: "Inter-Regular",
    color: Colors.onSurfaceVariant,
  },
  footerDivider: {
    height: 1,
    backgroundColor: Colors.outlineVariant,
    marginVertical: 24,
  },
  footerSocialRow: {
    flexDirection: "row",
    gap: 24,
    justifyContent: "center",
    marginBottom: 16,
  },
  footerCopyText: {
    textAlign: "center",
    fontSize: 11,
    fontFamily: "Inter-Regular",
    color: Colors.outline,
  },

  // ─── Floating Cart FAB ────────────────────
  cartFab: {
    position: "absolute",
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowColor: Colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  cartFabBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.error,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    borderWidth: 2.5,
    borderColor: Colors.background,
  },
  cartFabBadgeText: {
    color: "#FFF",
    fontSize: 11,
    fontFamily: "Inter-Bold",
  },

  // ─── Cart Full Screen ───────────────────
  cartScreen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  cartScreenHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
  },
  cartScreenClose: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: Colors.surfaceContainerHigh,
  },
  cartScreenTitle: {
    fontSize: 18,
    fontFamily: "Inter-Bold",
    color: Colors.onSurface,
  },
  cartScreenClear: {
    fontSize: 14,
    fontFamily: "Inter-Medium",
    color: Colors.error,
  },
  cartScreenList: {
    paddingBottom: 180,
  },
  cartScreenItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    gap: 12,
  },
  cartScreenItemImg: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: Colors.surfaceContainerHigh,
  },
  cartScreenItemInfo: {
    flex: 1,
    gap: 2,
  },
  cartScreenItemName: {
    fontSize: 14,
    fontFamily: "Inter-SemiBold",
    color: Colors.onSurface,
  },
  cartScreenItemMarket: {
    fontSize: 12,
    fontFamily: "Inter-Regular",
    color: Colors.outline,
  },
  cartScreenItemPrice: {
    fontSize: 15,
    fontFamily: "Inter-Bold",
    color: Colors.onSurface,
    marginTop: 4,
  },
  cartScreenItemQty: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cartScreenQtyBtn: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  cartScreenQtyText: {
    fontSize: 15,
    fontFamily: "Inter-Bold",
    color: Colors.onSurface,
    minWidth: 24,
    textAlign: "center",
  },
  cartScreenVoucherSection: {
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  cartScreenVoucherRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cartScreenVoucherInput: {
    flex: 1,
    height: 40,
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    fontFamily: "Inter-Regular",
    color: Colors.onSurface,
  },
  cartScreenVoucherBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  cartScreenVoucherBtnText: {
    color: "#FFF",
    fontFamily: "Inter-Bold",
    fontSize: 13,
  },
  cartScreenSummary: {
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    gap: 12,
  },
  cartScreenSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cartScreenSummaryLabel: {
    fontSize: 14,
    fontFamily: "Inter-Regular",
    color: Colors.outline,
  },
  cartScreenSummaryValue: {
    fontSize: 14,
    fontFamily: "Inter-SemiBold",
    color: Colors.onSurface,
  },
  cartScreenSummaryDivider: {
    height: 1,
    backgroundColor: Colors.outlineVariant,
    marginVertical: 4,
  },
  cartScreenSummaryTotal: {
    fontSize: 16,
    fontFamily: "Inter-Bold",
    color: Colors.onSurface,
  },
  cartScreenSummaryTotalValue: {
    fontSize: 18,
    fontFamily: "Inter-Bold",
    color: Colors.primary,
  },
  cartScreenCheckoutBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: Colors.outlineVariant,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cartScreenCheckoutLabel: {
    fontSize: 12,
    fontFamily: "Inter-Medium",
    color: Colors.outline,
  },
  cartScreenCheckoutTotal: {
    fontSize: 20,
    fontFamily: "Inter-Bold",
    color: Colors.onSurface,
  },
  cartScreenCheckoutBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
  },
  cartScreenCheckoutBtnText: {
    color: "#FFF",
    fontFamily: "Inter-Bold",
    fontSize: 15,
  },
  // ─── End Cart Screen ─────────────────
});
