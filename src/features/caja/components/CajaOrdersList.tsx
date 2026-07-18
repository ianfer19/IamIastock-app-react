import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity, Alert, Platform, FlatList } from 'react-native';
import {
  FileText, Coins, TrendingUp, CheckCircle2, XCircle, ShoppingBag,
  Clock, User, ChevronRight, Package, Store, UtensilsCrossed, Sparkles,
} from 'lucide-react-native';
import { useTheme } from '@/core/theme/theme';
import { rem } from '@/core/utils/responsive';
import { CurrencyService } from '@/core/services/currencyService';
import * as Haptics from 'expo-haptics';
import { OrderService } from '@/infrastructure/services/orderService';
import { PosService } from '@/infrastructure/services/posService';
import { MotiView, AnimatePresence } from 'moti';

import { CajaOrdersFilterBar, OrdersFilters } from './CajaOrdersFilterBar';
import { OrderDetailsModal } from './OrderDetailsModal';

// ─── Status Helpers ──────────────────────────────────────────────────────────
const STATUS_CLOSED = ['COBRADA', 'CLOSED', 'CERRADA', 'PAGADO', 'PAGADA', 'COMPLETADA', 'COMPLETED'];
const STATUS_CANCELLED = ['ANULADA', 'CANCELLED', 'ELIMINADA', 'CANCELADA'];
const STATUS_OPEN = ['ABIERTA', 'OPEN', 'PENDIENTE'];

const getStatusCategory = (status: string): 'closed' | 'cancelled' | 'open' => {
  const s = String(status || '').toUpperCase();
  if (STATUS_CLOSED.includes(s)) return 'closed';
  if (STATUS_CANCELLED.includes(s)) return 'cancelled';
  return 'open';
};

const STATUS_CONFIG = {
  open: {
    accent: '#6366F1',
    accentLight: 'rgba(99, 102, 241, 0.08)',
    dotBg: 'rgba(99, 102, 241, 0.15)',
    label: 'Abierta',
    labelColor: '#4F46E5',
  },
  closed: {
    accent: '#10B981',
    accentLight: 'rgba(16, 185, 129, 0.08)',
    dotBg: 'rgba(16, 185, 129, 0.15)',
    label: 'Cobrada',
    labelColor: '#059669',
  },
  cancelled: {
    accent: '#EF4444',
    accentLight: 'rgba(239, 68, 68, 0.08)',
    dotBg: 'rgba(239, 68, 68, 0.15)',
    label: 'Anulada',
    labelColor: '#DC2626',
  },
} as const;

const TYPE_CONFIG: Record<string, { icon: any; color: string; bg: string }> = {
  MOSTRADOR: { icon: Store, color: '#6366F1', bg: 'rgba(99, 102, 241, 0.1)' },
  MESA: { icon: UtensilsCrossed, color: '#10B981', bg: 'rgba(16, 185, 129, 0.1)' },
  DEFAULT: { icon: Package, color: '#64748B', bg: 'rgba(100, 116, 139, 0.1)' },
};

// ─── Interfaces ──────────────────────────────────────────────────────────────
interface CajaOrdersListProps {
  loadingOrders: boolean;
  registerOrders: any[];
  filters: OrdersFilters;
  setFilters: React.Dispatch<React.SetStateAction<OrdersFilters>>;
  registers?: any[];
}

// ─── OrderCard (Extracted for Performance) ───────────────────────────────────
interface OrderCardProps {
  order: any;
  index: number;
  tablesList: any[];
  onPress: (order: any) => void;
}

