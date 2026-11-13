import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
  ActivityIndicator
} from 'react-native';
import { useAppSelector } from '@/core/store/store';
import { rem } from '@/core/utils/responsive';
import { CurrencyService } from '@/core/services/currencyService';
import { 
  Sparkles, 
  Brain, 
  ShoppingBag, 
  DollarSign, 
  TrendingUp, 
  Package, 
  Utensils, 
  Store, 
  Calendar,
  AlertCircle,
  ChevronRight,
  User,
  MapPin,
  Clock,
  CirclePlay,
  Cpu,
  Goal
} from 'lucide-react-native';
import { MotiView, AnimatePresence } from 'moti';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/core/theme/theme';
import { ExpenseOcrService } from '@/infrastructure/services/expenseOcrService';
import { DashboardTab } from './DashboardScreen';

const { width } = Dimensions.get('window');

interface UserDashboardScreenProps {
  onNavigate: (tab: DashboardTab, params?: any) => void;
}

export const UserDashboardScreen = ({ onNavigate }: UserDashboardScreenProps) => {
  const { colors, mode } = useTheme();
  const styles = getStyles(colors, mode);

  // Redux state
  const { user } = useAppSelector((state) => state.auth);
  const { selectedRegisterId, sessionStatus } = useAppSelector((state) => state.pos);

  // OCR Drafts state to alert user
  const [ocrDraftsCount, setOcrDraftsCount] = useState(0);
  const [loadingOcr, setLoadingOcr] = useState(true);

  useEffect(() => {
    const fetchOcrDrafts = async () => {
      try {
        const drafts = await ExpenseOcrService.getDrafts();
        const readyDrafts = drafts.filter(d => d.status === 'READY');
        setOcrDraftsCount(readyDrafts.length);
      } catch (err) {
        console.warn('[UserDashboardScreen] Failed to fetch OCR drafts:', err);
      } finally {
        setLoadingOcr(false);
      }
    };
    fetchOcrDrafts();
  }, []);

  // Compute greeting message based on local hour
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return '¡Buenos días!';
    if (hour >= 12 && hour < 18) return '¡Buenas tardes!';
    return '¡Buenas noches!';
  }, []);

  const userName = user?.name || user?.nombre || user?.email?.split('@')[0] || 'Administrador';
  const commerceName = user?.tenant_name || user?.tenantName || 'Mi Negocio Gastronómico';

  const handleActionPress = (tab: DashboardTab, params?: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onNavigate(tab, params);
  };

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      
      {/* 1. Holographic Greeting Banner */}
      <MotiView
        from={{ opacity: 0, translateY: -15 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'spring', damping: 15 }}
        style={styles.greetingBanner}
      >
        <View style={styles.greetingTextCol}>
          <Text style={styles.greetingSub}>{greeting}</Text>
          <Text style={styles.greetingTitle} numberOfLines={1}>{userName}</Text>
        </View>
        <View style={styles.avatarGlow}>
          <User size={rem(22)} color={colors.primary} />
        </View>
      </MotiView>

      {/* 2. Premium Commerce & Session Status Card */}
      <MotiView
        from={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', damping: 20, delay: 100 }}
        style={styles.statusCard}
      >
        <View style={styles.statusHeader}>
          <View style={styles.tenantIconWrapper}>
            <Store size={rem(18)} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.tenantName} numberOfLines={1}>{commerceName}</Text>
            <View style={styles.locationRow}>
              <MapPin size={rem(9)} color={colors.textMuted} style={{ marginRight: 3 }} />
              <Text style={styles.locationText}>Sede Principal</Text>
            </View>
          </View>
          <View style={[styles.pillBadge, sessionStatus === 'OPEN' ? styles.badgeOpen : styles.badgeClosed]}>
            <View style={[styles.badgeDot, { backgroundColor: sessionStatus === 'OPEN' ? '#10B981' : '#EF4444' }]} />
            <Text style={[styles.badgeLabel, { color: sessionStatus === 'OPEN' ? '#10B981' : '#EF4444' }]}>
              {sessionStatus === 'OPEN' ? 'Caja Abierta' : 'Caja Cerrada'}
            </Text>
          </View>
        </View>

        <View style={styles.statusDivider} />

        <View style={styles.statusFooter}>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>ROL USUARIO</Text>
            <Text style={styles.infoValue}>{user?.rol || 'Administrador POS'}</Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>ID CAJA VINCULADA</Text>
            <Text style={styles.infoValue} numberOfLines={1}>
              {selectedRegisterId ? selectedRegisterId.substring(0, 10).toUpperCase() : 'Ninguna'}
            </Text>
          </View>
        </View>
      </MotiView>

      {/* 3. Neural OCR AI Smart Alerts */}
      <AnimatePresence>
        <MotiView
          from={{ opacity: 0, translateY: 10, scale: 0.95 }}
          animate={{ opacity: 1, translateY: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          style={styles.aiAlertCard}
        >
          <View style={styles.aiAlertHeader}>
            <View style={styles.aiPulsingBadge}>
              <Brain size={rem(14)} color={colors.gold} />
              {ocrDraftsCount > 0 && (
                <MotiView
                  from={{ scale: 0.8, opacity: 0.5 }}
                  animate={{ scale: 1.4, opacity: 0 }}
                  transition={{ loop: true, duration: 1800, type: 'timing' }}
                  style={styles.aiPulseRing}
                />
              )}
            </View>
            <Text style={styles.aiAlertTitle}>Cognitive OCR Asistente</Text>
            {ocrDraftsCount > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{ocrDraftsCount}</Text>
              </View>
            )}
          </View>
          <Text style={styles.aiAlertBody}>
            {ocrDraftsCount > 0
              ? `Tienes ${ocrDraftsCount} facturas digitalizadas y procesadas por la IA esperando mapeo para ingresar al almacén.`
              : 'Digitaliza facturas de compras de proveedores con Inteligencia Artificial y actualiza tu stock físico al instante.'}
          </Text>
          <TouchableOpacity 
            style={styles.aiAlertBtn}
            activeOpacity={0.8}
            onPress={() => handleActionPress('INVENTARIO', { initialInventoryScreen: 'AI_IMPORT' })}
          >
            <Text style={styles.aiAlertBtnText}>
              {ocrDraftsCount > 0 ? 'Revisar Facturas ahora' : 'Importar Factura con IA'}
            </Text>
            <ChevronRight size={rem(12)} color="#1E3A8A" />
          </TouchableOpacity>
        </MotiView>
      </AnimatePresence>

      {/* 4. Core Modules Bento Grid */}
      <Text style={styles.sectionTitle}>Módulos Operativos</Text>
      
      <View style={styles.gridContainer}>
        {/* Card 1: POS Sales (Punto de Venta) */}
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 20, delay: 200 }}
          style={styles.gridItem}
        >
          <TouchableOpacity 
            style={[styles.moduleCard, { borderLeftColor: colors.primary, borderLeftWidth: 4 }]}
            activeOpacity={0.8}
            onPress={() => handleActionPress('POS')}
          >
            <View style={styles.moduleIconWrapper}>
              <ShoppingBag size={rem(20)} color={colors.primary} />
            </View>
            <Text style={styles.moduleName}>Punto de Venta (POS)</Text>
            <Text style={styles.moduleSub}>Iniciar toma de pedidos y facturación de productos.</Text>
            <View style={styles.moduleActionRow}>
              <Text style={styles.actionBtnLabel}>Ventas</Text>
              <ChevronRight size={rem(12)} color={colors.primary} />
            </View>
          </TouchableOpacity>
        </MotiView>

        {/* Card 2: Cashier closings (Caja) */}
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 20, delay: 250 }}
          style={styles.gridItem}
        >
          <TouchableOpacity 
            style={[styles.moduleCard, { borderLeftColor: '#F59E0B', borderLeftWidth: 4 }]}
            activeOpacity={0.8}
            onPress={() => handleActionPress('CAJA')}
          >
            <View style={[styles.moduleIconWrapper, { backgroundColor: 'rgba(245, 158, 11, 0.06)' }]}>
              <DollarSign size={rem(20)} color="#F59E0B" />
            </View>
            <Text style={styles.moduleName}>Control de Caja</Text>
            <Text style={styles.moduleSub}>Aperturas, cierres de jornada, egresos e ingresos de dinero.</Text>
            <View style={styles.moduleActionRow}>
              <Text style={[styles.actionBtnLabel, { color: '#F59E0B' }]}>Caja</Text>
              <ChevronRight size={rem(12)} color="#F59E0B" />
            </View>
          </TouchableOpacity>
        </MotiView>

        {/* Card 3: Inventory catalog & OCR (Almacén) */}
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 20, delay: 300 }}
          style={styles.gridItem}
        >
          <TouchableOpacity 
            style={[styles.moduleCard, { borderLeftColor: '#10B981', borderLeftWidth: 4 }]}
            activeOpacity={0.8}
            onPress={() => handleActionPress('INVENTARIO')}
          >
            <View style={[styles.moduleIconWrapper, { backgroundColor: 'rgba(16, 185, 129, 0.06)' }]}>
              <Package size={rem(20)} color="#10B981" />
            </View>
            <Text style={styles.moduleName}>Inventario y Almacén</Text>
            <Text style={styles.moduleSub}>Catálogo general, stock físico, recetas e importación OCR.</Text>
            <View style={styles.moduleActionRow}>
              <Text style={[styles.actionBtnLabel, { color: '#10B981' }]}>Inventario</Text>
              <ChevronRight size={rem(12)} color="#10B981" />
            </View>
          </TouchableOpacity>
        </MotiView>

        {/* Card 4: Tables & Bookings (Mesas) */}
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 20, delay: 350 }}
          style={styles.gridItem}
        >
          <TouchableOpacity 
            style={[styles.moduleCard, { borderLeftColor: '#6366F1', borderLeftWidth: 4 }]}
            activeOpacity={0.8}
            onPress={() => handleActionPress('MESAS')}
          >
            <View style={[styles.moduleIconWrapper, { backgroundColor: 'rgba(99, 102, 241, 0.06)' }]}>
              <Utensils size={rem(20)} color="#6366F1" />
            </View>
            <Text style={styles.moduleName}>Mapa de Mesas</Text>
            <Text style={styles.moduleSub}>Gestión visual de salón, comandas y ocupación del local.</Text>
            <View style={styles.moduleActionRow}>
              <Text style={[styles.actionBtnLabel, { color: '#6366F1' }]}>Salón</Text>
              <ChevronRight size={rem(12)} color="#6366F1" />
            </View>
          </TouchableOpacity>
        </MotiView>

        {/* Card 5: Courts & Bookings */}
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 20, delay: 400 }}
          style={styles.gridItem}
        >
          <TouchableOpacity 
            style={[styles.moduleCard, { borderLeftColor: '#14532D', borderLeftWidth: 4 }]}
            activeOpacity={0.8}
            onPress={() => handleActionPress('CANCHAS')}
          >
            <View style={[styles.moduleIconWrapper, { backgroundColor: 'rgba(20, 83, 45, 0.06)' }]}>
              <Goal size={rem(20)} color="#14532D" />
            </View>
            <Text style={styles.moduleName}>Canchas</Text>
            <Text style={styles.moduleSub}>Agenda, tarifas, promociones e implementos del complejo.</Text>
            <View style={styles.moduleActionRow}>
              <Text style={[styles.actionBtnLabel, { color: '#14532D' }]}>Canchas</Text>
              <ChevronRight size={rem(12)} color="#14532D" />
            </View>
          </TouchableOpacity>
        </MotiView>
      </View>

      {/* 5. Beautiful Real-time Dashboard Mock KPI Graphs */}
      <MotiView
        from={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', damping: 20, delay: 400 }}
        style={styles.salesKpiCard}
      >
        <View style={styles.kpiHeader}>
          <TrendingUp size={rem(16)} color={colors.primary} />
          <Text style={styles.kpiTitle}>Monitoreo Financiero Diario</Text>
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>EN VIVO</Text>
          </View>
        </View>

        <View style={styles.kpiGrid}>
          <View style={styles.kpiCol}>
            <Text style={styles.kpiLabel}>VENTAS TOTALES</Text>
            <Text style={styles.kpiVal}>{CurrencyService.format(1840900)}</Text>
            <View style={styles.trendRow}>
              <Text style={styles.trendText}>+12.4% vs ayer</Text>
            </View>
          </View>

          <View style={styles.kpiVerticalDivider} />

          <View style={styles.kpiCol}>
            <Text style={styles.kpiLabel}>TICKET PROMEDIO</Text>
            <Text style={styles.kpiVal}>{CurrencyService.format(32500)}</Text>
            <View style={styles.trendRow}>
              <Text style={styles.trendText}>57 pedidos registrados</Text>
            </View>
          </View>
        </View>
      </MotiView>

    </ScrollView>
  );
};

