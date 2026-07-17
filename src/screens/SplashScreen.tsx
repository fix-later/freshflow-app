import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../constants/colors';
import { LogoMark } from '../components/ui/LogoMark';

export function SplashScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const dot1Anim = useRef(new Animated.Value(0)).current;
  const dot2Anim = useRef(new Animated.Value(0)).current;
  const dot3Anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in logo
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // Loading dots animation
    const dots = [dot1Anim, dot2Anim, dot3Anim];
    const animateDots = () => {
      const animations = dots.map((dot, i) =>
        Animated.sequence([
          Animated.delay(i * 200),
          Animated.loop(
            Animated.sequence([
              Animated.timing(dot, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
              }),
              Animated.timing(dot, {
                toValue: 0,
                duration: 400,
                useNativeDriver: true,
              }),
              Animated.delay(600),
            ]),
            { iterations: -1 },
          ),
        ]),
      );
      Animated.parallel(animations).start();
    };
    animateDots();
  }, [fadeAnim, slideAnim, dot1Anim, dot2Anim, dot3Anim]);

  return (
    <View style={styles.container}>
      {/* Decorative circles */}
      <View style={styles.decoCircle1} />
      <View style={styles.decoCircle2} />

      {/* Logo area */}
      <Animated.View
        style={[
          styles.logoWrapper,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <LogoMark size={72} dark />
        <Text style={styles.logoText}>FreshFlow</Text>
        <Text style={styles.tagline}>Nền tảng thu mua thực phẩm thông minh</Text>
      </Animated.View>

      {/* Loading dots */}
      <View style={styles.loadingContainer}>
        <Animated.View style={[styles.dot, { opacity: dot1Anim }]} />
        <Animated.View style={[styles.dot, { opacity: dot2Anim }]} />
        <Animated.View style={[styles.dot, { opacity: dot3Anim }]} />
      </View>

      {/* Version */}
      <Text style={styles.version}>v1.0.0</Text>
    </View>
  );
}

export default SplashScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.deepTeal,
  },
  decoCircle1: {
    position: 'absolute',
    top: -80,
    right: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  decoCircle2: {
    position: 'absolute',
    bottom: -100,
    left: -80,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  logoWrapper: {
    alignItems: 'center',
  },
  logoText: {
    marginTop: 20,
    fontSize: 42,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 10,
    letterSpacing: 0.3,
  },
  loadingContainer: {
    position: 'absolute',
    bottom: 80,
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.accent,
  },
  version: {
    position: 'absolute',
    bottom: 40,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.3)',
  },
});
