import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet, View, Text, Modal, TouchableOpacity,
  ScrollView, Dimensions, ActivityIndicator, Platform,
  PanResponder, Animated,
} from 'react-native';
import {
  X, Printer, User, DollarSign, XCircle, MessageSquare,
  Phone, MapPin, Receipt, Package, Clock, Store,
  UtensilsCrossed, ChevronDown,
} from 'lucide-react-native';
import { rem } from '@/core/utils/responsive';
import { CurrencyService } from '@/core/services/currencyService';
import { OrderService } from '@/infrastructure/services/orderService';
import { useTheme } from '@/core/theme/theme';
import * as Haptics from 'expo-haptics';

// ─── Status Helpers ──────────────────────────────────────────────────────────
const STATUS_CLOSED = ['COBRADA', 'CLOSED', 'CERRADA', 'PAGADO', 'PAGADA'];
const STATUS_CANCELLED = ['ANULADA', 'CANCELLED', 'ELIMINADA'];

const getStatusCategory = (status: string): 'closed' | 'cancelled' | 'open' => {
  const s = String(status || '').toUpperCase();
  if (STATUS_CLOSED.includes(s)) return 'closed';
  if (STATUS_CANCELLED.includes(s)) return 'cancelled';
  return 'open';
};

const STATUS_THEME = {
  open: { color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.25)', label: 'Abierta' },
  closed: { color: '#10B981', bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.25)', label: 'Cobrada' },
  cancelled: { color: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.25)', label: 'Anulada' },
} as const;

const TYPE_THEME: Record<string, { icon: any; color: string; bg: string }> = {
  MOSTRADOR: { icon: Store, color: '#6366F1', bg: 'rgba(99, 102, 241, 0.1)' },
  MESA: { icon: UtensilsCrossed, color: '#10B981', bg: 'rgba(16, 185, 129, 0.1)' },
};

// ─── Interface ───────────────────────────────────────────────────────────────
interface OrderDetailsModalProps {
  visible: boolean;
  order: any;
  onClose: () => void;
  onCancelOrder?: (orderId: string) => void;
  onPrintOrder?: (orderId: string) => void;
}

const { height: SCREEN_H } = Dimensions.get('window');

