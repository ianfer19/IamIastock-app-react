import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ImageBackground,
  ScrollView,
  Keyboard,
  Animated,
  Platform,
  Pressable,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Mail, Lock, Eye, EyeOff, ChevronRight, Cpu, ArrowRight, Utensils } from 'lucide-react-native';
import { COLORS } from '@/core/theme/theme';
import { GlassCard } from '@/presentation/components/GlassCard';
import { rem, IS_TABLET } from '@/core/utils/responsive';
import { AuthService } from '@/infrastructure/services/authService';
import { SoundService } from '@/core/services/soundService';
import { store } from '@/core/store/store';
import { setAuth } from '@/core/store/slices/authSlice';

// Background images for the carousel
const BACKGROUNDS = [
  require('../../../assets/restaurant_bg_front.png'),
  require('../../../assets/hotel_bg_front.png'),
  require('../../../assets/gym_bg_front.png'),
  require('../../../assets/ai_bg_front.png'),
];

export const LoginScreen = ({ onLogin }: { onLogin: (userData: any) => void }) => {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('ianfer09col@gmail.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [bgIndex, setBgIndex] = useState(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Logic states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Refs for programmatic control
  const scrollRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setBgIndex((prev) => (prev + 1) % BACKGROUNDS.length);
    }, 5000);

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        setTimeout(() => {
          scrollRef.current?.scrollTo({ y: rem(100), animated: true });
        }, 50);
      }
    );

    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      clearInterval(timer);
      showSub.remove();
      hideSub.remove();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const validateEmail = (text: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(text);
  };

  const handleLoginPress = async () => {
    // Clear previous errors
    setErrorMessage(null);

    // Validation
    if (!validateEmail(email)) {
      setErrorMessage('Ingresa un correo electrónico válido');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    if (password.length < 1) {
      setErrorMessage('La contraseña es obligatoria');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    SoundService.playClick();

    // Create abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      const response = await AuthService.login(email, password, abortControllerRef.current.signal);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      SoundService.playSuccess();

      // Execute Redux dispatch for global state
      store.dispatch(setAuth({ 
        user: response.user, 
        tenantId: response.user.tenant_id 
      }));

      // Execute callback with user data
      onLogin({
        tenant_id: response.user.tenant_id,
        role: response.user.role,
        name: response.user.name
      });
    } catch (error: any) {
      if (error.message === 'Petición cancelada') return;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      SoundService.playError();

      if (error.code === 'PASSWORD_RESET_REQUIRED') {
        Alert.alert('Seguridad', 'Debes cambiar tu contraseña para continuar');
        // Handle redirection here if needed
      } else {
        setErrorMessage(error.message || 'Error al iniciar sesión');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailChange = (text: string) => {
    setEmail(text);
    if (errorMessage) setErrorMessage(null);
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    if (errorMessage) setErrorMessage(null);
  };

  return (
    <View style={styles.container}>
      <ImageBackground
        source={BACKGROUNDS[bgIndex]}
        style={styles.background}
        resizeMode="cover"
      >
        <Animated.View style={[styles.overlay, { opacity: fadeAnim }]} pointerEvents="box-none">
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: keyboardHeight > 0 ? keyboardHeight : 0 }
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="always"
            scrollEnabled={true}
          >
            <Pressable
              style={[
                styles.innerContainer,
                {
                  paddingTop: Math.max(insets.top, rem(20)),
                  paddingBottom: Math.max(insets.bottom, rem(20))
                }
              ]}
              onPress={Keyboard.dismiss}
              pointerEvents="box-none"
            >
              {/* Vertical Spacers for Perfect Symmetry */}
              <View style={styles.flexSpacer} />

              <View style={styles.cardWrapper} pointerEvents="box-none">
                <GlassCard style={styles.card} tint="light" intensity={100}>
                  <View style={styles.header}>
                    <View style={styles.devBadge}>
                      <View style={styles.dot} />
                      <Text style={styles.badgeText}>DEV</Text>
                    </View>

                    <View style={styles.logoContainer}>
                      <View style={styles.logoIcon}>
                        <Cpu size={rem(16)} color="#fff" />
                      </View>
                      <Text style={styles.logoText}>
                        IA<Text style={styles.logoTextBold}>Stock</Text>
                      </Text>
                    </View>

                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryText}>🍽 RESTAURANTES</Text>
                    </View>

                    <Text style={styles.title}>Bienvenido de nuevo</Text>
                    <Text style={styles.subtitle}>Ingresa a tu cuenta para continuar</Text>
                  </View>

                  <View style={styles.form}>
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Correo Electrónico</Text>
                      <View style={styles.inputContainer}>
                        <Mail size={rem(16)} color={COLORS.slate[400]} style={styles.inputIcon} />
                        <TextInput
                          style={styles.input}
                          placeholder="ejemplo@correo.com"
                          placeholderTextColor={COLORS.slate[400]}
                          value={email}
                          onChangeText={handleEmailChange}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          underlineColorAndroid="transparent"
                          editable={!isLoading}
                        />
                      </View>
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Contraseña</Text>
                      <View style={styles.inputContainer}>
                        <Lock size={rem(16)} color={COLORS.slate[400]} style={styles.inputIcon} />
                        <TextInput
                          style={styles.input}
                          placeholder="••••••••••••"
                          placeholderTextColor={COLORS.slate[400]}
                          value={password}
                          onChangeText={handlePasswordChange}
                          secureTextEntry={!showPassword}
                          underlineColorAndroid="transparent"
                          editable={!isLoading}
                        />
                        <TouchableOpacity
                          onPress={() => setShowPassword(!showPassword)}
                          style={styles.eyeIcon}
                          disabled={isLoading}
                        >
                          {showPassword ? (
                            <EyeOff size={rem(16)} color={COLORS.slate[400]} />
                          ) : (
                            <Eye size={rem(16)} color={COLORS.slate[400]} />
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>

                    {errorMessage && (
                      <View style={styles.errorContainer}>
                        <Text style={styles.errorText}>{errorMessage}</Text>
                      </View>
                    )}

                    <TouchableOpacity style={styles.forgotPassword} disabled={isLoading}>
                      <Text style={styles.forgotPasswordText}>¿Olvidaste tu contraseña?</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.button, isLoading && styles.buttonDisabled]}
                      activeOpacity={0.8}
                      onPress={handleLoginPress}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <>
                          <Text style={styles.buttonText}>Entrar al Sistema</Text>
                          <ChevronRight size={rem(16)} color="#fff" />
                        </>
                      )}
                    </TouchableOpacity>

                    <View style={styles.footer}>
                      <Text style={styles.footerText}>¿No tienes una cuenta? </Text>
                      <TouchableOpacity>
                        <Text style={styles.linkText}>Regístrate ahora</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </GlassCard>
              </View>

              <View style={styles.flexSpacer} />
            </Pressable>

            {/* Keyboard Spacer */}
            <View style={{ height: keyboardHeight }} />
          </ScrollView>
        </Animated.View>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  scrollContent: {
    flexGrow: 1,
  },
  innerContainer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    paddingVertical: rem(20),
  },
  flexSpacer: {
    flex: 1,
  },
  cardWrapper: {
    width: IS_TABLET ? rem(340) : '75%',
    maxWidth: 400,
    alignItems: 'center',
    zIndex: 10,
  },
  card: {
    paddingHorizontal: rem(22),
    paddingVertical: rem(25),
    borderRadius: rem(24),
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderColor: 'rgba(255, 255, 255, 0.5)',
    borderWidth: 1.5,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 15,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  header: {
    alignItems: 'center',
    marginBottom: rem(20),
  },
  devBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingHorizontal: rem(10),
    paddingVertical: rem(3),
    borderRadius: rem(20),
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
    marginBottom: rem(10),
  },
  dot: {
    width: rem(5),
    height: rem(5),
    borderRadius: rem(3),
    backgroundColor: COLORS.primary,
    marginRight: rem(5),
  },
  badgeText: {
    color: COLORS.primary,
    fontSize: rem(9),
    fontWeight: 'bold',
    fontFamily: 'Inter-Bold',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: rem(6),
  },
  logoIcon: {
    width: rem(26),
    height: rem(26),
    backgroundColor: COLORS.primary,
    borderRadius: rem(6),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: rem(6),
  },
  logoText: {
    fontSize: rem(20),
    color: COLORS.slate[900],
    fontFamily: 'Inter-Regular',
  },
  logoTextBold: {
    fontWeight: 'bold',
    color: COLORS.primary,
    fontFamily: 'Inter-Black',
  },
  categoryBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    paddingHorizontal: rem(12),
    paddingVertical: rem(4),
    borderRadius: rem(10),
    marginBottom: rem(16),
  },
  categoryText: {
    color: COLORS.primary,
    fontSize: rem(10),
    fontWeight: 'bold',
    fontFamily: 'Jost-Medium',
  },
  title: {
    fontSize: rem(18),
    fontWeight: '700',
    color: COLORS.slate[900],
    marginBottom: rem(4),
    fontFamily: 'Inter-Bold',
  },
  subtitle: {
    fontSize: rem(12),
    color: COLORS.slate[500],
    fontFamily: 'Inter-Regular',
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: rem(14),
  },
  label: {
    fontSize: rem(12),
    fontWeight: '500',
    color: COLORS.slate[700],
    marginBottom: rem(6),
    fontFamily: 'Inter-Regular',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: rem(10),
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: rem(10),
    height: rem(44),
  },
  inputIcon: {
    marginRight: rem(8),
  },
  input: {
    flex: 1,
    color: COLORS.slate[900],
    fontSize: rem(14),
    fontFamily: 'Inter-Regular',
    paddingVertical: 0,
  },
  eyeIcon: {
    padding: rem(4),
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: rem(16),
  },
  forgotPasswordText: {
    color: COLORS.slate[500],
    fontSize: rem(11),
    fontFamily: 'Inter-Regular',
  },
  button: {
    backgroundColor: COLORS.primary,
    height: rem(46),
    borderRadius: rem(12),
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: rem(16),
  },
  buttonDisabled: {
    opacity: 0.6,
    backgroundColor: COLORS.slate[400],
  },
  buttonText: {
    color: '#fff',
    fontSize: rem(14),
    fontWeight: 'bold',
    marginRight: rem(6),
    fontFamily: 'Inter-Bold',
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: rem(10),
    borderRadius: rem(8),
    marginBottom: rem(15),
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  errorText: {
    color: '#ef4444',
    fontSize: rem(12),
    textAlign: 'center',
    fontFamily: 'Inter-Medium',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    color: COLORS.slate[500],
    fontSize: rem(12),
    fontFamily: 'Inter-Regular',
  },
  linkText: {
    color: COLORS.primary,
    fontSize: rem(12),
    fontWeight: 'bold',
    fontFamily: 'Inter-Bold',
  },
});
