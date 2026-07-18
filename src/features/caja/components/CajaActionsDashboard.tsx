import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, FlatList, StyleSheet, ScrollView } from 'react-native';
import { Lock, Unlock, ArrowUpRight, ArrowDownLeft, RefreshCw, History, Activity } from 'lucide-react-native';
import { MotiView } from 'moti';
import { useTheme } from '@/core/theme/theme';
import { rem } from '@/core/utils/responsive';
import { CurrencyService } from '@/core/services/currencyService';
import { CashierSession, CashMovement } from '@/infrastructure/services/cashRegisterService';
import * as Haptics from 'expo-haptics';

interface CajaActionsDashboardProps {
  loading: boolean;
  session: CashierSession | null;
  stats: {
    start: number;
    salesTotal: number;
    inflows: number;
    outflows: number;
    expected: number;
  };
  movementsList: CashMovement[];
  renderMovementItem: (info: { item: CashMovement }) => React.ReactElement;
  setOpenModalVisible: (val: boolean) => void;
  setMovementType: (val: 'INFLOW' | 'OUTFLOW') => void;
  setMovementModalVisible: (val: boolean) => void;
  setCloseModalVisible: (val: boolean) => void;
  handleQuickClose: () => void;
  triggerHaptic: (style?: Haptics.ImpactFeedbackStyle) => void;
}

export const CajaActionsDashboard: React.FC<CajaActionsDashboardProps> = ({
  loading,
  session,
  stats,
  movementsList,
  renderMovementItem,
  setOpenModalVisible,
  setMovementType,
  setMovementModalVisible,
  setCloseModalVisible,
  handleQuickClose,
  triggerHaptic,
}) => {
  const { colors, mode } = useTheme();
  const styles = getStyles(colors, mode);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Cargando estado contable...</Text>
      </View>
    );
  }

  if (session?.status !== 'OPEN') {
    return (
      <MotiView
        from={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'timing', duration: 400 }}
        style={styles.closedStateContainer}
      >
        <View style={styles.lockIconContainer}>
          <Lock size={rem(42)} color={colors.gold} />
        </View>
        <Text style={styles.closedStateTitle}>CAJA ACTUAL CERRADA</Text>
        <Text style={styles.closedStateSubtitle}>
          Abre un nuevo turno de venta para comenzar a facturar órdenes y registrar ingresos en el sistema.
        </Text>
        
        <TouchableOpacity
          style={styles.openRegisterBtn}
          activeOpacity={0.8}
          onPress={() => {
            triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
            setOpenModalVisible(true);
          }}
        >
          <Unlock size={rem(16)} color="#FFFFFF" style={styles.btnIconLeft} />
          <Text style={styles.openRegisterBtnText}>Abrir Turno de Caja</Text>
        </TouchableOpacity>
      </MotiView>
    );
  }

  return (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: rem(20) }}>
      <MotiView
        from={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ type: 'timing', duration: 300 }}
        style={styles.openStateContainer}
      >
      {/* Pulsing Active Session Header */}
      <View style={styles.activeHeaderCard}>
        <View style={styles.activePulseContainer}>
          <MotiView
            from={{ scale: 0.8, opacity: 0.6 }}
            animate={{ scale: 1.5, opacity: 0 }}
            transition={{ loop: true, type: 'timing', duration: 1500 }}
            style={styles.pulseDotOutline}
          />
          <View style={styles.pulseDot} />
          <Text style={styles.activeStatusText}>TURNO ABIERTO</Text>
        </View>
        <Text style={styles.activeMetaText}>
          Iniciado por {session.opened_by || 'Cajero'} el {session.opened_at ? new Date(session.opened_at).toLocaleDateString() : 'hoy'}
        </Text>
      </View>

      {/* Grid Metrics Dashboard */}
      <View style={styles.metricsGrid}>
        {/* Expected Balance Card */}
        <View style={[styles.metricCard, styles.expectedCard]}>
          <Text style={styles.expectedCardLabel}>SALDO ESPERADO EN CAJA</Text>
          <Text style={styles.expectedCardValue}>
            {CurrencyService.format(stats.expected)}
          </Text>
          <View style={styles.expectedDivider} />
          <Text style={styles.expectedCardSub}>
            Monto inicial + Ventas + Ingresos - Egresos
          </Text>
        </View>

        {/* Sub-Metrics Row */}
        <View style={styles.metricsRow}>
          <View style={styles.subMetricCard}>
            <Text style={styles.subMetricLabel}>SALDO INICIAL</Text>
            <Text style={styles.subMetricValue}>{CurrencyService.format(stats.start)}</Text>
          </View>
          <View style={styles.subMetricCard}>
            <Text style={styles.subMetricLabel}>VENTAS REGISTRADAS</Text>
            <Text style={[styles.subMetricValue, { color: colors.primary }]}>
              {CurrencyService.format(stats.salesTotal)}
            </Text>
          </View>
        </View>

        {/* Cash Flow Rows */}
        <View style={styles.metricsRow}>
          <View style={styles.subMetricCard}>
            <Text style={styles.subMetricLabel}>INGRESOS MANUALES</Text>
            <Text style={[styles.subMetricValue, { color: '#10B981' }]}>
              {CurrencyService.format(stats.inflows)}
            </Text>
          </View>
          <View style={styles.subMetricCard}>
            <Text style={styles.subMetricLabel}>EGRESOS / RETIROS</Text>
            <Text style={[styles.subMetricValue, { color: '#EF4444' }]}>
              {CurrencyService.format(stats.outflows)}
            </Text>
          </View>
        </View>
      </View>

      {/* Action Toolbox Buttons */}
      <View style={styles.toolboxContainer}>
        <TouchableOpacity
          style={[styles.toolboxBtn, styles.btnInflowBorder]}
          activeOpacity={0.8}
          onPress={() => {
            triggerHaptic();
            setMovementType('INFLOW');
            setMovementModalVisible(true);
          }}
        >
          <ArrowUpRight size={rem(16)} color="#10B981" />
          <Text style={styles.toolboxBtnText}>Ingresar Dinero</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.toolboxBtn, styles.btnOutflowBorder]}
          activeOpacity={0.8}
          onPress={() => {
            triggerHaptic();
            setMovementType('OUTFLOW');
            setMovementModalVisible(true);
          }}
        >
          <ArrowDownLeft size={rem(16)} color="#EF4444" />
          <Text style={styles.toolboxBtnText}>Retirar Dinero</Text>
        </TouchableOpacity>
      </View>

      {/* Closure Controls */}
      <View style={styles.closureContainer}>
        <TouchableOpacity
          style={styles.closeWizardBtn}
          activeOpacity={0.8}
          onPress={() => {
            triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
            setCloseModalVisible(true);
          }}
        >
          <Lock size={rem(16)} color="#FFFFFF" style={styles.btnIconLeft} />
          <Text style={styles.closeWizardBtnText}>Hacer Arqueo y Cerrar Caja</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickCloseBtn}
          activeOpacity={0.7}
          onPress={handleQuickClose}
        >
          <RefreshCw size={rem(14)} color={colors.textMuted} style={styles.btnIconLeft} />
          <Text style={styles.quickCloseBtnText}>Cierre Teórico Rápido</Text>
        </TouchableOpacity>
      </View>

      {/* Interactive Movements Feed */}
      <View style={styles.historySection}>
        <View style={styles.historyHeader}>
          <History size={rem(16)} color={colors.textMuted} />
          <Text style={styles.historyTitle}>Movimientos de la Sesión</Text>
        </View>
        {movementsList.length === 0 ? (
          <View style={styles.emptyHistoryContainer}>
            <Activity size={rem(32)} color={colors.textMuted} />
            <Text style={styles.emptyHistoryText}>No se registran movimientos en este turno aún</Text>
          </View>
        ) : (
          <FlatList
            data={movementsList}
            renderItem={renderMovementItem}
            keyExtractor={(item) => item.id || Math.random().toString()}
            scrollEnabled={false}
            contentContainerStyle={styles.historyList}
          />
        )}
      </View>
    </MotiView>
    </ScrollView>
  );
};

