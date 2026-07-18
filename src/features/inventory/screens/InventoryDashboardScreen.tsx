import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
  Dimensions,
  PanResponder,
  Animated
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppSelector } from '@/core/store/store';
import { useTheme } from '@/core/theme/theme';
import { InventoryService } from '@/infrastructure/services/inventoryService';
import { rem } from '@/core/utils/responsive';
import { CurrencyService } from '@/core/services/currencyService';
import { 
  ArrowLeft, 
  Package, 
  PlusCircle, 
  Scale, 
  FileText, 
  Users, 
  Sparkles, 
  Building2, 
  AlertTriangle,
  ChevronRight
} from 'lucide-react-native';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';

// Sub-screens imports
import { ProductsScreen } from './ProductsScreen';
import { AdditionsScreen } from './AdditionsScreen';
import { IngredientsScreen } from './IngredientsScreen';
import { InvoicesScreen } from './InvoicesScreen';
import { SuppliersScreen } from './SuppliersScreen';
import { IaImportScreen } from './IaImportScreen';
import { AssetsScreen } from './AssetsScreen';

import { DashboardHeader } from '@/features/pos/components/DashboardLayout';

interface InventoryDashboardScreenProps {
  initialScreen?: ActiveScreenType;
  onBackToPos: () => void;
}

type ActiveScreenType = 
  | 'DASHBOARD'
  | 'PRODUCTS'
  | 'ADDITIONS'
  | 'INGREDIENTS'
  | 'INVOICES'
  | 'SUPPLIERS'
  | 'AI_IMPORT'
  | 'ASSETS';



