import React, { useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  Platform,
  Image,
  PanResponder,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import {
  X,
  LineChart,
  Box,
  ShoppingCart,
  Calculator,
  UtensilsCrossed,
  Layers,
  FileText,
  Power,
  Cpu,
  Shield,
  Smartphone,
  ChevronRight,
  Headphones,
  Clock,
  Store,
  Check,
  ChevronDown,
  Coins,
  Building2,
  Cog,
  Home,
} from 'lucide-react-native';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';
import { rem } from '@/core/utils/responsive';
import { useTheme } from '@/core/theme/theme';
import { SecureStorage } from '@/core/storage/secureStorage';
import { authEventEmitter } from '@/core/api/client';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector, useAppDispatch } from '@/core/store/store';
import { Env } from '@/core/config/env';
import { setSelectedRegister } from '@/core/store/slices/posSlice';
import { CashRegisterService } from '@/infrastructure/services/cashRegisterService';
import { AuthService } from '@/infrastructure/services/authService';
import { updateTenantId, updateUserProfile } from '@/core/store/slices/authSlice';
import { InventoryService } from '@/infrastructure/services/inventoryService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SIDEBAR_WIDTH = SCREEN_WIDTH * 0.8;
const SWIPE_THRESHOLD = 70;

interface SidebarProps {
  isVisible: boolean;
  onClose: () => void;
}

// ─────────────────────────────────────────────────────────
// Nav Item Config
// ─────────────────────────────────────────────────────────
interface NavItem {
  icon: any;
  label: string;
  id: string;
  enabled: boolean;
  tab?: string;
}

const NAV_ITEMS: NavItem[] = [
  { icon: Home,            label: 'Inicio',        id: 'INICIO',        enabled: true,  tab: 'HOME' },
  { icon: Box,             label: 'Inventario',    id: 'INVENTARIO',    enabled: true,  tab: 'INVENTARIO' },
  { icon: ShoppingCart,    label: 'Ventas',        id: 'VENTAS',        enabled: true,  tab: 'POS'  },
  { icon: Calculator,      label: 'Caja',          id: 'CAJA',          enabled: true,  tab: 'CAJA' },
  { icon: LineChart,       label: 'Control',       id: 'CONTROL',       enabled: true,  tab: 'CONTROL' },
  { icon: UtensilsCrossed, label: 'Cocina',        id: 'COCINA',        enabled: false },
  { icon: Layers,          label: 'Ecosistema',    id: 'ECOSISTEMA',    enabled: false },
  { icon: FileText,        label: 'Contabilidad',  id: 'CONTABILIDAD',  enabled: false },
  { icon: Headphones,      label: 'Soporte',       id: 'SOPORTE',       enabled: false },
];

// ─────────────────────────────────────────────────────────
// Menu Item
// ─────────────────────────────────────────────────────────
const MenuItem = ({
  icon: Icon,
  label,
  isActive = false,
  enabled = true,
  onPress,
  index = 0,
}: {
  icon: any;
  label: string;
  isActive?: boolean;
  enabled?: boolean;
  onPress?: () => void;
  index?: number;
}) => {
  const { colors, mode } = useTheme();
  const styles = getStyles(colors, mode);

  return (
    <MotiView
      from={{ opacity: 0, translateX: -20 }}
      animate={{ opacity: 1, translateX: 0 }}
      transition={{ delay: 80 + index * 40, type: 'spring', damping: 20, stiffness: 180 }}
    >
      <TouchableOpacity
        style={[
          styles.menuItem,
          isActive && styles.activeMenuItem,
          !enabled && styles.disabledMenuItem,
        ]}
        onPress={onPress}
        activeOpacity={0.7}
        disabled={!enabled && !onPress}
      >
        <View style={[
          styles.menuIconCircle,
          isActive && styles.menuIconCircleActive,
          !enabled && styles.menuIconCircleDisabled,
        ]}>
          <Icon
            size={rem(17)}
            color={isActive ? colors.primary : (enabled ? colors.textMuted : (mode === 'light' ? '#CBD5E1' : '#64748B'))}
            strokeWidth={isActive ? 2.5 : 2}
          />
        </View>

        <View style={styles.menuItemContent}>
          <Text style={[
            styles.menuItemText,
            isActive && styles.activeMenuItemText,
            !enabled && styles.disabledMenuItemText,
          ]}>
            {label}
          </Text>
          {!enabled && (
            <View style={styles.proximamenteBadge}>
              <Clock size={rem(8)} color="#F59E0B" />
              <Text style={styles.proximamenteText}>Próximamente</Text>
            </View>
          )}
        </View>

        {enabled && (
          <ChevronRight size={rem(14)} color={isActive ? colors.primary : (mode === 'light' ? '#CBD5E1' : '#64748B')} />
        )}
      </TouchableOpacity>
    </MotiView>
  );
};

