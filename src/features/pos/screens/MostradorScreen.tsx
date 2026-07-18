import React, { useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  FlatList, 
  Platform,
  RefreshControl,
  InteractionManager,
  ActivityIndicator
} from 'react-native';
import { 
  Store, 
  Clock, 
  Trash2, 
  ChevronRight, 
  ShoppingBasket,
  Plus,
  Layers,
  DollarSign,
  PlusCircle
} from 'lucide-react-native';
import { MotiView } from 'moti';
import { MotiPressable } from 'moti/interactions';
import * as Haptics from 'expo-haptics';
import { rem } from '@/core/utils/responsive';
import { COLORS, useTheme } from '@/core/theme/theme';
import { useAppDispatch, useAppSelector } from '@/core/store/store';
import { fetchPendingOrders, clearCart, setOrderType, setActiveOrderId, restoreOrder, PendingOrder } from '@/core/store/slices/cartSlice';
import { CurrencyService } from '@/core/services/currencyService';
import { CartModal } from '../components/CartModal';
import { DashboardHeader } from '../components/DashboardLayout';
import { PosSubHeader, PosTab } from '../components/PosSubHeader';
import { SoundService } from '@/core/services/soundService';
import { FloatingCart } from '../components/FloatingCart';

/**
 * ARCHITECTURE: Senior Lead Redux Mostrador Screen
 * -----------------------------------------------
 * Consumes pending counter orders from Redux.
 */