// Componente premium para detectar deslizamientos de izquierda a derecha con visualización interactiva de la screen anterior
const SwipeToBackWrapper = ({ 
  onBack, 
  children,
  active
}: { 
  onBack: () => void; 
  children: React.ReactNode;
  active: boolean;
}) => {
  const { colors, mode } = useTheme();
  const styles = getStyles(colors, mode);
  const translateX = React.useRef(new Animated.Value(0)).current;

  // Transición suave al abrir la pantalla de derecha a izquierda
  React.useEffect(() => {
    if (active) {
      translateX.setValue(SCREEN_WIDTH);
      Animated.timing(translateX, {
        toValue: 0,
        duration: 320,
        useNativeDriver: true,
      }).start();
    } else {
      translateX.setValue(0);
    }
  }, [active]);

  const startXRef = React.useRef(0);

  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponderCapture: (evt) => {
        if (Platform.OS === 'ios') {
          // Registrar la coordenada X absoluta exacta en la pantalla al colocar el dedo
          startXRef.current = evt.nativeEvent.pageX;
        }
        return false; // No capturar en touch-down para permitir interacciones normales en botones y listas
      },
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponderCapture: (_, gs) => {
        // El gesto de deslizamiento nativo (reveal previous screen) está habilitado exclusivamente para iOS (iPhone)
        if (Platform.OS !== 'ios') return false;

        // Iniciar gesto estrictamente si el dedo inició en el borde izquierdo de la pantalla (startX < 40)
        // Esto previene cualquier inicio de deslizamiento si se arrastra desde la zona media o derecha.
        const isFromLeft = startXRef.current < 40;
        const isMovingRight = gs.dx > 10;
        const isHorizontal = Math.abs(gs.dx) > Math.abs(gs.dy) * 1.5;

        return isFromLeft && isMovingRight && isHorizontal;
      },
      onMoveShouldSetPanResponder: () => false,
      onPanResponderMove: (_, gs) => {
        // Limitar la traslación a valores positivos (deslizar a la derecha)
        const val = Math.max(0, gs.dx);
        translateX.setValue(val);
      },
      onPanResponderRelease: (_, gs) => {
        const shouldRelease = gs.dx > SCREEN_WIDTH * 0.25 || gs.vx > 0.4;

        if (shouldRelease) {
          // Deslizar suavemente toda la pantalla hacia la derecha para sacarla de la vista
          Animated.timing(translateX, {
            toValue: SCREEN_WIDTH,
            duration: 250,
            useNativeDriver: true,
          }).start(() => {
            onBack();
          });
        } else {
          // Rebotar/retornar a la posición original si no superó el umbral
          Animated.spring(translateX, {
            toValue: 0,
            friction: 7,
            tension: 40,
            useNativeDriver: true,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        // Rebotar a la posición inicial en caso de interrupción del gesto
        Animated.spring(translateX, {
          toValue: 0,
          friction: 7,
          tension: 40,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  const insets = useSafeAreaInsets();
  const headerHeight = rem(56) + insets.top;

  if (Platform.OS !== 'ios') {
    return <View style={{ flex: 1 }}>{children}</View>;
  }

  // Opacidad del fondo oscuro/desenfocado de respaldo que se aclara a medida que se desliza la pantalla superior
  const backdropOpacity = translateX.interpolate({
    inputRange: [0, SCREEN_WIDTH],
    outputRange: [0.25, 0],
    extrapolate: 'clamp',
  });

  return (
    <View 
      style={{
        position: 'absolute',
        top: headerHeight,
        bottom: 0,
        left: 0,
        right: 0,
      }} 
      {...panResponder.panHandlers}
    >
      {/* Fondo de sombreado trasero */}
      <Animated.View 
        style={[
          styles.swipeBackdrop, 
          { opacity: backdropOpacity }
        ]} 
        pointerEvents="none" 
      />
      <Animated.View 
        style={[
          styles.swipeContainer, 
          { transform: [{ translateX }] }
        ]}
      >
        {children}
      </Animated.View>
    </View>
  );
};

export const InventoryDashboardScreen = ({ initialScreen = 'DASHBOARD', onBackToPos }: InventoryDashboardScreenProps) => {
  const { colors, mode } = useTheme();
  const styles = getStyles(colors, mode);
  const [activeScreen, setActiveScreen] = useState<ActiveScreenType>(initialScreen);

  useEffect(() => {
    setActiveScreen(initialScreen);
  }, [initialScreen]);

  // Load basic numbers for widgets
  const globalProducts = useAppSelector(state => state.catalog.products);

  const [totalInvoicesVal, setTotalInvoicesVal] = useState(0);

  useEffect(() => {
    // Read invoice liabilities
    InventoryService.getInvoices().then(invs => {
      const pending = invs.reduce((sum, item) => sum + (item.total - item.pagado), 0);
      setTotalInvoicesVal(pending);
    });
  }, [activeScreen]);

  // Aggregate stats for KPI indicators
  const lowStockProductsCount = useMemo(() => {
    return globalProducts.filter(p => (p.stock || 0) <= 5).length;
  }, [globalProducts]);

  const handleNavigate = (target: ActiveScreenType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setActiveScreen(target);
  };

  const isIos = Platform.OS === 'ios';

  return (
    <View style={styles.container}>
      {/* Header Premium de la App (incluye menú hamburguesa para abrir el navbar lateral) */}
      <DashboardHeader />

      {/* El dashboard principal se renderiza siempre en iOS como capa base estática
          para que el gesto 'swipe to back' interactivo revele la pantalla anterior de forma real.
          En otras plataformas se renderiza condicionalmente para optimizar el rendimiento. */}
      {(activeScreen === 'DASHBOARD' || isIos) && (
        <ScrollView 
          scrollEnabled={activeScreen === 'DASHBOARD'}
          contentContainerStyle={{ paddingBottom: rem(40) }} 
          showsVerticalScrollIndicator={false}
        >
          {/* Modern Dashboard KPI Panel */}
          <View style={styles.kpiRow}>
            {/* Card 1: Productos Registrados */}
            <MotiView 
              from={{ opacity: 0, scale: 0.9, translateY: 10 }}
              animate={{ opacity: 1, scale: 1, translateY: 0 }}
              transition={{ type: 'spring', damping: 18 }}
              style={[styles.kpiCard, styles.kpiCardProducts]}
            >
              <View style={styles.kpiHeader}>
                <View style={[styles.kpiIconWrapper, { backgroundColor: 'rgba(13, 58, 148, 0.08)' }]}>
                  <Package size={rem(13)} color={colors.primary} strokeWidth={2.5} />
                </View>
              </View>
              <View style={styles.kpiContent}>
                <Text style={styles.kpiLabel}>Productos</Text>
                <Text style={styles.kpiVal}>{globalProducts.length}</Text>
                <Text style={styles.kpiFootnote}>Activos en catálogo</Text>
              </View>
            </MotiView>

            {/* Card 2: Stock Crítico */}
            <MotiView 
              from={{ opacity: 0, scale: 0.9, translateY: 10 }}
              animate={{ opacity: 1, scale: 1, translateY: 0 }}
              transition={{ type: 'spring', damping: 18, delay: 100 }}
              style={[styles.kpiCard, styles.kpiCardStock]}
            >
              <View style={styles.kpiHeader}>
                <View style={[styles.kpiIconWrapper, { backgroundColor: 'rgba(239, 68, 68, 0.08)' }]}>
                  <AlertTriangle size={rem(13)} color={colors.error} strokeWidth={2.5} />
                </View>
                {lowStockProductsCount > 0 && (
                  <MotiView
                    from={{ opacity: 0.4, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1.2 }}
                    transition={{ type: 'timing', duration: 1000, loop: true }}
                    style={[styles.badgeIndicator, { backgroundColor: colors.error }]}
                  />
                )}
              </View>
              <View style={styles.kpiContent}>
                <Text style={styles.kpiLabel}>Stock Crítico</Text>
                <Text style={[styles.kpiVal, { color: colors.error }]}>
                  {lowStockProductsCount} <Text style={styles.kpiValUnit}>items</Text>
                </Text>
                <Text style={styles.kpiFootnote}>Bajo stock hoy</Text>
              </View>
            </MotiView>

            {/* Card 3: Cuentas por Pagar */}
            <MotiView 
              from={{ opacity: 0, scale: 0.9, translateY: 10 }}
              animate={{ opacity: 1, scale: 1, translateY: 0 }}
              transition={{ type: 'spring', damping: 18, delay: 200 }}
              style={[styles.kpiCard, styles.kpiCardInvoices]}
            >
              <View style={styles.kpiHeader}>
                <View style={[styles.kpiIconWrapper, { backgroundColor: 'rgba(197, 168, 128, 0.1)' }]}>
                  <FileText size={rem(13)} color={colors.gold} strokeWidth={2.5} />
                </View>
              </View>
              <View style={styles.kpiContent}>
                <Text style={styles.kpiLabel}>Cuentas Pagar</Text>
                <Text style={[styles.kpiVal, { color: colors.primary, fontSize: rem(10.5) }]} numberOfLines={1}>
                  {CurrencyService.format(totalInvoicesVal)}
                </Text>
                <Text style={styles.kpiFootnote}>Facturas vigentes</Text>
              </View>
            </MotiView>
          </View>

          {/* Main Premium Bento Navigation Grid */}
          <Text style={styles.sectionTitle}>Módulos Administrativos</Text>
          
          <View style={styles.bentoContainer}>
            {/* Row 1: Products and Additions */}
            <View style={styles.bentoRow}>
              <TouchableOpacity 
                style={[styles.bentoItem, { backgroundColor: colors.surface, borderColor: mode === 'light' ? '#EAE5DA' : '#334155' }]}
                activeOpacity={0.8}
                onPress={() => handleNavigate('PRODUCTS')}
              >
                <View style={styles.bentoHeaderRow}>
                  <View style={[styles.iconWrapper, { backgroundColor: colors.primaryGlow }]}>
                    <Package size={rem(18)} color={colors.primary} />
                  </View>
                  <Text style={styles.bentoTitle}>Catálogo de Productos</Text>
                </View>
                <Text style={styles.bentoDesc}>Precios, existencias críticas, márgenes y categorías.</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.bentoItem, { backgroundColor: colors.surface, borderColor: mode === 'light' ? '#EAE5DA' : '#334155' }]}
                activeOpacity={0.8}
                onPress={() => handleNavigate('ADDITIONS')}
              >
                <View style={styles.bentoHeaderRow}>
                  <View style={[styles.iconWrapper, { backgroundColor: 'rgba(245, 158, 11, 0.06)' }]}>
                    <PlusCircle size={rem(18)} color="#F59E0B" />
                  </View>
                  <Text style={styles.bentoTitle}>Adiciones y Modificadores</Text>
                </View>
                <Text style={styles.bentoDesc}>Combos, extras y adicionales con costo dinámico.</Text>
              </TouchableOpacity>
            </View>

            {/* Row 2: Ingredients and Invoices */}
            <View style={styles.bentoRow}>
              <TouchableOpacity 
                style={[styles.bentoItem, { backgroundColor: colors.surface, borderColor: mode === 'light' ? '#EAE5DA' : '#334155' }]}
                activeOpacity={0.8}
                onPress={() => handleNavigate('INGREDIENTS')}
              >
                <View style={styles.bentoHeaderRow}>
                  <View style={[styles.iconWrapper, { backgroundColor: 'rgba(16, 185, 129, 0.06)' }]}>
                    <Scale size={rem(18)} color={colors.success} />
                  </View>
                  <Text style={styles.bentoTitle}>Ingredientes / Insumos</Text>
                </View>
                <Text style={styles.bentoDesc}>Materias primas, costos y valoración total de almacén.</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.bentoItem, { backgroundColor: colors.surface, borderColor: mode === 'light' ? '#EAE5DA' : '#334155' }]}
                activeOpacity={0.8}
                onPress={() => handleNavigate('INVOICES')}
              >
                <View style={styles.bentoHeaderRow}>
                  <View style={[styles.iconWrapper, { backgroundColor: 'rgba(59, 130, 246, 0.06)' }]}>
                    <FileText size={rem(18)} color="#3B82F6" />
                  </View>
                  <Text style={styles.bentoTitle}>Facturas Proveedores</Text>
                </View>
                <Text style={styles.bentoDesc}>Historial de facturas de egreso, plazos y abonos.</Text>
              </TouchableOpacity>
            </View>

            {/* Row 3: Suppliers and Physical Assets */}
            <View style={styles.bentoRow}>
              <TouchableOpacity 
                style={[styles.bentoItem, { backgroundColor: colors.surface, borderColor: mode === 'light' ? '#EAE5DA' : '#334155' }]}
                activeOpacity={0.8}
                onPress={() => handleNavigate('SUPPLIERS')}
              >
                <View style={styles.bentoHeaderRow}>
                  <View style={[styles.iconWrapper, { backgroundColor: colors.primaryGlow }]}>
                    <Users size={rem(18)} color={colors.primary} />
                  </View>
                  <Text style={styles.bentoTitle}>Directorio Aliados</Text>
                </View>
                <Text style={styles.bentoDesc}>Contactos, saldos, llamadas y WhatsApp integrados.</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.bentoItem, { backgroundColor: colors.surface, borderColor: mode === 'light' ? '#EAE5DA' : '#334155' }]}
                activeOpacity={0.8}
                onPress={() => handleNavigate('ASSETS')}
              >
                <View style={styles.bentoHeaderRow}>
                  <View style={[styles.iconWrapper, { backgroundColor: 'rgba(197, 168, 128, 0.12)' }]}>
                    <Building2 size={rem(18)} color={colors.gold} />
                  </View>
                  <Text style={styles.bentoTitle}>Inmobiliaria y Activos</Text>
                </View>
                <Text style={styles.bentoDesc}>Equipos de cocina, valorización de locales y maquinaria.</Text>
              </TouchableOpacity>
            </View>

            {/* Full-width Special AI Cognitive importer card */}
            <TouchableOpacity 
              style={styles.fullBentoAi}
              activeOpacity={0.85}
              onPress={() => handleNavigate('AI_IMPORT')}
            >
              <View style={styles.aiBadgeRow}>
                <View style={styles.aiPill}>
                  <Sparkles size={rem(9)} color="#FFFFFF" style={{ marginRight: 3 }} />
                  <Text style={styles.aiPillText}>Cognitive OCR</Text>
                </View>
              </View>
              <Text style={styles.aiTitle}>Importación Inteligente con IA</Text>
              <Text style={styles.aiDesc}>
                Escanear o copiar bloques de facturas de proveedores físicos. La Inteligencia Artificial mapea, divide e ingresa automáticamente los precios y cantidades al catálogo en tiempo real.
              </Text>
              <View style={styles.aiArrowRow}>
                <Text style={styles.aiArrowLabel}>Probar Escáner IA</Text>
                <ChevronRight size={rem(12)} color={colors.primary} />
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* Capa de sub-pantallas con soporte para arrastre interactivo (reveals base layers) */}
      {activeScreen !== 'DASHBOARD' && (
        <SwipeToBackWrapper active={true} onBack={() => setActiveScreen('DASHBOARD')}>
          {activeScreen === 'PRODUCTS' && <ProductsScreen onBack={() => setActiveScreen('DASHBOARD')} />}
          {activeScreen === 'ADDITIONS' && <AdditionsScreen onBack={() => setActiveScreen('DASHBOARD')} />}
          {activeScreen === 'INGREDIENTS' && <IngredientsScreen onBack={() => setActiveScreen('DASHBOARD')} />}
          {activeScreen === 'INVOICES' && <InvoicesScreen onBack={() => setActiveScreen('DASHBOARD')} />}
          {activeScreen === 'SUPPLIERS' && <SuppliersScreen onBack={() => setActiveScreen('DASHBOARD')} />}
          {activeScreen === 'AI_IMPORT' && <IaImportScreen onBack={() => setActiveScreen('DASHBOARD')} />}
          {activeScreen === 'ASSETS' && <AssetsScreen onBack={() => setActiveScreen('DASHBOARD')} />}
        </SwipeToBackWrapper>
      )}
    </View>
  );
};

const getStyles = (colors: any, mode: 'light' | 'dark') => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: rem(16),
    paddingTop: Platform.OS === 'ios' ? rem(48) : rem(24),
    paddingBottom: rem(12),
    borderBottomWidth: 1,
    borderBottomColor: mode === 'light' ? '#EAE5DA' : '#334155',
  },
  backBtn: {
    width: rem(36),
    height: rem(36),
    borderRadius: rem(10),
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: mode === 'light' ? '#EAE5DA' : '#334155',
    shadowColor: '#1A365D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  headerTitle: {
    fontSize: rem(15),
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: colors.primary,
  },
  kpiRow: {
    flexDirection: 'row',
    paddingHorizontal: rem(16),
    marginTop: rem(18),
    gap: rem(8),
  },
  kpiCard: {
    flex: 1,
    borderRadius: rem(16),
    padding: rem(12),
    borderWidth: 1,
    borderColor: mode === 'light' ? '#EAE5DA' : '#334155',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  kpiCardProducts: {
    backgroundColor: colors.surface,
    shadowColor: mode === 'light' ? '#0D3A94' : '#000',
  },
  kpiCardStock: {
    backgroundColor: colors.surface,
    shadowColor: mode === 'light' ? '#EF4444' : '#000',
  },
  kpiCardInvoices: {
    backgroundColor: colors.surface,
    shadowColor: mode === 'light' ? '#C5A880' : '#000',
  },
  kpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: rem(10),
  },
  kpiIconWrapper: {
    width: rem(28),
    height: rem(28),
    borderRadius: rem(14),
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeIndicator: {
    width: rem(6),
    height: rem(6),
    borderRadius: rem(3),
  },
  kpiContent: {
    gap: rem(2),
  },
  kpiLabel: {
    fontSize: rem(8.5),
    fontFamily: 'Inter-Medium',
    fontWeight: '500',
    color: colors.textMuted,
  },
  kpiVal: {
    fontSize: rem(13),
    fontFamily: 'Inter-ExtraBold',
    fontWeight: '800',
    color: colors.text,
  },
  kpiValUnit: {
    fontSize: rem(9),
    fontFamily: 'Inter-Medium',
    fontWeight: '500',
    color: colors.textMuted,
  },
  kpiFootnote: {
    fontSize: rem(7.5),
    fontFamily: 'Inter-Regular',
    color: colors.textMuted,
    marginTop: rem(2),
  },
  sectionTitle: {
    fontSize: rem(13),
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: colors.primary,
    marginHorizontal: rem(16),
    marginTop: rem(22),
    marginBottom: rem(12),
  },
  bentoContainer: {
    paddingHorizontal: rem(16),
    gap: rem(10),
  },
  bentoRow: {
    flexDirection: 'row',
    gap: rem(10),
  },
  bentoItem: {
    flex: 1,
    borderRadius: rem(16),
    borderWidth: 1,
    padding: rem(14),
    minHeight: rem(120),
    justifyContent: 'space-between',
    shadowColor: '#1A365D',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  bentoHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: rem(8),
    gap: rem(8),
  },
  iconWrapper: {
    width: rem(32),
    height: rem(32),
    borderRadius: rem(8),
    justifyContent: 'center',
    alignItems: 'center',
  },
  bentoTitle: {
    flex: 1,
    fontSize: rem(13.5),
    fontFamily: 'Inter-Black',
    fontWeight: '900',
    color: colors.text,
  },
  bentoDesc: {
    fontSize: rem(10),
    fontFamily: 'Inter-Medium',
    color: colors.textMuted,
    lineHeight: rem(14),
  },
  fullBentoAi: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: mode === 'light' ? '#EAE5DA' : '#334155',
    borderRadius: rem(16),
    padding: rem(16),
    marginTop: rem(4),
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#1A365D',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  aiBadgeRow: {
    flexDirection: 'row',
    marginBottom: rem(8),
  },
  aiPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: rem(6),
    paddingHorizontal: rem(6),
    paddingVertical: rem(3),
  },
  aiPillText: {
    fontSize: rem(8),
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: '#FFFFFF',
  },
  aiTitle: {
    fontSize: rem(12),
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: colors.primary,
    marginBottom: rem(4),
  },
  aiDesc: {
    fontSize: rem(9),
    fontFamily: 'Inter-Regular',
    color: colors.textMuted,
    lineHeight: rem(13.5),
    marginBottom: rem(12),
  },
  aiArrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rem(4),
  },
  aiArrowLabel: {
    fontSize: rem(9),
    fontFamily: 'Inter-Bold',
    color: colors.primary,
  },
  swipeContainer: {
    flex: 1,
    backgroundColor: colors.background,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: -8, height: 0 },
        shadowOpacity: 0.16,
        shadowRadius: 12,
      },
    }),
  },
  swipeBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
});
