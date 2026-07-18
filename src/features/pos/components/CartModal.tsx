import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  Platform,
  Dimensions,
  Animated,
  PanResponder,
} from 'react-native';
import {
  X,
  Trash2,
  Minus,
  Plus,
  Clock,
  ShoppingBasket,
  ChevronDown,
  Send,
  Scissors,
  User,
  FileText,
  CreditCard,
  ShoppingBag,
  Footprints,
  Sliders
} from 'lucide-react-native';
import { TextInput } from 'react-native-gesture-handler';
import { useAppDispatch, useAppSelector } from '@/core/store/store';
import {
  removeFromCart,
  updateQuantity,
  clearCart,
  setOrderType,
  setLocation,
  setActiveOrderId,
  parkOrder,
  finalizeOrder,
  OrderType,
  toggleParaLlevar
} from '@/core/store/slices/cartSlice';
import { PosService } from '@/infrastructure/services/posService';
import { CurrencyService } from '@/core/services/currencyService';
import { rem } from '@/core/utils/responsive';
import { useStatusModal } from '@/core/context/StatusModalContext';
import { useTheme } from '@/core/theme/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface CartModalProps {
  isVisible: boolean;
  onClose: () => void;
  onNavigateToCheckout?: () => void;
  onNavigateToPersonalizar?: (cartId: string) => void;
}

const DISMISS_THRESHOLD = 120;
const VELOCITY_THRESHOLD = 0.5;

