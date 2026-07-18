import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  Dimensions 
} from 'react-native';
import { useAppSelector, useAppDispatch } from '@/core/store/store';
import { setSessionStatus, clearPosState, fetchZones, fetchFloors } from '@/core/store/slices/posSlice';
import { clearCatalog, fetchCatalog } from '@/core/store/slices/catalogSlice';
import { clearCartState, fetchTableOrders, fetchPendingOrders } from '@/core/store/slices/cartSlice';
import { CashRegisterService } from '@/infrastructure/services/cashRegisterService';
import { PosTab, PosSubHeader } from '../components/PosSubHeader';
import { DashboardHeader } from '../components/DashboardLayout';
import { PosScreen } from './PosScreen';
import { MesasScreen } from './MesasScreen';
import { MostradorScreen } from './MostradorScreen';
import { ReservasScreen } from './ReservasScreen';
import { CajaScreen } from '@/features/caja/screens/CajaScreen';
import { CheckoutScreen } from './CheckoutScreen';
import { PersonalizarScreen } from './PersonalizarScreen';
import { InventoryDashboardScreen } from '@/features/inventory/screens/InventoryDashboardScreen';
import { UserDashboardScreen } from './UserDashboardScreen';
import { ControlDashboardScreen } from '@/features/control/screens/ControlDashboardScreen';
import { MotiView } from 'moti';
import { Lock, ArrowRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { rem } from '@/core/utils/responsive';
import { COLORS, useTheme } from '@/core/theme/theme';

export type DashboardTab = PosTab | 'CAJA' | 'PERSONALIZAR' | 'INVENTARIO' | 'CONTROL' | 'HOME';

export const DashboardScreen = (props: any) => {
  const dispatch = useAppDispatch();
  const { colors, mode } = useTheme();
  const styles = getStyles(colors, mode);
  
  const [activeTab, setActiveTab] = useState<DashboardTab>('HOME');
  const [customizingCartId, setCustomizingCartId] = useState<string | null>(null);
  
  // Centralized tab change helper that keeps React Navigation params synchronized
  const changeTab = (tab: DashboardTab, extraParams?: any) => {
    setActiveTab(tab);
    props.navigation.setParams({ tab, ...extraParams });
  };

  const handleNavigate = (tab: DashboardTab, params?: any) => {
    if (tab === 'PERSONALIZAR' && params) {
      setCustomizingCartId(params);
    }
    changeTab(tab, params);
  };
  
  const { tenantId } = useAppSelector((state) => state.auth);
  const { selectedRegisterId, sessionStatus } = useAppSelector((state) => state.pos);

  // Sync tab state with route parameters if passed from outside navigation (deep-linking)
  const routeTab = props.route?.params?.tab as DashboardTab | undefined;
  useEffect(() => {
    if (routeTab) {
      setActiveTab(routeTab); // Keep this direct state call to prevent infinite update loops
    }
  }, [routeTab]);

  // Background check: verify if the selected register session is still OPEN on backend
  useEffect(() => {
    const verifySession = async () => {
      if (tenantId && selectedRegisterId) {
        try {
          const statusData = await CashRegisterService.getCashRegisterStatus(tenantId, selectedRegisterId);
          dispatch(setSessionStatus(statusData.status));
        } catch (e) {
          console.error('Error verifying register session status:', e);
        }
      }
    };
    verifySession();
  }, [selectedRegisterId, tenantId]);

  // Re-fetch all data when tenantId changes (store switched)
  const prevTenantIdRef = useRef<string | null>(tenantId);
  useEffect(() => {
    if (tenantId && prevTenantIdRef.current !== tenantId) {
      console.log('🔄 [DashboardScreen] Sede cambiada de', prevTenantIdRef.current, 'a', tenantId, '. Recargando datos globales...');
      
      // 1. Limpiar estados viejos
      dispatch(clearCatalog());
      dispatch(clearPosState());
      dispatch(clearCartState());
      
      // 2. Disparar fetch fresco ignorando la caché
      dispatch(fetchCatalog({ force: true }) as any);
      dispatch(fetchZones({ force: true }) as any);
      dispatch(fetchFloors({ force: true }) as any);
      dispatch(fetchTableOrders() as any);
      dispatch(fetchPendingOrders() as any);
      
      // Actualizar ref
      prevTenantIdRef.current = tenantId;
    } else if (tenantId) {
      // Sincronizar el ref en caso de montaje inicial
      prevTenantIdRef.current = tenantId;
    }
  }, [tenantId]);

  // Check if register is required for current tab and if we are currently locked
  const isRegisterRequired = ['POS', 'MESAS', 'MOSTRADOR', 'CHECKOUT'].includes(activeTab as string);
  const isLocked = isRegisterRequired && (!selectedRegisterId || sessionStatus === 'CLOSED');
  const lockReason = !selectedRegisterId ? 'NO_REGISTER' : (sessionStatus === 'CLOSED' ? 'SESSION_CLOSED' : null);

  // Lock Screen Render
  if (isLocked) {
    return (
      <View style={styles.container}>
        <DashboardHeader />
        
        <PosSubHeader 
          activeTab={activeTab as PosTab} 
          title={activeTab === 'POS' ? 'PUNTO DE VENTA' : (activeTab === 'MESAS' ? 'MAPA DE MESAS' : 'ORDENES MOSTRADOR')} 
          onNavigate={(tab) => changeTab(tab)} 
        />
        
        <View style={styles.lockContent}>
          <MotiView
            from={{ opacity: 0, scale: 0.95, translateY: 15 }}
            animate={{ opacity: 1, scale: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 140 }}
            style={styles.lockCard}
          >
            {/* Animated Pulsing Icon Area */}
            <View style={styles.pulseContainer}>
              <MotiView
                from={{ scale: 0.8, opacity: 0.3 }}
                animate={{ scale: 1.3, opacity: 0 }}
                transition={{ loop: true, duration: 2200, type: 'timing' }}
                style={styles.pulseRing}
              />
              <MotiView
                from={{ scale: 0.9, opacity: 0.4 }}
                animate={{ scale: 1.4, opacity: 0 }}
                transition={{ loop: true, duration: 2200, delay: 600, type: 'timing' }}
                style={styles.pulseRing}
              />
              <View style={styles.lockIconCircle}>
                <Lock size={rem(24)} color={colors.primary} />
              </View>
            </View>

            {/* Core Text Info */}
            <Text style={styles.lockTitle}>
              {lockReason === 'NO_REGISTER' ? 'Caja Requerida' : 'Sesión de Caja Cerrada'}
            </Text>
            <Text style={styles.lockSubtitle}>
              {lockReason === 'NO_REGISTER'
                ? 'Para realizar ventas, ver ocupación de mesas o gestionar pedidos, debes vincular una Caja en la pestaña de Caja.'
                : 'La sesión para la caja actual está cerrada. Para comenzar a facturar u ordenar, debes iniciar jornada en la pestaña de Caja.'}
            </Text>

            {/* Status Indicator Pill */}
            <View style={styles.badgeRow}>
              <View style={styles.lockBadge}>
                <View style={[styles.badgeDot, { backgroundColor: lockReason === 'NO_REGISTER' ? '#EF4444' : '#F59E0B' }]} />
                <Text style={styles.lockBadgeText}>
                  {lockReason === 'NO_REGISTER' ? 'Caja sin seleccionar' : 'Jornada inactiva'}
                </Text>
              </View>
            </View>

            {/* Premium Solid Action Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.lockButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                changeTab('CAJA');
              }}
            >
              <Text style={styles.lockButtonText}>Ir a Control de Caja</Text>
              <ArrowRight size={rem(15)} color="#FFFFFF" />
            </TouchableOpacity>
          </MotiView>
        </View>
      </View>
    );
  }

  // Regular Tab Switching rendering
  switch (activeTab) {
    case 'HOME' as any:
      return (
        <View style={styles.container}>
          <DashboardHeader />
          <UserDashboardScreen onNavigate={handleNavigate} />
        </View>
      );
    case 'POS':
      return <PosScreen {...props} onNavigate={handleNavigate} />;
    case 'MESAS':
      return <MesasScreen {...props} onNavigate={handleNavigate} />;
    case 'MOSTRADOR':
      return <MostradorScreen {...props} onNavigate={handleNavigate} />;
    case 'RESERVAS':
      return <ReservasScreen {...props} onNavigate={handleNavigate} />;
    case 'CAJA':
      return <CajaScreen {...props} onNavigate={handleNavigate} />;
    case 'CHECKOUT' as any:
      return <CheckoutScreen onBack={() => changeTab('POS')} />;
    case 'PERSONALIZAR' as any:
      return <PersonalizarScreen cartId={customizingCartId} onBack={() => changeTab('POS')} />;
    case 'INVENTARIO' as any:
      {
        const initialInvScreen = props.route?.params?.initialInventoryScreen || 'DASHBOARD';
        return (
          <InventoryDashboardScreen 
            initialScreen={initialInvScreen}
            onBackToPos={() => {
              setActiveTab('HOME');
              props.navigation.setParams({ tab: 'HOME', initialInventoryScreen: undefined });
            }} 
          />
        );
      }
    case 'CONTROL' as any:
      return (
        <View style={styles.container}>
          <DashboardHeader />
          <ControlDashboardScreen />
        </View>
      );
    default:
      return (
        <View style={styles.container}>
          <DashboardHeader />
          <UserDashboardScreen onNavigate={handleNavigate} />
        </View>
      );
  }
};

const getStyles = (colors: any, mode: string) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  lockContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: rem(20),
  },
  lockCard: {
    backgroundColor: colors.surface,
    borderRadius: rem(28),
    paddingHorizontal: rem(24),
    paddingVertical: rem(34),
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: mode === 'light' ? 0.05 : 0.2,
    shadowRadius: 15,
    elevation: 4,
  },
  pulseContainer: {
    width: rem(80),
    height: rem(80),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: rem(22),
  },
  pulseRing: {
    position: 'absolute',
    width: rem(80),
    height: rem(80),
    borderRadius: rem(40),
    backgroundColor: mode === 'light' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.3)',
  },
  lockIconCircle: {
    width: rem(52),
    height: rem(52),
    borderRadius: rem(26),
    backgroundColor: mode === 'light' ? '#EEF2FF' : '#1E1B4B',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  lockTitle: {
    fontSize: rem(18),
    fontWeight: '800',
    color: colors.text,
    fontFamily: 'Inter-Bold',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: rem(10),
  },
  lockSubtitle: {
    fontSize: rem(13),
    color: colors.textMuted,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: rem(19),
    paddingHorizontal: rem(8),
    marginBottom: rem(18),
  },
  badgeRow: {
    marginBottom: rem(24),
  },
  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: mode === 'light' ? '#F8FAFC' : '#1E293B',
    borderColor: mode === 'light' ? '#E2E8F0' : '#334155',
    borderWidth: 1,
    borderRadius: rem(12),
    paddingHorizontal: rem(10),
    paddingVertical: rem(4),
    gap: rem(6),
  },
  badgeDot: {
    width: rem(6),
    height: rem(6),
    borderRadius: rem(3),
  },
  lockBadgeText: {
    fontSize: rem(11),
    color: colors.textMuted,
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
  },
  lockButton: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    borderRadius: rem(16),
    paddingVertical: rem(14),
    paddingHorizontal: rem(24),
    alignItems: 'center',
    justifyContent: 'center',
    gap: rem(8),
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    width: '100%',
  },
  lockButtonText: {
    fontSize: rem(14),
    color: '#FFFFFF',
    fontWeight: '800',
    fontFamily: 'Inter-Bold',
  },
});
