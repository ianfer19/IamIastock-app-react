import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  Linking,
  Platform,
  Animated,
  Image
} from 'react-native';
import { useStatusModal } from '@/core/context/StatusModalContext';
import { InventoryService, Supplier } from '@/infrastructure/services/inventoryService';
import { rem } from '@/core/utils/responsive';
import { CurrencyService } from '@/core/services/currencyService';
import { 
  Plus, 
  User, 
  FileText, 
  Phone, 
  MessageCircle, 
  X, 
  Save,
  Search,
  MapPin,
  Truck,
  Building2,
  Mail,
  Coins,
  ChevronDown,
  AlertTriangle,
  CheckCircle,
  Briefcase
} from 'lucide-react-native';
import { MotiView, AnimatePresence } from 'moti';
import * as Haptics from 'expo-haptics';
import { PremiumSubScreenHeader } from '../components/PremiumSubScreenHeader';
import { useTheme } from '@/core/theme/theme';

interface SuppliersScreenProps {
  onBack: () => void;
}

export const SuppliersScreen = ({ onBack }: SuppliersScreenProps) => {
  const { colors, mode } = useTheme();
  const styles = getStyles(colors, mode);
  const { showStatus } = useStatusModal();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Partial<Supplier> | null>(null);

  // Inputs
  const [formNombre, setFormNombre] = useState('');
  const [formContacto, setFormContacto] = useState('');
  const [formNit, setFormNit] = useState('');
  const [formTelefono, setFormTelefono] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formDireccion, setFormDireccion] = useState('');

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

  const fetchSuppliers = async () => {
    try {
      const data = await InventoryService.getSuppliers();
      setSuppliers(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  // Filtering
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(s => {
      return (s.nombre || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
             (s.contacto || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
             (s.nit || '').includes(searchQuery);
    });
  }, [suppliers, searchQuery]);

  // Outstanding Liabilities
  const totalLiabilities = useMemo(() => {
    return suppliers.reduce((sum, s) => sum + (s.saldoPendiente || 0), 0);
  }, [suppliers]);

  // Active Count
  const activeCount = useMemo(() => {
    return suppliers.filter(s => s.estado === 'ACTIVO').length;
  }, [suppliers]);

  const handleOpenForm = (supplier: Supplier | null = null) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (supplier) {
      setEditingSupplier(supplier);
      setFormNombre(supplier.nombre);
      setFormContacto(supplier.contacto);
      setFormNit(supplier.nit);
      setFormTelefono(supplier.telefono);
      setFormEmail(supplier.email);
      setFormDireccion(supplier.direccion || '');
    } else {
      setEditingSupplier(null);
      setFormNombre('');
      setFormContacto('');
      setFormNit('');
      setFormTelefono('');
      setFormEmail('');
      setFormDireccion('');
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formNombre || !formContacto || !formTelefono) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showStatus({
        type: 'error',
        title: 'Error de validación',
        message: 'Por favor, introduce nombre, contacto y teléfono.',
        actionText: 'Aceptar'
      });
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const payload: Omit<Supplier, 'id'> = {
      nombre: formNombre,
      contacto: formContacto,
      nit: formNit || `NIT-${Math.floor(Math.random()*900000)+100000}`,
      telefono: formTelefono,
      email: formEmail,
      direccion: formDireccion,
      saldoPendiente: editingSupplier?.saldoPendiente || 0,
      estado: editingSupplier?.estado || 'ACTIVO'
    };

    try {
      if (editingSupplier && editingSupplier.id) {
        const updated = await InventoryService.updateSupplier(editingSupplier.id, payload);
        setSuppliers(prev => prev.map(s => s.id === editingSupplier.id ? updated : s));
        showStatus({
          type: 'success',
          title: 'Proveedor Guardado',
          message: `El registro de "${formNombre}" ha sido modificado.`,
          actionText: 'Excelente'
        });
      } else {
        const created = await InventoryService.createSupplier(payload);
        setSuppliers(prev => [created, ...prev]);
        showStatus({
          type: 'success',
          title: 'Proveedor Agregado',
          message: `El proveedor "${formNombre}" fue incorporado con éxito.`,
          actionText: 'Genial'
        });
      }
      setIsModalOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCall = (phone: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(`tel:${phone}`).catch(() => {
      alert('Marcación no compatible en este entorno.');
    });
  };

  const handleWhatsApp = (phone: string, supplierName: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const message = `Hola ${supplierName}, te saludamos de IAStock POS. Queremos consultar la disponibilidad de materias primas...`;
    const url = `whatsapp://send?phone=57${cleanPhone}&text=${encodeURIComponent(message)}`;
    
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Linking.openURL(`https://wa.me/57${cleanPhone}?text=${encodeURIComponent(message)}`);
      }
    }).catch(() => {
      Linking.openURL(`https://wa.me/57${cleanPhone}?text=${encodeURIComponent(message)}`);
    });
  };

  const renderSupplierItem = ({ item, index }: { item: Supplier; index: number }) => {
    const balance = item.saldoPendiente || 0;
    
    // Deterministic premium icon colors and gradients
    const isInactive = item.estado === 'INACTIVO';
    const accentColor = isInactive ? colors.textMuted : colors.primary;

    return (
      <MotiView
        from={{ opacity: 0, translateY: 35, scale: 0.96 }}
        animate={{ opacity: 1, translateY: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ delay: 240 + Math.min(index * 45, 360), type: 'timing', duration: 320 }}
        style={styles.cardContainer}
      >
        <View style={styles.cardMainRow}>
          {/* Left Avatar Section */}
          <View style={styles.avatarWrapper}>
            <View style={[styles.avatarGlow, { backgroundColor: accentColor + '10' }]}>
              <Truck size={rem(20)} color={accentColor} />
            </View>
            {isInactive && (
              <View style={styles.inactiveDot} />
            )}
          </View>

          {/* Middle Details Section */}
          <View style={styles.cardDetailsCol}>
            <View style={styles.cardHeaderLine}>
              <Text style={[styles.companyName, isInactive && styles.textInactive]} numberOfLines={1}>
                {item.nombre}
              </Text>
            </View>

            <View style={styles.nitRow}>
              <FileText size={rem(10)} color={colors.textMuted} style={{ marginRight: 4 }} />
              <Text style={styles.nitText}>NIT/RUT: {item.nit}</Text>
            </View>

            <View style={styles.contactRow}>
              <User size={rem(10)} color={colors.textMuted} style={{ marginRight: 4 }} />
              <Text style={styles.contactText} numberOfLines={1}>
                Contacto: <Text style={styles.contactValue}>{item.contacto}</Text>
              </Text>
            </View>

            {item.direccion ? (
              <View style={styles.locationRow}>
                <MapPin size={rem(10)} color={colors.textMuted} style={{ marginRight: 4 }} />
                <Text style={styles.locationText} numberOfLines={1}>{item.direccion}</Text>
              </View>
            ) : null}
          </View>

          {/* Right outstanding debt / Status tags */}
          <View style={styles.cardRightCol}>
            {balance > 0 ? (
              <View style={styles.balanceBadgeContainer}>
                <Text style={styles.balanceLabel}>Deuda</Text>
                <Text style={styles.balanceValue}>{CurrencyService.format(balance)}</Text>
              </View>
            ) : (
              <View style={styles.cleanStatusContainer}>
                <CheckCircle size={rem(11)} color={colors.success} />
                <Text style={styles.cleanStatusText}>Al día</Text>
              </View>
            )}
            
            <View style={[
              styles.statusBadge, 
              { backgroundColor: isInactive ? 'rgba(239, 68, 68, 0.08)' : colors.success + '10' }
            ]}>
              <Text style={[
                styles.statusBadgeText, 
                { color: isInactive ? '#EF4444' : colors.success }
              ]}>
                {item.estado}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick action Speedbar */}
        <View style={styles.actionSpeedbar}>
          <TouchableOpacity 
            style={[styles.actionChip, styles.callChip]}
            activeOpacity={0.8}
            onPress={() => handleCall(item.telefono)}
          >
            <Phone size={rem(12)} color="#10B981" />
            <Text style={styles.callChipText}>Llamar</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionChip, styles.chatChip]}
            activeOpacity={0.8}
            onPress={() => handleWhatsApp(item.telefono, item.nombre)}
          >
            <MessageCircle size={rem(12)} color="#25D366" />
            <Text style={styles.chatChipText}>WhatsApp</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.editIconBtn}
            activeOpacity={0.7}
            onPress={() => handleOpenForm(item)}
          >
            <Text style={styles.editBtnTextText}>Editar</Text>
          </TouchableOpacity>
        </View>
      </MotiView>
    );
  };

  return (
    <View style={styles.container}>
      {/* Premium Header */}
      <MotiView
        from={{ opacity: 0, translateY: -15 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 300, delay: 0 }}
      >
        <PremiumSubScreenHeader
          title="Directorio de Proveedores"
          subtitle="Proveedores"
          onBack={onBack}
          actionLabel="Agregar"
          onAction={() => handleOpenForm(null)}
        />
      </MotiView>

      {/* Slanted dynamic bento metrics dashboard */}
      <MotiView
        from={{ opacity: 0, translateY: 25, scale: 0.98 }}
        animate={{ opacity: 1, translateY: 0, scale: 1 }}
        transition={{ type: 'timing', duration: 350, delay: 80 }}
        style={styles.healthDashboard}
      >
        <View style={styles.healthLeftSection}>
          <Text style={styles.healthTitle}>DEUDA TOTAL PROVEEDORES</Text>
          <View style={styles.healthValueRow}>
            <Text style={[styles.healthBigNumber, { color: totalLiabilities > 0 ? '#EF4444' : colors.success }]}>
              {CurrencyService.format(totalLiabilities)}
            </Text>
          </View>
          <View style={styles.healthProgressBg}>
            <View style={[
              styles.healthProgressFill, 
              { 
                width: '100%',
                backgroundColor: totalLiabilities > 0 ? '#EF4444' : colors.success
              }
            ]} />
          </View>
        </View>

        <View style={styles.slantedDivider} />

        <View style={styles.healthRightSection}>
          <View style={styles.healthStatsRowGroup}>
            <View style={[styles.healthStatCard, { flex: 1 }]}>
              <View style={[styles.healthIconCircle, { backgroundColor: colors.primary + '15' }]}>
                <Building2 size={rem(11)} color={colors.primary} />
              </View>
              <View style={styles.healthStatTextCol}>
                <Text style={styles.healthStatLabel}>TOTAL PROVEEDORES</Text>
                <Text style={styles.healthStatVal}>{suppliers.length}</Text>
              </View>
            </View>

            <View style={[styles.healthStatCard, { flex: 1 }]}>
              <View style={[styles.healthIconCircle, { backgroundColor: colors.success + '15' }]}>
                <CheckCircle size={rem(11)} color={colors.success} />
              </View>
              <View style={styles.healthStatTextCol}>
                <Text style={styles.healthStatLabel}>ACTIVOS</Text>
                <Text style={styles.healthStatVal}>{activeCount}</Text>
              </View>
            </View>
          </View>

          <View style={[styles.healthStatCard, { marginTop: rem(2) }]}>
            <View style={[styles.healthIconCircle, { backgroundColor: '#EAB30815' }]}>
              <Coins size={rem(11)} color="#EAB308" />
            </View>
            <View style={styles.healthStatTextCol}>
              <Text style={styles.healthStatLabel}>PROVEEDORES CON SALDO</Text>
              <Text style={styles.healthStatVal}>
                {suppliers.filter(s => (s.saldoPendiente || 0) > 0).length}
              </Text>
            </View>
          </View>
        </View>
      </MotiView>

      {/* Search area */}
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 320, delay: 160 }}
        style={styles.searchBarContainer}
      >
        <Search size={rem(16)} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nombre, contacto o NIT..."
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
      </MotiView>

      {/* Main List */}
      <Animated.FlatList
        data={filteredSuppliers}
        renderItem={renderSupplierItem}
        keyExtractor={(item) => item.id || item.nit || item.nombre}
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
                <Truck size={rem(24)} color={colors.primary} />
              </View>
            </View>
            <Text style={styles.emptyTitle}>Sin Proveedores</Text>
            <Text style={styles.emptySubtitle}>
              Administra el directorio de tus proveedores, gestiona saldos pendientes y agiliza la comunicación vía WhatsApp.
            </Text>
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.emptyCtaButton}
              onPress={() => handleOpenForm(null)}
            >
              <Plus size={rem(12)} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.emptyCtaText}>Nuevo Proveedor</Text>
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
        {filteredSuppliers.length > 3 && showScrollBadge && (
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
            <Text style={styles.mainScrollDownText}>Desliza para ver más aliados</Text>
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
                {editingSupplier ? 'Editar Proveedor' : 'Registrar Proveedor'}
              </Text>
              <TouchableOpacity style={styles.modalCloseCircle} onPress={() => setIsModalOpen(false)}>
                <X size={rem(15)} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Razón Social / Nombre *</Text>
              <TextInput
                style={styles.textInput}
                value={formNombre}
                onChangeText={setFormNombre}
                placeholder="Ej. Distribuidora Central"
                placeholderTextColor={colors.textMuted}
              />

              <View style={styles.formRow}>
                <View style={styles.formCol}>
                  <Text style={styles.inputLabel}>Contacto Comercial *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formContacto}
                    onChangeText={setFormContacto}
                    placeholder="Ej. Felipe Restrepo"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
                <View style={styles.formCol}>
                  <Text style={styles.inputLabel}>NIT o RUT</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formNit}
                    onChangeText={setFormNit}
                    placeholder="Ej. 900.123.456-1"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={styles.formCol}>
                  <Text style={styles.inputLabel}>Teléfono Celular *</Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="phone-pad"
                    value={formTelefono}
                    onChangeText={setFormTelefono}
                    placeholder="Ej. 3120000000"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
                <View style={styles.formCol}>
                  <Text style={styles.inputLabel}>Correo Electrónico</Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="email-address"
                    value={formEmail}
                    onChangeText={setFormEmail}
                    placeholder="Ej. contacto@ventas.co"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Dirección de Despacho</Text>
              <TextInput
                style={styles.textInput}
                value={formDireccion}
                onChangeText={setFormDireccion}
                placeholder="Ej. Avenida 19 #120-40"
                placeholderTextColor={colors.textMuted}
              />

              {editingSupplier ? (
                <View style={{ marginBottom: rem(14) }}>
                  <Text style={styles.inputLabel}>Estado Operativo</Text>
                  <View style={{ flexDirection: 'row', gap: rem(10) }}>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={[
                        styles.toggleOptionBtn,
                        editingSupplier.estado === 'ACTIVO' && styles.toggleOptionBtnSelected
                      ]}
                      onPress={() => setEditingSupplier(prev => ({ ...prev, estado: 'ACTIVO' }))}
                    >
                      <Text style={[
                        styles.toggleOptionText,
                        editingSupplier.estado === 'ACTIVO' && styles.toggleOptionTextSelected
                      ]}>ACTIVO</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={[
                        styles.toggleOptionBtn,
                        editingSupplier.estado === 'INACTIVO' && styles.toggleOptionBtnSelected
                      ]}
                      onPress={() => setEditingSupplier(prev => ({ ...prev, estado: 'INACTIVO' }))}
                    >
                      <Text style={[
                        styles.toggleOptionText,
                        editingSupplier.estado === 'INACTIVO' && styles.toggleOptionTextSelected
                      ]}>INACTIVO</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : null}

              <TouchableOpacity 
                style={styles.saveBtn} 
                activeOpacity={0.8}
                onPress={handleSave}
              >
                <Save size={rem(15)} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.saveBtnText}>Guardar Registro</Text>
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
    fontSize: rem(22),
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
  inactiveDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: rem(10),
    height: rem(10),
    borderRadius: rem(5),
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  cardDetailsCol: {
    flex: 1,
  },
  cardHeaderLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: rem(2),
  },
  companyName: {
    fontSize: rem(14),
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: colors.text,
  },
  textInactive: {
    textDecorationLine: 'line-through',
    color: colors.textMuted,
  },
  nitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: rem(2),
  },
  nitText: {
    fontSize: rem(10),
    fontFamily: 'Inter-Regular',
    color: colors.textMuted,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: rem(2),
  },
  contactText: {
    fontSize: rem(10),
    fontFamily: 'Inter-Regular',
    color: colors.textMuted,
  },
  contactValue: {
    fontFamily: 'Inter-SemiBold',
    color: colors.text,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: rem(10),
    fontFamily: 'Inter-Regular',
    color: colors.textMuted,
  },
  cardRightCol: {
    alignItems: 'flex-end',
    marginLeft: rem(8),
    gap: rem(6),
  },
  balanceBadgeContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
    borderRadius: rem(6),
    paddingHorizontal: rem(8),
    paddingVertical: rem(4),
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.12)',
    alignItems: 'flex-end',
  },
  balanceLabel: {
    fontSize: rem(7),
    fontFamily: 'Inter-Bold',
    color: '#EF4444',
    textTransform: 'uppercase',
  },
  balanceValue: {
    fontSize: rem(10.5),
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: '#EF4444',
  },
  cleanStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rem(3),
    backgroundColor: colors.success + '06',
    borderRadius: rem(6),
    paddingHorizontal: rem(8),
    paddingVertical: rem(4),
    borderWidth: 1,
    borderColor: colors.success + '15',
  },
  cleanStatusText: {
    fontSize: rem(9),
    fontFamily: 'Inter-Bold',
    color: colors.success,
  },
  statusBadge: {
    borderRadius: rem(4),
    paddingHorizontal: rem(6),
    paddingVertical: rem(2),
  },
  statusBadgeText: {
    fontSize: rem(8),
    fontFamily: 'Inter-Bold',
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
    gap: rem(4),
    borderWidth: 1,
  },
  callChip: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.15)',
  },
  chatChip: {
    backgroundColor: 'rgba(37, 211, 102, 0.08)',
    borderColor: 'rgba(37, 211, 102, 0.15)',
  },
  callChipText: {
    fontSize: rem(10),
    fontFamily: 'Inter-Bold',
    color: '#10B981',
  },
  chatChipText: {
    fontSize: rem(10),
    fontFamily: 'Inter-Bold',
    color: '#25D366',
  },
  editIconBtn: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: mode === 'light' ? '#EAE5DA' : '#334155',
    borderRadius: rem(8),
    height: rem(32),
    justifyContent: 'center',
    paddingHorizontal: rem(12),
  },
  editBtnTextText: {
    fontSize: rem(10),
    fontFamily: 'Inter-Bold',
    color: colors.text,
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
  toggleOptionBtn: {
    flex: 1,
    height: rem(38),
    borderRadius: rem(10),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: mode === 'light' ? '#EAE5DA' : '#334155',
    backgroundColor: colors.background,
  },
  toggleOptionBtnSelected: {
    backgroundColor: colors.primary + '10',
    borderColor: colors.primary,
  },
  toggleOptionText: {
    fontSize: rem(11),
    fontFamily: 'Inter-Bold',
    color: colors.textMuted,
  },
  toggleOptionTextSelected: {
    color: colors.primary,
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
    marginTop: rem(16),
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: rem(13),
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
  },
});
