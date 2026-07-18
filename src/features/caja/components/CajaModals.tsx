import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  Linking,
  Alert,
  PanResponder,
  Animated,
  Platform,
} from 'react-native';
import {
  DollarSign,
  Info,
  Lock,
  FileText,
  Coins,
  Scale,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Share2,
  Mail,
  Calendar,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  AlertTriangle,
  Sparkles,
} from 'lucide-react-native';
import { rem } from '@/core/utils/responsive';
import { CurrencyService } from '@/core/services/currencyService';
import { useTheme } from '@/core/theme/theme';

type ClosureStep = 'PREVIEW' | 'COUNTING' | 'VALIDATION' | 'RESULT';

interface CajaModalsProps {
  openModalVisible: boolean;
  setOpenModalVisible: (val: boolean) => void;
  openingAmount: string;
  setOpeningAmount: (val: string) => void;
  handleOpenSession: () => void;
  
  movementModalVisible: boolean;
  setMovementModalVisible: (val: boolean) => void;
  movementType: 'INFLOW' | 'OUTFLOW';
  movementAmount: string;
  setMovementAmount: (val: string) => void;
  movementReason: string;
  setMovementReason: (val: string) => void;
  handleRegisterMovement: () => void;
  
  closeModalVisible: boolean;
  setCloseModalVisible: (val: boolean) => void;
  countedCash: string;
  setCountedCash: (val: string) => void;
  isClosingSubmitting: boolean;
  stats: {
    expected: number;
    start: number;
    salesTotal: number;
    inflows: number;
    outflows: number;
  };
  handleCloseSession: (totalAmount: number, paymentMethods: { method: string; amount: number }[], notes?: string) => Promise<any>;
  handleQuickClose: () => Promise<any>;
  session: any;
  sessionPreview: any;
  paymentMethods?: any[];
  closureMode?: string;
  requirePhotoOnDiff?: boolean;
}