export const MostradorScreen = ({ onNavigate }: { onNavigate: (tab: PosTab, cartId?: string) => void }) => {
  const { colors, mode } = useTheme();
  const styles = getStyles(colors, mode);
  const dispatch = useAppDispatch();
  const { pendingOrders, loading } = useAppSelector(state => state.cart);
  
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [isCartVisible, setIsCartVisible] = React.useState(false);

  const loadData = React.useCallback(async () => {
    setIsRefreshing(true);
    await dispatch(fetchPendingOrders() as any);
    setIsRefreshing(false);
  }, [dispatch]);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      loadData();
    });
    return () => {
      if (task && typeof task.cancel === 'function') {
        task.cancel();
      }
    };
  }, [loadData]);

  const handleRestore = (order: PendingOrder) => {
    SoundService.playClick();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // In Redux, restoring an order means setting it as the active context
    dispatch(restoreOrder(order));
    onNavigate('POS'); 
  };

  const handleDelete = (id: string) => {
    SoundService.playError();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    // TODO: Implement cancelOrder thunk in cartSlice
    console.log('Delete order:', id);
  };

  const handleCreateOrder = () => {
    SoundService.playClick();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    dispatch(clearCart());
    dispatch(setOrderType('MOSTRADOR'));
    onNavigate('POS');
  };

  const renderOrder = ({ item, index }: { item: PendingOrder; index: number }) => {
    const displayId = item.id?.includes('-') 
      ? item.id.split('-')[1].slice(0, 5) 
      : (item.id?.slice(-5) || '00000');

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

    const dateTimeStr = formatOrderDate(item.timestamp);
    const itemsCount = item.items?.length ?? 0;

    return (
      <MotiView
        from={{ opacity: 0, translateY: 18, scale: 0.97 }}
        animate={{ opacity: 1, translateY: 0, scale: 1 }}
        transition={{ delay: Math.min(index * 70, 350), type: 'timing', duration: 350 }}
      >
        <MotiPressable 
          onPress={() => handleRestore(item)}
          animate={({ pressed }: { pressed: boolean }) => {
            'worklet';
            return { scale: pressed ? 0.97 : 1 };
          }}
          style={styles.orderCard}
        >
          {/* Left Accent Bar */}
          <View style={styles.accentBar} />

          {/* Card Content */}
          <View style={styles.cardContent}>
            {/* Row 1: ID + Time + Status */}
            <View style={styles.cardTopRow}>
              <View style={styles.cardIdTimeRow}>
                <Text style={styles.orderIdText}>#{displayId}</Text>
                <View style={styles.cardTimePill}>
                  <Clock size={rem(10)} color={colors.textMuted} />
                  <Text style={styles.timeText}>{dateTimeStr}</Text>
                </View>
              </View>
              <View style={styles.statusChip}>
                <View style={styles.statusDot} />
                <Text style={styles.statusLabel}>Pendiente</Text>
              </View>
            </View>

            {/* Row 2: Customer + Type */}
            <View style={styles.cardMiddleRow}>
              <View style={styles.customerAvatarBg}>
                <Store size={rem(13)} color="#6366F1" />
              </View>
              <View style={styles.customerTexts}>
                <Text style={styles.customerName} numberOfLines={1}>
                  {item.customerName || 'Cliente General'}
                </Text>
                <View style={styles.typeBadge}>
                  <Store size={rem(9)} color={colors.primary} />
                  <Text style={styles.typeBadgeText}>MOSTRADOR</Text>
                </View>
              </View>
            </View>

            {/* Row 3: Items + Total + Actions */}
            <View style={styles.orderFooter}>
              <View style={styles.itemsCountPill}>
                <ShoppingBasket size={rem(10)} color={colors.textMuted} />
                <Text style={styles.itemsCountText}>
                  {itemsCount} {itemsCount === 1 ? 'producto' : 'productos'}
                </Text>
              </View>

              <View style={styles.totalAndActions}>
                <Text style={styles.orderTotal}>
                  {CurrencyService.format(item.total || 0)}
                </Text>
                <View style={styles.footerActions}>
                  <MotiPressable 
                    onPress={() => handleDelete(item.id)}
                    animate={({ pressed }: { pressed: boolean }) => {
                      'worklet';
                      return { scale: pressed ? 0.8 : 1 };
                    }}
                    style={styles.deleteBtn}
                  >
                    <Trash2 size={rem(13)} color="#EF4444" />
                  </MotiPressable>
                  <View style={styles.restoreBtn}>
                    <ChevronRight size={rem(14)} color="#6366F1" />
                  </View>
                </View>
              </View>
            </View>
          </View>
        </MotiPressable>
      </MotiView>
    );
  };

  return (
    <View style={styles.container}>
      <DashboardHeader />

      <PosSubHeader 
        activeTab="MOSTRADOR" 
        title="MOSTRADOR" 
        onNavigate={onNavigate} 
      />

      <View style={styles.outerContent}>
        <View style={styles.bentoContainer}>
          <View style={styles.statsRow}>
            <MotiView 
              from={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              style={[styles.statCard, { backgroundColor: mode === 'light' ? '#EEF2FF' : colors.primary + '20' }]}
            >
              <View style={styles.statIconCircle}>
                <Layers size={rem(14)} color="#6366F1" />
              </View>
              <View>
                <Text style={styles.statLabel}>Ordenes</Text>
                <Text style={[styles.statValue, { color: '#6366F1' }]}>{pendingOrders.length}</Text>
              </View>
            </MotiView>

            <MotiView 
              from={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 100 }}
              style={[styles.statCard, { backgroundColor: mode === 'light' ? '#F0FDF4' : '#14532D20' }]}
            >
              <View style={[styles.statIconCircle, { backgroundColor: mode === 'light' ? '#DCFCE7' : '#14532D40' }]}>
                <DollarSign size={rem(14)} color="#16A34A" />
              </View>
              <View>
                <Text style={styles.statLabel}>Valor Total</Text>
                <Text style={[styles.statValue, { color: '#16A34A' }]}>
                  {CurrencyService.format(pendingOrders.reduce((sum, o) => sum + (o.total || 0), 0))}
                </Text>
              </View>
            </MotiView>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Pedidos en Espera</Text>
            <MotiPressable 
              onPress={handleCreateOrder}
              animate={({ pressed }: { pressed: boolean }) => {
                'worklet';
                return { scale: pressed ? 0.95 : 1 };
              }}
              style={styles.addOrderBtn}
            >
              <PlusCircle size={rem(14)} color="#FFF" />
              <Text style={styles.addOrderBtnText}>Nueva Orden</Text>
            </MotiPressable>
          </View>

          {loading.orders && pendingOrders.length === 0 ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Cargando pedidos del mostrador...</Text>
            </View>
          ) : pendingOrders.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MotiView
                from={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                style={styles.emptyIconCircle}
              >
                <ShoppingBasket size={rem(30)} color="#6366F1" />
              </MotiView>
              <Text style={styles.emptyTitle}>Sin órdenes en espera</Text>
              <Text style={styles.emptySubtitle}>¿Quieres abrir una nueva venta en el mostrador?</Text>
              
              <MotiPressable 
                onPress={handleCreateOrder}
                animate={({ pressed }: { pressed: boolean }) => {
                  'worklet';
                  return { scale: pressed ? 0.95 : 1 };
                }}
                style={styles.createFirstBtn}
              >
                <Plus size={rem(16)} color="#FFF" />
                <Text style={styles.createFirstBtnText}>Crear Nueva Orden</Text>
              </MotiPressable>
            </View>
          ) : (
            <FlatList
              data={pendingOrders}
              renderItem={renderOrder}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={loadData}
                  tintColor={colors.primary}
                />
              }
            />
          )}
        </View>
      </View>

      <FloatingCart onPress={() => setIsCartVisible(true)} />

      <CartModal 
        isVisible={isCartVisible} 
        onClose={() => setIsCartVisible(false)} 
        onNavigateToCheckout={() => onNavigate('CHECKOUT' as PosTab)}
        onNavigateToPersonalizar={(cartId) => onNavigate('PERSONALIZAR' as any, cartId)}
      />
    </View>
  );
};

