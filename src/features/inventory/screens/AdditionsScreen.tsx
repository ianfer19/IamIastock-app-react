import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  ScrollView,
  Dimensions,
  Platform,
  Image as RNImage,
  Animated
} from 'react-native';
import { useAppSelector } from '@/core/store/store';
import { useStatusModal } from '@/core/context/StatusModalContext';
import { InventoryService } from '@/infrastructure/services/inventoryService';
import { Addition } from '@/domain/entities/Product';
import { rem } from '@/core/utils/responsive';
import { CurrencyService } from '@/core/services/currencyService';
import { 
  ArrowLeft, 
  Search, 
  Plus, 
  Edit3, 
  Check, 
  AlertTriangle, 
  X, 
  Save,
  Box,
  Coins,
  ChevronDown
} from 'lucide-react-native';
import { MotiView, AnimatePresence } from 'moti';
import * as Haptics from 'expo-haptics';
import { PremiumSubScreenHeader } from '../components/PremiumSubScreenHeader';
import { useTheme } from '@/core/theme/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface AdditionsScreenProps {
  onBack: () => void;
}

export const AdditionsScreen = ({ onBack }: AdditionsScreenProps) => {
  const { colors, mode } = useTheme();
  const styles = getStyles(colors, mode);
  const { showStatus } = useStatusModal();
  const globalAdditions = useAppSelector(state => state.catalog.additions);

  const [additions, setAdditions] = useState<Addition[]>(globalAdditions);
  const mainScrollY = useRef(new Animated.Value(0)).current;
  const [showScrollBadge, setShowScrollBadge] = useState(true);
  useEffect(() => {
    const id = mainScrollY.addListener(({ value }) => {
      const shouldShow = value < 40;
      if (shouldShow !== showScrollBadge) {
        setShowScrollBadge(shouldShow);
      }
    });
    return () => mainScrollY.removeListener(id);
  }, [showScrollBadge]);
  const [contentHeight, setContentHeight] = useState(1);
  const [visibleHeight, setVisibleHeight] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  // Dashboard Health Metrics
  const totalAdditionsCount = additions.length;
  const lowStockCount = useMemo(() => {
    return additions.filter(a => (a.stock || 0) <= 10).length;
  }, [additions]);
  const activeCount = useMemo(() => {
    return additions.filter(a => a.estado === 'ACTIVO').length;
  }, [additions]);
  const totalValue = useMemo(() => {
    return additions.reduce((sum, item) => sum + ((item.stock || 0) * (item.precio || 0)), 0);
  }, [additions]);
  const inventoryHealthPct = useMemo(() => {
    return totalAdditionsCount > 0 
      ? Math.round(((totalAdditionsCount - lowStockCount) / totalAdditionsCount) * 100) 
      : 100;
  }, [totalAdditionsCount, lowStockCount]);
  
  // Create/Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddition, setEditingAddition] = useState<Partial<Addition> | null>(null);
  
  // Form Fields
  const [formNombre, setFormNombre] = useState('');
  const [formPrecio, setFormPrecio] = useState('');
  const [formStock, setFormStock] = useState('');
  const [formEstado, setFormEstado] = useState<'ACTIVO' | 'INACTIVO'>('ACTIVO');

  // Filtering Logic
  const filteredAdditions = useMemo(() => {
    return additions.filter(a => {
      return a.nombre.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [additions, searchQuery]);

  const handleOpenForm = (addition: Addition | null = null) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (addition) {
      setEditingAddition(addition);
      setFormNombre(addition.nombre);
      setFormPrecio(addition.precio ? addition.precio.toString() : '');
      setFormStock(addition.stock ? addition.stock.toString() : '0');
      
      const safeState: 'ACTIVO' | 'INACTIVO' = addition.estado === 'INACTIVO' ? 'INACTIVO' : 'ACTIVO';
      setFormEstado(safeState);
    } else {
      setEditingAddition(null);
      setFormNombre('');
      setFormPrecio('');
      setFormStock('0');
      setFormEstado('ACTIVO');
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formNombre || !formPrecio) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showStatus({
        type: 'error',
        title: 'Error de validación',
        message: 'Por favor completa el nombre y el precio de la adición.',
        actionText: 'Entendido'
      });
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const priceVal = parseFloat(formPrecio) || 0;
    const stockVal = parseFloat(formStock) || 0;

    const additionPayload: Partial<Addition> = {
      nombre: formNombre,
      precio: priceVal,
      stock: stockVal,
      estado: formEstado
    };

    try {
      if (editingAddition && editingAddition.id) {
        // Update
        await InventoryService.updateAddition(editingAddition.id, additionPayload);
        setAdditions(prev => prev.map(a => a.id === editingAddition.id ? { ...a, ...additionPayload } as Addition : a));
        showStatus({
          type: 'success',
          title: 'Adición Actualizada',
          message: `La adición "${formNombre}" ha sido modificada con éxito.`,
          actionText: 'Aceptar'
        });
      } else {
        // Create
        const newId = `ADDN-${Math.floor(Math.random() * 9000) + 1000}`;
        const newAddition: Addition = {
          ...additionPayload,
          id: newId,
        } as Addition;
        setAdditions(prev => [newAddition, ...prev]);
        showStatus({
          type: 'success',
          title: 'Adición Creada',
          message: `La adición "${formNombre}" ha sido agregada con éxito.`,
          actionText: 'Genial'
        });
      }
      setIsModalOpen(false);
    } catch (e) {
      showStatus({
        type: 'error',
        title: 'Error de Red',
        message: 'Hubo un error al intentar guardar los cambios.',
        actionText: 'Reintentar'
      });
    }
  };

  const handleToggleState = async (item: Addition) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const targetState: 'ACTIVO' | 'INACTIVO' = item.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    try {
      await InventoryService.updateAddition(item.id!, { estado: targetState });
      setAdditions(prev => prev.map(a => a.id === item.id ? { ...a, estado: targetState } : a));
    } catch (e) {
      console.error(e);
    }
  };

  const renderAdditionItem = ({ item, index }: { item: Addition; index: number }) => {
    const isActive = item.estado === 'ACTIVO';
    const isLowStock = (item.stock || 0) <= 10;
    const stockColor = isLowStock ? colors.error : colors.success;

    return (
      <MotiView
        from={{ opacity: 0, translateY: 15 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ delay: index * 20, type: 'timing', duration: 250 }}
        style={[styles.productCard, !isActive && styles.productCardInactive]}
      >
        <View style={styles.cardMainRow}>
          {/* LEFT: Image / Placeholder */}
          <View style={styles.imageCol}>
            {item.imagen_url ? (
              <RNImage source={{ uri: item.imagen_url }} style={styles.cardImage} resizeMode="cover" />
            ) : (
              <View style={[styles.cardImagePlaceholder, { backgroundColor: colors.primaryGlow }]}>
                <Plus size={rem(20)} color={colors.primary} />
              </View>
            )}

            {isLowStock && (
              <View style={styles.lowStockTinyBadge}>
                <AlertTriangle size={rem(8)} color="#FFFFFF" />
              </View>
            )}
          </View>

          {/* RIGHT: Details */}
          <View style={styles.cardDetailsCol}>
            <View style={styles.cardTitleRow}>
              <Text style={[styles.productNameText, !isActive && styles.additionNameInactive]} numberOfLines={1}>
                {item.nombre}
              </Text>
              
              <View style={styles.cardActionsContainer}>
                <TouchableOpacity 
                  style={styles.cardActionCircle} 
                  activeOpacity={0.7}
                  onPress={() => handleOpenForm(item)}
                >
                  <Edit3 size={rem(11)} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Badges Row */}
            <View style={styles.badgesWrapper}>
              <TouchableOpacity 
                style={[styles.cardBadge, { backgroundColor: isActive ? colors.success + '12' : colors.textMuted + '12' }]}
                activeOpacity={0.8}
                onPress={() => handleToggleState(item)}
              >
                <View style={[styles.statusDot, { backgroundColor: isActive ? colors.success : colors.textMuted }]} />
                <Text style={[styles.cardBadgeText, { color: isActive ? colors.success : colors.textMuted, fontFamily: 'Inter-Bold', fontWeight: '800' }]}>
                  {isActive ? 'ACTIVO' : 'INACTIVO'}
                </Text>
              </TouchableOpacity>
              
              {isLowStock && (
                <View style={[styles.cardBadge, { backgroundColor: colors.error + '10' }]}>
                  <AlertTriangle size={rem(8)} color={colors.error} />
                  <Text style={[styles.cardBadgeText, { color: colors.error, fontFamily: 'Inter-Bold', fontWeight: '700' }]}>
                    Bajo Stock
                  </Text>
                </View>
              )}
            </View>

            {/* Price, Stock Bento row */}
            <View style={styles.cardStatsRow}>
              <View style={styles.cardStatItem}>
                <Text style={styles.statLabel}>Precio Extra</Text>
                <Text style={styles.statValue}>{CurrencyService.format(item.precio || 0)}</Text>
              </View>

              <View style={[styles.cardStatItem, { alignItems: 'flex-end' }]}>
                <Text style={styles.statLabel}>Stock Actual</Text>
                <Text style={[styles.statValue, { color: stockColor, fontFamily: 'Inter-Bold', fontWeight: '800' }]}>
                  {item.stock !== undefined ? `${item.stock} unid` : 'Ilimitado'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </MotiView>
    );
  };

  return (
    <View style={styles.container}>
      {/* Premium Header */}
      <PremiumSubScreenHeader
        title="Adiciones y Extras"
        subtitle="Adiciones"
        onBack={onBack}
        actionLabel="Nueva"
        onAction={() => handleOpenForm(null)}
      />

      {/* Premium Slanted Inventory Health Dashboard Header */}
      <MotiView
        from={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        style={styles.healthDashboard}
      >
        {/* Left Side: Health Pct */}
        <View style={styles.healthLeftSection}>
          <Text style={styles.healthTitle}>SALUD DE ADICIONES</Text>
          <View style={styles.healthValueRow}>
            <Text style={styles.healthBigNumber}>{inventoryHealthPct}</Text>
            <Text style={styles.healthPercentSign}>%</Text>
          </View>
          <View style={styles.healthProgressBg}>
            <View style={[styles.healthProgressFill, { width: `${inventoryHealthPct}%`, backgroundColor: colors.primary }]} />
          </View>
        </View>

        {/* Diagonal Separator Accent */}
        <View style={styles.slantedDivider} />

        {/* Right Side: Quick Stats Columns */}
        <View style={styles.healthRightSection}>
          {/* Fila superior: Total y Bajo Stock al lado */}
          <View style={styles.healthStatsRowGroup}>
            {/* Stat 1: Total Additions */}
            <View style={[styles.healthStatCard, { flex: 1 }]}>
              <View style={[styles.healthIconCircle, { backgroundColor: colors.success + '15' }]}>
                <Box size={rem(11)} color={colors.success} />
              </View>
              <View style={styles.healthStatTextCol}>
                <Text style={styles.healthStatLabel}>TOTAL EXTRAS</Text>
                <Text style={styles.healthStatVal}>{totalAdditionsCount}</Text>
              </View>
            </View>

            {/* Stat 2: Active count */}
            <View style={[styles.healthStatCard, { flex: 1 }]}>
              <View style={[styles.healthIconCircle, { backgroundColor: colors.primary + '15' }]}>
                <Check size={rem(11)} color={colors.primary} />
              </View>
              <View style={styles.healthStatTextCol}>
                <Text style={styles.healthStatLabel}>ACTIVAS</Text>
                <Text style={styles.healthStatVal}>{activeCount}</Text>
              </View>
            </View>
          </View>

          {/* Fila inferior: Valor Total completo abajo */}
          <View style={[styles.healthStatCard, { marginTop: rem(2) }]}>
            <View style={[styles.healthIconCircle, { backgroundColor: '#EAB30815' }]}>
              <Coins size={rem(11)} color="#EAB308" />
            </View>
            <View style={styles.healthStatTextCol}>
              <Text style={styles.healthStatLabel}>VALORACIÓN ESTIMADA EXTRAS</Text>
              <Text style={styles.healthStatVal} numberOfLines={1}>
                {CurrencyService.format(totalValue)}
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
          placeholder="Buscar adición..."
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
        data={filteredAdditions}
        renderItem={renderAdditionItem}
        keyExtractor={(item) => item.id || `addn-${Math.random()}`}
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
            transition={{ type: 'spring', damping: 20 }}
            style={styles.emptyCardContainer}
          >
            <View style={styles.emptyIconOutline}>
              <View style={styles.emptyIconGlow}>
                <Plus size={rem(24)} color={colors.primary} />
              </View>
            </View>
            <Text style={styles.emptyTitle}>Sin Adiciones</Text>
            <Text style={styles.emptySubtitle}>
              Crea ingredientes adicionales o extras (queso, tocineta, salsas especiales) que los clientes pueden sumar.
            </Text>
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.emptyCtaButton}
              onPress={() => handleOpenForm(null)}
            >
              <Plus size={rem(12)} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.emptyCtaText}>Nueva Adición</Text>
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

      {/* Pulse Floating Scroll down badge for Main List */}
      <AnimatePresence>
        {filteredAdditions.length > 3 && showScrollBadge && (
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
            <Text style={styles.mainScrollDownText}>Desliza para ver más adiciones</Text>
          </MotiView>
        )}
      </AnimatePresence>

      {/* Form Slide Modal */}
      <Modal
        visible={isModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBgClose} activeOpacity={1} onPress={() => setIsModalOpen(false)} />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingAddition ? 'Editar Adición' : 'Crear Adición'}
              </Text>
              <TouchableOpacity 
                style={styles.modalCloseCircle} 
                onPress={() => setIsModalOpen(false)}
                activeOpacity={0.7}
              >
                <X size={rem(15)} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Nombre de la Adición *</Text>
              <TextInput
                style={styles.textInput}
                value={formNombre}
                onChangeText={setFormNombre}
                placeholder="Ej. Tocineta Extra"
                placeholderTextColor={colors.textMuted}
              />

              <View style={styles.formRow}>
                <View style={styles.formCol}>
                  <Text style={styles.inputLabel}>Precio Adicional *</Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={formPrecio}
                    onChangeText={setFormPrecio}
                    placeholder="Ej. 2500"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
                <View style={styles.formCol}>
                  <Text style={styles.inputLabel}>Stock de Adiciones</Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={formStock}
                    onChangeText={setFormStock}
                    placeholder="Ej. 100"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Estado Operativo</Text>
              <View style={styles.statusSelectRow}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[styles.statusSelectOption, formEstado === 'ACTIVO' && styles.statusSelectOptionActive]}
                  onPress={() => setFormEstado('ACTIVO')}
                >
                  {formEstado === 'ACTIVO' && <Check size={rem(11)} color="#FFFFFF" style={{ marginRight: 4 }} />}
                  <Text style={[styles.statusSelectText, formEstado === 'ACTIVO' && styles.statusSelectTextActive]}>
                    ACTIVO
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[styles.statusSelectOption, formEstado === 'INACTIVO' && styles.statusSelectOptionInactive]}
                  onPress={() => setFormEstado('INACTIVO')}
                >
                  {formEstado === 'INACTIVO' && <Check size={rem(11)} color="#FFFFFF" style={{ marginRight: 4 }} />}
                  <Text style={[styles.statusSelectText, formEstado === 'INACTIVO' && styles.statusSelectTextActive]}>
                    INACTIVO
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                style={styles.saveBtn} 
                activeOpacity={0.8}
                onPress={handleSave}
              >
                <Save size={rem(15)} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.saveBtnText}>Guardar Cambios</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: rem(16),
    paddingTop: rem(12),
    paddingBottom: rem(12),
    borderBottomWidth: 1,
    borderBottomColor: mode === 'light' ? '#EAE5DA' : '#334155',
  },
  backBtn: {
    width: rem(36),
    height: rem(36),
    borderRadius: rem(10),
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: mode === 'light' ? '#EAE5DA' : '#334155',
    shadowColor: '#1A365D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  headerTitle: {
    fontSize: rem(15),
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: colors.primary,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: rem(8),
    paddingHorizontal: rem(12),
    borderRadius: rem(10),
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  addBtnText: {
    fontSize: rem(11),
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: '#FFFFFF',
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
    width: '32%',
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
    fontSize: rem(30),
    fontFamily: 'Inter-Bold',
    fontWeight: '900',
    color: colors.primary,
  },
  healthPercentSign: {
    fontSize: rem(14),
    fontFamily: 'Inter-Bold',
    color: colors.primary,
    marginLeft: rem(2),
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
  healthStatsRowGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: rem(8),
  },
  healthRightSection: {
    flex: 1,
    paddingLeft: rem(4),
    gap: rem(6),
  },
  healthStatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rem(8),
  },
  healthIconCircle: {
    width: rem(22),
    height: rem(22),
    borderRadius: rem(11),
    justifyContent: 'center',
    alignItems: 'center',
  },
  healthStatTextCol: {
    flex: 1,
  },
  healthStatLabel: {
    fontSize: rem(7),
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.3,
  },
  healthStatVal: {
    fontSize: rem(11),
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: colors.text,
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
  customScrollbarTrack: {
    position: 'absolute',
    right: rem(4),
    top: rem(160),
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
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: rem(16),
    marginTop: rem(14),
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
    paddingBottom: rem(40),
    gap: rem(8),
  },
  cardContainer: {
    backgroundColor: colors.surface,
    borderRadius: rem(14),
    padding: rem(14),
    borderWidth: 1,
    borderColor: mode === 'light' ? '#EAE5DA' : '#334155',
    shadowColor: '#1A365D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  cardContainerInactive: {
    opacity: 0.65,
    backgroundColor: mode === 'light' ? '#F5F1E8' : 'rgba(255, 255, 255, 0.05)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: rem(10),
  },
  additionName: {
    fontSize: rem(14),
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: colors.text,
    marginBottom: rem(4),
  },
  additionNameInactive: {
    textDecorationLine: 'line-through',
    color: colors.textMuted,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: rem(6),
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: rem(6),
    paddingHorizontal: rem(6),
    paddingVertical: rem(2),
    gap: rem(4),
    borderWidth: 1,
  },
  statusBadgeActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.15)',
  },
  statusBadgeInactive: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.15)',
  },
  statusDot: {
    width: rem(5),
    height: rem(5),
    borderRadius: rem(2.5),
  },
  statusDotActive: {
    backgroundColor: '#10B981',
  },
  statusDotInactive: {
    backgroundColor: '#EF4444',
  },
  statusText: {
    fontSize: rem(8),
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
  },
  statusTextActive: {
    color: '#10B981',
  },
  statusTextInactive: {
    color: '#EF4444',
  },
  warningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.12)',
    borderRadius: rem(6),
    paddingHorizontal: rem(6),
    paddingVertical: rem(2),
    gap: rem(3),
  },
  warningBadgeText: {
    fontSize: rem(8),
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    color: '#EF4444',
  },
  cardActions: {
    flexDirection: 'row',
  },
  actionBtn: {
    width: rem(28),
    height: rem(28),
    borderRadius: rem(8),
    backgroundColor: colors.primaryGlow,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: mode === 'light' ? 'rgba(13, 58, 148, 0.12)' : 'rgba(255, 255, 255, 0.1)',
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderRadius: rem(8),
    paddingVertical: rem(8),
    paddingHorizontal: rem(10),
    borderWidth: 1,
    borderColor: mode === 'light' ? '#EAE5DA' : '#334155',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rem(6),
  },
  detailLabel: {
    fontSize: rem(9),
    fontFamily: 'Inter-Regular',
    color: colors.textMuted,
  },
  detailValue: {
    fontSize: rem(11),
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    color: colors.text,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: rem(60),
  },
  emptyText: {
    fontSize: rem(12),
    fontFamily: 'Inter-Regular',
    color: colors.textMuted,
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
    maxHeight: SCREEN_HEIGHT * 0.85,
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
  statusSelectRow: {
    flexDirection: 'row',
    gap: rem(10),
    marginBottom: rem(24),
  },
  statusSelectOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: mode === 'light' ? '#EAE5DA' : '#334155',
    borderRadius: rem(10),
    height: rem(40),
  },
  statusSelectOptionActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  statusSelectOptionInactive: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  statusSelectText: {
    fontSize: rem(11),
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    color: colors.textMuted,
  },
  statusSelectTextActive: {
    color: '#FFFFFF',
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
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: rem(13),
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
  },
  emptyCardContainer: {
    backgroundColor: mode === 'light' ? '#FFFFFF' : '#151E2E',
    borderRadius: rem(20),
    paddingHorizontal: rem(24),
    paddingVertical: rem(36),
    marginHorizontal: rem(16),
    marginTop: rem(20),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: mode === 'light' ? '#EAE5DA' : '#2D3748',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: mode === 'light' ? 0.05 : 0.15,
    shadowRadius: 16,
    elevation: 4,
  },
  emptyIconOutline: {
    width: rem(72),
    height: rem(72),
    borderRadius: rem(36),
    borderWidth: 1.5,
    borderColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: rem(18),
  },
  emptyIconGlow: {
    width: rem(56),
    height: rem(56),
    borderRadius: rem(28),
    backgroundColor: colors.primaryGlow,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: rem(15),
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: colors.primary,
    marginBottom: rem(8),
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  emptySubtitle: {
    fontSize: rem(11),
    fontFamily: 'Inter-Regular',
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: rem(16),
    marginBottom: rem(24),
    paddingHorizontal: rem(10),
  },
  emptyCtaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: rem(12),
    paddingHorizontal: rem(18),
    paddingVertical: rem(12),
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  emptyCtaText: {
    fontSize: rem(11),
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Redesigned Card Styles
  productCard: {
    backgroundColor: mode === 'light' ? '#FFFFFF' : '#151E2E',
    borderRadius: rem(16),
    marginHorizontal: 0,
    marginBottom: 0,
    paddingTop: rem(12),
    paddingHorizontal: rem(12),
    paddingBottom: rem(12),
    borderWidth: 1,
    borderColor: mode === 'light' ? '#EAE5DA' : '#2D3748',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: mode === 'light' ? 0.02 : 0.1,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  productCardInactive: {
    opacity: 0.6,
  },
  cardMainRow: {
    flexDirection: 'row',
    gap: rem(10),
  },
  imageCol: {
    position: 'relative',
  },
  cardImage: {
    width: rem(68),
    height: rem(68),
    borderRadius: rem(12),
    backgroundColor: mode === 'light' ? '#F8FAFC' : '#1E293B',
  },
  cardImagePlaceholder: {
    width: rem(68),
    height: rem(68),
    borderRadius: rem(12),
    justifyContent: 'center',
    alignItems: 'center',
  },
  lowStockTinyBadge: {
    position: 'absolute',
    top: rem(-3),
    right: rem(-3),
    width: rem(14),
    height: rem(14),
    borderRadius: rem(7),
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: mode === 'light' ? '#FFFFFF' : '#151E2E',
  },
  cardDetailsCol: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: rem(6),
  },
  productNameText: {
    fontSize: rem(13),
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: colors.text,
    flex: 1,
  },
  cardActionsContainer: {
    flexDirection: 'row',
    gap: rem(6),
  },
  cardActionCircle: {
    width: rem(22),
    height: rem(22),
    borderRadius: rem(11),
    backgroundColor: colors.primaryGlow,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgesWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rem(4),
    marginVertical: rem(4),
  },
  cardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: mode === 'light' ? '#F8FAFC' : '#1E293B' + '80',
    paddingHorizontal: rem(6),
    paddingVertical: rem(2),
    borderRadius: rem(4),
    gap: rem(2.5),
  },
  cardBadgeText: {
    fontSize: rem(8),
    fontFamily: 'Inter-Regular',
    color: colors.textMuted,
    fontWeight: '600',
  },
  cardStatsRow: {
    flexDirection: 'row',
    backgroundColor: mode === 'light' ? '#F8FAFC' : '#1E293B' + '40',
    borderRadius: rem(8),
    paddingVertical: rem(4),
    paddingHorizontal: rem(8),
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: rem(2),
  },
  cardStatItem: {
    flex: 1,
  },
  statLabel: {
    fontSize: rem(7),
    fontFamily: 'Inter-Regular',
    color: colors.textMuted,
    marginBottom: rem(1),
  },
  statValue: {
    fontSize: rem(10),
    fontFamily: 'Inter-Medium',
    color: colors.text,
  }
});