export const CajaModals: React.FC<CajaModalsProps> = ({
  openModalVisible,
  setOpenModalVisible,
  openingAmount,
  setOpeningAmount,
  handleOpenSession,
  
  movementModalVisible,
  setMovementModalVisible,
  movementType,
  movementAmount,
  setMovementAmount,
  movementReason,
  setMovementReason,
  handleRegisterMovement,
  
  closeModalVisible,
  setCloseModalVisible,
  countedCash,
  setCountedCash,
  isClosingSubmitting,
  stats,
  handleCloseSession,
  handleQuickClose,
  session,
  sessionPreview,
  paymentMethods = [],
  closureMode = 'MANUAL',
  requirePhotoOnDiff = false,
}) => {
  const { colors, mode } = useTheme();
  const styles = getStyles(colors, mode);

  // Wizard States
  const [currentStep, setCurrentStep] = useState<ClosureStep>('PREVIEW');
  const [paymentAmounts, setPaymentAmounts] = useState<{ [key: string]: string }>({});
  const [closureResult, setClosureResult] = useState<any>(null);
  const [observations, setObservations] = useState('');

  // Animated values for real-time progressive sliding (translateY)
  const openTranslateY = useRef(new Animated.Value(0)).current;
  const movementTranslateY = useRef(new Animated.Value(0)).current;
  const closeTranslateY = useRef(new Animated.Value(0)).current;

  // Swipe-down pan responders for each modal sheet header
  const openPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          openTranslateY.setValue(gestureState.dy);
        } else {
          openTranslateY.setValue(0);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 120 || gestureState.vy > 0.4) {
          Animated.timing(openTranslateY, {
            toValue: 800,
            duration: 250,
            useNativeDriver: true,
          }).start(() => {
            setOpenModalVisible(false);
          });
        } else {
          Animated.spring(openTranslateY, {
            toValue: 0,
            friction: 6,
            tension: 40,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const movementPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          movementTranslateY.setValue(gestureState.dy);
        } else {
          movementTranslateY.setValue(0);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 120 || gestureState.vy > 0.4) {
          Animated.timing(movementTranslateY, {
            toValue: 800,
            duration: 250,
            useNativeDriver: true,
          }).start(() => {
            setMovementModalVisible(false);
          });
        } else {
          Animated.spring(movementTranslateY, {
            toValue: 0,
            friction: 6,
            tension: 40,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const closePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          closeTranslateY.setValue(gestureState.dy);
        } else {
          closeTranslateY.setValue(0);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 120 || gestureState.vy > 0.4) {
          Animated.timing(closeTranslateY, {
            toValue: 800,
            duration: 250,
            useNativeDriver: true,
          }).start(() => {
            setCloseModalVisible(false);
          });
        } else {
          Animated.spring(closeTranslateY, {
            toValue: 0,
            friction: 6,
            tension: 40,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  // Custom closing transitions to prevent double slide-down native modal flashes
  const closeOpenModalWithAnim = () => {
    Animated.timing(openTranslateY, {
      toValue: 800,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      setOpenModalVisible(false);
    });
  };

  const closeMovementModalWithAnim = () => {
    Animated.timing(movementTranslateY, {
      toValue: 800,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      setMovementModalVisible(false);
    });
  };

  const closeCloseModalWithAnim = () => {
    Animated.timing(closeTranslateY, {
      toValue: 800,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      setCloseModalVisible(false);
    });
  };

  // Entry spring animations when modals are shown
  useEffect(() => {
    if (openModalVisible) {
      openTranslateY.setValue(800);
      Animated.spring(openTranslateY, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }).start();
    }
  }, [openModalVisible]);

  useEffect(() => {
    if (movementModalVisible) {
      movementTranslateY.setValue(800);
      Animated.spring(movementTranslateY, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }).start();
    }
  }, [movementModalVisible]);

  useEffect(() => {
    if (closeModalVisible) {
      closeTranslateY.setValue(800);
      Animated.spring(closeTranslateY, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }).start();
    }
  }, [closeModalVisible]);

  // Reset states when close modal is open
  useEffect(() => {
    if (closeModalVisible) {
      setCurrentStep('PREVIEW');
      const initialAmounts: { [key: string]: string } = {};
      paymentMethods.forEach((pm) => {
        initialAmounts[pm.name] = '';
      });
      setPaymentAmounts(initialAmounts);
      setClosureResult(null);
      setObservations('');
    }
  }, [closeModalVisible, paymentMethods]);

  // Live total physical counted
  const totalCounted = useMemo(() => {
    return Object.values(paymentAmounts).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
  }, [paymentAmounts]);

  // Discrepancy helper
  const expectedValue = stats?.expected || 0;
  const discrepancy = totalCounted - expectedValue;

  const formatMethodLabel = (method: string): string => {
    const mapping: { [key: string]: string } = {
      cash: 'Efectivo',
      card: 'Tarjeta (Crédito/Débito)',
      nequi: 'Nequi',
      daviplata: 'Daviplata',
      transfer: 'Transferencia Bancaria',
    };
    return mapping[method.toLowerCase()] || method;
  };

  // Handle Close Session submission
  const onSubmitClose = async () => {
    const breakdown = (paymentMethods || [])
      .map((pm) => ({
        method: pm.name.toLowerCase(),
        amount: parseFloat(paymentAmounts[pm.name] || '0') || 0,
      }))
      .filter((item) => item.amount > 0);

    try {
      const response = await handleCloseSession(totalCounted, breakdown, observations);
      if (response) {
        setClosureResult(response);
      } else {
        // Fallback mock success object if response is null/flat
        setClosureResult({
          success: true,
          balance: {
            sales_total: stats.salesTotal,
            total_expenses: 0,
            total_inflows: stats.inflows,
            total_outflows: stats.outflows,
            expected_cash: stats.expected,
          },
          difference: totalCounted - stats.expected,
        });
      }
      setCurrentStep('RESULT');
    } catch (err) {
      // Error handled by CajaScreen
    }
  };

  // Handle Quick Close submission
  const onSubmitQuickClose = async () => {
    try {
      const response = await handleQuickClose();
      if (response) {
        setClosureResult(response);
      } else {
        // Fallback mock success object if response is null/flat
        setClosureResult({
          success: true,
          balance: {
            sales_total: stats.salesTotal,
            total_expenses: 0,
            total_inflows: stats.inflows,
            total_outflows: stats.outflows,
            expected_cash: stats.expected,
          },
          difference: 0,
        });
      }
      setCurrentStep('RESULT');
    } catch (err) {
      // Error handled by CajaScreen
    }
  };

  // WhatsApp summary text generator
  const generateSummaryText = () => {
    const b = closureResult?.balance || {
      sales_total: stats.salesTotal,
      total_expenses: 0,
      total_inflows: stats.inflows,
      total_outflows: stats.outflows,
      expected_cash: stats.expected,
    };
    const diff = closureResult?.difference !== undefined ? closureResult.difference : discrepancy;
    const diffText =
      diff === 0
        ? '✅ CUADRADO PERFECTO'
        : diff > 0
        ? `⚠️ SOBRANTE DE ${CurrencyService.format(diff)}`
        : `⚠️ FALTANTE DE ${CurrencyService.format(Math.abs(diff))}`;

    let text = `✨ *IAStock POS - Reporte de Cierre de Caja* ✨\n`;
    text += `------------------------------------\n`;
    text += `*Fecha de Cierre:* ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })}\n`;
    text += `*Estado de Caja:* ${diffText}\n`;
    text += `------------------------------------\n\n`;

    text += `💵 *RESUMEN FINANCIERO*\n`;
    text += `• Base Inicial: ${CurrencyService.format(stats.start)}\n`;
    text += `• Ventas POS: ${CurrencyService.format(b.sales_total)}\n`;
    text += `• Entradas Manuales: ${CurrencyService.format(b.total_inflows || b.inflows_total || 0)}\n`;
    text += `• Salidas Manuales: -${CurrencyService.format(b.total_outflows || b.outflows_total || 0)}\n`;
    text += `• *Efectivo Esperado:* *${CurrencyService.format(b.expected_cash || stats.expected)}*\n`;
    text += `• *Efectivo Contado:* *${CurrencyService.format(totalCounted)}*\n\n`;

    text += `💳 *DESGLOSE DE ARQUEO*:\n`;
    Object.entries(paymentAmounts).forEach(([method, val]) => {
      const amt = parseFloat(val) || 0;
      if (amt > 0) {
        text += `• ${formatMethodLabel(method)}: ${CurrencyService.format(amt)}\n`;
      }
    });

    text += `\n------------------------------------\n`;
    text += `🤖 _Generado automáticamente desde IAStock POS_`;
    return text;
  };

  // Share Actions
  const shareWhatsApp = () => {
    const text = generateSummaryText();
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'No se pudo abrir WhatsApp.');
    });
  };

  const shareEmail = () => {
    const text = generateSummaryText();
    const subject = 'Reporte de Cierre de Caja - IAStock';
    const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'No se pudo abrir la aplicación de Correo.');
    });
  };

  return (
    <>
      {/* ================= MODAL: OPEN TURN ================= */}
      {openModalVisible && (
        <Modal
          visible={openModalVisible}
          transparent
          animationType="none"
          onRequestClose={closeOpenModalWithAnim}
        >
        <View style={styles.modalOverlay}>
          <Animated.View style={[styles.modalSheet, { transform: [{ translateY: openTranslateY }] }]}>
            <View style={styles.dragHeaderContainer} {...openPanResponder.panHandlers}>
              <View style={styles.dragger} />
              <View style={styles.sheetHeader}>
                <View style={styles.titleBadge}>
                  <Coins size={rem(16)} color={colors.primary} />
                </View>
                <Text style={styles.modalSheetTitle}>Apertura de Turno</Text>
              </View>
            </View>
            <Text style={styles.modalSheetSubtitle}>
              Ingresa el efectivo disponible en caja (Base Inicial) para registrar el punto de partida del día.
            </Text>

            <View style={styles.inputWrapper}>
              <DollarSign size={rem(16)} color={colors.primary} style={styles.inputIcon} />
              <TextInput
                style={styles.sheetInput}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
                value={openingAmount}
                onChangeText={setOpeningAmount}
              />
            </View>

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSecondary]}
                activeOpacity={0.7}
                onPress={closeOpenModalWithAnim}
              >
                <Text style={styles.modalBtnTextSecondary}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnPrimary]}
                activeOpacity={0.8}
                onPress={handleOpenSession}
              >
                <Text style={styles.modalBtnTextPrimary}>Abrir Caja</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
      )}

      {/* ================= MODAL: MANUAL MOVEMENT ================= */}
      {movementModalVisible && (
        <Modal
          visible={movementModalVisible}
          transparent
          animationType="none"
          onRequestClose={closeMovementModalWithAnim}
        >
        <View style={styles.modalOverlay}>
          <Animated.View style={[styles.modalSheet, { transform: [{ translateY: movementTranslateY }] }]}>
            <View style={styles.dragHeaderContainer} {...movementPanResponder.panHandlers}>
              <View style={styles.dragger} />
              <View style={styles.sheetHeader}>
                <View style={[styles.titleBadge, { backgroundColor: movementType === 'INFLOW' ? (mode === 'light' ? '#ECFDF5' : '#064E3B') : (mode === 'light' ? '#FEF2F2' : '#7f1d1d') }]}>
                  {movementType === 'INFLOW' ? (
                    <ArrowUpRight size={rem(16)} color="#10B981" />
                  ) : (
                    <ArrowDownLeft size={rem(16)} color="#EF4444" />
                  )}
                </View>
                <Text style={styles.modalSheetTitle}>
                  {movementType === 'INFLOW' ? 'Ingreso Manual' : 'Egreso / Retiro'}
                </Text>
              </View>
            </View>
            <Text style={styles.modalSheetSubtitle}>
              Registra una transacción manual de efectivo fuera del flujo de ventas regulares.
            </Text>

            <View style={styles.inputWrapper}>
              <DollarSign size={rem(16)} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.sheetInput}
                keyboardType="numeric"
                placeholder="Monto"
                placeholderTextColor={colors.textMuted}
                value={movementAmount}
                onChangeText={setMovementAmount}
              />
            </View>

            <View style={[styles.inputWrapper, styles.textAreaInputWrapper]}>
              <TextInput
                style={[styles.sheetInput, styles.textAreaInput]}
                multiline
                numberOfLines={3}
                placeholder="Motivo o descripción detallada..."
                placeholderTextColor={colors.textMuted}
                value={movementReason}
                onChangeText={setMovementReason}
              />
            </View>

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSecondary]}
                activeOpacity={0.7}
                onPress={closeMovementModalWithAnim}
              >
                <Text style={styles.modalBtnTextSecondary}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalBtn,
                  movementType === 'INFLOW' ? styles.modalBtnSuccess : styles.modalBtnError,
                ]}
                activeOpacity={0.8}
                onPress={handleRegisterMovement}
              >
                <Text style={styles.modalBtnTextPrimary}>
                  {movementType === 'INFLOW' ? 'Registrar Ingreso' : 'Registrar Egreso'}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
      )}

      {/* ================= MODAL: CLOSURE WIZARD (MULTI-STEP) ================= */}
      {closeModalVisible && (
        <Modal
          visible={closeModalVisible}
          transparent
          animationType="none"
          onRequestClose={closeCloseModalWithAnim}
        >
        <View style={styles.modalOverlay}>
          <Animated.View style={[styles.modalSheet, styles.wizardSheet, { transform: [{ translateY: closeTranslateY }] }]}>
            <View style={styles.dragHeaderContainer} {...closePanResponder.panHandlers}>
              <View style={styles.dragger} />
            </View>
            
            {/* Steps Progress Indicator */}
            <View style={styles.stepsContainer}>
              <View style={[styles.stepItem, currentStep === 'PREVIEW' && styles.stepActive]}>
                <View style={[styles.stepDot, currentStep === 'PREVIEW' && styles.stepDotActive]}>
                  <FileText size={rem(12)} color={currentStep === 'PREVIEW' ? '#FFFFFF' : colors.textMuted} />
                </View>
                <Text style={[styles.stepLabel, currentStep === 'PREVIEW' && styles.stepLabelActive]}>Resumen</Text>
              </View>

              <View style={styles.stepConnector} />

              <View style={[styles.stepItem, currentStep === 'COUNTING' && styles.stepActive]}>
                <View style={[styles.stepDot, currentStep === 'COUNTING' && styles.stepDotActive]}>
                  <Coins size={rem(12)} color={currentStep === 'COUNTING' ? '#FFFFFF' : colors.textMuted} />
                </View>
                <Text style={[styles.stepLabel, currentStep === 'COUNTING' && styles.stepLabelActive]}>Arqueo</Text>
              </View>

              <View style={styles.stepConnector} />

              <View style={[styles.stepItem, currentStep === 'VALIDATION' && styles.stepActive]}>
                <View style={[styles.stepDot, currentStep === 'VALIDATION' && styles.stepDotActive]}>
                  <Scale size={rem(12)} color={currentStep === 'VALIDATION' ? '#FFFFFF' : colors.textMuted} />
                </View>
                <Text style={[styles.stepLabel, currentStep === 'VALIDATION' && styles.stepLabelActive]}>Validar</Text>
              </View>

              <View style={styles.stepConnector} />

              <View style={[styles.stepItem, currentStep === 'RESULT' && styles.stepActive]}>
                <View style={[styles.stepDot, currentStep === 'RESULT' && styles.stepDotActive]}>
                  <CheckCircle2 size={rem(12)} color={currentStep === 'RESULT' ? '#FFFFFF' : colors.textMuted} />
                </View>
                <Text style={[styles.stepLabel, currentStep === 'RESULT' && styles.stepLabelActive]}>Reporte</Text>
              </View>
            </View>

            <ScrollView 
              showsVerticalScrollIndicator={false}
              style={styles.wizardContentContainer}
              contentContainerStyle={{ paddingBottom: rem(20) }}
            >
              {/* STEP 1: PREVIEW / SESSION STATUS SUMMARY */}
              {currentStep === 'PREVIEW' && (
                <View>
                  <View style={styles.wizardHeaderContainer}>
                    <Text style={styles.modalSheetTitle}>Resumen de Operación</Text>
                    <Text style={styles.modalSheetSubtitle}>
                      {closureMode === 'BLIND'
                        ? 'Política de arqueo a ciegas activa. Sigue los pasos para auditar los recursos del turno.'
                        : 'Analiza el estado teórico calculado por el sistema antes de iniciar el conteo físico de caja.'}
                    </Text>
                  </View>

                  {closureMode === 'BLIND' ? (
                    <View style={styles.blindSecurityBanner}>
                      <View style={styles.blindLockContainer}>
                        <Lock size={rem(24)} color={colors.primary} />
                      </View>
                      <Text style={styles.blindSecurityTitle}>Protección de Datos Activa</Text>
                      <Text style={styles.blindSecuritySubtitle}>
                        Este comercio utiliza la política de <Text style={{ fontWeight: 'bold' }}>Arqueo a Ciegas (Auditoría Protegida)</Text>. Los totales esperados y calculados por el sistema están ocultos para garantizar la transparencia y objetividad del conteo físico de caja.
                      </Text>
                    </View>
                  ) : (
                    <>
                      <View style={styles.statsCardGrid}>
                        <View style={styles.statMiniBox}>
                          <Text style={styles.statMiniLabel}>Base Inicial</Text>
                          <Text style={styles.statMiniVal}>{CurrencyService.format(stats.start)}</Text>
                        </View>
                        <View style={styles.statMiniBox}>
                          <Text style={styles.statMiniLabel}>Ventas Registradas</Text>
                          <Text style={[styles.statMiniVal, { color: '#10B981' }]}>
                            +{CurrencyService.format(stats.salesTotal)}
                          </Text>
                        </View>
                        <View style={styles.statMiniBox}>
                          <Text style={styles.statMiniLabel}>Entradas Manuales</Text>
                          <Text style={[styles.statMiniVal, { color: colors.primary }]}>
                            +{CurrencyService.format(stats.inflows)}
                          </Text>
                        </View>
                        <View style={styles.statMiniBox}>
                          <Text style={styles.statMiniLabel}>Salidas / Gastos</Text>
                          <Text style={[styles.statMiniVal, { color: '#EF4444' }]}>
                            -{CurrencyService.format(stats.outflows)}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.expectedBigCard}>
                        <Text style={styles.expectedCardTitle}>Saldo Teórico Esperado en Caja</Text>
                        <Text style={styles.expectedCardValue}>{CurrencyService.format(stats.expected)}</Text>
                        <View style={styles.policyRow}>
                          <Lock size={rem(12)} color={colors.textMuted} />
                          <Text style={styles.policyText}>
                            Método de control:{' '}
                            <Text style={{ fontWeight: 'bold' }}>
                              {closureMode === 'AUTOMATIC' || closureMode === 'FLASH'
                                ? 'Cierre Rápido Express'
                                : 'Arqueo Manual Completo'}
                            </Text>
                          </Text>
                        </View>
                      </View>
                    </>
                  )}
                </View>
              )}

              {/* STEP 2: PHYSICAL BLIND CASH COUNTING */}
              {currentStep === 'COUNTING' && (
                <View>
                  <View style={styles.wizardHeaderContainer}>
                    <Text style={styles.modalSheetTitle}>Conteo de Caja</Text>
                    <Text style={styles.modalSheetSubtitle}>
                      Ingresa el valor monetario total físico que se encuentra en caja por cada método de pago.
                    </Text>
                  </View>

                  <View style={styles.paymentMethodsInputCol}>
                    {paymentMethods.map((method, index) => (
                      <View key={`${method.id || method.name}-${index}`} style={styles.methodInputCard}>
                        <View style={styles.methodCardHeader}>
                          <View style={styles.methodDot} />
                          <Text style={styles.methodCardLabel}>{method.name}</Text>
                        </View>
                        <View style={[styles.inputWrapper, { marginBottom: 0, marginTop: rem(8) }]}>
                          <DollarSign size={rem(14)} color={colors.textMuted} style={styles.inputIcon} />
                          <TextInput
                            style={styles.sheetInput}
                            keyboardType="numeric"
                            placeholder="0.00"
                            placeholderTextColor={colors.textMuted}
                            value={paymentAmounts[method.name] || ''}
                            onChangeText={(val) => {
                              setPaymentAmounts((prev) => ({
                                ...prev,
                                [method.name]: val,
                              }));
                            }}
                          />
                        </View>
                      </View>
                    ))}
                  </View>

                  <View style={styles.expectedBigCard}>
                    <Text style={styles.expectedCardTitle}>Total Arqueado Físicamente</Text>
                    <Text style={[styles.expectedCardValue, { color: colors.primary }]}>
                      {CurrencyService.format(totalCounted)}
                    </Text>
                  </View>
                </View>
              )}

              {/* STEP 3: DISCREPANCY VALIDATION */}
              {currentStep === 'VALIDATION' && (
                <View>
                  <View style={styles.wizardHeaderContainer}>
                    <Text style={styles.modalSheetTitle}>Validación de Diferencias</Text>
                    <Text style={styles.modalSheetSubtitle}>
                      {closureMode === 'BLIND'
                        ? 'Registra tus observaciones finales para enviar la auditoría de caja.'
                        : 'Compara el total reportado en el conteo físico con el balance esperado del sistema.'}
                    </Text>
                  </View>

                  {closureMode === 'BLIND' ? (
                    <View style={styles.blindSecurityBanner}>
                      <View style={[styles.blindLockContainer, { backgroundColor: mode === 'light' ? '#E0E7FF' : '#1E1B4B' }]}>
                        <Lock size={rem(20)} color={colors.primary} />
                      </View>
                      <Text style={[styles.blindSecurityTitle, { fontSize: rem(13) }]}>Arqueo Registrado con Éxito</Text>
                      <Text style={styles.blindSecuritySubtitle}>
                        La comparación con los saldos teóricos esperados ha sido enviada para auditoría. Los datos detallados y cualquier descuadre se reflejarán únicamente en el reporte final de cierre.
                      </Text>
                    </View>
                  ) : (
                    <>
                      {/* Discrepancy Status Banner */}
                      <View
                        style={[
                          styles.validationStatusBanner,
                          discrepancy === 0
                            ? styles.bannerPerfect
                            : discrepancy > 0
                            ? styles.bannerSobrante
                            : styles.bannerFaltante,
                        ]}
                      >
                        <AlertTriangle
                          size={rem(18)}
                          color={discrepancy === 0 ? '#10B981' : discrepancy > 0 ? '#3B82F6' : '#EF4444'}
                        />
                        <Text
                          style={[
                            styles.bannerText,
                            { color: discrepancy === 0 ? '#10B981' : discrepancy > 0 ? '#3B82F6' : '#EF4444' },
                          ]}
                        >
                          {discrepancy === 0
                            ? 'CAJA PERFECTAMENTE CUADRADA'
                            : discrepancy > 0
                            ? `SOBRANTE DE ${CurrencyService.format(discrepancy)}`
                            : `FALTANTE DE ${CurrencyService.format(Math.abs(discrepancy))}`}
                        </Text>
                      </View>

                      {/* Summary Comparison */}
                      <View style={styles.comparisonTable}>
                        <View style={styles.tableRow}>
                          <Text style={styles.tableLabel}>Saldo Teórico Esperado</Text>
                          <Text style={styles.tableValue}>{CurrencyService.format(stats.expected)}</Text>
                        </View>
                        <View style={styles.tableRow}>
                          <Text style={styles.tableLabel}>Saldo Contado Físico</Text>
                          <Text style={[styles.tableValue, { fontWeight: '900', color: colors.primary }]}>
                            {CurrencyService.format(totalCounted)}
                          </Text>
                        </View>
                        <View style={[styles.tableRow, { borderBottomWidth: 0 }]}>
                          <Text style={styles.tableLabel}>Diferencia / Cuadre</Text>
                          <Text
                            style={[
                              styles.tableValue,
                              {
                                color: discrepancy === 0 ? '#10B981' : discrepancy > 0 ? '#3B82F6' : '#EF4444',
                                fontWeight: 'bold',
                              },
                            ]}
                          >
                            {discrepancy >= 0 ? '+' : ''}
                            {CurrencyService.format(discrepancy)}
                          </Text>
                        </View>
                      </View>

                      {requirePhotoOnDiff && discrepancy !== 0 && (
                        <View style={[styles.blindSecurityBanner, { backgroundColor: mode === 'light' ? '#FFFBEB' : '#78350F', borderColor: mode === 'light' ? '#FDE68A' : '#D97706', marginVertical: rem(8), padding: rem(12) }]}>
                          <AlertTriangle size={rem(18)} color={mode === 'light' ? '#D97706' : '#FBBF24'} style={{ marginBottom: rem(4) }} />
                          <Text style={[styles.blindSecurityTitle, { color: mode === 'light' ? '#78350F' : '#FEF3C7', fontSize: rem(11) }]}>Evidencia Fotográfica Requerida</Text>
                          <Text style={[styles.blindSecuritySubtitle, { color: mode === 'light' ? '#92400E' : '#FDE68A', fontSize: rem(9.5), lineHeight: rem(13) }]}>
                            Se ha detectado un descuadre en caja. El sistema exige adjuntar pruebas o soportes justificativos en la consola de administración en la nube.
                          </Text>
                        </View>
                      )}
                    </>
                  )}

                  {/* Detailed breakdown list */}
                  <Text style={styles.breakdownListTitle}>Desglose de Conteo</Text>
                  <View style={styles.breakdownTable}>
                    {paymentMethods.map((method, index) => {
                      const val = parseFloat(paymentAmounts[method.name]) || 0;
                      return (
                        <View key={`${method.id || method.name}-${index}`} style={styles.breakdownRow}>
                          <Text style={styles.breakdownLabel}>{method.name}</Text>
                          <Text style={styles.breakdownValue}>{CurrencyService.format(val)}</Text>
                        </View>
                      );
                    })}
                  </View>

                  {/* Notes / Observations text box */}
                  <Text style={styles.observationSectionTitle}>Observaciones de Cierre</Text>
                  <View style={[styles.inputWrapper, styles.textAreaInputWrapper, { height: rem(80), marginTop: 0 }]}>
                    <TextInput
                      style={[styles.sheetInput, styles.textAreaInput, { height: rem(65), paddingTop: rem(8) }]}
                      multiline
                      numberOfLines={3}
                      placeholder="Agrega algún comentario, motivo del descuadre, o nota sobre este cierre..."
                      placeholderTextColor={colors.textMuted}
                      value={observations}
                      onChangeText={setObservations}
                    />
                  </View>
                </View>
              )}

              {/* STEP 4: FINAL CLOSED TICKET & REPORTE */}
              {currentStep === 'RESULT' && (
                <View style={styles.ticketContainer}>
                  <View style={styles.ticketSparkleHeader}>
                    <Sparkles size={rem(24)} color="#EAB308" />
                    <Text style={styles.ticketStatusBadge}>TURNO CERRADO CON ÉXITO</Text>
                  </View>

                  {/* PDF Receipt Ticket */}
                  <View style={styles.ticketCard}>
                    <Text style={styles.ticketTitle}>IASTOCK GASTRONÓMICO</Text>
                    <Text style={styles.ticketSubtitle}>Reporte de Arqueo y Cierre</Text>
                    <View style={styles.ticketDivider} />

                    <View style={styles.ticketMetaRow}>
                      <Calendar size={rem(11)} color={colors.textMuted} />
                      <Text style={styles.ticketMetaText}>
                        Fecha: {new Date().toLocaleDateString()}
                      </Text>
                    </View>
                    <View style={[styles.ticketMetaRow, { marginBottom: rem(12) }]}>
                      <Clock size={rem(11)} color={colors.textMuted} />
                      <Text style={styles.ticketMetaText}>
                        Hora: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>

                    <View style={styles.ticketDivider} />

                    <View style={styles.ticketField}>
                      <Text style={styles.ticketFieldLabel}>Efectivo de Apertura</Text>
                      <Text style={styles.ticketFieldValue}>{CurrencyService.format(stats.start)}</Text>
                    </View>
                    <View style={styles.ticketField}>
                      <Text style={styles.ticketFieldLabel}>Ventas POS</Text>
                      <Text style={styles.ticketFieldValue}>{CurrencyService.format(stats.salesTotal)}</Text>
                    </View>
                    <View style={styles.ticketField}>
                      <Text style={styles.ticketFieldLabel}>Entradas Manuales</Text>
                      <Text style={styles.ticketFieldValue}>{CurrencyService.format(stats.inflows)}</Text>
                    </View>
                    <View style={styles.ticketField}>
                      <Text style={styles.ticketFieldLabel}>Salidas / Gastos</Text>
                      <Text style={styles.ticketFieldValue}>-{CurrencyService.format(stats.outflows)}</Text>
                    </View>

                    <View style={styles.ticketDivider} />

                    <View style={[styles.ticketField, { marginTop: rem(4) }]}>
                      <Text style={[styles.ticketFieldLabel, { fontWeight: 'bold', color: colors.text }]}>
                        Total Esperado
                      </Text>
                      <Text style={[styles.ticketFieldValue, { fontWeight: 'bold', color: colors.text }]}>
                        {CurrencyService.format(stats.expected)}
                      </Text>
                    </View>
                    <View style={styles.ticketField}>
                      <Text style={[styles.ticketFieldLabel, { fontWeight: 'bold', color: colors.primary }]}>
                        Total Contado Físico
                      </Text>
                      <Text style={[styles.ticketFieldValue, { fontWeight: 'bold', color: colors.primary }]}>
                        {CurrencyService.format(totalCounted)}
                      </Text>
                    </View>
                    <View style={styles.ticketField}>
                      <Text style={[styles.ticketFieldLabel, { fontWeight: 'bold', color: colors.text }]}>Diferencia / Cuadre</Text>
                      <Text
                        style={[
                          styles.ticketFieldValue,
                          {
                            fontWeight: 'bold',
                            color: discrepancy === 0 ? '#10B981' : discrepancy > 0 ? '#3B82F6' : '#EF4444',
                          },
                        ]}
                      >
                        {discrepancy >= 0 ? '+' : ''}
                        {CurrencyService.format(discrepancy)}
                      </Text>
                    </View>

                    <View style={styles.ticketDivider} />
                    <View style={styles.ticketFooterCircleLeft} />
                    <View style={styles.ticketFooterCircleRight} />
                    <Text style={styles.ticketFooterText}>¡Turno Cuadrado y Asegurado con IAStock!</Text>
                  </View>

                  {/* Share widgets */}
                  <Text style={styles.shareTitle}>Compartir Reporte de Caja</Text>
                  <View style={styles.shareButtonsRow}>
                    <TouchableOpacity
                      style={[styles.shareBtn, styles.shareBtnWhatsapp]}
                      activeOpacity={0.8}
                      onPress={shareWhatsApp}
                    >
                      <Share2 size={rem(14)} color="#FFFFFF" style={{ marginRight: rem(4) }} />
                      <Text style={styles.shareBtnText}>WhatsApp</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.shareBtn, styles.shareBtnEmail]}
                      activeOpacity={0.8}
                      onPress={shareEmail}
                    >
                      <Mail size={rem(14)} color="#FFFFFF" style={{ marginRight: rem(4) }} />
                      <Text style={styles.shareBtnText}>Correo</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Wizard Navigation Footer Actions */}
            <View style={styles.wizardFooterRow}>
              {currentStep === 'PREVIEW' && (
                <>
                  <TouchableOpacity
                    style={[styles.modalBtn, styles.modalBtnSecondary]}
                    activeOpacity={0.7}
                    onPress={closeCloseModalWithAnim}
                    disabled={isClosingSubmitting}
                  >
                    <Text style={styles.modalBtnTextSecondary}>Atrás</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalBtn, styles.modalBtnPrimary]}
                    activeOpacity={0.8}
                    onPress={() => {
                      if (closureMode === 'AUTOMATIC' || closureMode === 'FLASH') {
                        onSubmitQuickClose();
                      } else {
                        setCurrentStep('COUNTING');
                      }
                    }}
                    disabled={isClosingSubmitting}
                  >
                    {isClosingSubmitting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Text style={styles.modalBtnTextPrimary}>
                          {closureMode === 'AUTOMATIC' || closureMode === 'FLASH'
                            ? 'Cierre Turno Express'
                            : 'Iniciar Conteo'}
                        </Text>
                        <ChevronRight size={rem(14)} color="#FFFFFF" style={{ marginLeft: rem(4) }} />
                      </>
                    )}
                  </TouchableOpacity>
                </>
              )}

              {currentStep === 'COUNTING' && (
                <>
                  <TouchableOpacity
                    style={[styles.modalBtn, styles.modalBtnSecondary]}
                    activeOpacity={0.7}
                    onPress={() => setCurrentStep('PREVIEW')}
                  >
                    <ChevronLeft size={rem(14)} color={colors.textMuted} style={{ marginRight: rem(4) }} />
                    <Text style={styles.modalBtnTextSecondary}>Atrás</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalBtn, styles.modalBtnPrimary]}
                    activeOpacity={0.8}
                    onPress={() => setCurrentStep('VALIDATION')}
                  >
                    <Text style={styles.modalBtnTextPrimary}>Verificar Diferencias</Text>
                    <ChevronRight size={rem(14)} color="#FFFFFF" style={{ marginLeft: rem(4) }} />
                  </TouchableOpacity>
                </>
              )}

              {currentStep === 'VALIDATION' && (
                <>
                  <TouchableOpacity
                    style={[styles.modalBtn, styles.modalBtnSecondary]}
                    activeOpacity={0.7}
                    onPress={() => setCurrentStep('COUNTING')}
                    disabled={isClosingSubmitting}
                  >
                    <ChevronLeft size={rem(14)} color={colors.textMuted} style={{ marginRight: rem(4) }} />
                    <Text style={styles.modalBtnTextSecondary}>Atrás</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalBtn, styles.modalBtnPrimary]}
                    activeOpacity={0.8}
                    onPress={onSubmitClose}
                    disabled={isClosingSubmitting}
                  >
                    {isClosingSubmitting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Lock size={rem(14)} color="#FFFFFF" style={{ marginRight: rem(4) }} />
                        <Text style={styles.modalBtnTextPrimary}>Confirmar y Cerrar</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              )}

              {currentStep === 'RESULT' && (
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnPrimary, { width: '100%' }]}
                  activeOpacity={0.8}
                  onPress={closeCloseModalWithAnim}
                >
                  <Text style={styles.modalBtnTextPrimary}>Finalizar</Text>
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>
        </View>
      </Modal>
      )}
    </>
  );
};

