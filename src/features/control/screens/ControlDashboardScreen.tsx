import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView,
  TextInput
} from 'react-native';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';
import { 
  Settings, 
  Wallet, 
  BarChart3, 
  Users, 
  Contact, 
  CreditCard, 
  Store, 
  LayoutDashboard, 
  CircleDollarSign, 
  History, 
  BookOpen, 
  Receipt, 
  Printer, 
  MessageCircle,
  Search,
  ChevronRight
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/core/theme/theme';
import { rem } from '@/core/utils/responsive';
import { useAppSelector } from '@/core/store/store';
import { SettingsHubScreen } from './SettingsHubScreen';
import { CashiersManagerScreen } from './CashiersManagerScreen';
import { TablesManagerScreen } from './TablesManagerScreen';
import { PaymentsManagerScreen } from './PaymentsManagerScreen';

// ─────────────────────────────────────────────────────────
// Types & Data
// ─────────────────────────────────────────────────────────
type DashboardCategory = 'Operaciones' | 'Gestión' | 'Configuración';

interface DashboardSection {
  id: string;
  title: string;
  description: string;
  icon: any;
  color: string; // fallback color name for styling
  route: string;
}

interface CategorizedSections {
  category: DashboardCategory;
  sections: DashboardSection[];
}

const ALL_SECTIONS: DashboardSection[] = [
  // Operaciones
  { id: 'expenses', title: 'Gastos', description: 'Gestión de gastos operativos y fijos.', icon: Wallet, color: '#EF4444', route: '/app/control/gastos' },
  { id: 'reports', title: 'Reportes', description: 'Informes detallados de ventas y desempeño.', icon: BarChart3, color: '#A855F7', route: '/app/control/reportes' },
  { id: 'cash-registers', title: 'Cajas', description: 'Apertura, cierre y arqueos de caja.', icon: CircleDollarSign, color: '#14B8A6', route: '/app/control/cajas' },
  { id: 'history', title: 'Historial Caja', description: 'Auditoría de aperturas y cierres.', icon: History, color: '#6366F1', route: '/app/control/historial-caja' },
  { id: 'ordenes', title: 'Ordenes', description: 'Control y gestión de pedidos históricos.', icon: Receipt, color: '#A855F7', route: '/app/control/ordenes' },
  
  // Gestión
  { id: 'employees', title: 'Empleados', description: 'Gestión de personal, roles y permisos.', icon: Users, color: '#6366F1', route: '/app/control/empleados' },
  { id: 'customers', title: 'Clientes (CRM)', description: 'Gestión de fidelidad y base de datos de clientes.', icon: Contact, color: '#3B82F6', route: '/app/control/clientes' },
  { id: 'cartera', title: 'Cartera (Créditos)', description: 'Gestión de cuentas por cobrar y pagar.', icon: CreditCard, color: '#14B8A6', route: '/app/control/cartera' },
  
  // Configuración
  { id: 'settings', title: 'Configuración Global', description: 'Ajustes maestros, integraciones y agentes IA.', icon: Settings, color: '#3B82F6', route: '/app/control/settings' },
  { id: 'payments', title: 'Métodos de Pago', description: 'Configuración de pasarelas y métodos.', icon: CreditCard, color: '#10B981', route: '/app/control/pagos' },
  { id: 'shops', title: 'Comercios', description: 'Gestión de sucursales y puntos de venta.', icon: Store, color: '#EC4899', route: '/app/control/comercios' },
  { id: 'tables', title: 'Mesas', description: 'Configuración de zonas y mesas del local.', icon: LayoutDashboard, color: '#F97316', route: '/app/control/mesas' },
  { id: 'manual', title: 'Manual de Usuario', description: 'Explora características y capacidades.', icon: BookOpen, color: '#10B981', route: '/features' },
  { id: 'facturas', title: 'Facturación Electrónica', description: 'Gestión de FES, Notas Crédito y consecutivos DIAN.', icon: Receipt, color: '#10B981', route: '/app/control/facturas' },
  { id: 'printers', title: 'Impresoras', description: 'Mapeo de hardware físico y agentes locales.', icon: Printer, color: '#3B82F6', route: '/app/control/impresoras' },
  { id: 'notifications', title: 'WhatsApp', description: 'Plantillas y notificaciones automáticas.', icon: MessageCircle, color: '#10B981', route: '/app/control/notifications' }
];

// ─────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────
export const ControlDashboardScreen = () => {
  const { colors, mode } = useTheme();
  const styles = getStyles(colors, mode);
  const insets = useSafeAreaInsets();
  
  const { user } = useAppSelector((state) => state.auth);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeScreen, setActiveScreen] = useState<'DASHBOARD' | 'SETTINGS' | 'CASH_REGISTERS' | 'TABLES_MANAGER' | 'PAYMENTS_MANAGER'>('DASHBOARD');

  // Derived state: User role mapping
  const userRoleDisplay = () => {
    const role = user?.role || '';
    const roleMap: Record<string, string> = {
      'admin': 'Administrador',
      'waiter': 'Mesero',
      'cashier': 'Cajero',
      'kitchen': 'Cocina',
      'owner': 'Dueño'
    };
    return roleMap[role.toLowerCase()] || role || 'Usuario';
  };

  // Filter and Group Sections
  const filteredSections = ALL_SECTIONS.filter(s => 
    s.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groups: { [key in DashboardCategory]: DashboardSection[] } = {
    'Operaciones': [],
    'Gestión': [],
    'Configuración': []
  };

  filteredSections.forEach(section => {
    if (['expenses', 'reports', 'cash-registers', 'history', 'ordenes'].includes(section.id)) {
      groups['Operaciones'].push(section);
    } else if (['employees', 'customers', 'cartera'].includes(section.id)) {
      groups['Gestión'].push(section);
    } else {
      groups['Configuración'].push(section);
    }
  });

  const categories: CategorizedSections[] = ([
    { category: 'Operaciones' as DashboardCategory, sections: groups['Operaciones'] },
    { category: 'Gestión' as DashboardCategory, sections: groups['Gestión'] },
    { category: 'Configuración' as DashboardCategory, sections: groups['Configuración'] }
  ]).filter(c => c.sections.length > 0);

  const handleNavigate = (route: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (route === '/app/control/settings' || route === '/app/control/comercios') {
      setActiveScreen('SETTINGS');
    } else if (route === '/app/control/cajas') {
      setActiveScreen('CASH_REGISTERS');
    } else if (route === '/app/control/mesas') {
      setActiveScreen('TABLES_MANAGER');
    } else if (route === '/app/control/pagos') {
      setActiveScreen('PAYMENTS_MANAGER');
    } else {
      console.log('Navigate to:', route);
    }
  };

  if (activeScreen === 'SETTINGS') {
    return <SettingsHubScreen onBack={() => setActiveScreen('DASHBOARD')} />;
  }
  if (activeScreen === 'CASH_REGISTERS') {
    return <CashiersManagerScreen onBack={() => setActiveScreen('DASHBOARD')} />;
  }
  if (activeScreen === 'TABLES_MANAGER') {
    return <TablesManagerScreen onBack={() => setActiveScreen('DASHBOARD')} />;
  }
  if (activeScreen === 'PAYMENTS_MANAGER') {
    return <PaymentsManagerScreen onBack={() => setActiveScreen('DASHBOARD')} />;
  }

  return (
    <View style={styles.container}>
      {/* ── Premium Animated Header ───────────────────────────────── */}
      <View style={[styles.header, { paddingTop: rem(12) }]}>
        <View style={styles.headerMain}>
          <View style={styles.titleRow}>
            <View style={styles.headerIconBox}>
              <MotiView
                from={{ rotate: '0deg' }}
                animate={{ rotate: '360deg' }}
                transition={{
                  type: 'timing',
                  duration: 6000,
                  loop: true,
                  repeatReverse: false
                }}
              >
                <Settings size={rem(18)} color={colors.primary} />
              </MotiView>
            </View>
            <Text style={styles.pageTitle}>Panel de Control</Text>
          </View>
          <View style={styles.userBadge}>
            <Text style={styles.roleText}>{userRoleDisplay()}</Text>
          </View>
        </View>

        <View style={styles.searchBox}>
          <Search size={rem(16)} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar..."
            placeholderTextColor={colors.textMuted}
            value={searchTerm}
            onChangeText={setSearchTerm}
            autoCapitalize="none"
          />
        </View>
      </View>

      {/* ── Content ──────────────────────────────────────── */}
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        indicatorStyle={mode === 'dark' ? 'white' : 'black'}
      >
        {categories.length > 0 ? (
          categories.map((cat, index) => (
            <View
              key={cat.category}
              style={styles.categoryGroup}
            >
              <View style={styles.categoryHeader}>
                <Text style={styles.categoryTitle}>{cat.category}</Text>
              </View>

              <View style={styles.bentoGrid}>
                {cat.sections.map((section) => {
                  const IconComponent = section.icon;
                  return (
                    <TouchableOpacity
                      key={section.id}
                      style={[styles.bentoItem, { borderColor: mode === 'light' ? '#EAE5DA' : '#334155' }]}
                      activeOpacity={0.8}
                      onPress={() => handleNavigate(section.route)}
                    >
                      <View style={styles.bentoHeaderRow}>
                        <View style={[styles.iconWrapper, { backgroundColor: `${section.color}15` }]}>
                          <IconComponent size={rem(18)} color={section.color} />
                        </View>
                        <Text style={styles.bentoTitle}>{section.title}</Text>
                      </View>
                      <Text style={styles.bentoDesc} numberOfLines={2}>
                        {section.description}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Search size={rem(40)} color={colors.slate[300]} />
            <Text style={styles.emptyText}>No se encontraron secciones para "{searchTerm}"</Text>
          </View>
        )}
        {/* Bottom padding to prevent cutoff */}
        <View style={{ height: rem(40) }} />
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
    paddingBottom: rem(10),
    borderBottomWidth: 1,
    borderBottomColor: mode === 'light' ? '#EAE5DA' : '#334155',
  },
  headerMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: rem(12),
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rem(8),
  },
  headerIconBox: {
    width: rem(32),
    height: rem(32),
    borderRadius: rem(10),
    backgroundColor: colors.primaryGlow || 'rgba(13, 58, 148, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageTitle: {
    fontSize: rem(20),
    fontFamily: 'Inter-Black',
    color: colors.text,
  },
  userBadge: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: rem(8),
    paddingVertical: rem(4),
    borderRadius: rem(8),
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  roleText: {
    color: colors.primary,
    fontFamily: 'Inter-Bold',
    fontSize: rem(11),
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: mode === 'light' ? '#F8FAFC' : '#0F172A',
    borderRadius: rem(10),
    paddingHorizontal: rem(10),
    height: rem(36),
    borderWidth: 1,
    borderColor: mode === 'light' ? '#EAE5DA' : '#334155',
  },
  searchInput: {
    flex: 1,
    marginLeft: rem(8),
    fontFamily: 'Inter-Medium',
    fontSize: rem(13),
    color: colors.text,
    paddingVertical: 0,
  },
  scrollContent: {
    padding: rem(16),
  },
  categoryGroup: {
    marginBottom: rem(24),
  },
  categoryHeader: {
    marginBottom: rem(12),
  },
  categoryTitle: {
    fontSize: rem(14),
    fontFamily: 'Inter-Bold',
    color: colors.primary,
    letterSpacing: -0.3,
  },
  bentoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rem(10),
  },
  bentoItem: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: rem(16),
    borderWidth: 1,
    padding: rem(14),
    minHeight: rem(110),
    justifyContent: 'flex-start',
    shadowColor: '#1A365D',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  bentoHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: rem(8),
    gap: rem(8),
  },
  iconWrapper: {
    width: rem(32),
    height: rem(32),
    borderRadius: rem(8),
    justifyContent: 'center',
    alignItems: 'center',
  },
  bentoTitle: {
    flex: 1,
    fontSize: rem(13.5),
    fontFamily: 'Inter-Black',
    fontWeight: '900',
    color: colors.text,
  },
  bentoDesc: {
    fontSize: rem(10),
    fontFamily: 'Inter-Medium',
    color: colors.textMuted,
    lineHeight: rem(14),
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: rem(60),
  },
  emptyText: {
    marginTop: rem(16),
    fontSize: rem(14),
    fontFamily: 'Inter-Medium',
    color: colors.textMuted,
    textAlign: 'center',
  },
});
