import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView, AnimatePresence } from 'moti';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  ArrowLeft,
  Banknote,
  CreditCard,
  Smartphone,
  Camera,
  Calendar,
  X,
  CheckCircle,
  Percent,
  DollarSign,
  Wallet,
  ChevronDown,
  ChevronUp,
  Cpu,
  Trash2,
  Plus,
  Info
} from 'lucide-react-native';
import { useAppDispatch, useAppSelector } from '@/core/store/store';
import { finalizeOrder, updateOrderDiscount } from '@/core/store/slices/cartSlice';
import { CurrencyService } from '@/core/services/currencyService';
import { rem } from '@/core/utils/responsive';
import { PosService } from '@/infrastructure/services/posService';
import { useStatusModal } from '@/core/context/StatusModalContext';
import { useTheme } from '@/core/theme/theme';

interface CheckoutScreenProps {
  onBack: () => void;
}

const BILLS = [100000, 50000, 20000, 10000, 5000, 2000, 1000];

export const CheckoutScreen = ({ onBack }: CheckoutScreenProps) => {
  const dispatch = useAppDispatch();
  const { showStatus } = useStatusModal();
  const { colors, mode } = useTheme();
  const styles = getStyles(colors, mode);
  
  const { total, pendingOrders, tableOrders, activeOrderId, discount: cartDiscount } = useAppSelector(state => state.cart);
  const { selectedRegisterId } = useAppSelector(state => state.pos);
  
  const activeOrder = pendingOrders.find(o => o.id === activeOrderId) || tableOrders.find(o => o.id === activeOrderId);
  const baseTotal = total + (activeOrder?.total || 0);

  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingMethods, setIsLoadingMethods] = useState(true);

  // Dynamic Payment Methods
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  
  // Amounts stored by method ID: { [methodId]: amount }
  const [amounts, setAmounts] = useState<Record<string, number>>({});
  
  // Quick Input State for cash methods (methodId -> quickStr)
  const [quickReceivedStrs, setQuickReceivedStrs] = useState<Record<string, string>>({});

  // Discount State
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>(() => {
    return cartDiscount ? (cartDiscount.type.toLowerCase() as 'percentage' | 'fixed') : 'percentage';
  });
  const [discountValue, setDiscountValue] = useState(() => {
    return cartDiscount ? cartDiscount.value : 0;
  });

  // Synchronize changes back to Redux cartState discount
  useEffect(() => {
    dispatch(updateOrderDiscount(discountValue > 0 ? { type: discountType.toUpperCase() as 'FIXED' | 'PERCENTAGE', value: discountValue } : null));
  }, [discountType, discountValue, dispatch]);

  // Extras
  const [notes, setNotes] = useState('');
  const [manualDate, setManualDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);

  // Expanded method for Nano Calc (Accordion)
  const [expandedMethodId, setExpandedMethodId] = useState<string | null>(null);

  // Fetch Payment Methods
  useEffect(() => {
    const fetchMethods = async () => {
      try {
        const methods = await PosService.getPaymentMethods();
        
        // Ensure CASH or EFECTIVO is always the first item in the list
        const sortedMethods = [...methods].sort((a, b) => {
          const aIsCash = a.type === 'CASH' || a.name?.toUpperCase().includes('EFECTIVO');
          const bIsCash = b.type === 'CASH' || b.name?.toUpperCase().includes('EFECTIVO');
          if (aIsCash && !bIsCash) return -1;
          if (!aIsCash && bIsCash) return 1;
          return 0;
        });

        setPaymentMethods(sortedMethods);
        
        // Expand cash method by default
        const cashMethod = sortedMethods.find(m => m.type === 'CASH' || m.name?.toUpperCase().includes('EFECTIVO'));
        if (cashMethod) setExpandedMethodId(cashMethod.id);

      } catch (error) {
        console.error('Error loading payment methods', error);
      } finally {
        setIsLoadingMethods(false);
      }
    };
    fetchMethods();
  }, []);

  // Computed values
  const finalTotal = useMemo(() => {
    let result = baseTotal;
    if (discountType === 'percentage') {
      result -= result * (discountValue / 100);
    } else {
      result -= discountValue;
    }
    return Math.max(0, result);
  }, [baseTotal, discountType, discountValue]);

  const totalPaid = useMemo(() => {
    return Object.values(amounts).reduce((sum, val) => sum + (val || 0), 0);
  }, [amounts]);

  const remaining = Math.max(0, finalTotal - totalPaid);
  const changeAmount = Math.max(0, totalPaid - finalTotal);

  const triggerHaptic = (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) => {
    Haptics.impactAsync(style);
  };

  const handleQuickAdd = (methodId: string, val: number) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    setAmounts(prev => ({
      ...prev,
      [methodId]: (prev[methodId] || 0) + val
    }));
    setQuickReceivedStrs(prev => ({ ...prev, [methodId]: '' }));
  };

  const setExactForMethod = (methodId: string) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
    if (remaining > 0) {
      setAmounts(prev => ({
        ...prev,
        [methodId]: (prev[methodId] || 0) + remaining
      }));
    }
  };

  const formatNumberInput = (num: number) => {
    if (!num) return '';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const parseNumberInput = (str: string) => {
    return parseInt(str.replace(/\D/g, ''), 10) || 0;
  };

  const handleMethodInput = (methodId: string, val: string) => {
    setAmounts(prev => ({
      ...prev,
      [methodId]: parseNumberInput(val)
    }));
  };

  const handleQuickStrChange = (methodId: string, val: string) => {
    setQuickReceivedStrs(prev => ({ ...prev, [methodId]: val }));
    handleMethodInput(methodId, val);
  };

  // Helper to strip COP decimals (.00) to save space
  const formatCompactPrice = (val: number) => {
    const formatted = CurrencyService.format(val);
    if (formatted.endsWith(',00') || formatted.endsWith('.00')) {
      return formatted.slice(0, -3);
    }
    return formatted;
  };

  const handlePickImage = async () => {
    triggerHaptic();
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      setPhotos(prev => [...prev, result.assets[0].uri]);
    }
  };

  const handleConfirm = async () => {
    if (remaining > 0.01) {
      showStatus({
        type: 'warning',
        title: 'Saldo Pendiente',
        message: 'Debe cubrir el total para cobrar.'
      });
      return;
    }
    triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
    setIsProcessing(true);

    try {
      const payload_payment_methods = [];
      let currentChange = changeAmount;

      for (const method of paymentMethods) {
        let amount = amounts[method.id] || 0;
        if (amount > 0) {
          const isCash = method.type === 'CASH' || method.name?.toUpperCase().includes('EFECTIVO');
          if (isCash && currentChange > 0) {
            const deduction = Math.min(amount, currentChange);
            amount -= deduction;
            currentChange -= deduction;
          }

          if (amount > 0) {
            payload_payment_methods.push({ 
              name: method.name, 
              type: method.type || 'UNKNOWN', 
              monto: amount 
            });
          }
        }
      }

      const payload = {
        cash_register_id: selectedRegisterId || 'MOBILE-POS-01',
        payment_methods: payload_payment_methods,
        notas: notes,
        manual_date: manualDate?.toISOString(),
        photos,
        discount: { type: discountType, value: discountValue }
      };

      await dispatch(finalizeOrder(payload) as any).unwrap();
      showStatus({
        type: 'success',
        title: '¡Éxito!',
        message: 'Pago procesado correctamente.',
        onClose: onBack
      });
    } catch (e) {
      showStatus({
        type: 'error',
        title: 'Error de Procesamiento',
        message: 'Hubo un problema al procesar el cobro.'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getMethodIcon = (type: string, color: string) => {
    switch (type) {
      case 'CASH': return <Banknote size={rem(18)} color={color} />;
      case 'CARD': return <CreditCard size={rem(18)} color={color} />;
      case 'TRANSFER': return <Smartphone size={rem(18)} color={color} />;
      default: return <Wallet size={rem(18)} color={color} />;
    }
  };



  const [showAllMethods, setShowAllMethods] = useState(false);
  const visibleMethods = showAllMethods 
    ? paymentMethods 
    : paymentMethods.filter(m => m.type === 'CASH' || m.name?.toUpperCase().includes('EFECTIVO'));

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        
        {/* Flat Bottom Header (Fixes iOS scroll transparent gap overlap bugs) */}
        <LinearGradient colors={['#1E1B4B', '#312E81', '#4F46E5']} style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
              <ArrowLeft color="#FFF" size={rem(20)} />
            </TouchableOpacity>
            
            {/* Synthetic Vector Logo */}
            <MotiView 
              from={{ opacity: 0, scale: 0.9 }} 
              animate={{ opacity: 1, scale: 1 }} 
              style={styles.logoContainer}
            >
              <View style={styles.logoIconBg}>
                <Cpu size={rem(12)} color="#FFF" />
              </View>
              <Text style={styles.logoText}>
                <Text style={styles.logoTextIA}>IA</Text>
                <Text style={styles.logoTextStock}>Stock</Text>
              </Text>
            </MotiView>
          </View>

          {/* Glowing Metrics Widgets */}
          <View style={styles.metricsContainer}>
            <MotiView 
              from={{ opacity: 0, translateY: 10 }} 
              animate={{ opacity: 1, translateY: 0 }}
              style={styles.metricCard}
            >
              <Text style={styles.metricLabel} numberOfLines={1}>TOTAL A PAGAR</Text>
              <Text 
                style={styles.metricValueFinal} 
                adjustsFontSizeToFit={true} 
                numberOfLines={1} 
                minimumFontScale={0.5}
              >
                {formatCompactPrice(finalTotal)}
              </Text>
              <View style={styles.glowOverlayIndigo} />
            </MotiView>
            
            <MotiView 
              from={{ opacity: 0, translateY: 10 }} 
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ delay: 50 }}
              style={[styles.metricCard, remaining > 0 ? styles.metricCardPending : styles.metricCardSuccess]}
            >
              <View style={styles.statusIndicatorRow}>
                <View style={[styles.statusIndicatorDot, { backgroundColor: remaining > 0 ? '#F59E0B' : '#10B981' }]} />
                <Text style={[styles.metricLabel, remaining > 0 ? { color: mode === 'light' ? '#B45309' : '#F59E0B' } : { color: mode === 'light' ? '#047857' : '#10B981' }]} numberOfLines={1}>
                  {remaining > 0 ? 'RESTANTE' : 'COMPLETADO'}
                </Text>
              </View>
              <Text 
                style={[styles.metricValueRemaining, remaining > 0 ? { color: mode === 'light' ? '#B45309' : '#F59E0B' } : { color: mode === 'light' ? '#047857' : '#10B981' }]} 
                adjustsFontSizeToFit={true} 
                numberOfLines={1} 
                minimumFontScale={0.5}
              >
                {remaining > 0 ? formatCompactPrice(remaining) : formatCompactPrice(totalPaid)}
              </Text>
              {remaining === 0 && <View style={styles.glowOverlaySuccess} />}
            </MotiView>
          </View>
        </LinearGradient>

        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          
          {/* Methods Section */}
          <View style={styles.methodsSection}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>MÉTODO DE COBRO</Text>
              <Info size={rem(14)} color={colors.textMuted} />
            </View>
            
            {isLoadingMethods ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: rem(20) }} />
            ) : (
              <View style={styles.methodsList}>
                {visibleMethods.map((method, idx) => {
                  const isCash = method.type === 'CASH' || method.name?.toUpperCase().includes('EFECTIVO');
                  const amount = amounts[method.id] || 0;
                  const isExpanded = expandedMethodId === method.id;

                  let typeThemeColor = colors.primary;
                  if (isCash) typeThemeColor = '#10B981';
                  if (method.type === 'CARD') typeThemeColor = '#3B82F6';
                  if (method.type === 'TRANSFER') typeThemeColor = '#8B5CF6';

                  return (
                    <MotiView 
                      key={method.id} 
                      style={[styles.denseMethodCard, amount > 0 && { borderColor: typeThemeColor }]} 
                      animate={{ 
                        scale: isExpanded ? 1.01 : 1,
                        backgroundColor: amount > 0 ? (mode === 'light' ? '#F8FAFC' : '#1E293B') : colors.surface,
                        shadowOpacity: isExpanded ? 0.08 : 0.03
                      }}
                      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    >
                      <View style={[styles.leftColorAccent, { backgroundColor: amount > 0 ? typeThemeColor : (mode === 'light' ? '#E2E8F0' : '#334155') }]} />

                      <View style={styles.methodRow}>
                        {/* Left Info Column */}
                        <TouchableOpacity 
                          style={styles.methodInfo} 
                          onPress={() => {
                            triggerHaptic();
                            setExpandedMethodId(isExpanded ? null : method.id);
                          }}
                          activeOpacity={0.7}
                        >
                          <MotiView 
                            animate={{ scale: isExpanded ? 1.05 : 1 }}
                            style={[
                              styles.iconBox, 
                              amount > 0 ? { backgroundColor: typeThemeColor } : { backgroundColor: mode === 'light' ? '#F1F5F9' : '#1E293B' }
                            ]}
                          >
                            {getMethodIcon(method.type, amount > 0 ? '#FFF' : colors.textMuted)}
                          </MotiView>
                          <View style={styles.methodTextContainer}>
                            <Text style={[styles.methodName, amount > 0 && { color: colors.text, fontWeight: '800' }]} numberOfLines={1}>
                              {method.name}
                            </Text>
                            <Text style={styles.methodSubtitle} numberOfLines={1}>
                              {isCash ? 'Ver teclado rápido' : 'Entrada digital'}
                            </Text>
                          </View>
                        </TouchableOpacity>

                        {/* Right Actions Column */}
                        <View style={styles.methodActions}>
                          <AnimatePresence>
                            {amount > 0 && (
                              <MotiView 
                                from={{ opacity: 0, scale: 0.6 }} 
                                animate={{ opacity: 1, scale: 1 }} 
                                exit={{ opacity: 0, scale: 0.6 }}
                              >
                                <TouchableOpacity 
                                  style={styles.denseClearBtn} 
                                  onPress={() => {
                                    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
                                    setAmounts(prev => {
                                      const next = { ...prev };
                                      delete next[method.id];
                                      return next;
                                    });
                                    setQuickReceivedStrs(prev => {
                                      const next = { ...prev };
                                      delete next[method.id];
                                      return next;
                                    });
                                  }}
                                  activeOpacity={0.6}
                                >
                                  <Trash2 size={rem(14)} color="#EF4444" />
                                </TouchableOpacity>
                              </MotiView>
                            )}
                          </AnimatePresence>

                          <View style={[styles.inputWrapper, amount > 0 && { borderColor: typeThemeColor }]}>
                            <Text style={[styles.inputPrefix, amount > 0 && { color: typeThemeColor }]}>$</Text>
                            <TextInput
                              style={[styles.denseInput, amount > 0 && styles.denseInputActive]}
                              keyboardType="numeric"
                              placeholder="0"
                              placeholderTextColor={colors.textMuted}
                              value={amount ? formatNumberInput(amount) : ''}
                              onChangeText={(val) => handleMethodInput(method.id, val)}
                            />
                          </View>

                          {/* Hide action button when active to avoid crowding long names on narrow phones like iPhone 13 */}
                          {amount === 0 ? (
                            <TouchableOpacity 
                              style={styles.denseCobrarBtn} 
                              onPress={() => setExactForMethod(method.id)}
                              activeOpacity={0.8}
                            >
                              <Text style={styles.denseCobrarText}>Cobrar</Text>
                            </TouchableOpacity>
                          ) : (
                            <MotiView 
                              from={{ opacity: 0, scale: 0.5 }}
                              animate={{ opacity: 1, scale: 1 }}
                              style={styles.checkedStatus}
                            >
                              <CheckCircle size={rem(18)} color={typeThemeColor} />
                            </MotiView>
                          )}
                        </View>
                      </View>

                      {/* Nano Calculator Accordion (Only for CASH/Efectivo) */}
                      <AnimatePresence>
                        {isCash && isExpanded && (
                          <MotiView 
                            from={{ height: 0, opacity: 0 }} 
                            animate={{ height: 'auto', opacity: 1 }} 
                            exit={{ height: 0, opacity: 0 }}
                            style={styles.accordionContent}
                            transition={{ type: 'spring', stiffness: 250, damping: 20 }}
                          >
                            <View style={styles.nanoCalcDense}>
                              <View style={styles.divider} />
                              <Text style={styles.calcHeaderLabel}>Teclado de Billetes Rápido</Text>
                              
                              <View style={styles.billsDenseGrid}>
                                {[...BILLS].reverse().map((bill, index) => (
                                  <TouchableOpacity 
                                    key={bill} 
                                    style={styles.denseBillBtn} 
                                    onPress={() => handleQuickAdd(method.id, bill)}
                                    activeOpacity={0.7}
                                  >
                                    <Text style={styles.denseBillText}>{bill >= 1000 ? `${bill/1000}k` : bill}</Text>
                                    <View style={styles.billButtonBadge} />
                                  </TouchableOpacity>
                                ))}
                                <TouchableOpacity 
                                  style={styles.denseBillBtn} 
                                  onPress={() => handleQuickAdd(method.id, 1000)}
                                  activeOpacity={0.7}
                                >
                                  <Text style={styles.denseBillText}>1k</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                  style={styles.denseBillBtnClear} 
                                  onPress={() => { 
                                    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium); 
                                    setAmounts(prev => ({...prev, [method.id]: 0})); 
                                    setQuickReceivedStrs(prev => ({...prev, [method.id]: ''})); 
                                  }}
                                  activeOpacity={0.7}
                                >
                                  <Trash2 size={rem(14)} color="#EF4444" />
                                </TouchableOpacity>
                              </View>
                              
                              <View style={styles.calcRightDense}>
                                <View style={styles.manualCalcInputWrapper}>
                                  <Text style={styles.manualCalcPrefix}>Monto:</Text>
                                  <TextInput
                                    style={styles.denseQuickInput}
                                    keyboardType="numeric"
                                    placeholder="Recibido..."
                                    placeholderTextColor={colors.textMuted}
                                    value={quickReceivedStrs[method.id] ? formatNumberInput(parseInt(quickReceivedStrs[method.id])) : ''}
                                    onChangeText={(val) => handleQuickStrChange(method.id, val.replace(/\D/g, ''))}
                                  />
                                </View>
                                {changeAmount > 0 && (
                                  <MotiView 
                                    from={{ scale: 0.9, opacity: 0 }} 
                                    animate={{ scale: 1, opacity: 1 }}
                                    style={styles.denseChangeCard}
                                  >
                                    <Text style={styles.denseChangeLabel}>Vueltas</Text>
                                    <Text 
                                      style={styles.denseChangeValue}
                                      adjustsFontSizeToFit={true}
                                      numberOfLines={1}
                                      minimumFontScale={0.6}
                                    >
                                      {formatCompactPrice(changeAmount)}
                                    </Text>
                                  </MotiView>
                                )}
                              </View>
                            </View>
                          </MotiView>
                        )}
                      </AnimatePresence>
                    </MotiView>
                  );
                })}

                {!showAllMethods && paymentMethods.length > 1 && (
                  <TouchableOpacity 
                    style={styles.showMoreBtn} 
                    onPress={() => {
                      triggerHaptic();
                      setShowAllMethods(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <Plus size={rem(14)} color={colors.primary} style={{ marginRight: rem(4) }} />
                    <Text style={styles.showMoreText}>Ver otros métodos de pago</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          {/* Discount Section (Premium Card) */}
          <MotiView style={styles.denseSection} from={{ opacity: 0, translateY: 15 }} animate={{ opacity: 1, translateY: 0 }} transition={{ delay: 150 }}>
            <Text style={styles.sectionTitle}>DESCUENTO O RECARGO</Text>
            <View style={styles.discountRow}>
              <View style={styles.discountTabs}>
                <TouchableOpacity
                  style={[styles.discountTab, discountType === 'percentage' && styles.discountTabActive]}
                  onPress={() => { triggerHaptic(); setDiscountType('percentage'); }}
                  activeOpacity={0.8}
                >
                  <Percent size={rem(13)} color={discountType === 'percentage' ? '#FFF' : colors.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.discountTab, discountType === 'fixed' && styles.discountTabActive]}
                  onPress={() => { triggerHaptic(); setDiscountType('fixed'); }}
                  activeOpacity={0.8}
                >
                  <DollarSign size={rem(13)} color={discountType === 'fixed' ? '#FFF' : colors.textMuted} />
                </TouchableOpacity>
              </View>
              <View style={styles.discountInputContainer}>
                <Text style={styles.discountSymbol}>{discountType === 'percentage' ? '%' : '$'}</Text>
                <TextInput
                  style={styles.discountInput}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  value={discountValue ? String(discountValue) : ''}
                  onChangeText={t => setDiscountValue(parseFloat(t) || 0)}
                />
              </View>
            </View>
          </MotiView>

          {/* Extras / Grid Section */}
          <View style={styles.extrasGrid}>
            <TouchableOpacity style={styles.extraDenseBtn} onPress={() => setShowDatePicker(true)} activeOpacity={0.7}>
              <View style={styles.extraIconBg}>
                <Calendar size={rem(15)} color={colors.primary} />
              </View>
              <View style={styles.extraBtnContent}>
                <Text style={styles.extraBtnLabel}>FECHA DE VENTA</Text>
                <Text style={styles.extraBtnText} numberOfLines={1} ellipsizeMode="tail">
                  {manualDate ? manualDate.toLocaleDateString() : 'Fecha Actual'}
                </Text>
              </View>
            </TouchableOpacity>
            
            {showDatePicker && (
              <DateTimePicker
                value={manualDate || new Date()}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) setManualDate(selectedDate);
                }}
              />
            )}

            <TouchableOpacity style={styles.extraDenseBtn} onPress={handlePickImage} activeOpacity={0.7}>
              <View style={styles.extraIconBg}>
                <Camera size={rem(15)} color={colors.primary} />
              </View>
              <View style={styles.extraBtnContent}>
                <Text style={styles.extraBtnLabel}>COMPROBANTE</Text>
                <Text style={styles.extraBtnText} numberOfLines={1}>Fotos ({photos.length})</Text>
              </View>
            </TouchableOpacity>
          </View>

          {photos.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosRow}>
              {photos.map((uri, idx) => (
                <View key={idx} style={styles.photoThumb}>
                  <Image source={{ uri }} style={styles.photoImg} />
                  <TouchableOpacity 
                    style={styles.removePhoto}
                    onPress={() => setPhotos(prev => prev.filter((_, i) => i !== idx))}
                    activeOpacity={0.7}
                  >
                    <X size={rem(10)} color="#FFF" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}

          {/* Premium Notes Input Card */}
          <MotiView style={styles.notesContainer} from={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 200 }}>
            <TextInput
              style={styles.notesInput}
              placeholder="Notas u observaciones de la orden..."
              placeholderTextColor={colors.textMuted}
              multiline
              value={notes}
              onChangeText={setNotes}
            />
          </MotiView>

        </ScrollView>

        {/* Premium floating glass-like footer */}
        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.confirmBtn, (remaining > 0.01 || isProcessing) && styles.confirmBtnDisabled]}
            onPress={handleConfirm}
            disabled={remaining > 0.01 || isProcessing}
            activeOpacity={0.95}
          >
            <LinearGradient 
              colors={remaining > 0.01 ? ['#94A3B8', '#64748B'] : ['#4F46E5', '#3B82F6']} 
              style={styles.gradientConfirmBtn}
            >
              <CheckCircle size={rem(18)} color="#FFF" style={{ marginRight: rem(6) }} />
              <Text style={styles.confirmBtnText}>
                {isProcessing ? 'Procesando Cobro...' : 'Confirmar Pago'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
  );
};

