import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Plus,
  Coins,
  Trash2,
  Edit3,
  SlidersHorizontal,
  X,
  AlertTriangle,
  CheckCircle,
  Shield,
} from 'lucide-react-native';
import { MotiView } from 'moti';
import { rem } from '@/core/utils/responsive';
import { CashRegisterService, CashRegister } from '@/infrastructure/services/cashRegisterService';
import { useTheme } from '@/core/theme/theme';
import * as Haptics from 'expo-haptics';

interface CajaManagementTabProps {
  registers: CashRegister[];
  loading: boolean;
  onRefresh: () => void;
  triggerHaptic: (style?: Haptics.ImpactFeedbackStyle) => void;
}

export const CajaManagementTab: React.FC<CajaManagementTabProps> = ({
  registers,
  loading,
  onRefresh,
  triggerHaptic,
}) => {
  const { colors, mode } = useTheme();
  const styles = getStyles(colors, mode);

  // Modal states
  const [formModalVisible, setFormModalVisible] = useState<boolean>(false);
  const [confirmDeleteModalVisible, setConfirmDeleteModalVisible] = useState<boolean>(false);
  
  // Form values
  const [editingRegister, setEditingRegister] = useState<CashRegister | null>(null);
  const [registerName, setRegisterName] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorText, setErrorText] = useState<string>('');

  // Delete target
  const [registerToDelete, setRegisterToDelete] = useState<CashRegister | null>(null);

  // Handlers
  const handleOpenCreate = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setEditingRegister(null);
    setRegisterName('');
    setErrorText('');
    setFormModalVisible(true);
  };

  const handleOpenEdit = (reg: CashRegister) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setEditingRegister(reg);
    setRegisterName(reg.name);
    setErrorText('');
    setFormModalVisible(true);
  };

  const handleOpenDelete = (reg: CashRegister) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    setRegisterToDelete(reg);
    setConfirmDeleteModalVisible(true);
  };

  const handleSubmit = async () => {
    if (registerName.trim() === '') {
      triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
      setErrorText('El nombre de la caja es obligatorio.');
      return;
    }

    setSubmitting(true);
    setErrorText('');

    try {
      if (editingRegister) {
        // Update operation
        await CashRegisterService.updateCashRegister(editingRegister.id, registerName.trim());
        triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
      } else {
        // Create operation
        await CashRegisterService.createCashRegister(registerName.trim());
        triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
      }
      setFormModalVisible(false);
      onRefresh(); // Refresh register list in the parent context
    } catch (error: any) {
      console.error('Error in register submit:', error);
      setErrorText('Hubo un error al procesar la solicitud en el servidor.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!registerToDelete) return;
    setSubmitting(true);

    try {
      await CashRegisterService.deleteCashRegister(registerToDelete.id);
      triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
      setConfirmDeleteModalVisible(false);
      setRegisterToDelete(null);
      onRefresh(); // Refresh list
    } catch (error) {
      console.error('Error in delete register:', error);
      setErrorText('Hubo un error al intentar eliminar la caja.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Tab Header and descriptor */}
      <View style={styles.tabHeader}>
        <View style={styles.headerTitleRow}>
          <SlidersHorizontal size={rem(18)} color={colors.text} />
          <Text style={styles.tabTitle}>Cajas Registradoras</Text>
        </View>
        <Text style={styles.tabSubtitle}>
          Administra de forma segura las cajas registradoras de tu comercio. Puedes añadir nuevas cajas o editar sus nombres.
        </Text>

        {/* Bento Grid Statistics — matches CajaHistoryTab visual elegance */}
        <MotiView
          from={{ opacity: 0, translateY: -10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 300, delay: 100 }}
          style={styles.bentoGrid}
        >
          {/* Card 1: Total Cajas */}
          <View style={[styles.bentoCard, { flex: 1, backgroundColor: mode === 'light' ? '#EFF1FE' : '#1E1B4B' }]}>
            <Coins size={rem(18)} color={colors.primary} />
            <Text style={styles.bentoLabel}>TOTAL CAJAS</Text>
            <Text style={styles.bentoValue}>
              {registers.length}
            </Text>
          </View>

          {/* Card 2: Cajas Activas */}
          <View style={[styles.bentoCard, { flex: 1.2, backgroundColor: mode === 'light' ? '#E6F4EA' : '#064E3B' }]}>
            <CheckCircle size={rem(18)} color="#10B981" />
            <Text style={styles.bentoLabel}>OPERATIVAS</Text>
            <Text style={[styles.bentoValue, { color: mode === 'light' ? '#137333' : '#A7F3D0' }]}>
              {registers.length}
            </Text>
          </View>

          {/* Card 3: Multicaja support */}
          <View style={[styles.bentoCard, { flex: 1.1, backgroundColor: mode === 'light' ? '#FFF0D4' : '#78350F' }]}>
            <Shield size={rem(18)} color="#D97706" />
            <Text style={styles.bentoLabel}>MULTICAJA</Text>
            <Text style={[styles.bentoValue, { color: mode === 'light' ? '#B06000' : '#FEF3C7' }]}>
              SÍ
            </Text>
          </View>
        </MotiView>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando cajas...</Text>
        </View>
      ) : (
        <FlatList
          data={registers}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item, index }) => (
            <MotiView
              from={{ opacity: 0, scale: 0.96, translateY: 10 }}
              animate={{ opacity: 1, scale: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 300, delay: index * 40 }}
              style={styles.registerCard}
            >
              <View style={styles.cardInfoCol}>
                <View style={styles.coinIconBg}>
                  <Coins size={rem(18)} color={colors.primary} />
                </View>
                <View style={styles.namesContainer}>
                  <Text style={styles.regName}>{item.name}</Text>
                  <Text style={styles.regId}>ID: {item.id}</Text>
                </View>
              </View>

              <View style={styles.cardActionsCol}>
                {/* Edit Button */}
                <TouchableOpacity
                  style={styles.iconBtn}
                  activeOpacity={0.7}
                  onPress={() => handleOpenEdit(item)}
                >
                  <Edit3 size={rem(15)} color={colors.primary} />
                </TouchableOpacity>

                {/* Delete Button */}
                <TouchableOpacity
                  style={[styles.iconBtn, styles.deleteIconBtn]}
                  activeOpacity={0.7}
                  onPress={() => handleOpenDelete(item)}
                >
                  <Trash2 size={rem(15)} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </MotiView>
          )}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Coins size={rem(42)} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No tienes cajas configuradas</Text>
              <Text style={styles.emptySubtitle}>
                Crea tu primera caja registradora presionando el botón flotante inferior.
              </Text>
            </View>
          )}
        />
      )}

      {/* Floating Add Button */}
      <TouchableOpacity
        style={styles.floatingAddBtn}
        activeOpacity={0.8}
        onPress={handleOpenCreate}
      >
        <Plus size={rem(18)} color="#FFFFFF" style={{ marginRight: rem(4) }} />
        <Text style={styles.floatingAddBtnText}>Añadir Caja</Text>
      </TouchableOpacity>

      {/* Create / Edit Form Modal */}
      <Modal
        visible={formModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setFormModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <MotiView
            from={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={styles.modalDialog}
          >
            <View style={styles.dialogHeader}>
              <Text style={styles.dialogTitle}>
                {editingRegister ? 'Editar Caja Registradora' : 'Nueva Caja Registradora'}
              </Text>
              <TouchableOpacity
                onPress={() => setFormModalVisible(false)}
                style={styles.closeBtn}
              >
                <X size={rem(16)} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.dialogBody}>
              <Text style={styles.inputLabel}>Nombre de la Caja / Punto</Text>
              <TextInput
                style={[styles.textInput, errorText !== '' && styles.textInputError]}
                placeholder="Ej. Caja Principal, Caja Barra..."
                placeholderTextColor={colors.textMuted}
                value={registerName}
                onChangeText={(text) => {
                  setRegisterName(text);
                  if (errorText) setErrorText('');
                }}
                maxLength={40}
                autoFocus={true}
              />

              {errorText !== '' && <Text style={styles.errorText}>{errorText}</Text>}
            </View>

            <View style={styles.dialogFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                activeOpacity={0.7}
                onPress={() => setFormModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.submitBtn}
                activeOpacity={0.8}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitBtnText}>
                    {editingRegister ? 'Guardar Cambios' : 'Crear Caja'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </MotiView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={confirmDeleteModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setConfirmDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <MotiView
            from={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={styles.modalDialog}
          >
            <View style={[styles.dialogHeader, { borderBottomWidth: 0, paddingBottom: 0 }]}>
              <View style={styles.warningIconContainer}>
                <AlertTriangle size={rem(22)} color="#DC2626" />
              </View>
              <TouchableOpacity
                onPress={() => setConfirmDeleteModalVisible(false)}
                style={styles.closeBtn}
              >
                <X size={rem(16)} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={[styles.dialogBody, { alignItems: 'center', paddingTop: rem(10) }]}>
              <Text style={styles.deleteConfirmTitle}>¿Eliminar Caja Registradora?</Text>
              <Text style={styles.deleteConfirmText}>
                Esta acción desactivará de forma permanente la caja{' '}
                <Text style={{ fontWeight: 'bold', color: colors.text }}>
                  "{registerToDelete?.name}"
                </Text>
                . No se podrá seleccionar para nuevos turnos de venta, pero su historial contable se mantendrá seguro.
              </Text>
            </View>

            <View style={styles.dialogFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                activeOpacity={0.7}
                onPress={() => setConfirmDeleteModalVisible(false)}
                disabled={submitting}
              >
                <Text style={styles.cancelBtnText}>Conservar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: '#EF4444' }]}
                activeOpacity={0.8}
                onPress={handleDeleteConfirm}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitBtnText}>Eliminar Caja</Text>
                )}
              </TouchableOpacity>
            </View>
          </MotiView>
        </View>
      </Modal>
    </View>
  );
};

