import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert
} from 'react-native';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';
import { 
  User, 
  Lock, 
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
import { AuthService } from '@/infrastructure/services/authService';
import { updateUserProfile } from '@/core/store/slices/authSlice';

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────
interface Props {
  onBack: () => void;
}

type TabMode = 'PROFILE' | 'SECURITY';

export const UserSettingsScreen = ({ onBack }: Props) => {
  const { colors, mode } = useTheme();
  const styles = getStyles(colors, mode);
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  
  const { user } = useAppSelector((state) => state.auth);

  const [activeTab, setActiveTab] = useState<TabMode>('PROFILE');
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Profile Form State
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone_number || '');
  
  // Security Form State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Sync state
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone_number || '');
      setHasChanges(false);
    }
  }, [user]);

  const handleProfileChange = (field: 'name' | 'phone', value: string) => {
    if (field === 'name') setName(value);
    if (field === 'phone') setPhone(value);
    setHasChanges(true);
  };

  const handlePasswordChange = (field: 'new' | 'confirm', value: string) => {
    if (field === 'new') setNewPassword(value);
    if (field === 'confirm') setConfirmPassword(value);
    setHasChanges(true);
  };

  const handleDiscard = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setName(user?.name || '');
    setPhone(user?.phone_number || '');
    setNewPassword('');
    setConfirmPassword('');
    setHasChanges(false);
  };

  const handleSave = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSaving(true);

    try {
      if (activeTab === 'PROFILE') {
        if (!name.trim()) throw new Error('El nombre es obligatorio');
        
        await AuthService.updateEmployee(user.id, {
          name,
          phone_number: phone
        });
        
        // Update local redux state
        dispatch(updateUserProfile({ name, phone_number: phone }));
        Alert.alert('Éxito', 'Perfil actualizado correctamente');
      } else {
        if (newPassword.length < 8) throw new Error('La contraseña debe tener mínimo 8 caracteres');
        if (newPassword !== confirmPassword) throw new Error('Las contraseñas no coinciden');
        
        await AuthService.changeMyPassword(newPassword);
        
        setNewPassword('');
        setConfirmPassword('');
        Alert.alert('Éxito', 'Contraseña actualizada correctamente');
      }
      setHasChanges(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Error al guardar los cambios');
    } finally {
      setIsSaving(false);
    }
  };

  // ─────────────────────────────────────────────────────────
  // Sub-Renderers
  // ─────────────────────────────────────────────────────────
  const renderProfileTab = () => (
    <MotiView
      from={{ opacity: 0, translateY: 10 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 300 }}
      style={styles.tabContent}
    >
      <View style={styles.formGroup}>
        <Text style={styles.label}>Nombre Completo</Text>
        <TextInput
          style={styles.input}
          placeholder="Tu nombre"
          placeholderTextColor={colors.textMuted}
          value={name}
          onChangeText={(val) => handleProfileChange('name', val)}
        />
      </View>
      <View style={styles.formGroup}>
        <Text style={styles.label}>Teléfono</Text>
        <TextInput
          style={styles.input}
          placeholder="+57 300 123 4567"
          placeholderTextColor={colors.textMuted}
          keyboardType="phone-pad"
          value={phone}
          onChangeText={(val) => handleProfileChange('phone', val)}
        />
      </View>
      <View style={styles.formGroup}>
        <Text style={styles.label}>Email (Solo Lectura)</Text>
        <TextInput
          style={[styles.input, { opacity: 0.6 }]}
          value={user?.email || ''}
          editable={false}
        />
      </View>
      <View style={styles.formGroup}>
        <Text style={styles.label}>Rol de Usuario</Text>
        <TextInput
          style={[styles.input, { opacity: 0.6 }]}
          value={user?.role?.toUpperCase() || ''}
          editable={false}
        />
      </View>
    </MotiView>
  );

  const renderSecurityTab = () => (
    <MotiView
      from={{ opacity: 0, translateY: 10 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 300 }}
      style={styles.tabContent}
    >
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>Actualiza tu contraseña periódicamente para mantener tu cuenta protegida.</Text>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Nueva Contraseña</Text>
        <View style={styles.passwordWrapper}>
          <TextInput
            style={styles.inputPassword}
            placeholder="Mínimo 8 caracteres"
            placeholderTextColor={colors.textMuted}
            secureTextEntry={!showPassword}
            value={newPassword}
            onChangeText={(val) => handlePasswordChange('new', val)}
          />
          <TouchableOpacity 
            style={styles.eyeBtn}
            onPress={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeOff size={rem(20)} color={colors.textMuted} />
            ) : (
              <Eye size={rem(20)} color={colors.textMuted} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Confirmar Nueva Contraseña</Text>
        <TextInput
          style={styles.input}
          placeholder="Repite la contraseña"
          placeholderTextColor={colors.textMuted}
          secureTextEntry={!showPassword}
          value={confirmPassword}
          onChangeText={(val) => handlePasswordChange('confirm', val)}
        />
        {confirmPassword.length > 0 && newPassword !== confirmPassword && (
          <Text style={styles.errorText}>Las contraseñas no coinciden</Text>
        )}
      </View>
    </MotiView>
  );

  return (
    <View style={styles.container}>
      {/* ── Header ────────────────────────────────────────── */}
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
            <Text style={styles.pageTitle}>Mi Cuenta</Text>
            <Text style={styles.pageSubtitle}>Perfil y Seguridad</Text>
          </View>
        </View>

        {/* ── Pill Selector ─────────────────────────────────── */}
        <View style={styles.pillContainer}>
          <TouchableOpacity
            style={[styles.pillBtn, activeTab === 'PROFILE' && styles.pillActive]}
            onPress={() => {
              Haptics.selectionAsync();
              setActiveTab('PROFILE');
            }}
          >
            <User size={rem(14)} color={activeTab === 'PROFILE' ? '#FFF' : colors.textMuted} />
            <Text style={[styles.pillText, activeTab === 'PROFILE' && styles.pillTextActive]}>
              Mi Perfil
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.pillBtn, activeTab === 'SECURITY' && styles.pillActive]}
            onPress={() => {
              Haptics.selectionAsync();
              setActiveTab('SECURITY');
            }}
          >
            <Lock size={rem(14)} color={activeTab === 'SECURITY' ? '#FFF' : colors.textMuted} />
            <Text style={[styles.pillText, activeTab === 'SECURITY' && styles.pillTextActive]}>
              Seguridad
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Content ──────────────────────────────────────── */}
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          {activeTab === 'PROFILE' ? renderProfileTab() : renderSecurityTab()}
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
              <Text style={styles.actionTitle}>Hay cambios pendientes</Text>
              <Text style={styles.actionDesc}>Asegúrate de guardarlos.</Text>
            </View>
          </View>
          <View style={styles.actionBtns}>
            <TouchableOpacity 
              style={styles.discardBtn}
              onPress={handleDiscard}
              disabled={isSaving}
            >
              <RotateCcw size={rem(16)} color="#94A3B8" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.saveBtn, isSaving && { opacity: 0.7 }]}
              onPress={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Save size={rem(16)} color="#FFF" />
                  <Text style={styles.saveBtnText}>Guardar</Text>
                </>
              )}
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
    zIndex: 10,
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
  pillContainer: {
    flexDirection: 'row',
    backgroundColor: mode === 'light' ? '#F1F5F9' : '#0F172A',
    borderRadius: rem(12),
    padding: rem(4),
  },
  pillBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: rem(8),
    borderRadius: rem(10),
    gap: rem(6),
  },
  pillActive: {
    backgroundColor: '#0047FF',
    shadowColor: '#0047FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  pillText: {
    fontFamily: 'Inter-Bold',
    fontSize: rem(13),
    color: colors.textMuted,
  },
  pillTextActive: {
    color: '#FFF',
  },
  scrollContent: {
    padding: rem(16),
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: rem(20),
    padding: rem(20),
    borderWidth: 1,
    borderColor: mode === 'light' ? '#EAE5DA' : '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: mode === 'light' ? 0.05 : 0.2,
    shadowRadius: 12,
    elevation: 2,
  },
  tabContent: {
    gap: rem(16),
  },
  infoBox: {
    backgroundColor: colors.primary + '10',
    padding: rem(12),
    borderRadius: rem(12),
    marginBottom: rem(8),
    borderWidth: 1,
    borderColor: colors.primary + '20',
  },
  infoText: {
    fontFamily: 'Inter-Medium',
    fontSize: rem(12),
    color: colors.primary,
    lineHeight: rem(18),
  },
  formGroup: {
    gap: rem(8),
  },
  label: {
    fontFamily: 'Inter-Bold',
    fontSize: rem(12),
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: rem(4),
  },
  input: {
    backgroundColor: mode === 'light' ? '#F8FAFC' : '#0F172A',
    borderWidth: 1,
    borderColor: mode === 'light' ? '#E2E8F0' : '#334155',
    borderRadius: rem(12),
    paddingHorizontal: rem(16),
    height: rem(48),
    fontFamily: 'Inter-Medium',
    fontSize: rem(14),
    color: colors.text,
  },
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: mode === 'light' ? '#F8FAFC' : '#0F172A',
    borderWidth: 1,
    borderColor: mode === 'light' ? '#E2E8F0' : '#334155',
    borderRadius: rem(12),
    height: rem(48),
  },
  inputPassword: {
    flex: 1,
    paddingHorizontal: rem(16),
    fontFamily: 'Inter-Medium',
    fontSize: rem(14),
    color: colors.text,
    height: '100%',
  },
  eyeBtn: {
    paddingHorizontal: rem(16),
    height: '100%',
    justifyContent: 'center',
  },
  errorText: {
    fontFamily: 'Inter-Medium',
    fontSize: rem(11),
    color: '#EF4444',
    marginLeft: rem(4),
  },
  actionBar: {
    position: 'absolute',
    left: rem(16),
    right: rem(16),
    backgroundColor: '#1E293B',
    borderRadius: rem(16),
    padding: rem(16),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  actionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rem(12),
    flex: 1,
  },
  actionIconBox: {
    width: rem(36),
    height: rem(36),
    borderRadius: rem(18),
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: rem(13),
    color: '#FFF',
  },
  actionDesc: {
    fontFamily: 'Inter-Medium',
    fontSize: rem(11),
    color: '#94A3B8',
  },
  actionBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rem(8),
  },
  discardBtn: {
    width: rem(40),
    height: rem(40),
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: rem(10),
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rem(6),
    backgroundColor: '#0047FF',
    paddingHorizontal: rem(16),
    height: rem(40),
    borderRadius: rem(10),
  },
  saveBtnText: {
    fontFamily: 'Inter-Bold',
    fontSize: rem(13),
    color: '#FFF',
  }
});
