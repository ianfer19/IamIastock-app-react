import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Modal,
  FlatList,
  Alert,
  Dimensions,
  Vibration,
  TouchableWithoutFeedback
} from 'react-native';
import {
  Coins,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronDown,
  CheckCircle
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { MotiView, AnimatePresence } from 'moti';

import { COLORS, TYPOGRAPHY, useTheme } from '@/core/theme/theme';
import { rem } from '@/core/utils/responsive';
import { DashboardHeader } from '@/features/pos/components/DashboardLayout';
import { PosTab } from '@/features/pos/components/PosSubHeader';
import { useAppSelector, useAppDispatch } from '@/core/store/store';
import { setSelectedRegister, setSessionStatus } from '@/core/store/slices/posSlice';
import { SecureStorage } from '@/core/storage/secureStorage';
import { CurrencyService } from '@/core/services/currencyService';
import { CashRegisterService, CashRegister, CashierSession, CashMovement } from '@/infrastructure/services/cashRegisterService';
import apiClient from '@/core/api/client';
import { Env } from '@/core/config/env';
import { AuthService } from '@/infrastructure/services/authService';

// Modular Caja components
import { CajaSubHeader, CajaSubTab } from '../components/CajaSubHeader';
import { CajaOrdersList } from '../components/CajaOrdersList';
import { CajaActionsDashboard } from '../components/CajaActionsDashboard';
import { CajaModals } from '../components/CajaModals';
import { OrdersFilters } from '../components/CajaOrdersFilterBar';
import { CajaHistoryTab } from '../components/CajaHistoryTab';
import { CajaManagementTab } from '../components/CajaManagementTab';

const { width } = Dimensions.get('window');

const toLocalISOString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
};

