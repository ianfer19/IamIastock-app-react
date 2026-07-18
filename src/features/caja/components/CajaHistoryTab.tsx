import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Modal,
  ScrollView,
  Share,
  TextInput,
  PanResponder,
  Animated,
  Platform,
} from 'react-native';
import {
  Clock,
  Calendar,
  Coins,
  ChevronRight,
  Share2,
  Search,
  Filter,
  X,
  Printer,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  TrendingUp,
  SlidersHorizontal,
  User,
} from 'lucide-react-native';
import { MotiView, AnimatePresence } from 'moti';
import { rem } from '@/core/utils/responsive';
import { CurrencyService } from '@/core/services/currencyService';
import { CashRegisterService } from '@/infrastructure/services/cashRegisterService';
import { useTheme } from '@/core/theme/theme';
import * as Haptics from 'expo-haptics';

interface CajaHistoryTabProps {
  triggerHaptic: (style?: Haptics.ImpactFeedbackStyle) => void;
  registersList: any[];
}

export const CajaHistoryTab: React.FC<CajaHistoryTabProps> = ({
  triggerHaptic,
  registersList,
}) => {
  const { colors, mode } = useTheme();
  const styles = getStyles(colors, mode);

  // Format utility to strip trailing decimal zeros
  const formatCurrency = (amount: number | string): string => {
    const formatted = CurrencyService.format(amount);
    return formatted.replace(/[.,]00$/, '');
  };

  // State variables
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRegisterFilter, setSelectedRegisterFilter] = useState<string>('TODAS');
  const [datePreset, setDatePreset] = useState<'HOY' | 'AYER' | '7_DIAS' | 'TODAS'>('TODAS');
  const [showFilters, setShowFilters] = useState<boolean>(false);

  // Modal and details state
  const [selectedSession, setSelectedSession] = useState<any | null>(null);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loadingExpenses, setLoadingExpenses] = useState<boolean>(false);

  // Animated value for real-time progressive sliding (translateY)
  const translateY = useRef(new Animated.Value(0)).current;

  // Swipe-down to close gesture responder (dedicated drag header)
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        // Clamp drag translation so it can only go downwards (positive dy)
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        } else {
          translateY.setValue(0);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        // Safe threshold: if dragged down more than 120px or with rapid downwards speed (flick)
        if (gestureState.dy > 120 || gestureState.vy > 0.4) {
          triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
          Animated.timing(translateY, {
            toValue: 800, // Slide all the way down off screen
            duration: 250,
            useNativeDriver: true,
          }).start(() => {
            setModalVisible(false);
          });
        } else {
          // Snap back to the original top position with a spring animation
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

  // Animación suave de cierre de modal para evitar el doble slide-down nativo
  const closeModalWithAnim = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    Animated.timing(translateY, {
      toValue: 800,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      setModalVisible(false);
    });
  };

  // Deslizamiento elástico de apertura suave de modal
  useEffect(() => {
    if (modalVisible) {
      translateY.setValue(800); // Inicia completamente abajo
      Animated.spring(translateY, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }).start();
    }
  }, [modalVisible]);

  // Load cash register sessions
  const loadSessions = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const data = await CashRegisterService.getSessionsHistory();
      console.log('📊 [CajaHistoryTab] Raw sessions history received:', JSON.stringify(data, null, 2));
      setSessions(data);
    } catch (error) {
      console.error('❌ Error cargando historial de caja:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const handleRefresh = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    loadSessions(false);
  };

  // Robust session data parser
  const parsedSessions = useMemo(() => {
    return sessions.map((item: any, index: number) => {
      const salesTotal = parseFloat(item.sales_total ?? item.salesTotal ?? item.total_sales ?? '0');
      const initialAmount = parseFloat(item.initial_amount ?? item.initialAmount ?? item.start ?? '0');
      const totalInflows = parseFloat(item.total_inflows ?? item.totalInflows ?? item.inflows ?? '0');
      const totalOutflows = parseFloat(item.total_outflows ?? item.totalOutflows ?? item.outflows ?? item.total_expenses ?? '0');
      const expectedAmount = parseFloat(item.expected_amount ?? item.expectedAmount ?? item.expected ?? '0');
      const reportedAmount = parseFloat(item.reported_amount ?? item.reportedAmount ?? item.reported ?? '0');
      const discrepancy = parseFloat(item.discrepancy ?? item.discrepancy_amount ?? item.difference ?? '0');
      
      const openedAt = item.opened_at ?? item.openedAt ?? item.created_at ?? '';
      const closedAt = item.closed_at ?? item.closedAt ?? item.updated_at ?? '';
      
      const openedBy = item.opened_by_name ?? item.opened_by ?? item.openedByName ?? 'Cajero';
      const closedBy = item.closed_by_name ?? item.closed_by ?? item.closedByName ?? 'Cajero';
      const cashRegisterId = item.cash_register_id ?? item.cashRegisterId ?? '';

      // Match register ID against loaded registers list to get the human-friendly register name
      const matchedRegister = registersList.find(
        (reg) => String(reg.id).toLowerCase() === String(cashRegisterId).toLowerCase()
      );
      const cashRegisterName = matchedRegister?.name ?? item.cash_register_name ?? item.cashRegisterName ?? `Caja ${cashRegisterId}`;

      const computedId = item.id ?? (item.SK && item.PK ? `${item.PK}_${item.SK}` : `${item.PK || 'session'}_${openedAt || index}`);
      console.log(`🔍 [CajaHistoryTab DB Diagnostic] Session [${index}] -> PK: ${item.PK}, SK: ${item.SK}, ID: ${item.id}, computedId: ${computedId}`);

      return {
        id: computedId,
        salesTotal,
        initialAmount,
        totalInflows,
        totalOutflows,
        expectedAmount,
        reportedAmount,
        discrepancy,
        openedAt,
        closedAt,
        openedBy,
        closedBy,
        cashRegisterId,
        cashRegisterName,
        expected_breakdown: item.expected_breakdown ?? item.expectedBreakdown ?? [],
        end_amount_breakdown: item.end_amount_breakdown ?? item.endAmountBreakdown ?? [],
        sales_breakdown: item.sales_breakdown ?? item.salesBreakdown ?? []
      };
    });
  }, [sessions, registersList]);

  // Date Filtering logic
  const filteredSessions = useMemo(() => {
    return parsedSessions.filter((session) => {
      // 1. Text filter
      const textMatch =
        session.openedBy.toLowerCase().includes(searchQuery.toLowerCase()) ||
        session.closedBy.toLowerCase().includes(searchQuery.toLowerCase()) ||
        session.cashRegisterName.toLowerCase().includes(searchQuery.toLowerCase());

      if (!textMatch) return false;

      // 2. Register Filter
      if (selectedRegisterFilter !== 'TODAS' && session.cashRegisterId !== selectedRegisterFilter) {
        return false;
      }

      // 3. Date Preset Filter
      if (!session.openedAt) return true;
      const openedDate = new Date(session.openedAt);
      const today = new Date();
      
      const isSameDay = (d1: Date, d2: Date) =>
        d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate();

      switch (datePreset) {
        case 'HOY':
          return isSameDay(openedDate, today);
        case 'AYER': {
          const yesterday = new Date();
          yesterday.setDate(today.getDate() - 1);
          return isSameDay(openedDate, yesterday);
        }
        case '7_DIAS': {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(today.getDate() - 7);
          return openedDate >= sevenDaysAgo;
        }
        case 'TODAS':
        default:
          return true;
      }
    });
  }, [parsedSessions, searchQuery, selectedRegisterFilter, datePreset]);

  // Bento Stats calculations
  const bentoStats = useMemo(() => {
    let totalSales = 0;
    let totalExpenses = 0;
    filteredSessions.forEach((s) => {
      totalSales += s.salesTotal;
      totalExpenses += s.totalOutflows;
    });
    return {
      count: filteredSessions.length,
      totalSales,
      totalExpenses,
    };
  }, [filteredSessions]);

  // Lazy loaded expenses loader for active thermal receipt
  const loadExpensesForSession = async (session: any) => {
    setLoadingExpenses(true);
    setExpenses([]);
    try {
      const openedDate = session.openedAt ? session.openedAt.substring(0, 10) : '';
      const closedDate = session.closedAt ? session.closedAt.substring(0, 10) : new Date().toISOString().substring(0, 10);
      
      if (openedDate) {
        // Fetch expenses from opened date to closed date
        const allExpenses = await CashRegisterService.getSessionExpenses(openedDate, closedDate);
        
        // Client-side timezone-safe date-range and cashRegister ID filter
        const openedTime = new Date(session.openedAt).getTime();
        const closedTime = session.closedAt ? new Date(session.closedAt).getTime() : Date.now();

        const filtered = allExpenses.filter((expense: any) => {
          const expenseTime = new Date(expense.date_iso ?? expense.created_at ?? '').getTime();
          const matchesRegister = !expense.cash_register_id || expense.cash_register_id === session.cashRegisterId;
          return matchesRegister && expenseTime >= openedTime && expenseTime <= closedTime;
        });

        setExpenses(filtered);
      }
    } catch (e) {
      console.error('Error cargando gastos diferidos:', e);
    } finally {
      setLoadingExpenses(false);
    }
  };

  // Open ticket details modal
  const handleOpenDetails = (session: any) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedSession(session);
    setModalVisible(true);
    loadExpensesForSession(session);
  };

  // Label Formatter for Payment Methods
  const getMethodLabel = (method: string) => {
    const m = String(method).toLowerCase().trim();
    if (m === 'cash' || m === 'efectivo') return 'Efectivo';
    if (m === 'credit' || m === 'credito' || m === 'tarjeta' || m === 'crédito') return 'Tarjeta / Crédito';
    if (m === 'debit' || m === 'debito' || m === 'débito') return 'Débito';
    if (m === 'transfer' || m === 'transferencia') return 'Transferencia';
    return method.charAt(0).toUpperCase() + method.slice(1);
  };

  // Compile Dynamic Payment Methods Breakdown list
  const breakdownList = useMemo(() => {
    if (!selectedSession) return [];

    // Prioritize expected_breakdown
    if (selectedSession.expected_breakdown && selectedSession.expected_breakdown.length > 0) {
      return selectedSession.expected_breakdown.map((b: any) => ({
        method: b.method ?? b.name ?? 'Método',
        expected: parseFloat(b.expected ?? '0'),
        counted: parseFloat(b.counted ?? b.reported ?? b.expected ?? '0'),
      }));
    }

    // Fallback 1: end_amount_breakdown
    if (selectedSession.end_amount_breakdown && selectedSession.end_amount_breakdown.length > 0) {
      return selectedSession.end_amount_breakdown.map((b: any) => ({
        method: b.method ?? 'Método',
        expected: parseFloat(b.amount ?? '0'),
        counted: parseFloat(b.amount ?? '0'),
      }));
    }

    // Fallback 2: sales_breakdown
    if (selectedSession.sales_breakdown && selectedSession.sales_breakdown.length > 0) {
      return selectedSession.sales_breakdown.map((b: any) => ({
        method: b.method ?? 'Método',
        expected: parseFloat(b.amount ?? '0'),
        counted: parseFloat(b.amount ?? '0'),
      }));
    }

    return [];
  }, [selectedSession]);

  // Build beautiful text invoice format for WhatsApp/Email sharing
  const handleShareReport = async () => {
    if (!selectedSession) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);

    const formatMoney = (val: number) => {
      const formatted = CurrencyService.format(val);
      return formatted.replace(/[.,]00$/, '');
    };
    const diffText = selectedSession.discrepancy === 0 
      ? '🟢 CUADRADA' 
      : selectedSession.discrepancy < 0 
        ? `🔴 FALTANTE: ${formatMoney(selectedSession.discrepancy)}`
        : `🔵 SOBRANTE: +${formatMoney(selectedSession.discrepancy)}`;

    const textReport = `
*** REPORTE ARQUEO HISTÓRICO - IAStock ***
-----------------------------------------
Caja: ${selectedSession.cashRegisterName}
Apertura: ${new Date(selectedSession.openedAt).toLocaleString()}
Cierre: ${selectedSession.closedAt ? new Date(selectedSession.closedAt).toLocaleString() : 'No cerrado'}
Iniciado por: ${selectedSession.openedBy}
Cerrado por: ${selectedSession.closedBy}
-----------------------------------------
RESUMEN CONTABLE:
- Saldo Inicial (Base): ${formatMoney(selectedSession.initialAmount)}
- Ventas Totales: ${formatMoney(selectedSession.salesTotal)}
- Entradas Manuales: ${formatMoney(selectedSession.totalInflows)}
- Egresos / Retiros: ${formatMoney(selectedSession.totalOutflows)}
- Saldo Esperado: ${formatMoney(selectedSession.expectedAmount)}
- Saldo Reportado: ${formatMoney(selectedSession.reportedAmount)}
-----------------------------------------
ESTADO FINAL: ${diffText}
-----------------------------------------
Generado automáticamente desde IAStock App.
`;

    try {
      await Share.share({
        message: textReport,
        title: `Arqueo Caja ${selectedSession.cashRegisterName}`,
      });
    } catch (error) {
      console.error('Error al compartir reporte:', error);
    }
  };

  // Helper styles for badges
  const getDiffBadgeColor = (diff: number) => {
    if (diff === 0) return { bg: mode === 'light' ? '#E6F4EA' : '#064E3B', text: mode === 'light' ? '#137333' : '#A7F3D0', label: 'CUADRADA' };
    if (diff < 0) return { bg: mode === 'light' ? '#FCE8E6' : '#7f1d1d', text: mode === 'light' ? '#C5221F' : '#FCA5A5', label: `FALTANTE` };
    return { bg: mode === 'light' ? '#E8F0FE' : '#1E3A8A', text: mode === 'light' ? '#1A73E8' : '#93C5FD', label: `SOBRANTE` };
  };

  return (
    <View style={styles.container}>
      {/* Search and Filters bar */}
      <View style={styles.filterSection}>
        {/* Bento Metrics consolidadas - Ahora arriba de todo (del buscador y filtros) */}
        <MotiView
          from={{ opacity: 0, translateY: -10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ delay: 100 }}
          style={styles.bentoGrid}
        >
          {/* Card 1: Count */}
          <View style={[styles.bentoCard, { flex: 1, backgroundColor: mode === 'light' ? '#EFF1FE' : '#1E1B4B' }]}>
            <Clock size={rem(18)} color={colors.primary} />
            <Text style={styles.bentoLabel}>TURNOS REGISTRADOS</Text>
            <Text style={styles.bentoValue}>{bentoStats.count}</Text>
          </View>

          {/* Card 2: Accumulated Sales */}
          <View style={[styles.bentoCard, { flex: 1.3, backgroundColor: mode === 'light' ? '#E6F4EA' : '#064E3B' }]}>
            <TrendingUp size={rem(18)} color="#10B981" />
            <Text style={styles.bentoLabel}>VENTAS ACUMULADAS</Text>
            <Text style={[styles.bentoValue, { color: mode === 'light' ? '#137333' : '#A7F3D0' }]}>
              {formatCurrency(bentoStats.totalSales)}
            </Text>
          </View>

          {/* Card 3: Accumulated Expenses */}
          <View style={[styles.bentoCard, { flex: 1.2, backgroundColor: mode === 'light' ? '#FCE8E6' : '#7f1d1d' }]}>
            <ArrowDownLeft size={rem(18)} color="#EF4444" />
            <Text style={styles.bentoLabel}>GASTOS TOTALES</Text>
            <Text style={[styles.bentoValue, { color: mode === 'light' ? '#C5221F' : '#FCA5A5' }]}>
              {formatCurrency(bentoStats.totalExpenses)}
            </Text>
          </View>
        </MotiView>

        <View style={styles.searchBar}>
          <Search size={rem(14)} color={colors.textMuted} style={{ marginRight: rem(6) }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por cajero, caja..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={{ marginRight: rem(6) }}>
              <X size={rem(14)} color={colors.textMuted} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => {
              triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
              setShowFilters(!showFilters);
            }}
            style={{ padding: rem(4) }}
            activeOpacity={0.7}
          >
            <SlidersHorizontal size={rem(15)} color={showFilters ? colors.primary : colors.textMuted} />
          </TouchableOpacity>
        </View>

        <AnimatePresence>
          {showFilters && (
            <MotiView
              from={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ type: 'timing', duration: 220 }}
              style={{ overflow: 'hidden' }}
            >
              {/* Date chips selector */}
              <View style={styles.chipsContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
                  {(['TODAS', 'HOY', 'AYER', '7_DIAS'] as const).map((preset) => {
                    const label = preset === 'TODAS' ? 'Todo' : preset === '7_DIAS' ? '7 Días' : preset.toLowerCase();
                    const isSelected = datePreset === preset;
                    return (
                      <TouchableOpacity
                        key={preset}
                        style={[styles.chip, isSelected && styles.chipActive]}
                        onPress={() => {
                          triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                          setDatePreset(preset);
                        }}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                          {label.charAt(0).toUpperCase() + label.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Register Selector row */}
              {registersList.length > 0 && (
                <View style={styles.registersFilterRow}>
                  <Filter size={rem(11)} color={colors.textMuted} style={{ marginRight: rem(4) }} />
                  <Text style={styles.registerFilterLabel}>Filtrar Caja: </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.registersListScroll}>
                    <TouchableOpacity
                      style={[styles.regBtn, selectedRegisterFilter === 'TODAS' && styles.regBtnActive]}
                      onPress={() => {
                        triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                        setSelectedRegisterFilter('TODAS');
                      }}
                    >
                      <Text style={[styles.regBtnText, selectedRegisterFilter === 'TODAS' && styles.regBtnTextActive]}>Todas</Text>
                    </TouchableOpacity>
                    {registersList.map((reg) => (
                      <TouchableOpacity
                        key={reg.id}
                        style={[styles.regBtn, selectedRegisterFilter === reg.id && styles.regBtnActive]}
                        onPress={() => {
                          triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                          setSelectedRegisterFilter(reg.id);
                        }}
                      >
                        <Text style={[styles.regBtnText, selectedRegisterFilter === reg.id && styles.regBtnTextActive]}>
                          {reg.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </MotiView>
          )}
        </AnimatePresence>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando historial de caja...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredSessions}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: rem(10), paddingTop: rem(8), paddingBottom: rem(80) }}
          renderItem={({ item, index }) => {
            console.log(`📡 [CajaHistoryTab Render Diagnostic] RenderItem [${index}] -> id: ${item.id}, keyExtractorKey: ${item.id}-${index}`);
            const badge = getDiffBadgeColor(item.discrepancy);
            const formattedTime = (isoString: string) => {
              if (!isoString) return '--:--';
              return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            };
            const formattedDate = (isoString: string) => {
              if (!isoString) return '';
              return new Date(isoString).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
            };

            const accentColor = item.discrepancy === 0 
              ? '#10B981' 
              : item.discrepancy < 0 
                ? '#EF4444' 
                : '#3B82F6';

            return (
              <MotiView
                from={{ opacity: 0, scale: 0.95, translateY: 15 }}
                animate={{ opacity: 1, scale: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 350, delay: index * 50 }}
                style={[styles.sessionCard, { borderLeftColor: accentColor }]}
              >
                <TouchableOpacity
                  style={styles.sessionCardButton}
                  onPress={() => handleOpenDetails(item)}
                  activeOpacity={0.8}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.dateBadgeContainer}>
                      <Calendar size={rem(12)} color={colors.primary} />
                      <Text style={styles.cardDateText}>{formattedDate(item.openedAt)}</Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.badgeText, { color: badge.text }]}>
                        {badge.label}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardMain}>
                    <View style={styles.leftCol}>
                      <Text style={styles.registerNameText}>{item.cashRegisterName}</Text>
                      <View style={styles.cashierRow}>
                        <User size={rem(11)} color="#0EA5E9" />
                        <Text style={styles.cashierNameText}>{item.closedBy}</Text>
                      </View>
                      <View style={styles.hoursRow}>
                        <Clock size={rem(11)} color="#F59E0B" />
                        <Text style={styles.hoursText}>
                          {formattedTime(item.openedAt)} - {item.closedAt ? formattedTime(item.closedAt) : 'Abierto'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.rightCol}>
                      <Text style={styles.cardSalesLabel}>VENTAS TOTALES</Text>
                      <Text style={[styles.cardSalesValue, { color: item.salesTotal > 0 ? '#10B981' : colors.textMuted }]}>
                        {formatCurrency(item.salesTotal)}
                      </Text>
                      {item.discrepancy !== 0 && (
                        <Text style={[styles.cardDiffText, { color: badge.text }]}>
                          {item.discrepancy > 0 ? '+' : ''}{formatCurrency(item.discrepancy)}
                        </Text>
                      )}
                    </View>

                    <ChevronRight size={rem(16)} color={colors.textMuted} style={{ marginLeft: rem(4) }} />
                  </View>
                </TouchableOpacity>
              </MotiView>
            );
          }}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Clock size={rem(42)} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>Sin registros en este periodo</Text>
              <Text style={styles.emptySubtitle}>
                Ajusta los filtros o presets superiores para expandir los resultados de la consulta.
              </Text>
            </View>
          )}
        />
      )}

      {modalVisible && (
        <Modal
          visible={modalVisible}
          animationType="none"
          transparent={true}
          onRequestClose={closeModalWithAnim}
        >
        <View style={styles.modalOverlay}>
          <Animated.View style={[styles.modalContent, { transform: [{ translateY }] }]}>
            {/* Drag handle area (safe from clipping, 100% responsive gesture) */}
            <View style={styles.dragHeaderContainer} {...panResponder.panHandlers}>
              <View style={styles.dragger} />
            </View>

            {/* Interactive Header Row (safe from rounded corners) */}
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalHeaderTitle}>Reporte de Turno</Text>
              <TouchableOpacity
                style={styles.closeModalCircle}
                onPress={closeModalWithAnim}
                activeOpacity={0.7}
              >
                <X size={rem(20)} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView 
              showsVerticalScrollIndicator={false} 
              style={{ flex: 1 }}
              contentContainerStyle={styles.thermalTicketScroll}
            >
              {/* Thermal paper receipt container */}
              <View style={styles.thermalTicket}>
                <View style={styles.thermalHeader}>
                  <Printer size={rem(24)} color={colors.text} style={{ marginBottom: rem(6) }} />
                  <Text style={styles.thermalBrand}>IAStock POS</Text>
                  <Text style={styles.thermalTitle}>*** CONTROL DE ARQUEO HISTÓRICO ***</Text>
                  <Text style={styles.thermalTime}>
                    {selectedSession?.openedAt ? new Date(selectedSession.openedAt).toLocaleString() : ''}
                  </Text>
                </View>

                {/* Divider lines */}
                <Text style={styles.dashedLine}>----------------------------------------------</Text>

                {/* Metadata */}
                <View style={styles.ticketSection}>
                  <Text style={styles.ticketMetaText}>CAJA: {selectedSession?.cashRegisterName}</Text>
                  <Text style={styles.ticketMetaText}>REG ID: {selectedSession?.cashRegisterId}</Text>
                  <Text style={styles.ticketMetaText}>ABRIÓ: {selectedSession?.openedBy}</Text>
                  <Text style={styles.ticketMetaText}>CERRÓ: {selectedSession?.closedBy}</Text>
                  <Text style={styles.ticketMetaText}>
                    CIERRE: {selectedSession?.closedAt ? new Date(selectedSession.closedAt).toLocaleString() : 'Pendiente'}
                  </Text>
                </View>

                <Text style={styles.dashedLine}>----------------------------------------------</Text>

                {/* Financial Summary */}
                <View style={styles.ticketSection}>
                  <Text style={[styles.ticketMetaText, { fontWeight: '900', textAlign: 'center', marginBottom: rem(8) }]}>
                    RESUMEN CONTABLE DE JORNADA
                  </Text>
                  
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>(+) Base de Caja:</Text>
                    <Text style={styles.receiptValue}>{formatCurrency(selectedSession?.initialAmount ?? 0)}</Text>
                  </View>

                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>(+) Ventas Totales:</Text>
                    <Text style={styles.receiptValue}>{formatCurrency(selectedSession?.salesTotal ?? 0)}</Text>
                  </View>

                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>(+) Entradas Manuales:</Text>
                    <Text style={styles.receiptValue}>{formatCurrency(selectedSession?.totalInflows ?? 0)}</Text>
                  </View>

                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>(-) Retiros / Egresos:</Text>
                    <Text style={styles.receiptValue}>{formatCurrency(selectedSession?.totalOutflows ?? 0)}</Text>
                  </View>

                  <Text style={styles.dottedLine}>......................................................................</Text>

                  <View style={styles.receiptRow}>
                    <Text style={[styles.receiptLabel, { fontWeight: '900' }]}>Saldo Esperado:</Text>
                    <Text style={[styles.receiptValue, { fontWeight: '900' }]}>
                      {formatCurrency(selectedSession?.expectedAmount ?? 0)}
                    </Text>
                  </View>

                  <View style={styles.receiptRow}>
                    <Text style={[styles.receiptLabel, { fontWeight: '900' }]}>Saldo Reportado:</Text>
                    <Text style={[styles.receiptValue, { fontWeight: '900' }]}>
                      {formatCurrency(selectedSession?.reportedAmount ?? 0)}
                    </Text>
                  </View>

                  <Text style={styles.dottedLine}>......................................................................</Text>

                  {/* Discrepancy representation */}
                  <View style={styles.receiptRow}>
                    <Text style={[styles.receiptLabel, { fontWeight: '900', color: selectedSession?.discrepancy === 0 ? colors.text : '#DC2626' }]}>
                      Discrepancia Arqueo:
                    </Text>
                    <Text style={[styles.receiptValue, { fontWeight: '900', color: selectedSession?.discrepancy >= 0 ? '#10B981' : '#DC2626' }]}>
                      {selectedSession?.discrepancy > 0 ? '+' : ''}
                      {formatCurrency(selectedSession?.discrepancy ?? 0)}
                    </Text>
                  </View>
                </View>

                <Text style={styles.dashedLine}>----------------------------------------------</Text>

                {/* Payment methods expected breakdown */}
                {breakdownList && breakdownList.length > 0 && (
                  <View style={styles.ticketSection}>
                    <Text style={[styles.ticketMetaText, { fontWeight: '900', textAlign: 'center', marginBottom: rem(8) }]}>
                      DESGLOSE POR MEDIO DE PAGO
                    </Text>
                    
                    {/* Header Table */}
                    <View style={styles.tableRowHeader}>
                      <Text style={[styles.tableCol, { flex: 2 }]}>Método</Text>
                      <Text style={[styles.tableCol, { textAlign: 'right', flex: 1.5 }]}>Esperado</Text>
                      <Text style={[styles.tableCol, { textAlign: 'right', flex: 1.5 }]}>Contado</Text>
                    </View>

                    {breakdownList.map((b: any, index: number) => (
                      <View key={index} style={styles.tableRow}>
                        <Text style={[styles.tableCol, { flex: 2 }]}>{getMethodLabel(b.method)}</Text>
                        <Text style={[styles.tableCol, { textAlign: 'right', flex: 1.5 }]}>
                          {formatCurrency(b.expected)}
                        </Text>
                        <Text style={[styles.tableCol, { textAlign: 'right', flex: 1.5, fontWeight: '700' }]}>
                          {formatCurrency(b.counted)}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                <Text style={styles.dashedLine}>----------------------------------------------</Text>

                {/* Lazy Loaded Expenses */}
                <View style={styles.ticketSection}>
                  <Text style={[styles.ticketMetaText, { fontWeight: '900', textAlign: 'center', marginBottom: rem(8) }]}>
                    GASTOS Y EGRESOS DE JORNADA
                  </Text>

                  {loadingExpenses ? (
                    <View style={{ paddingVertical: rem(15), alignItems: 'center' }}>
                      <ActivityIndicator size="small" color={colors.textMuted} />
                      <Text style={styles.loadingExpensesText}>Cargando comprobantes...</Text>
                    </View>
                  ) : expenses.length === 0 ? (
                    <Text style={styles.emptyExpensesText}>No se registraron egresos o gastos en este turno.</Text>
                  ) : (
                    expenses.map((exp: any, idx: number) => (
                      <View key={idx} style={styles.expenseItem}>
                        <View style={styles.expenseHeaderRow}>
                          <Text style={styles.expenseTitle}>- {exp.description || 'Gasto General'}</Text>
                          <Text style={styles.expenseAmount}>
                            -{formatCurrency(parseFloat(exp.amount ?? 0))}
                          </Text>
                        </View>
                        <View style={styles.expenseFooterRow}>
                          <Text style={styles.expenseCategory}>{exp.category || 'Varios'}</Text>
                          <Text style={styles.expenseTime}>
                            {exp.date_iso ? new Date(exp.date_iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </Text>
                        </View>
                      </View>
                    ))
                  )}
                </View>

                <Text style={styles.dashedLine}>----------------------------------------------</Text>
                <Text style={[styles.ticketMetaText, { textAlign: 'center', fontStyle: 'italic', fontSize: rem(9) }]}>
                  Fin del Reporte - IAStock Mobile App
                </Text>
              </View>

              {/* Interaction Buttons below Ticket */}
              <View style={styles.ticketActions}>
                <TouchableOpacity
                  style={styles.shareReportBtn}
                  activeOpacity={0.8}
                  onPress={handleShareReport}
                >
                  <Share2 size={rem(16)} color="#FFFFFF" style={{ marginRight: rem(6) }} />
                  <Text style={styles.shareReportBtnText}>Compartir Arqueo (WhatsApp)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.printBtn}
                  activeOpacity={0.8}
                  onPress={() => {
                    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                    alert('Impresión de tiquete térmico enviada a cola Bluetooth/USB.');
                  }}
                >
                  <Printer size={rem(15)} color={colors.textMuted} style={{ marginRight: rem(6) }} />
                  <Text style={styles.printBtnText}>Imprimir Recibo Físico</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
      )}
    </View>
  );
};

const getStyles = (colors: any, mode: string) => StyleSheet.create({
  container: {
    flex: 1,
  },
  filterSection: {
    paddingHorizontal: rem(10),
    paddingTop: rem(4),
    paddingBottom: rem(6),
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: rem(12),
    paddingHorizontal: rem(10),
    height: rem(38),
    marginBottom: rem(4),
    borderWidth: 1,
    borderColor: mode === 'light' ? '#E2E8F0' : '#334155',
  },
  searchInput: {
    flex: 1,
    fontSize: rem(13),
    fontFamily: 'Inter-Regular',
    color: colors.text,
    padding: 0,
  },
  chipsContainer: {
    marginBottom: rem(8),
    marginTop: rem(6),
  },
  chipsScroll: {
    gap: rem(6),
  },
  chip: {
    paddingHorizontal: rem(14),
    paddingVertical: rem(6.5),
    borderRadius: rem(15),
    backgroundColor: mode === 'light' ? '#F1F5F9' : '#1E293B',
  },
  chipActive: {
    backgroundColor: colors.primary,
  },
  chipText: {
    fontSize: rem(12.5),
    fontWeight: '600',
    color: colors.textMuted,
    fontFamily: 'Inter-Medium',
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontFamily: 'Inter-Bold',
  },
  registersFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: rem(4),
    marginBottom: rem(2),
  },
  registerFilterLabel: {
    fontSize: rem(12),
    fontWeight: '600',
    color: colors.textMuted,
    marginRight: rem(6),
    fontFamily: 'Inter-Medium',
  },
  registersListScroll: {
    gap: rem(5),
  },
  regBtn: {
    paddingHorizontal: rem(12),
    paddingVertical: rem(5),
    borderRadius: rem(10),
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: mode === 'light' ? '#E2E8F0' : '#334155',
  },
  regBtnActive: {
    backgroundColor: mode === 'light' ? '#EBF4FF' : '#1E1B4B',
    borderColor: colors.primary,
  },
  regBtnText: {
    fontSize: rem(11.5),
    color: colors.textMuted,
    fontFamily: 'Inter-Regular',
  },
  regBtnTextActive: {
    color: colors.primary,
    fontWeight: 'bold',
    fontFamily: 'Inter-Bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: rem(80),
  },
  loadingText: {
    marginTop: rem(12),
    fontSize: rem(12),
    color: colors.textMuted,
    fontFamily: 'Inter-Regular',
  },

  /* Bento grid styling */
  bentoGrid: {
    flexDirection: 'row',
    gap: rem(6),
    paddingHorizontal: 0,
    paddingTop: rem(4),
    paddingBottom: rem(4),
    marginBottom: rem(4),
  },
  bentoCard: {
    paddingHorizontal: rem(8),
    paddingVertical: rem(8),
    borderRadius: rem(12),
    gap: rem(2),
  },
  bentoLabel: {
    fontSize: rem(7.5),
    fontWeight: '900',
    color: colors.textMuted,
    letterSpacing: 0.2,
    fontFamily: 'Inter-Bold',
  },
  bentoValue: {
    fontSize: rem(11.5),
    fontWeight: '900',
    color: colors.text,
    fontFamily: 'Inter-Black',
    marginTop: rem(2),
  },

  /* List cards styling */
  sessionCard: {
    marginBottom: rem(8),
    backgroundColor: colors.surface, // Slate soft tint background
    borderRadius: rem(14),
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: mode === 'light' ? 0.03 : 0.1,
    shadowRadius: 6,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: mode === 'light' ? '#E2E8F0' : '#334155', // fallback color
  },
  sessionCardButton: {
    paddingHorizontal: rem(11),
    paddingVertical: rem(9),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: rem(4),
    borderBottomWidth: 1,
    borderBottomColor: mode === 'light' ? '#F1F5F9' : '#334155',
    paddingBottom: rem(3),
  },
  dateBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rem(4),
  },
  cardDateText: {
    fontSize: rem(10.5),
    fontWeight: '600',
    color: colors.textMuted, // Soft light slate gray for metadata
    fontFamily: 'Inter-Medium',
  },
  badge: {
    paddingHorizontal: rem(8),
    paddingVertical: rem(2),
    borderRadius: rem(6),
  },
  badgeText: {
    fontSize: rem(8.5),
    fontWeight: '900',
    letterSpacing: 0.2,
    fontFamily: 'Inter-Black',
  },
  cardMain: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  leftCol: {
    flex: 1.5,
    gap: rem(3),
  },
  registerNameText: {
    fontSize: rem(13.5),
    fontWeight: 'bold',
    color: colors.text, // Strong dark slate for title
    fontFamily: 'Inter-Bold',
  },
  cashierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rem(4),
    marginTop: rem(1),
  },
  cashierNameText: {
    fontSize: rem(10.5),
    color: colors.textMuted, // Medium slate gray to separate from name
    fontFamily: 'Inter-Regular',
  },
  hoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rem(4),
    marginTop: rem(2),
  },
  hoursText: {
    fontSize: rem(9.5),
    color: colors.textMuted, // Muted slate gray for hours metadata
    fontFamily: 'Inter-Regular',
  },
  rightCol: {
    flex: 1.1,
    alignItems: 'flex-end',
    gap: rem(2),
  },
  cardSalesLabel: {
    fontSize: rem(7.5),
    fontWeight: '900',
    color: colors.textMuted,
    fontFamily: 'Inter-Bold',
  },
  cardSalesValue: {
    fontSize: rem(13.5),
    fontWeight: '900',
    color: colors.text,
    fontFamily: 'Inter-Black',
  },
  cardDiffText: {
    fontSize: rem(9.5),
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
  },

  /* Empty State */
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: rem(80),
    paddingHorizontal: rem(40),
  },
  emptyTitle: {
    fontSize: rem(13.5),
    fontWeight: 'bold',
    color: colors.text,
    marginTop: rem(12),
    marginBottom: rem(4),
    fontFamily: 'Inter-Bold',
  },
  emptySubtitle: {
    fontSize: rem(10.5),
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: rem(15),
    fontFamily: 'Inter-Regular',
  },

  /* Thermal invoice modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)', // Slate backfill translucent overlay
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '88%',
    backgroundColor: mode === 'light' ? '#FAF9F6' : '#1E293B', // Off-white luxury background
    borderTopLeftRadius: rem(25),
    borderTopRightRadius: rem(25),
    paddingHorizontal: rem(12),
    paddingBottom: rem(20),
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: mode === 'light' ? 0.15 : 0.3, shadowRadius: 15 },
      android: { elevation: 20 },
    }),
  },
  dragHeaderContainer: {
    alignItems: 'center',
    paddingVertical: rem(10),
    width: '100%',
  },
  dragger: {
    width: rem(45),
    height: rem(5),
    backgroundColor: mode === 'light' ? '#CBD5E1' : '#475569',
    borderRadius: rem(2.5),
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: rem(12),
    paddingBottom: rem(10),
    borderBottomWidth: 1,
    borderBottomColor: mode === 'light' ? '#F1F5F9' : '#334155',
    marginBottom: rem(8),
  },
  modalHeaderTitle: {
    fontSize: rem(18),
    fontWeight: '700',
    color: colors.text,
    fontFamily: 'Inter-Bold',
  },
  closeModalCircle: {
    width: rem(36),
    height: rem(36),
    borderRadius: rem(18),
    backgroundColor: mode === 'light' ? '#F1F5F9' : '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thermalTicketScroll: {
    paddingVertical: rem(10),
  },
  thermalTicket: {
    backgroundColor: mode === 'light' ? '#FFFFFF' : '#0F172A', // Clean physical white paper receipt
    borderWidth: 1,
    borderColor: mode === 'light' ? '#E2E8F0' : '#334155',
    padding: rem(15),
    borderRadius: rem(4),
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: mode === 'light' ? 0.05 : 0.2, shadowRadius: 5 },
      android: { elevation: 3 },
    }),
  },
  thermalHeader: {
    alignItems: 'center',
    paddingVertical: rem(10),
  },
  thermalBrand: {
    fontSize: rem(14),
    fontWeight: '900',
    color: colors.text,
    fontFamily: 'Inter-Black',
    letterSpacing: 0.5,
  },
  thermalTitle: {
    fontSize: rem(9.5),
    fontWeight: '700',
    color: colors.textMuted,
    marginTop: rem(2),
    fontFamily: 'Inter-Bold',
    letterSpacing: 0.2,
  },
  thermalTime: {
    fontSize: rem(8.5),
    color: colors.textMuted,
    marginTop: rem(2),
    fontFamily: 'Inter-Regular',
  },
  dashedLine: {
    fontSize: rem(10),
    color: colors.textMuted,
    textAlign: 'center',
    marginVertical: rem(6),
    letterSpacing: 1.5,
  },
  dottedLine: {
    fontSize: rem(10),
    color: colors.textMuted,
    textAlign: 'center',
    marginVertical: rem(4),
    letterSpacing: 1,
  },
  ticketSection: {
    paddingVertical: rem(4),
  },
  ticketMetaText: {
    fontSize: rem(9.5),
    fontFamily: 'Inter-Regular',
    color: colors.text,
    lineHeight: rem(14),
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: rem(2),
  },
  receiptLabel: {
    fontSize: rem(10.5),
    color: colors.textMuted,
    fontFamily: 'Inter-Regular',
  },
  receiptValue: {
    fontSize: rem(10.5),
    fontWeight: '700',
    color: colors.text,
    fontFamily: 'Inter-Bold',
  },
  tableRowHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: mode === 'light' ? '#CBD5E1' : '#475569',
    paddingBottom: rem(4),
    marginBottom: rem(4),
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: rem(3),
  },
  tableCol: {
    fontSize: rem(9.5),
    color: colors.text,
    fontFamily: 'Inter-Regular',
  },
  loadingExpensesText: {
    fontSize: rem(9),
    color: colors.textMuted,
    marginTop: rem(4),
    fontFamily: 'Inter-Regular',
  },
  emptyExpensesText: {
    fontSize: rem(9.5),
    color: colors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: rem(10),
    fontFamily: 'Inter-Regular',
  },
  expenseItem: {
    borderBottomWidth: 1,
    borderBottomColor: mode === 'light' ? '#F1F5F9' : '#334155',
    paddingVertical: rem(5),
  },
  expenseHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  expenseTitle: {
    fontSize: rem(10),
    fontWeight: 'bold',
    color: colors.text,
    fontFamily: 'Inter-Bold',
  },
  expenseAmount: {
    fontSize: rem(10),
    fontWeight: '900',
    color: '#DC2626',
    fontFamily: 'Inter-Black',
  },
  expenseFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: rem(2),
  },
  expenseCategory: {
    fontSize: rem(8.5),
    color: colors.textMuted,
    textTransform: 'uppercase',
    fontFamily: 'Inter-Medium',
  },
  expenseTime: {
    fontSize: rem(8.5),
    color: colors.textMuted,
    fontFamily: 'Inter-Regular',
  },

  /* Action footer under ticket */
  ticketActions: {
    marginTop: rem(15),
    gap: rem(10),
    paddingHorizontal: rem(4),
  },
  shareReportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#128C7E', // WhatsApp Brand Green
    height: rem(44),
    borderRadius: rem(12),
    ...Platform.select({
      ios: { shadowColor: '#128C7E', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8 },
      android: { elevation: 3 },
    }),
  },
  shareReportBtnText: {
    color: '#FFFFFF',
    fontSize: rem(12),
    fontWeight: 'bold',
    fontFamily: 'Inter-Bold',
  },
  printBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: mode === 'light' ? '#CBD5E1' : '#475569',
    height: rem(40),
    borderRadius: rem(12),
  },
  printBtnText: {
    color: colors.textMuted,
    fontSize: rem(11.5),
    fontWeight: '600',
    fontFamily: 'Inter-Medium',
  },
});
