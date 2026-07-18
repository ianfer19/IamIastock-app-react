import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  Dimensions,
  Platform,
  Animated
} from 'react-native';
import { useStatusModal } from '@/core/context/StatusModalContext';
import { InventoryService, Asset } from '@/infrastructure/services/inventoryService';
import { rem } from '@/core/utils/responsive';
import { CurrencyService } from '@/core/services/currencyService';
import { 
  Plus, 
  Building2, 
  Activity, 
  X, 
  MapPin, 
  Tag, 
  Save,
  Search,
  ChevronDown,
  Coins,
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  Briefcase
} from 'lucide-react-native';
import { MotiView, AnimatePresence } from 'moti';
import * as Haptics from 'expo-haptics';
import { PremiumSubScreenHeader } from '../components/PremiumSubScreenHeader';
import { useTheme } from '@/core/theme/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface AssetsScreenProps {
  onBack: () => void;
}

export const AssetsScreen = ({ onBack }: AssetsScreenProps) => {
  const { colors, mode } = useTheme();
  const styles = getStyles(colors, mode);
  const { showStatus } = useStatusModal();

  const [assets, setAssets] = useState<Asset[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Partial<Asset> | null>(null);

  // Inputs
  const [formNombre, setFormNombre] = useState('');
  const [formCantidad, setFormCantidad] = useState('');
  const [formValor, setFormValor] = useState('');
  const [formEstado, setFormEstado] = useState<'EXCELENTE' | 'REGULAR' | 'MANTENIMIENTO'>('EXCELENTE');
  const [formUbicacion, setFormUbicacion] = useState('');
  const [formSerial, setFormSerial] = useState('');

  // Native Scroll Performance Optimization
  const mainScrollY = useRef(new Animated.Value(0)).current;
  const [showScrollBadge, setShowScrollBadge] = useState(true);
  const [contentHeight, setContentHeight] = useState(0);
  const [visibleHeight, setVisibleHeight] = useState(0);

  useEffect(() => {
    const id = mainScrollY.addListener(({ value }) => {
      const shouldShow = value < 40;
      if (shouldShow !== showScrollBadge) {
        setShowScrollBadge(shouldShow);
      }
    });
    return () => mainScrollY.removeListener(id);
  }, [showScrollBadge]);

  const fetchAssets = async () => {
    try {
      const data = await InventoryService.getAssets();
      setAssets(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  // Filtered Assets
  const filteredAssets = useMemo(() => {
    return assets.filter(a => {
      const matchSearch = a.nombre.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (a.serial && a.serial.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchSearch;
    });
  }, [assets, searchQuery]);

  // Executive Capital valuation of company assets
  const totalValuation = useMemo(() => {
    return assets.reduce((sum, a) => sum + (a.valorAdquisicion * a.cantidad), 0);
  }, [assets]);

  // Assets in maintenance
  const inMaintenanceCount = useMemo(() => {
    return assets.filter(a => a.estadoConservacion === 'MANTENIMIENTO').length;
  }, [assets]);

  const handleOpenForm = (asset: Asset | null = null) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (asset) {
      setEditingAsset(asset);
      setFormNombre(asset.nombre);
      setFormCantidad(asset.cantidad.toString());
      setFormValor(asset.valorAdquisicion.toString());
      setFormEstado(asset.estadoConservacion);
      setFormUbicacion(asset.ubicacion);
      setFormSerial(asset.serial || '');
    } else {
      setEditingAsset(null);
      setFormNombre('');
      setFormCantidad('1');
      setFormValor('');
      setFormEstado('EXCELENTE');
      setFormUbicacion('Cocina Principal');
      setFormSerial('');
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formNombre || !formValor || !formUbicacion) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showStatus({
        type: 'error',
        title: 'Error de validación',
        message: 'Por favor, introduce nombre, valor de compra y ubicación del activo.',
        actionText: 'Aceptar'
      });
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const qtyVal = parseInt(formCantidad) || 1;
    const priceVal = parseFloat(formValor) || 0;

    const payload: Omit<Asset, 'id'> = {
      nombre: formNombre,
      cantidad: qtyVal,
      valorAdquisicion: priceVal,
      estadoConservacion: formEstado,
      ubicacion: formUbicacion,
      serial: formSerial
    };

    try {
      if (editingAsset && editingAsset.id) {
        const updated = await InventoryService.updateAsset(editingAsset.id, payload);
        setAssets(prev => prev.map(a => a.id === editingAsset.id ? updated : a));
        showStatus({
          type: 'success',
          title: 'Activo Actualizado',
          message: `El activo "${formNombre}" ha sido modificado.`,
          actionText: 'Aceptar'
        });
      } else {
        const created = await InventoryService.createAsset(payload);
        setAssets(prev => [created, ...prev]);
        showStatus({
          type: 'success',
          title: 'Activo Registrado',
          message: `Se registró exitosamente el activo físico "${formNombre}".`,
          actionText: 'Excelente'
        });
      }
      setIsModalOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = (id: string, name: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    showStatus({
      type: 'error',
      title: '¿Dar de baja activo?',
      message: `¿Estás seguro de que deseas retirar "${name}" de los activos fijos de la empresa?`,
      actionText: 'Dar de Baja',
      onClose: async () => {
        try {
          await InventoryService.deleteAsset(id);
          setAssets(prev => prev.filter(a => a.id !== id));
        } catch (e) {
          console.error(e);
        }
      }
    });
  };

  const renderAssetItem = ({ item, index }: { item: Asset; index: number }) => {
    const isExcellent = item.estadoConservacion === 'EXCELENTE';
    const isRegular = item.estadoConservacion === 'REGULAR';
    
    // Premium theme colors
    const accentColor = isExcellent ? colors.success : isRegular ? '#F59E0B' : '#EF4444';
    const StatusIcon = isExcellent ? CheckCircle : isRegular ? AlertTriangle : Activity;

    return (
      <MotiView
        from={{ opacity: 0, translateY: 35, scale: 0.96 }}
        animate={{ opacity: 1, translateY: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ delay: Math.min(index * 45, 360), type: 'timing', duration: 320 }}
        style={styles.cardContainer}
      >
        <View style={styles.cardMainRow}>
          {/* Left Avatar Section */}
          <View style={styles.avatarWrapper}>
            <View style={[styles.avatarGlow, { backgroundColor: accentColor + '10' }]}>
              <Briefcase size={rem(20)} color={accentColor} />
            </View>
          </View>

          {/* Middle Details Section */}
          <View style={styles.cardDetailsCol}>
            <View style={styles.cardHeaderLine}>
              <Text style={styles.assetName} numberOfLines={1}>
                {item.nombre}
              </Text>
            </View>

            <View style={styles.locationRow}>
              <MapPin size={rem(10)} color={colors.textMuted} style={{ marginRight: 4 }} />
              <Text style={styles.locationText} numberOfLines={1}>
                Ubicación: <Text style={styles.locationValue}>{item.ubicacion}</Text>
              </Text>
            </View>

            {item.serial ? (
              <View style={styles.serialRow}>
                <Tag size={rem(10)} color={colors.textMuted} style={{ marginRight: 4 }} />
                <Text style={styles.serialText}>S/N: {item.serial}</Text>
              </View>
            ) : null}
          </View>

          {/* Right details section */}
          <View style={styles.cardRightCol}>
            <View style={styles.valueBadgeContainer}>
              <Text style={styles.valueLabel}>Valor</Text>
              <Text style={styles.valueText}>{CurrencyService.format(item.valorAdquisicion * item.cantidad)}</Text>
            </View>
            
            <View style={[
              styles.statusBadge, 
              { backgroundColor: accentColor + '10', borderColor: accentColor + '15' }
            ]}>
              <StatusIcon size={rem(9)} color={accentColor} style={{ marginRight: 3 }} />
              <Text style={[styles.statusBadgeText, { color: accentColor }]}>
                {item.estadoConservacion}
              </Text>
            </View>
          </View>
        </View>

        {/* Quantities break up details */}
        <View style={styles.quantitiesGrid}>
          <View style={styles.quantityItemCol}>
            <Text style={styles.quantLabel}>CANTIDAD</Text>
            <Text style={styles.quantValue}>{item.cantidad} unidades</Text>
          </View>

          <View style={styles.quantDivider} />

          <View style={styles.quantityItemCol}>
            <Text style={styles.quantLabel}>VALOR COMPRA UNITARIO</Text>
            <Text style={styles.quantValue}>{CurrencyService.format(item.valorAdquisicion)}</Text>
          </View>
        </View>

        {/* Quick actions speed bar */}
        <View style={styles.actionSpeedbar}>
          <TouchableOpacity 
            style={[styles.actionChip, styles.editChip]}
            activeOpacity={0.8}
            onPress={() => handleOpenForm(item)}
          >
            <Text style={styles.editChipText}>Editar Activo</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionChip, styles.deleteChip]}
            activeOpacity={0.8}
            onPress={() => handleDelete(item.id, item.nombre)}
          >
            <Text style={styles.deleteChipText}>Dar de Baja</Text>
          </TouchableOpacity>
        </View>
      </MotiView>
    );
  };

  return (
    <View style={styles.container}>
      {/* Premium Header */}
      <PremiumSubScreenHeader
        title="Inmobiliaria y Activos"
        subtitle="Activos Físicos"
        onBack={onBack}
        actionLabel="Registrar"
        onAction={() => handleOpenForm(null)}
      />

      {/* Slanted dynamic bento metrics dashboard */}
      <MotiView
        from={{ opacity: 0, translateY: -15 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'spring', damping: 20 }}
        style={styles.healthDashboard}
      >
        <View style={styles.healthLeftSection}>
          <Text style={styles.healthTitle}>CAPITAL TOTAL EN ACTIVOS</Text>
          <View style={styles.healthValueRow}>
            <Text style={[styles.healthBigNumber, { color: colors.primary }]}>
              {CurrencyService.format(totalValuation)}
            </Text>
          </View>
          <View style={styles.healthProgressBg}>
            <View style={[
              styles.healthProgressFill, 
              { 
                width: '100%',
                backgroundColor: colors.primary
              }
            ]} />
          </View>
        </View>

        <View style={styles.slantedDivider} />

        <View style={styles.healthRightSection}>
          <View style={styles.healthStatsRowGroup}>
            <View style={[styles.healthStatCard, { flex: 1 }]}>
              <View style={[styles.healthIconCircle, { backgroundColor: colors.success + '15' }]}>
                <CheckCircle size={rem(11)} color={colors.success} />
              </View>
              <View style={styles.healthStatTextCol}>
                <Text style={styles.healthStatLabel}>ACTIVOS EXCELENTES</Text>
                <Text style={styles.healthStatVal}>
                  {assets.filter(a => a.estadoConservacion === 'EXCELENTE').length}
                </Text>
              </View>
            </View>

            <View style={[styles.healthStatCard, { flex: 1 }]}>
              <View style={[styles.healthIconCircle, { backgroundColor: colors.primary + '15' }]}>
                <Building2 size={rem(11)} color={colors.primary} />
              </View>
              <View style={styles.healthStatTextCol}>
                <Text style={styles.healthStatLabel}>ITEMS TOTALES</Text>
                <Text style={styles.healthStatVal}>{assets.length}</Text>
              </View>
            </View>
          </View>

          <View style={[styles.healthStatCard, { marginTop: rem(2) }]}>
            <View style={[styles.healthIconCircle, { backgroundColor: '#EF444415' }]}>
              <Activity size={rem(11)} color="#EF4444" />
            </View>
            <View style={styles.healthStatTextCol}>
              <Text style={styles.healthStatLabel}>EN MANTENIMIENTO</Text>
              <Text style={[styles.healthStatVal, { color: inMaintenanceCount > 0 ? '#EF4444' : colors.textMuted }]}>
                {inMaintenanceCount} activos
              </Text>
            </View>
          </View>
        </View>
      </MotiView>

      {/* Search area */}
      <View style={styles.searchBarContainer}>
        <Search size={rem(16)} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar activos por nombre o serial..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity activeOpacity={0.7} onPress={() => setSearchQuery('')}>
            <X size={rem(16)} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Main List */}
      <Animated.FlatList
        data={filteredAssets}
        renderItem={renderAssetItem}
        keyExtractor={(item) => item.id || item.nombre}
        contentContainerStyle={styles.listScroll}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: mainScrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        onContentSizeChange={(w, h) => setContentHeight(h)}
        onLayout={(event) => setVisibleHeight(event.nativeEvent.layout.height)}
        ListEmptyComponent={
          <MotiView
            from={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={styles.emptyCardContainer}
          >
            <View style={styles.emptyIconOutline}>
              <View style={styles.emptyIconGlow}>
                <Building2 size={rem(24)} color={colors.primary} />
              </View>
            </View>
            <Text style={styles.emptyTitle}>Sin Activos Registrados</Text>
            <Text style={styles.emptySubtitle}>
              Lleva el control de los activos físicos de tu restaurante: maquinaria, hornos, menaje y mobiliario, valorando tu patrimonio consolidado.
            </Text>
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.emptyCtaButton}
              onPress={() => handleOpenForm(null)}
            >
              <Plus size={rem(12)} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.emptyCtaText}>Nuevo Activo Físico</Text>
            </TouchableOpacity>
          </MotiView>
        }
      />

      {/* Custom Premium Scrollbar Overlay */}
      {contentHeight > visibleHeight && (() => {
        const trackHeight = visibleHeight - rem(32);
        const thumbHeight = Math.max(rem(40), (visibleHeight / contentHeight) * trackHeight);
        const maxScroll = Math.max(1, contentHeight - visibleHeight);
        const thumbTranslateY = mainScrollY.interpolate({
          inputRange: [0, maxScroll],
          outputRange: [0, trackHeight - thumbHeight],
          extrapolate: 'clamp',
        });
        return (
          <View style={styles.customScrollbarTrack}>
            <Animated.View 
              style={[
                styles.customScrollbarThumb, 
                { 
                  height: thumbHeight, 
                  transform: [{ translateY: thumbTranslateY }] 
                }
              ]} 
            />
          </View>
        );
      })()}

      {/* Pulse Floating Scroll down badge */}
      <AnimatePresence>
        {filteredAssets.length > 3 && showScrollBadge && (
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            exit={{ opacity: 0, translateY: 20 }}
            transition={{ type: 'spring', damping: 15 }}
            style={styles.mainScrollDownBadge}
          >
            <MotiView
              animate={{
                translateY: [0, 4, 0]
              }}
              transition={{
                loop: true,
                duration: 1500,
                type: 'timing'
              }}
            >
              <ChevronDown size={rem(11)} color="#FFFFFF" />
            </MotiView>
            <Text style={styles.mainScrollDownText}>Desliza para ver más activos</Text>
          </MotiView>
        )}
      </AnimatePresence>

      {/* Form Slide Modal */}
      <Modal visible={isModalOpen} transparent animationType="slide" onRequestClose={() => setIsModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBgClose} activeOpacity={1} onPress={() => setIsModalOpen(false)} />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingAsset ? 'Editar Activo Físico' : 'Registrar Activo Físico'}
              </Text>
              <TouchableOpacity style={styles.modalCloseCircle} onPress={() => setIsModalOpen(false)}>
                <X size={rem(15)} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Nombre del Activo / Equipo *</Text>
              <TextInput
                style={styles.textInput}
                value={formNombre}
                onChangeText={setFormNombre}
                placeholder="Ej. Máquina Espresso 2 Grupos"
                placeholderTextColor={colors.textMuted}
              />

              <View style={styles.formRow}>
                <View style={styles.formCol}>
                  <Text style={styles.inputLabel}>Cantidad Unidades *</Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={formCantidad}
                    onChangeText={setFormCantidad}
                    placeholder="Ej. 1"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
                <View style={styles.formCol}>
                  <Text style={styles.inputLabel}>Valor Adquisición Unitario *</Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={formValor}
                    onChangeText={setFormValor}
                    placeholder="Ej. 12500000"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={styles.formCol}>
                  <Text style={styles.inputLabel}>Ubicación / Área *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formUbicacion}
                    onChangeText={setFormUbicacion}
                    placeholder="Ej. Salón Principal"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
                <View style={styles.formCol}>
                  <Text style={styles.inputLabel}>Número de Serial</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formSerial}
                    onChangeText={setFormSerial}
                    placeholder="Ej. EXP-2025-01A"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Estado de Conservación</Text>
              <View style={styles.estadoSelectRow}>
                {['EXCELENTE', 'REGULAR', 'MANTENIMIENTO'].map(est => {
                  const isSel = formEstado === est;
                  return (
                    <TouchableOpacity
                      key={est}
                      activeOpacity={0.8}
                      onPress={() => setFormEstado(est as any)}
                      style={[styles.estadoChip, isSel && styles.estadoChipActive]}
                    >
                      <Text style={[styles.estadoChipText, isSel && styles.estadoChipTextActive]}>
                        {est}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity 
                style={styles.saveBtn} 
                activeOpacity={0.8}
                onPress={handleSave}
              >
                <Save size={rem(15)} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.saveBtnText}>Guardar Activo</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const getStyles = (colors: any, mode: 'light' | 'dark') => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  healthDashboard: {
    flexDirection: 'row',
    backgroundColor: mode === 'light' ? '#FFFFFF' : '#151E2E',
    borderRadius: rem(16),
    marginHorizontal: rem(16),
    marginTop: rem(12),
    marginBottom: rem(8),
    paddingVertical: rem(16),
    paddingHorizontal: rem(14),
    borderWidth: 1,
    borderColor: mode === 'light' ? '#EAE5DA' : '#2D3748',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: mode === 'light' ? 0.03 : 0.15,
    shadowRadius: 12,
    elevation: 3,
  },
  healthLeftSection: {
    width: '45%',
    justifyContent: 'center',
  },
  healthTitle: {
    fontSize: rem(8),
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: rem(4),
  },
  healthValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: rem(8),
  },
  healthBigNumber: {
    fontSize: rem(18),
    fontFamily: 'Inter-Bold',
    fontWeight: '900',
  },
  healthProgressBg: {
    height: rem(4),
    backgroundColor: mode === 'light' ? '#E2E8F0' : '#334155',
    borderRadius: rem(2),
    overflow: 'hidden',
  },
  healthProgressFill: {
    height: '100%',
    borderRadius: rem(2),
  },
  slantedDivider: {
    width: 1.5,
    height: '80%',
    backgroundColor: mode === 'light' ? '#E2E8F0' : '#334155',
    transform: [{ rotate: '15deg' }],
    marginHorizontal: rem(6),
    alignSelf: 'center',
  },
  healthRightSection: {
    flex: 1,
    paddingLeft: rem(4),
    gap: rem(6),
  },
  healthStatsRowGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: rem(6),
  },
  healthStatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rem(6),
  },
  healthIconCircle: {
    width: rem(20),
    height: rem(20),
    borderRadius: rem(10),
    justifyContent: 'center',
    alignItems: 'center',
  },
  healthStatTextCol: {
    flex: 1,
  },
  healthStatLabel: {
    fontSize: rem(6.5),
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.3,
  },
  healthStatVal: {
    fontSize: rem(10),
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: colors.text,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: rem(16),
    marginTop: rem(10),
    paddingHorizontal: rem(12),
    borderRadius: rem(12),
    height: rem(42),
    borderWidth: 1,
    borderColor: mode === 'light' ? '#EAE5DA' : '#334155',
    shadowColor: '#1A365D',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  searchIcon: {
    marginRight: rem(8),
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: rem(13),
    fontFamily: 'Inter-Regular',
  },
  listScroll: {
    padding: rem(16),
    paddingBottom: rem(80),
    gap: rem(12),
  },
  cardContainer: {
    backgroundColor: colors.surface,
    borderRadius: rem(16),
    padding: rem(14),
    borderWidth: 1,
    borderColor: mode === 'light' ? '#EAE5DA' : '#334155',
    shadowColor: '#1A365D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1.5,
  },
  cardMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: rem(12),
  },
  avatarGlow: {
    width: rem(44),
    height: rem(44),
    borderRadius: rem(22),
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardDetailsCol: {
    flex: 1,
  },
  cardHeaderLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: rem(2),
  },
  assetName: {
    fontSize: rem(14),
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: colors.text,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: rem(2),
  },
  locationText: {
    fontSize: rem(10.5),
    fontFamily: 'Inter-Regular',
    color: colors.textMuted,
  },
  locationValue: {
    fontFamily: 'Inter-SemiBold',
    color: colors.text,
  },
  serialRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serialText: {
    fontSize: rem(10),
    fontFamily: 'Inter-Regular',
    color: colors.textMuted,
  },
  cardRightCol: {
    alignItems: 'flex-end',
    marginLeft: rem(8),
    gap: rem(6),
  },
  valueBadgeContainer: {
    backgroundColor: 'rgba(13, 58, 148, 0.04)',
    borderRadius: rem(6),
    paddingHorizontal: rem(8),
    paddingVertical: rem(4),
    borderWidth: 1,
    borderColor: 'rgba(13, 58, 148, 0.12)',
    alignItems: 'flex-end',
  },
  valueLabel: {
    fontSize: rem(7.5),
    fontFamily: 'Inter-Bold',
    color: colors.primary,
    textTransform: 'uppercase',
  },
  valueText: {
    fontSize: rem(11.5),
    fontFamily: 'Inter-Bold',
    fontWeight: '900',
    color: colors.primary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: rem(6),
    paddingHorizontal: rem(6),
    paddingVertical: rem(2),
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: rem(8),
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  quantitiesGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: mode === 'light' ? '#F9FAFB' : '#1F2937',
    borderRadius: rem(10),
    padding: rem(10),
    marginTop: rem(10),
    borderWidth: 1,
    borderColor: mode === 'light' ? '#F3F4F6' : '#2D3748',
  },
  quantityItemCol: {
    flex: 1,
    alignItems: 'center',
  },
  quantDivider: {
    width: 1,
    height: rem(16),
    backgroundColor: mode === 'light' ? '#E5E7EB' : '#374151',
  },
  quantLabel: {
    fontSize: rem(7.5),
    fontFamily: 'Inter-Bold',
    color: colors.textMuted,
    letterSpacing: 0.3,
    marginBottom: rem(2),
  },
  quantValue: {
    fontSize: rem(11),
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: colors.text,
  },
  actionSpeedbar: {
    flexDirection: 'row',
    marginTop: rem(12),
    paddingTop: rem(12),
    borderTopWidth: 1,
    borderTopColor: mode === 'light' ? '#F3F4F6' : '#2D3748',
    gap: rem(8),
  },
  actionChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: rem(8),
    height: rem(32),
    borderWidth: 1,
  },
  editChip: {
    backgroundColor: colors.background,
    borderColor: mode === 'light' ? '#EAE5DA' : '#334155',
  },
  deleteChip: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.15)',
  },
  editChipText: {
    fontSize: rem(10.5),
    fontFamily: 'Inter-Bold',
    color: colors.text,
  },
  deleteChipText: {
    fontSize: rem(10.5),
    fontFamily: 'Inter-Bold',
    color: '#EF4444',
  },
  emptyCardContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: rem(20),
    padding: rem(24),
    borderWidth: 1,
    borderColor: mode === 'light' ? '#EAE5DA' : '#334155',
    marginTop: rem(20),
  },
  emptyIconOutline: {
    width: rem(56),
    height: rem(56),
    borderRadius: rem(28),
    borderWidth: 1.5,
    borderColor: colors.primary + '30',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: rem(16),
  },
  emptyIconGlow: {
    width: rem(44),
    height: rem(44),
    borderRadius: rem(22),
    backgroundColor: colors.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: rem(15),
    fontFamily: 'Inter-Bold',
    color: colors.text,
    marginBottom: rem(6),
  },
  emptySubtitle: {
    fontSize: rem(11),
    fontFamily: 'Inter-Regular',
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: rem(16),
    marginHorizontal: rem(12),
    marginBottom: rem(18),
  },
  emptyCtaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: rem(8),
    paddingHorizontal: rem(14),
    borderRadius: rem(10),
  },
  emptyCtaText: {
    fontSize: rem(11),
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  customScrollbarTrack: {
    position: 'absolute',
    right: rem(4),
    top: rem(175),
    bottom: rem(20),
    width: rem(8),
    borderRadius: rem(4),
    backgroundColor: mode === 'light' ? 'rgba(13, 58, 148, 0.04)' : 'rgba(255, 255, 255, 0.02)',
    zIndex: 100,
  },
  customScrollbarThumb: {
    width: rem(8),
    borderRadius: rem(4),
    backgroundColor: colors.primary,
  },
  mainScrollDownBadge: {
    position: 'absolute',
    bottom: rem(20),
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: rem(14),
    paddingVertical: rem(8),
    borderRadius: rem(20),
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
    gap: rem(6),
    zIndex: 99,
  },
  mainScrollDownText: {
    fontSize: rem(9),
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  modalBgClose: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: rem(24),
    borderTopRightRadius: rem(24),
    paddingHorizontal: rem(20),
    paddingTop: rem(18),
    paddingBottom: Platform.OS === 'ios' ? rem(40) : rem(24),
    borderWidth: 1,
    borderColor: mode === 'light' ? '#EAE5DA' : '#334155',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: rem(14),
    borderBottomWidth: 1,
    borderBottomColor: mode === 'light' ? '#EAE5DA' : '#334155',
    marginBottom: rem(14),
  },
  modalTitle: {
    fontSize: rem(15),
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: colors.primary,
  },
  modalCloseCircle: {
    width: rem(28),
    height: rem(28),
    borderRadius: rem(14),
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: mode === 'light' ? '#EAE5DA' : '#334155',
  },
  formScroll: {
    marginBottom: rem(10),
  },
  inputLabel: {
    fontSize: rem(11),
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    color: colors.text,
    marginBottom: rem(6),
  },
  textInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: mode === 'light' ? '#EAE5DA' : '#334155',
    borderRadius: rem(10),
    height: rem(42),
    color: colors.text,
    paddingHorizontal: rem(12),
    fontSize: rem(13),
    fontFamily: 'Inter-Regular',
    marginBottom: rem(14),
  },
  formRow: {
    flexDirection: 'row',
    gap: rem(12),
  },
  formCol: {
    flex: 1,
  },
  estadoSelectRow: {
    flexDirection: 'row',
    gap: rem(6),
    marginBottom: rem(24),
  },
  estadoChip: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: mode === 'light' ? '#EAE5DA' : '#334155',
    paddingVertical: rem(8),
    paddingHorizontal: rem(10),
    borderRadius: rem(8),
    flex: 1,
    alignItems: 'center',
  },
  estadoChipActive: {
    backgroundColor: colors.primary + '10',
    borderColor: colors.primary,
  },
  estadoChipText: {
    fontSize: rem(9),
    fontFamily: 'Inter-Bold',
    color: colors.textMuted,
  },
  estadoChipTextActive: {
    color: colors.primary,
    fontFamily: 'Inter-Bold',
  },
  saveBtn: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    borderRadius: rem(12),
    height: rem(46),
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
    marginTop: rem(10),
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: rem(13),
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
  },
});
