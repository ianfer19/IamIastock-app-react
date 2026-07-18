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
  LayoutGrid,
  Map,
  X,
  Save,
  Edit2,
  Trash2
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/core/theme/theme';
import { rem } from '@/core/utils/responsive';
import { TablesService, Table, Zone } from '@/infrastructure/services/tablesService';
import { Switch } from 'react-native';

type TabType = 'MESAS' | 'ZONAS';

export const TablesManagerScreen = ({ onBack }: { onBack: () => void }) => {
  const { colors, mode } = useTheme();
  const styles = getStyles(colors, mode);
  const insets = useSafeAreaInsets();
  
  const [activeTab, setActiveTab] = useState<TabType>('MESAS');
  
  const [tables, setTables] = useState<Table[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal State
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formName, setFormName] = useState('');
  const [formZoneId, setFormZoneId] = useState('');
  const [formCapacity, setFormCapacity] = useState('4');
  const [formShape, setFormShape] = useState('RECTANGLE');
  const [formType, setFormType] = useState('TABLE');
  const [formWidth, setFormWidth] = useState('100');
  const [formHeight, setFormHeight] = useState('100');
  const [formPassword, setFormPassword] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [fetchedTables, fetchedZones] = await Promise.all([
        TablesService.listTables(),
        TablesService.listZones()
      ]);
      setTables(fetchedTables);
      setZones(fetchedZones);
    } catch (e) {
      console.error('Error loading tables/zones', e);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTables = tables.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredZones = zones.filter(z => z.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleTabChange = (tab: TabType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
    setSearchQuery('');
  };

  const openModal = (item?: Table | Zone) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsEditing(!!item);
    setSelectedId(item?.id || null);
    
    if (item) {
      setFormName(item.name);
      if (activeTab === 'MESAS') {
        const t = item as any;
        setFormZoneId(t.zone_id || '');
        setFormCapacity(String(t.capacity || 4));
        setFormShape(t.shape || 'RECTANGLE');
        setFormType(t.type || 'TABLE');
        setFormWidth(String(t.width || 100));
        setFormHeight(String(t.height || 100));
        setFormPassword('');
      } else {
        const z = item as any;
        setFormIsActive(z.is_active !== false);
      }
    } else {
      setFormName('');
      if (activeTab === 'MESAS') {
        setFormZoneId(zones.length > 0 ? zones[0].id : '');
        setFormCapacity('4');
        setFormShape('RECTANGLE');
        setFormType('TABLE');
        setFormWidth('100');
        setFormHeight('100');
        setFormPassword('');
      } else {
        setFormIsActive(true);
      }
    }
    
    setIsModalVisible(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) return;
    if (activeTab === 'MESAS' && !formZoneId) {
      alert('Debes seleccionar o crear una zona primero.');
      return;
    }
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSaving(true);
    
    try {
      if (activeTab === 'ZONAS') {
        const zoneData: Partial<Zone> = { name: formName, is_active: formIsActive };
        if (isEditing && selectedId) {
          await TablesService.updateZone(selectedId, zoneData);
        } else {
          await TablesService.createZone(zoneData);
        }
      } else {
        const tableData: any = {
          name: formName,
          zone_id: formZoneId,
          capacity: parseInt(formCapacity, 10) || 4,
          shape: formShape,
          type: formType,
          width: parseInt(formWidth, 10) || 100,
          height: parseInt(formHeight, 10) || 100,
        };
        if (formPassword) tableData.password = formPassword;

        if (isEditing && selectedId) {
          await TablesService.updateTable(selectedId, tableData);
        } else {
          await TablesService.createTable(tableData);
        }
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
      `Eliminar ${activeTab === 'MESAS' ? 'Mesa' : 'Zona'}`,
      `¿Estás seguro de que deseas eliminar "${name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: async () => {
            try {
              setIsSaving(true);
              if (activeTab === 'MESAS') {
                await TablesService.deleteTable(id);
              } else {
                await TablesService.deleteZone(id);
              }
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

  return (
    <View style={styles.container}>
      {/* ── Premium Header ───────────────────────────────── */}
      <View style={[styles.header, { paddingTop: rem(12) }]}>
        <View style={styles.headerMain}>
          <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
            <ChevronLeft size={rem(24)} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={styles.pageTitle}>Mesas y Zonas</Text>
            <Text style={styles.pageSubtitle}>
              {tables.length} Mesas en {zones.length} Zonas
            </Text>
          </View>
          
          <TouchableOpacity style={styles.addButton} activeOpacity={0.8} onPress={() => openModal()}>
            <Plus size={rem(20)} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* ── Tabs Segment Control ───────────────────────────────── */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'MESAS' && { backgroundColor: colors.primaryGlow, borderColor: colors.primary + '40' }]}
            activeOpacity={0.7}
            onPress={() => handleTabChange('MESAS')}
          >
            <LayoutGrid size={rem(16)} color={activeTab === 'MESAS' ? colors.primary : colors.textMuted} />
            <Text style={[styles.tabLabel, activeTab === 'MESAS' ? { color: colors.primary, fontFamily: 'Inter-Bold' } : { color: colors.textMuted }]}>
              Mesas
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'ZONAS' && { backgroundColor: colors.primaryGlow, borderColor: colors.primary + '40' }]}
            activeOpacity={0.7}
            onPress={() => handleTabChange('ZONAS')}
          >
            <Map size={rem(16)} color={activeTab === 'ZONAS' ? colors.primary : colors.textMuted} />
            <Text style={[styles.tabLabel, activeTab === 'ZONAS' ? { color: colors.primary, fontFamily: 'Inter-Bold' } : { color: colors.textMuted }]}>
              Zonas
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Search Bar ───────────────────────────────── */}
        <View style={styles.searchContainer}>
          <Search size={rem(18)} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={`Buscar ${activeTab.toLowerCase()}...`}
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
        ) : (activeTab === 'MESAS' ? filteredTables : filteredZones).length === 0 ? (
          <View style={styles.emptyState}>
            {activeTab === 'MESAS' ? (
              <LayoutGrid size={rem(40)} color={colors.textMuted} style={{ marginBottom: rem(16) }} />
            ) : (
              <Map size={rem(40)} color={colors.textMuted} style={{ marginBottom: rem(16) }} />
            )}
            <Text style={styles.emptyTitle}>No hay {activeTab.toLowerCase()}</Text>
            <Text style={styles.emptyDesc}>
              {searchQuery ? `No se encontraron resultados.` : `Comienza creando tu primera ${activeTab === 'MESAS' ? 'mesa' : 'zona'}.`}
            </Text>
            {!searchQuery && (
              <TouchableOpacity style={styles.emptyButton} onPress={() => openModal()}>
                <Text style={styles.emptyButtonText}>Crear {activeTab === 'MESAS' ? 'Mesa' : 'Zona'}</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.listContainer}>
            {(activeTab === 'MESAS' ? filteredTables : filteredZones).map((item, index) => {
              const isTable = activeTab === 'MESAS';
              const zoneName = isTable ? (zones.find(z => z.id === (item as Table).zone_id)?.name || 'Sin zona') : '';
              
              return (
                <MotiView
                  key={item.id}
                  from={{ opacity: 0, translateY: 10 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{ type: 'timing', duration: 300, delay: index * 40 }}
                  style={styles.card}
                >
                  <View style={styles.cardIconContainer}>
                    {isTable ? (
                      <LayoutGrid size={rem(22)} color={colors.primary} />
                    ) : (
                      <Map size={rem(22)} color={colors.primary} />
                    )}
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle}>{item.name}</Text>
                    <Text style={styles.cardSubtitle}>
                      {isTable ? `Zona: ${zoneName} • Capacidad: ${(item as Table).capacity}` : `ID: ${item.id}`}
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
              );
            })}
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
                  {isEditing ? `Editar ${activeTab === 'MESAS' ? 'Mesa' : 'Zona'}` : `Nueva ${activeTab === 'MESAS' ? 'Mesa' : 'Zona'}`}
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
                      <Text style={styles.inputLabel}>Nombre</Text>
                      <TextInput 
                        style={styles.input} 
                        value={formName}
                        onChangeText={setFormName}
                        placeholder={activeTab === 'MESAS' ? 'Ej. Mesa 1' : 'Ej. Terraza'}
                        placeholderTextColor={colors.textMuted}
                        autoFocus
                      />
                    </View>

                    {activeTab === 'ZONAS' && (
                      <View style={[styles.inputGroup, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                        <Text style={styles.inputLabel}>Zona Activa</Text>
                        <Switch
                          value={formIsActive}
                          onValueChange={setFormIsActive}
                          trackColor={{ false: colors.textMuted, true: colors.primary }}
                        />
                      </View>
                    )}

                    {activeTab === 'MESAS' && (
                      <>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Zona Asignada</Text>
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: rem(8) }}>
                            {zones.map(z => (
                              <TouchableOpacity 
                                key={z.id}
                                style={[styles.zoneChip, formZoneId === z.id && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                                onPress={() => setFormZoneId(z.id)}
                              >
                                <Text style={[styles.zoneChipText, formZoneId === z.id && { color: '#FFF' }]}>{z.name}</Text>
                              </TouchableOpacity>
                            ))}
                            {zones.length === 0 && (
                              <Text style={{ color: colors.textMuted, fontSize: rem(13) }}>Debes crear una zona primero</Text>
                            )}
                          </ScrollView>
                        </View>
                        
                        <View style={{ flexDirection: 'row', gap: rem(12) }}>
                          <View style={[styles.inputGroup, { flex: 1 }]}>
                            <Text style={styles.inputLabel}>Capacidad</Text>
                            <TextInput 
                              style={styles.input} 
                              value={formCapacity}
                              onChangeText={setFormCapacity}
                              placeholder="4"
                              keyboardType="numeric"
                              placeholderTextColor={colors.textMuted}
                            />
                          </View>
                          <View style={[styles.inputGroup, { flex: 1 }]}>
                            <Text style={styles.inputLabel}>Tipo</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: rem(4) }}>
                                {['TABLE', 'DECORATION', 'STRUCTURE'].map(t => (
                                  <TouchableOpacity key={t} style={[styles.zoneChip, formType === t && { backgroundColor: colors.primary, borderColor: colors.primary }]} onPress={() => setFormType(t)}>
                                    <Text style={[styles.zoneChipText, formType === t && { color: '#FFF' }]}>{t === 'TABLE' ? 'Mesa' : t === 'DECORATION' ? 'Decoración' : 'Estruct.'}</Text>
                                  </TouchableOpacity>
                                ))}
                            </ScrollView>
                          </View>
                        </View>

                        <View style={{ flexDirection: 'row', gap: rem(12) }}>
                          <View style={[styles.inputGroup, { flex: 1 }]}>
                            <Text style={styles.inputLabel}>Ancho (cm)</Text>
                            <TextInput style={styles.input} value={formWidth} onChangeText={setFormWidth} keyboardType="numeric" placeholderTextColor={colors.textMuted} />
                          </View>
                          <View style={[styles.inputGroup, { flex: 1 }]}>
                            <Text style={styles.inputLabel}>Largo (cm)</Text>
                            <TextInput style={styles.input} value={formHeight} onChangeText={setFormHeight} keyboardType="numeric" placeholderTextColor={colors.textMuted} />
                          </View>
                        </View>

                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Forma</Text>
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: rem(4) }}>
                              {['RECTANGLE', 'SQUARE', 'CIRCLE', 'ROUND'].map(s => (
                                <TouchableOpacity key={s} style={[styles.zoneChip, formShape === s && { backgroundColor: colors.primary, borderColor: colors.primary }]} onPress={() => setFormShape(s)}>
                                  <Text style={[styles.zoneChipText, formShape === s && { color: '#FFF' }]}>{s === 'RECTANGLE' ? 'Rectángulo' : s === 'CIRCLE' ? 'Círculo' : s === 'SQUARE' ? 'Cuadrado' : 'Redondeada'}</Text>
                                </TouchableOpacity>
                              ))}
                          </ScrollView>
                        </View>

                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>PIN / Contraseña (Opcional)</Text>
                          <TextInput 
                            style={styles.input} 
                            value={formPassword}
                            onChangeText={setFormPassword}
                            placeholder="Dejar vacío para no proteger"
                            placeholderTextColor={colors.textMuted}
                            secureTextEntry
                          />
                        </View>
                      </>
                    )}

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
                            {isEditing ? 'Guardar Cambios' : 'Crear'}
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
  tabsContainer: {
    flexDirection: 'row', gap: rem(8), marginBottom: rem(12),
  },
  tabItem: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: rem(10), borderRadius: rem(10),
    backgroundColor: mode === 'light' ? '#F8FAFC' : '#0F172A',
    borderWidth: 1, borderColor: mode === 'light' ? '#EAE5DA' : '#334155', gap: rem(6),
  },
  tabLabel: { fontSize: rem(13), fontFamily: 'Inter-Medium' },
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
    backgroundColor: mode === 'light' ? '#F0FDF4' : '#064E3B',
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
  zoneChip: {
    paddingHorizontal: rem(14), paddingVertical: rem(8), borderRadius: rem(8),
    backgroundColor: mode === 'light' ? '#F1F5F9' : '#1E293B',
    borderWidth: 1, borderColor: mode === 'light' ? '#E2E8F0' : '#334155',
  },
  zoneChipText: { fontSize: rem(13), fontFamily: 'Inter-Medium', color: colors.text },
  primaryButton: {
    flexDirection: 'row', backgroundColor: colors.primary, borderRadius: rem(12),
    paddingVertical: rem(14), alignItems: 'center', justifyContent: 'center', gap: rem(8), marginTop: rem(10),
  },
  primaryButtonText: { color: '#FFF', fontSize: rem(15), fontFamily: 'Inter-Bold' }
});
