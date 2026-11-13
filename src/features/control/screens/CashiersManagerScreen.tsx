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
import { MotiView, AnimatePresence } from 'moti';
import * as Haptics from 'expo-haptics';
import { 
  ChevronLeft, 
  Plus, 
  Search,
  MonitorSmartphone,
  MoreVertical,
  X,
  Save,
  Trash2,
  Edit2
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/core/theme/theme';
import { rem } from '@/core/utils/responsive';
import { CashRegisterService, CashRegister } from '@/infrastructure/services/cashRegisterService';
import { PremiumButton } from '@/shared/components/PremiumButton';

export const CashiersManagerScreen = ({ onBack }: { onBack: () => void }) => {
  const { colors, mode } = useTheme();
  const styles = getStyles(colors, mode);
  const insets = useSafeAreaInsets();
  
  const [cashiers, setCashiers] = useState<CashRegister[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal State
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadCashiers();
  }, []);

  const loadCashiers = async () => {
    setIsLoading(true);
    try {
      const data = await CashRegisterService.listCashRegisters();
      setCashiers(data);
    } catch (e) {
      console.error('Error loading cashiers', e);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCashiers = cashiers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenCreate = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsEditing(false);
    setSelectedId(null);
    setFormName('');
    setFormLocation('');
    setFormPassword('');
    setIsModalVisible(true);
  };

  const handleOpenEdit = (cashier: CashRegister) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsEditing(true);
    setSelectedId(cashier.id);
    setFormName(cashier.name);
    setFormLocation(cashier.location || '');
    setFormPassword('');
    setIsModalVisible(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSaving(true);
    
    try {
      const payload: any = { name: formName, location: formLocation };
      if (formPassword) payload.password = formPassword;

      if (isEditing && selectedId) {
        await CashRegisterService.updateCashRegister(selectedId, payload);
      } else {
        await CashRegisterService.createCashRegister(payload);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsModalVisible(false);
      await loadCashiers();
    } catch (e) {
      console.error('Error saving cashier', e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteItem = (id: string, name: string) => {
    Alert.alert(
      'Eliminar Caja',
      `¿Estás seguro de que deseas eliminar "${name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: async () => {
            try {
              setIsSaving(true);
              await CashRegisterService.deleteCashRegister(id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              if (isModalVisible && selectedId === id) setIsModalVisible(false);
              await loadCashiers();
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

  return (
    <View style={styles.container}>
      {/* ── Premium Header ───────────────────────────────── */}
      <View style={[styles.header, { paddingTop: rem(12) }]}>
        <View style={styles.headerMain}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={onBack}
            activeOpacity={0.7}
          >
            <ChevronLeft size={rem(24)} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={styles.pageTitle}>Cajas de Cobro</Text>
            <Text style={styles.pageSubtitle}>{cashiers.length} registradas</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.addButton} 
            activeOpacity={0.8}
            onPress={handleOpenCreate}
          >
            <Plus size={rem(20)} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* ── Search Bar ───────────────────────────────── */}
        <View style={styles.searchContainer}>
          <Search size={rem(18)} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar caja..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* ── Content ──────────────────────────────────────── */}
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : filteredCashiers.length === 0 ? (
          <View style={styles.emptyState}>
            <MonitorSmartphone size={rem(40)} color={colors.textMuted} style={{ marginBottom: rem(16) }} />
            <Text style={styles.emptyTitle}>No hay cajas</Text>
            <Text style={styles.emptyDesc}>
              {searchQuery ? 'No se encontraron cajas con ese nombre.' : 'Comienza creando tu primera caja de cobro.'}
            </Text>
            {!searchQuery && (
              <TouchableOpacity style={styles.emptyButton} onPress={handleOpenCreate}>
                <Text style={styles.emptyButtonText}>Crear Caja</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.listContainer}>
            {filteredCashiers.map((cashier, index) => (
              <MotiView
                key={cashier.id}
                from={{ opacity: 0, translateY: 10 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 300, delay: index * 50 }}
                style={styles.card}
              >
                <View style={styles.cardIconContainer}>
                  <MonitorSmartphone size={rem(22)} color={colors.primary} />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle}>{cashier.name}</Text>
                  <Text style={styles.cardSubtitle}>ID: {cashier.id}</Text>
                </View>
                
                <TouchableOpacity 
                  style={styles.editButton}
                  onPress={() => handleOpenEdit(cashier)}
                >
                  <Edit2 size={rem(18)} color={colors.textMuted} />
                </TouchableOpacity>
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
                  {isEditing ? 'Editar Caja' : 'Nueva Caja'}
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
                      <Text style={styles.inputLabel}>Nombre de la Caja</Text>
                      <TextInput 
                        style={styles.input} 
                        value={formName}
                        onChangeText={setFormName}
                        placeholder="Ej. Caja Principal"
                        placeholderTextColor={colors.textMuted}
                        autoFocus
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Ubicación</Text>
                      <TextInput 
                        style={styles.input} 
                        value={formLocation}
                        onChangeText={setFormLocation}
                        placeholder="Ej. Entrada Principal"
                        placeholderTextColor={colors.textMuted}
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>PIN / Contraseña (Opcional)</Text>
                      <TextInput 
                        style={styles.input} 
                        value={formPassword}
                        onChangeText={setFormPassword}
                        placeholder="Dejar vacío para mantener el actual"
                        placeholderTextColor={colors.textMuted}
                        secureTextEntry
                      />
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
                            {isEditing ? 'Guardar Cambios' : 'Crear Caja'}
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

// ─────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────
const getStyles = (colors: any, mode: string) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.surface,
    paddingHorizontal: rem(16),
    paddingBottom: rem(16),
    borderBottomWidth: 1,
    borderBottomColor: mode === 'light' ? '#EAE5DA' : '#334155',
  },
  headerMain: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: rem(16),
  },
  backButton: {
    width: rem(40),
    height: rem(40),
    borderRadius: rem(12),
    backgroundColor: mode === 'light' ? '#F8FAFC' : '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
    marginLeft: rem(12),
  },
  pageTitle: {
    fontSize: rem(18),
    fontFamily: 'Inter-Black',
    color: colors.text,
  },
  pageSubtitle: {
    fontSize: rem(13),
    fontFamily: 'Inter-Medium',
    color: colors.textMuted,
  },
  addButton: {
    width: rem(44),
    height: rem(44),
    borderRadius: rem(12),
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: mode === 'light' ? '#F8FAFC' : '#0F172A',
    borderRadius: rem(12),
    paddingHorizontal: rem(12),
    height: rem(44),
    borderWidth: 1,
    borderColor: mode === 'light' ? '#EAE5DA' : '#334155',
  },
  searchIcon: {
    marginRight: rem(8),
  },
  searchInput: {
    flex: 1,
    fontSize: rem(14),
    fontFamily: 'Inter-Medium',
    color: colors.text,
    height: '100%',
  },
  scrollContent: {
    padding: rem(16),
    paddingBottom: rem(40),
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: rem(100),
  },
  listContainer: {
    gap: rem(12),
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: rem(16),
    borderRadius: rem(16),
    borderWidth: 1,
    borderColor: mode === 'light' ? '#EAE5DA' : '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: mode === 'light' ? 0.05 : 0.2,
    shadowRadius: 8,
    elevation: 2,
  },
  cardIconContainer: {
    width: rem(48),
    height: rem(48),
    borderRadius: rem(12),
    backgroundColor: mode === 'light' ? '#F0FDF4' : '#064E3B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: rem(16),
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: rem(16),
    fontFamily: 'Inter-Bold',
    color: colors.text,
    marginBottom: rem(4),
  },
  cardSubtitle: { fontSize: rem(12), fontFamily: 'Inter-Medium', color: colors.textMuted },
  editButton: { padding: rem(8) },
  deleteButton: { padding: rem(8) },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: rem(80),
  },
  emptyTitle: {
    fontSize: rem(18),
    fontFamily: 'Inter-Bold',
    color: colors.text,
    marginBottom: rem(8),
  },
  emptyDesc: {
    fontSize: rem(14),
    fontFamily: 'Inter-Regular',
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: rem(24),
  },
  emptyButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: rem(24),
    paddingVertical: rem(12),
    borderRadius: rem(12),
  },
  emptyButtonText: {
    color: '#FFF',
    fontFamily: 'Inter-Bold',
    fontSize: rem(14),
  },
  // Modal / Bottom Sheet Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalWrapper: {
    width: '100%',
  },
  bottomSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: rem(24),
    borderTopRightRadius: rem(24),
    padding: rem(20),
    paddingBottom: Platform.OS === 'ios' ? rem(40) : rem(24),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  sheetHandle: {
    width: rem(40),
    height: rem(4),
    backgroundColor: mode === 'light' ? '#E2E8F0' : '#475569',
    borderRadius: rem(2),
    alignSelf: 'center',
    marginBottom: rem(16),
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: rem(20),
  },
  sheetTitle: { fontSize: rem(18), fontFamily: 'Inter-Black', color: colors.text },
  sheetContent: { gap: rem(20), paddingRight: rem(12), paddingBottom: rem(20) },
  customScrollbarTrack: { width: rem(4), backgroundColor: mode === 'light' ? '#EAE5DA' : '#334155', borderRadius: rem(2), marginLeft: rem(8) },
  customScrollbarThumb: { width: rem(4), borderRadius: rem(2) },
  inputGroup: {
    gap: rem(8),
  },
  inputLabel: {
    fontSize: rem(13),
    fontFamily: 'Inter-Bold',
    color: colors.text,
  },
  input: {
    backgroundColor: mode === 'light' ? '#F8FAFC' : '#0F172A',
    borderWidth: 1,
    borderColor: mode === 'light' ? '#EAE5DA' : '#334155',
    borderRadius: rem(12),
    paddingHorizontal: rem(16),
    paddingVertical: rem(14),
    fontSize: rem(15),
    fontFamily: 'Inter-Medium',
    color: colors.text,
  },
  primaryButton: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    borderRadius: rem(12),
    paddingVertical: rem(14),
    alignItems: 'center',
    justifyContent: 'center',
    gap: rem(8),
    marginTop: rem(10),
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: rem(15),
    fontFamily: 'Inter-Bold',
  }
});