const getCreatorInfo = (order: any, mode: string) => {
  const name = String(order.waiterName || order.opened_by_name || '').trim();
  const lowerName = name.toLowerCase();
  
  const words = lowerName.split(/\s+/);
  const isAI = words.includes('ai') || 
               words.includes('ia') || 
               lowerName.includes('asistente') || 
               lowerName.includes('chatbot') ||
               lowerName.includes('bot') ||
               String(order.canal || order.channel || '').toLowerCase().includes('ai') ||
               String(order.canal || order.channel || '').toLowerCase().includes('whatsapp');

  if (isAI) {
    return {
      label: 'Asistente AI',
      icon: Sparkles,
      color: '#8B5CF6', // Purple
      bgColor: mode === 'light' ? '#F5F3FF' : '#2D2445',
    };
  }

  // Format and shorten long waiter/staff names gracefully
  let waiterLabel = 'Mesero Principal';
  if (order.waiterName && order.waiterName !== 'Desconocido' && order.waiterName !== 'Sistema') {
    const parts = order.waiterName.trim().split(' ').filter(Boolean);
    if (parts.length > 0) {
      const first = parts[0];
      const second = parts[1];
      if (second && second.length <= 3 && parts[2]) {
        waiterLabel = `${first} ${second} ${parts[2]}`;
      } else if (second) {
        waiterLabel = `${first} ${second}`;
      } else {
        waiterLabel = first;
      }
    }
  }

  return {
    label: waiterLabel,
    icon: User,
    color: '#6366F1', // Indigo
    bgColor: mode === 'light' ? '#EEF2FF' : '#1E1B4B',
  };
};

const OrderCard: React.FC<OrderCardProps> = React.memo(({ order, index, tablesList, onPress }) => {
  const { colors, mode } = useTheme();
  const styles = getStyles(colors, mode);
  const statusCat = getStatusCategory(order.status);
  const config = STATUS_CONFIG[statusCat];
  const typeUpper = String(order.order_type || '').toUpperCase();
  const typeConf = TYPE_CONFIG[typeUpper] || TYPE_CONFIG.DEFAULT;
  const TypeIcon = typeConf.icon;
  const creator = getCreatorInfo(order, mode);
  const CreatorIcon = creator.icon;

  const getTableName = () => {
    if (!order.mesaId) return '';
    const cleanId = String(order.mesaId).replace('MESA#', '');
    const matched = tablesList.find(t => {
      const cleanTableId = String(t.id).replace('MESA#', '');
      return cleanTableId === cleanId;
    });
    return matched ? (matched.name || matched.nombre) : `Mesa #${cleanId.slice(-4).toUpperCase()}`;
  };

  const tableName = getTableName();

  const formatOrderDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '';
    
    const today = new Date();
    const isToday = date.getDate() === today.getDate() &&
                    date.getMonth() === today.getMonth() &&
                    date.getFullYear() === today.getFullYear();
                    
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const isYesterday = date.getDate() === yesterday.getDate() &&
                        date.getMonth() === yesterday.getMonth() &&
                        date.getFullYear() === yesterday.getFullYear();

    const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (isToday) {
      return `Hoy, ${timeString}`;
    } else if (isYesterday) {
      return `Ayer, ${timeString}`;
    } else {
      const day = date.getDate();
      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const monthStr = months[date.getMonth()];
      return `${day} ${monthStr}, ${timeString}`;
    }
  };

  const dateTimeStr = formatOrderDate(order.timestamp);

  const itemsCount = order.itemsCount ?? order.items?.length ?? 0;

  return (
    <MotiView
      from={{ opacity: 0, translateY: 18, scale: 0.97 }}
      animate={{ opacity: 1, translateY: 0, scale: 1 }}
      transition={{
        type: 'timing',
        duration: 350,
        delay: Math.min(index * 70, 350),
      }}
    >
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.65}
        onPress={() => onPress(order)}
      >
        {/* Left Accent Bar */}
        <View style={[styles.accentBar, { backgroundColor: config.accent }]} />

        {/* Card Content */}
        <View style={styles.cardContent}>
          {/* Row 1: ID + Time + Status */}
          <View style={styles.cardTopRow}>
            <View style={styles.cardIdTimeRow}>
              <Text style={styles.cardOrderId}>
                #{String(order.id || '').slice(-5).toUpperCase()}
              </Text>
              <View style={styles.cardTimePill}>
                <Clock size={rem(10)} color="#94A3B8" />
                <Text style={styles.cardTimeText}>{dateTimeStr}</Text>
              </View>
            </View>

            <View style={[styles.statusChip, { backgroundColor: config.dotBg }]}>
              <View style={[styles.statusDot, { backgroundColor: config.accent }]} />
              <Text style={[styles.statusLabel, { color: config.labelColor }]}>
                {config.label}
              </Text>
            </View>
          </View>

          {/* Row 2: Customer + Type */}
          <View style={styles.cardMiddleRow}>
            <View style={styles.customerSection}>
              <View style={styles.customerAvatarBg}>
                <User size={rem(13)} color="#6366F1" />
              </View>
              <View style={styles.customerTexts}>
                <Text style={styles.customerName} numberOfLines={1}>
                  {order.customerName || 'Sin Nombre'}
                </Text>
                <View style={[styles.typeMicroBadge, { backgroundColor: typeConf.bg }]}>
                  <TypeIcon size={rem(9)} color={typeConf.color} />
                  <Text style={[styles.typeMicroText, { color: typeConf.color }]}>
                    {typeUpper === 'MESA' && tableName ? tableName.toUpperCase() : (typeUpper || 'ORDEN')}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Row 3: Creator + Total */}
          <View style={styles.cardBottomRow}>
            <View style={[styles.creatorPill, { backgroundColor: creator.bgColor }]}>
              <CreatorIcon size={rem(11)} color={creator.color} />
              <Text style={[styles.creatorText, { color: creator.color }]} numberOfLines={1} ellipsizeMode="tail">
                {creator.label}
              </Text>
            </View>

            <View style={styles.totalSection}>
              <Text style={styles.totalAmount}>
                {CurrencyService.format(order.total)}
              </Text>
              <View style={styles.chevronCircle}>
                <ChevronRight size={rem(14)} color="#6366F1" />
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </MotiView>
  );
});