const getStyles = (colors: any, mode: string) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingTop: Platform.OS === 'ios' ? rem(55) : rem(45),
    paddingBottom: rem(20),
    paddingHorizontal: rem(20),
    shadowColor: '#1E1B4B', 
    shadowOffset: { width: 0, height: 10 }, 
    shadowOpacity: 0.12, 
    shadowRadius: 16, 
    elevation: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    borderBottomLeftRadius: rem(30),
    borderBottomRightRadius: rem(30)
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: rem(18) },
  backBtn: { width: rem(36), height: rem(36), borderRadius: rem(10), backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  logoContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, paddingHorizontal: rem(12), paddingVertical: rem(6), borderRadius: rem(12), gap: rem(6), shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  logoIconBg: { width: rem(20), height: rem(20), backgroundColor: '#6366F1', borderRadius: rem(6), justifyContent: 'center', alignItems: 'center' },
  logoText: { fontSize: rem(14), fontWeight: '900', letterSpacing: -0.5 },
  logoTextIA: { color: colors.text },
  logoTextStock: { color: '#6366F1' },
  
  metricsContainer: { flexDirection: 'row', gap: rem(12) },
  metricCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', padding: rem(12), borderRadius: rem(16), alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' },
  metricCardPending: { backgroundColor: mode === 'light' ? '#FFFDF5' : '#78350F20', borderColor: mode === 'light' ? '#FDE68A' : '#78350F40', shadowColor: '#F59E0B', shadowOpacity: 0.05, shadowRadius: 10 },
  metricCardSuccess: { backgroundColor: mode === 'light' ? '#F0FDF4' : '#065F4620', borderColor: mode === 'light' ? '#A7F3D0' : '#065F4640', shadowColor: '#10B981', shadowOpacity: 0.05, shadowRadius: 10 },
  metricLabel: { fontSize: rem(8.5), fontWeight: '800', color: '#C7D2FE', marginBottom: rem(4), letterSpacing: 1 },
  statusIndicatorRow: { flexDirection: 'row', alignItems: 'center', gap: rem(4), marginBottom: rem(4) },
  statusIndicatorDot: { width: rem(5), height: rem(5), borderRadius: rem(2.5) },
  metricValueFinal: { fontSize: rem(18), fontWeight: '900', color: '#FFF', letterSpacing: -0.5, width: '100%', textAlign: 'center' },
  metricValueRemaining: { fontSize: rem(18), fontWeight: '900', letterSpacing: -0.5, width: '100%', textAlign: 'center' },
  
  glowOverlayIndigo: { position: 'absolute', top: -40, right: -40, width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(99,102,241,0.15)', shadowColor: '#6366F1', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 20 },
  glowOverlaySuccess: { position: 'absolute', top: -40, right: -40, width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(16,185,129,0.15)', shadowColor: '#10B981', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 20 },

  content: { flex: 1 },
  scrollContent: { padding: rem(20), paddingTop: rem(32), paddingBottom: rem(110) },
  
  methodsSection: { marginBottom: rem(20) },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: rem(12), paddingHorizontal: rem(4) },
  sectionTitle: { fontSize: rem(10), fontWeight: '800', color: colors.textMuted, letterSpacing: 1.2 },
  methodsList: { gap: rem(10) },
  
  denseMethodCard: { 
    backgroundColor: colors.surface, 
    borderRadius: rem(18), 
    borderWidth: 1, 
    borderColor: mode === 'light' ? '#E2E8F0' : '#334155', 
    overflow: 'hidden', 
    shadowColor: '#0F172A', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.03, 
    shadowRadius: 12, 
    elevation: 2 
  },
  leftColorAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: rem(4) },
  methodRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: rem(10), paddingHorizontal: rem(12) },
  methodInfo: { flexDirection: 'row', alignItems: 'center', gap: rem(8), flex: 1, minWidth: 0 },
  methodTextContainer: { flex: 1, minWidth: 0 },
  iconBox: { width: rem(32), height: rem(32), borderRadius: rem(8), justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 4 },
  methodName: { fontSize: rem(13), fontWeight: '700', color: colors.text },
  methodSubtitle: { fontSize: rem(9.5), color: colors.textMuted, marginTop: rem(1) },
  
  methodActions: { flexDirection: 'row', alignItems: 'center', gap: rem(4), flexShrink: 0 },
  denseClearBtn: { width: rem(26), height: rem(34), backgroundColor: '#FEF2F2', borderRadius: rem(6), borderWidth: 1, borderColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center' },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, borderRadius: rem(8), borderWidth: 1, borderColor: mode === 'light' ? '#E2E8F0' : '#334155', paddingLeft: rem(4), height: rem(34) },
  inputPrefix: { fontSize: rem(11.5), fontWeight: '700', color: colors.textMuted },
  denseInput: { width: rem(58), height: '100%', paddingHorizontal: rem(3), fontSize: rem(12.5), fontWeight: '800', color: colors.text, textAlign: 'left' },
  denseInputActive: { color: colors.text },
  denseCobrarBtn: { height: rem(34), paddingHorizontal: rem(8), borderRadius: rem(8), backgroundColor: mode === 'light' ? '#EEF2FF' : colors.primary + '20', justifyContent: 'center', alignItems: 'center' },
  denseCobrarText: { fontSize: rem(11), fontWeight: '800', color: colors.primary },
  checkedStatus: { width: rem(24), height: rem(24), justifyContent: 'center', alignItems: 'center' },

  showMoreBtn: { flexDirection: 'row', paddingVertical: rem(12), alignItems: 'center', justifyContent: 'center', backgroundColor: mode === 'light' ? '#F5F7FF' : '#1E293B', borderRadius: rem(14), borderWidth: 1, borderColor: mode === 'light' ? '#DDE3FF' : '#334155', borderStyle: 'dashed', marginTop: rem(4) },
  showMoreText: { fontSize: rem(12.5), fontWeight: '800', color: colors.primary },

  accordionContent: { overflow: 'hidden' },
  nanoCalcDense: { paddingHorizontal: rem(14), paddingBottom: rem(14) },
  divider: { height: 1, backgroundColor: mode === 'light' ? '#F1F5F9' : '#334155', marginBottom: rem(10) },
  calcHeaderLabel: { fontSize: rem(9.5), fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', marginBottom: rem(8), letterSpacing: 0.5 },
  
  billsDenseGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: rem(6), marginBottom: rem(12) },
  denseBillBtn: { flexGrow: 1, minWidth: '22%', backgroundColor: colors.surface, paddingVertical: rem(8), borderRadius: rem(8), alignItems: 'center', borderWidth: 1, borderColor: mode === 'light' ? '#E2E8F0' : '#334155', shadowColor: '#0F172A', shadowOpacity: 0.02, shadowRadius: 3, elevation: 1 },
  denseBillBtnClear: { flexGrow: 1, minWidth: '22%', backgroundColor: '#FEF2F2', paddingVertical: rem(8), borderRadius: rem(8), alignItems: 'center', borderWidth: 1, borderColor: '#FECACA', justifyContent: 'center' },
  denseBillText: { fontSize: rem(11.5), fontWeight: '800', color: colors.text },
  billButtonBadge: { position: 'absolute', top: 3, right: 3, width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#10B981', opacity: 0.4 },

  calcRightDense: { flexDirection: 'row', gap: rem(8), alignItems: 'center' },
  manualCalcInputWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', height: rem(38), backgroundColor: colors.surface, borderRadius: rem(10), borderWidth: 1, borderColor: mode === 'light' ? '#E2E8F0' : '#334155', paddingHorizontal: rem(10) },
  manualCalcPrefix: { fontSize: rem(10), fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', marginRight: rem(4) },
  denseQuickInput: { flex: 1, height: '100%', fontSize: rem(12.5), fontWeight: '700', color: colors.text },
  denseChangeCard: { backgroundColor: mode === 'light' ? '#FFFDF2' : '#78350F20', paddingHorizontal: rem(12), paddingVertical: rem(4), borderRadius: rem(8), justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: mode === 'light' ? '#FDE68A' : '#78350F40' },
  denseChangeLabel: { fontSize: rem(7.5), fontWeight: '800', color: mode === 'light' ? '#B45309' : '#F59E0B', textTransform: 'uppercase', letterSpacing: 0.5 },
  denseChangeValue: { fontSize: rem(13), fontWeight: '900', color: mode === 'light' ? '#B45309' : '#F59E0B' },

  denseSection: { backgroundColor: colors.surface, borderRadius: rem(18), padding: rem(14), marginBottom: rem(14), borderWidth: 1, borderColor: mode === 'light' ? '#E2E8F0' : '#334155', shadowColor: '#0F172A', shadowOpacity: 0.02, shadowRadius: 10 },
  discountRow: { flexDirection: 'row', alignItems: 'center', gap: rem(10) },
  discountTabs: { flexDirection: 'row', backgroundColor: mode === 'light' ? '#F1F5F9' : '#1E293B', borderRadius: rem(8), padding: rem(3), gap: rem(3) },
  discountTab: { width: rem(28), height: rem(28), borderRadius: rem(6), justifyContent: 'center', alignItems: 'center' },
  discountTabActive: { backgroundColor: colors.primary, shadowColor: colors.primary, shadowOpacity: 0.2, shadowRadius: 4 },
  discountInputContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', height: rem(34), backgroundColor: colors.background, borderRadius: rem(8), borderWidth: 1, borderColor: mode === 'light' ? '#E2E8F0' : '#334155', paddingHorizontal: rem(8) },
  discountSymbol: { fontSize: rem(12), fontWeight: '800', color: colors.textMuted, marginRight: rem(3) },
  discountInput: { flex: 1, height: '100%', fontSize: rem(13), fontWeight: '700', color: colors.text },

  extrasGrid: { flexDirection: 'row', gap: rem(10), marginBottom: rem(14) },
  extraDenseBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: rem(10), borderRadius: rem(14), gap: rem(8), borderWidth: 1, borderColor: mode === 'light' ? '#E2E8F0' : '#334155', shadowColor: '#0F172A', shadowOpacity: 0.02, shadowRadius: 8, elevation: 1 },
  extraIconBg: { width: rem(28), height: rem(28), borderRadius: rem(8), backgroundColor: mode === 'light' ? '#EEF2FF' : colors.primary + '20', justifyContent: 'center', alignItems: 'center' },
  extraBtnContent: { flex: 1, minWidth: 0 },
  extraBtnLabel: { fontSize: rem(7.5), fontWeight: '800', color: colors.textMuted, letterSpacing: 0.5 },
  extraBtnText: { fontSize: rem(11), fontWeight: '700', color: colors.text, marginTop: rem(0.5) },
  
  photosRow: { flexDirection: 'row', marginBottom: rem(14), paddingHorizontal: rem(2) },
  photoThumb: { width: rem(50), height: rem(50), borderRadius: rem(10), marginRight: rem(8), overflow: 'hidden', borderWidth: 1, borderColor: mode === 'light' ? '#E2E8F0' : '#334155' },
  photoImg: { width: '100%', height: '100%' },
  removePhoto: { position: 'absolute', top: 3, right: 3, backgroundColor: '#EF4444', width: rem(14), height: rem(14), borderRadius: rem(7), justifyContent: 'center', alignItems: 'center' },
  
  notesContainer: { backgroundColor: colors.surface, borderRadius: rem(16), borderWidth: 1, borderColor: mode === 'light' ? '#E2E8F0' : '#334155', overflow: 'hidden', padding: rem(12), shadowColor: '#0F172A', shadowOpacity: 0.02, shadowRadius: 8 },
  notesInput: { height: rem(60), textAlignVertical: 'top', fontSize: rem(12.5), color: colors.text, fontWeight: '500' },
  
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: mode === 'light' ? 'rgba(255,255,255,0.9)' : colors.surface, padding: rem(16), paddingBottom: Platform.OS === 'ios' ? rem(32) : rem(16), borderTopWidth: 1, borderTopColor: mode === 'light' ? '#E2E8F0' : '#334155' },
  confirmBtn: { height: rem(52), borderRadius: rem(16), overflow: 'hidden', shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.22, shadowRadius: 10, elevation: 5 },
  confirmBtnDisabled: { shadowOpacity: 0, elevation: 0 },
  gradientConfirmBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  confirmBtnText: { fontSize: rem(14), fontWeight: '800', color: '#FFF', textTransform: 'uppercase', letterSpacing: 1 },
});
