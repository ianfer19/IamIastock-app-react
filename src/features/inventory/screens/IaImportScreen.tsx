import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Platform,
  LayoutAnimation,
  UIManager,
  FlatList,
  Modal,
  RefreshControl,
  Alert
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useStatusModal } from '@/core/context/StatusModalContext';
import { ExpenseOcrService, ExpenseOcrDraft, OcrLineaFactura } from '@/infrastructure/services/expenseOcrService';
import { InventoryService } from '@/infrastructure/services/inventoryService';
import { PosService } from '@/infrastructure/services/posService';
import { rem } from '@/core/utils/responsive';
import { CurrencyService } from '@/core/services/currencyService';
import { 
  ArrowLeft, 
  Sparkles, 
  CheckCircle, 
  Brain, 
  Cpu,
  Camera,
  FileText,
  Check,
  Edit2,
  Trash2,
  AlertCircle,
  Plus,
  RefreshCw,
  Clock,
  ChevronDown,
  Info,
  DollarSign,
  Calendar,
  X,
  CreditCard,
  ShoppingBag,
  ListCollapse
} from 'lucide-react-native';
import { MotiView, MotiText, AnimatePresence } from 'moti';
import * as Haptics from 'expo-haptics';
import { PremiumSubScreenHeader } from '../components/PremiumSubScreenHeader';
import { useTheme } from '@/core/theme/theme';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface IaImportScreenProps {
  onBack: () => void;
}