export const CajaScreen = ({ onNavigate }: { onNavigate: (tab: PosTab) => void }) => {
  const dispatch = useAppDispatch();
  const { tenantId, user } = useAppSelector((state) => state.auth);
  const { selectedRegisterId } = useAppSelector((state) => state.pos);
  const { colors, mode } = useTheme();
  const styles = getStyles(colors, mode);

  // States
  const [registers, setRegisters] = useState<CashRegister[]>([]);
  const [isRegisterSelectorOpen, setIsRegisterSelectorOpen] = useState(false);
  const [session, setSession] = useState<CashierSession | null>(null);
  const [sessionPreview, setSessionPreview] = useState<any>(null);

  // Sub-navigation tabs: ACCIONES (Caja actions) vs ORDENES (Caja orders list) vs HISTORIAL vs GESTION
  const [activeSubTab, setActiveSubTab] = useState<CajaSubTab>('ACCIONES');
  const [registerOrders, setRegisterOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [ordersFilters, setOrdersFilters] = useState<OrdersFilters>({
    status: 'ALL',
    type: 'ALL',
    startDate: null,
    endDate: null,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [openModalVisible, setOpenModalVisible] = useState(false);
  const [movementModalVisible, setMovementModalVisible] = useState(false);
  const [closeModalVisible, setCloseModalVisible] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [commerce, setCommerce] = useState<any>(null);

  const closureMode = useMemo(() => {
    return commerce?.cash_control?.closure_mode || 'MANUAL';
  }, [commerce]);

  const requirePhotoOnDiff = useMemo(() => {
    return !!commerce?.cash_control?.require_photo_on_diff;
  }, [commerce]);

  // Form Inputs
  const [openingAmount, setOpeningAmount] = useState('');
  const [movementType, setMovementType] = useState<'INFLOW' | 'OUTFLOW'>('INFLOW');
  const [movementAmount, setMovementAmount] = useState('');
  const [movementReason, setMovementReason] = useState('');

  // Cash count for close wizard
  const [countedCash, setCountedCash] = useState('');
  const [isClosingSubmitting, setIsClosingSubmitting] = useState(false);

  // Load payment methods dynamically when opening close modal
  useEffect(() => {
    if (closeModalVisible) {
      const fetchMethods = async () => {
        try {
          const list = await CashRegisterService.listPaymentMethods();
          // Verify if Cash is present, fallback otherwise
          const hasCash = list.some((item: any) => item.type === 'CASH' || item.name?.toLowerCase() === 'efectivo');
          if (!hasCash) {
            list.unshift({ id: 'cash', name: 'Efectivo', type: 'CASH' });
          }
          setPaymentMethods(list);
        } catch (err) {
          console.error('Error loading payment methods:', err);
          // High-fidelity fallback list
          setPaymentMethods([
            { id: 'cash', name: 'Efectivo', type: 'CASH' },
            { id: 'card', name: 'Tarjeta', type: 'CARD' },
            { id: 'nequi', name: 'Nequi', type: 'DIGITAL_WALLET' },
            { id: 'daviplata', name: 'Daviplata', type: 'DIGITAL_WALLET' },
            { id: 'transfer', name: 'Transferencia', type: 'BANK_TRANSFER' }
          ]);
        }
      };
      fetchMethods();
    }
  }, [closeModalVisible]);

  const triggerHaptic = (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) => {
    Haptics.impactAsync(style);
  };

  // 1. Load initial cash registers and commerce config
  useEffect(() => {
    const fetchInitData = async () => {
      try {
        const [registersList, userProfile] = await Promise.all([
          CashRegisterService.listCashRegisters(),
          AuthService.getCurrentUser().catch(() => null)
        ]);

        setRegisters(registersList);
        if (userProfile?.commerce) {
          setCommerce(userProfile.commerce);
        }

        // If there is no active register in Redux, select the first one or fallback
        if (!selectedRegisterId) {
          if (registersList.length > 0) {
            const defaultReg = registersList[0];
            dispatch(setSelectedRegister({ id: defaultReg.id, name: defaultReg.name || `Caja ${defaultReg.id}` }));
            await SecureStorage.saveCashRegister(defaultReg.id, defaultReg.name || `Caja ${defaultReg.id}`);
          } else {
            dispatch(setSelectedRegister({ id: '1', name: 'Caja Principal' }));
            await SecureStorage.saveCashRegister('1', 'Caja Principal');
          }
        }
      } catch (err) {
        console.error('Error loading initial data:', err);
        if (!selectedRegisterId) {
          dispatch(setSelectedRegister({ id: '1', name: 'Caja Principal' }));
          await SecureStorage.saveCashRegister('1', 'Caja Principal');
        }
      }
    };
    fetchInitData();
  }, []);

  // 2. Fetch session and preview data once selectedRegisterId changes
  const fetchSessionData = async (showRefreshIndicator = false) => {
    if (!tenantId || !selectedRegisterId) return;
    if (showRefreshIndicator) setRefreshing(true);
    else setLoading(true);

    try {
      // 2a. Session Status
      const statusData = await CashRegisterService.getCashRegisterStatus(tenantId, selectedRegisterId);
      setSession(statusData);

      // Dispatch status directly to Redux store
      dispatch(setSessionStatus(statusData.status));

      // 2b. Session Preview if open
      if (statusData.status === 'OPEN') {
        const preview = await CashRegisterService.getSessionPreview(tenantId, selectedRegisterId);
        setSessionPreview(preview);
      } else {
        setSessionPreview(null);
      }
    } catch (err) {
      console.error('Error fetching session data:', err);
      dispatch(setSessionStatus(null));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSessionData();
  }, [selectedRegisterId, tenantId]);

  const fetchRegisterOrders = async () => {
    if (!tenantId) return;
    setLoadingOrders(true);
    try {
      const queryParams: any = {};

      if (ordersFilters.type !== 'ALL') queryParams.order_type = ordersFilters.type;

      const formatDateQueryParam = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      if (ordersFilters.startDate && ordersFilters.endDate) {
        queryParams.start_date = formatDateQueryParam(ordersFilters.startDate);
        queryParams.end_date = formatDateQueryParam(ordersFilters.endDate);
      }

      // Enviar la caja seleccionada (o la caja activa por defecto) al backend para usar el GSI de DynamoDB
      const activeRegisterId = ordersFilters.registerId !== undefined ? ordersFilters.registerId : selectedRegisterId;
      if (activeRegisterId && activeRegisterId !== 'ALL') {
        queryParams.cash_register_id = activeRegisterId;
      }

      // Mapear el estado según la especificación del backend (ABIERTA, COMPLETADA, CANCELADA)
      if (ordersFilters.status !== 'ALL') {
        if (ordersFilters.status === 'COBRADA') {
          queryParams.status = 'COMPLETADA';
        } else if (ordersFilters.status === 'ANULADA') {
          queryParams.status = 'CANCELADA';
        } else {
          queryParams.status = ordersFilters.status; // 'ABIERTA'
        }
      }

      // Safe body-parsing helper
      const extractRawItems = (data: any): any[] => {
        if (!data) return [];
        if (data.body && typeof data.body === 'string') {
          try {
            const parsedBody = JSON.parse(data.body);
            return parsedBody.Items || parsedBody.items || parsedBody.data || parsedBody.orders || (Array.isArray(parsedBody) ? parsedBody : []);
          } catch (e) {
            console.error('Error parsing response body:', e);
            return [];
          }
        }
        if (data.body && typeof data.body === 'object') {
          const b = data.body;
          return b.Items || b.items || b.data || b.orders || b;
        }
        if (Array.isArray(data)) return data;
        if (data.Items && Array.isArray(data.Items)) return data.Items;
        if (data.items && Array.isArray(data.items)) return data.items;
        if (data.data && Array.isArray(data.data)) return data.data;
        if (data.orders && Array.isArray(data.orders)) return data.orders;
        if (typeof data === 'object') {
          const possibleArrayKey = Object.keys(data).find(key => Array.isArray(data[key]));
          if (possibleArrayKey) {
            return data[possibleArrayKey];
          }
          return [data];
        }
        return [];
      };

      console.log('🔍 [fetchRegisterOrders] Enviando petición a la API con parámetros base:', queryParams);
      console.log('📌 [fetchRegisterOrders] Filtros originales de la UI:', ordersFilters);

      console.log(`📡 [fetchRegisterOrders] Realizando petición GET a /orders con params:`, queryParams);
      const response = await apiClient.get(`${Env.API_URL}/orders`, {
        params: queryParams
      });
      const rawItems = extractRawItems(response.data);
      console.log(`📥 [fetchRegisterOrders] API respondió con ${rawItems.length} órdenes.`);

      const orderGroups: { [key: string]: { metadata: any; items: any[] } } = {};

      rawItems.forEach(item => {
        const pk = item.PK || item.id || item.order_id || item.orderId;
        if (!pk) return;

        if (!orderGroups[pk]) {
          orderGroups[pk] = { metadata: null, items: [] };
        }

        const hasSKMetadata = item.SK && (item.SK.startsWith('METADATA') || item.SK === 'METADATA');
        const isFlatOrderHeader = !item.SK && (
          item.status !== undefined ||
          item.estado !== undefined ||
          item.total !== undefined ||
          item.total_amount !== undefined ||
          item.items !== undefined ||
          item.order_type !== undefined ||
          item.orderType !== undefined
        );
        const isMetadata = hasSKMetadata || isFlatOrderHeader;

        if (isMetadata) {
          orderGroups[pk].metadata = { ...orderGroups[pk].metadata, ...item };
          if (item.items && Array.isArray(item.items)) {
            const existingIds = new Set(orderGroups[pk].items.map(i => i.product_id || i.id || i.SK));
            item.items.forEach((innerItem: any) => {
              const innerId = innerItem.product_id || innerItem.id || innerItem.SK;
              if (!innerId || !existingIds.has(innerId)) {
                orderGroups[pk].items.push(innerItem);
              }
            });
          }
        } else if (item.SK && item.SK.startsWith('ITEM#')) {
          orderGroups[pk].items.push(item);
        } else if (item.name && item.quantity) {
          orderGroups[pk].items.push(item);
        }
      });

      const mapped = Object.values(orderGroups)
        .filter(group => group.metadata !== null)
        .map(group => {
          const item = group.metadata;
          const createdAt = item.created_at || item.createdAt || new Date().toISOString();
          return {
            id: item.PK ? String(item.PK).replace('ORDEN#', '') : (item.id || item.order_id || item.orderId),
            total: parseFloat(item.total || item.total_amount || '0'),
            status: item.status || item.estado,
            customerName: item.customer_name || item.customerName || item.delivery_info?.customer_name || 'Sin Nombre',
            customerPhone: item.customer_phone || item.credit_info?.phone || '',
            waiterName: item.opened_by_name || 'Desconocido',
            notas: item.notas || '',
            mesaId: item.mesa_id || '',
            timestamp: new Date(createdAt).getTime(),
            itemsCount: group.items.length > 0 ? group.items.length : (item.items?.length || 1),
            items: group.items.length > 0 ? group.items : (item.items || []),
            payments: item.payment_methods || item.payments || [],
            order_type: item.order_type || item.orderType || 'S/T',
            cash_register_id: item.cash_register_id || item.cashRegisterId || ''
          };
        })
        .sort((a, b) => b.timestamp - a.timestamp); // Sort newest first

      console.log('✅ [fetchRegisterOrders] Órdenes Crudas (primeras 2):', JSON.stringify(rawItems.slice(0, 2), null, 2));
      console.log('✨ [fetchRegisterOrders] Órdenes Mapeadas (primeras 2):', JSON.stringify(mapped.slice(0, 2), null, 2));

      setRegisterOrders(mapped);
    } catch (e) {
      console.error('Error fetching register orders:', e);
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'ORDENES') {
      fetchRegisterOrders();
    }
  }, [selectedRegisterId, activeSubTab, tenantId, ordersFilters, session]);

  // Derived Values
  const movementsList: CashMovement[] = useMemo(() => {
    return session?.movements || [];
  }, [session]);

  const stats = useMemo(() => {
    const start = session?.start_amount || 0;
    const salesTotal = sessionPreview?.sales_total || 0;
    const inflows = sessionPreview?.inflows_total || 0;
    const outflows = sessionPreview?.outflows_total || 0;
    const expected = start + salesTotal + inflows - outflows;

    return {
      start,
      salesTotal,
      inflows,
      outflows,
      expected,
    };
  }, [session, sessionPreview]);

  // API Call: Open Session
  const handleOpenSession = async () => {
    if (!tenantId || !selectedRegisterId) return;
    const parsedAmount = parseFloat(openingAmount) || 0;

    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    setOpenModalVisible(false);

    try {
      await CashRegisterService.openSession(tenantId, selectedRegisterId, parsedAmount);
      setOpeningAmount('');
      Alert.alert('Éxito', `Caja abierta con un saldo inicial de ${CurrencyService.format(parsedAmount)}`);
      fetchSessionData();
    } catch (e) {
      Alert.alert('Error', 'No se pudo abrir la caja. Por favor, intenta de nuevo.');
      setLoading(false);
    }
  };

  // API Call: Register Cash Movement (Deposit/Withdrawal)
  const handleRegisterMovement = async () => {
    if (!tenantId || !selectedRegisterId) return;
    const parsedAmount = parseFloat(movementAmount) || 0;
    if (parsedAmount <= 0 || !movementReason.trim()) {
      Alert.alert('Error', 'Por favor ingresa un monto válido y un motivo.');
      return;
    }

    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    setMovementModalVisible(false);

    try {
      await CashRegisterService.registerMovement(
        tenantId,
        selectedRegisterId,
        movementType,
        parsedAmount,
        movementReason.trim()
      );
      setMovementAmount('');
      setMovementReason('');
      Alert.alert('Éxito', 'Movimiento registrado con éxito.');
      fetchSessionData();
    } catch (e) {
      Alert.alert('Error', 'Error al registrar el movimiento.');
      setLoading(false);
    }
  };

  // API Call: Close Session (Blind Cash Counting)
  const handleCloseSession = async (totalAmount: number, paymentMethods: { method: string; amount: number }[], notes?: string): Promise<any> => {
    if (!tenantId || !selectedRegisterId) return null;

    triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
    setIsClosingSubmitting(true);

    try {
      const response = await CashRegisterService.closeSession(
        tenantId,
        selectedRegisterId,
        totalAmount,
        paymentMethods,
        notes
      );

      setCountedCash('');
      // Note: We don't close the modal immediately here anymore, because we want to transition to the 'RESULT' step inside CajaModals first.
      // So we return the response to CajaModals so it can display the final report and then call setCloseModalVisible(false) when done!
      Alert.alert('Éxito', 'Caja cerrada correctamente.');
      fetchSessionData();
      return response;
    } catch (e) {
      Alert.alert('Error', 'No se pudo cerrar la caja. Por favor, intenta de nuevo.');
      throw e;
    } finally {
      setIsClosingSubmitting(false);
    }
  };

  // API Call: Quick Close
  const handleQuickClose = async (): Promise<any> => {
    if (!tenantId || !selectedRegisterId) return null;

    triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
    setIsClosingSubmitting(true);

    try {
      const response = await CashRegisterService.quickClose(tenantId, selectedRegisterId);
      Alert.alert('Éxito', 'Caja cerrada correctamente.');
      fetchSessionData();
      return response;
    } catch (e) {
      Alert.alert('Error', 'No se pudo realizar el cierre rápido. Por favor, intenta de nuevo.');
      throw e;
    } finally {
      setIsClosingSubmitting(false);
    }
  };

  const renderMovementItem = ({ item }: { item: CashMovement }) => {
    const isPositive = item.type === 'SALE' || item.type === 'DEPOSIT' || item.type === 'INFLOW';
    return (
      <View style={styles.movementItem}>
        <View style={[styles.movementIconContainer, isPositive ? styles.iconInflowBg : styles.iconOutflowBg]}>
          {isPositive ? (
            <ArrowUpRight size={rem(16)} color="#10B981" />
          ) : (
            <ArrowDownLeft size={rem(16)} color="#EF4444" />
          )}
        </View>
        <View style={styles.movementDetails}>
          <Text style={styles.movementDesc} numberOfLines={1}>
            {item.description || (item.type === 'SALE' ? 'Venta POS' : 'Ajuste manual')}
          </Text>
          <Text style={styles.movementTime}>
            {item.timestamp ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '---'}
          </Text>
        </View>
        <Text style={[styles.movementAmountText, isPositive ? styles.textPositive : styles.textNegative]}>
          {isPositive ? '+' : '-'} {CurrencyService.format(item.amount)}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <DashboardHeader />

      <CajaSubHeader
        activeSubTab={activeSubTab}
        setActiveSubTab={setActiveSubTab}
        triggerHaptic={triggerHaptic}
      />

      <View style={styles.outerContent}>
        <View style={styles.bentoContainer}>

          {/* Cash Register Selection Row — solo visible en ACCIONES */}
          {activeSubTab === 'ACCIONES' && (
            <View style={styles.selectorHeader}>
              <View style={styles.selectorTitleContainer}>
                <Coins size={rem(18)} color="#6366F1" />
                <Text style={styles.selectorTitle}>Caja</Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.premiumSelectorTrigger}
                onPress={() => {
                  triggerHaptic();
                  setIsRegisterSelectorOpen(true);
                }}
              >
                <View style={styles.activeIndicatorDot} />
                <Text style={styles.premiumSelectorText}>
                  {registers.find(r => r.id === selectedRegisterId)?.name || 'Seleccionar Caja'}
                </Text>
                <ChevronDown size={rem(14)} color="#6366F1" />
              </TouchableOpacity>
            </View>
          )}

          {activeSubTab === 'ORDENES' ? (
            <CajaOrdersList
              loadingOrders={loadingOrders}
              registerOrders={registerOrders}
              filters={ordersFilters}
              setFilters={setOrdersFilters}
              registers={registers}
            />
          ) : activeSubTab === 'HISTORIAL' ? (
            <CajaHistoryTab
              triggerHaptic={triggerHaptic}
              registersList={registers}
            />
          ) : activeSubTab === 'GESTION' ? (
            <CajaManagementTab
              registers={registers}
              loading={loading}
              onRefresh={async () => {
                setLoading(true);
                try {
                  const list = await CashRegisterService.listCashRegisters();
                  setRegisters(list);
                } catch (e) {
                  console.error('Error refreshing registers list:', e);
                } finally {
                  setLoading(false);
                }
              }}
              triggerHaptic={triggerHaptic}
            />
          ) : (
            <CajaActionsDashboard
              loading={loading}
              session={session}
              stats={stats}
              movementsList={movementsList}
              renderMovementItem={renderMovementItem}
              setOpenModalVisible={setOpenModalVisible}
              setMovementType={setMovementType}
              setMovementModalVisible={setMovementModalVisible}
              setCloseModalVisible={setCloseModalVisible}
              handleQuickClose={handleQuickClose}
              triggerHaptic={triggerHaptic}
            />
          )}

        </View>
      </View>

      <CajaModals
        openModalVisible={openModalVisible}
        setOpenModalVisible={setOpenModalVisible}
        openingAmount={openingAmount}
        setOpeningAmount={setOpeningAmount}
        handleOpenSession={handleOpenSession}

        movementModalVisible={movementModalVisible}
        setMovementModalVisible={setMovementModalVisible}
        movementType={movementType}
        movementAmount={movementAmount}
        setMovementAmount={setMovementAmount}
        movementReason={movementReason}
        setMovementReason={setMovementReason}
        handleRegisterMovement={handleRegisterMovement}

        closeModalVisible={closeModalVisible}
        setCloseModalVisible={setCloseModalVisible}
        countedCash={countedCash}
        setCountedCash={setCountedCash}
        isClosingSubmitting={isClosingSubmitting}
        stats={stats}
        handleCloseSession={handleCloseSession}
        handleQuickClose={handleQuickClose}
        session={session}
        sessionPreview={sessionPreview}
        paymentMethods={paymentMethods}
        closureMode={closureMode}
        requirePhotoOnDiff={requirePhotoOnDiff}
      />

      {/* Premium Cash Register Selector Modal */}
      <Modal
        visible={isRegisterSelectorOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsRegisterSelectorOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsRegisterSelectorOpen(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <MotiView
                from={{ translateY: 300, opacity: 0 }}
                animate={{ translateY: 0, opacity: 1 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                style={styles.bottomSheetContainer}
              >
                {/* Drag Indicator */}
                <View style={styles.dragIndicator} />

                {/* Header */}
                <View style={styles.bottomSheetHeader}>
                  <Text style={styles.bottomSheetTitle}>Seleccionar Caja</Text>
                  <Text style={styles.bottomSheetSubtitle}>
                    Elige la caja registradora con la que operarás
                  </Text>
                </View>

                {/* Registers List */}
                <ScrollView
                  style={styles.registersScroll}
                  showsVerticalScrollIndicator={false}
                >
                  {registers.map((reg) => {
                    const isActive = selectedRegisterId === reg.id;
                    return (
                      <TouchableOpacity
                        key={reg.id}
                        activeOpacity={0.7}
                        style={[
                          styles.registerCard,
                          isActive && styles.registerCardActive
                        ]}
                        onPress={async () => {
                          triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
                          dispatch(setSelectedRegister({ id: reg.id, name: reg.name || `Caja ${reg.id}` }));
                          await SecureStorage.saveCashRegister(reg.id, reg.name || `Caja ${reg.id}`);
                          setIsRegisterSelectorOpen(false);
                        }}
                      >
                        <View style={styles.registerCardLeft}>
                          <View style={[
                            styles.registerIconCircle,
                            isActive && styles.registerIconCircleActive
                          ]}>
                            <Coins size={rem(18)} color={isActive ? '#6366F1' : '#64748B'} />
                          </View>
                          <View style={styles.registerCardTextContainer}>
                            <Text style={[
                              styles.registerCardName,
                              isActive && styles.registerCardNameActive
                            ]}>
                              {reg.name || `Caja ${reg.id}`}
                            </Text>
                            <Text style={styles.registerCardDesc}>
                              ID: {reg.id} • {isActive ? 'Caja actual' : 'Disponible para operar'}
                            </Text>
                          </View>
                        </View>

                        {isActive && (
                          <MotiView
                            from={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            style={styles.activeCheckCircle}
                          >
                            <View style={styles.checkDot} />
                          </MotiView>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Cancel Button */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.closeSheetButton}
                  onPress={() => setIsRegisterSelectorOpen(false)}
                >
                  <Text style={styles.closeSheetButtonText}>Cerrar</Text>
                </TouchableOpacity>
              </MotiView>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const getStyles = (colors: any, mode: string) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background, // Match POS page background color
  },
  outerContent: {
    flex: 1,
    paddingHorizontal: rem(12),
    paddingBottom: rem(12),
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: rem(40),
  },
  bentoContainer: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: rem(24),
    padding: rem(12),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: mode === 'light' ? 0.05 : 0.2,
    shadowRadius: 10,
    elevation: 3,
    overflow: 'hidden',
  },
  selectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: mode === 'light' ? '#F1F5F9' : '#334155',
    paddingBottom: rem(15),
    marginBottom: rem(20),
  },
  selectorTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rem(8),
  },
  selectorTitle: {
    fontSize: rem(14),
    fontWeight: '800',
    color: colors.text,
    fontFamily: 'Inter-Bold',
  },
  premiumSelectorTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: mode === 'light' ? '#F8FAFC' : '#0F172A',
    borderColor: mode === 'light' ? '#E2E8F0' : '#334155',
    borderWidth: 1,
    borderRadius: rem(12),
    paddingHorizontal: rem(12),
    paddingVertical: rem(6),
    gap: rem(8),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  activeIndicatorDot: {
    width: rem(8),
    height: rem(8),
    borderRadius: rem(4),
    backgroundColor: '#10B981',
  },
  premiumSelectorText: {
    fontSize: rem(12),
    color: colors.textMuted,
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
  bottomSheetContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: rem(24),
    borderTopRightRadius: rem(24),
    paddingHorizontal: rem(20),
    paddingBottom: rem(30),
    paddingTop: rem(12),
    maxHeight: '80%',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 20,
  },
  dragIndicator: {
    width: rem(40),
    height: rem(4),
    backgroundColor: mode === 'light' ? '#E2E8F0' : '#475569',
    borderRadius: rem(2),
    alignSelf: 'center',
    marginBottom: rem(20),
  },
  bottomSheetHeader: {
    marginBottom: rem(20),
  },
  bottomSheetTitle: {
    fontSize: rem(18),
    color: colors.text,
    fontWeight: '800',
    fontFamily: 'Inter-Bold',
    letterSpacing: -0.5,
  },
  bottomSheetSubtitle: {
    fontSize: rem(13),
    color: colors.textMuted,
    fontFamily: 'Inter-Regular',
    marginTop: rem(4),
  },
  registersScroll: {
    marginBottom: rem(20),
    maxHeight: rem(250),
  },
  registerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: mode === 'light' ? '#F8FAFC' : '#0F172A',
    borderColor: mode === 'light' ? '#E2E8F0' : '#334155',
    borderWidth: 1,
    borderRadius: rem(16),
    padding: rem(16),
    marginBottom: rem(12),
  },
  registerCardActive: {
    backgroundColor: mode === 'light' ? '#EEF2FF' : '#1E1B4B',
    borderColor: colors.primary,
    borderWidth: 2,
  },
  registerCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rem(12),
  },
  registerIconCircle: {
    width: rem(36),
    height: rem(36),
    borderRadius: rem(18),
    backgroundColor: mode === 'light' ? '#E2E8F0' : '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerIconCircleActive: {
    backgroundColor: mode === 'light' ? '#E0E7FF' : '#312E81',
  },
  registerCardTextContainer: {
    justifyContent: 'center',
  },
  registerCardName: {
    fontSize: rem(14),
    color: colors.text,
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
  },
  registerCardNameActive: {
    color: colors.primary,
  },
  registerCardDesc: {
    fontSize: rem(11),
    color: colors.textMuted,
    fontFamily: 'Inter-Regular',
    marginTop: rem(2),
  },
  activeCheckCircle: {
    width: rem(20),
    height: rem(20),
    borderRadius: rem(10),
    borderColor: colors.primary,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkDot: {
    width: rem(10),
    height: rem(10),
    borderRadius: rem(5),
    backgroundColor: colors.primary,
  },
  closeSheetButton: {
    backgroundColor: mode === 'light' ? '#F1F5F9' : '#334155',
    borderRadius: rem(14),
    paddingVertical: rem(14),
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeSheetButtonText: {
    fontSize: rem(14),
    color: colors.text,
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
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
  movementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: mode === 'light' ? '#F8FAFC' : '#0F172A',
    borderRadius: rem(12),
    padding: rem(10),
    borderWidth: 1,
    borderColor: mode === 'light' ? '#E2E8F0' : '#334155',
  },
  movementIconContainer: {
    width: rem(28),
    height: rem(28),
    borderRadius: rem(14),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: rem(10),
  },
  iconInflowBg: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  iconOutflowBg: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  movementDetails: {
    flex: 1,
  },
  movementDesc: {
    fontSize: rem(11),
    fontWeight: '700',
    color: colors.text,
    fontFamily: 'Inter-Bold',
  },
  movementTime: {
    fontSize: rem(9),
    color: colors.textMuted,
    marginTop: rem(2),
    fontFamily: 'Inter-Regular',
  },
  movementAmountText: {
    fontSize: rem(12),
    fontWeight: '800',
    fontFamily: 'Inter-Black',
  },
  textPositive: {
    color: '#10B981',
  },
  textNegative: {
    color: '#EF4444',
  }
});
