import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, RefreshControl, Platform } from 'react-native';
import { rem } from '@/core/utils/responsive';
import { COLORS, useTheme } from '@/core/theme/theme';
import { DashboardHeader } from '../components/DashboardLayout';
import { PosSubHeader, PosTab } from '../components/PosSubHeader';
import { useAppDispatch, useAppSelector } from '@/core/store/store';
import { fetchZones, fetchFloors } from '@/core/store/slices/posSlice';
import { setLocation, setOrderType, clearCart, fetchTableOrders } from '@/core/store/slices/cartSlice';
import { TableCard, TableStatus, TableSkeleton } from '../components/TableCard';
import { BentoSelector } from '../components/BentoSelector';
import { FloatingCart } from '../components/FloatingCart';
import { CartModal } from '../components/CartModal';
import * as Haptics from 'expo-haptics';
import { SoundService } from '@/core/services/soundService';
import { MotiView } from 'moti';
import { LayoutGrid, TrendingUp } from 'lucide-react-native';
import { CurrencyService } from '@/core/services/currencyService';

/**
 * ARCHITECTURE: Senior Lead Redux & WebSocket Screen
 * --------------------------------------------------
 * This screen now consumes data from the global Redux store.
 * Updates arrive via WebSocket and are reflected instantly without re-fetching.
 */

import { PosService } from '@/infrastructure/services/posService';
import { AuthService } from '@/infrastructure/services/authService';
import { SecureStorage } from '@/core/storage/secureStorage';