export const IaImportScreen = ({ onBack }: IaImportScreenProps) => {
  const { colors, mode } = useTheme();
  const styles = getStyles(colors, mode);
  const { showStatus } = useStatusModal();

  // Core list states
  const [drafts, setDrafts] = useState<ExpenseOcrDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState('');

  // Catalog cache for mapping dropdowns
  const [catalogItems, setCatalogItems] = useState<{ label: string; value: string; type: 'PRODUCT' | 'INGREDIENT' }[]>([]);
  const [suppliers, setSuppliers] = useState<{ id: string; nombre: string; nit: string }[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<{ id: string; name: string }[]>([]);

  // Review Modal States
  const [selectedDraft, setSelectedDraft] = useState<ExpenseOcrDraft | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [invoiceType, setInvoiceType] = useState<'GENERAL' | 'PROCUREMENT'>('GENERAL');
  
  // Review Form States
  const [formVendorName, setFormVendorName] = useState('');
  const [formProveedorId, setFormProveedorId] = useState('');
  const [formPaymentMethodId, setFormPaymentMethodId] = useState('');
  const [formNumeroFactura, setFormNumeroFactura] = useState('');
  const [formFechaEmision, setFormFechaEmision] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formLineas, setFormLineas] = useState<OcrLineaFactura[]>([]);

  // Form dropdown triggers
  const [activeDropdownIndex, setActiveDropdownIndex] = useState<number | null>(null);
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [showPaymentMethodDropdown, setShowPaymentMethodDropdown] = useState(false);

  // Search queries inside dropdowns
  const [supplierSearch, setSupplierSearch] = useState('');
  const [itemSearch, setItemSearch] = useState('');

  // Fetch initial OCR drafts and master metadata
  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      // 1. Fetch OCR Drafts
      const list = await ExpenseOcrService.getDrafts();
      setDrafts(list);

      // 2. Fetch Master Suppliers
      const loadedSuppliers = await InventoryService.getSuppliers();
      setSuppliers(loadedSuppliers.map(s => ({
        id: s.id,
        nombre: s.nombre,
        nit: s.nit || ''
      })));

      // 3. Fetch Master Payment Methods
      const methods = await PosService.getPaymentMethods();
      setPaymentMethods(methods.map(m => ({
        id: m.id,
        name: m.name
      })));

      // 4. Fetch Products & Ingredients
      const [products, ingredients] = await Promise.all([
        PosService.getProducts(),
        PosService.getIngredients()
      ]);

      const items = [
        ...products.map(p => ({
          label: `[P] ${p.nombre}`,
          value: p.id || '',
          type: 'PRODUCT' as const
        })),
        ...ingredients.map(i => ({
          label: `[I] ${i.nombre}`,
          value: i.id || '',
          type: 'INGREDIENT' as const
        }))
      ].filter(item => item.value !== '');
      setCatalogItems(items.sort((a, b) => a.label.localeCompare(b.label)));

    } catch (e) {
      console.error('Error fetching dashboard data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData(true);
  };

  // S3 OCR Capture & Upload mechanism
  const triggerImageCapture = async (source: 'camera' | 'library') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    let result;
    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso Requerido', 'Necesitamos acceso a la cámara para capturar facturas.');
        return;
      }
      result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso Requerido', 'Necesitamos acceso a tu galería para cargar facturas.');
        return;
      }
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });
    }

    if (result.canceled || !result.assets || result.assets.length === 0) return;

    const fileUri = result.assets[0].uri;
    const fileName = fileUri.split('/').pop() || `invoice_${Date.now()}.jpg`;
    const mimeType = 'image/jpeg';

    setUploading(true);
    setUploadStep('Obteniendo enlace seguro de carga...');

    try {
      // Step 1: Get presigned upload url from Lambda
      const uploadConfig = await ExpenseOcrService.getUploadUrl(fileName, mimeType);
      
      setUploadStep('Transmitiendo factura a S3...');
      
      // Step 2: PUT byte array directly to S3 bucket
      await ExpenseOcrService.uploadFile(uploadConfig.upload_url, fileUri, mimeType);
      
      setUploadStep('Procesando factura con Inteligencia Artificial...');
      
      // Artificial short delay to let OCR trigger async Lambda OCR text extraction
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showStatus({
        type: 'success',
        title: 'Documento Recibido',
        message: 'La factura ha sido subida con éxito y el motor de IA de IAStock se encuentra procesándola en segundo plano. Pull-to-refresh para actualizar.',
        actionText: 'Perfecto'
      });
      
      fetchData(true);
    } catch (err: any) {
      console.error('Error in capture pipeline:', err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showStatus({
        type: 'error',
        title: 'Error de Carga',
        message: 'No se pudo subir la factura. Por favor verifica tu red.',
        actionText: 'Aceptar'
      });
    } finally {
      setUploading(false);
      setUploadStep('');
    }
  };

  const handleOpenReview = (draft: ExpenseOcrDraft) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedDraft(draft);
    
    // Bind form states
    setFormVendorName(draft.vendor_name || '');
    setFormProveedorId(draft.proveedor_id || '');
    setFormNumeroFactura(draft.numero_factura || 'S/N');
    setFormFechaEmision(draft.fecha_emision?.split('T')[0] || new Date().toISOString().split('T')[0]);
    setFormDescription(draft.description || `Compra a ${draft.vendor_name || 'Proveedor'}`);
    setFormPaymentMethodId(paymentMethods[0]?.id || '');
    
    // Hydrate form line items with automatic safety overrides
    const hydratedLines = (draft.lineas || []).map(line => ({
      ...line,
      item_id: line.item_id || null,
      tipo: line.tipo || 'PRODUCT',
      cantidad: line.cantidad || 1,
      costo_unitario: line.costo_unitario || 0,
      iva_porcentaje: line.iva_porcentaje || 0,
      subtotal: line.subtotal || (line.cantidad * line.costo_unitario),
      total_linea: line.total_linea || (line.cantidad * line.costo_unitario * (1 + (line.iva_porcentaje || 0) / 100))
    }));
    
    setFormLineas(hydratedLines);
    setInvoiceType('GENERAL');
    
    // Reset dropdown toggles
    setActiveDropdownIndex(null);
    setShowSupplierDropdown(false);
    setShowPaymentMethodDropdown(false);
    setSupplierSearch('');
    setItemSearch('');

    setIsReviewOpen(true);
  };

  // Live total calculations
  const calculatedTotals = useMemo(() => {
    let subtotalSum = 0;
    let ivaSum = 0;
    
    formLineas.forEach(line => {
      const sub = line.cantidad * line.costo_unitario;
      const iva = sub * (line.iva_porcentaje / 100);
      subtotalSum += sub;
      ivaSum += iva;
    });

    return {
      subtotal: subtotalSum,
      total_iva: ivaSum,
      total_neto: subtotalSum + ivaSum
    };
  }, [formLineas]);

  // Handle line edits
  const handleUpdateLine = (index: number, field: keyof OcrLineaFactura, val: any) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setFormLineas(prev => prev.map((line, idx) => {
      if (idx !== index) return line;
      const updated = { ...line, [field]: val };
      
      // Auto computed line subtotal and total
      const qty = field === 'cantidad' ? parseFloat(val) || 0 : line.cantidad;
      const cost = field === 'costo_unitario' ? parseFloat(val) || 0 : line.costo_unitario;
      const ivaPct = field === 'iva_porcentaje' ? parseFloat(val) || 0 : line.iva_porcentaje;
      
      updated.subtotal = qty * cost;
      updated.total_linea = qty * cost * (1 + ivaPct / 100);
      return updated;
    }));
  };

  const handleAddLineItem = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setFormLineas(prev => [...prev, {
      item_id: null,
      tipo: 'PRODUCT',
      nombre: '',
      nombre_ocr: '',
      cantidad: 1,
      costo_unitario: 0,
      total_linea: 0,
      iva_porcentaje: 0,
      subtotal: 0,
      match_status: 'NO_MATCH',
      match_confidence: 0
    }]);
  };

  const handleRemoveLineItem = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setFormLineas(prev => prev.filter((_, idx) => idx !== index));
    if (activeDropdownIndex === index) setActiveDropdownIndex(null);
  };

  const handleSelectCatalogItem = (index: number, matchedItem: typeof catalogItems[0]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    
    setFormLineas(prev => prev.map((line, idx) => {
      if (idx !== index) return line;
      return {
        ...line,
        item_id: matchedItem.value,
        nombre: matchedItem.label.replace(/^\[[PI]\] /, ''),
        tipo: matchedItem.type,
        match_status: 'MATCHED',
        match_confidence: 1.0
      };
    }));
    
    setActiveDropdownIndex(null);
    setItemSearch('');
  };

  const handleConfirmReview = async () => {
    if (!selectedDraft) return;

    if (!formVendorName.trim() || !formPaymentMethodId) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Validación Requerida', 'Por favor ingresa un nombre de proveedor y selecciona un método de pago.');
      return;
    }

    // Verify all lines are properly mapped to database catalog items
    const unmappedLines = formLineas.filter(l => !l.item_id);
    if (unmappedLines.length > 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        'Elementos No Mapeados',
        `Tienes ${unmappedLines.length} filas sin vincular a productos o ingredientes de tu catálogo. Debes enlazarlos para guardar.`
      );
      return;
    }

    setLoading(true);
    setIsReviewOpen(false);

    try {
      const isoDate = new Date(formFechaEmision).toISOString();
      const payload = {
        vendor_name: formVendorName,
        proveedor_id: formProveedorId || '',
        payment_method_id: formPaymentMethodId,
        numero_factura: formNumeroFactura,
        fecha_emision: isoDate,
        fecha_contabilizacion: isoDate,
        description: formDescription,
        subtotal: calculatedTotals.subtotal,
        total_iva: calculatedTotals.total_iva,
        total_neto: calculatedTotals.total_neto,
        evidence_url: selectedDraft.evidence_url || '',
        moneda: selectedDraft.moneda || 'COP',
        lineas: formLineas.map(l => ({
          ...l,
          item_id: l.item_id || ''
        }))
      };

      if (invoiceType === 'PROCUREMENT') {
        // Step 1: Save procurement invoice affects stock & PPC (purchase pricing metrics)
        await ExpenseOcrService.saveProcurementInvoice(payload);
        // Step 2: Delete OCR draft as it's completed
        await ExpenseOcrService.deleteDraft(selectedDraft.id);
      } else {
        // Simple confirmation draft (general oper expenditure)
        await ExpenseOcrService.confirmDraft(selectedDraft.id, payload);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showStatus({
        type: 'success',
        title: 'Factura Procesada',
        message: invoiceType === 'PROCUREMENT' 
          ? 'La compra ha sido registrada en stock y los promedios de costos ponderados fueron actualizados con éxito.'
          : 'El gasto general de la factura ha sido confirmado y cargado a las cuentas de cierre.',
        actionText: 'Excelente'
      });

      fetchData();
    } catch (err: any) {
      console.error('Error confirming draft:', err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showStatus({
        type: 'error',
        title: 'Error de Guardado',
        message: 'Ocurrió un error guardando el documento. Por favor valida el formato de red.',
        actionText: 'Cerrar'
      });
      setIsReviewOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDraft = async (id: string) => {
    Alert.alert(
      'Descartar Factura',
      '¿Estás seguro de que deseas eliminar este borrador de factura permanentemente?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Descartar',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await ExpenseOcrService.deleteDraft(id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              fetchData(true);
            } catch (err) {
              console.error('Error deleting draft:', err);
              Alert.alert('Error', 'No se pudo descartar el documento.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // Filters for dropdown selectors
  const filteredSuppliers = useMemo(() => {
    if (!supplierSearch) return suppliers;
    return suppliers.filter(s => s.nombre.toLowerCase().includes(supplierSearch.toLowerCase()));
  }, [suppliers, supplierSearch]);

  const filteredCatalogItems = useMemo(() => {
    if (!itemSearch) return catalogItems;
    return catalogItems.filter(i => i.label.toLowerCase().includes(itemSearch.toLowerCase()));
  }, [catalogItems, itemSearch]);

  const renderDraftItem = ({ item }: { item: ExpenseOcrDraft }) => {
    const isProcessing = item.status === 'PROCESSING';
    const isReady = item.status === 'READY';
    const isError = item.status === 'ERROR';

    return (
      <View style={styles.draftCard}>
        <View style={styles.draftCardHeader}>
          <View style={styles.draftTitleCol}>
            <Text style={styles.draftVendor} numberOfLines={1}>
              {item.vendor_name || 'Factura Inteligente'}
            </Text>
            <View style={styles.draftSubRow}>
              <FileText size={rem(10)} color={colors.textMuted} style={{ marginRight: 4 }} />
              <Text style={styles.draftInvoiceNo}>Nro: {item.numero_factura || 'Reconociendo...'}</Text>
            </View>
          </View>
          
          {/* Custom Dynamic Status Badge */}
          {isProcessing && (
            <MotiView
              from={{ opacity: 0.7 }}
              animate={{ opacity: 1 }}
              transition={{ loop: true, type: 'timing', duration: 1000 }}
              style={[styles.statusBadge, styles.statusProcessing]}
            >
              <ActivityIndicator size="small" color="#F59E0B" style={{ marginRight: 4 }} />
              <Text style={styles.statusTextProcessing}>Procesando...</Text>
            </MotiView>
          )}

          {isReady && (
            <View style={[styles.statusBadge, styles.statusReady]}>
              <CheckCircle size={rem(10)} color="#10B981" style={{ marginRight: 4 }} />
              <Text style={styles.statusTextReady}>Listo</Text>
            </View>
          )}

          {isError && (
            <View style={[styles.statusBadge, styles.statusError]}>
              <AlertCircle size={rem(10)} color="#EF4444" style={{ marginRight: 4 }} />
              <Text style={styles.statusTextError}>Error</Text>
            </View>
          )}
        </View>

        <View style={styles.draftDetailsRow}>
          <View style={styles.detailCol}>
            <Text style={styles.detailLabel}>FECHA EXTRACCIÓN</Text>
            <Text style={styles.detailValue}>
              {item.fecha_emision ? item.fecha_emision.split('T')[0] : 'En proceso'}
            </Text>
          </View>
          <View style={styles.detailCol}>
            <Text style={styles.detailLabel}>CONCEPTOS DETECTADOS</Text>
            <Text style={styles.detailValue}>
              {item.lineas?.length || 0} filas
            </Text>
          </View>
          <View style={styles.detailCol}>
            <Text style={styles.detailLabel}>TOTAL NETO</Text>
            <Text style={styles.detailValueTotal}>
              {CurrencyService.format(item.total_neto || 0)}
            </Text>
          </View>
        </View>

        <View style={styles.draftCardFooter}>
          {isReady ? (
            <TouchableOpacity 
              style={styles.reviewBtn}
              activeOpacity={0.8}
              onPress={() => handleOpenReview(item)}
            >
              <Sparkles size={rem(12)} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.reviewBtnText}>Revisar y Confirmar</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.reviewBtnDisabled}>
              <Clock size={rem(12)} color={colors.textMuted} style={{ marginRight: 6 }} />
              <Text style={styles.reviewBtnTextDisabled}>Esperando IA...</Text>
            </View>
          )}

          <TouchableOpacity 
            style={styles.discardBtn}
            activeOpacity={0.8}
            onPress={() => handleDeleteDraft(item.id)}
          >
            <Trash2 size={rem(12)} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <PremiumSubScreenHeader
        title="Importar Insumos con IA"
        subtitle="Cognitive S3 OCR"
        onBack={onBack}
      />

      {/* Upload & Floating Camera Action Block */}
      <View style={styles.uploadSection}>
        <MotiView
          from={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          style={styles.heroUploadCard}
        >
          <View style={styles.heroLogoRow}>
            <View style={styles.neuralHub}>
              <Brain size={rem(20)} color={colors.primary} />
            </View>
            <Text style={styles.heroTitle}>IAStock Cognitive Scanner</Text>
            <View style={styles.heroPill}>
              <Text style={styles.heroPillText}>AUTÓNOMO</Text>
            </View>
          </View>

          <Text style={styles.heroDescription}>
            Sube o captura una foto de la factura física. La red neuronal en AWS procesará el documento, extraerá cantidades, costos e intentará mapear los insumos automáticamente.
          </Text>

          <View style={styles.uploadButtonsRow}>
            <TouchableOpacity 
              style={[styles.captureBtn, styles.primaryCapture]}
              activeOpacity={0.8}
              onPress={() => triggerImageCapture('camera')}
            >
              <Camera size={rem(15)} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.captureBtnText}>Cámara POS</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.captureBtn, styles.secondaryCapture]}
              activeOpacity={0.8}
              onPress={() => triggerImageCapture('library')}
            >
              <FileText size={rem(15)} color={colors.text} style={{ marginRight: 6 }} />
              <Text style={styles.captureBtnTextDark}>Subir Imagen</Text>
            </TouchableOpacity>
          </View>
        </MotiView>
      </View>

      {/* Main drafts dashboard list */}
      <View style={{ flex: 1, paddingHorizontal: rem(16), marginTop: rem(10) }}>
        <View style={styles.listHeaderRow}>
          <Text style={styles.listTitle}>Bandeja de Facturas OCR</Text>
          <TouchableOpacity 
            style={styles.syncBtn} 
            activeOpacity={0.7} 
            onPress={() => fetchData(true)}
          >
            <RefreshCw size={rem(12)} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {loading && drafts.length === 0 ? (
          <View style={styles.listEmptyBlock}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.emptyLabelText}>Cargando bandeja de borradores...</Text>
          </View>
        ) : (
          <FlatList
            data={drafts}
            keyExtractor={item => item.id}
            renderItem={renderDraftItem}
            contentContainerStyle={styles.listScroll}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={colors.primary}
              />
            }
            ListEmptyComponent={
              <View style={styles.listEmptyBlock}>
                <Clock size={rem(24)} color={colors.textMuted} style={{ marginBottom: rem(8) }} />
                <Text style={styles.emptyLabelText}>No tienes facturas pendientes de revisión.</Text>
                <Text style={styles.emptySubText}>Toma una captura arriba para procesar con IA.</Text>
              </View>
            }
          />
        )}
      </View>

      {/* Neural Upload Loading overlay */}
      {uploading && (
        <View style={styles.overlayLoader}>
          <View style={styles.loaderBubble}>
            <MotiView
              from={{ rotate: '0deg' }}
              animate={{ rotate: '360deg' }}
              transition={{ loop: true, type: 'timing', duration: 2000 }}
              style={styles.neuralReticle}
            />
            <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: rem(15) }} />
            <Text style={styles.overlayLoadingTitle}>EXTRAYENDO CONCEPTOS</Text>
            <Text style={styles.overlayLoadingText}>{uploadStep}</Text>
          </View>
        </View>
      )}

      {/* FULL SCREEN DRAFT REVIEW MODAL */}
      <Modal visible={isReviewOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Revisión e Ingesta IA</Text>
                <Text style={styles.modalSubtitle}>Valida los datos extraídos por el OCR</Text>
              </View>
              <TouchableOpacity 
                style={styles.modalCloseBtn}
                onPress={() => setIsReviewOpen(false)}
              >
                <X size={rem(15)} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.modalScroll} 
              contentContainerStyle={{ paddingBottom: rem(40) }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Type selection: GENERAL vs PROCUREMENT */}
              <View style={styles.formSection}>
                <Text style={styles.sectionLabel}>Tipo de Ingesta Financiera</Text>
                <View style={styles.typeSelectorRow}>
                  <TouchableOpacity
                    style={[styles.typeBtn, invoiceType === 'PROCUREMENT' && styles.typeBtnActive]}
                    activeOpacity={0.8}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setInvoiceType('PROCUREMENT');
                    }}
                  >
                    <ShoppingBag size={rem(12)} color={invoiceType === 'PROCUREMENT' ? '#FFFFFF' : colors.text} style={{ marginRight: 6 }} />
                    <Text style={[styles.typeBtnText, invoiceType === 'PROCUREMENT' && styles.typeBtnTextActive]}>
                      Compra Inventario (Materia Prima)
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.typeBtn, invoiceType === 'GENERAL' && styles.typeBtnActive]}
                    activeOpacity={0.8}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setInvoiceType('GENERAL');
                    }}
                  >
                    <CreditCard size={rem(12)} color={invoiceType === 'GENERAL' ? '#FFFFFF' : colors.text} style={{ marginRight: 6 }} />
                    <Text style={[styles.typeBtnText, invoiceType === 'GENERAL' && styles.typeBtnTextActive]}>
                      Gasto Caja (Servicios / Otro)
                    </Text>
                  </TouchableOpacity>
                </View>

                {invoiceType === 'PROCUREMENT' ? (
                  <View style={styles.infoAlert}>
                    <Info size={rem(12)} color={colors.primary} style={{ marginRight: 6 }} />
                    <Text style={styles.infoAlertText}>
                      Esta opción incrementará las cantidades de stock y recalculará el Costo Promedio Ponderado (PPC) de tus ingredientes e insumos.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.infoAlert}>
                    <Info size={rem(12)} color={colors.primary} style={{ marginRight: 6 }} />
                    <Text style={styles.infoAlertText}>
                      Esta opción restará saldo directamente del cierre de caja del POS bajo un concepto contable general.
                    </Text>
                  </View>
                )}
              </View>

              {/* Core Metadata Fields */}
              <View style={styles.formSection}>
                <Text style={styles.sectionLabel}>Datos del Emisor y Documento</Text>
                
                {/* Supplier selection dropdown */}
                <View style={styles.inputWrapper}>
                  <Text style={styles.fieldLabel}>Proveedor de Insumos *</Text>
                  <TouchableOpacity 
                    style={styles.dropdownInputTrigger}
                    activeOpacity={0.8}
                    onPress={() => setShowSupplierDropdown(!showSupplierDropdown)}
                  >
                    <Text style={formProveedorId ? styles.triggerTextActive : styles.triggerTextPlaceholder}>
                      {formVendorName || 'Seleccionar Proveedor...'}
                    </Text>
                    <ChevronDown size={rem(14)} color={colors.textMuted} />
                  </TouchableOpacity>

                  {showSupplierDropdown && (
                    <View style={styles.dropdownPickerBox}>
                      <TextInput
                        style={styles.dropdownPickerSearch}
                        placeholder="Buscar Proveedor..."
                        placeholderTextColor={colors.textMuted}
                        value={supplierSearch}
                        onChangeText={setSupplierSearch}
                      />
                      <ScrollView style={styles.dropdownPickerScroll} keyboardShouldPersistTaps="handled">
                        {filteredSuppliers.map(s => (
                          <TouchableOpacity
                            key={s.id}
                            style={styles.dropdownPickerItem}
                            onPress={() => {
                              setFormProveedorId(s.id);
                              setFormVendorName(s.nombre);
                              setShowSupplierDropdown(false);
                            }}
                          >
                            <Text style={styles.dropdownPickerItemLabel}>{s.nombre}</Text>
                            <Text style={styles.dropdownPickerItemSub}>{s.nit}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>

                {/* Form fields row */}
                <View style={styles.formGrid}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Número Factura</Text>
                    <TextInput
                      style={styles.standardInput}
                      value={formNumeroFactura}
                      onChangeText={setFormNumeroFactura}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Fecha Emisión *</Text>
                    <TextInput
                      style={styles.standardInput}
                      value={formFechaEmision}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={colors.textMuted}
                      onChangeText={setFormFechaEmision}
                    />
                  </View>
                </View>

                {/* Payment Method */}
                <View style={styles.inputWrapper}>
                  <Text style={styles.fieldLabel}>Método Pago Contabilizado *</Text>
                  <TouchableOpacity 
                    style={styles.dropdownInputTrigger}
                    activeOpacity={0.8}
                    onPress={() => setShowPaymentMethodDropdown(!showPaymentMethodDropdown)}
                  >
                    <Text style={formPaymentMethodId ? styles.triggerTextActive : styles.triggerTextPlaceholder}>
                      {paymentMethods.find(m => m.id === formPaymentMethodId)?.name || 'Selecciona método...'}
                    </Text>
                    <ChevronDown size={rem(14)} color={colors.textMuted} />
                  </TouchableOpacity>

                  {showPaymentMethodDropdown && (
                    <View style={styles.dropdownPickerBox}>
                      <ScrollView style={styles.dropdownPickerScroll} keyboardShouldPersistTaps="handled">
                        {paymentMethods.map(m => (
                          <TouchableOpacity
                            key={m.id}
                            style={styles.dropdownPickerItem}
                            onPress={() => {
                              setFormPaymentMethodId(m.id);
                              setShowPaymentMethodDropdown(false);
                            }}
                          >
                            <Text style={styles.dropdownPickerItemLabel}>{m.name}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>

                <View style={{ marginTop: rem(10) }}>
                  <Text style={styles.fieldLabel}>Descripción Contable</Text>
                  <TextInput
                    style={styles.standardInput}
                    value={formDescription}
                    onChangeText={setFormDescription}
                  />
                </View>
              </View>

              {/* Line Items Table details */}
              <View style={styles.formSection}>
                <View style={styles.lineHeaderRow}>
                  <Text style={styles.sectionLabel}>Líneas y Mapeo de Conceptos</Text>
                  <TouchableOpacity 
                    style={styles.addLineBtn}
                    activeOpacity={0.8}
                    onPress={handleAddLineItem}
                  >
                    <Plus size={rem(12)} color={colors.primary} style={{ marginRight: 4 }} />
                    <Text style={styles.addLineBtnText}>Agregar Fila</Text>
                  </TouchableOpacity>
                </View>

                {formLineas.map((line, index) => (
                  <View key={index} style={styles.lineItemCard}>
                    
                    {/* Raw string header */}
                    {line.nombre_ocr ? (
                      <View style={styles.ocrRawPill}>
                        <Clock size={rem(9)} color={colors.textMuted} style={{ marginRight: 4 }} />
                        <Text style={styles.ocrRawText} numberOfLines={1}>
                          Texto en Factura: "{line.nombre_ocr}"
                        </Text>
                      </View>
                    ) : null}

                    {/* Mappings selection dropdown */}
                    <View style={{ marginTop: rem(8) }}>
                      <Text style={styles.fieldLabel}>Vincular Insumo Catálogo *</Text>
                      <TouchableOpacity
                        style={[styles.dropdownInputTrigger, !line.item_id && styles.dropdownInputTriggerError]}
                        activeOpacity={0.8}
                        onPress={() => setActiveDropdownIndex(activeDropdownIndex === index ? null : index)}
                      >
                        <Text style={line.item_id ? styles.triggerTextActive : styles.triggerTextPlaceholder}>
                          {line.item_id 
                            ? `[${line.tipo === 'PRODUCT' ? 'P' : 'I'}] ${line.nombre}` 
                            : 'Mapear a Insumo / Producto...'}
                        </Text>
                        <ChevronDown size={rem(14)} color={colors.textMuted} />
                      </TouchableOpacity>

                      {activeDropdownIndex === index && (
                        <View style={styles.dropdownPickerBox}>
                          <TextInput
                            style={styles.dropdownPickerSearch}
                            placeholder="Buscar en Catálogo (Productos e Insumos)..."
                            placeholderTextColor={colors.textMuted}
                            value={itemSearch}
                            onChangeText={setItemSearch}
                          />
                          <ScrollView style={styles.dropdownPickerScroll} keyboardShouldPersistTaps="handled">
                            {filteredCatalogItems.map(item => (
                              <TouchableOpacity
                                key={item.value}
                                style={styles.dropdownPickerItem}
                                onPress={() => handleSelectCatalogItem(index, item)}
                              >
                                <Text style={styles.dropdownPickerItemLabel}>{item.label}</Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>
                      )}
                    </View>

                    {/* Line Quantities, Cost, and IVA metrics */}
                    <View style={styles.lineMetricsGrid}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.fieldLabel}>Cantidad</Text>
                        <TextInput
                          style={styles.standardInput}
                          keyboardType="numeric"
                          value={line.cantidad?.toString() || '0'}
                          onChangeText={v => handleUpdateLine(index, 'cantidad', v)}
                        />
                      </View>

                      <View style={{ flex: 1.5 }}>
                        <Text style={styles.fieldLabel}>Costo Unitario</Text>
                        <TextInput
                          style={styles.standardInput}
                          keyboardType="numeric"
                          value={line.costo_unitario?.toString() || '0'}
                          onChangeText={v => handleUpdateLine(index, 'costo_unitario', v)}
                        />
                      </View>

                      <View style={{ flex: 0.8 }}>
                        <Text style={styles.fieldLabel}>% IVA</Text>
                        <TextInput
                          style={styles.standardInput}
                          keyboardType="numeric"
                          value={line.iva_porcentaje?.toString() || '0'}
                          onChangeText={v => handleUpdateLine(index, 'iva_porcentaje', v)}
                        />
                      </View>

                      <TouchableOpacity 
                        style={styles.removeLineBtn}
                        onPress={() => handleRemoveLineItem(index)}
                      >
                        <Trash2 size={rem(14)} color="#EF4444" />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.lineTotalPanel}>
                      <Text style={styles.lineTotalLabel}>Subtotal Fila:</Text>
                      <Text style={styles.lineTotalValue}>
                        {CurrencyService.format(line.subtotal || 0)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>

              {/* Aggregated totals Panel summary */}
              <View style={styles.totalsSectionCard}>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Subtotal Compra</Text>
                  <Text style={styles.totalVal}>{CurrencyService.format(calculatedTotals.subtotal)}</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Impuesto (IVA Consolidado)</Text>
                  <Text style={styles.totalVal}>{CurrencyService.format(calculatedTotals.total_iva)}</Text>
                </View>
                <View style={styles.netTotalRow}>
                  <Text style={styles.netTotalLabel}>Total Ingerido</Text>
                  <Text style={styles.netTotalVal}>{CurrencyService.format(calculatedTotals.total_neto)}</Text>
                </View>
              </View>

              {/* Save & Discard buttons */}
              <View style={styles.modalActionRow}>
                <TouchableOpacity 
                  style={styles.modalSubmitBtn}
                  activeOpacity={0.8}
                  onPress={handleConfirmReview}
                >
                  <Check size={rem(15)} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.modalSubmitBtnText}>Registrar Factura Mapeada</Text>
                </TouchableOpacity>
              </View>

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
  uploadSection: {
    paddingHorizontal: rem(16),
    paddingTop: rem(12),
  },
  heroUploadCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: mode === 'light' ? '#EAE5DA' : '#334155',
    borderRadius: rem(18),
    padding: rem(16),
    shadowColor: '#1A365D',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  heroLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: rem(8),
  },
  neuralHub: {
    width: rem(30),
    height: rem(30),
    borderRadius: rem(15),
    backgroundColor: 'rgba(26, 54, 93, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: rem(8),
  },
  heroTitle: {
    fontSize: rem(13),
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: colors.primary,
    flex: 1,
  },
  heroPill: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: rem(6),
    paddingHorizontal: rem(6),
    paddingVertical: rem(2),
  },
  heroPillText: {
    fontSize: rem(7),
    fontFamily: 'Inter-Bold',
    fontWeight: '900',
    color: '#10B981',
  },
  heroDescription: {
    fontSize: rem(10.5),
    fontFamily: 'Inter-Regular',
    color: colors.textMuted,
    lineHeight: rem(15),
    marginBottom: rem(14),
  },
  uploadButtonsRow: {
    flexDirection: 'row',
    gap: rem(10),
  },
  captureBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: rem(42),
    borderRadius: rem(12),
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryCapture: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
  },
  secondaryCapture: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: mode === 'light' ? '#EAE5DA' : '#475569',
    shadowColor: '#1E293B',
    shadowOpacity: 0.04,
  },
  captureBtnText: {
    fontSize: rem(12),
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: '#FFFFFF',
  },
  captureBtnTextDark: {
    fontSize: rem(12),
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: colors.text,
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: rem(10),
  },
  listTitle: {
    fontSize: rem(13),
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: colors.primary,
  },
  syncBtn: {
    width: rem(26),
    height: rem(26),
    borderRadius: rem(13),
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: mode === 'light' ? '#EAE5DA' : '#334155',
  },
  listScroll: {
    paddingBottom: rem(40),
    gap: rem(12),
  },
  listEmptyBlock: {
    alignItems: 'center',
    paddingVertical: rem(50),
    backgroundColor: colors.surface,
    borderRadius: rem(16),
    borderWidth: 1,
    borderColor: mode === 'light' ? '#EAE5DA' : '#334155',
  },
  emptyLabelText: {
    fontSize: rem(12),
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    color: colors.text,
    marginTop: rem(4),
  },
  emptySubText: {
    fontSize: rem(10),
    fontFamily: 'Inter-Regular',
    color: colors.textMuted,
    marginTop: rem(2),
  },
  draftCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: mode === 'light' ? '#EAE5DA' : '#334155',
    borderRadius: rem(16),
    padding: rem(14),
    shadowColor: '#1A365D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  draftCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: rem(12),
  },
  draftTitleCol: {
    flex: 1,
  },
  draftVendor: {
    fontSize: rem(13),
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: colors.text,
    marginBottom: rem(2),
  },
  draftSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  draftInvoiceNo: {
    fontSize: rem(9.5),
    fontFamily: 'Inter-Regular',
    color: colors.textMuted,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: rem(6),
    paddingHorizontal: rem(8),
    paddingVertical: rem(4),
    borderWidth: 1,
  },
  statusProcessing: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderColor: 'rgba(245, 158, 11, 0.15)',
  },
  statusReady: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.15)',
  },
  statusError: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.15)',
  },
  statusTextProcessing: {
    fontSize: rem(9),
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: '#F59E0B',
  },
  statusTextReady: {
    fontSize: rem(9),
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: '#10B981',
  },
  statusTextError: {
    fontSize: rem(9),
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: '#EF4444',
  },
  draftDetailsRow: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: mode === 'light' ? '#EAE5DA' : '#334155',
    borderRadius: rem(10),
    padding: rem(10),
    justifyContent: 'space-between',
    marginBottom: rem(12),
  },
  detailCol: {
    flex: 1,
  },
  detailLabel: {
    fontSize: rem(7.5),
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: rem(2),
  },
  detailValue: {
    fontSize: rem(10),
    fontFamily: 'Inter-Regular',
    color: colors.text,
  },
  detailValueTotal: {
    fontSize: rem(10),
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: colors.primary,
  },
  draftCardFooter: {
    flexDirection: 'row',
    gap: rem(10),
  },
  reviewBtn: {
    flex: 1,
    flexDirection: 'row',
    height: rem(34),
    backgroundColor: colors.primary,
    borderRadius: rem(10),
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  reviewBtnDisabled: {
    flex: 1,
    flexDirection: 'row',
    height: rem(34),
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: mode === 'light' ? '#EAE5DA' : '#334155',
    borderRadius: rem(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewBtnText: {
    fontSize: rem(11),
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: '#FFFFFF',
  },
  reviewBtnTextDisabled: {
    fontSize: rem(11),
    fontFamily: 'Inter-Regular',
    color: colors.textMuted,
  },
  discardBtn: {
    width: rem(34),
    height: rem(34),
    borderRadius: rem(10),
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayLoader: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  loaderBubble: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: mode === 'light' ? '#EAE5DA' : '#334155',
    borderRadius: rem(20),
    padding: rem(24),
    alignItems: 'center',
    width: rem(250),
  },
  neuralReticle: {
    width: rem(46),
    height: rem(46),
    borderRadius: rem(23),
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  overlayLoadingTitle: {
    fontSize: rem(11),
    fontFamily: 'Inter-Bold',
    fontWeight: '900',
    color: colors.primary,
    marginTop: rem(12),
    letterSpacing: 1,
  },
  overlayLoadingText: {
    fontSize: rem(9.5),
    fontFamily: 'Inter-Regular',
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: rem(4),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: rem(24),
    borderTopRightRadius: rem(24),
    height: '92%',
    borderWidth: 1,
    borderColor: mode === 'light' ? '#EAE5DA' : '#334155',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: rem(20),
    paddingTop: rem(18),
    paddingBottom: rem(14),
    borderBottomWidth: 1,
    borderBottomColor: mode === 'light' ? '#EAE5DA' : '#334155',
  },
  modalTitle: {
    fontSize: rem(16),
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: colors.primary,
  },
  modalSubtitle: {
    fontSize: rem(10.5),
    fontFamily: 'Inter-Regular',
    color: colors.textMuted,
  },
  modalCloseBtn: {
    width: rem(30),
    height: rem(30),
    borderRadius: rem(15),
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: mode === 'light' ? '#EAE5DA' : '#334155',
  },
  modalScroll: {
    flex: 1,
    paddingHorizontal: rem(20),
    paddingTop: rem(14),
  },
  formSection: {
    marginBottom: rem(18),
  },
  sectionLabel: {
    fontSize: rem(12.5),
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: colors.primary,
    marginBottom: rem(10),
  },
  typeSelectorRow: {
    flexDirection: 'row',
    gap: rem(10),
    marginBottom: rem(10),
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: rem(40),
    borderRadius: rem(10),
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: mode === 'light' ? '#EAE5DA' : '#334155',
    paddingHorizontal: rem(6),
  },
  typeBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeBtnText: {
    fontSize: rem(10),
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  typeBtnTextActive: {
    color: '#FFFFFF',
  },
  infoAlert: {
    flexDirection: 'row',
    backgroundColor: 'rgba(26, 54, 93, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(26, 54, 93, 0.08)',
    borderRadius: rem(10),
    padding: rem(10),
    alignItems: 'center',
  },
  infoAlertText: {
    flex: 1,
    fontSize: rem(9.5),
    fontFamily: 'Inter-Regular',
    color: colors.textMuted,
    lineHeight: rem(13.5),
  },
  fieldLabel: {
    fontSize: rem(10.5),
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    color: colors.text,
    marginBottom: rem(5),
  },
  standardInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: mode === 'light' ? '#EAE5DA' : '#334155',
    borderRadius: rem(10),
    height: rem(40),
    color: colors.text,
    paddingHorizontal: rem(12),
    fontSize: rem(12.5),
    fontFamily: 'Inter-Regular',
  },
  formGrid: {
    flexDirection: 'row',
    gap: rem(12),
    marginVertical: rem(10),
  },
  inputWrapper: {
    zIndex: 999,
    marginBottom: rem(10),
  },
  dropdownInputTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: mode === 'light' ? '#EAE5DA' : '#334155',
    borderRadius: rem(10),
    height: rem(40),
    paddingHorizontal: rem(12),
  },
  dropdownInputTriggerError: {
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  triggerTextActive: {
    fontSize: rem(12.5),
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    color: colors.text,
  },
  triggerTextPlaceholder: {
    fontSize: rem(12.5),
    fontFamily: 'Inter-Regular',
    color: colors.textMuted,
  },
  dropdownPickerBox: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: mode === 'light' ? '#CBD5E1' : '#475569',
    borderRadius: rem(10),
    marginTop: rem(4),
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
    maxHeight: rem(200),
    overflow: 'hidden',
  },
  dropdownPickerSearch: {
    height: rem(38),
    borderBottomWidth: 1,
    borderBottomColor: mode === 'light' ? '#E2E8F0' : '#334155',
    paddingHorizontal: rem(12),
    color: colors.text,
    fontSize: rem(12),
    fontFamily: 'Inter-Regular',
    backgroundColor: colors.background,
  },
  dropdownPickerScroll: {
    maxHeight: rem(160),
  },
  dropdownPickerItem: {
    paddingVertical: rem(10),
    paddingHorizontal: rem(12),
    borderBottomWidth: 1,
    borderBottomColor: mode === 'light' ? '#F1F5F9' : '#1E293B',
  },
  dropdownPickerItemLabel: {
    fontSize: rem(12),
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    color: colors.text,
  },
  dropdownPickerItemSub: {
    fontSize: rem(9.5),
    fontFamily: 'Inter-Regular',
    color: colors.textMuted,
    marginTop: rem(2),
  },
  lineHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: rem(10),
  },
  addLineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(26, 54, 93, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(26, 54, 93, 0.1)',
    borderRadius: rem(8),
    paddingHorizontal: rem(8),
    paddingVertical: rem(5),
  },
  addLineBtnText: {
    fontSize: rem(10.5),
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: colors.primary,
  },
  lineItemCard: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: mode === 'light' ? '#EAE5DA' : '#334155',
    borderRadius: rem(14),
    padding: rem(12),
    marginBottom: rem(12),
  },
  ocrRawPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(203, 213, 225, 0.2)',
    borderRadius: rem(6),
    paddingHorizontal: rem(8),
    paddingVertical: rem(4),
  },
  ocrRawText: {
    fontSize: rem(9.5),
    fontFamily: 'Inter-Regular',
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  lineMetricsGrid: {
    flexDirection: 'row',
    gap: rem(10),
    alignItems: 'flex-end',
    marginTop: rem(10),
  },
  removeLineBtn: {
    width: rem(38),
    height: rem(38),
    borderRadius: rem(10),
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lineTotalPanel: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: rem(8),
    paddingTop: rem(6),
    borderTopWidth: 1,
    borderTopColor: mode === 'light' ? '#EAE5DA' : '#1E293B',
  },
  lineTotalLabel: {
    fontSize: rem(9.5),
    fontFamily: 'Inter-Regular',
    color: colors.textMuted,
    marginRight: rem(4),
  },
  lineTotalValue: {
    fontSize: rem(11),
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: colors.primary,
  },
  totalsSectionCard: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: mode === 'light' ? '#EAE5DA' : '#334155',
    borderRadius: rem(16),
    padding: rem(14),
    marginVertical: rem(10),
    gap: rem(6),
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  totalLabel: {
    fontSize: rem(11),
    fontFamily: 'Inter-Regular',
    color: colors.textMuted,
  },
  totalVal: {
    fontSize: rem(11),
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    color: colors.text,
  },
  netTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: rem(8),
    borderTopWidth: 1,
    borderTopColor: mode === 'light' ? '#CBD5E1' : '#334155',
    marginTop: rem(4),
  },
  netTotalLabel: {
    fontSize: rem(12.5),
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: colors.text,
  },
  netTotalVal: {
    fontSize: rem(14),
    fontFamily: 'Inter-Bold',
    fontWeight: '900',
    color: colors.primary,
  },
  modalActionRow: {
    marginTop: rem(10),
  },
  modalSubmitBtn: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    height: rem(46),
    borderRadius: rem(12),
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  modalSubmitBtnText: {
    fontSize: rem(13),
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
