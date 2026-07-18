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
import { ChevronLeft, Save, Bot, Sparkles } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { MotiView } from 'moti';
import { useAppDispatch, useAppSelector } from '@/core/store/store';
import { saveTenantTab } from '@/core/store/slices/tenantSlice';
import { TenantService } from '@/infrastructure/services/tenantService';
import { rem } from '@/core/utils/responsive';

const colors = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
  primary: '#0047FF',
  text: '#0F172A',
  textMuted: '#64748B',
  border: '#E2E8F0',
  success: '#10B981',
  purple: '#8B5CF6'
};

interface BotAgent {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  monthly_price: number;
}

export default function AiAgentsSettingsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(state => state.auth);

  const [bots, setBots] = useState<BotAgent[]>([]);
  const [allowedBots, setAllowedBots] = useState<string[]>([]);
  const [loadingBots, setLoadingBots] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadBots();
  }, []);

  const loadBots = async () => {
    try {
      setLoadingBots(true);
      const availableBots = await TenantService.listAvailableBots();
      setBots(Array.isArray(availableBots) ? availableBots : []);
      
      // Intentar leer bots permitidos desde el perfil del comercio
      if (user?.commerce?.allowed_bots) {
        setAllowedBots(user.commerce.allowed_bots);
      } else if (user?.tenant?.allowed_bots) {
        setAllowedBots(user.tenant.allowed_bots);
      }
    } catch (error) {
      console.error('Error fetching bots:', error);
    } finally {
      setLoadingBots(false);
    }
  };

  const toggleBot = (botId: string) => {
    Haptics.selectionAsync();
    setAllowedBots(prev => 
      prev.includes(botId) 
        ? prev.filter(id => id !== botId)
        : [...prev, botId]
    );
  };

  const handleSave = async () => {
    if (!user?.tenant_id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSaving(true);

    try {
      await dispatch(saveTenantTab({
        tenantId: user.tenant_id,
        tabId: 'bots_entitlements',
        payload: { allowed_bots: allowedBots }
      })).unwrap();
      Alert.alert('Éxito', 'La configuración de Agentes IA ha sido actualizada.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudieron guardar los ajustes.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: 0 }]}>
      {/* ── Header ──────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={rem(24)} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitles}>
          <Text style={styles.headerTitle}>Agentes IA</Text>
          <Text style={styles.headerSubtitle}>Gestión de asistentes autónomos</Text>
        </View>
      </View>

      {/* ── Content ──────────────────────────────────────── */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} style={styles.card}>
          <View style={styles.banner}>
            <View style={styles.bannerIcon}>
              <Sparkles size={rem(24)} color="#FFF" />
            </View>
            <View style={styles.bannerText}>
              <Text style={styles.bannerTitle}>IAStock Copilot</Text>
              <Text style={styles.bannerDesc}>Los agentes IA automatizan la atención al cliente, el cuadre de caja y los reportes de ventas.</Text>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Agentes Disponibles</Text>
          </View>

          {loadingBots ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 40 }} />
          ) : bots.length === 0 ? (
            <View style={styles.emptyState}>
              <Bot size={rem(48)} color={colors.border} style={{ marginBottom: 16 }} />
              <Text style={styles.emptyText}>No hay agentes de IA disponibles en este momento.</Text>
            </View>
          ) : (
            <View style={styles.botsList}>
              {bots.map((bot) => {
                const isActive = allowedBots.includes(bot.id);
                return (
                  <View key={bot.id} style={[styles.botItem, isActive && styles.botItemActive]}>
                    <View style={styles.botInfo}>
                      <Text style={styles.botName}>{bot.name}</Text>
                      <Text style={styles.botDesc}>{bot.description}</Text>
                      <View style={styles.capabilities}>
                        {bot.capabilities?.slice(0, 2).map((cap, idx) => (
                          <View key={idx} style={styles.capBadge}>
                            <Text style={styles.capText}>{cap}</Text>
                          </View>
                        ))}
                        {(bot.capabilities?.length || 0) > 2 && (
                          <Text style={styles.capMore}>+{(bot.capabilities?.length || 0) - 2}</Text>
                        )}
                      </View>
                    </View>
                    <View style={styles.botAction}>
                      <Switch 
                        value={isActive} 
                        onValueChange={() => toggleBot(bot.id)} 
                        trackColor={{ true: colors.purple, false: colors.border }} 
                      />
                      {bot.monthly_price > 0 && (
                        <Text style={styles.botPrice}>${bot.monthly_price}/mo</Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </MotiView>
      </ScrollView>

      {/* ── Footer ──────────────────────────────────────── */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <TouchableOpacity style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]} onPress={handleSave} disabled={isSaving}>
          {isSaving ? <ActivityIndicator color="#FFF" /> : <Save size={rem(18)} color="#FFF" />}
          <Text style={styles.saveBtnText}>{isSaving ? 'Guardando...' : 'Guardar Agentes'}</Text>
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
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },
  card: { backgroundColor: colors.surface, borderRadius: 24, padding: 24, borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.03, shadowRadius: 20, elevation: 4 },
  banner: { backgroundColor: colors.primary, borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'center', marginBottom: 32 },
  bannerIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  bannerText: { flex: 1 },
  bannerTitle: { fontSize: rem(18), fontWeight: '900', color: '#FFF', marginBottom: 4 },
  bannerDesc: { fontSize: rem(13), color: 'rgba(255,255,255,0.8)', lineHeight: 18 },
  sectionHeader: { marginBottom: 20 },
  sectionTitle: { fontSize: rem(18), fontWeight: '900', color: colors.text, textTransform: 'uppercase', letterSpacing: 1 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyText: { fontSize: rem(14), color: colors.textMuted, textAlign: 'center' },
  botsList: { gap: 16 },
  botItem: { flexDirection: 'row', backgroundColor: colors.background, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border },
  botItemActive: { borderColor: colors.purple, backgroundColor: '#F5F3FF' },
  botInfo: { flex: 1, paddingRight: 16 },
  botName: { fontSize: rem(16), fontWeight: '800', color: colors.text, marginBottom: 4 },
  botDesc: { fontSize: rem(13), color: colors.textMuted, lineHeight: 16, marginBottom: 12 },
  capabilities: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  capBadge: { backgroundColor: 'rgba(139, 92, 246, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  capText: { fontSize: rem(10), fontWeight: '700', color: colors.purple, textTransform: 'uppercase' },
  capMore: { fontSize: rem(11), fontWeight: '800', color: colors.textMuted },
  botAction: { alignItems: 'flex-end', justifyContent: 'center' },
  botPrice: { fontSize: rem(12), fontWeight: '800', color: colors.text, marginTop: 8 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.surface, paddingHorizontal: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border, shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.05, shadowRadius: 20, elevation: 10 },
  saveBtn: { backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 16, borderRadius: 16 },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#FFF', fontSize: rem(16), fontWeight: '800' }
});