const getStyles = (colors: any, mode: string) => StyleSheet.create({
  container: {
    flex: 1,
  },
  tabHeader: {
    paddingHorizontal: rem(10),
    paddingTop: rem(4),
    paddingBottom: rem(6),
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rem(8),
    marginBottom: rem(4),
  },
  tabTitle: {
    fontSize: rem(13.5),
    fontWeight: '900',
    color: colors.text,
    fontFamily: 'Inter-Black',
  },
  tabSubtitle: {
    fontSize: rem(10),
    color: colors.textMuted,
    lineHeight: rem(14),
    fontFamily: 'Inter-Regular',
    marginBottom: rem(10),
  },
  /* Bento grid styling */
  bentoGrid: {
    flexDirection: 'row',
    gap: rem(6),
    paddingHorizontal: 0,
    paddingTop: rem(10),
    paddingBottom: rem(4),
  },
  bentoCard: {
    paddingHorizontal: rem(8),
    paddingVertical: rem(8),
    borderRadius: rem(12),
    gap: rem(2),
  },
  bentoLabel: {
    fontSize: rem(7.5),
    fontWeight: '900',
    color: colors.textMuted,
    letterSpacing: 0.2,
    fontFamily: 'Inter-Bold',
  },
  bentoValue: {
    fontSize: rem(11.5),
    fontWeight: '900',
    color: colors.text,
    fontFamily: 'Inter-Black',
    marginTop: rem(2),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: rem(80),
  },
  loadingText: {
    marginTop: rem(10),
    fontSize: rem(11.5),
    color: colors.textMuted,
    fontFamily: 'Inter-Regular',
  },
  listContainer: {
    paddingHorizontal: rem(10),
    paddingTop: rem(8),
    paddingBottom: rem(80),
  },
  registerCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface, // Slate soft background tint
    paddingHorizontal: rem(12),
    paddingVertical: rem(10),
    borderRadius: rem(14),
    marginBottom: rem(8),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: mode === 'light' ? 0.03 : 0.1,
    shadowRadius: 6,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary, // Indigo brand accent bar on left
  },
  cardInfoCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rem(10),
  },
  coinIconBg: {
    width: rem(32),
    height: rem(32),
    borderRadius: rem(8),
    backgroundColor: mode === 'light' ? '#EEF2FF' : '#1E1B4B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  namesContainer: {
    gap: rem(1),
  },
  regName: {
    fontSize: rem(11.5),
    fontWeight: 'bold',
    color: colors.text,
    fontFamily: 'Inter-Bold',
  },
  regId: {
    fontSize: rem(9),
    color: colors.textMuted,
    fontFamily: 'Inter-Regular',
  },
  cardActionsCol: {
    flexDirection: 'row',
    gap: rem(6),
  },
  iconBtn: {
    width: rem(30),
    height: rem(30),
    borderRadius: rem(8),
    backgroundColor: mode === 'light' ? '#EEF2FF' : '#1E1B4B', // Indigo tint background
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteIconBtn: {
    backgroundColor: mode === 'light' ? '#FEF2F2' : '#7f1d1d', // Red tint background
  },

  /* Floating button */
  floatingAddBtn: {
    position: 'absolute',
    bottom: rem(20),
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.text, // Slate Black in light, White in dark
    paddingVertical: rem(12),
    paddingHorizontal: rem(24),
    borderRadius: rem(20),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  floatingAddBtnText: {
    color: colors.background,
    fontSize: rem(12),
    fontWeight: 'bold',
    fontFamily: 'Inter-Bold',
  },

  /* Empty State */
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: rem(80),
    paddingHorizontal: rem(40),
  },
  emptyTitle: {
    fontSize: rem(13.5),
    fontWeight: 'bold',
    color: colors.text,
    marginTop: rem(12),
    marginBottom: rem(4),
    fontFamily: 'Inter-Bold',
  },
  emptySubtitle: {
    fontSize: rem(10.5),
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: rem(15),
    fontFamily: 'Inter-Regular',
  },

  /* Modal Form / Dialogs */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: rem(20),
  },
  modalDialog: {
    width: '100%',
    maxWidth: rem(340),
    backgroundColor: colors.surface,
    borderRadius: rem(20),
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  dialogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: rem(16),
    paddingVertical: rem(12),
    borderBottomWidth: 1,
    borderBottomColor: mode === 'light' ? '#F1F5F9' : '#334155',
  },
  dialogTitle: {
    fontSize: rem(13),
    fontWeight: 'bold',
    color: colors.text,
    fontFamily: 'Inter-Bold',
  },
  closeBtn: {
    padding: rem(4),
  },
  dialogBody: {
    padding: rem(16),
  },
  inputLabel: {
    fontSize: rem(10.5),
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: rem(6),
    fontFamily: 'Inter-Medium',
  },
  textInput: {
    height: rem(40),
    borderWidth: 1,
    borderColor: mode === 'light' ? '#CBD5E1' : '#475569',
    borderRadius: rem(10),
    paddingHorizontal: rem(10),
    fontSize: rem(12),
    color: colors.text,
    fontFamily: 'Inter-Regular',
    backgroundColor: mode === 'light' ? '#F8FAFC' : '#0F172A',
  },
  textInputError: {
    borderColor: '#EF4444',
    backgroundColor: mode === 'light' ? '#FFF5F5' : '#7f1d1d',
  },
  errorText: {
    fontSize: rem(9.5),
    color: '#EF4444',
    marginTop: rem(6),
    fontFamily: 'Inter-Medium',
  },
  dialogFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: rem(8),
    paddingHorizontal: rem(16),
    paddingBottom: rem(16),
  },
  cancelBtn: {
    paddingVertical: rem(8),
    paddingHorizontal: rem(16),
    borderRadius: rem(10),
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: rem(11.5),
    color: colors.textMuted,
    fontWeight: '600',
    fontFamily: 'Inter-Medium',
  },
  submitBtn: {
    backgroundColor: colors.text,
    paddingVertical: rem(8),
    paddingHorizontal: rem(16),
    borderRadius: rem(10),
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: rem(90),
  },
  submitBtnText: {
    fontSize: rem(11.5),
    color: colors.background,
    fontWeight: 'bold',
    fontFamily: 'Inter-Bold',
  },

  /* Warning elements */
  warningIconContainer: {
    width: rem(44),
    height: rem(44),
    borderRadius: rem(22),
    backgroundColor: mode === 'light' ? '#FFF5F5' : '#7f1d1d',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: rem(8),
  },
  deleteConfirmTitle: {
    fontSize: rem(13.5),
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: rem(6),
    textAlign: 'center',
    fontFamily: 'Inter-Bold',
  },
  deleteConfirmText: {
    fontSize: rem(11),
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: rem(16),
    fontFamily: 'Inter-Regular',
  },
});