// ─── Main Component ──────────────────────────────────────────────────────────
export const CajaOrdersList: React.FC<CajaOrdersListProps> = ({
  loadingOrders,
  registerOrders,
  filters,
  setFilters,
  registers = []
}) => {
  const { colors, mode } = useTheme();
  const styles = getStyles(colors, mode);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [tablesList, setTablesList] = useState<any[]>([]);

  useEffect(() => {
    PosService.getTables()
      .then(setTablesList)
      .catch(err => console.error('❌ Error fetching tables inside CajaOrdersList:', err));
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev === 0 ? 1 : 0));
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  const stats = useMemo(() => {
    let totalSales = 0;
    let openCount = 0;
    let closedCount = 0;
    let cancelledCount = 0;

    registerOrders.forEach(order => {
      const cat = getStatusCategory(order.status);
      if (cat === 'closed') {
        totalSales += order.total || 0;
        closedCount++;
      } else if (cat === 'open') {
        openCount++;
      } else {
        cancelledCount++;
      }
    });

    return {
      totalSales,
      openCount,
      closedCount,
      cancelledCount,
      avgTicket: closedCount > 0 ? totalSales / closedCount : 0,
    };
  }, [registerOrders]);

  const filteredOrders = useMemo(() => {
    return registerOrders.filter(order => {
      const cat = getStatusCategory(order.status);
      const typeUpper = String(order.order_type || '').toUpperCase();

      if (filters.status !== 'ALL') {
        if (filters.status === 'COBRADA' && cat !== 'closed') return false;
        if (filters.status === 'ANULADA' && cat !== 'cancelled') return false;
        if (filters.status === 'ABIERTA' && cat !== 'open') return false;
      }

      if (filters.type !== 'ALL') {
        if (typeUpper !== String(filters.type || '').toUpperCase()) return false;
      }

      if (filters.registerId && filters.registerId !== 'ALL') {
        if (order.cash_register_id !== filters.registerId) return false;
      }

      return true;
    });
  }, [registerOrders, filters]);

  const handleOrderPress = useCallback((order: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedOrder(order);
    setIsModalVisible(true);
  }, []);

  const handleCancelOrder = useCallback((orderId: string) => {
    Alert.alert(
      'Anular Orden',
      '¿Estás seguro de que deseas anular esta orden? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, Anular',
          style: 'destructive',
          onPress: async () => {
            try {
              await OrderService.cancelOrder(orderId);
              Alert.alert('Éxito', 'La orden ha sido anulada correctamente.');
              setIsModalVisible(false);
            } catch {
              Alert.alert('Error', 'No se pudo anular la orden. Intente nuevamente.');
            }
          }
        }
      ]
    );
  }, []);

  const handlePrintOrder = useCallback((orderId: string) => {
    Alert.alert('Impresión', 'Enviando a la impresora conectada...');
  }, []);

  return (
    <View style={styles.container}>
      {/* Premium Rotative Stats Banner */}
      <View style={styles.statsBanner}>
        <View style={styles.leftSlideContainer}>
          <AnimatePresence exitBeforeEnter>
            {currentSlide === 0 ? (
              <MotiView
                key="ventas-totales"
                from={{ opacity: 0, scale: 0.9, translateY: 10 }}
                animate={{ opacity: 1, scale: 1, translateY: 0 }}
                exit={{ opacity: 0, scale: 0.9, translateY: -10 }}
                transition={{ type: 'timing', duration: 300 }}
                style={styles.slideContent}
              >
                <View style={styles.slideIconBg}>
                  <Coins size={rem(16)} color="#4F46E5" />
                </View>
                <Text style={styles.slideLabel}>VENTAS TOTALES</Text>
                <Text style={styles.slideValue}>
                  {CurrencyService.format(stats.totalSales)}
                </Text>
              </MotiView>
            ) : (
              <MotiView
                key="ticket-promedio"
                from={{ opacity: 0, scale: 0.9, translateY: 10 }}
                animate={{ opacity: 1, scale: 1, translateY: 0 }}
                exit={{ opacity: 0, scale: 0.9, translateY: -10 }}
                transition={{ type: 'timing', duration: 300 }}
                style={styles.slideContent}
              >
                <View style={styles.slideIconBg}>
                  <TrendingUp size={rem(16)} color="#4F46E5" />
                </View>
                <Text style={styles.slideLabel}>TICKET PROMEDIO</Text>
                <Text style={styles.slideValue}>
                  {CurrencyService.format(stats.avgTicket)}
                </Text>
              </MotiView>
            )}
          </AnimatePresence>

          <View style={styles.slideIndicatorRow}>
            <View style={[styles.slideIndicatorDot, currentSlide === 0 && styles.slideIndicatorDotActive]} />
            <View style={[styles.slideIndicatorDot, currentSlide === 1 && styles.slideIndicatorDotActive]} />
          </View>
        </View>

        <View style={styles.diagonalSplit} />

        <View style={styles.rightStatsContainer}>
          <View style={styles.rightKpiItem}>
            <View style={[styles.rightKpiIconBg, { backgroundColor: '#EEF2FF' }]}>
              <ShoppingBag size={rem(13)} color="#6366F1" />
            </View>
            <View style={styles.rightKpiTexts}>
              <Text style={styles.rightKpiLabel}>ABIERTAS</Text>
              <Text style={styles.rightKpiValue}>{stats.openCount}</Text>
            </View>
          </View>

          <View style={styles.rightKpiItem}>
            <View style={[styles.rightKpiIconBg, { backgroundColor: '#ECFDF5' }]}>
              <CheckCircle2 size={rem(13)} color="#10B981" />
            </View>
            <View style={styles.rightKpiTexts}>
              <Text style={styles.rightKpiLabel}>COBRADAS</Text>
              <Text style={styles.rightKpiValue}>{stats.closedCount}</Text>
            </View>
          </View>

          <View style={styles.rightKpiItem}>
            <View style={[styles.rightKpiIconBg, { backgroundColor: '#FEF2F2' }]}>
              <XCircle size={rem(13)} color="#EF4444" />
            </View>
            <View style={styles.rightKpiTexts}>
              <Text style={styles.rightKpiLabel}>ANULADAS</Text>
              <Text style={styles.rightKpiValue}>{stats.cancelledCount}</Text>
            </View>
          </View>
        </View>
      </View>

      <CajaOrdersFilterBar filters={filters} setFilters={setFilters} registers={registers} />

      {/* Orders List */}
      {loadingOrders ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando órdenes...</Text>
        </View>
      ) : filteredOrders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <FileText size={rem(28)} color="#94A3B8" />
          </View>
          <Text style={styles.emptyTitle}>Sin órdenes</Text>
          <Text style={styles.emptySubtitle}>No se encontraron órdenes con estos filtros</Text>
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          renderItem={({ item, index }) => (
            <OrderCard
              order={item}
              index={index}
              tablesList={tablesList}
              onPress={handleOrderPress}
            />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.ordersListContainer}
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
        />
      )}

      <OrderDetailsModal
        visible={isModalVisible}
        order={selectedOrder}
        onClose={() => setIsModalVisible(false)}
        onCancelOrder={handleCancelOrder}
        onPrintOrder={handlePrintOrder}
      />
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const SHADOW_SM = Platform.select({
  ios: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  android: { elevation: 2 },
}) as any;

