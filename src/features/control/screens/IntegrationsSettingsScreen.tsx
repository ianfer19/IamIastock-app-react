import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Switch
} from 'react-native';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';
import { 
  MessageCircle,
  Users,
  Camera,
  FileText,
  Bot,
  Save, 
  RotateCcw, 
  Eye, 
  EyeOff, 
  ChevronLeft 
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/core/theme/theme';
import { rem } from '@/core/utils/responsive';
import { useAppSelector, useAppDispatch } from '@/core/store/store';
import { saveTenantTab } from '@/core/store/slices/tenantSlice';

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────
interface Props {
  onBack: () => void;
}

type TabMode = 'WHATSAPP' | 'FACEBOOK' | 'INSTAGRAM' | 'FACTUS' | 'META';

export const IntegrationsSettingsScreen = ({ onBack }: Props) => {
  const { colors, mode } = useTheme();
  const styles = getStyles(colors, mode);
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  
  const { user } = useAppSelector((state) => state.auth);
  const { data: tenantData, saving } = useAppSelector((state) => state.tenant);

  const [activeTab, setActiveTab] = useState<TabMode>('WHATSAPP');
  const [hasChanges, setHasChanges] = useState(false);

  // Form States
  const [whatsapp, setWhatsapp] = useState({
    access_token: '',
    phone_id: '',
    business_account_id: ''
  });

  const [facebook, setFacebook] = useState({
    page_id: '',
    verify_token: '',
    access_token: '',
    app_secret: ''
  });

  const [instagram, setInstagram] = useState({
    instagram_account_id: '',
    page_id: '',
    verify_token: '',
    access_token: '',
    app_secret: ''
  });

  const [factus, setFactus] = useState({
    is_active: false,
    is_sandbox: true,
    client_id: '',
    client_secret: '',
    username: ''
  });

  const [metaCompliance, setMetaCompliance] = useState({
    system_prompt: '',
    ai_prefix_enabled: true,
    ai_prefix_text: '🤖 [IA]',
    restrict_medical_advice: true,
    professional_language_enforced: true
  });

  const [showToken, setShowToken] = useState(false);

  useEffect(() => {
    if (tenantData || user) {
      loadDataFromTenant();
      setHasChanges(false);
    }
  }, [tenantData, user]);

  const loadDataFromTenant = () => {
    // Los conectores de integraciones viven en el objeto commerce del usuario autenticado.
    const commerce = user?.commerce || (tenantData?.payload as any) || {};

    const whatsappData = commerce.whatsapp || {};
    const facebookData = commerce.facebook || {};
    const instagramData = commerce.instagram || {};
    const factusData = commerce.factus || {};
    const aiConfigData = commerce.ai_config || {};

    setWhatsapp({
      access_token: whatsappData.access_token || '********',
      phone_id: whatsappData.phone_id || '',
      business_account_id: whatsappData.business_account_id || ''
    });

    setFacebook({
      page_id: facebookData.page_id || '',
      verify_token: facebookData.verify_token || '',
      access_token: facebookData.access_token || '********',
      app_secret: facebookData.app_secret || '********'
    });

    setInstagram({
      instagram_account_id: instagramData.instagram_account_id || '',
      page_id: instagramData.page_id || '',
      verify_token: instagramData.verify_token || '',
      access_token: instagramData.access_token || '********',
      app_secret: instagramData.app_secret || '********'
    });

    setFactus({
      is_active: factusData.is_active || false,
      is_sandbox: factusData.is_sandbox ?? true,
      client_id: factusData.client_id || '',
      client_secret: factusData.client_secret || '********',
      username: factusData.username || ''
    });

    setMetaCompliance({
      system_prompt: aiConfigData.system_prompt || '',
      ai_prefix_enabled: aiConfigData.ai_prefix_enabled ?? true,
      ai_prefix_text: aiConfigData.ai_prefix_text || '🤖 [IA]',
      restrict_medical_advice: aiConfigData.restrict_medical_advice ?? true,
      professional_language_enforced: aiConfigData.professional_language_enforced ?? true
    });
  };

  const stripMasked = (obj: any) => {
    const result = { ...obj };
    Object.keys(result).forEach(key => {
      if (result[key] === '********') delete result[key];
    });
    return result;
  };

  const handleChange = (section: string, field: string, value: any) => {
    switch (section) {
      case 'whatsapp': setWhatsapp(prev => ({ ...prev, [field]: value })); break;
      case 'facebook': setFacebook(prev => ({ ...prev, [field]: value })); break;
      case 'instagram': setInstagram(prev => ({ ...prev, [field]: value })); break;
      case 'factus': setFactus(prev => ({ ...prev, [field]: value })); break;
      case 'meta': setMetaCompliance(prev => ({ ...prev, [field]: value })); break;
    }
    setHasChanges(true);
  };

  const handleDiscard = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    loadDataFromTenant();
    setHasChanges(false);
  };

  const handleSave = async () => {
    if (!user?.tenant_id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      if (activeTab === 'FACTUS') {
        await dispatch(saveTenantTab({
          tenantId: user.tenant_id,
          tabId: 'factus_api',
          payload: stripMasked(factus)
        })).unwrap();
      } else {
        await dispatch(saveTenantTab({
          tenantId: user.tenant_id,
          tabId: 'integraciones',
          payload: {
            whatsapp: stripMasked(whatsapp),
            facebook: stripMasked(facebook),
            instagram: stripMasked(instagram),
            ai_config: metaCompliance
          }
        })).unwrap();
      }
      
      Alert.alert('Éxito', 'Integración actualizada correctamente');
      setHasChanges(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Error al guardar los cambios');
    }
  };

  // ─────────────────────────────────────────────────────────
  // Tabs Renderers
  // ─────────────────────────────────────────────────────────
  const renderWhatsapp = () => (
    <MotiView style={styles.tabContent} from={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Text style={styles.sectionTitle}>WhatsApp Cloud API</Text>
      <View style={styles.formGroup}>
        <Text style={styles.label}>System Access Token</Text>
        <View style={styles.passwordWrapper}>
          <TextInput
            style={styles.inputPassword}
            secureTextEntry={!showToken}
            value={whatsapp.access_token}
            onFocus={() => whatsapp.access_token === '********' && handleChange('whatsapp', 'access_token', '')}
            onChangeText={(val) => handleChange('whatsapp', 'access_token', val)}
            placeholderTextColor={colors.textMuted}
          />
          <TouchableOpacity onPress={() => setShowToken(!showToken)} style={styles.eyeBtn}>
            {showToken ? <EyeOff size={rem(18)} color={colors.textMuted}/> : <Eye size={rem(18)} color={colors.textMuted}/>}
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.formGroup}>
        <Text style={styles.label}>Phone Number ID</Text>
        <TextInput
          style={styles.input}
          value={whatsapp.phone_id}
          onChangeText={(val) => handleChange('whatsapp', 'phone_id', val)}
          placeholderTextColor={colors.textMuted}
        />
      </View>
      <View style={styles.formGroup}>
        <Text style={styles.label}>Business Account ID</Text>
        <TextInput
          style={styles.input}
          value={whatsapp.business_account_id}
          onChangeText={(val) => handleChange('whatsapp', 'business_account_id', val)}
          placeholderTextColor={colors.textMuted}
        />
      </View>
    </MotiView>
  );

  const renderFacebook = () => (
    <MotiView style={styles.tabContent} from={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Text style={styles.sectionTitle}>Facebook Messenger API</Text>
      <View style={styles.formGroup}>
        <Text style={styles.label}>Page ID</Text>
        <TextInput
          style={styles.input}
          value={facebook.page_id}
          onChangeText={(val) => handleChange('facebook', 'page_id', val)}
          placeholderTextColor={colors.textMuted}
        />
      </View>
      <View style={styles.formGroup}>
        <Text style={styles.label}>Verify Token</Text>
        <TextInput
          style={styles.input}
          value={facebook.verify_token}
          onChangeText={(val) => handleChange('facebook', 'verify_token', val)}
          placeholderTextColor={colors.textMuted}
        />
      </View>
      <View style={styles.formGroup}>
        <Text style={styles.label}>Page Access Token</Text>
        <TextInput
          style={styles.input}
          value={facebook.access_token}
          onFocus={() => facebook.access_token === '********' && handleChange('facebook', 'access_token', '')}
          onChangeText={(val) => handleChange('facebook', 'access_token', val)}
          placeholderTextColor={colors.textMuted}
        />
      </View>
    </MotiView>
  );

  const renderInstagram = () => (
    <MotiView style={styles.tabContent} from={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Text style={styles.sectionTitle}>Instagram Direct API</Text>
      <View style={styles.formGroup}>
        <Text style={styles.label}>Instagram Account ID</Text>
        <TextInput
          style={styles.input}
          value={instagram.instagram_account_id}
          onChangeText={(val) => handleChange('instagram', 'instagram_account_id', val)}
          placeholderTextColor={colors.textMuted}
        />
      </View>
      <View style={styles.formGroup}>
        <Text style={styles.label}>Linked Facebook Page ID</Text>
        <TextInput
          style={styles.input}
          value={instagram.page_id}
          onChangeText={(val) => handleChange('instagram', 'page_id', val)}
          placeholderTextColor={colors.textMuted}
        />
      </View>
      <View style={styles.formGroup}>
        <Text style={styles.label}>Access Token</Text>
        <TextInput
          style={styles.input}
          value={instagram.access_token}
          onFocus={() => instagram.access_token === '********' && handleChange('instagram', 'access_token', '')}
          onChangeText={(val) => handleChange('instagram', 'access_token', val)}
          placeholderTextColor={colors.textMuted}
        />
      </View>
    </MotiView>
  );

  const renderFactus = () => (
    <MotiView style={styles.tabContent} from={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <View style={styles.rowBetween}>
        <View>
          <Text style={styles.sectionTitle}>Facturación Pro (Factus)</Text>
          <Text style={styles.descText}>Emite facturas electrónicas oficiales ante la DIAN.</Text>
        </View>
        <Switch
          value={factus.is_active}
          onValueChange={(val) => handleChange('factus', 'is_active', val)}
          trackColor={{ false: '#E2E8F0', true: '#0047FF' }}
        />
      </View>
      
      <View style={[styles.formGroup, !factus.is_active && { opacity: 0.5 }]}>
        <Text style={styles.label}>Client ID</Text>
        <TextInput
          style={styles.input}
          value={factus.client_id}
          onChangeText={(val) => handleChange('factus', 'client_id', val)}
          editable={factus.is_active}
        />
      </View>
      <View style={[styles.formGroup, !factus.is_active && { opacity: 0.5 }]}>
        <Text style={styles.label}>Client Secret</Text>
        <TextInput
          style={styles.input}
          value={factus.client_secret}
          onFocus={() => factus.client_secret === '********' && handleChange('factus', 'client_secret', '')}
          onChangeText={(val) => handleChange('factus', 'client_secret', val)}
          editable={factus.is_active}
        />
      </View>
    </MotiView>
  );

  const renderMeta = () => (
    <MotiView style={styles.tabContent} from={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Text style={styles.sectionTitle}>Meta Compliance (IA)</Text>
      
      <View style={styles.formGroup}>
        <Text style={styles.label}>System Prompt (Personalidad)</Text>
        <TextInput
          style={[styles.input, { height: rem(100), textAlignVertical: 'top' }]}
          multiline
          value={metaCompliance.system_prompt}
          onChangeText={(val) => handleChange('meta', 'system_prompt', val)}
        />
      </View>

      <View style={styles.switchCard}>
        <View style={styles.switchInfo}>
          <Text style={styles.switchTitle}>Prefijo de IA Activado</Text>
        </View>
        <Switch
          value={metaCompliance.ai_prefix_enabled}
          onValueChange={(val) => handleChange('meta', 'ai_prefix_enabled', val)}
          trackColor={{ false: '#E2E8F0', true: '#0047FF' }}
        />
      </View>
    </MotiView>
  );

  return (
    <View style={styles.container}>
      {/* ── Header ────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: rem(12) }]}>
        <View style={styles.headerMain}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <ChevronLeft size={rem(24)} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={styles.pageTitle}>Integraciones</Text>
            <Text style={styles.pageSubtitle}>Conexiones Externas</Text>
          </View>
        </View>

        {/* Horizontal Scroll Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          <TouchableOpacity style={[styles.tabBtn, activeTab === 'WHATSAPP' && styles.tabActive]} onPress={() => setActiveTab('WHATSAPP')}>
            <MessageCircle size={rem(14)} color={activeTab === 'WHATSAPP' ? '#FFF' : colors.textMuted} />
            <Text style={[styles.tabText, activeTab === 'WHATSAPP' && styles.tabTextActive]}>WhatsApp</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabBtn, activeTab === 'FACEBOOK' && styles.tabActive]} onPress={() => setActiveTab('FACEBOOK')}>
            <Users size={rem(14)} color={activeTab === 'FACEBOOK' ? '#FFF' : colors.textMuted} />
            <Text style={[styles.tabText, activeTab === 'FACEBOOK' && styles.tabTextActive]}>Facebook</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabBtn, activeTab === 'INSTAGRAM' && styles.tabActive]} onPress={() => setActiveTab('INSTAGRAM')}>
            <Camera size={rem(14)} color={activeTab === 'INSTAGRAM' ? '#FFF' : colors.textMuted} />
            <Text style={[styles.tabText, activeTab === 'INSTAGRAM' && styles.tabTextActive]}>Instagram</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabBtn, activeTab === 'FACTUS' && styles.tabActive]} onPress={() => setActiveTab('FACTUS')}>
            <FileText size={rem(14)} color={activeTab === 'FACTUS' ? '#FFF' : colors.textMuted} />
            <Text style={[styles.tabText, activeTab === 'FACTUS' && styles.tabTextActive]}>Facturación</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabBtn, activeTab === 'META' && styles.tabActive]} onPress={() => setActiveTab('META')}>
            <Bot size={rem(14)} color={activeTab === 'META' ? '#FFF' : colors.textMuted} />
            <Text style={[styles.tabText, activeTab === 'META' && styles.tabTextActive]}>IA</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* ── Content ──────────────────────────────────────── */}
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          {activeTab === 'WHATSAPP' && renderWhatsapp()}
          {activeTab === 'FACEBOOK' && renderFacebook()}
          {activeTab === 'INSTAGRAM' && renderInstagram()}
          {activeTab === 'FACTUS' && renderFactus()}
          {activeTab === 'META' && renderMeta()}
        </View>
        <View style={{ height: rem(100) }} />
      </ScrollView>

      {/* ── Action Bar ───────────────────────────────────── */}
      {hasChanges && (
        <MotiView
          from={{ opacity: 0, translateY: 100 }}
          animate={{ opacity: 1, translateY: 0 }}
          exit={{ opacity: 0, translateY: 100 }}
          style={[styles.actionBar, { bottom: insets.bottom + rem(20) }]}
        >
          <View style={styles.actionInfo}>
            <View style={styles.actionIconBox}>
              <Save size={rem(18)} color="#0047FF" />
            </View>
            <View>
              <Text style={styles.actionTitle}>Cambios pendientes</Text>
              <Text style={styles.actionDesc}>Guarda para aplicar integración.</Text>
            </View>
          </View>
          <View style={styles.actionBtns}>
            <TouchableOpacity style={styles.discardBtn} onPress={handleDiscard} disabled={saving}>
              <RotateCcw size={rem(16)} color="#94A3B8" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.7 }]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color="#FFF" /> : <><Save size={rem(16)} color="#FFF" /><Text style={styles.saveBtnText}>Guardar</Text></>}
            </TouchableOpacity>
          </View>
        </MotiView>
      )}
    </View>
  );
};

// ─────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────
const getStyles = (colors: any, mode: string) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { backgroundColor: colors.surface, paddingHorizontal: rem(16), paddingBottom: rem(12), borderBottomWidth: 1, borderBottomColor: mode === 'light' ? '#EAE5DA' : '#334155', zIndex: 10 },
  headerMain: { flexDirection: 'row', alignItems: 'center', marginBottom: rem(12) },
  backButton: { width: rem(40), height: rem(40), borderRadius: rem(12), backgroundColor: mode === 'light' ? '#F8FAFC' : '#1E293B', justifyContent: 'center', alignItems: 'center' },
  titleContainer: { flex: 1, marginLeft: rem(12) },
  pageTitle: { fontSize: rem(20), fontFamily: 'Inter-Black', color: colors.text },
  pageSubtitle: { fontSize: rem(12), fontFamily: 'Inter-Bold', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
  tabsScroll: { gap: rem(8), paddingBottom: rem(4) },
  tabBtn: { flexDirection: 'row', alignItems: 'center', gap: rem(6), paddingHorizontal: rem(12), paddingVertical: rem(8), borderRadius: rem(20), backgroundColor: mode === 'light' ? '#F1F5F9' : '#0F172A' },
  tabActive: { backgroundColor: '#0047FF' },
  tabText: { fontFamily: 'Inter-Bold', fontSize: rem(12), color: colors.textMuted },
  tabTextActive: { color: '#FFF' },
  scrollContent: { padding: rem(16) },
  card: { backgroundColor: colors.surface, borderRadius: rem(20), padding: rem(20), borderWidth: 1, borderColor: mode === 'light' ? '#EAE5DA' : '#334155', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: mode === 'light' ? 0.05 : 0.2, shadowRadius: 12, elevation: 2 },
  tabContent: { gap: rem(16) },
  sectionTitle: { fontSize: rem(16), fontFamily: 'Inter-Black', color: colors.text, marginBottom: rem(4) },
  descText: { fontSize: rem(12), fontFamily: 'Inter-Medium', color: colors.textMuted },
  formGroup: { gap: rem(8) },
  label: { fontFamily: 'Inter-Bold', fontSize: rem(12), color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginLeft: rem(4) },
  input: { backgroundColor: mode === 'light' ? '#F8FAFC' : '#0F172A', borderWidth: 1, borderColor: mode === 'light' ? '#E2E8F0' : '#334155', borderRadius: rem(12), paddingHorizontal: rem(16), height: rem(48), fontFamily: 'Inter-Medium', fontSize: rem(14), color: colors.text },
  passwordWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: mode === 'light' ? '#F8FAFC' : '#0F172A', borderWidth: 1, borderColor: mode === 'light' ? '#E2E8F0' : '#334155', borderRadius: rem(12), height: rem(48) },
  inputPassword: { flex: 1, paddingHorizontal: rem(16), fontFamily: 'Inter-Medium', fontSize: rem(14), color: colors.text, height: '100%' },
  eyeBtn: { paddingHorizontal: rem(16), height: '100%', justifyContent: 'center' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: rem(12) },
  switchCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: rem(12), backgroundColor: mode === 'light' ? '#F8FAFC' : '#0F172A', borderRadius: rem(12), borderWidth: 1, borderColor: mode === 'light' ? '#E2E8F0' : '#334155' },
  switchInfo: { flex: 1 },
  switchTitle: { fontFamily: 'Inter-Bold', fontSize: rem(13), color: colors.text },
  actionBar: { position: 'absolute', left: rem(16), right: rem(16), backgroundColor: '#1E293B', borderRadius: rem(16), padding: rem(16), flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
  actionInfo: { flexDirection: 'row', alignItems: 'center', gap: rem(12), flex: 1 },
  actionIconBox: { width: rem(36), height: rem(36), borderRadius: rem(18), backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  actionTitle: { fontFamily: 'Inter-Bold', fontSize: rem(13), color: '#FFF' },
  actionDesc: { fontFamily: 'Inter-Medium', fontSize: rem(11), color: '#94A3B8' },
  actionBtns: { flexDirection: 'row', alignItems: 'center', gap: rem(8) },
  discardBtn: { width: rem(40), height: rem(40), justifyContent: 'center', alignItems: 'center', borderRadius: rem(10), backgroundColor: 'rgba(255,255,255,0.05)' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', gap: rem(6), backgroundColor: '#0047FF', paddingHorizontal: rem(16), height: rem(40), borderRadius: rem(10) },
  saveBtnText: { fontFamily: 'Inter-Bold', fontSize: rem(13), color: '#FFF' }
});
