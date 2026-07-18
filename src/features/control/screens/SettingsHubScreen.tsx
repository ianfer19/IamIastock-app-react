import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView,
  Platform
} from 'react-native';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';
import { 
  Building2, 
  Palette, 
  Puzzle, 
  Bot, 
  LayoutGrid, 
  User,
  ChevronLeft,
  ChevronRight
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/core/theme/theme';
import { rem } from '@/core/utils/responsive';
import { CommerceSettingsScreen } from './CommerceSettingsScreen';
import { UserSettingsScreen } from './UserSettingsScreen';
import { IntegrationsSettingsScreen } from './IntegrationsSettingsScreen';
import OtherSettingsScreen from './OtherSettingsScreen';
import AiAgentsSettingsScreen from './AiAgentsSettingsScreen';

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────
export type SettingsRoute = 'HOME' | 'COMMERCE' | 'POS_UI' | 'INTEGRATIONS' | 'AGENTS' | 'OTHERS' | 'USER';

interface SettingsItem {
  id: SettingsRoute;
  title: string;
  description: string;
  icon: any;
  color: string;
}

const SETTINGS_MENU: SettingsItem[] = [
  { id: 'COMMERCE', title: 'Comercio', description: 'General, Legal, Visual', icon: Building2, color: '#3B82F6' },
  { id: 'POS_UI', title: 'Diseño POS', description: 'Colores y Funcionalidad', icon: Palette, color: '#EC4899' },
  { id: 'INTEGRATIONS', title: 'Integraciones', description: 'WhatsApp, Factus, Meta', icon: Puzzle, color: '#10B981' },
  { id: 'AGENTS', title: 'Agentes IA', description: 'Orquestador, Bots, Logs', icon: Bot, color: '#8B5CF6' },
  { id: 'OTHERS', title: 'Otros', description: 'Caja y Avanzado', icon: LayoutGrid, color: '#F59E0B' },
  { id: 'USER', title: 'Mi Cuenta', description: 'Perfil y Seguridad', icon: User, color: '#64748B' },
];

interface Props {
  onBack: () => void;
}

export const SettingsHubScreen = ({ onBack }: Props) => {
  const { colors, mode } = useTheme();
  const styles = getStyles(colors, mode);
  const insets = useSafeAreaInsets();
  
  const [activeRoute, setActiveRoute] = useState<SettingsRoute>('HOME');

  const handlePress = (route: SettingsRoute) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveRoute(route);
  };

  if (activeRoute === 'COMMERCE') {
    return <CommerceSettingsScreen onBack={() => setActiveRoute('HOME')} />;
  }

  if (activeRoute === 'USER') {
    return <UserSettingsScreen onBack={() => setActiveRoute('HOME')} />;
  }

  if (activeRoute === 'INTEGRATIONS') {
    return <IntegrationsSettingsScreen onBack={() => setActiveRoute('HOME')} />;
  }

  if (activeRoute === 'AGENTS') {
    return <AiAgentsSettingsScreen navigation={{ goBack: () => setActiveRoute('HOME') }} />;
  }

  if (activeRoute === 'OTHERS') {
    return <OtherSettingsScreen navigation={{ goBack: () => setActiveRoute('HOME') }} />;
  }

  // TODO: Add other routes as they are built
  // if (activeRoute === 'POS_UI') return <PosUiSettingsScreen onBack={() => setActiveRoute('HOME')} />;

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
            <Text style={styles.pageTitle}>Ajustes</Text>
            <Text style={styles.pageSubtitle}>Configuración Central</Text>
          </View>
        </View>
      </View>

      {/* ── Content ──────────────────────────────────────── */}
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        indicatorStyle={mode === 'dark' ? 'white' : 'black'}
      >
        <View style={styles.menuGrid}>
          {SETTINGS_MENU.map((item, index) => {
            const Icon = item.icon;
            return (
              <MotiView
                key={item.id}
                from={{ opacity: 0, translateY: 15 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 300, delay: index * 50 }}
              >
                <TouchableOpacity
                  style={styles.menuCard}
                  activeOpacity={0.7}
                  onPress={() => handlePress(item.id)}
                >
                  <View style={styles.menuContent}>
                    <View style={[styles.iconBox, { backgroundColor: item.color + '15' }]}>
                      <Icon size={rem(20)} color={item.color} />
                    </View>
                    <View style={styles.menuTextInfo}>
                      <Text style={styles.menuTitle}>{item.title}</Text>
                      <Text style={styles.menuDesc}>{item.description}</Text>
                    </View>
                  </View>
                  <ChevronRight size={rem(20)} color={colors.textMuted} />
                </TouchableOpacity>
              </MotiView>
            );
          })}
        </View>
        
        <View style={styles.versionContainer}>
          <View style={styles.versionBadge}>
            <Text style={styles.versionText}>V4.1 PREMIUM</Text>
          </View>
        </View>
      </ScrollView>
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
    fontSize: rem(20),
    fontFamily: 'Inter-Black',
    color: colors.text,
  },
  pageSubtitle: {
    fontSize: rem(12),
    fontFamily: 'Inter-Bold',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  scrollContent: {
    padding: rem(20),
    paddingBottom: rem(40),
  },
  menuGrid: {
    gap: rem(12),
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: rem(16),
    borderRadius: rem(16),
    borderWidth: 1,
    borderColor: mode === 'light' ? '#EAE5DA' : '#334155',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: mode === 'light' ? 0.05 : 0.2,
        shadowRadius: 12,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  menuContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rem(16),
    flex: 1,
  },
  iconBox: {
    width: rem(44),
    height: rem(44),
    borderRadius: rem(12),
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuTextInfo: {
    flex: 1,
  },
  menuTitle: {
    fontSize: rem(15),
    fontFamily: 'Inter-Black',
    color: colors.text,
    marginBottom: rem(4),
  },
  menuDesc: {
    fontSize: rem(12),
    fontFamily: 'Inter-Medium',
    color: colors.textMuted,
  },
  versionContainer: {
    alignItems: 'center',
    marginTop: rem(40),
  },
  versionBadge: {
    backgroundColor: '#0047FF',
    paddingHorizontal: rem(12),
    paddingVertical: rem(6),
    borderRadius: rem(20),
  },
  versionText: {
    color: '#FFF',
    fontSize: rem(10),
    fontFamily: 'Inter-Black',
    letterSpacing: 1,
  }
});