const SHADOW_MD = Platform.select({
  ios: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
  },
  android: { elevation: 4 },
}) as any;

const getStyles = (colors: any, mode: string) => StyleSheet.create({
  container: { flex: 1 },

  // ── Loading & Empty ──
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: rem(60),
  },
  loadingText: {
    marginTop: rem(12),
    color: colors.textMuted,
    fontSize: rem(13),
    fontFamily: 'Inter-Regular',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: rem(50),
    backgroundColor: mode === 'light' ? '#F8FAFC' : '#0F172A',
    borderRadius: rem(20),
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: mode === 'light' ? '#E2E8F0' : '#334155',
    gap: rem(8),
    marginTop: rem(20),
  },
  emptyIconCircle: {
    width: rem(56),
    height: rem(56),
    borderRadius: rem(28),
    backgroundColor: mode === 'light' ? '#F1F5F9' : '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: rem(4),
  },
  emptyTitle: {
    fontSize: rem(15),
    fontWeight: '700',
    color: colors.text,
    fontFamily: 'Inter-Bold',
  },
  emptySubtitle: {
    fontSize: rem(12),
    color: colors.textMuted,
    fontFamily: 'Inter-Regular',
  },

  // ── Orders List ──
  ordersListContainer: {
    gap: rem(10),
    marginTop: rem(5),
    paddingBottom: rem(20),
  },

  // ── Card ──
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: rem(13),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: mode === 'light' ? '#F1F5F9' : '#334155',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: mode === 'light' ? 0.07 : 0.2,
        shadowRadius: 12,
      },
      android: { elevation: 4 },
    }),
  },
  accentBar: {
    width: rem(3),
    borderTopLeftRadius: rem(13),
    borderBottomLeftRadius: rem(13),
  },
  cardContent: {
    flex: 1,
    paddingVertical: rem(10),
    paddingLeft: rem(10),
    paddingRight: rem(12),
    gap: rem(8),
  },

  // ── Card Top Row ──
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardIdTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rem(6),
  },
  cardOrderId: {
    fontSize: rem(10.5),
    fontWeight: '800',
    color: colors.text,
    fontFamily: 'Inter-Black',
    letterSpacing: 0.2,
  },
  cardTimePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rem(3),
    backgroundColor: mode === 'light' ? '#F8FAFC' : '#0F172A',
    paddingHorizontal: rem(6),
    paddingVertical: rem(2),
    borderRadius: rem(8),
  },
  cardTimeText: {
    fontSize: rem(8.5),
    color: colors.textMuted,
    fontFamily: 'Inter-Medium',
  },

  // ── Status Chip ──
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rem(4),
    paddingHorizontal: rem(8),
    paddingVertical: rem(3),
    borderRadius: rem(16),
  },
  statusDot: {
    width: rem(5),
    height: rem(5),
    borderRadius: rem(2.5),
  },
  statusLabel: {
    fontSize: rem(8.5),
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
    letterSpacing: 0.1,
  },

  // ── Card Middle Row ──
  cardMiddleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rem(8),
    flex: 1,
  },
  customerAvatarBg: {
    width: rem(26),
    height: rem(26),
    borderRadius: rem(8),
    backgroundColor: mode === 'light' ? '#EEF2FF' : '#1E1B4B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  customerTexts: {
    flex: 1,
    gap: rem(2),
  },
  customerName: {
    fontSize: rem(12),
    fontWeight: '700',
    color: colors.text,
    fontFamily: 'Inter-Bold',
    letterSpacing: -0.2,
  },
  typeMicroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: rem(3),
    paddingHorizontal: rem(5),
    paddingVertical: rem(1.5),
    borderRadius: rem(5),
  },
  typeMicroText: {
    fontSize: rem(7.5),
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },

  // ── Card Bottom Row ──
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: rem(3),
    borderTopWidth: 1,
    borderTopColor: mode === 'light' ? '#F8FAFC' : '#334155',
  },
  creatorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rem(4),
    paddingHorizontal: rem(6),
    paddingVertical: rem(2.5),
    borderRadius: rem(6),
    flexShrink: 1,
    maxWidth: '65%',
  },
  creatorText: {
    fontSize: rem(9.5),
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
    flexShrink: 1,
  },
  totalSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rem(8),
  },
  totalAmount: {
    fontSize: rem(14),
    fontWeight: '900',
    color: colors.text,
    fontFamily: 'Inter-Black',
    letterSpacing: -0.4,
  },
  chevronCircle: {
    width: rem(22),
    height: rem(22),
    borderRadius: rem(11),
    backgroundColor: mode === 'light' ? '#EEF2FF' : '#1E1B4B',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Stats Banner (preserved) ──
  statsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: rem(18),
    borderWidth: 1,
    borderColor: mode === 'light' ? '#E2E8F0' : '#334155',
    marginBottom: rem(14),
    overflow: 'hidden',
    height: rem(88),
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: mode === 'light' ? 0.04 : 0.2,
        shadowRadius: 4,
      },
      android: { elevation: 2 },
    }),
  },
  leftSlideContainer: {
    width: '42%',
    height: '100%',
    backgroundColor: mode === 'light' ? '#F8FAFC' : '#0F172A',
    justifyContent: 'center',
    paddingLeft: rem(14),
    paddingRight: rem(6),
    position: 'relative',
  },
  slideContent: {
    justifyContent: 'center',
    height: '100%',
  },
  slideIconBg: {
    width: rem(28),
    height: rem(28),
    borderRadius: rem(8),
    backgroundColor: mode === 'light' ? '#EFF1FE' : '#1E1B4B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: rem(4),
  },
  slideLabel: {
    fontSize: rem(8),
    fontWeight: 'bold',
    color: colors.textMuted,
    fontFamily: 'Inter-Bold',
    letterSpacing: 0.5,
  },
  slideValue: {
    fontSize: rem(12),
    fontWeight: '900',
    color: colors.text,
    fontFamily: 'Inter-Black',
    marginTop: rem(2),
  },
  slideIndicatorRow: {
    position: 'absolute',
    bottom: rem(6),
    left: rem(14),
    flexDirection: 'row',
    gap: rem(4),
  },
  slideIndicatorDot: {
    width: rem(4),
    height: rem(4),
    borderRadius: rem(2),
    backgroundColor: mode === 'light' ? '#CBD5E1' : '#475569',
  },
  slideIndicatorDotActive: {
    backgroundColor: colors.primary,
    width: rem(10),
  },
  diagonalSplit: {
    width: rem(16),
    height: '150%',
    backgroundColor: colors.surface,
    transform: [{ rotate: '15deg' }],
    marginLeft: rem(-8),
    marginRight: rem(-8),
    zIndex: 10,
  },
  rightStatsContainer: {
    flex: 1,
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: rem(8),
    backgroundColor: colors.surface,
  },
  rightKpiItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: rem(4),
  },
  rightKpiIconBg: {
    width: rem(24),
    height: rem(24),
    borderRadius: rem(8),
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightKpiTexts: {
    alignItems: 'center',
  },
  rightKpiLabel: {
    fontSize: rem(7),
    fontWeight: 'bold',
    color: colors.textMuted,
    fontFamily: 'Inter-Bold',
    letterSpacing: 0.2,
  },
  rightKpiValue: {
    fontSize: rem(12),
    fontWeight: 'bold',
    color: colors.text,
    fontFamily: 'Inter-Bold',
    marginTop: rem(1),
  },
});