// ─────────────────────────────────────────────────────────
// Sidebar Component
// ─────────────────────────────────────────────────────────
export const Sidebar = ({ isVisible, onClose }: SidebarProps) => {
  const { colors, mode } = useTheme();
  const styles = getStyles(colors, mode);
  const navigation = useNavigation<any>();
  const { user } = useAppSelector((state) => state.auth);

  const state = navigation.getState();
  const activeRoute = state ? state.routes[state.index] : null;
  const currentRouteName = activeRoute?.name || 'DASHBOARD';
  const currentTab = activeRoute?.params?.tab || 'HOME';

  // ── Animations ──────────────────────────────────
  const slideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isVisible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          damping: 22,
          stiffness: 200,
        }),
        Animated.timing(overlayAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: -SIDEBAR_WIDTH,
          useNativeDriver: true,
          damping: 22,
          stiffness: 200,
        }),
        Animated.timing(overlayAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible]);

  // ── PanResponder (swipe left to close) ──────────
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) => gs.dx < -10 && Math.abs(gs.dy) < 30,
      onPanResponderMove: (_, gs) => {
        if (gs.dx < 0) {
          slideAnim.setValue(gs.dx);
        }
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dx < -SWIPE_THRESHOLD || gs.vx < -0.5) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onClose();
        } else {
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
            damping: 22,
            stiffness: 200,
          }).start();
        }
      },
    })
  ).current;

  // ── Sede / Caja Selector Lógica ─────────────────
  const dispatch = useAppDispatch();
  const [registers, setRegisters] = React.useState<any[]>([]);
  const [isSelectorLoading, setIsSelectorLoading] = React.useState(false);
  const [isSelectorOpen, setIsSelectorOpen] = React.useState(false);

  // Sede (Tenant/Membership) Selector States
  const [memberships, setMemberships] = React.useState<any[]>([]);
  const [isMembershipsLoading, setIsMembershipsLoading] = React.useState(false);
  const [isSedeDropdownOpen, setIsSedeDropdownOpen] = React.useState(false);
  const [isSwitchingSede, setIsSwitchingSede] = React.useState(false);

  const { selectedRegisterId, selectedRegisterName } = useAppSelector((state) => state.pos);
  const { tenantId: activeTenantId } = useAppSelector((state) => state.auth);

  // Fetch registers and memberships when sidebar opens
  useEffect(() => {
    if (isVisible) {
      // 1. Fetch cash registers for active tenant
      const fetchRegisters = async () => {
        setIsSelectorLoading(true);
        try {
          const list = await CashRegisterService.listCashRegisters();
          setRegisters(list);
        } catch (err) {
          console.error('Error fetching registers in Sidebar:', err);
        } finally {
          setIsSelectorLoading(false);
        }
      };
      fetchRegisters();

      // 2. Fetch memberships (MIS SEDES / ACCESOS)
      const fetchMemberships = async () => {
        setIsMembershipsLoading(true);
        try {
          const list = await AuthService.listMemberships();
          setMemberships(list);
        } catch (err) {
          console.error('Error fetching memberships in Sidebar:', err);
        } finally {
          setIsMembershipsLoading(false);
        }
      };
      fetchMemberships();
    }
  }, [isVisible, activeTenantId]);

  // Auto-select first register if none active
  useEffect(() => {
    if (!selectedRegisterId && registers.length > 0) {
      const defaultReg = registers[0];
      dispatch(setSelectedRegister({ id: defaultReg.id, name: defaultReg.name }));
      SecureStorage.saveCashRegister(defaultReg.id, defaultReg.name);
    }
  }, [registers, selectedRegisterId]);

  const handleSelectRegister = async (id: string, name: string) => {
    dispatch(setSelectedRegister({ id, name }));
    await SecureStorage.saveCashRegister(id, name);
    setIsSelectorOpen(false);
  };

  const handleSwitchSede = async (targetTenantId: string) => {
    if (targetTenantId === activeTenantId) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsSwitchingSede(true);
    try {
      // 1. Llamar al backend para cambiar contexto
      await AuthService.switchSite(targetTenantId);
      
      // 1.2 Limpiar la memoria local de proveedores, facturas y activos
      InventoryService.clearLocalMocks();
      
      // 1.5 Limpiar todo lo de Redux (pos, catalog, cart, etc.) para que no queden remanentes
      dispatch({ type: 'RESET_STORE_DATA' });
      
      // 2. Actualizar estado de Redux con la nueva sede
      dispatch(updateTenantId(targetTenantId));

      // 2.1 Obtener perfil actualizado para la nueva sede para actualizar el nombre de comercio
      try {
        const userProfile = await AuthService.getCurrentUser();
        const commerceName = userProfile?.commerce_name || userProfile?.commerce?.nombre || userProfile?.commerce?.name || '';
        console.log('✅ [Sidebar] Nombre de comercio obtenido tras cambiar de sede:', commerceName);
        
        const userObj = await SecureStorage.getUser();
        if (userObj) {
          const updatedUser = {
            ...userObj,
            commerce_name: commerceName,
            commerce: userProfile?.commerce || userObj.commerce,
            tenant_id: targetTenantId,
          };
          await SecureStorage.saveUser(updatedUser);
        }
        dispatch(updateUserProfile({ commerce_name: commerceName, commerce: userProfile?.commerce }));
      } catch (meErr) {
        console.error('❌ [Sidebar] Error al obtener el perfil de usuario tras cambiar de sede:', meErr);
      }
      
      // 3. Limpiar caja seleccionada vieja ya que cambiamos de sede
      dispatch(setSelectedRegister({ id: '', name: '' }));
      await SecureStorage.saveCashRegister('', '');
      
      // 4. Opcionalmente cerrar el sidebar para recargar vistas
      setIsSedeDropdownOpen(false);
      onClose();
    } catch (err) {
      console.error('Error al cambiar de sede:', err);
    } finally {
      setIsSwitchingSede(false);
    }
  };

  // ── Handlers ────────────────────────────────────
  const handleNavPress = (item: NavItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (item.tab) {
      navigation.navigate('DASHBOARD', { tab: item.tab });
    }
    onClose();
  };

  const handleLogout = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await SecureStorage.clearAll();
    authEventEmitter.onLogout();
    onClose();
  };

  // ── User Info ───────────────────────────────────
  const userName = user?.name || user?.nombre || 'Usuario';
  const userRole = user?.role === 'owner' ? 'Administrador' : user?.role === 'admin' ? 'Admin' : 'Cajero';
  const initial = userName[0]?.toUpperCase() || 'U';
  const photoUrl = user?.photo_url || user?.avatar_url || null;
  const commerceName = user?.commerce_name || user?.commerce?.name || 'Mi Comercio';

  return (
    <Modal
      transparent
      visible={isVisible}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Overlay */}
      <Animated.View style={[styles.overlay, { opacity: overlayAnim }]}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
      </Animated.View>

      {/* Sidebar Panel — slides from LEFT */}
      <Animated.View
        {...panResponder.panHandlers}
        style={[styles.sidebarContainer, { transform: [{ translateX: slideAnim }] }]}
      >
        {/* ── Profile Header ──────────────────── */}
        <View style={styles.profileSection}>
          <View style={styles.profileTopRow}>
            {/* Avatar */}
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                {photoUrl ? (
                  <Image source={{ uri: photoUrl }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarInitial}>{initial}</Text>
                )}
              </View>
              <View style={styles.onlineDot} />
            </View>

            {/* Close */}
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <X size={rem(16)} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={styles.profileName}>{userName}</Text>

          {/* Role + Commerce Chips */}
          <View style={styles.chipRow}>
            <View style={styles.roleChip}>
              <Shield size={rem(9)} color={colors.primary} />
              <Text style={styles.roleChipText}>{userRole}</Text>
            </View>
            <View style={styles.commerceChip}>
              <Smartphone size={rem(9)} color="#D97706" />
              <Text style={styles.commerceChipText}>{commerceName}</Text>
            </View>
          </View>

          {/* MIS SEDES / ACCESOS (Multi-Tenant Selector) */}
          <View style={styles.sedeSelectorContainer}>
            <Text style={styles.sedeSelectorLabel}>MIS SEDES / ACCESOS</Text>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.sedeSelectorBox,
                isSedeDropdownOpen && styles.sedeSelectorBoxActive
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setIsSedeDropdownOpen(!isSedeDropdownOpen);
              }}
            >
              <View style={styles.sedeSelectorLeft}>
                <View style={styles.sedeIconBg}>
                  <Building2 size={rem(12)} color={colors.primary} />
                </View>
                <Text style={styles.sedeActiveText} numberOfLines={1}>
                  {activeTenantId || 'SELECCIONAR SEDE'}
                </Text>
              </View>
              <ChevronDown 
                size={rem(12)} 
                color={colors.textMuted} 
                style={{ transform: [{ rotate: isSedeDropdownOpen ? '180deg' : '0deg' }] }} 
              />
            </TouchableOpacity>

            {isSedeDropdownOpen && (
              <MotiView
                from={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ type: 'spring', damping: 20, stiffness: 150 }}
                style={styles.dropdownScroll}
              >
                {isMembershipsLoading ? (
                  <View style={styles.dropdownLoadingContainer}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.dropdownLoadingText}>Cargando sedes...</Text>
                  </View>
                ) : memberships.length === 0 ? (
                  <View style={styles.dropdownEmptyContainer}>
                    <Text style={styles.dropdownEmptyText}>No hay sedes disponibles</Text>
                  </View>
                ) : (
                  <View style={styles.dropdownList}>
                    {memberships.map((m) => {
                      const isActive = activeTenantId === m.tenant_id;
                      return (
                        <TouchableOpacity
                          key={m.tenant_id}
                          activeOpacity={0.7}
                          style={[
                            styles.dropdownItem,
                            isActive && styles.activeDropdownItem
                          ]}
                          onPress={async () => {
                            await handleSwitchSede(m.tenant_id);
                          }}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.dropdownItemText, isActive && styles.activeDropdownItemText]}>
                              {m.tenant_id}
                            </Text>
                            <Text style={styles.dropdownItemSubtext}>
                              {m.role}
                            </Text>
                          </View>
                          {isActive && (
                            <Check size={rem(10)} color={colors.primary} strokeWidth={3} />
                          )}
                        </TouchableOpacity>
                      );
                    })}

                    {/* Footer: Gestionar Sedes */}
                    {(user?.role === 'owner' || user?.role === 'admin') && (
                      <TouchableOpacity
                        activeOpacity={0.7}
                        style={styles.btnManageSedes}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          alert('Gestionar Sedes: Próximamente');
                        }}
                      >
                        <Cog size={rem(12)} color={colors.primary} />
                        <Text style={styles.btnManageSedesText}>Gestionar Sedes</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </MotiView>
            )}
          </View>

          {/* PUNTO DE VENTA / CAJA */}
          <View style={[styles.sedeSelectorContainer, { marginTop: rem(10) }]}>
            <Text style={styles.sedeSelectorLabel}>PUNTO DE VENTA / CAJA</Text>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.sedeSelectorBox,
                isSelectorOpen && styles.sedeSelectorBoxActive
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setIsSelectorOpen(!isSelectorOpen);
              }}
            >
              <View style={styles.sedeSelectorLeft}>
                <View style={styles.sedeIconBg}>
                  <Store size={rem(12)} color={colors.primary} />
                </View>
                <Text style={styles.sedeActiveText} numberOfLines={1}>
                  {selectedRegisterName || 'SELECCIONAR CAJA'}
                </Text>
              </View>
              <ChevronDown 
                size={rem(12)} 
                color={colors.textMuted} 
                style={{ transform: [{ rotate: isSelectorOpen ? '180deg' : '0deg' }] }} 
              />
            </TouchableOpacity>

            {isSelectorOpen && (
              <MotiView
                from={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ type: 'spring', damping: 20, stiffness: 150 }}
                style={styles.dropdownScroll}
              >
                {isSelectorLoading ? (
                  <View style={styles.dropdownLoadingContainer}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.dropdownLoadingText}>Cargando cajas...</Text>
                  </View>
                ) : registers.length === 0 ? (
                  <View style={styles.dropdownEmptyContainer}>
                    <Text style={styles.dropdownEmptyText}>No hay cajas disponibles</Text>
                  </View>
                ) : (
                  <View style={styles.dropdownList}>
                    {registers.map((reg) => {
                      const isActive = selectedRegisterId === reg.id;
                      return (
                        <TouchableOpacity
                          key={reg.id}
                          activeOpacity={0.7}
                          style={[
                            styles.dropdownItem,
                            isActive && styles.activeDropdownItem
                          ]}
                          onPress={async () => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            await handleSelectRegister(reg.id, reg.name);
                          }}
                        >
                          <Text style={[styles.dropdownItemText, isActive && styles.activeDropdownItemText]}>
                            {reg.name}
                          </Text>
                          {isActive && (
                            <Check size={rem(10)} color={colors.primary} strokeWidth={3} />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </MotiView>
            )}
          </View>
        </View>

        {/* Switching Sede Loading Overlay */}
        {isSwitchingSede && (
          <View style={styles.switchingOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.switchingText}>Cambiando de sede...</Text>
          </View>
        )}

        {/* ── Divider ─────────────────────────── */}
        <View style={styles.divider} />

        {/* ── Section Label ───────────────────── */}
        <Text style={styles.sectionLabel}>NAVEGACIÓN</Text>

        {/* ── Menu Items ──────────────────────── */}
        <ScrollView style={styles.menuContainer} showsVerticalScrollIndicator={false}>
          {NAV_ITEMS.map((item, index) => {
            const isActive =
              (item.id === 'INICIO' && currentRouteName === 'DASHBOARD' && currentTab === 'HOME') ||
              (item.id === 'INVENTARIO' && currentRouteName === 'DASHBOARD' && currentTab === 'INVENTARIO') ||
              (item.id === 'VENTAS' && currentRouteName === 'DASHBOARD' && currentTab !== 'CAJA' && currentTab !== 'INVENTARIO' && currentTab !== 'HOME' && currentTab !== 'CONTROL') ||
              (item.id === 'CAJA' && currentRouteName === 'DASHBOARD' && currentTab === 'CAJA') ||
              (item.id === 'CONTROL' && currentRouteName === 'DASHBOARD' && currentTab === 'CONTROL');

            return (
              <MenuItem
                key={item.id}
                icon={item.icon}
                label={item.label}
                isActive={isActive}
                enabled={item.enabled}
                index={index}
                onPress={item.enabled ? () => handleNavPress(item) : undefined}
              />
            );
          })}
        </ScrollView>

        {/* ── Footer ──────────────────────────── */}
        <View style={styles.footer}>
          {/* Logout */}
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Power size={rem(16)} color="#EF4444" />
            <Text style={styles.logoutText}>Cerrar Sesión</Text>
          </TouchableOpacity>

          {/* Version */}
          <View style={styles.versionRow}>
            <Cpu size={rem(10)} color={colors.textMuted} />
            <Text style={styles.versionText}>IAStock POS v1.1.1</Text>
            {Env.IS_DEV && (
              <View style={styles.versionDevBadge}>
                <Text style={styles.versionDevText}>DEV</Text>
              </View>
            )}
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
};

// ─────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────
const getStyles = (colors: any, mode: string) => StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: mode === 'light' ? 'rgba(15, 23, 42, 0.45)' : 'rgba(0, 0, 0, 0.6)',
  },

  // ── Sidebar Container ─────────────────────────
  sidebarContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: colors.surface,
    paddingTop: Platform.OS === 'ios' ? rem(55) : rem(30),
    borderTopRightRadius: rem(28),
    borderBottomRightRadius: rem(28),
    ...Platform.select({
      ios: {
        shadowColor: colors.text,
        shadowOffset: { width: 8, height: 0 },
        shadowOpacity: 0.12,
        shadowRadius: 20,
      },
      android: { elevation: 10 },
    }),
  },

  // ── Profile ───────────────────────────────────
  profileSection: {
    paddingHorizontal: rem(20),
    paddingBottom: rem(16),
  },
  profileTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: rem(12),
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: rem(48),
    height: rem(48),
    borderRadius: rem(16),
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: rem(48),
    height: rem(48),
    borderRadius: rem(16),
    resizeMode: 'cover',
  },
  avatarInitial: {
    fontSize: rem(20),
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: 'Inter-Bold',
  },
  onlineDot: {
    position: 'absolute',
    bottom: rem(0),
    right: rem(0),
    width: rem(12),
    height: rem(12),
    borderRadius: rem(6),
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  closeButton: {
    width: rem(30),
    height: rem(30),
    backgroundColor: mode === 'light' ? '#F8FAFC' : '#1E293B',
    borderRadius: rem(9),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: mode === 'light' ? '#F1F5F9' : '#334155',
  },
  profileName: {
    fontSize: rem(16),
    fontWeight: '800',
    color: colors.text,
    fontFamily: 'Inter-Bold',
    letterSpacing: -0.3,
    marginBottom: rem(8),
  },
  chipRow: {
    flexDirection: 'row',
    gap: rem(6),
    flexWrap: 'wrap',
  },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: mode === 'light' ? '#EEF2FF' : colors.primary + '20',
    paddingHorizontal: rem(8),
    paddingVertical: rem(3),
    borderRadius: rem(6),
    gap: rem(3),
    borderWidth: 1,
    borderColor: mode === 'light' ? '#E0E7FF' : colors.primary + '40',
  },
  roleChipText: {
    fontSize: rem(9),
    fontWeight: '700',
    color: colors.primary,
    fontFamily: 'Inter-Bold',
  },
  commerceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: mode === 'light' ? '#FFFBEB' : '#F59E0B20',
    paddingHorizontal: rem(8),
    paddingVertical: rem(3),
    borderRadius: rem(6),
    gap: rem(3),
    borderWidth: 1,
    borderColor: mode === 'light' ? '#FEF3C7' : '#F59E0B40',
  },
  commerceChipText: {
    fontSize: rem(9),
    fontWeight: '700',
    color: '#D97706',
    fontFamily: 'Inter-Bold',
  },

  // ── Divider ───────────────────────────────────
  divider: {
    height: 1,
    backgroundColor: mode === 'light' ? '#F1F5F9' : '#334155',
    marginHorizontal: rem(20),
    marginBottom: rem(12),
  },

  // ── Section Label ─────────────────────────────
  sectionLabel: {
    fontSize: rem(9),
    fontWeight: '800',
    color: colors.textMuted,
    fontFamily: 'Inter-Bold',
    letterSpacing: 1.2,
    paddingHorizontal: rem(28),
    marginBottom: rem(6),
  },

  // ── Menu ──────────────────────────────────────
  menuContainer: {
    flex: 1,
    paddingHorizontal: rem(12),
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: rem(10),
    paddingHorizontal: rem(12),
    borderRadius: rem(14),
    gap: rem(10),
    marginBottom: rem(2),
  },
  activeMenuItem: {
    backgroundColor: mode === 'light' ? '#EEF2FF' : colors.primary + '20',
  },
  disabledMenuItem: {
    opacity: 0.7,
  },
  menuIconCircle: {
    width: rem(34),
    height: rem(34),
    borderRadius: rem(10),
    backgroundColor: mode === 'light' ? '#F8FAFC' : '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: mode === 'light' ? '#F1F5F9' : '#334155',
  },
  menuIconCircleActive: {
    backgroundColor: mode === 'light' ? '#E0E7FF' : colors.primary + '40',
    borderColor: mode === 'light' ? '#C7D2FE' : colors.primary,
  },
  menuIconCircleDisabled: {
    backgroundColor: mode === 'light' ? '#FAFAFA' : '#1E293B',
    borderColor: mode === 'light' ? '#F5F5F5' : '#334155',
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemText: {
    fontSize: rem(14),
    fontWeight: '600',
    color: colors.textMuted,
    fontFamily: 'Inter-Regular',
  },
  activeMenuItemText: {
    color: colors.primary,
    fontWeight: '800',
    fontFamily: 'Inter-Bold',
  },
  disabledMenuItemText: {
    color: mode === 'light' ? '#CBD5E1' : '#64748B',
  },
  proximamenteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rem(3),
    marginTop: rem(1),
  },
  proximamenteText: {
    fontSize: rem(8),
    fontWeight: '700',
    color: '#F59E0B',
    fontFamily: 'Inter-Bold',
    letterSpacing: 0.2,
  },

  // ── Footer ────────────────────────────────────
  footer: {
    paddingHorizontal: rem(16),
    paddingBottom: Platform.OS === 'ios' ? rem(36) : rem(20),
    paddingTop: rem(8),
    gap: rem(10),
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: mode === 'light' ? '#FEF2F2' : '#EF444420',
    paddingVertical: rem(12),
    borderRadius: rem(14),
    gap: rem(8),
    borderWidth: 1,
    borderColor: mode === 'light' ? '#FEE2E2' : '#EF444440',
  },
  logoutText: {
    fontSize: rem(14),
    fontWeight: '700',
    color: '#EF4444',
    fontFamily: 'Inter-Bold',
  },
  versionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rem(5),
  },
  versionText: {
    fontSize: rem(10),
    color: colors.textMuted,
    fontFamily: 'Inter-Regular',
  },
  versionDevBadge: {
    backgroundColor: mode === 'light' ? '#EEF2FF' : colors.primary + '20',
    paddingHorizontal: rem(5),
    paddingVertical: rem(1),
    borderRadius: rem(4),
  },
  versionDevText: {
    fontSize: rem(7),
    fontWeight: '800',
    color: colors.primary,
    fontFamily: 'Inter-Bold',
  },

  // ── Sede Selector Styles ───────────────────────
  sedeSelectorContainer: {
    marginTop: rem(14),
    width: '100%',
  },
  sedeSelectorLabel: {
    fontSize: rem(8),
    fontWeight: '800',
    color: colors.textMuted,
    fontFamily: 'Inter-Bold',
    letterSpacing: 1,
    marginBottom: rem(4),
  },
  sedeSelectorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: mode === 'light' ? '#F8FAFC' : '#1E293B',
    borderWidth: 1.5,
    borderColor: mode === 'light' ? '#E2E8F0' : '#334155',
    borderRadius: rem(12),
    paddingHorizontal: rem(12),
    paddingVertical: rem(8),
  },
  sedeSelectorBoxActive: {
    borderColor: mode === 'light' ? '#C7D2FE' : colors.primary,
    backgroundColor: mode === 'light' ? '#F5F7FF' : '#1E293B',
  },
  sedeSelectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rem(8),
    flex: 1,
  },
  sedeIconBg: {
    width: rem(22),
    height: rem(22),
    borderRadius: rem(6),
    backgroundColor: mode === 'light' ? '#EEF2FF' : colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sedeActiveText: {
    fontSize: rem(11),
    fontWeight: '800',
    color: colors.text,
    fontFamily: 'Inter-Bold',
    textTransform: 'uppercase',
    flex: 1,
  },
  dropdownScroll: {
    marginTop: rem(4),
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: mode === 'light' ? '#E2E8F0' : '#334155',
    borderRadius: rem(12),
    overflow: 'hidden',
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  dropdownLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: rem(16),
    gap: rem(8),
  },
  dropdownLoadingText: {
    fontSize: rem(10),
    color: colors.textMuted,
    fontFamily: 'Inter-Medium',
  },
  dropdownEmptyContainer: {
    paddingVertical: rem(16),
    alignItems: 'center',
  },
  dropdownEmptyText: {
    fontSize: rem(10),
    color: colors.textMuted,
    fontFamily: 'Inter-Medium',
  },
  dropdownList: {
    paddingVertical: rem(4),
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: rem(8),
    paddingHorizontal: rem(12),
  },
  activeDropdownItem: {
    backgroundColor: mode === 'light' ? '#EEF2FF' : colors.primary + '20',
  },
  dropdownItemText: {
    fontSize: rem(11),
    fontWeight: '600',
    color: colors.text,
    fontFamily: 'Inter-SemiBold',
    textTransform: 'uppercase',
  },
  activeDropdownItemText: {
    color: colors.primary,
    fontFamily: 'Inter-Bold',
  },
  dropdownItemSubtext: {
    fontSize: rem(8),
    fontWeight: '500',
    color: colors.textMuted,
    fontFamily: 'Inter-Medium',
    marginTop: rem(1),
    textTransform: 'uppercase',
  },
  btnManageSedes: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rem(6),
    marginTop: rem(4),
    marginHorizontal: rem(8),
    marginBottom: rem(4),
    paddingVertical: rem(8),
    backgroundColor: mode === 'light' ? '#EEF2FF' : colors.primary + '20',
    borderRadius: rem(8),
    borderWidth: 1,
    borderColor: mode === 'light' ? '#E0E7FF' : colors.primary + '40',
  },
  btnManageSedesText: {
    fontSize: rem(10),
    fontWeight: '800',
    color: colors.primary,
    fontFamily: 'Inter-Bold',
  },
  switchingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: mode === 'light' ? 'rgba(15, 23, 42, 0.75)' : 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  switchingText: {
    color: '#FFFFFF',
    fontSize: rem(12),
    fontWeight: '800',
    fontFamily: 'Inter-Bold',
    marginTop: rem(10),
  },
});