// ─── Component ───────────────────────────────────────────────────────────────
export const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
  visible, order, onClose, onCancelOrder, onPrintOrder,
}) => {
  const { colors, mode } = useTheme();
  const s = getStyles(colors, mode);

  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (visible && order) {
      setDetails(order);
      setItems(order.items || []);

      // If items are empty, fetch complete order details (Metadata + Items) dynamically from DB
      if (!order.items || order.items.length === 0) {
        setLoading(true);
        OrderService.getOrder(order.id)
          .then((res) => {
            if (res) {
              setItems(res.items || []);
              if (res.metadata) {
                setDetails((prev: any) => ({
                  ...prev,
                  customerPhone: res.metadata.customer_phone || res.metadata.credit_info?.phone || prev?.customerPhone || '',
                  waiterName: res.metadata.opened_by_name || prev?.waiterName || 'Desconocido',
                  notas: res.metadata.notas || prev?.notas || '',
                  mesaId: res.metadata.mesa_id || prev?.mesaId || '',
                }));
              }
            }
          })
          .catch((err) => {
            console.error('❌ Error fetching complete order details in Modal:', err);
          })
          .finally(() => setLoading(false));
      }
    } else {
      setDetails(null);
      setItems([]);
      setLoading(false);
    }
  }, [visible, order]);

  const handleClose = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    closeWithAnim();
  }, [onClose]);

  // Animated translateY for real-time progressive sliding
  const translateY = useRef(new Animated.Value(0)).current;

  const closeWithAnim = useCallback(() => {
    Animated.timing(translateY, {
      toValue: 800,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  }, [onClose, translateY]);

  // PanResponder for swipe-to-dismiss on drag header
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 5,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        } else {
          translateY.setValue(0);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 120 || gestureState.vy > 0.4) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          Animated.timing(translateY, {
            toValue: 800,
            duration: 250,
            useNativeDriver: true,
          }).start(() => {
            onClose();
          });
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            friction: 6,
            tension: 40,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  // Entry spring animation
  useEffect(() => {
    if (visible) {
      translateY.setValue(800);
      Animated.spring(translateY, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  if (!details) return null;

  const statusCat = getStatusCategory(details.status);
  const sTheme = STATUS_THEME[statusCat];
  const isClosed = statusCat === 'closed';
  const isCancelled = statusCat === 'cancelled';

  const typeUpper = String(details.order_type || '').toUpperCase();
  const tTheme = TYPE_THEME[typeUpper] || { icon: Package, color: '#64748B', bg: 'rgba(100,116,139,0.1)' };
  const TypeIcon = tTheme.icon;

  const orderId = String(details.id || '').slice(-6).toUpperCase();
  const dateStr = new Date(details.timestamp).toLocaleDateString();
  const timeStr = new Date(details.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return visible ? (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <View style={s.overlay}>
        <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={handleClose} />

        <Animated.View style={[s.sheet, { transform: [{ translateY }] }]}>
          {/* Drag Handle — enlarged zone for comfortable swipe */}
          <View style={s.handleRow} {...panResponder.panHandlers}>
            <View style={s.handle} />
          </View>

          {/* Header */}
          <View style={s.header}>
            <View style={s.headerLeft}>
              <View style={s.headerIdCircle}>
                <Receipt size={rem(16)} color={colors.primary} />
              </View>
              <View>
                <Text style={s.headerTitle}>Orden #{orderId}</Text>
                <View style={s.headerDateRow}>
                  <Clock size={rem(10)} color={colors.textMuted} />
                  <Text style={s.headerDate}>{dateStr} • {timeStr}</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity onPress={handleClose} style={s.closeBtn}>
              <X size={rem(20)} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Badges Row */}
          <View style={s.badgesRow}>
            <View style={[s.statusChip, { backgroundColor: sTheme.bg, borderColor: sTheme.border }]}>
              <View style={[s.statusDot, { backgroundColor: sTheme.color }]} />
              <Text style={[s.statusChipText, { color: sTheme.color }]}>{sTheme.label}</Text>
            </View>
            <View style={[s.typeChip, { backgroundColor: tTheme.bg }]}>
              <TypeIcon size={rem(11)} color={tTheme.color} />
              <Text style={[s.typeChipText, { color: tTheme.color }]}>{typeUpper || 'ORDEN'}</Text>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
            {/* Info Cards */}
            <View style={s.infoGrid}>
              <View style={s.infoCard}>
                <View style={[s.infoIconBg, { backgroundColor: mode === 'light' ? '#EEF2FF' : '#1E1B4B' }]}>
                  <User size={rem(14)} color="#6366F1" />
                </View>
                <View style={s.infoTexts}>
                  <Text style={s.infoLabel}>Cliente</Text>
                  <Text style={s.infoValue} numberOfLines={1}>{details.customerName || 'Sin Nombre'}</Text>
                </View>
              </View>
              <View style={s.infoCard}>
                <View style={[s.infoIconBg, { backgroundColor: mode === 'light' ? '#F0FDF4' : '#064E3B' }]}>
                  <Receipt size={rem(14)} color="#10B981" />
                </View>
                <View style={s.infoTexts}>
                  <Text style={s.infoLabel}>Registrado por</Text>
                  <Text style={s.infoValue} numberOfLines={1}>{details.waiterName || 'Sistema'}</Text>
                </View>
              </View>
            </View>

            {/* Extra Metadata (Mesa / Phone) */}
            {(details.mesaId || details.customerPhone) && (
              <View style={s.infoGrid}>
                {details.mesaId ? (
                  <View style={s.infoCard}>
                    <View style={[s.infoIconBg, { backgroundColor: mode === 'light' ? '#FEF3C7' : '#78350F' }]}>
                      <MapPin size={rem(14)} color="#D97706" />
                    </View>
                    <View style={s.infoTexts}>
                      <Text style={s.infoLabel}>Mesa</Text>
                      <Text style={s.infoValue}>#{String(details.mesaId).replace('MESA#', '')}</Text>
                    </View>
                  </View>
                ) : null}
                {details.customerPhone ? (
                  <View style={s.infoCard}>
                    <View style={[s.infoIconBg, { backgroundColor: mode === 'light' ? '#EEF2FF' : '#1E1B4B' }]}>
                      <Phone size={rem(14)} color="#6366F1" />
                    </View>
                    <View style={s.infoTexts}>
                      <Text style={s.infoLabel}>Contacto</Text>
                      <Text style={s.infoValue}>{details.customerPhone}</Text>
                    </View>
                  </View>
                ) : null}
              </View>
            )}

            {/* Notes */}
            {details.notas ? (
              <View style={s.notesCard}>
                <View style={s.notesHeader}>
                  <MessageSquare size={rem(13)} color="#D97706" />
                  <Text style={s.notesTitle}>Notas</Text>
                </View>
                <Text style={s.notesBody}>{details.notas}</Text>
              </View>
            ) : null}

            {/* Products */}
            <View style={s.sectionHeader}>
              <Package size={rem(14)} color={colors.text} />
              <Text style={s.sectionTitle}>Detalle de Productos</Text>
              <Text style={s.sectionCount}>{items.length}</Text>
            </View>

            {loading ? (
              <View style={s.loadingBox}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={s.loadingText}>Consultando productos...</Text>
              </View>
            ) : items.length > 0 ? (
              <View style={s.itemsList}>
                {items.map((item: any, idx: number) => {
                  const qty = parseInt(item.cantidad || item.quantity || '1', 10);
                  const price = parseFloat(item.precio || item.price || item.unit_price || '0');
                  return (
                    <View key={idx} style={[s.itemRow, idx === items.length - 1 && { borderBottomWidth: 0, paddingBottom: 0 }]}>
                      <View style={s.itemQtyBox}>
                        <Text style={s.itemQtyText}>{qty}</Text>
                      </View>
                      <View style={s.itemInfo}>
                        <Text style={s.itemName} numberOfLines={1}>
                          {item.nombre || item.name || item.product_name || 'Producto'}
                        </Text>
                        <Text style={s.itemUnitPrice}>{CurrencyService.format(price)} c/u</Text>
                        {item.notas ? <Text style={s.itemNote}>📝 {item.notas}</Text> : null}
                      </View>
                      <Text style={s.itemTotal}>{CurrencyService.format(price * qty)}</Text>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={s.emptyItems}>
                <Package size={rem(16)} color={colors.textMuted} />
                <Text style={s.emptyItemsText}>Sin detalles disponibles</Text>
              </View>
            )}

            {/* Payments */}
            {isClosed && details.payments && details.payments.length > 0 && (
              <>
                <View style={[s.sectionHeader, { marginTop: rem(20) }]}>
                  <DollarSign size={rem(14)} color={colors.text} />
                  <Text style={s.sectionTitle}>Pagos</Text>
                </View>
                <View style={s.paymentsList}>
                  {details.payments.map((p: any, idx: number) => (
                    <View key={idx} style={s.paymentRow}>
                      <View style={s.paymentLeft}>
                        <View style={s.paymentIconBg}>
                          <DollarSign size={rem(12)} color="#10B981" />
                        </View>
                        <Text style={s.paymentMethod}>
                          {p.metodo || p.name || p.method || p.type || 'Efectivo'}
                        </Text>
                      </View>
                      <Text style={s.paymentAmount}>
                        {CurrencyService.format(parseFloat(p.monto || p.amount || '0'))}
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* Total Banner */}
            <View style={s.totalBanner}>
              <View>
                <Text style={s.totalLabel}>Total a pagar</Text>
                <Text style={s.totalAmount}>{CurrencyService.format(details.total)}</Text>
              </View>
              <View style={s.totalIconCircle}>
                <DollarSign size={rem(18)} color="#FFFFFF" />
              </View>
            </View>
          </ScrollView>

          {/* Actions */}
          <View style={s.actionsRow}>
            {!isCancelled && onPrintOrder && (
              <TouchableOpacity
                style={s.actionBtn}
                activeOpacity={0.7}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPrintOrder(details.id); }}
              >
                <Printer size={rem(16)} color={colors.primary} />
                <Text style={s.actionBtnText}>Imprimir</Text>
              </TouchableOpacity>
            )}
            {!isCancelled && !isClosed && onCancelOrder && (
              <TouchableOpacity
                style={[s.actionBtn, s.actionBtnDanger]}
                activeOpacity={0.7}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onCancelOrder(details.id); }}
              >
                <XCircle size={rem(16)} color="#EF4444" />
                <Text style={[s.actionBtnText, s.actionBtnDangerText]}>Anular</Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  ) : null;
};

const getStyles = (colors: any, mode: string) => StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
  },
  backdrop: { ...StyleSheet.absoluteFillObject },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: rem(24),
    borderTopRightRadius: rem(24),
    maxHeight: '88%',
    minHeight: '45%',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: mode === 'light' ? 0.12 : 0.3, shadowRadius: 20 },
      android: { elevation: 24 },
    }),
  },

  // Handle — enlarged comfortable drag zone
  handleRow: { alignItems: 'center', paddingTop: rem(16), paddingBottom: rem(10) },
  handle: { width: rem(48), height: rem(5), borderRadius: rem(2.5), backgroundColor: mode === 'light' ? '#CBD5E1' : '#475569' },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: rem(20),
    paddingBottom: rem(14),
    borderBottomWidth: 1,
    borderBottomColor: mode === 'light' ? '#F1F5F9' : '#334155',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: rem(12) },
  headerIdCircle: {
    width: rem(38),
    height: rem(38),
    borderRadius: rem(12),
    backgroundColor: mode === 'light' ? '#EEF2FF' : '#1E1B4B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: rem(16),
    fontWeight: '800',
    color: colors.text,
    fontFamily: 'Inter-Black',
    letterSpacing: -0.3,
  },
  headerDateRow: { flexDirection: 'row', alignItems: 'center', gap: rem(4), marginTop: rem(2) },
  headerDate: { fontSize: rem(11), color: colors.textMuted, fontFamily: 'Inter-Medium' },
  closeBtn: {
    width: rem(38),
    height: rem(38),
    borderRadius: rem(14),
    backgroundColor: mode === 'light' ? '#F1F5F9' : '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Badges
  badgesRow: {
    flexDirection: 'row',
    gap: rem(8),
    paddingHorizontal: rem(20),
    paddingVertical: rem(12),
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rem(6),
    paddingHorizontal: rem(12),
    paddingVertical: rem(5),
    borderRadius: rem(20),
    borderWidth: 1,
  },
  statusDot: { width: rem(7), height: rem(7), borderRadius: rem(4) },
  statusChipText: { fontSize: rem(11), fontWeight: '700', fontFamily: 'Inter-Bold' },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rem(5),
    paddingHorizontal: rem(10),
    paddingVertical: rem(5),
    borderRadius: rem(20),
  },
  typeChipText: { fontSize: rem(11), fontWeight: '700', fontFamily: 'Inter-Bold' },

  // Scroll
  scrollContent: { paddingHorizontal: rem(20), paddingBottom: rem(30) },

  // Info Grid
  infoGrid: { flexDirection: 'row', gap: rem(10), marginBottom: rem(12) },
  infoCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: rem(10),
    backgroundColor: mode === 'light' ? '#F8FAFC' : '#0F172A',
    padding: rem(12),
    borderRadius: rem(14),
    borderWidth: 1,
    borderColor: mode === 'light' ? '#F1F5F9' : '#334155',
  },
  infoIconBg: {
    width: rem(30),
    height: rem(30),
    borderRadius: rem(10),
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoTexts: { flex: 1 },
  infoLabel: { fontSize: rem(10), color: colors.textMuted, fontFamily: 'Inter-Medium' },
  infoValue: {
    fontSize: rem(12),
    color: colors.text,
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
    marginTop: rem(1),
  },

  // Notes
  notesCard: {
    backgroundColor: mode === 'light' ? '#FFFBEB' : '#78350F',
    borderRadius: rem(14),
    borderWidth: 1,
    borderColor: mode === 'light' ? '#FDE68A' : '#B45309',
    padding: rem(12),
    marginBottom: rem(16),
  },
  notesHeader: { flexDirection: 'row', alignItems: 'center', gap: rem(6), marginBottom: rem(6) },
  notesTitle: { fontSize: rem(12), fontWeight: '700', color: mode === 'light' ? '#B45309' : '#FDE68A', fontFamily: 'Inter-Bold' },
  notesBody: { fontSize: rem(12), color: mode === 'light' ? '#78350F' : '#FEF3C7', lineHeight: rem(18) },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rem(8),
    marginBottom: rem(10),
  },
  sectionTitle: {
    flex: 1,
    fontSize: rem(14),
    fontWeight: '700',
    color: colors.text,
    fontFamily: 'Inter-Bold',
  },
  sectionCount: {
    fontSize: rem(11),
    fontWeight: '700',
    color: colors.primary,
    backgroundColor: mode === 'light' ? '#EEF2FF' : '#1E1B4B',
    paddingHorizontal: rem(8),
    paddingVertical: rem(2),
    borderRadius: rem(8),
    fontFamily: 'Inter-Bold',
    overflow: 'hidden',
  },

  // Loading
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: rem(28),
    gap: rem(8),
  },
  loadingText: { fontSize: rem(11), color: colors.textMuted, fontStyle: 'italic' },

  // Items List
  itemsList: {
    backgroundColor: mode === 'light' ? '#F8FAFC' : '#0F172A',
    borderRadius: rem(14),
    borderWidth: 1,
    borderColor: mode === 'light' ? '#F1F5F9' : '#334155',
    padding: rem(12),
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: mode === 'light' ? '#F1F5F9' : '#334155',
    paddingBottom: rem(10),
    marginBottom: rem(10),
  },
  itemQtyBox: {
    width: rem(30),
    height: rem(30),
    backgroundColor: mode === 'light' ? '#EEF2FF' : '#1E1B4B',
    borderRadius: rem(10),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: rem(10),
  },
  itemQtyText: {
    fontSize: rem(12),
    color: mode === 'light' ? '#4F46E5' : '#8B5CF6',
    fontWeight: '800',
    fontFamily: 'Inter-Black',
  },
  itemInfo: { flex: 1 },
  itemName: {
    fontSize: rem(13),
    color: colors.text,
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
  },
  itemUnitPrice: { fontSize: rem(11), color: colors.textMuted, marginTop: rem(2), fontFamily: 'Inter-Medium' },
  itemNote: { fontSize: rem(10), color: '#D97706', marginTop: rem(3), fontWeight: '500' },
  itemTotal: {
    fontSize: rem(14),
    color: colors.text,
    fontWeight: '900',
    fontFamily: 'Inter-Black',
    marginLeft: rem(8),
  },

  // Empty Items
  emptyItems: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: rem(20),
    gap: rem(8),
    backgroundColor: mode === 'light' ? '#F8FAFC' : '#0F172A',
    borderRadius: rem(14),
  },
  emptyItemsText: { fontSize: rem(12), color: colors.textMuted, fontStyle: 'italic' },

  // Payments
  paymentsList: {
    backgroundColor: mode === 'light' ? '#F0FDF4' : '#064E3B',
    borderRadius: rem(14),
    borderWidth: 1,
    borderColor: mode === 'light' ? '#D1FAE5' : '#065F46',
    padding: rem(12),
    gap: rem(8),
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentLeft: { flexDirection: 'row', alignItems: 'center', gap: rem(8) },
  paymentIconBg: {
    width: rem(26),
    height: rem(26),
    borderRadius: rem(8),
    backgroundColor: mode === 'light' ? '#D1FAE5' : '#065F46',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentMethod: { fontSize: rem(13), color: mode === 'light' ? '#065F46' : '#A7F3D0', fontFamily: 'Inter-Medium' },
  paymentAmount: {
    fontSize: rem(14),
    color: mode === 'light' ? '#059669' : '#10B981',
    fontWeight: '800',
    fontFamily: 'Inter-Black',
  },

  // Total Banner
  totalBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: mode === 'light' ? '#0F172A' : '#1E293B',
    padding: rem(16),
    borderRadius: rem(16),
    marginTop: rem(20),
    ...Platform.select({
      ios: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  totalLabel: { fontSize: rem(11), color: '#94A3B8', fontFamily: 'Inter-Medium', letterSpacing: 0.3 },
  totalAmount: {
    fontSize: rem(22),
    color: '#FFFFFF',
    fontWeight: '900',
    fontFamily: 'Inter-Black',
    marginTop: rem(2),
    letterSpacing: -0.5,
  },
  totalIconCircle: {
    width: rem(40),
    height: rem(40),
    borderRadius: rem(20),
    backgroundColor: 'rgba(99, 102, 241, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Actions
  actionsRow: {
    flexDirection: 'row',
    paddingHorizontal: rem(20),
    paddingVertical: rem(12),
    gap: rem(10),
    borderTopWidth: 1,
    borderTopColor: mode === 'light' ? '#F1F5F9' : '#334155',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: mode === 'light' ? '#EEF2FF' : '#1E1B4B',
    paddingVertical: rem(14),
    borderRadius: rem(14),
    gap: rem(8),
    ...Platform.select({
      ios: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  actionBtnText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: rem(14),
    fontFamily: 'Inter-Bold',
  },
  actionBtnDanger: { backgroundColor: mode === 'light' ? '#FEF2F2' : '#7f1d1d' },
  actionBtnDangerText: { color: '#EF4444' },
});