const getStyles = (colors: any, mode: string) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background, 
  },
  outerContent: {
    flex: 1,
    paddingHorizontal: rem(12),
    paddingBottom: rem(12),
  },
  bentoContainer: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: rem(30),
    padding: rem(15),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  statsRow: {
    flexDirection: 'row',
    gap: rem(10),
    marginBottom: rem(18),
  },
  statCard: {
    flex: 1,
    padding: rem(10),
    borderRadius: rem(18),
    flexDirection: 'row',
    alignItems: 'center',
    gap: rem(8),
  },
  statIconCircle: {
    width: rem(26),
    height: rem(26),
    borderRadius: rem(13),
    backgroundColor: mode === 'light' ? '#E0E7FF' : colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: rem(8),
    color: colors.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: rem(14),
    fontWeight: '800',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: rem(10),
    marginTop: rem(5),
  },
  sectionTitle: {
    fontSize: rem(13),
    fontWeight: '800',
    color: colors.text,
  },
  addOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: rem(10),
    paddingVertical: rem(6),
    borderRadius: rem(10),
    gap: rem(6),
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  addOrderBtnText: {
    color: '#FFFFFF',
    fontSize: rem(10),
    fontWeight: '800',
  },
  listContent: {
    paddingBottom: rem(80),
  },
  orderCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: rem(13),
    marginBottom: rem(10),
    borderWidth: 1,
    borderColor: mode === 'light' ? '#F1F5F9' : '#334155',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
    }),
  },
  accentBar: {
    width: rem(3),
    backgroundColor: '#6366F1',
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
  orderIdText: {
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
    backgroundColor: mode === 'light' ? '#F8FAFC' : '#1E293B',
    paddingHorizontal: rem(6),
    paddingVertical: rem(2),
    borderRadius: rem(8),
  },
  timeText: {
    fontSize: rem(8.5),
    color: colors.textMuted,
    fontFamily: 'Inter-Medium',
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rem(4),
    paddingHorizontal: rem(8),
    paddingVertical: rem(3),
    borderRadius: rem(16),
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
  },
  statusDot: {
    width: rem(5),
    height: rem(5),
    borderRadius: rem(2.5),
    backgroundColor: '#F59E0B',
  },
  statusLabel: {
    fontSize: rem(8.5),
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
    color: '#D97706',
    letterSpacing: 0.1,
  },
  cardMiddleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rem(8),
  },
  customerAvatarBg: {
    width: rem(26),
    height: rem(26),
    borderRadius: rem(8),
    backgroundColor: mode === 'light' ? '#EEF2FF' : colors.primary + '20',
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
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rem(3),
    backgroundColor: mode === 'light' ? '#EEF2FF' : colors.primary + '20',
    alignSelf: 'flex-start',
    paddingHorizontal: rem(5),
    paddingVertical: rem(1.5),
    borderRadius: rem(5),
  },
  typeBadgeText: {
    fontSize: rem(7.5),
    fontWeight: '700',
    color: colors.primary,
    fontFamily: 'Inter-Bold',
    letterSpacing: 0.2,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: mode === 'light' ? '#F8FAFC' : '#1E293B',
    paddingTop: rem(5),
  },
  itemsCountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rem(4),
  },
  itemsCountText: {
    fontSize: rem(9.5),
    color: colors.textMuted,
    fontFamily: 'Inter-Medium',
  },
  totalAndActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rem(8),
  },
  orderTotal: {
    fontSize: rem(13.5),
    fontWeight: '900',
    color: colors.text,
    fontFamily: 'Inter-Black',
    letterSpacing: -0.4,
  },
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rem(5),
  },
  deleteBtn: {
    width: rem(22),
    height: rem(22),
    borderRadius: rem(11),
    backgroundColor: mode === 'light' ? '#FEF2F2' : '#EF444420',
    justifyContent: 'center',
    alignItems: 'center',
  },
  restoreBtn: {
    width: rem(22),
    height: rem(22),
    borderRadius: rem(11),
    backgroundColor: mode === 'light' ? '#EEF2FF' : colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: rem(40),
  },
  emptyTitle: {
    fontSize: rem(14),
    fontWeight: '800',
    color: colors.textMuted,
    marginTop: rem(15),
  },
  emptySubtitle: {
    fontSize: rem(11),
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: rem(30),
    marginBottom: rem(20),
    lineHeight: rem(16),
  },
  emptyIconCircle: {
    width: rem(70),
    height: rem(70),
    borderRadius: rem(35),
    backgroundColor: mode === 'light' ? '#EEF2FF' : colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: rem(10),
  },
  createFirstBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: rem(20),
    paddingVertical: rem(12),
    borderRadius: rem(18),
    gap: rem(8),
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  createFirstBtnText: {
    color: '#FFFFFF',
    fontSize: rem(13),
    fontWeight: '800',
  },
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
});
