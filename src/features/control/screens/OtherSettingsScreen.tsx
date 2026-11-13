import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Save, Wallet, LayoutGrid } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { MotiView } from 'moti';
import { useAppDispatch, useAppSelector } from '@/core/store/store';
import { saveTenantTab } from '@/core/store/slices/tenantSlice';
import { rem } from '@/core/utils/responsive';

const colors = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
  primary: '#0047FF',
  text: '#0F172A',
  textMuted: '#64748B',
  border: '#E2E8F0',
  danger: '#EF4444',
  success: '#10B981'
};

export default function OtherSettingsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const { data: config, loading } = useAppSelector(state => state.tenant);
  const { user } = useAppSelector(state => state.auth);

  const [activeTab, setActiveTab] = useState<'CAJA' | 'AVANZADO'>('CAJA');
  const [closureMode, setClosureMode] = useState('MANUAL');
  const [includeExpenses, setIncludeExpenses] = useState(true);
  const [includeSupplierInvoices, setIncludeSupplierInvoices] = useState(true);
  const [includeGenericMovements, setIncludeGenericMovements] = useState(true);
  const [requirePhotoOnDiff, setRequirePhotoOnDiff] = useState(false);

  useEffect(() => {
    if (config?.payload?.cash_control) {
      const cc = config.payload.cash_control as any;
      setClosureMode(cc.closure_mode || 'MANUAL');
      setIncludeExpenses(cc.include_expenses ?? true);
      setIncludeSupplierInvoices(cc.include_supplier_invoices ?? true);
      setIncludeGenericMovements(cc.include_generic_movements ?? true);
      setRequirePhotoOnDiff(cc.require_photo_on_diff ?? false);
    }
  }, [config]);

  const handleSave = async () => {
    if (!user?.tenant_id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      if (activeTab === 'CAJA') {
        await dispatch(saveTenantTab({
          tenantId: user.tenant_id,
          tabId: 'cash_control',
          payload: {
            closure_mode: closureMode,
            include_expenses: includeExpenses,
            include_supplier_invoices: includeSupplierInvoices,
            include_generic_movements: includeGenericMovements,
            require_photo_on_diff: requirePhotoOnDiff
          }
        })).unwrap();
        Alert.alert('Éxito', 'Los ajustes de caja se han guardado correctamente.');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudieron guardar los ajustes.');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: 0 }]}>
      {/* ── Header ──────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitles}>
          <Text style={styles.headerTitle}>Otros Ajustes</Text>
          <Text style={styles.headerSubtitle}>Configuraciones adicionales y parámetros técnicos.</Text>
        </View>
      </View>

      {/* ── Tabs ──────────────────────────────────────── */}
      <View style={styles.tabsWrapper}>
        <View style={styles.pillSelector}>
          <TouchableOpacity style={[styles.tabBtn, activeTab === 'CAJA' && styles.tabActive]} onPress={() => setActiveTab('CAJA')}>
            <Wallet size={rem(14)} color={activeTab === 'CAJA' ? '#FFF' : colors.textMuted} />
            <Text style={[styles.tabText, activeTab === 'CAJA' && styles.tabTextActive]}>Control de Caja</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabBtn, activeTab === 'AVANZADO' && styles.tabActive]} onPress={() => setActiveTab('AVANZADO')}>
            <LayoutGrid size={rem(14)} color={activeTab === 'AVANZADO' ? '#FFF' : colors.textMuted} />
            <Text style={[styles.tabText, activeTab === 'AVANZADO' && styles.tabTextActive]}>Avanzado</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Content ──────────────────────────────────────── */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {activeTab === 'CAJA' && (
          <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} style={styles.card}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Modo de Cierre</Text>
            </View>
            <View style={styles.pickerContainer}>
              <Text style={styles.label}>SELECCIONA EL MODO DE CIERRE DE CAJA</Text>
              <View style={styles.radioGroup}>
                {['MANUAL', 'BLIND', 'FLASH', 'AUTOMATIC'].map(mode => (
                  <TouchableOpacity key={mode} style={[styles.radioItem, closureMode === mode && styles.radioItemActive]} onPress={() => setClosureMode(mode)}>
                    <View style={[styles.radioCircle, closureMode === mode && styles.radioCircleActive]} />
                    <Text style={[styles.radioText, closureMode === mode && styles.radioTextActive]}>
                      {mode === 'MANUAL' ? 'Manual (Estándar)' : mode === 'BLIND' ? 'Ciego (Audit/Blind)' : mode === 'FLASH' ? 'Flash (Express)' : 'Automático'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Reglas de Arqueo</Text>
            </View>
            <View style={styles.switchesContainer}>
              <View style={styles.switchRow}>
                <View style={styles.switchInfo}>
                  <Text style={styles.switchTitle}>Integrar Gastos en Cierre</Text>
                  <Text style={styles.switchDesc}>Resta automáticamente los gastos registrados del efectivo esperado.</Text>
                </View>
                <Switch value={includeExpenses} onValueChange={setIncludeExpenses} trackColor={{ true: colors.primary }} />
              </View>
              <View style={styles.switchRow}>
                <View style={styles.switchInfo}>
                  <Text style={styles.switchTitle}>Integrar Facturas en Cierre</Text>
                  <Text style={styles.switchDesc}>Incluye facturas de proveedores en el arqueo de caja.</Text>
                </View>
                <Switch value={includeSupplierInvoices} onValueChange={setIncludeSupplierInvoices} trackColor={{ true: colors.primary }} />
              </View>
              <View style={styles.switchRow}>
                <View style={styles.switchInfo}>
                  <Text style={styles.switchTitle}>Integrar Movimientos Manuales</Text>
                  <Text style={styles.switchDesc}>Sincroniza entradas/salidas manuales de dinero con el cierre.</Text>
                </View>
                <Switch value={includeGenericMovements} onValueChange={setIncludeGenericMovements} trackColor={{ true: colors.primary }} />
              </View>
              <View style={styles.switchRow}>
                <View style={styles.switchInfo}>
                  <Text style={styles.switchTitle}>Requerir Evidencia en Diferencias</Text>
                  <Text style={styles.switchDesc}>Exige subir una foto si el arqueo tiene descuadres.</Text>
                </View>
                <Switch value={requirePhotoOnDiff} onValueChange={setRequirePhotoOnDiff} trackColor={{ true: colors.primary }} />
              </View>
            </View>
          </MotiView>
        )}

        {activeTab === 'AVANZADO' && (
          <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} style={styles.card}>
             <View style={styles.placeholderContent}>
              <LayoutGrid size={48} color={colors.border} style={{ marginBottom: 16 }} />
              <Text style={styles.placeholderTitle}>Parámetros del Sistema</Text>
              <Text style={styles.placeholderDesc}>La configuración de caché y pre-carga de rutas está optimizada automáticamente por React Native.</Text>
             </View>
          </MotiView>
        )}
      </ScrollView>

      {/* ── Footer ──────────────────────────────────────── */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <TouchableOpacity style={[styles.saveBtn, loading && styles.saveBtnDisabled]} onPress={handleSave} disabled={loading || activeTab === 'AVANZADO'}>
          {loading ? <ActivityIndicator color="#FFF" /> : <Save size={rem(18)} color="#FFF" />}
          <Text style={styles.saveBtnText}>{loading ? 'Guardando...' : 'Guardar Cambios'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2, marginRight: 16 },
  headerTitles: { flex: 1 },
  headerTitle: { fontSize: rem(24), fontWeight: '900', color: colors.text, marginBottom: 4 },
  headerSubtitle: { fontSize: rem(14), color: colors.textMuted, fontWeight: '500' },
  tabsWrapper: { paddingHorizontal: 20, marginBottom: 20 },
  pillSelector: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 20, padding: 4, borderWidth: 1, borderColor: colors.border },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, borderRadius: 16 },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: rem(13), fontWeight: '700', color: colors.textMuted },
  tabTextActive: { color: '#FFF' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },
  card: { backgroundColor: colors.surface, borderRadius: 24, padding: 24, borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.03, shadowRadius: 20, elevation: 4 },
  sectionHeader: { marginBottom: 20 },
  sectionTitle: { fontSize: rem(18), fontWeight: '900', color: colors.text, textTransform: 'uppercase', letterSpacing: 1 },
  pickerContainer: { marginBottom: 20 },
  label: { fontSize: rem(12), fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  radioGroup: { gap: 12 },
  radioItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, backgroundColor: colors.background, borderRadius: 16, borderWidth: 1, borderColor: colors.border },
  radioItemActive: { borderColor: colors.primary, backgroundColor: 'rgba(0,71,255,0.05)' },
  radioCircle: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.textMuted },
  radioCircleActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  radioText: { fontSize: rem(15), fontWeight: '600', color: colors.text },
  radioTextActive: { color: colors.primary, fontWeight: '700' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 32 },
  switchesContainer: { gap: 16 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: colors.background, borderRadius: 16, borderWidth: 1, borderColor: colors.border },
  switchInfo: { flex: 1, paddingRight: 16 },
  switchTitle: { fontSize: rem(14), fontWeight: '700', color: colors.text, marginBottom: 4 },
  switchDesc: { fontSize: rem(12), color: colors.textMuted, lineHeight: 18 },
  placeholderContent: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  placeholderTitle: { fontSize: rem(18), fontWeight: '800', color: colors.text, marginBottom: 8 },
  placeholderDesc: { fontSize: rem(14), color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.surface, paddingHorizontal: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border, shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.05, shadowRadius: 20, elevation: 10 },
  saveBtn: { backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 16, borderRadius: 16 },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#FFF', fontSize: rem(16), fontWeight: '800' }
});
