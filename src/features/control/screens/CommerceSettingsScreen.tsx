import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView,
  Platform,
  TextInput,
  KeyboardAvoidingView
} from 'react-native';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';
import { 
  ChevronLeft, 
  Globe, 
  MapPin, 
  Clock, 
  Receipt,
  Save,
  RotateCcw
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/core/theme/theme';
import { rem } from '@/core/utils/responsive';
import { useAppSelector, useAppDispatch } from '@/core/store/store';
import { fetchTenantConfig, saveTenantTab } from '@/core/store/slices/tenantSlice';

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────
type TabType = 'localizacion' | 'ubicacion' | 'operaciones' | 'facturacion';

interface TabDefinition {
  id: TabType;
  label: string;
  icon: any;
}

const TABS: TabDefinition[] = [
  { id: 'localizacion', label: 'Localización', icon: Globe },
  { id: 'ubicacion', label: 'Ubicación', icon: MapPin },
  { id: 'operaciones', label: 'Operaciones', icon: Clock },
  { id: 'facturacion', label: 'Facturación', icon: Receipt },
];

export const CommerceSettingsScreen = ({ onBack }: { onBack: () => void }) => {
  const { colors, mode } = useTheme();
  const styles = getStyles(colors, mode);
  const insets = useSafeAreaInsets();
  
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { data: tenantData, loading, saving } = useAppSelector((state) => state.tenant);
  
  const [activeTab, setActiveTab] = useState<TabType>('localizacion');
  
  // Dummy form state for UI
  const [form, setForm] = useState({
    country_iso: 'CO',
    currency_iso: 'COP',
    timezone: 'America/Bogota',
    business_name: '',
    nit: '',
    email: '',
    address: '',
    city: 'Bogotá'
  });

  // Cargar datos al montar
  React.useEffect(() => {
    if (user?.tenant_id) {
      dispatch(fetchTenantConfig(user.tenant_id));
    }
  }, [user?.tenant_id, dispatch]);

  // Sincronizar store -> local form
  React.useEffect(() => {
    if (tenantData?.payload) {
      const p = tenantData.payload;
      setForm(prev => ({
        ...prev,
        country_iso: p.localization?.country_iso || prev.country_iso,
        currency_iso: p.localization?.currency_iso || prev.currency_iso,
        timezone: p.localization?.timezone || prev.timezone,
        business_name: p.billing_info?.business_name || prev.business_name,
        nit: p.billing_info?.nit || prev.nit,
        email: p.billing_info?.email || prev.email,
        address: p.location?.address_line_1 || prev.address,
        city: p.location?.city || prev.city,
      }));
    }
  }, [tenantData]);

  const handleSave = async () => {
    if (!user?.tenant_id) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Construir el payload según el tab activo
    let payload = {};
    if (activeTab === 'localizacion') {
      payload = {
        localization: {
          country_iso: form.country_iso,
          currency_iso: form.currency_iso,
          timezone: form.timezone,
        }
      };
    } else if (activeTab === 'ubicacion') {
      payload = {
        location: {
          address_line_1: form.address,
          city: form.city,
        }
      };
    } else if (activeTab === 'facturacion') {
      payload = {
        billing_info: {
          business_name: form.business_name,
          nit: form.nit,
          email: form.email,
        }
      };
    } else {
      // Operaciones (mock)
      payload = { operations: {} };
    }

    try {
      await dispatch(saveTenantTab({ 
        tenantId: user.tenant_id, 
        tabId: activeTab, 
        payload 
      })).unwrap();
      // Opcionalmente recargar los datos
      dispatch(fetchTenantConfig(user.tenant_id));
    } catch (e) {
      console.error(e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleTabChange = (tabId: TabType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tabId);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'localizacion':
        return (
          <MotiView 
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 300 }}
            style={styles.tabContent}
          >
            <Text style={styles.sectionTitle}>Configuración Regional</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>País (ISO)</Text>
              <TextInput 
                style={styles.input} 
                value={form.country_iso}
                onChangeText={(t) => setForm({...form, country_iso: t})}
                placeholder="Ej. CO"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Moneda Base</Text>
              <TextInput 
                style={styles.input} 
                value={form.currency_iso}
                onChangeText={(t) => setForm({...form, currency_iso: t})}
                placeholder="Ej. COP"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Zona Horaria</Text>
              <TextInput 
                style={styles.input} 
                value={form.timezone}
                onChangeText={(t) => setForm({...form, timezone: t})}
                placeholder="Ej. America/Bogota"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </MotiView>
        );
      
      case 'ubicacion':
        return (
          <MotiView 
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 300 }}
            style={styles.tabContent}
          >
            <Text style={styles.sectionTitle}>Dirección del Comercio</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Dirección Principal</Text>
              <TextInput 
                style={styles.input} 
                value={form.address}
                onChangeText={(t) => setForm({...form, address: t})}
                placeholder="Ej. Calle 123 #45-67"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Ciudad</Text>
              <TextInput 
                style={styles.input} 
                value={form.city}
                onChangeText={(t) => setForm({...form, city: t})}
                placeholder="Ej. Bogotá"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </MotiView>
        );

      case 'operaciones':
        return (
          <MotiView 
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 300 }}
            style={styles.tabContent}
          >
            <Text style={styles.sectionTitle}>Horarios y Operatividad</Text>
            <View style={styles.emptyState}>
              <Clock size={rem(32)} color={colors.textMuted} style={{ marginBottom: rem(12) }} />
              <Text style={styles.emptyTitle}>Gestor de Horarios</Text>
              <Text style={styles.emptyDesc}>
                Aquí podrás configurar los días laborables, horas de apertura/cierre y radios de cobertura para entregas (Delivery).
              </Text>
            </View>
          </MotiView>
        );

      case 'facturacion':
        return (
          <MotiView 
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 300 }}
            style={styles.tabContent}
          >
            <Text style={styles.sectionTitle}>Datos de Facturación</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Razón Social</Text>
              <TextInput 
                style={styles.input} 
                value={form.business_name}
                onChangeText={(t) => setForm({...form, business_name: t})}
                placeholder="Nombre legal de la empresa"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>NIT / RUT</Text>
              <TextInput 
                style={styles.input} 
                value={form.nit}
                onChangeText={(t) => setForm({...form, nit: t})}
                placeholder="Ej. 900.123.456"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Correo de Facturación</Text>
              <TextInput 
                style={styles.input} 
                value={form.email}
                onChangeText={(t) => setForm({...form, email: t})}
                placeholder="facturacion@empresa.com"
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </MotiView>
        );
    }
  };

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
            <Text style={styles.pageTitle}>Config. Global</Text>
            <Text style={styles.pageSubtitle}>Ajustes de Comercio</Text>
          </View>
          
          <TouchableOpacity 
            style={[styles.saveButton, saving && { opacity: 0.7 }]} 
            activeOpacity={0.8}
            onPress={handleSave}
            disabled={saving}
          >
            <Save size={rem(18)} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* ── Tabs Segment Control ───────────────────────────────── */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContainer}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.tabItem,
                  isActive && { backgroundColor: colors.primaryGlow, borderColor: colors.primary + '40' }
                ]}
                activeOpacity={0.7}
                onPress={() => handleTabChange(tab.id)}
              >
                <Icon size={rem(16)} color={isActive ? colors.primary : colors.textMuted} />
                <Text style={[
                  styles.tabLabel,
                  isActive ? { color: colors.primary, fontFamily: 'Inter-Bold' } : { color: colors.textMuted }
                ]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Content ──────────────────────────────────────── */}
      <KeyboardAvoidingView 
        style={styles.content} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView 
          showsVerticalScrollIndicator={true}
          indicatorStyle={mode === 'dark' ? 'white' : 'black'}
          contentContainerStyle={styles.scrollContent}
        >
          {renderTabContent()}
        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingBottom: rem(12),
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
  saveButton: {
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
  tabsContainer: {
    flexDirection: 'row',
    gap: rem(8),
    paddingBottom: rem(4),
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: rem(14),
    paddingVertical: rem(8),
    borderRadius: rem(10),
    backgroundColor: mode === 'light' ? '#F8FAFC' : '#0F172A',
    borderWidth: 1,
    borderColor: mode === 'light' ? '#EAE5DA' : '#334155',
    gap: rem(6),
  },
  tabLabel: {
    fontSize: rem(13),
    fontFamily: 'Inter-Medium',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: rem(20),
    paddingBottom: rem(40),
  },
  tabContent: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: rem(16),
    fontFamily: 'Inter-Black',
    color: colors.text,
    marginBottom: rem(20),
  },
  inputGroup: {
    marginBottom: rem(16),
  },
  inputLabel: {
    fontSize: rem(12),
    fontFamily: 'Inter-Bold',
    color: colors.text,
    marginBottom: rem(6),
  },
  input: {
    backgroundColor: mode === 'light' ? '#FFF' : '#0F172A',
    borderWidth: 1,
    borderColor: mode === 'light' ? '#EAE5DA' : '#334155',
    borderRadius: rem(10),
    paddingHorizontal: rem(14),
    paddingVertical: rem(12),
    fontSize: rem(14),
    fontFamily: 'Inter-Medium',
    color: colors.text,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: rem(40),
    backgroundColor: mode === 'light' ? '#F8FAFC' : '#0F172A',
    borderRadius: rem(16),
    borderWidth: 1,
    borderColor: mode === 'light' ? '#EAE5DA' : '#334155',
    paddingHorizontal: rem(20),
  },
  emptyTitle: {
    fontSize: rem(14),
    fontFamily: 'Inter-Bold',
    color: colors.text,
    marginBottom: rem(6),
  },
  emptyDesc: {
    fontSize: rem(12),
    fontFamily: 'Inter-Regular',
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: rem(18),
  }
});