export const MesasScreen = ({ onNavigate }: { onNavigate: (tab: PosTab, cartId?: string) => void }) => {
  const { colors, mode } = useTheme();
  const styles = getStyles(colors, mode);
  const dispatch = useAppDispatch();

  // SELECTORS: Reactive state from Redux (Only for static floors/zones)
  const { zones, floors, loading: reduxLoading } = useAppSelector(state => state.pos);
  const { tableOrders } = useAppSelector(state => state.cart);

  // LOCAL STATE: Tables are managed locally to ensure "consultar siempre"
  const [localTables, setLocalTables] = useState<any[]>([]);
  const [tablesStatus, setTablesStatus] = useState<Record<string, any>>({});
  const [isLoadingTables, setIsLoadingTables] = useState(false);
  const [activeFloorId, setActiveFloorId] = useState('TODOS');
  const [activeZoneId, setActiveZoneId] = useState('TODAS');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCartVisible, setIsCartVisible] = useState(false);

  const loadData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    else setIsLoadingTables(true);

    try {
      // 1. Get Tenant ID (PRIORITY: Local Storage first to avoid API call)
      const user = await SecureStorage.getUser();
      const tenantId = user?.tenant_id || 'Owner';

      // 2. Parallel Fetch: Config + Real-time Status
      const [tablesConfig, statusMap] = await Promise.all([
        PosService.getTables(),
        PosService.getTablesStatus(tenantId)
      ]);

      // 3. Immediate UI Update
      setTablesStatus(statusMap);
      setLocalTables(tablesConfig);

      // 4. Background Sync (Don't await these to show UI faster)
      dispatch(fetchZones() as any);
      dispatch(fetchFloors() as any);
      dispatch(fetchTableOrders() as any);
      
      // Update profile in background to keep data fresh without blocking
      AuthService.getCurrentUser().catch(() => {});
    } catch (e) {
      console.error('[MesasScreen] Error loading data:', e);
    } finally {
      setIsRefreshing(false);
      setIsLoadingTables(false);
    }
  }, [dispatch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const floorsOptions = useMemo(() => {
    const options = [{ id: 'TODOS', label: 'TODOS LOS PISOS' }];
    (floors || []).forEach(f => {
      options.push({ id: f.id, label: (f.name || f.nombre).toUpperCase() });
    });
    return options;
  }, [floors]);

  const zonesOptions = useMemo(() => {
    const options = [{ id: 'TODAS', label: 'TODAS LAS ZONAS' }];
    const filtered = activeFloorId === 'TODOS'
      ? (zones || [])
      : (zones || []).filter(z => z.floor_id === activeFloorId);
    filtered.forEach(z => {
      options.push({ id: z.id, label: (z.nombre || z.name).toUpperCase() });
    });
    return options;
  }, [zones, activeFloorId]);

  interface EnrichedTable {
    id: string;
    nombre: string;
    ubicacion: string;
    ubicacionId: string;
    piso: string;
    pisoId: string;
    capacidad: number;
    estado: TableStatus;
    orderTotal?: number;
    orderTime?: number | string;
    orderId?: string;
  }

  const mappedTables = useMemo<EnrichedTable[]>(() => {
    console.log('🔍 [MesasScreen] INICIANDO MAPEO DE MESAS...');
    console.log(`   - Mesas locales: ${localTables.length}`);
    console.log(`   - Estados disponibles: ${Object.keys(tablesStatus).length}`);

    const result = (localTables || []).map(table => {
      const zoneInfo = zones.find(z => z.id === table.zone_id || z.id === table.zona_id);
      const floorInfo = floors.find(f => f.id === zoneInfo?.floor_id);

      // Normalización de ID de mesa para comparación
      const cleanTableId = String(table.id).replace('MESA#', '');

      // PRIORITY 1: Check status from the dedicated Status Map (Same as Angular FE)
      const statusFromMap = tablesStatus[table.id] || tablesStatus[`MESA#${cleanTableId}`] || tablesStatus[cleanTableId];

      // PRIORITY 2: Fallback to Redux orders list
      const order = tableOrders.find(o => {
        if (!o.mesa_id) return false;
        const cleanOrderMesaId = String(o.mesa_id).replace('MESA#', '');
        return cleanOrderMesaId === cleanTableId;
      });

      const finalStatus = statusFromMap?.status || (order ? (order.status === 'POR_PAGAR' ? 'POR_PAGAR' : 'OCUPADA') : (table.status || table.estado || 'LIBRE'));

      if (statusFromMap || order) {
        console.log(`✅ [MATCH] Mesa: ${table.name || table.nombre} (ID: ${cleanTableId}) -> Estado: ${finalStatus}`);
      }

      return {
        id: table.id,
        nombre: table.name || table.nombre || `Mesa ${table.id.slice(-2)}`,
        ubicacion: (zoneInfo?.nombre || zoneInfo?.name || table.ubicacion || table.zona || 'SALÓN').toUpperCase(),
        ubicacionId: zoneInfo?.id,
        piso: (floorInfo?.name || floorInfo?.nombre || 'PISO 1').toUpperCase(),
        pisoId: floorInfo?.id,
        capacidad: table.capacity || table.capacidad || 4,
        estado: finalStatus as TableStatus,
        orderTotal: statusFromMap?.total || order?.total || table.orderTotal || table.total_venta,
        orderTime: statusFromMap?.timestamp || order?.timestamp || table.orderTime || table.timestamp,
        orderId: statusFromMap?.order_id || order?.id || table.orderId || table.active_order_id
      };
    });

    console.log('🏁 [MesasScreen] MAPEO FINALIZADO.');
    return result;
  }, [localTables, zones, floors, tableOrders, tablesStatus]);

  useEffect(() => {
    console.log('📊 [MesasScreen] Estado final de mesas:', mappedTables);
  }, [mappedTables]);

  const displayData = useMemo(() => {
    // Show skeletons if we are loading or if we have tables but status map is not yet processed
    if (isLoadingTables || (localTables.length > 0 && Object.keys(tablesStatus).length === 0)) {
      return Array(9).fill(null).map((_, i) => ({ id: `skeleton-${i}`, isSkeleton: true }));
    }
    let result = mappedTables;
    if (activeFloorId !== 'TODOS') result = result.filter((t: EnrichedTable) => t.pisoId === activeFloorId);
    if (activeZoneId !== 'TODAS') result = result.filter((t: EnrichedTable) => t.ubicacionId === activeZoneId);
    return result;
  }, [isLoadingTables, localTables.length, mappedTables, activeFloorId, activeZoneId]);

  const stats = useMemo(() => {
    const occupied = mappedTables.filter((t: EnrichedTable) => t.estado === 'OCUPADA' || t.estado === 'POR_PAGAR').length;
    const totalRevenue = mappedTables.reduce((sum, t) => sum + (t.orderTotal || 0), 0);
    return { occupied, free: mappedTables.length - occupied, revenue: totalRevenue };
  }, [mappedTables]);

  const handleTablePress = (table: any) => {
    SoundService.playClick();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // setLocation handles clearing cart and looking up activeOrderId automatically
    dispatch(setLocation(table.id));
    onNavigate('POS');
  };

  const renderTable = ({ item, index }: { item: any; index: number }) => {
    if (item.isSkeleton) return <TableSkeleton />;
    return (
      <MotiView
        from={{ opacity: 0, scale: 0.9, translateY: 15 }}
        animate={{ opacity: 1, scale: 1, translateY: 0 }}
        transition={{ delay: index * 40, type: 'timing', duration: 300 }}
      >
        <TableCard table={item} onPress={handleTablePress} />
      </MotiView>
    );
  };

  const isGlobalLoading = isLoadingTables && localTables.length === 0;

  return (
    <View style={styles.container}>
      <DashboardHeader />
      <PosSubHeader activeTab="MESAS" title="MAPA DE MESAS" onNavigate={onNavigate} />

      <View style={styles.outerContent}>
        <View style={styles.bentoContainer}>
          <View style={styles.statsRow}>
            <MotiView from={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: mode === 'light' ? '#EEF2FF' : colors.primary + '20' }]}>
                <LayoutGrid size={rem(14)} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.statValue}>
                  {isLoadingTables ? '--' : `${stats.occupied}/${mappedTables.length}`}
                </Text>
                <Text style={styles.statLabel}>Ocupadas</Text>
              </View>
            </MotiView>

            <MotiView from={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 100 }} style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: mode === 'light' ? '#FFFBEB' : '#D9770620' }]}>
                <TrendingUp size={rem(14)} color={COLORS.gold} />
              </View>
              <View>
                <Text style={[styles.statValue, { color: COLORS.gold }]}>
                  {isLoadingTables ? '--' : CurrencyService.format(stats.revenue)}
                </Text>
                <Text style={styles.statLabel}>En Servicio</Text>
              </View>
            </MotiView>
          </View>

          <View style={styles.filtersContainer}>
            <BentoSelector
              label="Planta / Piso"
              options={floorsOptions}
              selected={activeFloorId}
              activeColor="#22C55E"
              isLoading={reduxLoading.floors}
              onSelect={(id) => {
                setActiveFloorId(id);
                setActiveZoneId('TODAS');
              }}
            />
            <BentoSelector
              label="Área / Zona"
              options={zonesOptions}
              selected={activeZoneId}
              activeColor="#D946EF"
              isLoading={reduxLoading.zones}
              onSelect={setActiveZoneId}
            />
          </View>

          <FlatList
            data={displayData}
            renderItem={renderTable}
            keyExtractor={item => item.id}
            numColumns={3}
            columnWrapperStyle={styles.columnWrapper}
            contentContainerStyle={styles.gridContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              Platform.OS === 'ios' ? (
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={loadData}
                  tintColor={colors.primary}
                />
              ) : undefined
            }
            ListEmptyComponent={
              !isGlobalLoading ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyTitle}>Sin mesas en esta área</Text>
                  <Text style={styles.emptySubtitle}>
                    No se encontraron mesas que coincidan con los filtros seleccionados.
                  </Text>
                </View>
              ) : null
            }
          />
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
    paddingHorizontal: rem(10),
    paddingBottom: rem(10),
  },
  bentoContainer: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: rem(30),
    padding: rem(12),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  filtersContainer: {
    flexDirection: 'row',
    gap: rem(8),
    marginBottom: rem(12),
    alignItems: 'center',
    paddingHorizontal: rem(2),
  },
  statsRow: {
    flexDirection: 'row',
    gap: rem(8),
    marginBottom: rem(15),
  },
  statCard: {
    flex: 1,
    backgroundColor: mode === 'light' ? '#F8FAFC' : '#1E293B',
    borderRadius: rem(18),
    padding: rem(10),
    flexDirection: 'row',
    alignItems: 'center',
    gap: rem(8),
    borderWidth: 1,
    borderColor: mode === 'light' ? '#F1F5F9' : '#334155',
  },
  statIcon: {
    width: rem(28),
    height: rem(28),
    borderRadius: rem(8),
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: rem(12),
    fontWeight: '900',
    color: colors.primary,
  },
  statLabel: {
    fontSize: rem(7),
    color: colors.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  columnWrapper: {
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  gridContent: {
    paddingBottom: rem(100),
    paddingTop: rem(10),
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: rem(100),
  },
  emptyTitle: {
    fontSize: rem(14),
    fontWeight: '800',
    color: colors.text,
    marginBottom: rem(8),
  },
  emptySubtitle: {
    fontSize: rem(11),
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: rem(40),
    lineHeight: rem(16),
  },
});