const getStyles = (colors: any, mode: string) => StyleSheet.create({
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
  
  /* Closed State styling */
  closedStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: rem(50),
    paddingHorizontal: rem(15),
  },
  lockIconContainer: {
    width: rem(80),
    height: rem(80),
    borderRadius: rem(40),
    backgroundColor: mode === 'light' ? '#FFFDF5' : '#1E1B4B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: rem(20),
    borderWidth: 1,
    borderColor: mode === 'light' ? '#FFF3CD' : '#312E81',
  },
  closedStateTitle: {
    fontSize: rem(16),
    fontWeight: '900',
    color: colors.text,
    marginBottom: rem(8),
    fontFamily: 'Inter-Black',
    letterSpacing: 0.5,
  },
  closedStateSubtitle: {
    fontSize: rem(11),
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: rem(16),
    marginBottom: rem(30),
    fontFamily: 'Inter-Regular',
    paddingHorizontal: rem(20),
  },
  openRegisterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: rem(14),
    paddingHorizontal: rem(32),
    borderRadius: rem(20),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  openRegisterBtnText: {
    color: '#FFFFFF',
    fontSize: rem(12),
    fontWeight: 'bold',
    fontFamily: 'Inter-Bold',
  },
  btnIconLeft: {
    marginRight: rem(8),
  },

  /* Open State Styling */
  openStateContainer: {
    flex: 1,
  },
  activeHeaderCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: mode === 'light' ? '#F8FAFC' : '#0F172A',
    borderWidth: 1,
    borderColor: mode === 'light' ? '#E2E8F0' : '#334155',
    borderRadius: rem(15),
    paddingHorizontal: rem(12),
    paddingVertical: rem(8),
    marginBottom: rem(15),
  },
  activePulseContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rem(6),
  },
  pulseDot: {
    width: rem(8),
    height: rem(8),
    borderRadius: rem(4),
    backgroundColor: '#10B981',
  },
  pulseDotOutline: {
    position: 'absolute',
    left: 0,
    width: rem(8),
    height: rem(8),
    borderRadius: rem(4),
    backgroundColor: '#10B981',
  },
  activeStatusText: {
    fontSize: rem(10),
    fontWeight: 'bold',
    color: '#10B981',
    fontFamily: 'Inter-Bold',
    letterSpacing: 0.5,
  },
  activeMetaText: {
    fontSize: rem(10),
    color: colors.textMuted,
  },

  /* Grid Metrics */
  metricsGrid: {
    gap: rem(10),
    marginBottom: rem(20),
  },
  metricCard: {
    borderRadius: rem(20),
    padding: rem(16),
  },
  expectedCard: {
    backgroundColor: mode === 'light' ? '#EEF2FF' : '#1E1B4B',
    borderWidth: 1,
    borderColor: mode === 'light' ? '#E0E7FF' : '#312E81',
  },
  expectedCardLabel: {
    fontSize: rem(9),
    fontWeight: 'bold',
    color: mode === 'light' ? '#4338CA' : '#C7D2FE',
    letterSpacing: 0.5,
    fontFamily: 'Inter-Bold',
  },
  expectedCardValue: {
    fontSize: rem(22),
    fontWeight: '900',
    color: mode === 'light' ? '#312E81' : '#FFFFFF',
    marginTop: rem(4),
    fontFamily: 'Inter-Black',
  },
  expectedDivider: {
    height: 1,
    backgroundColor: '#D1FAE5',
    marginVertical: rem(8),
    opacity: 0.5,
  },
  expectedCardSub: {
    fontSize: rem(9),
    color: colors.textMuted,
    fontFamily: 'Inter-Regular',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: rem(10),
  },
  subMetricCard: {
    flex: 1,
    backgroundColor: mode === 'light' ? '#F8FAFC' : '#0F172A',
    borderWidth: 1,
    borderColor: mode === 'light' ? '#E2E8F0' : '#334155',
    borderRadius: rem(15),
    padding: rem(12),
  },
  subMetricLabel: {
    fontSize: rem(8),
    fontWeight: 'bold',
    color: colors.textMuted,
    letterSpacing: 0.5,
    fontFamily: 'Inter-Bold',
  },
  subMetricValue: {
    fontSize: rem(14),
    fontWeight: '800',
    color: colors.text,
    marginTop: rem(4),
    fontFamily: 'Inter-Bold',
  },

  /* Action Toolbox */
  toolboxContainer: {
    flexDirection: 'row',
    gap: rem(10),
    marginBottom: rem(15),
  },
  toolboxBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rem(6),
    height: rem(42),
    borderRadius: rem(15),
    borderWidth: 1,
    backgroundColor: mode === 'light' ? '#FFFFFF' : '#0F172A',
  },
  btnInflowBorder: {
    borderColor: '#10B981',
  },
  btnOutflowBorder: {
    borderColor: '#EF4444',
  },
  toolboxBtnText: {
    fontSize: rem(11),
    fontWeight: 'bold',
    color: colors.text,
    fontFamily: 'Inter-Bold',
  },

  /* Closure controls */
  closureContainer: {
    gap: rem(8),
    marginBottom: rem(25),
  },
  closeWizardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    paddingVertical: rem(12),
    borderRadius: rem(20),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  closeWizardBtnText: {
    color: '#FFFFFF',
    fontSize: rem(12),
    fontWeight: 'bold',
    fontFamily: 'Inter-Bold',
  },
  quickCloseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: rem(8),
  },
  quickCloseBtnText: {
    color: colors.textMuted,
    fontSize: rem(11),
    fontWeight: '600',
    fontFamily: 'Inter-Regular',
  },

  /* Movements Feed Section */
  historySection: {
    marginTop: rem(5),
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rem(8),
    marginBottom: rem(12),
  },
  historyTitle: {
    fontSize: rem(12),
    fontWeight: 'bold',
    color: colors.text,
    fontFamily: 'Inter-Bold',
  },
  emptyHistoryContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: rem(30),
    backgroundColor: mode === 'light' ? '#F8FAFC' : '#0F172A',
    borderRadius: rem(15),
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: mode === 'light' ? '#E2E8F0' : '#334155',
    gap: rem(8),
  },
  emptyHistoryText: {
    fontSize: rem(11),
    color: colors.textMuted,
    fontFamily: 'Inter-Regular',
  },
  historyList: {
    gap: rem(6),
  },
});
