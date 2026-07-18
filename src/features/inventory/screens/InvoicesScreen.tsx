import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  Dimensions,
  Platform,
  Animated
} from 'react-native';
import { useStatusModal } from '@/core/context/StatusModalContext';
import { InventoryService, SupplierInvoice, Supplier, InvoiceItem } from '@/infrastructure/services/inventoryService';
import { rem } from '@/core/utils/responsive';
import { CurrencyService } from '@/core/services/currencyService';
import { 
  Plus, 
  FileText, 
  Calendar, 
  DollarSign, 
  X, 
  CheckCircle, 
  AlertCircle, 
  ShieldAlert, 
  Save,
  Search,
  ChevronDown,
  Coins,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Building2
} from 'lucide-react-native';
import { MotiView, AnimatePresence } from 'moti';
import * as Haptics from 'expo-haptics';
import { PremiumSubScreenHeader } from '../components/PremiumSubScreenHeader';
import { useTheme } from '@/core/theme/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface InvoicesScreenProps {
  onBack: () => void;
}

export const InvoicesScreen = ({ onBack }: InvoicesScreenProps) => {
  const { colors, mode } = useTheme();
  const styles = getStyles(colors, mode);
  const { showStatus } = useStatusModal();

  const [invoices, setInvoices] = useState<SupplierInvoice[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals States
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<SupplierInvoice | null>(null);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isPayOpen, setIsPayOpen] = useState(false);

  // Form Field States (Add Invoice)
  const [formNumFactura, setFormNumFactura] = useState('');
  const [formSupplierId, setFormSupplierId] = useState('');
  const [formFechaEmision, setFormFechaEmision] = useState('');
  const [formFechaVence, setFormFechaVence] = useState('');
  const [formTotal, setFormTotal] = useState('');
  const [formPagado, setFormPagado] = useState('');
  const [formItemsText, setFormItemsText] = useState('');

  // Form Field States (Record Payment)
  const [payAmount, setPayAmount] = useState('');

  // Native Scroll Optimization
  const mainScrollY = useRef(new Animated.Value(0)).current;
  const [showScrollBadge, setShowScrollBadge] = useState(true);
  const [contentHeight, setContentHeight] = useState(0);
  const [visibleHeight, setVisibleHeight] = useState(0);

  useEffect(() => {
    const id = mainScrollY.addListener(({ value }) => {
      const shouldShow = value < 40;
      if (shouldShow !== showScrollBadge) {
        setShowScrollBadge(shouldShow);
      }
    });
    return () => mainScrollY.removeListener(id);
  }, [showScrollBadge]);

  const fetchInitialData = async () => {
    try {
      const [invs, sups] = await Promise.all([
        InventoryService.getInvoices(),
        InventoryService.getSuppliers()
      ]);
      setInvoices(invs);
      setSuppliers(sups);
      if (sups.length > 0) {
        setFormSupplierId(sups[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Filtering
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      return (inv.numeroFactura || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
             (inv.proveedorNombre || '').toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [invoices, searchQuery]);

  // Accounts payable aggregate metrics
  const stats = useMemo(() => {
    let totalPending = 0;
    let totalPaid = 0;
    invoices.forEach(inv => {
      totalPending += (inv.total - inv.pagado);
      totalPaid += inv.pagado;
    });
    return { totalPending, totalPaid };
  }, [invoices]);

  const handleOpenDetail = (invoice: SupplierInvoice) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedInvoice(invoice);
    setIsDetailOpen(true);
  };

  const handleOpenPayment = (invoice: SupplierInvoice) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedInvoice(invoice);
    setPayAmount((invoice.total - invoice.pagado).toString());
    setIsPayOpen(true);
  };

  const handleRecordPayment = async () => {
    if (!selectedInvoice || !payAmount) return;
    const amountVal = parseFloat(payAmount);
    if (isNaN(amountVal) || amountVal <= 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      const updated = await InventoryService.recordPayment(selectedInvoice.id, amountVal);
      setInvoices(prev => prev.map(inv => inv.id === selectedInvoice.id ? updated : inv));
      setIsPayOpen(false);
      showStatus({
        type: 'success',
        title: 'Abono Registrado',
        message: `Se abonaron ${CurrencyService.format(amountVal)} a la factura ${updated.numeroFactura}.`,
        actionText: 'Aceptar'
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddInvoice = async () => {
    if (!formNumFactura || !formSupplierId || !formTotal) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showStatus({
        type: 'error',
        title: 'Campos incompletos',
        message: 'Por favor, rellena el número de factura, proveedor y total.',
        actionText: 'Entendido'
      });
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const totalVal = parseFloat(formTotal) || 0;
    const pagadoVal = parseFloat(formPagado) || 0;

    // Optional item structure parsing
    const itemsList: InvoiceItem[] = [];
    if (formItemsText) {
      const lines = formItemsText.split('\n');
      lines.forEach(line => {
        const parts = line.split(',');
        if (parts.length >= 2) {
          itemsList.push({
            nombre: parts[0].trim(),
            cantidad: parseFloat(parts[1]) || 1,
            costoUnitario: parseFloat(parts[2]) || 0,
            unidadMedida: 'unidades'
          });
        }
      });
    }

    const payload = {
      numeroFactura: formNumFactura,
      proveedorId: formSupplierId,
      fechaEmision: formFechaEmision || new Date().toISOString().split('T')[0],
      fechaVencimiento: formFechaVence || new Date().toISOString().split('T')[0],
      total: totalVal,
      pagado: pagadoVal,
      estado: pagadoVal === totalVal ? 'PAGADO' : pagadoVal > 0 ? 'PARCIAL' : 'PENDIENTE' as any,
      items: itemsList
    };

    try {
      const newInvoice = await InventoryService.createInvoice(payload);
      setInvoices(prev => [newInvoice, ...prev]);
      setIsAddOpen(false);
      showStatus({
        type: 'success',
        title: 'Factura Ingresada',
        message: `Factura ${newInvoice.numeroFactura} registrada exitosamente.`,
        actionText: 'Excelente'
      });
      
      // Reset form
      setFormNumFactura('');
      setFormFechaEmision('');
      setFormFechaVence('');
      setFormTotal('');
      setFormPagado('');
      setFormItemsText('');
    } catch (e) {
      console.error(e);
    }
  };

  const renderInvoiceItem = ({ item, index }: { item: SupplierInvoice; index: number }) => {
    const isPaid = item.estado === 'PAGADO';
    const isPartial = item.estado === 'PARCIAL';
    
    // Premium color styles
    const accentColor = isPaid ? colors.success : isPartial ? '#F59E0B' : '#EF4444';
    const StatusIcon = isPaid ? CheckCircle : isPartial ? AlertCircle : ShieldAlert;
    const remaining = item.total - item.pagado;

    return (
      <MotiView
        from={{ opacity: 0, translateY: 35, scale: 0.96 }}
        animate={{ opacity: 1, translateY: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ delay: 240 + Math.min(index * 45, 360), type: 'timing', duration: 320 }}
        style={styles.cardContainer}
      >
        <TouchableOpacity activeOpacity={0.9} onPress={() => handleOpenDetail(item)}>
          <View style={styles.cardMainRow}>
            {/* Left Avatar Section */}
            <View style={styles.avatarWrapper}>
              <View style={[styles.avatarGlow, { backgroundColor: accentColor + '10' }]}>
                <FileText size={rem(20)} color={accentColor} />
              </View>
            </View>

            {/* Middle Details Section */}
            <View style={styles.cardDetailsCol}>
              <View style={styles.cardHeaderLine}>
                <Text style={styles.invoiceNum} numberOfLines={1}>
                  Factura {item.numeroFactura}
                </Text>
              </View>

              <View style={styles.supplierRow}>
                <Building2 size={rem(10)} color={colors.textMuted} style={{ marginRight: 4 }} />
                <Text style={styles.supplierText} numberOfLines={1}>{item.proveedorNombre}</Text>
              </View>

              <View style={styles.dateRow}>
                <Calendar size={rem(10)} color={colors.textMuted} style={{ marginRight: 4 }} />
                <Text style={styles.dateText}>Vence: {item.fechaVencimiento}</Text>
              </View>
            </View>

            {/* Right Financial Balance Section */}
            <View style={styles.cardRightCol}>
              <View style={styles.grandTotalContainer}>
                <Text style={styles.grandTotalLabel}>Total</Text>
                <Text style={styles.grandTotalValue}>{CurrencyService.format(item.total)}</Text>
              </View>
              
              <View style={[
                styles.statusBadge, 
                { backgroundColor: accentColor + '10', borderColor: accentColor + '20' }
              ]}>
                <StatusIcon size={rem(9)} color={accentColor} style={{ marginRight: 3 }} />
                <Text style={[styles.statusBadgeText, { color: accentColor }]}>
                  {item.estado}
                </Text>
              </View>
            </View>
          </View>

          {/* Pricing indicator breakdown grid */}
          <View style={styles.priceBreakdownGrid}>
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>PAGADO</Text>
              <Text style={[styles.breakdownVal, { color: colors.success }]}>
                {CurrencyService.format(item.pagado)}
              </Text>
            </View>

            <View style={styles.breakdownDivider} />

            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>SALDO RESTANTE</Text>
              <Text style={[styles.breakdownVal, { color: remaining > 0 ? '#EF4444' : colors.textMuted }]}>
                {CurrencyService.format(remaining)}
              </Text>
            </View>
          </View>

          {/* Bottom pay speedy action */}
          {remaining > 0 ? (
            <View style={styles.cardActionRow}>
              <TouchableOpacity 
                style={styles.abonoActionBtn}
                activeOpacity={0.8}
                onPress={() => handleOpenPayment(item)}
              >
                <DollarSign size={rem(12)} color="#FFFFFF" style={{ marginRight: 4 }} />
                <Text style={styles.abonoBtnText}>Registrar Abono / Pago</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.cardActionRow}>
              <View style={styles.fullyPaidLabelContainer}>
                <CheckCircle size={rem(12)} color={colors.success} style={{ marginRight: 4 }} />
                <Text style={styles.fullyPaidLabelText}>Esta cuenta está completamente saldada</Text>
              </View>
            </View>
          )}
        </TouchableOpacity>
      </MotiView>
    );
  };

  return (
    <View style={styles.container}>
      {/* Premium Header */}
      <MotiView
        from={{ opacity: 0, translateY: -15 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 300, delay: 0 }}
      >
        <PremiumSubScreenHeader
          title="Facturas de Proveedores"
          subtitle="Cuentas y Facturas"
          onBack={onBack}
          actionLabel="Registrar"
          onAction={() => {
            if (suppliers.length === 0) {
              showStatus({
                type: 'error',
                title: 'Sin Proveedores',
                message: 'Debes registrar al menos un proveedor antes de ingresar facturas.',
                actionText: 'Entendido'
              });
              return;
            }
            setFormSupplierId(suppliers[0]?.id || '');
            setIsAddOpen(true);
          }}
        />
      </MotiView>

      {/* Slanted dynamic bento metrics dashboard */}
      <MotiView
        from={{ opacity: 0, translateY: 25, scale: 0.98 }}
        animate={{ opacity: 1, translateY: 0, scale: 1 }}
        transition={{ type: 'timing', duration: 350, delay: 80 }}
        style={styles.healthDashboard}
      >
        <View style={styles.healthLeftSection}>
          <Text style={styles.healthTitle}>CUENTAS POR PAGAR PENDIENTES</Text>
          <View style={styles.healthValueRow}>
            <Text style={[styles.healthBigNumber, { color: stats.totalPending > 0 ? '#EF4444' : colors.success }]}>
              {CurrencyService.format(stats.totalPending)}
            </Text>
          </View>
          <View style={styles.healthProgressBg}>
            <View style={[
              styles.healthProgressFill, 
              { 
                width: '100%',
                backgroundColor: stats.totalPending > 0 ? '#EF4444' : colors.success
              }
            ]} />
          </View>
        </View>

        <View style={styles.slantedDivider} />

        <View style={styles.healthRightSection}>
          <View style={styles.healthStatsRowGroup}>
            <View style={[styles.healthStatCard, { flex: 1 }]}>
              <View style={[styles.healthIconCircle, { backgroundColor: colors.success + '15' }]}>
                <TrendingUp size={rem(11)} color={colors.success} />
              </View>
              <View style={styles.healthStatTextCol}>
                <Text style={styles.healthStatLabel}>EGRESOS PAGADOS</Text>
                <Text style={[styles.healthStatVal, { color: colors.success }]}>
                  {CurrencyService.format(stats.totalPaid)}
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.healthStatCard, { marginTop: rem(2) }]}>
            <View style={[styles.healthIconCircle, { backgroundColor: '#F59E0B15' }]}>
              <AlertCircle size={rem(11)} color="#F59E0B" />
            </View>
            <View style={styles.healthStatTextCol}>
              <Text style={styles.healthStatLabel}>FACTURAS VENCIDAS / PENDIENTES</Text>
              <Text style={styles.healthStatVal}>
                {invoices.filter(inv => inv.estado !== 'PAGADO').length} facturas
              </Text>
            </View>
          </View>
        </View>
      </MotiView>

      {/* Search area */}
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 320, delay: 160 }}
        style={styles.searchBarContainer}
      >
        <Search size={rem(16)} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por factura o proveedor..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity activeOpacity={0.7} onPress={() => setSearchQuery('')}>
            <X size={rem(16)} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </MotiView>

      {/* Main List */}
      <Animated.FlatList
        data={filteredInvoices}
        renderItem={renderInvoiceItem}
        keyExtractor={(item) => item.id || item.numeroFactura}
        contentContainerStyle={styles.listScroll}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: mainScrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        onContentSizeChange={(w, h) => setContentHeight(h)}
        onLayout={(event) => setVisibleHeight(event.nativeEvent.layout.height)}
        ListEmptyComponent={
          <MotiView
            from={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={styles.emptyCardContainer}
          >
            <View style={styles.emptyIconOutline}>
              <View style={styles.emptyIconGlow}>
                <FileText size={rem(24)} color={colors.primary} />
              </View>
            </View>
            <Text style={styles.emptyTitle}>Sin Facturas registradas</Text>
            <Text style={styles.emptySubtitle}>
              Ingresa los comprobantes de compra de tus proveedores para automatizar las cuentas por pagar, abonos e historial de insumos.
            </Text>
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.emptyCtaButton}
              onPress={() => {
                if (suppliers.length === 0) {
                  showStatus({
                    type: 'error',
                    title: 'Sin Proveedores',
                    message: 'Debes registrar al menos un proveedor antes de ingresar facturas.',
                    actionText: 'Entendido'
                  });
                  return;
                }
                setFormSupplierId(suppliers[0]?.id || '');
                setIsAddOpen(true);
              }}
            >
              <Plus size={rem(12)} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.emptyCtaText}>Nueva Factura</Text>
            </TouchableOpacity>
          </MotiView>
        }
      />

      {/* Custom Premium Scrollbar Overlay */}
      {contentHeight > visibleHeight && (() => {
        const trackHeight = visibleHeight - rem(32);
        const thumbHeight = Math.max(rem(40), (visibleHeight / contentHeight) * trackHeight);
        const maxScroll = Math.max(1, contentHeight - visibleHeight);
        const thumbTranslateY = mainScrollY.interpolate({
          inputRange: [0, maxScroll],
          outputRange: [0, trackHeight - thumbHeight],
          extrapolate: 'clamp',
        });
        return (
          <View style={styles.customScrollbarTrack}>
            <Animated.View 
              style={[
                styles.customScrollbarThumb, 
                { 
                  height: thumbHeight, 
                  transform: [{ translateY: thumbTranslateY }] 
                }
              ]} 
            />
          </View>
        );
      })()}

      {/* Pulse Floating Scroll down badge */}
      <AnimatePresence>
        {filteredInvoices.length > 3 && showScrollBadge && (
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            exit={{ opacity: 0, translateY: 20 }}
            transition={{ type: 'spring', damping: 15 }}
            style={styles.mainScrollDownBadge}
          >
            <MotiView
              animate={{
                translateY: [0, 4, 0]
              }}
              transition={{
                loop: true,
                duration: 1500,
                type: 'timing'
              }}
            >
              <ChevronDown size={rem(11)} color="#FFFFFF" />
            </MotiView>
            <Text style={styles.mainScrollDownText}>Desliza para ver más comprobantes</Text>
          </MotiView>
        )}
      </AnimatePresence>

      {/* Detail Slide Modal */}
      <Modal visible={isDetailOpen} transparent animationType="slide" onRequestClose={() => setIsDetailOpen(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBgClose} activeOpacity={1} onPress={() => setIsDetailOpen(false)} />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detalle de Factura</Text>
              <TouchableOpacity style={styles.modalCloseCircle} onPress={() => setIsDetailOpen(false)}>
                <X size={rem(15)} color={colors.text} />
              </TouchableOpacity>
            </View>

            {selectedInvoice && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.detailsHeaderBlock}>
                  <View style={[styles.detailsIconCircle, { backgroundColor: colors.primary + '10' }]}>
                    <FileText size={rem(22)} color={colors.primary} />
                  </View>
                  <Text style={styles.detailsH1}>Factura {selectedInvoice.numeroFactura}</Text>
                  <Text style={styles.detailsH2}>{selectedInvoice.proveedorNombre}</Text>
                  <View style={styles.detailsDuoRow}>
                    <View style={styles.detailsDuoCol}>
                      <Text style={styles.detailsLabel}>EMISIÓN</Text>
                      <Text style={styles.detailsVal}>{selectedInvoice.fechaEmision}</Text>
                    </View>
                    <View style={styles.detailsDuoCol}>
                      <Text style={styles.detailsLabel}>VENCIMIENTO</Text>
                      <Text style={styles.detailsVal}>{selectedInvoice.fechaVencimiento}</Text>
                    </View>
                  </View>
                </View>

                {/* Items breakdown list */}
                <Text style={styles.modalSubtitleLabel}>Ítems / Insumos de Compra</Text>
                {selectedInvoice.items && selectedInvoice.items.length > 0 ? (
                  <View style={styles.itemsTableBox}>
                    {selectedInvoice.items.map((item, idx) => (
                      <View key={idx} style={styles.itemTableRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.itemTableNombre}>{item.nombre}</Text>
                          <Text style={styles.itemTableSub}>Cant: {item.cantidad} x {CurrencyService.format(item.costoUnitario)}</Text>
                        </View>
                        <Text style={styles.itemTableSubtotal}>{CurrencyService.format(item.cantidad * item.costoUnitario)}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.itemsEmpty}>
                    <Text style={styles.itemsEmptyText}>No se desglosaron ítems individuales.</Text>
                  </View>
                )}

                <View style={{ height: rem(20) }} />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Record Payment (Abono) Modal */}
      <Modal visible={isPayOpen} transparent animationType="fade" onRequestClose={() => setIsPayOpen(false)}>
        <View style={styles.centerModalOverlay}>
          <View style={styles.payDialogBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Registrar Abono</Text>
              <TouchableOpacity style={styles.modalCloseCircle} onPress={() => setIsPayOpen(false)}>
                <X size={rem(15)} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            {selectedInvoice && (
              <View style={{ marginTop: rem(10) }}>
                <Text style={styles.payDialogSubText}>
                  Factura {selectedInvoice.numeroFactura} de {selectedInvoice.proveedorNombre}.
                </Text>
                <Text style={styles.payDialogSubText}>
                  Saldo pendiente actual: <Text style={{ color: '#EF4444', fontWeight: '800' }}>
                    {CurrencyService.format(selectedInvoice.total - selectedInvoice.pagado)}
                  </Text>
                </Text>

                <Text style={[styles.inputLabel, { marginTop: rem(16) }]}>Monto a Abonar (COP) *</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="numeric"
                  value={payAmount}
                  onChangeText={setPayAmount}
                  placeholder="Ej. 500000"
                  placeholderTextColor={colors.textMuted}
                />

                <TouchableOpacity 
                  style={styles.saveBtn} 
                  activeOpacity={0.8}
                  onPress={handleRecordPayment}
                >
                  <DollarSign size={rem(15)} color="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text style={styles.saveBtnText}>Registrar Pago</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Create/Add Invoice Modal */}
      <Modal visible={isAddOpen} transparent animationType="slide" onRequestClose={() => setIsAddOpen(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBgClose} activeOpacity={1} onPress={() => setIsAddOpen(false)} />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Registrar Factura Proveedor</Text>
              <TouchableOpacity style={styles.modalCloseCircle} onPress={() => setIsAddOpen(false)}>
                <X size={rem(15)} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Número de Factura / Ref *</Text>
              <TextInput
                style={styles.textInput}
                value={formNumFactura}
                onChangeText={setFormNumFactura}
                placeholder="Ej. FE-1092"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.inputLabel}>Proveedor Asociado *</Text>
              <View style={styles.pickerBoxRow}>
                {suppliers.map(s => {
                  const isSel = formSupplierId === s.id;
                  return (
                    <TouchableOpacity
                      key={s.id}
                      activeOpacity={0.8}
                      onPress={() => setFormSupplierId(s.id)}
                      style={[styles.pickerChip, isSel && styles.pickerChipActive]}
                    >
                      <Text style={[styles.pickerChipText, isSel && styles.pickerChipTextActive]}>
                        {s.nombre}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.formRow}>
                <View style={styles.formCol}>
                  <Text style={styles.inputLabel}>Fecha Emisión</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formFechaEmision}
                    onChangeText={setFormFechaEmision}
                    placeholder="AAAA-MM-DD"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
                <View style={styles.formCol}>
                  <Text style={styles.inputLabel}>Fecha Vencimiento</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formFechaVence}
                    onChangeText={setFormFechaVence}
                    placeholder="AAAA-MM-DD"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={styles.formCol}>
                  <Text style={styles.inputLabel}>Monto Total Factura *</Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={formTotal}
                    onChangeText={setFormTotal}
                    placeholder="Ej. 1850000"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
                <View style={styles.formCol}>
                  <Text style={styles.inputLabel}>Monto Pagado Inicial</Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={formPagado}
                    onChangeText={setFormPagado}
                    placeholder="Ej. 600000"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Desglose de Ítems (Ej: Tomates, 10, 3000 por línea)</Text>
              <TextInput
                style={[styles.textInput, { height: rem(80), textAlignVertical: 'top', paddingTop: 10 }]}
                multiline
                numberOfLines={4}
                value={formItemsText}
                onChangeText={setFormItemsText}
                placeholder="Nombre, Cantidad, Costo Unitario&#10;Aceite de Palma, 3, 180000"
                placeholderTextColor={colors.textMuted}
              />

              <TouchableOpacity 
                style={styles.saveBtn} 
                activeOpacity={0.8}
                onPress={handleAddInvoice}
              >
                <Save size={rem(15)} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.saveBtnText}>Guardar Factura</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const getStyles = (colors: any, mode: 'light' | 'dark') => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  healthDashboard: {
    flexDirection: 'row',
    backgroundColor: mode === 'light' ? '#FFFFFF' : '#151E2E',
    borderRadius: rem(16),
    marginHorizontal: rem(16),
    marginTop: rem(12),
    marginBottom: rem(8),
    paddingVertical: rem(16),
    paddingHorizontal: rem(14),
    borderWidth: 1,
    borderColor: mode === 'light' ? '#EAE5DA' : '#2D3748',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: mode === 'light' ? 0.03 : 0.15,
    shadowRadius: 12,
    elevation: 3,
  },
  healthLeftSection: {
    width: '45%',
    justifyContent: 'center',
  },
  healthTitle: {
    fontSize: rem(8),
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: rem(4),
  },
  healthValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: rem(8),
  },
  healthBigNumber: {
    fontSize: rem(18),
    fontFamily: 'Inter-Bold',
    fontWeight: '900',
  },
  healthProgressBg: {
    height: rem(4),
    backgroundColor: mode === 'light' ? '#E2E8F0' : '#334155',
    borderRadius: rem(2),
    overflow: 'hidden',
  },
  healthProgressFill: {
    height: '100%',
    borderRadius: rem(2),
  },
  slantedDivider: {
    width: 1.5,
    height: '80%',
    backgroundColor: mode === 'light' ? '#E2E8F0' : '#334155',
    transform: [{ rotate: '15deg' }],
    marginHorizontal: rem(6),
    alignSelf: 'center',
  },
  healthRightSection: {
    flex: 1,
    paddingLeft: rem(4),
    gap: rem(6),
  },
  healthStatsRowGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: rem(6),
  },
  healthStatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rem(6),
  },
  healthIconCircle: {
    width: rem(20),
    height: rem(20),
    borderRadius: rem(10),
    justifyContent: 'center',
    alignItems: 'center',
  },
  healthStatTextCol: {
    flex: 1,
  },
  healthStatLabel: {
    fontSize: rem(6.5),
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.3,
  },
  healthStatVal: {
    fontSize: rem(9.5),
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: colors.text,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: rem(16),
    marginTop: rem(10),
    paddingHorizontal: rem(12),
    borderRadius: rem(12),
    height: rem(42),
    borderWidth: 1,
    borderColor: mode === 'light' ? '#EAE5DA' : '#334155',
    shadowColor: '#1A365D',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  searchIcon: {
    marginRight: rem(8),
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: rem(13),
    fontFamily: 'Inter-Regular',
  },
  listScroll: {
    padding: rem(16),
    paddingBottom: rem(80),
    gap: rem(12),
  },
  cardContainer: {
    backgroundColor: colors.surface,
    borderRadius: rem(16),
    padding: rem(14),
    borderWidth: 1,
    borderColor: mode === 'light' ? '#EAE5DA' : '#334155',
    shadowColor: '#1A365D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1.5,
  },
  cardMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: rem(12),
  },
  avatarGlow: {
    width: rem(44),
    height: rem(44),
    borderRadius: rem(22),
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardDetailsCol: {
    flex: 1,
  },
  cardHeaderLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: rem(2),
  },
  invoiceNum: {
    fontSize: rem(14),
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: colors.text,
  },
  supplierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: rem(2),
  },
  supplierText: {
    fontSize: rem(10.5),
    fontFamily: 'Inter-SemiBold',
    color: colors.text,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: rem(10),
    fontFamily: 'Inter-Regular',
    color: colors.textMuted,
  },
  cardRightCol: {
    alignItems: 'flex-end',
    marginLeft: rem(8),
    gap: rem(4),
  },
  grandTotalContainer: {
    alignItems: 'flex-end',
  },
  grandTotalLabel: {
    fontSize: rem(7.5),
    fontFamily: 'Inter-Bold',
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  grandTotalValue: {
    fontSize: rem(12),
    fontFamily: 'Inter-Bold',
    fontWeight: '900',
    color: colors.text,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: rem(6),
    paddingHorizontal: rem(6),
    paddingVertical: rem(2),
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: rem(8),
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  priceBreakdownGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: mode === 'light' ? '#F9FAFB' : '#1F2937',
    borderRadius: rem(10),
    padding: rem(10),
    marginTop: rem(10),
    borderWidth: 1,
    borderColor: mode === 'light' ? '#F3F4F6' : '#2D3748',
  },
  breakdownItem: {
    flex: 1,
    alignItems: 'center',
  },
  breakdownDivider: {
    width: 1,
    height: rem(16),
    backgroundColor: mode === 'light' ? '#E5E7EB' : '#374151',
  },
  breakdownLabel: {
    fontSize: rem(7.5),
    fontFamily: 'Inter-Bold',
    color: colors.textMuted,
    letterSpacing: 0.3,
    marginBottom: rem(2),
  },
  breakdownVal: {
    fontSize: rem(11),
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
  },
  cardActionRow: {
    marginTop: rem(10),
    borderTopWidth: 1,
    borderTopColor: mode === 'light' ? '#F3F4F6' : '#2D3748',
    paddingTop: rem(10),
  },
  abonoActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: rem(8),
    height: rem(32),
  },
  abonoBtnText: {
    fontSize: rem(10.5),
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  fullyPaidLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullyPaidLabelText: {
    fontSize: rem(10),
    fontFamily: 'Inter-Regular',
    color: colors.success,
  },
  emptyCardContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: rem(20),
    padding: rem(24),
    borderWidth: 1,
    borderColor: mode === 'light' ? '#EAE5DA' : '#334155',
    marginTop: rem(20),
  },
  emptyIconOutline: {
    width: rem(56),
    height: rem(56),
    borderRadius: rem(28),
    borderWidth: 1.5,
    borderColor: colors.primary + '30',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: rem(16),
  },
  emptyIconGlow: {
    width: rem(44),
    height: rem(44),
    borderRadius: rem(22),
    backgroundColor: colors.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: rem(15),
    fontFamily: 'Inter-Bold',
    color: colors.text,
    marginBottom: rem(6),
  },
  emptySubtitle: {
    fontSize: rem(11),
    fontFamily: 'Inter-Regular',
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: rem(16),
    marginHorizontal: rem(12),
    marginBottom: rem(18),
  },
  emptyCtaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: rem(8),
    paddingHorizontal: rem(14),
    borderRadius: rem(10),
  },
  emptyCtaText: {
    fontSize: rem(11),
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  customScrollbarTrack: {
    position: 'absolute',
    right: rem(4),
    top: rem(175),
    bottom: rem(20),
    width: rem(8),
    borderRadius: rem(4),
    backgroundColor: mode === 'light' ? 'rgba(13, 58, 148, 0.04)' : 'rgba(255, 255, 255, 0.02)',
    zIndex: 100,
  },
  customScrollbarThumb: {
    width: rem(8),
    borderRadius: rem(4),
    backgroundColor: colors.primary,
  },
  mainScrollDownBadge: {
    position: 'absolute',
    bottom: rem(20),
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: rem(14),
    paddingVertical: rem(8),
    borderRadius: rem(20),
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
    gap: rem(6),
    zIndex: 99,
  },
  mainScrollDownText: {
    fontSize: rem(9),
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  centerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: rem(20),
  },
  modalBgClose: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: rem(24),
    borderTopRightRadius: rem(24),
    paddingHorizontal: rem(20),
    paddingTop: rem(18),
    paddingBottom: Platform.OS === 'ios' ? rem(40) : rem(24),
    maxHeight: SCREEN_HEIGHT * 0.85,
    borderWidth: 1,
    borderColor: mode === 'light' ? '#EAE5DA' : '#334155',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: rem(14),
    borderBottomWidth: 1,
    borderBottomColor: mode === 'light' ? '#EAE5DA' : '#334155',
    marginBottom: rem(14),
  },
  modalTitle: {
    fontSize: rem(15),
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: colors.primary,
  },
  modalCloseCircle: {
    width: rem(28),
    height: rem(28),
    borderRadius: rem(14),
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: mode === 'light' ? '#EAE5DA' : '#334155',
  },
  detailsHeaderBlock: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: rem(16),
    padding: rem(16),
    borderWidth: 1,
    borderColor: mode === 'light' ? '#EAE5DA' : '#334155',
    marginBottom: rem(20),
  },
  detailsIconCircle: {
    width: rem(44),
    height: rem(44),
    borderRadius: rem(22),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: rem(8),
  },
  detailsH1: {
    fontSize: rem(15),
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: colors.text,
    marginBottom: rem(2),
  },
  detailsH2: {
    fontSize: rem(12),
    fontFamily: 'Inter-Regular',
    color: colors.textMuted,
    marginBottom: rem(10),
  },
  detailsDuoRow: {
    flexDirection: 'row',
    gap: rem(24),
    marginTop: rem(4),
  },
  detailsDuoCol: {
    alignItems: 'center',
  },
  detailsLabel: {
    fontSize: rem(7.5),
    fontFamily: 'Inter-Bold',
    color: colors.textMuted,
  },
  detailsVal: {
    fontSize: rem(10.5),
    fontFamily: 'Inter-SemiBold',
    color: colors.text,
  },
  modalSubtitleLabel: {
    fontSize: rem(11),
    fontFamily: 'Inter-Bold',
    color: colors.text,
    marginBottom: rem(8),
  },
  itemsTableBox: {
    borderWidth: 1,
    borderColor: mode === 'light' ? '#EAE5DA' : '#334155',
    borderRadius: rem(12),
    overflow: 'hidden',
  },
  itemTableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: rem(10),
    borderBottomWidth: 1,
    borderBottomColor: mode === 'light' ? '#EAE5DA' : '#334155',
  },
  itemTableNombre: {
    fontSize: rem(11.5),
    fontFamily: 'Inter-SemiBold',
    color: colors.text,
  },
  itemTableSub: {
    fontSize: rem(9.5),
    fontFamily: 'Inter-Regular',
    color: colors.textMuted,
  },
  itemTableSubtotal: {
    fontSize: rem(11.5),
    fontFamily: 'Inter-Bold',
    color: colors.text,
  },
  itemsEmpty: {
    padding: rem(20),
    alignItems: 'center',
  },
  itemsEmptyText: {
    fontSize: rem(11),
    fontFamily: 'Inter-Regular',
    color: colors.textMuted,
  },
  payDialogBox: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: rem(20),
    padding: rem(18),
    borderWidth: 1,
    borderColor: mode === 'light' ? '#EAE5DA' : '#334155',
  },
  payDialogSubText: {
    fontSize: rem(12),
    fontFamily: 'Inter-Regular',
    color: colors.text,
    marginBottom: rem(4),
  },
  formScroll: {
    marginBottom: rem(10),
  },
  inputLabel: {
    fontSize: rem(11),
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    color: colors.text,
    marginBottom: rem(6),
  },
  textInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: mode === 'light' ? '#EAE5DA' : '#334155',
    borderRadius: rem(10),
    height: rem(42),
    color: colors.text,
    paddingHorizontal: rem(12),
    fontSize: rem(13),
    fontFamily: 'Inter-Regular',
    marginBottom: rem(14),
  },
  pickerBoxRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rem(8),
    marginBottom: rem(14),
  },
  pickerChip: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: mode === 'light' ? '#EAE5DA' : '#334155',
    borderRadius: rem(8),
    paddingHorizontal: rem(12),
    paddingVertical: rem(6),
  },
  pickerChipActive: {
    backgroundColor: colors.primary + '10',
    borderColor: colors.primary,
  },
  pickerChipText: {
    fontSize: rem(11),
    fontFamily: 'Inter-Regular',
    color: colors.textMuted,
  },
  pickerChipTextActive: {
    fontFamily: 'Inter-Bold',
    color: colors.primary,
  },
  formRow: {
    flexDirection: 'row',
    gap: rem(12),
  },
  formCol: {
    flex: 1,
  },
  saveBtn: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    borderRadius: rem(12),
    height: rem(46),
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
    marginTop: rem(16),
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: rem(13),
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
  },
});
