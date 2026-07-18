import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Animated, Platform } from 'react-native';
import { ShieldCheck, Printer } from 'lucide-react-native';
import { useTheme } from '@/core/theme/theme';
import { rem } from '@/core/utils/responsive';
import { DashboardHeader } from '../components/DashboardLayout';
import { SecureStorage } from '@/core/storage/secureStorage';
import { AuthService } from '@/infrastructure/services/authService';
import { store } from '@/core/store/store';
import { fetchCatalog } from '@/core/store/slices/catalogSlice';
import { fetchZones, fetchFloors } from '@/core/store/slices/posSlice';
import { fetchTableOrders, fetchPendingOrders } from '@/core/store/slices/cartSlice';
import { updateUserProfile } from '@/core/store/slices/authSlice';

export const SyncScreen = ({ onComplete }: { onComplete: () => void }) => {
  const progressAnim = useRef(new Animated.Value(0)).current;
  const { colors } = useTheme();
  const styles = getStyles(colors);

  useEffect(() => {
    const syncData = async () => {
      try {
        console.log('🔄 [SyncScreen] Iniciando sincronización Senior Lead (Redux)...');

        // Hydrate Redux Store with Global Data (Optimized with Caching)
        await Promise.all([
          store.dispatch(fetchCatalog() as any),
          store.dispatch(fetchZones() as any),
          store.dispatch(fetchFloors() as any),
          store.dispatch(fetchTableOrders() as any),
          store.dispatch(fetchPendingOrders() as any)
        ]);

        const userProfile = await AuthService.getCurrentUser();

        // Step 2: Use existing commerce config or fetch if missing
        const user = await SecureStorage.getUser();
        if (user?.tenant_id) {
          const commerceName = userProfile?.commerce_name || userProfile?.commerce?.nombre || userProfile?.commerce?.name || '';
          console.log('✅ [SyncScreen] Nombre de comercio obtenido de /admin/me:', commerceName);
          
          const updatedUser = {
            ...user,
            commerce_name: commerceName,
            commerce: userProfile?.commerce || user?.commerce
          };
          await SecureStorage.saveUser(updatedUser);
          store.dispatch(updateUserProfile({ commerce_name: commerceName, commerce: updatedUser.commerce }));

          if (userProfile?.commerce) {
            console.log('✅ [SyncScreen] Usando configuración de comercio desde /admin/me');
          } else {
            console.log('📡 [SyncScreen] Configuración no encontrada en /admin/me, consultando /tenants...');
            await store.dispatch(updateUserProfile({ commerce_name: commerceName })); // Fallback
          }
        }

        // Simulating the remaining progress for the UI animation
        Animated.timing(progressAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }).start(() => {
          console.log('✅ [SyncScreen] Sincronización completada.');
          onComplete();
        });

      } catch (error) {
        console.error('❌ [SyncScreen] Error durante la sincronización:', error);
        onComplete(); // Temporary fallback to let user enter
      }
    };

    syncData();
  }, []);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <DashboardHeader />

      <View style={styles.content}>
        <View style={styles.syncCard}>
          {/* Cash Register Icon with Glow */}
          <View style={styles.iconGlow}>
            <View style={styles.iconContainer}>
              <Printer size={rem(40)} color={colors.primary} />
            </View>
          </View>

          <View style={styles.textContainer}>
            <Text style={styles.syncLogoText}>
              IA<Text style={styles.syncLogoBold}>Stock</Text>
            </Text>

            <Text style={styles.statusTitle}>Sincronizando con la nube...</Text>

            {/* Progress Bar */}
            <View style={styles.progressBarBg}>
              <Animated.View style={[styles.progressBarFill, { width: progressWidth }]} />
            </View>

            <Text style={styles.statusSubtitle}>OPTIMIZANDO BASE DE DATOS</Text>
          </View>

          {/* Security Badge */}
          <View style={styles.securityBadge}>
            <ShieldCheck size={rem(18)} color="#10b981" style={styles.shieldIcon} />
            <Text style={styles.securityText}>Secure Cloud Transaction</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    backgroundColor: colors.surface,
    marginTop: rem(15),
    borderTopLeftRadius: rem(45),
    borderTopRightRadius: rem(45),
    justifyContent: 'center',
    alignItems: 'center',
  },
  syncCard: {
    width: '85%',
    alignItems: 'center',
  },
  iconGlow: {
    width: rem(120),
    height: rem(120),
    borderRadius: rem(60),
    backgroundColor: colors.mode === 'light' ? 'rgba(99, 102, 241, 0.05)' : 'rgba(99, 102, 241, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.1)',
    marginBottom: rem(30),
  },
  iconContainer: {
    width: rem(90),
    height: rem(90),
    borderRadius: rem(24),
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(99, 102, 241, 0.2)',
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  textContainer: {
    alignItems: 'center',
    width: '100%',
    marginBottom: rem(40),
  },
  syncLogoText: {
    fontSize: rem(42),
    color: colors.text,
    fontFamily: 'Inter-Regular',
    marginBottom: rem(25),
  },
  syncLogoBold: {
    fontWeight: 'bold',
    color: colors.primary,
    fontFamily: 'Inter-Black',
  },
  statusTitle: {
    fontSize: rem(16),
    fontWeight: '600',
    color: colors.text,
    marginBottom: rem(20),
    fontFamily: 'Inter-SemiBold',
  },
  progressBarBg: {
    width: '100%',
    height: rem(6),
    backgroundColor: colors.mode === 'light' ? '#e2e8f0' : '#334155',
    borderRadius: rem(3),
    marginBottom: rem(15),
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: rem(3),
  },
  statusSubtitle: {
    fontSize: rem(12),
    color: colors.textMuted,
    fontWeight: 'bold',
    letterSpacing: 1.2,
    fontFamily: 'Inter-Bold',
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: rem(20),
    paddingVertical: rem(12),
    borderRadius: rem(30),
    borderWidth: 1,
    borderColor: colors.mode === 'light' ? '#e2e8f0' : '#334155',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  shieldIcon: {
    marginRight: rem(8),
  },
  securityText: {
    color: colors.textMuted,
    fontSize: rem(14),
    fontWeight: '500',
    fontFamily: 'Inter-Medium',
  },
});