const getStyles = (colors: any, mode: string) => StyleSheet.create({
  /* Modals Sheet Styling */
  dragHeaderContainer: {
    alignItems: 'center',
    paddingVertical: rem(6),
    marginTop: rem(-10),
    marginBottom: rem(4),
    width: '100%',
  },
  dragger: {
    width: rem(45),
    height: rem(5),
    backgroundColor: mode === 'light' ? '#E2E8F0' : '#475569',
    borderRadius: rem(2.5),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)', // Slate 900 transparent
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: rem(25),
    borderTopRightRadius: rem(25),
    padding: rem(22),
    ...Platform.select({
      ios: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: -4 }, shadowOpacity: mode === 'light' ? 0.12 : 0.3, shadowRadius: 12 },
      android: { elevation: 10 },
    }),
  },
  wizardSheet: {
    height: '82%', // Expanded size for step wizard
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rem(10),
    marginBottom: rem(10),
  },
  titleBadge: {
    padding: rem(8),
    borderRadius: rem(12),
    backgroundColor: mode === 'light' ? '#EEF2FF' : '#1E1B4B',
  },
  modalSheetTitle: {
    fontSize: rem(17),
    fontWeight: '900',
    color: colors.text,
    fontFamily: 'Inter-Black',
  },
  modalSheetSubtitle: {
    fontSize: rem(11),
    color: colors.textMuted,
    lineHeight: rem(15),
    marginBottom: rem(18),
    fontFamily: 'Inter-Regular',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: mode === 'light' ? '#E2E8F0' : '#334155',
    borderRadius: rem(12),
    paddingHorizontal: rem(12),
    height: rem(46),
    marginBottom: rem(12),
  },
  textAreaInputWrapper: {
    height: rem(80),
    alignItems: 'flex-start',
    paddingVertical: rem(8),
  },
  inputIcon: {
    marginRight: rem(8),
  },
  sheetInput: {
    flex: 1,
    fontSize: rem(13),
    color: colors.text,
    fontFamily: 'Inter-Regular',
    fontWeight: '500',
  },
  textAreaInput: {
    height: rem(65),
    textAlignVertical: 'top',
    paddingVertical: rem(4),
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: rem(10),
    marginTop: rem(10),
  },
  modalBtn: {
    flex: 1,
    height: rem(44),
    borderRadius: rem(12),
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  modalBtnPrimary: {
    backgroundColor: colors.primary,
  },
  modalBtnSecondary: {
    backgroundColor: mode === 'light' ? '#F1F5F9' : '#334155',
  },
  modalBtnSuccess: {
    backgroundColor: '#10B981',
  },
  modalBtnError: {
    backgroundColor: '#EF4444',
  },
  modalBtnTextPrimary: {
    color: '#FFFFFF',
    fontSize: rem(12),
    fontWeight: 'bold',
    fontFamily: 'Inter-Bold',
  },
  modalBtnTextSecondary: {
    color: colors.textMuted,
    fontSize: rem(12),
    fontWeight: 'bold',
    fontFamily: 'Inter-Bold',
  },

  /* STEP PROGRESS INDICATOR */
  stepsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: rem(18),
    paddingHorizontal: rem(5),
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
  },
  stepActive: {},
  stepDot: {
    width: rem(26),
    height: rem(26),
    borderRadius: rem(13),
    backgroundColor: mode === 'light' ? '#F1F5F9' : '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: rem(4),
    borderWidth: 1.5,
    borderColor: mode === 'light' ? '#E2E8F0' : '#475569',
  },
  stepDotActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  stepLabel: {
    fontSize: rem(9),
    color: colors.textMuted,
    fontFamily: 'Inter-Bold',
    fontWeight: 'bold',
  },
  stepLabelActive: {
    color: colors.primary,
  },
  stepConnector: {
    height: 1.5,
    backgroundColor: mode === 'light' ? '#E2E8F0' : '#475569',
    flex: 0.5,
    marginTop: rem(-15),
  },

  /* WIZARD SCREENS STYLE */
  wizardContentContainer: {
    flex: 1,
  },
  wizardHeaderContainer: {
    marginBottom: rem(15),
  },
  statsCardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rem(8),
    marginBottom: rem(12),
  },
  statMiniBox: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: rem(12),
    padding: rem(10),
    borderWidth: 1,
    borderColor: mode === 'light' ? '#E2E8F0' : '#334155',
  },
  statMiniLabel: {
    fontSize: rem(9),
    color: colors.textMuted,
    fontFamily: 'Inter-Regular',
    marginBottom: rem(2),
  },
  statMiniVal: {
    fontSize: rem(12),
    color: colors.text,
    fontFamily: 'Inter-Bold',
    fontWeight: 'bold',
  },
  expectedBigCard: {
    backgroundColor: mode === 'light' ? '#EEF2FF' : '#1E1B4B',
    borderRadius: rem(14),
    padding: rem(16),
    alignItems: 'center',
    marginTop: rem(5),
    borderWidth: 1,
    borderColor: mode === 'light' ? '#DCE2FF' : '#312E81',
  },
  expectedCardTitle: {
    fontSize: rem(11),
    color: colors.primary,
    fontFamily: 'Inter-Bold',
    fontWeight: 'bold',
    marginBottom: rem(4),
  },
  expectedCardValue: {
    fontSize: rem(24),
    color: mode === 'light' ? '#1E1B4B' : '#EEF2FF',
    fontFamily: 'Inter-Black',
    fontWeight: '900',
    marginBottom: rem(6),
  },
  policyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rem(4),
  },
  policyText: {
    fontSize: rem(9),
    color: colors.textMuted,
    fontFamily: 'Inter-Regular',
  },
  wizardFooterRow: {
    flexDirection: 'row',
    gap: rem(10),
    borderTopWidth: 1.5,
    borderTopColor: mode === 'light' ? '#F1F5F9' : '#334155',
    paddingTop: rem(12),
  },

  /* COUNTING STEP */
  paymentMethodsInputCol: {
    gap: rem(10),
    marginBottom: rem(15),
  },
  methodInputCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: mode === 'light' ? '#E2E8F0' : '#334155',
    borderRadius: rem(12),
    padding: rem(12),
  },
  methodCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rem(6),
  },
  methodDot: {
    width: rem(6),
    height: rem(6),
    borderRadius: rem(3),
    backgroundColor: colors.primary,
  },
  methodCardLabel: {
    fontSize: rem(11),
    color: colors.text,
    fontFamily: 'Inter-Bold',
    fontWeight: 'bold',
  },

  /* VALIDATION STEP */
  validationStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rem(8),
    padding: rem(12),
    borderRadius: rem(12),
    marginBottom: rem(15),
  },
  bannerPerfect: {
    backgroundColor: mode === 'light' ? '#ECFDF5' : '#064E3B',
    borderWidth: 1,
    borderColor: mode === 'light' ? '#A7F3D0' : '#059669',
  },
  bannerSobrante: {
    backgroundColor: mode === 'light' ? '#EFF6FF' : '#1E3A8A',
    borderWidth: 1,
    borderColor: mode === 'light' ? '#BFDBFE' : '#2563EB',
  },
  bannerFaltante: {
    backgroundColor: mode === 'light' ? '#FEF2F2' : '#7f1d1d',
    borderWidth: 1,
    borderColor: mode === 'light' ? '#FCA5A5' : '#DC2626',
  },
  bannerText: {
    fontSize: rem(10),
    fontWeight: '900',
    fontFamily: 'Inter-Black',
    letterSpacing: 0.5,
  },
  comparisonTable: {
    backgroundColor: colors.surface,
    borderRadius: rem(12),
    padding: rem(14),
    borderWidth: 1,
    borderColor: mode === 'light' ? '#E2E8F0' : '#334155',
    marginBottom: rem(15),
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: rem(8),
    borderBottomWidth: 1,
    borderBottomColor: mode === 'light' ? '#F1F5F9' : '#334155',
  },
  tableLabel: {
    fontSize: rem(11),
    color: colors.textMuted,
    fontFamily: 'Inter-Medium',
  },
  tableValue: {
    fontSize: rem(12),
    color: colors.text,
    fontFamily: 'Inter-Bold',
    fontWeight: 'bold',
  },
  breakdownListTitle: {
    fontSize: rem(11),
    fontWeight: 'bold',
    color: colors.text,
    fontFamily: 'Inter-Bold',
    marginBottom: rem(8),
  },
  breakdownTable: {
    backgroundColor: colors.surface,
    borderRadius: rem(12),
    borderWidth: 1,
    borderColor: mode === 'light' ? '#E2E8F0' : '#334155',
    overflow: 'hidden',
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: rem(10),
    borderBottomWidth: 1,
    borderBottomColor: mode === 'light' ? '#F1F5F9' : '#334155',
  },
  breakdownLabel: {
    fontSize: rem(10),
    color: colors.textMuted,
    fontFamily: 'Inter-Regular',
  },
  breakdownValue: {
    fontSize: rem(10),
    color: colors.text,
    fontFamily: 'Inter-Medium',
    fontWeight: 'bold',
  },

  /* RESULT STEP / TICKET STYLE */
  ticketContainer: {
    alignItems: 'center',
    paddingTop: rem(10),
  },
  ticketSparkleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rem(6),
    marginBottom: rem(14),
  },
  ticketStatusBadge: {
    fontSize: rem(11),
    fontWeight: '900',
    color: '#854D0E',
    backgroundColor: '#FEF9C3',
    paddingHorizontal: rem(10),
    paddingVertical: rem(4),
    borderRadius: rem(8),
    fontFamily: 'Inter-Black',
    letterSpacing: 0.5,
  },
  ticketCard: {
    backgroundColor: mode === 'light' ? '#FFFFFF' : '#0F172A',
    borderWidth: 1.5,
    borderColor: mode === 'light' ? '#CBD5E1' : '#475569',
    borderRadius: rem(16),
    padding: rem(18),
    width: '100%',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: mode === 'light' ? 0.05 : 0.2, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
    position: 'relative',
  },
  ticketTitle: {
    fontSize: rem(14),
    fontWeight: '900',
    textAlign: 'center',
    color: colors.text,
    fontFamily: 'Inter-Black',
    letterSpacing: 1,
  },
  ticketSubtitle: {
    fontSize: rem(9),
    textAlign: 'center',
    color: colors.textMuted,
    fontFamily: 'Inter-Medium',
    marginTop: rem(2),
    marginBottom: rem(10),
  },
  ticketDivider: {
    height: 1,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: colors.textMuted,
    marginVertical: rem(10),
  },
  ticketMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rem(6),
    justifyContent: 'center',
  },
  ticketMetaText: {
    fontSize: rem(9),
    color: colors.textMuted,
    fontFamily: 'Inter-Regular',
  },
  ticketField: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: rem(4),
  },
  ticketFieldLabel: {
    fontSize: rem(10),
    color: colors.textMuted,
    fontFamily: 'Inter-Medium',
  },
  ticketFieldValue: {
    fontSize: rem(10),
    color: colors.text,
    fontFamily: 'Inter-Bold',
    fontWeight: 'bold',
  },
  ticketFooterCircleLeft: {
    position: 'absolute',
    left: rem(-8),
    bottom: rem(40),
    width: rem(16),
    height: rem(16),
    borderRadius: rem(8),
    backgroundColor: colors.background, // matches sheet background visually
    borderRightWidth: 1.5,
    borderRightColor: mode === 'light' ? '#CBD5E1' : '#475569',
  },
  ticketFooterCircleRight: {
    position: 'absolute',
    right: rem(-8),
    bottom: rem(40),
    width: rem(16),
    height: rem(16),
    borderRadius: rem(8),
    backgroundColor: colors.background,
    borderLeftWidth: 1.5,
    borderLeftColor: mode === 'light' ? '#CBD5E1' : '#475569',
  },
  ticketFooterText: {
    fontSize: rem(9),
    color: colors.textMuted,
    textAlign: 'center',
    fontFamily: 'Inter-Medium',
    marginTop: rem(15),
  },
  shareTitle: {
    fontSize: rem(11),
    fontWeight: 'bold',
    color: colors.textMuted,
    fontFamily: 'Inter-Bold',
    marginTop: rem(18),
    marginBottom: rem(8),
  },
  shareButtonsRow: {
    flexDirection: 'row',
    gap: rem(8),
    width: '100%',
  },
  shareBtn: {
    flex: 1,
    height: rem(38),
    borderRadius: rem(10),
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  shareBtnWhatsapp: {
    backgroundColor: '#25D366',
  },
  shareBtnEmail: {
    backgroundColor: '#DC2626',
  },
  shareBtnText: {
    color: '#FFFFFF',
    fontSize: rem(11),
    fontWeight: 'bold',
    fontFamily: 'Inter-Bold',
  },
  blindSecurityBanner: {
    backgroundColor: mode === 'light' ? '#EEF2FF' : '#1E1B4B',
    borderRadius: rem(16),
    padding: rem(20),
    borderWidth: 1.5,
    borderColor: mode === 'light' ? '#C7D2FE' : '#312E81',
    alignItems: 'center',
    marginVertical: rem(15),
  },
  blindLockContainer: {
    backgroundColor: mode === 'light' ? '#E0E7FF' : '#312E81',
    width: rem(48),
    height: rem(48),
    borderRadius: rem(24),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: rem(12),
  },
  blindSecurityTitle: {
    fontSize: rem(14),
    fontFamily: 'Inter-Bold',
    fontWeight: 'bold',
    color: mode === 'light' ? '#312E81' : '#EEF2FF',
    marginBottom: rem(8),
    textAlign: 'center',
  },
  blindSecuritySubtitle: {
    fontSize: rem(11),
    fontFamily: 'Inter-Regular',
    color: mode === 'light' ? '#4338CA' : '#C7D2FE',
    textAlign: 'center',
    lineHeight: rem(16),
  },
  observationSectionTitle: {
    fontSize: rem(11),
    fontFamily: 'Inter-Bold',
    fontWeight: 'bold',
    color: colors.text,
    marginTop: rem(15),
    marginBottom: rem(6),
  },
});
