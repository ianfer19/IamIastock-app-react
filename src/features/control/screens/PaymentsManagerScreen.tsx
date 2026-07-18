import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView,
  TextInput,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Alert
} from 'react-native';
import Animated, { useAnimatedScrollHandler, useSharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';
import { 
  ChevronLeft, 
  Plus, 
  Search,
  CreditCard,
  Banknote,
  SmartphoneNfc,
  X,
  Save,
  Edit2,
  Trash2
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/core/theme/theme';
import { rem } from '@/core/utils/responsive';
import { PaymentMethodsService, PaymentMethod } from '@/infrastructure/services/paymentMethodsService';
import { Switch } from 'react-native';

export const PaymentsManagerScreen = ({ onBack }: { onBack: () => void }) => {
  const { colors, mode } = useTheme();
  const styles = getStyles(colors, mode);
  const insets = useSafeAreaInsets();
  
  const [payments, setPayments] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal State
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  // Form State
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('CARD');
  const [formCommissionPercent, setFormCommissionPercent] = useState('0');
  const [formCommissionFixed, setFormCommissionFixed] = useState('0');
  const [formNumber, setFormNumber] = useState('');
  const [formInstructions, setFormInstructions] = useState('');
  const [formRequiresVerification, setFormRequiresVerification] = useState(false);
  const [formIsActive, setFormIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await PaymentMethodsService.listPaymentMethods();
      setPayments(data);
    } catch (e) {
      console.error('Error loading payment methods', e);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPayments = payments.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const openModal = (item?: PaymentMethod) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsEditing(!!item);
    setSelectedId(item?.id || null);
    setFormName(item?.name || '');
    setFormType(item?.type || 'CARD');
    const p = item as any;
    setFormCommissionPercent(String(p?.commission_percent || 0));
    setFormCommissionFixed(String(p?.commission_fixed || 0));
    setFormNumber(p?.number || '');
    setFormInstructions(p?.instructions || '');
    setFormRequiresVerification(!!p?.requires_verification);
    setFormIsActive(p?.is_active !== false);
    setIsModalVisible(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSaving(true);
    
    try {
      const data: any = { 
        name: formName, 
        type: formType,
        commission_percent: parseFloat(formCommissionPercent) || 0,
        commission_fixed: parseFloat(formCommissionFixed) || 0,
        number: formNumber,
        instructions: formInstructions,
        requires_verification: formRequiresVerification,
        is_active: formIsActive
      };
      
      if (isEditing && selectedId) {
        await PaymentMethodsService.updatePaymentMethod(selectedId, data);
      } else {
        await PaymentMethodsService.createPaymentMethod(data);
      }
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsModalVisible(false);
      await loadData();
    } catch (e) {
      console.error('Error saving data', e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteItem = (id: string, name: string) => {
    Alert.alert(
      'Eliminar Método',
      `¿Estás seguro de que deseas eliminar "${name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: async () => {
            try {
              setIsSaving(true);
              await PaymentMethodsService.deletePaymentMethod(id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              if (isModalVisible && selectedId === id) setIsModalVisible(false);
              await loadData();
            } catch (e) {
              console.error('Error deleting', e);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert('Error', 'No se pudo eliminar.');
            } finally {
              setIsSaving(false);
            }
          }
        }
      ]
    );
  };

  // Custom Scrollbar Logic
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });
  
  const [contentHeight, setContentHeight] = useState(1);
  const [scrollViewHeight, setScrollViewHeight] = useState(1);
  
  const indicatorHeight = Math.max((scrollViewHeight / contentHeight) * scrollViewHeight, 30);
  const scrollbarVisible = contentHeight > scrollViewHeight;

  const indicatorStyle = useAnimatedStyle(() => {
    const maxScroll = contentHeight - scrollViewHeight;
    const maxIndicatorScroll = scrollViewHeight - indicatorHeight;
    const translateY = maxScroll > 0 ? (scrollY.value / maxScroll) * maxIndicatorScroll : 0;
    return {
      transform: [{ translateY }],
      height: indicatorHeight,
      opacity: scrollbarVisible ? 1 : 0
    };
  });

  const getIconForType = (type?: string) => {
    switch(type) {
      case 'CASH': return <Banknote size={rem(22)} color="#10B981" />;
      case 'TRANSFER': return <SmartphoneNfc size={rem(22)} color="#8B5CF6" />;
      default: return <CreditCard size={rem(22)} color="#3B82F6" />;
    }
  };

  return (
    <View style={styles.container}>
      {/* ── Premium Header ───────────────────────────────── */}
      <View style={[styles.header, { paddingTop: rem(12) }]}>
        <View style={styles.headerMain}>
          <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
            <ChevronLeft size={rem(24)} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={styles.pageTitle}>Métodos de Pago</Text>
            <Text style={styles.pageSubtitle}>{payments.length} métodos activos</Text>
          </View>
          
          <TouchableOpacity style={styles.addButton} activeOpacity={0.8} onPress={() => openModal()}>
            <Plus size={rem(20)} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* ── Search Bar ───────────────────────────────── */}
        <View style={styles.searchContainer}>
          <Search size={rem(18)} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar método..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* ── Content ──────────────────────────────────────── */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : filteredPayments.length === 0 ? (
          <View style={styles.emptyState}>
            <CreditCard size={rem(48)} color={colors.textMuted} style={{ marginBottom: rem(16), opacity: 0.5 }} />
            <Text style={styles.emptyTitle}>Sin Métodos de Pago</Text>
            <Text style={styles.emptyDesc}>
              {searchQuery ? `No se encontraron resultados.` : `Agrega opciones como Efectivo, Tarjeta o Transferencias.`}
            </Text>
            {!searchQuery && (
              <TouchableOpacity style={styles.emptyButton} onPress={() => openModal()}>
                <Text style={styles.emptyButtonText}>Crear Método</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.listContainer}>
            {filteredPayments.map((item, index) => (
              <MotiView
                key={item.id}
                from={{ opacity: 0, translateY: 10 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 300, delay: index * 40 }}
                style={styles.card}
              >
                <View style={styles.cardIconContainer}>
                  {getIconForType(item.type)}
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  <Text style={styles.cardSubtitle}>
                    {item.type === 'CASH' ? 'Efectivo' : item.type === 'TRANSFER' ? 'Transferencia' : 'Tarjeta'}
                  </Text>
                </View>
                
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: rem(4) }}>
                  <TouchableOpacity style={styles.editButton} onPress={() => openModal(item)}>
                    <Edit2 size={rem(18)} color={colors.textMuted} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteItem(item.id, item.name)}>
                    <Trash2 size={rem(18)} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </MotiView>
            ))}
          </View>
        )}
      </ScrollView>

      {/* ── Custom Bottom Sheet Modal ──────────────────────── */}
      <Modal visible={isModalVisible} transparent={true} animationType="fade" onRequestClose={() => setIsModalVisible(false)}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={() => { setIsModalVisible(false); Keyboard.dismiss(); }}>
              <View style={{ flex: 1, width: '100%' }} />
            </TouchableWithoutFeedback>
            
            <MotiView
              from={{ translateY: 300 }}
              animate={{ translateY: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 200 }}
              style={[styles.bottomSheet, { maxHeight: '85%', flexShrink: 1 }]}
            >
              <View style={styles.sheetHandle} />
              
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>
                  {isEditing ? 'Editar Método de Pago' : 'Nuevo Método de Pago'}
                </Text>
                <View style={{ flexDirection: 'row', gap: rem(16), alignItems: 'center' }}>
                  {isEditing && selectedId && (
                    <TouchableOpacity onPress={() => handleDeleteItem(selectedId, formName)}>
                      <Trash2 size={rem(22)} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => { setIsModalVisible(false); Keyboard.dismiss(); }}>
                    <X size={rem(24)} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={{ flexShrink: 1 }}>
                <Animated.ScrollView 
                  style={{ marginRight: -rem(12) }}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={styles.sheetContent}
                  onScroll={scrollHandler}
                  scrollEventThrottle={16}
                  onContentSizeChange={(_, h) => setContentHeight(h)}
                  onLayout={(e) => setScrollViewHeight(e.nativeEvent.layout.height)}
                >
                  <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Nombre del método</Text>
                  <TextInput 
                    style={styles.input} 
                    value={formName}
                    onChangeText={setFormName}
                    placeholder="Ej. Tarjeta de Crédito"
                    placeholderTextColor={colors.textMuted}
                    autoFocus={!isEditing}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Tipo de Pago</Text>
                  <View style={styles.typeSelectorRow}>
                    {[
                      { id: 'CARD', label: 'Tarjeta', icon: CreditCard },
                      { id: 'CASH', label: 'Efectivo', icon: Banknote },
                      { id: 'TRANSFER', label: 'Transfer.', icon: SmartphoneNfc }
                    ].map(t => (
                      <TouchableOpacity
                        key={t.id}
                        style={[styles.typeChip, formType === t.id && { backgroundColor: colors.primaryGlow, borderColor: colors.primary + '40' }]}
                        onPress={() => setFormType(t.id)}
                      >
                        <t.icon size={rem(16)} color={formType === t.id ? colors.primary : colors.textMuted} style={{ marginBottom: rem(4) }} />
                        <Text style={[styles.typeChipText, formType === t.id && { color: colors.primary, fontFamily: 'Inter-Bold' }]}>{t.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: rem(12) }}>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>Comisión (%)</Text>
                    <TextInput style={styles.input} value={formCommissionPercent} onChangeText={setFormCommissionPercent} keyboardType="numeric" placeholderTextColor={colors.textMuted} />
                  </View>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>Comisión (Fija)</Text>
                    <TextInput style={styles.input} value={formCommissionFixed} onChangeText={setFormCommissionFixed} keyboardType="numeric" placeholderTextColor={colors.textMuted} />
                  </View>
                </View>

                {(formType === 'TRANSFER' || formType === 'CARD') && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Número de Cuenta/Convenio</Text>
                    <TextInput style={styles.input} value={formNumber} onChangeText={setFormNumber} placeholder="Ej. 123456789" placeholderTextColor={colors.textMuted} />
                  </View>
                )}

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Instrucciones para el cliente</Text>
                  <TextInput 
                    style={[styles.input, { height: rem(80), textAlignVertical: 'top' }]} 
                    value={formInstructions} 
                    onChangeText={setFormInstructions} 
                    placeholder="Ej. Realiza el pago y muestra el soporte" 
                    placeholderTextColor={colors.textMuted}
                    multiline 
                  />
                </View>

                <View style={[styles.inputGroup, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: rem(8) }]}>
                  <Text style={styles.inputLabel}>Requiere Verificación (Soporte)</Text>
                  <Switch value={formRequiresVerification} onValueChange={setFormRequiresVerification} trackColor={{ false: colors.textMuted, true: colors.primary }} />
                </View>

                <View style={[styles.inputGroup, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                  <Text style={styles.inputLabel}>Método Activo</Text>
                  <Switch value={formIsActive} onValueChange={setFormIsActive} trackColor={{ false: colors.textMuted, true: colors.primary }} />
                </View>

                <TouchableOpacity 
                  style={[styles.primaryButton, (!formName.trim() || isSaving) && { opacity: 0.5 }]}
                  onPress={handleSave}
                  disabled={!formName.trim() || isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <>
                      <Save size={rem(18)} color="#FFF" />
                      <Text style={styles.primaryButtonText}>
                        {isEditing ? 'Guardar Cambios' : 'Crear Método'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </Animated.ScrollView>

                {/* Custom Persistent Scrollbar */}
                <View style={[styles.customScrollbarTrack, { position: 'absolute', right: -rem(4), top: 0, bottom: 0 }]}>
                  <Animated.View style={[styles.customScrollbarThumb, { backgroundColor: colors.primary }, indicatorStyle]} />
                </View>
              </View>
          </MotiView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  </View>
);
};

const getStyles = (colors: any, mode: string) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.surface,
    paddingHorizontal: rem(16),
    paddingBottom: rem(16),
    borderBottomWidth: 1,
    borderBottomColor: mode === 'light' ? '#EAE5DA' : '#334155',
  },
  headerMain: { flexDirection: 'row', alignItems: 'center', marginBottom: rem(16) },
  backButton: {
    width: rem(40), height: rem(40), borderRadius: rem(12),
    backgroundColor: mode === 'light' ? '#F8FAFC' : '#1E293B',
    justifyContent: 'center', alignItems: 'center',
  },
  titleContainer: { flex: 1, marginLeft: rem(12) },
  pageTitle: { fontSize: rem(18), fontFamily: 'Inter-Black', color: colors.text },
  pageSubtitle: { fontSize: rem(13), fontFamily: 'Inter-Medium', color: colors.textMuted },
  addButton: {
    width: rem(44), height: rem(44), borderRadius: rem(12),
    backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center',
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: mode === 'light' ? '#F8FAFC' : '#0F172A',
    borderRadius: rem(12), paddingHorizontal: rem(12), height: rem(44),
    borderWidth: 1, borderColor: mode === 'light' ? '#EAE5DA' : '#334155',
  },
  searchIcon: { marginRight: rem(8) },
  searchInput: { flex: 1, fontSize: rem(14), fontFamily: 'Inter-Medium', color: colors.text, height: '100%' },
  scrollContent: { padding: rem(16), paddingBottom: rem(40) },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: rem(100) },
  listContainer: { gap: rem(12) },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    padding: rem(16), borderRadius: rem(16), borderWidth: 1,
    borderColor: mode === 'light' ? '#EAE5DA' : '#334155',
  },
  cardIconContainer: {
    width: rem(48), height: rem(48), borderRadius: rem(12),
    backgroundColor: mode === 'light' ? '#F8FAFC' : '#1E293B',
    justifyContent: 'center', alignItems: 'center', marginRight: rem(16),
  },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: rem(16), fontFamily: 'Inter-Bold', color: colors.text, marginBottom: rem(4) },
  cardSubtitle: { fontSize: rem(12), fontFamily: 'Inter-Medium', color: colors.textMuted },
  editButton: { padding: rem(8) },
  deleteButton: { padding: rem(8) },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: rem(80) },
  emptyTitle: { fontSize: rem(18), fontFamily: 'Inter-Bold', color: colors.text, marginBottom: rem(8) },
  emptyDesc: { fontSize: rem(14), fontFamily: 'Inter-Regular', color: colors.textMuted, textAlign: 'center', marginBottom: rem(24) },
  emptyButton: { backgroundColor: colors.primary, paddingHorizontal: rem(24), paddingVertical: rem(12), borderRadius: rem(12) },
  emptyButtonText: { color: '#FFF', fontFamily: 'Inter-Bold', fontSize: rem(14) },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.4)', justifyContent: 'flex-end' },
  modalWrapper: { width: '100%' },
  bottomSheet: {
    backgroundColor: colors.surface, borderTopLeftRadius: rem(24), borderTopRightRadius: rem(24),
    padding: rem(20), paddingBottom: Platform.OS === 'ios' ? rem(40) : rem(24),
  },
  sheetHandle: {
    width: rem(40), height: rem(4), backgroundColor: mode === 'light' ? '#E2E8F0' : '#475569',
    borderRadius: rem(2), alignSelf: 'center', marginBottom: rem(16),
  },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: rem(20) },
  sheetTitle: { fontSize: rem(18), fontFamily: 'Inter-Black', color: colors.text },
  sheetContent: { gap: rem(20), paddingRight: rem(12), paddingBottom: rem(20) },
  customScrollbarTrack: { width: rem(4), backgroundColor: mode === 'light' ? '#EAE5DA' : '#334155', borderRadius: rem(2), marginLeft: rem(8) },
  customScrollbarThumb: { width: rem(4), borderRadius: rem(2) },
  inputGroup: { gap: rem(8) },
  inputLabel: { fontSize: rem(13), fontFamily: 'Inter-Bold', color: colors.text },
  input: {
    backgroundColor: mode === 'light' ? '#F8FAFC' : '#0F172A', borderWidth: 1,
    borderColor: mode === 'light' ? '#EAE5DA' : '#334155', borderRadius: rem(12),
    paddingHorizontal: rem(16), paddingVertical: rem(14), fontSize: rem(15),
    fontFamily: 'Inter-Medium', color: colors.text,
  },
  typeSelectorRow: { flexDirection: 'row', gap: rem(10) },
  typeChip: {
    flex: 1, alignItems: 'center', paddingVertical: rem(12), borderRadius: rem(10),
    backgroundColor: mode === 'light' ? '#F8FAFC' : '#0F172A',
    borderWidth: 1, borderColor: mode === 'light' ? '#EAE5DA' : '#334155',
  },
  typeChipText: { fontSize: rem(12), fontFamily: 'Inter-Medium', color: colors.textMuted },
  primaryButton: {
    flexDirection: 'row', backgroundColor: colors.primary, borderRadius: rem(12),
    paddingVertical: rem(14), alignItems: 'center', justifyContent: 'center', gap: rem(8), marginTop: rem(10),
  },
  primaryButtonText: { color: '#FFF', fontSize: rem(15), fontFamily: 'Inter-Bold' }
});