export const CartModal = ({ isVisible, onClose, onNavigateToCheckout, onNavigateToPersonalizar }: CartModalProps) => {
  const { colors, mode } = useTheme();
  const styles = getStyles(colors, mode);
  const dispatch = useAppDispatch();
  const { showStatus } = useStatusModal();
  const { cart, total, orderType, locationId, activeOrderId, tableOrders, pendingOrders } = useAppSelector(state => state.cart);
  const { selectedRegisterId } = useAppSelector(state => state.pos);
  interface Table {
    id: string;
    name: string;
    capacity?: number;
    [key: string]: any;
  }

  // Local state for tables since they are no longer in Redux
  const [tables, setTables] = React.useState<Table[]>([]);

  const [isProcessing, setIsProcessing] = React.useState(false);
  const [isFormExpanded, setIsFormExpanded] = React.useState(true);
  const [showTableSelector, setShowTableSelector] = React.useState(false);
  const [selectedCustomizingItem, setSelectedCustomizingItem] = React.useState<any | null>(null);
  const [isCustomizingVisible, setIsCustomizingVisible] = React.useState(false);

  // ── Bottom Sheet Animation ──────────────────────
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isVisible) {
      // Slide up
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 24,
          stiffness: 200,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Slide down
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: SCREEN_HEIGHT,
          useNativeDriver: true,
          damping: 24,
          stiffness: 200,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) => gs.dy > 8 && Math.abs(gs.dx) < 30,
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) {
          translateY.setValue(gs.dy);
        }
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > DISMISS_THRESHOLD || gs.vy > VELOCITY_THRESHOLD) {
          onClose();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            damping: 24,
            stiffness: 200,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (isVisible) {
      const loadTables = async () => {
        try {
          const data = await PosService.getTables();
          setTables(data);
        } catch (e) {
          console.error('Error loading tables in CartModal', e);
        }
      };
      loadTables();
    }
  }, [isVisible]);

  // Delivery/Order Info State
  const [orderInfo, setOrderInfo] = React.useState({
    customerName: '',
    phone: '',
    address: '',
    notes: '',
    tableId: ''
  });

  // Get active order details if any
  const activeOrder = pendingOrders.find(o => o.id === activeOrderId) || tableOrders.find(o => o.id === activeOrderId);

  console.log('🔍 [CartModal] State check:', {
    cartLength: cart.length,
    orderType,
    locationId,
    activeOrderId,
    hasActiveOrder: !!activeOrder,
    activeOrderTotal: activeOrder?.total || 0,
    isButtonDisabled: (cart.length === 0 && !activeOrder) || isProcessing
  });

  const handleParkOrder = async () => {
    try {
      setIsProcessing(true);
      const delivery_info = {
        customer_name: orderInfo.customerName || 'Mostrador',
        phone: orderInfo.phone,
        address: orderInfo.address,
        notes: orderInfo.notes
      };
      await dispatch(parkOrder(delivery_info) as any).unwrap();
      onClose();
    } catch (error) {
      showStatus({
        type: 'error',
        title: 'Error de Envío',
        message: 'No se pudo enviar la orden en este momento.'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCheckout = async () => {
    console.log('🛒 [CartModal] handleCheckout clicked!');
    console.log('🛒 [CartModal] cart.length:', cart.length);
    console.log('🛒 [CartModal] activeOrderId:', activeOrderId);
    console.log('🛒 [CartModal] activeOrder:', activeOrder ? JSON.stringify(activeOrder) : 'none');
    console.log('🛒 [CartModal] onNavigateToCheckout prop exists:', !!onNavigateToCheckout);
    if (onNavigateToCheckout) {
      console.log('🛒 [CartModal] Navigating to Checkout...');
      onClose();
      onNavigateToCheckout();
    } else {
      try {
        setIsProcessing(true);
        const paymentPayload = {
          cash_register_id: selectedRegisterId || 'MOBILE-POS-01',
          payment_methods: [{ name: 'EFECTIVO', type: 'CASH', monto: total + (activeOrder?.total || 0) }],
          delivery_info: {
            customer_name: orderInfo.customerName,
            phone: orderInfo.phone,
            address: orderInfo.address,
            notes: orderInfo.notes
          },
          notas: orderInfo.notes || 'Venta desde aplicación móvil'
        };
        await dispatch(finalizeOrder(paymentPayload) as any).unwrap();
        onClose();
        showStatus({
          type: 'success',
          title: '¡Venta Exitosa!',
          message: 'La venta ha sido registrada con éxito en el sistema.'
        });
      } catch (error) {
        console.error('Error in checkout:', error);
        showStatus({
          type: 'error',
          title: 'Error de Pago',
          message: 'Hubo un inconveniente al registrar la transacción.'
        });
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const getItemLineTotal = (item: any) => {
    const basePrice = item.price_override !== undefined ? item.price_override : (item.product?.precio || 0);
    const additionsTotal = item.selectedAdditions?.reduce((s: number, a: any) => s + ((a.precio || 0) * (a.cantidad || 0)), 0) || 0;
    let subtotal = (basePrice + additionsTotal) * item.quantity;
    if (item.discount) {
      if (item.discount.type === 'FIXED') {
        subtotal = Math.max(0, subtotal - item.discount.value);
      } else {
        subtotal = Math.max(0, subtotal * (1 - item.discount.value / 100));
      }
    }
    return subtotal;
  };

  const renderItem = ({ item }: { item: any }) => {
    const isToGo = !!item.para_llevar;
    const itemTotal = getItemLineTotal(item);
    const hasPriceOverride = item.price_override !== undefined;
    const hasDiscount = !!item.discount;
    const originalPrice = item.product?.precio || 0;

    // Customization summary text
    let custSummary = '';
    const removedIngredients = item.product?.ingredientes?.filter(
      (ing: any) => !item.selectedIngredients?.find((si: any) => (si.id === ing.id || si.nombre === ing.nombre) && (si.cantidad || 0) > 0)
    ) || [];
    const addedAdditions = item.selectedAdditions?.filter((add: any) => (add.cantidad || 0) > 0) || [];

    if (removedIngredients.length > 0) {
      custSummary += `Sin: ${removedIngredients.map((r: any) => r.nombre).join(', ')}`;
    }
    if (addedAdditions.length > 0) {
      if (custSummary) custSummary += ' | ';
      custSummary += `Extra: ${addedAdditions.map((a: any) => `${a.nombre} (x${a.cantidad})`).join(', ')}`;
    }

    return (
      <View style={styles.cartItem}>
        <View style={styles.itemHeader}>
          <View style={styles.itemTitleGroup}>
            <Text style={styles.itemName}>{item.product?.nombre || 'Producto'}</Text>

            <View style={styles.itemPriceRow}>
              {(hasPriceOverride || hasDiscount) ? (
                <View style={{ flexDirection: 'column' }}>
                  <Text style={styles.itemUnitBaseCrossed}>{CurrencyService.format(originalPrice)}</Text>
                  <Text style={styles.itemUnitBaseCustom}>
                    {CurrencyService.format(
                      item.price_override !== undefined ? item.price_override : originalPrice
                    )}
                    {hasDiscount && ` (-${item.discount.type === 'FIXED' ? CurrencyService.format(item.discount.value) : `${item.discount.value}%`})`}
                  </Text>
                </View>
              ) : (
                <Text style={styles.itemUnitBase}>{CurrencyService.format(originalPrice)}</Text>
              )}
            </View>

            {custSummary ? (
              <Text style={styles.customizationSummaryText} numberOfLines={2}>
                ✨ {custSummary}
              </Text>
            ) : null}

            {item.notes ? (
              <Text style={styles.itemNotesText} numberOfLines={2}>
                ✍️ "{item.notes}"
              </Text>
            ) : null}
          </View>

          <View style={styles.headerRightActions}>
            <TouchableOpacity onPress={() => dispatch(removeFromCart(item.cartId))} style={styles.itemDeleteBtn}>
              <Trash2 size={rem(16)} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.itemFooter}>
          {/* Dual Toggle for Dine In / Take Away (Exactly like your reference image!) */}
          <View style={styles.toGoToggleContainer}>
            <TouchableOpacity
              style={[styles.toGoOptionBtn, !isToGo && styles.toGoOptionBtnActive]}
              onPress={() => isToGo && dispatch(toggleParaLlevar(item.cartId))}
              activeOpacity={0.8}
            >
              <Footprints size={rem(15)} color={!isToGo ? "#FFFFFF" : colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toGoOptionBtn, isToGo && styles.toGoOptionBtnActive]}
              onPress={() => !isToGo && dispatch(toggleParaLlevar(item.cartId))}
              activeOpacity={0.8}
            >
              <ShoppingBag size={rem(15)} color={isToGo ? "#FFFFFF" : colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.footerRightBlock}>
            <View style={styles.quantityControls}>
              <TouchableOpacity style={styles.qtyBtn} onPress={() => dispatch(updateQuantity({ cartId: item.cartId, delta: -1 }))}>
                <Minus size={rem(14)} color={colors.primary} />
              </TouchableOpacity>
              <Text style={styles.qtyText}>{item.quantity}</Text>
              <TouchableOpacity style={styles.qtyBtn} onPress={() => dispatch(updateQuantity({ cartId: item.cartId, delta: 1 }))}>
                <Plus size={rem(14)} color={colors.primary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.itemPrice}>
              {CurrencyService.format(itemTotal)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderActiveOrderCard = () => {
    if (!activeOrderId || !activeOrder) return null;

    return (
      <View style={styles.activeOrderCard}>
        <View style={styles.activeOrderHeader}>
          <Text style={styles.activeOrderId}>#{activeOrderId.slice(-5).toUpperCase()}</Text>
          <TouchableOpacity
            style={styles.deselectBtn}
            onPress={() => dispatch(setActiveOrderId(null))}
          >
            <X size={rem(14)} color={colors.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.activeOrderInfo}>
          <View style={styles.infoRow}>
            <User size={rem(14)} color={colors.primary} />
            <Text style={styles.infoText}>{activeOrder.customerName || 'Mostrador'}</Text>
          </View>
          <View style={styles.infoRow}>
            <CreditCard size={rem(14)} color={colors.primary} />
            <Text style={styles.infoText}>Total actual: <Text style={styles.infoTotal}>{CurrencyService.format(activeOrder.total)}</Text></Text>
          </View>
        </View>
      </View>
    );
  };

  const renderOrderForm = () => {
    if (!isFormExpanded && orderType !== 'MOSTRADOR') {
      return (
        <TouchableOpacity
          style={styles.expandToggleBtn}
          onPress={() => setIsFormExpanded(true)}
        >
          <Text style={styles.expandToggleText}>Ver datos de {orderType.toLowerCase()}</Text>
          <ChevronDown size={rem(16)} color={colors.primary} />
        </TouchableOpacity>
      );
    }

    switch (orderType) {
      case 'MESA':
        const selectedTable = tables.find((t: Table) => t.id === locationId);
        return (
          <View style={styles.formContainer}>
            <View style={styles.horizontalSelector}>
              <Text style={styles.fieldLabel}>Ubicación</Text>
              <View style={styles.selectorWrapper}>
                <TouchableOpacity
                  style={[styles.simpleSelect, selectedTable && styles.activeSimpleSelect]}
                  onPress={() => setShowTableSelector(!showTableSelector)}
                >
                  <Text style={[styles.selectValue, selectedTable && { color: '#FFF' }]} numberOfLines={1}>
                    {selectedTable ? selectedTable.name : 'Mesa...'}
                  </Text>
                  <ChevronDown size={rem(14)} color={selectedTable ? "#FFF" : colors.textMuted} />
                </TouchableOpacity>

                {selectedTable && (
                  <TouchableOpacity
                    style={styles.simpleClearBtn}
                    onPress={() => dispatch(setLocation(null))}
                  >
                    <X size={rem(14)} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {showTableSelector && (
              <View style={styles.absoluteDropdown}>
                <FlatList
                  data={tables}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item: table }) => (
                    <TouchableOpacity
                      style={[
                        styles.selectItem,
                        locationId === table.id && styles.activeSelectItem
                      ]}
                      onPress={() => {
                        dispatch(setLocation(table.id));
                        setShowTableSelector(false);
                      }}
                    >
                      <Text style={[
                        styles.selectItemText,
                        locationId === table.id && styles.activeSelectItemText
                      ]}>
                        {table.name}
                      </Text>
                    </TouchableOpacity>
                  )}
                  style={{ maxHeight: rem(200) }}
                  nestedScrollEnabled={true}
                />
              </View>
            )}
          </View>
        );
      case 'DOMICILIO':
      case 'RECOGER':
        const isDomi = orderType === 'DOMICILIO';
        return (
          <View style={styles.formContainer}>
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>Datos de {isDomi ? 'entrega' : 'recogida'}</Text>
              <TouchableOpacity onPress={() => setIsFormExpanded(false)}>
                <ChevronDown size={rem(20)} color={colors.textMuted} style={{ transform: [{ rotate: '180deg' }] }} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              placeholder={isDomi ? "Nombre Cliente" : "Nombre quien recoge"}
              value={orderInfo.customerName}
              onChangeText={(text) => setOrderInfo({ ...orderInfo, customerName: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Teléfono"
              keyboardType="phone-pad"
              value={orderInfo.phone}
              onChangeText={(text) => setOrderInfo({ ...orderInfo, phone: text })}
            />
            {isDomi && (
              <TextInput
                style={styles.input}
                placeholder="Dirección Completa"
                value={orderInfo.address}
                onChangeText={(text) => setOrderInfo({ ...orderInfo, address: text })}
              />
            )}
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder={`Notas de ${isDomi ? 'entrega' : 'recogida'} (opcional)`}
              multiline
              value={orderInfo.notes}
              onChangeText={(text) => setOrderInfo({ ...orderInfo, notes: text })}
            />
          </View>
        );
      case 'MOSTRADOR':
      default:
        return (
          <View style={styles.formContainer}>
            {activeOrderId ? renderActiveOrderCard() : (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Nombre o referencia del cliente (opcional)"
                  value={orderInfo.customerName}
                  onChangeText={(text) => setOrderInfo({ ...orderInfo, customerName: text })}
                />
                <View style={styles.helpTextContainer}>
                  <Text style={styles.helpText}>Selecciona una orden del panel o agrega productos para crear una nueva</Text>
                </View>
              </>
            )}
          </View>
        );
    }
  };

  return (
    <Modal visible={isVisible} animationType="none" transparent={true} onRequestClose={onClose} statusBarTranslucent>
      {/* Animated Overlay */}
      <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
      </Animated.View>

      {/* Animated Bottom Sheet */}
      <Animated.View
        style={[
          styles.modalContent,
          { transform: [{ translateY }] },
        ]}
      >
        {/* Drag Handle */}
        <View {...panResponder.panHandlers} style={styles.dragHandleArea}>
          <View style={styles.dragHandle} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <View style={styles.basketIconContainer}>
              <ShoppingBasket size={rem(18)} color={colors.primary} />
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{cart.length}</Text>
              </View>
            </View>
            <Text style={styles.headerTitle}>Tu Pedido</Text>
            {cart.length > 0 && onNavigateToPersonalizar && (
              <TouchableOpacity
                style={styles.headerPersonalizeBtn}
                onPress={() => {
                  onClose();
                  onNavigateToPersonalizar(cart[cart.length - 1].cartId);
                }}
                activeOpacity={0.75}
              >
                <Sliders size={rem(12)} color={colors.primary} style={{ marginRight: rem(4) }} />
                <Text style={styles.headerPersonalizeBtnText}>Personalizar</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.circleActionBtn} onPress={() => dispatch(clearCart())}>
              <Trash2 size={rem(20)} color="#EF4444" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.circleActionBtn, styles.closeBtn]} onPress={onClose}>
              <X size={rem(22)} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Order Types */}
        <View style={styles.typeSelector}>
          <View style={styles.tabsContainer}>
            {['MESA', 'DOMICILIO', 'RECOGER', 'MOSTRADOR'].map((type) => (
              <TouchableOpacity
                key={type}
                style={[styles.typeTab, orderType === type && styles.activeTypeTab]}
                onPress={() => {
                  dispatch(setOrderType(type as OrderType));
                  setIsFormExpanded(true);
                  setOrderInfo({
                    customerName: '',
                    phone: '',
                    address: '',
                    notes: '',
                    tableId: ''
                  });
                }}
              >
                <Text style={[styles.typeTabText, orderType === type && styles.activeTypeTabText]}>
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Contextual Form Area */}
        <View style={styles.contextualFormArea}>
          {renderOrderForm()}
        </View>

        {/* Cart List */}
        {cart.length === 0 ? (
          <View style={styles.emptyContainer}>
            <ShoppingBasket size={rem(60)} color={mode === 'light' ? '#E2E8F0' : '#475569'} />
            <Text style={styles.emptyTitle}>El carrito está vacío</Text>
          </View>
        ) : (
          <FlatList
            data={cart}
            renderItem={renderItem}
            keyExtractor={(item) => item.cartId}
            contentContainerStyle={styles.listContent}
            style={{ flex: 1 }}
          />
        )}

        {/* Footer Actions */}
        <View style={styles.footer}>
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.secondaryBtn}>
              <Scissors size={rem(14)} color={colors.primary} />
              <Text style={styles.secondaryBtnText}>Dividir</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.preFacturaBtn}>
              <FileText size={rem(14)} color={mode === 'light' ? '#92400E' : '#F59E0B'} />
              <Text style={styles.preFacturaText}>Pre-factura</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sendBtn, (cart.length === 0 || isProcessing) && styles.disabledBtn]}
              onPress={handleParkOrder}
              disabled={cart.length === 0 || isProcessing}
            >
              <Send size={rem(14)} color={mode === 'light' ? '#16A34A' : '#10B981'} />
              <Text style={styles.sendBtnText}>Enviar Orden</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.checkoutBtn, ((cart.length === 0 && !activeOrder) || isProcessing) && styles.disabledBtn]}
            onPress={handleCheckout}
            activeOpacity={0.9}
            disabled={(cart.length === 0 && !activeOrder) || isProcessing}
          >
            <Text style={styles.checkoutLabel}>Cobrar</Text>
            <View style={styles.totalBadge}>
              <Text style={styles.totalValue}>{CurrencyService.format(total + (activeOrder?.total || 0))}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
};

const getStyles = (colors: any, mode: string) => StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.9,
    backgroundColor: colors.surface,
    borderTopLeftRadius: rem(28),
    borderTopRightRadius: rem(28),
    paddingTop: rem(8),
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: { elevation: 12 },
    }),
  },
  dragHandleArea: {
    alignItems: 'center',
    paddingTop: rem(6),
    paddingBottom: rem(10),
  },
  dragHandle: {
    width: rem(40),
    height: rem(4),
    borderRadius: rem(2),
    backgroundColor: mode === 'light' ? '#E2E8F0' : '#475569',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: rem(15),
    marginBottom: rem(20),
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rem(8),
  },
  headerTitle: {
    fontSize: rem(18),
    fontWeight: 'bold',
    color: colors.text,
  },
  headerPersonalizeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: mode === 'light' ? '#EEF2FF' : colors.primary + '20',
    paddingHorizontal: rem(8),
    paddingVertical: rem(4),
    borderRadius: rem(8),
    borderWidth: 1,
    borderColor: mode === 'light' ? '#DDE3FF' : '#334155',
    marginLeft: rem(6),
  },
  headerPersonalizeBtnText: {
    fontSize: rem(11),
    fontWeight: '800',
    color: colors.primary,
  },
  closeBtn: {
    backgroundColor: mode === 'light' ? '#F1F5F9' : '#334155',
  },
  basketIconContainer: {
    width: rem(40),
    height: rem(40),
    backgroundColor: mode === 'light' ? '#EEF2FF' : colors.primary + '20',
    borderRadius: rem(12),
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: -rem(5),
    right: -rem(5),
    backgroundColor: colors.primary,
    minWidth: rem(18),
    height: rem(18),
    borderRadius: rem(9),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: rem(9),
    fontWeight: 'bold',
  },
  personalizeBtn: {
    backgroundColor: mode === 'light' ? '#EEF2FF' : colors.primary + '20',
    paddingHorizontal: rem(10),
    paddingVertical: rem(6),
    borderRadius: rem(8),
    borderWidth: 1,
    borderColor: mode === 'light' ? '#C7D2FE' : '#334155',
  },
  personalizeText: {
    fontSize: rem(10),
    fontWeight: 'bold',
    color: colors.primary,
  },
  headerActions: {
    flexDirection: 'row',
    gap: rem(6),
    flexShrink: 0,
    alignItems: 'center',
  },
  circleActionBtn: {
    width: rem(38),
    height: rem(38),
    borderRadius: rem(19),
    backgroundColor: mode === 'light' ? '#F8FAFC' : '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: mode === 'light' ? '#F1F5F9' : '#334155',
  },
  typeSelector: {
    paddingHorizontal: rem(20),
    marginBottom: rem(10),
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: mode === 'light' ? '#F7F3EB' : '#1E293B',
    padding: rem(6),
    borderRadius: rem(20),
    gap: rem(5),
  },
  typeTab: {
    flex: 1,
    paddingVertical: rem(12),
    alignItems: 'center',
    borderRadius: rem(15),
  },
  activeTypeTab: {
    backgroundColor: colors.surface,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
      android: { elevation: 3 },
    }),
  },
  typeTabText: {
    fontSize: rem(11),
    fontWeight: 'bold',
    color: colors.textMuted,
  },
  activeTypeTabText: {
    color: colors.primary,
  },
  contextualFormArea: {
    paddingHorizontal: rem(20),
    marginBottom: rem(15),
  },
  formContainer: {
    backgroundColor: mode === 'light' ? '#F7F3EB' : '#1E293B',
    padding: rem(15),
    borderRadius: rem(25),
    gap: rem(10),
    borderWidth: 1,
    borderColor: mode === 'light' ? '#EADDCA' : '#334155',
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: rem(5),
    paddingHorizontal: rem(5),
  },
  formTitle: {
    fontSize: rem(13),
    fontWeight: 'bold',
    color: colors.textMuted,
  },
  input: {
    backgroundColor: colors.surface,
    height: rem(45),
    borderRadius: rem(15),
    paddingHorizontal: rem(15),
    fontSize: rem(14),
    color: colors.text,
    borderWidth: 1,
    borderColor: mode === 'light' ? '#E2E8F0' : '#334155',
  },
  textArea: {
    height: rem(80),
    textAlignVertical: 'top',
    paddingTop: rem(12),
  },
  helpTextContainer: {
    flexDirection: 'row',
    paddingHorizontal: rem(10),
    paddingTop: rem(5),
  },
  helpText: {
    fontSize: rem(12),
    color: colors.textMuted,
    textAlign: 'center',
    flex: 1,
  },
  locationSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: mode === 'light' ? '#F7F3EB' : '#1E293B',
    padding: rem(15),
    borderRadius: rem(25),
    gap: rem(15),
    borderWidth: 1,
    borderColor: mode === 'light' ? '#EADDCA' : '#334155',
  },
  locationLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rem(6),
  },
  locationLabelText: {
    fontSize: rem(12),
    fontWeight: '800',
    color: colors.textMuted,
  },
  locationDropdown: {
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: rem(15),
    paddingVertical: rem(10),
    borderRadius: rem(15),
    borderWidth: 1,
    borderColor: mode === 'light' ? '#E2E8F0' : '#334155',
  },
  listContent: {
    paddingHorizontal: rem(20),
    paddingBottom: rem(20),
  },
  cartItem: {
    backgroundColor: colors.surface,
    borderRadius: rem(20),
    padding: rem(15),
    marginBottom: rem(12),
    borderWidth: 1,
    borderColor: mode === 'light' ? '#F1F5F9' : '#334155',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: rem(12),
  },
  itemTitleGroup: {
    flex: 1,
    gap: rem(2),
  },
  itemName: {
    fontSize: rem(15),
    fontWeight: 'bold',
    color: colors.text,
  },
  itemUnitBase: {
    fontSize: rem(12),
    color: colors.textMuted,
  },
  itemPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: rem(2),
  },
  itemUnitBaseCrossed: {
    fontSize: rem(11),
    color: colors.textMuted,
    textDecorationLine: 'line-through',
    marginBottom: rem(1),
  },
  itemUnitBaseCustom: {
    fontSize: rem(12),
    color: '#10B981',
    fontWeight: 'bold',
  },
  customizationSummaryText: {
    fontSize: rem(11),
    color: colors.primary,
    fontWeight: '500',
    marginTop: rem(4),
  },
  itemNotesText: {
    fontSize: rem(11),
    color: colors.textMuted,
    fontStyle: 'italic',
    marginTop: rem(2),
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rem(8),
    flexShrink: 0,
  },
  itemDeleteBtn: {
    width: rem(32),
    height: rem(32),
    backgroundColor: mode === 'light' ? '#F8FAFC' : '#1E293B',
    borderRadius: rem(8),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: mode === 'light' ? '#E2E8F0' : '#334155',
  },
  toGoToggleContainer: {
    flexDirection: 'row',
    backgroundColor: mode === 'light' ? '#F1F5F9' : '#1E293B',
    borderRadius: rem(10),
    padding: rem(2),
    gap: rem(2),
    borderWidth: 1,
    borderColor: mode === 'light' ? '#E2E8F0' : '#334155',
  },
  toGoOptionBtn: {
    width: rem(30),
    height: rem(30),
    borderRadius: rem(7),
    justifyContent: 'center',
    alignItems: 'center',
  },
  toGoOptionBtnActive: {
    backgroundColor: colors.primary,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
      },
      android: { elevation: 2 },
    }),
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: mode === 'light' ? '#F8FAFC' : '#1E293B',
    borderRadius: rem(12),
    padding: rem(4),
    borderWidth: 1,
    borderColor: mode === 'light' ? '#F1F5F9' : '#334155',
  },
  qtyBtn: {
    width: rem(32),
    height: rem(32),
    backgroundColor: colors.surface,
    borderRadius: rem(8),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: mode === 'light' ? '#E2E8F0' : '#334155',
  },
  qtyText: {
    paddingHorizontal: rem(15),
    fontSize: rem(14),
    fontWeight: 'bold',
    color: colors.text,
  },
  itemPrice: {
    fontSize: rem(16),
    fontWeight: '800',
    color: colors.text,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: rem(100),
  },
  emptyTitle: {
    fontSize: rem(16),
    fontWeight: 'bold',
    color: colors.textMuted,
    marginTop: rem(20),
  },
  footer: {
    padding: rem(20),
    paddingBottom: rem(Platform.OS === 'ios' ? 40 : 20),
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: mode === 'light' ? '#F1F5F9' : '#334155',
    gap: rem(12),
  },
  actionButtons: {
    flexDirection: 'row',
    gap: rem(10),
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: mode === 'light' ? '#EEF2FF' : colors.primary + '20',
    height: rem(40),
    borderRadius: rem(12),
    justifyContent: 'center',
    alignItems: 'center',
    gap: rem(6),
  },
  secondaryBtnText: {
    fontSize: rem(11),
    fontWeight: 'bold',
    color: colors.primary,
  },
  preFacturaBtn: {
    flex: 1.2,
    flexDirection: 'row',
    backgroundColor: mode === 'light' ? '#FEF3C7' : '#F59E0B20',
    height: rem(40),
    borderRadius: rem(12),
    justifyContent: 'center',
    alignItems: 'center',
    gap: rem(6),
    borderWidth: 1,
    borderColor: mode === 'light' ? '#FDE68A' : '#F59E0B40',
  },
  preFacturaText: {
    fontSize: rem(11),
    fontWeight: 'bold',
    color: mode === 'light' ? '#92400E' : '#F59E0B',
  },
  sendBtn: {
    flex: 1.5,
    flexDirection: 'row',
    backgroundColor: mode === 'light' ? '#F0FDF4' : '#10B98120',
    height: rem(40),
    borderRadius: rem(12),
    justifyContent: 'center',
    alignItems: 'center',
    gap: rem(6),
    borderWidth: 1,
    borderColor: mode === 'light' ? '#DCFCE7' : '#10B98140',
  },
  sendBtnText: {
    fontSize: rem(11),
    fontWeight: 'bold',
    color: mode === 'light' ? '#16A34A' : '#10B981',
  },
  checkoutBtn: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    height: rem(64),
    borderRadius: rem(20),
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: rem(20),
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  checkoutLabel: {
    fontSize: rem(18),
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  totalBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: rem(15),
    paddingVertical: rem(10),
    borderRadius: rem(12),
  },
  totalValue: {
    fontSize: rem(16),
    fontWeight: '800',
    color: '#FFFFFF',
  },
  activeOrderCard: {
    backgroundColor: mode === 'light' ? '#EEF2FF' : colors.primary + '20',
    borderRadius: rem(18),
    padding: rem(12),
    borderWidth: 1,
    borderColor: mode === 'light' ? '#C7D2FE' : '#334155',
  },
  activeOrderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: rem(8),
  },
  activeOrderId: {
    fontSize: rem(14),
    fontWeight: '800',
    color: colors.primary,
  },
  deselectBtn: {
    width: rem(24),
    height: rem(24),
    backgroundColor: mode === 'light' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(99, 102, 241, 0.2)',
    borderRadius: rem(12),
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeOrderInfo: {
    gap: rem(4),
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rem(8),
  },
  infoText: {
    fontSize: rem(13),
    color: colors.primary,
    fontWeight: '500',
  },
  infoTotal: {
    fontWeight: '800',
  },
  expandToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: mode === 'light' ? '#F8FAFC' : '#1E293B',
    paddingVertical: rem(12),
    borderRadius: rem(15),
    borderWidth: 1,
    borderColor: mode === 'light' ? '#E2E8F0' : '#334155',
    gap: rem(10),
  },
  expandToggleText: {
    fontSize: rem(13),
    fontWeight: 'bold',
    color: colors.primary,
  },
  horizontalSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: rem(12),
  },
  fieldLabel: {
    fontSize: rem(14),
    fontWeight: 'bold',
    color: colors.textMuted,
    flexShrink: 0,
  },
  selectorWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: rem(8),
  },
  simpleSelect: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: rem(12),
    paddingVertical: rem(8),
    borderRadius: rem(10),
    borderWidth: 1,
    borderColor: mode === 'light' ? '#E2E8F0' : '#334155',
  },
  activeSimpleSelect: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  selectValue: {
    fontSize: rem(13),
    color: colors.text,
    fontWeight: '500',
  },
  simpleClearBtn: {
    width: rem(30),
    height: rem(30),
    justifyContent: 'center',
    alignItems: 'center',
  },
  absoluteDropdown: {
    position: 'absolute',
    top: rem(42),
    left: rem(80),
    right: 0,
    backgroundColor: colors.surface,
    borderRadius: rem(12),
    borderWidth: 1,
    borderColor: mode === 'light' ? '#E2E8F0' : '#334155',
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    overflow: 'hidden',
  },
  selectItem: {
    paddingHorizontal: rem(15),
    paddingVertical: rem(12),
    borderBottomWidth: 1,
    borderBottomColor: mode === 'light' ? '#F1F5F9' : '#334155',
  },
  activeSelectItem: {
    backgroundColor: mode === 'light' ? '#F1F5F9' : '#334155',
    fontWeight: 'bold',
    color: colors.primary,
  },

  selectItemText: {
    fontSize: rem(14),
    color: colors.textMuted,
  },
  activeSelectItemText: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: rem(10),
  },
  footerRightBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rem(12),
  },
  disabledBtn: {
    opacity: 0.5,
  },
});