const getStyles = (colors: any, mode: 'light' | 'dark') => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: rem(16),
    paddingTop: rem(12),
    paddingBottom: rem(40),
  },
  greetingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: rem(14),
  },
  greetingTextCol: {
    flex: 1,
  },
  greetingSub: {
    fontSize: rem(12),
    fontFamily: 'Inter-Regular',
    color: colors.textMuted,
  },
  greetingTitle: {
    fontSize: rem(20),
    fontFamily: 'Inter-Black',
    fontWeight: '900',
    color: colors.primary,
    marginTop: rem(2),
  },
  avatarGlow: {
    width: rem(44),
    height: rem(44),
    borderRadius: rem(22),
    backgroundColor: mode === 'light' ? '#EFF1FE' : 'rgba(26, 54, 93, 0.1)',
    borderWidth: 1,
    borderColor: mode === 'light' ? '#DCE2FF' : 'rgba(26, 54, 93, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: mode === 'light' ? '#EAE5DA' : '#334155',
    borderRadius: rem(18),
    padding: rem(16),
    shadowColor: '#1A365D',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: rem(16),
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rem(10),
  },
  tenantIconWrapper: {
    width: rem(34),
    height: rem(34),
    borderRadius: rem(10),
    backgroundColor: 'rgba(26, 54, 93, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tenantName: {
    fontSize: rem(13),
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: colors.text,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: rem(2),
  },
  locationText: {
    fontSize: rem(9.5),
    fontFamily: 'Inter-Regular',
    color: colors.textMuted,
  },
  pillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: rem(12),
    paddingHorizontal: rem(8),
    paddingVertical: rem(4),
    borderWidth: 1,
    gap: rem(4),
  },
  badgeOpen: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.15)',
  },
  badgeClosed: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.15)',
  },
  badgeDot: {
    width: rem(5),
    height: rem(5),
    borderRadius: rem(2.5),
  },
  badgeLabel: {
    fontSize: rem(9),
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
  },
  statusDivider: {
    height: 1,
    backgroundColor: mode === 'light' ? '#EAE5DA' : '#334155',
    marginVertical: rem(12),
  },
  statusFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoCol: {
    flex: 1,
  },
  infoLabel: {
    fontSize: rem(7.5),
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: rem(2),
  },
  infoValue: {
    fontSize: rem(10),
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: colors.text,
  },
  aiAlertCard: {
    backgroundColor: mode === 'light' ? '#EFF6FF' : '#172554',
    borderWidth: 1,
    borderColor: mode === 'light' ? '#BFDBFE' : '#1E3A8A',
    borderRadius: rem(16),
    padding: rem(14),
    marginBottom: rem(18),
  },
  aiAlertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rem(8),
    marginBottom: rem(6),
  },
  aiPulsingBadge: {
    position: 'relative',
    width: rem(24),
    height: rem(24),
    borderRadius: rem(12),
    backgroundColor: mode === 'light' ? '#DBEAFE' : '#1e3a8a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiPulseRing: {
    position: 'absolute',
    width: rem(24),
    height: rem(24),
    borderRadius: rem(12),
    backgroundColor: colors.gold,
  },
  aiAlertTitle: {
    fontSize: rem(12),
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: mode === 'light' ? '#1E3A8A' : '#93C5FD',
    flex: 1,
  },
  countBadge: {
    backgroundColor: '#EF4444',
    borderRadius: rem(10),
    paddingHorizontal: rem(6),
    paddingVertical: rem(2),
  },
  countBadgeText: {
    fontSize: rem(8),
    fontFamily: 'Inter-Bold',
    fontWeight: '900',
    color: '#FFFFFF',
  },
  aiAlertBody: {
    fontSize: rem(10.5),
    fontFamily: 'Inter-Regular',
    color: mode === 'light' ? '#1E40AF' : '#BFDBFE',
    lineHeight: rem(15),
    marginBottom: rem(10),
  },
  aiAlertBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gold,
    height: rem(32),
    borderRadius: rem(8),
    gap: rem(4),
  },
  aiAlertBtnText: {
    fontSize: rem(10.5),
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: '#1E3A8A',
  },
  sectionTitle: {
    fontSize: rem(13.5),
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: colors.primary,
    marginBottom: rem(12),
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rem(12),
    marginBottom: rem(18),
  },
  gridItem: {
    width: (width - rem(44)) / 2,
  },
  moduleCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: mode === 'light' ? '#EAE5DA' : '#334155',
    borderRadius: rem(16),
    padding: rem(12),
    height: rem(150),
    justifyContent: 'space-between',
    shadowColor: '#1A365D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  moduleIconWrapper: {
    width: rem(34),
    height: rem(34),
    borderRadius: rem(9),
    backgroundColor: 'rgba(26, 54, 93, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduleName: {
    fontSize: rem(12),
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: colors.text,
    marginTop: rem(6),
  },
  moduleSub: {
    fontSize: rem(9.5),
    fontFamily: 'Inter-Regular',
    color: colors.textMuted,
    lineHeight: rem(13),
    flex: 1,
    marginTop: rem(4),
  },
  moduleActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: rem(4),
  },
  actionBtnLabel: {
    fontSize: rem(9.5),
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: colors.primary,
  },
  salesKpiCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: mode === 'light' ? '#EAE5DA' : '#334155',
    borderRadius: rem(18),
    padding: rem(14),
    shadowColor: '#1A365D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  kpiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: rem(14),
  },
  kpiTitle: {
    fontSize: rem(12),
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: colors.text,
    flex: 1,
    marginLeft: rem(6),
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: rem(6),
    paddingHorizontal: rem(6),
    paddingVertical: rem(2),
    gap: rem(4),
  },
  liveDot: {
    width: rem(4),
    height: rem(4),
    borderRadius: rem(2),
    backgroundColor: '#10B981',
  },
  liveText: {
    fontSize: rem(7.5),
    fontFamily: 'Inter-Bold',
    fontWeight: '900',
    color: '#10B981',
  },
  kpiGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  kpiCol: {
    flex: 1,
  },
  kpiLabel: {
    fontSize: rem(8),
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: rem(2),
  },
  kpiVal: {
    fontSize: rem(15),
    fontFamily: 'Inter-Black',
    fontWeight: '900',
    color: colors.primary,
  },
  trendRow: {
    marginTop: rem(2),
  },
  trendText: {
    fontSize: rem(9),
    fontFamily: 'Inter-Regular',
    color: colors.textMuted,
  },
  kpiVerticalDivider: {
    width: 1,
    height: rem(40),
    backgroundColor: mode === 'light' ? '#EAE5DA' : '#334155',
    marginHorizontal: rem(14),
  },
});
