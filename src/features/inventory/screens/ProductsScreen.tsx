import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  ScrollView,
  Dimensions,
  Platform,
  Switch,
  Alert,
  Image as RNImage,
  Animated
} from 'react-native';
import { useAppSelector } from '@/core/store/store';
import { useStatusModal } from '@/core/context/StatusModalContext';
import { InventoryService } from '@/infrastructure/services/inventoryService';
import { useTheme } from '@/core/theme/theme';
import { Product, RecipeItem } from '@/domain/entities/Product';
import { rem } from '@/core/utils/responsive';
import { CurrencyService } from '@/core/services/currencyService';
import { 
  ArrowLeft, 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  Layers, 
  Tag, 
  AlertTriangle, 
  X, 
  Save,
  CheckSquare,
  Square,
  Box,
  Coins,
  Scale,
  Combine,
  ClipboardList,
  Archive,
  BarChart2,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Printer,
  FileText,
  ShoppingBag,
  SlidersHorizontal
} from 'lucide-react-native';
import { MotiView, AnimatePresence } from 'moti';
import * as Haptics from 'expo-haptics';
import { PremiumSubScreenHeader } from '../components/PremiumSubScreenHeader';
import * as ImagePicker from 'expo-image-picker';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

interface ProductsScreenProps {
  onBack: () => void;
}

type TabType = 'ALL' | 'LOW_STOCK' | 'DELETED';

export const ProductsScreen = ({ onBack }: ProductsScreenProps) => {
  const { colors, mode } = useTheme();
  const styles = getStyles(colors, mode);
  const { showStatus } = useStatusModal();
  
  // Redux Selectors
  const globalProducts = useAppSelector(state => state.catalog.products);
  const globalCategories = useAppSelector(state => state.catalog.categories);
  const globalIngredients = useAppSelector(state => state.catalog.ingredients);
  const globalAdditions = useAppSelector(state => state.catalog.additions);

  const [products, setProducts] = useState<Product[]>(globalProducts);
  const mainScrollY = useRef(new Animated.Value(0)).current;
  const [showScrollBadge, setShowScrollBadge] = useState(true);
  useEffect(() => {
    const id = mainScrollY.addListener(({ value }) => {
      const shouldShow = value < 40;
      if (shouldShow !== showScrollBadge) {
        setShowScrollBadge(shouldShow);
      }
    });
    return () => mainScrollY.removeListener(id);
  }, [showScrollBadge]);
  const [contentHeight, setContentHeight] = useState(1);
  const [visibleHeight, setVisibleHeight] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('TODOS');
  const [activeTab, setActiveTab] = useState<TabType>('ALL');
  
  // Create/Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  
  // Form Sections Collapse State
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    inventory: false,
    recipe: false,
    combo: false,
    billing: false
  });

  // Form Fields
  const [formNombre, setFormNombre] = useState('');
  const [formPrecio, setFormPrecio] = useState('');
  const [formCosto, setFormCosto] = useState('');
  const [formStock, setFormStock] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formDescripcion, setFormDescripcion] = useState('');
  const [formAllowDecimals, setFormAllowDecimals] = useState(false);
  const [formEsInventariable, setFormEsInventariable] = useState(true);
  const [formEsCombo, setFormEsCombo] = useState(false);
  const [formImagenUrl, setFormImagenUrl] = useState('');
  const [formUnidadMedida, setFormUnidadMedida] = useState('Unidad');

  // Dropdown visibility states
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showPrintZoneDropdown, setShowPrintZoneDropdown] = useState(false);
  const [showUnidadDropdown, setShowUnidadDropdown] = useState(false);
  
  // IAStock Special Stock Fields
  const [formUsaStockUtilizable, setFormUsaStockUtilizable] = useState(false);
  const [formCantUtilizable, setFormCantUtilizable] = useState('');
  const [formCantNoUtilizable, setFormCantNoUtilizable] = useState('');
  
  // Recipe Fields
  const [formTieneIngredientes, setFormTieneIngredientes] = useState(false);
  const [formTieneAdiciones, setFormTieneAdiciones] = useState(false);
  const [formIngredientesReceta, setFormIngredientesReceta] = useState<RecipeItem[]>([]);
  const [formAdicionesReceta, setFormAdicionesReceta] = useState<RecipeItem[]>([]);
  
  // Combo Fields
  const [formComponentesCombo, setFormComponentesCombo] = useState<{ id: string; cantidad_uso: number }[]>([]);

  // Print Zone & Invoicing Fields
  const [formPrintZone, setFormPrintZone] = useState('');
  const [formTasaImpuesto, setFormTasaImpuesto] = useState('');
  const [formTributeId, setFormTributeId] = useState('');
  const [formUnitMeasureId, setFormUnitMeasureId] = useState('');

  // Searchable Selector States
  const [ingredientSearch, setIngredientSearch] = useState('');
  const [additionSearch, setAdditionSearch] = useState('');
  const [comboSearch, setComboSearch] = useState('');
  const formScrollRef = useRef<ScrollView>(null);
  const [formScrollY, setFormScrollY] = useState(0);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [tempSearchQuery, setTempSearchQuery] = useState('');
  const [tempActiveTab, setTempActiveTab] = useState<TabType>('ALL');
  const [tempSelectedCategory, setTempSelectedCategory] = useState('TODOS');

  // Print Zones Config
  const PRINT_ZONES = [
    { key: '', label: 'Ninguna' },
    { key: 'COCINA', label: 'Cocina' },
    { key: 'BAR', label: 'Bar' },
    { key: 'CAJA', label: 'Caja' },
    { key: 'OTRO', label: 'Otro' },
  ];

  // Unit Measures Config
  const UNIT_MEASURES = [
    'Unidad', 'Kg', 'Gramo', 'Litro', 'ml', 'Libra', 'Onza', 'Porción', 'Caja', 'Paquete'
  ];

  // Thousands formatter for price/cost display in inputs
  const formatWithThousands = (value: string): string => {
    const num = value.replace(/[^0-9]/g, '');
    if (!num) return '';
    return Number(num).toLocaleString('es-CO');
  };

  const parseFromThousands = (formatted: string): string => {
    return formatted.replace(/\./g, '').replace(/,/g, '');
  };

  // Tax Rates Config (Colombia DIAN)
  const TAX_RATES = [
    { value: '0', label: 'Exento (0%)' },
    { value: '5', label: 'Reducido (5%)' },
    { value: '8', label: 'Especial (8%)' },
    { value: '19', label: 'General (19%)' },
  ];

  // Sync with global products when they change
  useEffect(() => {
    setProducts(globalProducts);
  }, [globalProducts]);

  // Filtering Logic based on Spec
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      // Search filter
      const matchesSearch = p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
                            (p.categoria && p.categoria.toLowerCase().includes(searchQuery.toLowerCase()));
      
      // Category filter
      const matchesCategory = selectedCategory === 'TODOS' || p.categoria === selectedCategory;
      
      // Tab filter
      let matchesTab = true;
      if (activeTab === 'ALL') {
        matchesTab = p.estado !== 'ELIMINADO';
      } else if (activeTab === 'LOW_STOCK') {
        matchesTab = p.estado !== 'ELIMINADO' && p.es_inventariable !== false && p.stock <= 20;
      } else if (activeTab === 'DELETED') {
        matchesTab = p.estado === 'ELIMINADO';
      }
      
      return matchesSearch && matchesCategory && matchesTab;
    });
  }, [products, searchQuery, selectedCategory, activeTab]);

  // Active Filter Count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery.length > 0) count++;
    if (activeTab !== 'ALL') count++;
    if (selectedCategory !== 'TODOS') count++;
    return count;
  }, [searchQuery, activeTab, selectedCategory]);

  const handleApplyFilters = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSearchQuery(tempSearchQuery);
    setActiveTab(tempActiveTab);
    setSelectedCategory(tempSelectedCategory);
    setIsFilterModalOpen(false);
  };

  const handleClearFilters = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTempSearchQuery('');
    setTempActiveTab('ALL');
    setTempSelectedCategory('TODOS');
    
    setSearchQuery('');
    setActiveTab('ALL');
    setSelectedCategory('TODOS');
    setIsFilterModalOpen(false);
  };

  // Inventory Health Metrics Calculations
  const totalProductsCount = useMemo(() => {
    return products.filter(p => p.estado !== 'ELIMINADO').length;
  }, [products]);

  const lowStockCount = useMemo(() => {
    return products.filter(p => p.estado !== 'ELIMINADO' && p.es_inventariable !== false && p.stock <= 20).length;
  }, [products]);

  const inventoryHealthPct = useMemo(() => {
    if (totalProductsCount === 0) return 100;
    return Math.max(0, Math.min(100, Math.round(((totalProductsCount - lowStockCount) / totalProductsCount) * 100)));
  }, [totalProductsCount, lowStockCount]);

  const totalValuation = useMemo(() => {
    return products
      .filter(p => p.estado !== 'ELIMINADO')
      .reduce((sum, p) => sum + ((p.costo_unitario || 0) * p.stock), 0);
  }, [products]);

  // Calculate Combo Cost and Stock automatically
  useEffect(() => {
    if (formEsCombo) {
      let totalCost = 0;
      let maxStock = 999999; // Arbitrary high number
      
      formComponentesCombo.forEach(comp => {
        const originalProd = globalProducts.find(p => p.id === comp.id);
        if (originalProd) {
          totalCost += (originalProd.costo_unitario || 0) * comp.cantidad_uso;
          if (originalProd.es_inventariable !== false) {
            const possibleCombos = Math.floor(originalProd.stock / comp.cantidad_uso);
            if (possibleCombos < maxStock) maxStock = possibleCombos;
          }
        }
      });
      
      setFormCosto(totalCost.toString());
      setFormStock(formComponentesCombo.length > 0 ? maxStock.toString() : '0');
    }
  }, [formComponentesCombo, formEsCombo, globalProducts]);

  // Calculate Total Stock automatically when using stock utilizable
  useEffect(() => {
    if (formUsaStockUtilizable) {
      const util = parseFloat(formCantUtilizable) || 0;
      const noUtil = parseFloat(formCantNoUtilizable) || 0;
      setFormStock((util + noUtil).toString());
    }
  }, [formCantUtilizable, formCantNoUtilizable, formUsaStockUtilizable]);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setShowCategoryDropdown(false);
    setShowPrintZoneDropdown(false);
    setShowUnidadDropdown(false);
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleOpenForm = (product: Product | null = null) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setExpandedSections({ basic: true, inventory: false, recipe: false, combo: false, billing: false });
    
    if (product) {
      setEditingProduct(product);
      setFormNombre(product.nombre);
      setFormPrecio(product.precio.toString());
      setFormCosto(product.costo_unitario ? product.costo_unitario.toString() : '');
      setFormStock(product.stock.toString());
      setFormCategory(product.categoria || 'Alimentos');
      setFormSku(product.sku || '');
      setFormDescripcion(product.descripcion || '');
      setFormAllowDecimals(product.allowDecimals || false);
      setFormEsInventariable(product.es_inventariable !== undefined ? product.es_inventariable : true);
      setFormEsCombo(product.es_combo || false);
      setFormImagenUrl(product.imagen_url || '');
      setFormUnidadMedida(product.unidad_medida || 'Unidad');
      
      // IAStock Special Stock
      setFormUsaStockUtilizable(false); // Default false if not in entity
      setFormCantUtilizable(product.stock.toString());
      setFormCantNoUtilizable('0');
      
      // Recipe
      setFormTieneIngredientes(product.tiene_ingredientes || false);
      setFormTieneAdiciones(product.tiene_adiciones || false);
      setFormIngredientesReceta(product.ingredientes_receta || []);
      setFormAdicionesReceta(product.adiciones_receta || []);
      
      // Combo
      setFormComponentesCombo(product.componentes_combo || []);

      // Billing & Print
      setFormPrintZone(product.print_zone || '');
      setFormTasaImpuesto(product.tasa_impuesto?.toString() || '0');
      setFormTributeId(product.tribute_id?.toString() || '');
      setFormUnitMeasureId(product.unit_measure_id?.toString() || '');

      // Reset search states
      setIngredientSearch('');
      setAdditionSearch('');
      setComboSearch('');
    } else {
      setEditingProduct(null);
      setFormNombre('');
      setFormPrecio('');
      setFormCosto('');
      setFormStock('0');
      setFormCategory(globalCategories[0]?.nombre || 'Alimentos');
      setFormSku('');
      setFormDescripcion('');
      setFormAllowDecimals(false);
      setFormEsInventariable(true);
      setFormEsCombo(false);
      setFormImagenUrl('');
      setFormUnidadMedida('Unidad');
      
      // IAStock Special Stock
      setFormUsaStockUtilizable(false);
      setFormCantUtilizable('0');
      setFormCantNoUtilizable('0');
      
      // Recipe
      setFormTieneIngredientes(false);
      setFormTieneAdiciones(false);
      setFormIngredientesReceta([]);
      setFormAdicionesReceta([]);
      
      // Combo
      setFormComponentesCombo([]);

      // Billing & Print
      setFormPrintZone('');
      setFormTasaImpuesto('0');
      setFormTributeId('');
      setFormUnitMeasureId('');

      // Reset search states
      setIngredientSearch('');
      setAdditionSearch('');
      setComboSearch('');
    }
    setIsModalOpen(true);
  };

  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert('Permiso requerido', 'Se necesita permiso para acceder a la galería.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      // En producción aquí se usaría UploadService para subir a S3
      setFormImagenUrl(result.assets[0].uri);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleSave = async () => {
    if (!formNombre || !formPrecio) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showStatus({
        type: 'error',
        title: 'Error de validación',
        message: 'Por favor completa el nombre y el precio del producto.',
        actionText: 'Entendido'
      });
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const costVal = parseFloat(formCosto) || 0;
    const priceVal = parseFloat(formPrecio) || 0;
    const stockVal = parseFloat(formStock) || 0;

    const productPayload: Partial<Product> = {
      nombre: formNombre,
      precio: priceVal,
      costo_unitario: costVal,
      stock: stockVal,
      categoria: formCategory,
      sku: formSku || `SKU-${Math.floor(Math.random()*900000)+100000}`,
      descripcion: formDescripcion,
      allowDecimals: formAllowDecimals,
      es_inventariable: formEsInventariable,
      es_combo: formEsCombo,
      imagen_url: formImagenUrl,
      tiene_ingredientes: formTieneIngredientes,
      tiene_adiciones: formTieneAdiciones,
      ingredientes_receta: formTieneIngredientes ? formIngredientesReceta : [],
      adiciones_receta: formTieneAdiciones ? formAdicionesReceta : [],
      componentes_combo: formEsCombo ? formComponentesCombo : [],
      estado: 'ACTIVO',
      unidad_medida: formUnidadMedida || 'Unidad',
      print_zone: formPrintZone || undefined,
      tasa_impuesto: parseFloat(formTasaImpuesto) || 0,
      tribute_id: parseInt(formTributeId) || undefined,
      unit_measure_id: parseInt(formUnitMeasureId) || undefined
    };

    try {
      if (editingProduct && editingProduct.id) {
        await InventoryService.updateProduct(editingProduct.id, productPayload);
        setProducts(prev => prev.map(p => p.id === editingProduct.id ? { ...p, ...productPayload } as Product : p));
        showStatus({
          type: 'success',
          title: 'Producto Actualizado',
          message: `El producto "${formNombre}" ha sido modificado con éxito.`,
          actionText: 'Excelente'
        });
      } else {
        const result = await InventoryService.createProduct(productPayload);
        const newProduct: Product = {
          ...productPayload,
          id: result.item.id,
        } as Product;
        setProducts(prev => [newProduct, ...prev]);
        showStatus({
          type: 'success',
          title: 'Producto Creado',
          message: `El producto "${formNombre}" fue agregado satisfactoriamente al catálogo.`,
          actionText: 'Genial'
        });
      }
      setIsModalOpen(false);
    } catch (e) {
      showStatus({
        type: 'error',
        title: 'Error de Red',
        message: 'Hubo un error al intentar guardar los cambios.',
        actionText: 'Reintentar'
      });
    }
  };

  const handleDelete = (id: string, name: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    showStatus({
      type: 'error',
      title: '¿Eliminar Producto?',
      message: `¿Estás seguro de que deseas eliminar el producto "${name}"? Esta acción aplicará un borrado lógico (Soft Delete).`,
      actionText: 'Confirmar Eliminación',
      onClose: async () => {
        try {
          // Soft Delete: Actualizamos el estado a 'ELIMINADO'
          await InventoryService.updateProduct(id, { estado: 'ELIMINADO' });
          setProducts(prev => prev.map(p => p.id === id ? { ...p, estado: 'ELIMINADO' } : p));
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (e) {
          console.error(e);
        }
      }
    });
  };

  const handleRestore = (id: string, name: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showStatus({
      type: 'success',
      title: 'Restaurar Producto',
      message: `¿Deseas restaurar el producto "${name}" al catálogo activo?`,
      actionText: 'Restaurar',
      onClose: async () => {
        try {
          await InventoryService.updateProduct(id, { estado: 'ACTIVO' });
          setProducts(prev => prev.map(p => p.id === id ? { ...p, estado: 'ACTIVO' } : p));
        } catch (e) {
          console.error(e);
        }
      }
    });
  };

  const updateRecipeItemQty = (id: string, qty: string, type: 'INGR' | 'ADDN') => {
    const qtyNum = parseFloat(qty) || 0;
    if (type === 'INGR') {
      setFormIngredientesReceta(prev => 
        prev.map(item => item.id === id ? { ...item, cantidad_use: qtyNum } : item)
      );
    } else {
      setFormAdicionesReceta(prev => 
        prev.map(item => item.id === id ? { ...item, cantidad_use: qtyNum } : item)
      );
    }
  };

  const toggleRecipeItem = (id: string, type: 'INGR' | 'ADDN') => {
    if (type === 'INGR') {
      setFormIngredientesReceta(prev => {
        const exists = prev.find(i => i.id === id);
        if (exists) return prev.filter(i => i.id !== id);
        return [...prev, { id, cantidad_use: 1 }];
      });
    } else {
      setFormAdicionesReceta(prev => {
        const exists = prev.find(i => i.id === id);
        if (exists) return prev.filter(i => i.id !== id);
        return [...prev, { id, cantidad_use: 1 }];
      });
    }
  };

  const updateComboComponentQty = (id: string, qty: string) => {
    const qtyNum = parseFloat(qty) || 0;
    setFormComponentesCombo(prev => 
      prev.map(item => item.id === id ? { ...item, cantidad_uso: qtyNum } : item)
    );
  };

  const toggleComboComponent = (id: string) => {
    setFormComponentesCombo(prev => {
      const exists = prev.find(i => i.id === id);
      if (exists) return prev.filter(i => i.id !== id);
      return [...prev, { id, cantidad_uso: 1 }];
    });
  };

  const renderProductItem = ({ item, index }: { item: Product; index: number }) => {
    const stockPct = Math.min(1, item.stock / 50);
    const isLowStock = item.stock <= 20; // Según spec
    const stockColor = isLowStock ? colors.error : colors.success;

    const isDeleted = item.estado === 'ELIMINADO';

    return (
      <MotiView
        from={{ opacity: 0, translateY: 15 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ delay: index * 20, type: 'timing', duration: 250 }}
        style={[styles.productCard, isDeleted && styles.cardDeleted]}
      >
        <View style={styles.cardMainRow}>
          {/* LEFT: Product Image/Placeholder */}
          <View style={styles.imageCol}>
            {item.imagen_url ? (
              <RNImage source={{ uri: item.imagen_url }} style={styles.cardImage} resizeMode="cover" />
            ) : (
              <View style={[styles.cardImagePlaceholder, { backgroundColor: item.es_combo ? colors.primaryGlow : colors.success + '12' }]}>
                {item.es_combo ? (
                  <Combine size={rem(20)} color={colors.primary} />
                ) : (
                  <Box size={rem(20)} color={colors.success} />
                )}
              </View>
            )}
            
            {/* Low stock tiny indicator badge on image */}
            {isLowStock && !isDeleted && item.es_inventariable !== false && (
              <View style={styles.lowStockTinyBadge}>
                <AlertTriangle size={rem(8)} color="#FFFFFF" />
              </View>
            )}
          </View>

          {/* RIGHT: Info panel */}
          <View style={styles.cardDetailsCol}>
            {/* Title & Actions Row */}
            <View style={styles.cardTitleRow}>
              <Text style={[styles.productNameText, isDeleted && styles.textMuted]} numberOfLines={1}>
                {item.nombre}
              </Text>
              
              <View style={styles.cardActionsContainer}>
                {!isDeleted ? (
                  <>
                    <TouchableOpacity 
                      style={styles.cardActionCircle} 
                      activeOpacity={0.7}
                      onPress={() => handleOpenForm(item)}
                    >
                      <Edit3 size={rem(11)} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.cardActionCircle, { backgroundColor: colors.error + '10' }]} 
                      activeOpacity={0.7}
                      onPress={() => handleDelete(item.id, item.nombre)}
                    >
                      <Trash2 size={rem(11)} color={colors.error} />
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity 
                    style={[styles.cardActionCircle, { backgroundColor: colors.success + '15' }]} 
                    activeOpacity={0.7}
                    onPress={() => handleRestore(item.id, item.nombre)}
                  >
                    <Archive size={rem(11)} color={colors.success} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Badges row */}
            <View style={styles.badgesWrapper}>
              <View style={styles.cardBadge}>
                <Layers size={rem(8)} color={colors.textMuted} />
                <Text style={styles.cardBadgeText}>{(item.categoria || 'General').toUpperCase()}</Text>
              </View>
              {item.sku && (
                <View style={[styles.cardBadge, { backgroundColor: mode === 'light' ? '#F1F5F9' : '#1E293B' }]}>
                  <Tag size={rem(8)} color={colors.textMuted} />
                  <Text style={styles.cardBadgeText}>{item.sku}</Text>
                </View>
              )}
              {item.es_combo && (
                <View style={[styles.cardBadge, { backgroundColor: colors.primaryGlow }]}>
                  <Combine size={rem(8)} color={colors.primary} />
                  <Text style={[styles.cardBadgeText, { color: colors.primary }]}>COMBO</Text>
                </View>
              )}
            </View>

            {/* Price, Cost, Stock Bento row */}
            <View style={styles.cardStatsRow}>
              <View style={styles.cardStatItem}>
                <Text style={styles.statLabel}>Venta</Text>
                <Text style={styles.statValue}>{CurrencyService.format(item.precio)}</Text>
              </View>
              
              <View style={styles.cardStatItem}>
                <Text style={styles.statLabel}>Costo</Text>
                <Text style={styles.statValue}>
                  {item.costo_unitario ? CurrencyService.format(item.costo_unitario) : '—'}
                </Text>
              </View>

              <View style={[styles.cardStatItem, { alignItems: 'flex-end' }]}>
                <Text style={styles.statLabel}>Stock</Text>
                <Text style={[styles.statValue, { color: stockColor, fontFamily: 'Inter-Bold', fontWeight: '800' }]}>
                  {item.stock}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Dynamic, clean stock indicator bar (only at the bottom) */}
        {!isDeleted && item.es_inventariable !== false && (
          <View style={styles.cardProgressContainer}>
            <View style={[styles.cardProgressBarFill, { width: `${stockPct * 100}%`, backgroundColor: stockColor }]} />
          </View>
        )}
      </MotiView>
    );
  };

  const categoriesWithAll = ['TODOS', ...globalCategories.map(c => c.nombre)];

  return (
    <View style={styles.container}>
      {/* Premium Header */}
      <PremiumSubScreenHeader
        title="Catálogo de Productos"
        subtitle="Gestión y Orquestación"
        onBack={onBack}
        actionLabel="Nuevo"
        onAction={() => handleOpenForm(null)}
      />

      {/* Premium Slanted Inventory Health Dashboard Header */}
      <MotiView
        from={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        style={styles.healthDashboard}
      >
        {/* Left Side: Health Pct */}
        <View style={styles.healthLeftSection}>
          <Text style={styles.healthTitle}>SALUD DEL INVENTARIO</Text>
          <View style={styles.healthValueRow}>
            <Text style={styles.healthBigNumber}>{inventoryHealthPct}</Text>
            <Text style={styles.healthPercentSign}>%</Text>
          </View>
          <View style={styles.healthProgressBg}>
            <View style={[styles.healthProgressFill, { width: `${inventoryHealthPct}%`, backgroundColor: colors.primary }]} />
          </View>
        </View>

        {/* Diagonal Separator Accent */}
        <View style={styles.slantedDivider} />

        {/* Right Side: Quick Stats Columns */}
        <View style={styles.healthRightSection}>
          {/* Fila superior: Total y Bajo Stock al lado */}
          <View style={styles.healthStatsRowGroup}>
            {/* Stat 1: Total Products */}
            <View style={[styles.healthStatCard, { flex: 1 }]}>
              <View style={[styles.healthIconCircle, { backgroundColor: colors.success + '15' }]}>
                <Box size={rem(11)} color={colors.success} />
              </View>
              <View style={styles.healthStatTextCol}>
                <Text style={styles.healthStatLabel}>TOTAL PRODS</Text>
                <Text style={styles.healthStatVal}>{totalProductsCount}</Text>
              </View>
            </View>

            {/* Stat 2: Low Stock */}
            <View style={[styles.healthStatCard, { flex: 1 }]}>
              <View style={[styles.healthIconCircle, { backgroundColor: colors.error + '15' }]}>
                <AlertTriangle size={rem(11)} color={colors.error} />
              </View>
              <View style={styles.healthStatTextCol}>
                <Text style={styles.healthStatLabel}>BAJO STOCK</Text>
                <Text style={styles.healthStatVal}>{lowStockCount}</Text>
              </View>
            </View>
          </View>

          {/* Fila inferior: Valor Total completo abajo */}
          <View style={[styles.healthStatCard, { marginTop: rem(2) }]}>
            <View style={[styles.healthIconCircle, { backgroundColor: '#EAB30815' }]}>
              <Coins size={rem(11)} color="#EAB308" />
            </View>
            <View style={styles.healthStatTextCol}>
              <Text style={styles.healthStatLabel}>VALOR TOTAL INVENTARIO</Text>
              <Text style={styles.healthStatVal} numberOfLines={1}>
                {CurrencyService.format(totalValuation)}
              </Text>
            </View>
          </View>
        </View>
      </MotiView>

      {/* Controls / Filter row */}
      <View style={styles.controlsRow}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setTempSearchQuery(searchQuery);
            setTempActiveTab(activeTab);
            setTempSelectedCategory(selectedCategory);
            setIsFilterModalOpen(true);
          }}
          style={styles.filterBtn}
        >
          <SlidersHorizontal size={rem(12)} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.filterBtnText}>Filtrar Catálogo</Text>
          {activeFiltersCount > 0 && (
            <View style={styles.filterCountBadge}>
              <Text style={styles.filterCountText}>{activeFiltersCount}</Text>
            </View>
          )}
        </TouchableOpacity>
        
        {activeFiltersCount > 0 && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleClearFilters}
            style={styles.clearFiltersIconBtn}
          >
            <X size={rem(11)} color={colors.textMuted} style={{ marginRight: 4 }} />
            <Text style={styles.clearFiltersIconText}>Limpiar</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Main List */}
      <Animated.FlatList
        data={filteredProducts}
        renderItem={renderProductItem}
        keyExtractor={(item) => item.id}
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
            transition={{ type: 'spring', damping: 20 }}
            style={styles.emptyCardContainer}
          >
            <View style={styles.emptyIconOutline}>
              <View style={styles.emptyIconGlow}>
                <ShoppingBag size={rem(24)} color={colors.primary} />
              </View>
            </View>
            <Text style={styles.emptyTitle}>Catálogo Vacío</Text>
            <Text style={styles.emptySubtitle}>
              Comienza a estructurar tu menú y productos de venta. Puedes crearlos de forma manual o importarlos.
            </Text>
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.emptyCtaButton}
              onPress={() => handleOpenForm(null)}
            >
              <Plus size={rem(12)} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.emptyCtaText}>Agregar Primer Producto</Text>
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

      {/* Pulse Floating Scroll down badge for Main List */}
      <AnimatePresence>
        {filteredProducts.length > 3 && showScrollBadge && (
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
            <Text style={styles.mainScrollDownText}>Desliza para ver más productos</Text>
          </MotiView>
        )}
      </AnimatePresence>

      {/* Slide-Up Filter Modal Drawer */}
      <Modal
        visible={isFilterModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsFilterModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBgClose} 
            activeOpacity={1} 
            onPress={() => setIsFilterModalOpen(false)} 
          />
          <MotiView 
            from={{ translateY: 300, opacity: 0 }}
            animate={{ translateY: 0, opacity: 1 }}
            style={styles.filterModalContent}
          >
            <View style={styles.filterModalHeader}>
              <View style={styles.filterHeaderLeft}>
                <SlidersHorizontal size={rem(15)} color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={styles.filterModalTitle}>Filtrar Catálogo</Text>
              </View>
              <TouchableOpacity activeOpacity={0.7} onPress={() => setIsFilterModalOpen(false)}>
                <X size={rem(18)} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.filterModalScroll}>
              {/* Search input inside modal */}
              <Text style={styles.filterSectionTitle}>Buscar por texto</Text>
              <View style={styles.modalSearchContainer}>
                <Search size={rem(14)} color={colors.textMuted} style={styles.modalSearchIcon} />
                <TextInput
                  style={styles.modalSearchInput}
                  placeholder="Buscar por nombre, SKU o categoría..."
                  placeholderTextColor={colors.textMuted}
                  value={tempSearchQuery}
                  onChangeText={setTempSearchQuery}
                  autoCorrect={false}
                />
                {tempSearchQuery.length > 0 && (
                  <TouchableOpacity activeOpacity={0.7} onPress={() => setTempSearchQuery('')}>
                    <X size={rem(14)} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Status Tabs Selection inside modal */}
              <Text style={styles.filterSectionTitle}>Estado de Inventario</Text>
              <View style={styles.modalTabsContainer}>
                <TouchableOpacity 
                  style={[styles.modalTabItem, tempActiveTab === 'ALL' && styles.modalTabItemActive]}
                  onPress={() => setTempActiveTab('ALL')}
                >
                  <ClipboardList size={rem(12)} color={tempActiveTab === 'ALL' ? '#FFFFFF' : colors.textMuted} style={{ marginRight: 6 }} />
                  <Text style={[styles.modalTabText, tempActiveTab === 'ALL' && styles.modalTabTextActive]}>Todos</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.modalTabItem, tempActiveTab === 'LOW_STOCK' && styles.modalTabItemActive]}
                  onPress={() => setTempActiveTab('LOW_STOCK')}
                >
                  <AlertTriangle size={rem(12)} color={tempActiveTab === 'LOW_STOCK' ? '#FFFFFF' : colors.textMuted} style={{ marginRight: 6 }} />
                  <Text style={[styles.modalTabText, tempActiveTab === 'LOW_STOCK' && styles.modalTabTextActive]}>Bajo Stock</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.modalTabItem, tempActiveTab === 'DELETED' && styles.modalTabItemActive]}
                  onPress={() => setTempActiveTab('DELETED')}
                >
                  <Archive size={rem(12)} color={tempActiveTab === 'DELETED' ? '#FFFFFF' : colors.textMuted} style={{ marginRight: 6 }} />
                  <Text style={[styles.modalTabText, tempActiveTab === 'DELETED' && styles.modalTabTextActive]}>Eliminados</Text>
                </TouchableOpacity>
              </View>

              {/* Categories Chips scroll inside modal */}
              <Text style={styles.filterSectionTitle}>Categorías</Text>
              <View style={styles.modalCategoriesWrapper}>
                {categoriesWithAll.map((cat, idx) => {
                  const isSelected = tempSelectedCategory === cat;
                  return (
                    <TouchableOpacity
                      key={cat + idx}
                      activeOpacity={0.8}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setTempSelectedCategory(cat);
                      }}
                      style={[styles.modalCatChip, isSelected && styles.modalCatChipActive]}
                    >
                      <Text style={[styles.modalCatChipText, isSelected && styles.modalCatChipTextActive]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            {/* Actions row inside modal */}
            <View style={styles.filterModalActions}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.modalClearBtn}
                onPress={handleClearFilters}
              >
                <Text style={styles.modalClearBtnText}>Limpiar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.modalApplyBtn}
                onPress={handleApplyFilters}
              >
                <Text style={styles.modalApplyBtnText}>Aplicar Filtros</Text>
              </TouchableOpacity>
            </View>
          </MotiView>
        </View>
      </Modal>

      {/* Giant Form Modal (Spec: divided in sections) */}
      <Modal
        visible={isModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBgClose} activeOpacity={1} onPress={() => setIsModalOpen(false)} />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
              </Text>
              <View style={styles.modalHeaderActions}>
                <TouchableOpacity 
                  style={styles.headerSaveBtn} 
                  activeOpacity={0.8}
                  onPress={handleSave}
                >
                  <Save size={rem(13)} color="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text style={styles.headerSaveBtnText}>Guardar</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.modalCloseCircle} 
                  onPress={() => setIsModalOpen(false)}
                  activeOpacity={0.7}
                >
                  <X size={rem(15)} color={colors.text} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Custom Horizontal Section Roadmap Anchors */}
            <View style={styles.roadmapContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.roadmapScroll}>
                {[
                  { key: 'basic', label: 'Básicos', icon: Layers },
                  { key: 'stock', label: 'Inventario', icon: Tag },
                  { key: 'recipe', label: 'Receta', icon: ClipboardList },
                  { key: 'combo', label: 'Combo', icon: Combine },
                  { key: 'billing', label: 'DIAN', icon: FileText }
                ].map(sec => {
                  const Icon = sec.icon;
                  const isExpanded = expandedSections[sec.key as keyof typeof expandedSections];
                  return (
                    <TouchableOpacity
                      key={sec.key}
                      activeOpacity={0.8}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setExpandedSections(prev => ({
                          ...prev,
                          [sec.key]: true
                        }));
                        if (formScrollRef.current) {
                          let offset = 0;
                          if (sec.key === 'basic') offset = 0;
                          else if (sec.key === 'stock') offset = 180;
                          else if (sec.key === 'recipe') offset = 480;
                          else if (sec.key === 'combo') offset = 850;
                          else if (sec.key === 'billing') offset = 1150;

                          formScrollRef.current.scrollTo({ y: offset, animated: true });
                        }
                      }}
                      style={[styles.roadmapChip, isExpanded && styles.roadmapChipActive]}
                    >
                      <Icon size={rem(10)} color={isExpanded ? '#FFFFFF' : colors.primary} style={{ marginRight: 4 }} />
                      <Text style={[styles.roadmapText, isExpanded && styles.roadmapTextActive]}>
                        {sec.label}
                      </Text>
                      <View style={[styles.roadmapIndicator, { backgroundColor: isExpanded ? colors.success : '#CBD5E1' }]} />
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            <ScrollView
              ref={formScrollRef}
              style={styles.formScroll}
              showsVerticalScrollIndicator={false}
              scrollEventThrottle={16}
              onScroll={(e) => {
                setFormScrollY(e.nativeEvent.contentOffset.y);
              }}
            >
              
              {/* SECCIÓN 1: DATOS BÁSICOS */}
              <View style={{ zIndex: (showCategoryDropdown || showPrintZoneDropdown || showUnidadDropdown) ? 100 : 2, position: 'relative' }}>
                <TouchableOpacity 
                  style={styles.sectionHeader} 
                  onPress={() => toggleSection('basic')}
                  activeOpacity={0.7}
                >
                  <View style={styles.sectionTitleRow}>
                    <ClipboardList size={rem(16)} color={colors.primary} />
                    <Text style={styles.sectionTitle}>Datos Básicos y Precios</Text>
                  </View>
                  {expandedSections.basic ? <ChevronUp size={rem(16)} color={colors.text} /> : <ChevronDown size={rem(16)} color={colors.text} />}
                </TouchableOpacity>

                {expandedSections.basic && (
                <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.sectionContent}>
                  <Text style={styles.inputLabel}>Nombre del Producto *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formNombre}
                    onChangeText={setFormNombre}
                    placeholder="Ej. Hamburguesa Doble Queso"
                    placeholderTextColor={colors.textMuted}
                  />

                  <Text style={styles.inputLabel}>Descripción</Text>
                  <TextInput
                    style={[styles.textInput, { height: rem(60), textAlignVertical: 'top', paddingVertical: rem(8) }]}
                    value={formDescripcion}
                    onChangeText={setFormDescripcion}
                    placeholder="Detalles del producto..."
                    placeholderTextColor={colors.textMuted}
                    multiline
                  />

                  <View style={styles.formRow}>
                    <View style={styles.formCol}>
                      <Text style={styles.inputLabel}>Precio Venta *</Text>
                      <TextInput
                        style={styles.textInput}
                        keyboardType="numeric"
                        value={formatWithThousands(formPrecio)}
                        onChangeText={(text) => setFormPrecio(parseFromThousands(text))}
                        placeholder="0"
                        placeholderTextColor={colors.textMuted}
                      />
                    </View>
                    <View style={styles.formCol}>
                      <Text style={styles.inputLabel}>Costo Promedio</Text>
                      <TextInput
                        style={styles.textInput}
                        keyboardType="numeric"
                        value={formatWithThousands(formCosto)}
                        onChangeText={(text) => setFormCosto(parseFromThousands(text))}
                        placeholder="0"
                        placeholderTextColor={colors.textMuted}
                        editable={!formEsCombo}
                      />
                    </View>
                  </View>

                  <View style={styles.formRow}>
                    <View style={styles.formCol}>
                      <Text style={styles.inputLabel}>Código SKU</Text>
                      <TextInput
                        style={styles.textInput}
                        value={formSku}
                        onChangeText={setFormSku}
                        placeholder="Opcional (se genera automático)"
                        placeholderTextColor={colors.textMuted}
                      />
                    </View>
                  </View>

                  <View style={styles.formRow}>
                    <View style={styles.formCol}>
                      <Text style={styles.inputLabel}>Categoría</Text>
                      <TouchableOpacity
                        style={styles.dropdownTrigger}
                        activeOpacity={0.7}
                        onPress={() => { setShowCategoryDropdown(!showCategoryDropdown); setShowPrintZoneDropdown(false); setShowUnidadDropdown(false); }}
                      >
                        <Layers size={rem(12)} color={colors.primary} />
                        <Text style={styles.dropdownTriggerText} numberOfLines={1}>{formCategory || 'Seleccionar'}</Text>
                        <ChevronDown size={rem(12)} color={colors.textMuted} />
                      </TouchableOpacity>
                      {showCategoryDropdown && (
                        <Modal
                          visible={showCategoryDropdown}
                          transparent
                          animationType="fade"
                          onRequestClose={() => setShowCategoryDropdown(false)}
                        >
                          <View style={styles.bottomSheetOverlay}>
                            <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setShowCategoryDropdown(false)} />
                            <MotiView
                              from={{ translateY: 300, opacity: 0 }}
                              animate={{ translateY: 0, opacity: 1 }}
                              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                              style={styles.bottomSheetContent}
                            >
                              <View style={styles.bottomSheetHeader}>
                                <Text style={styles.bottomSheetTitle}>Categorías</Text>
                                <TouchableOpacity
                                  style={styles.bottomSheetCloseBtn}
                                  onPress={() => setShowCategoryDropdown(false)}
                                >
                                  <X size={rem(15)} color={colors.text} />
                                </TouchableOpacity>
                              </View>
                              <ScrollView style={styles.bottomSheetScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                                {globalCategories.map(c => {
                                  const isSel = formCategory === c.nombre;
                                  return (
                                    <TouchableOpacity
                                      key={c.id}
                                      activeOpacity={0.7}
                                      onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setFormCategory(c.nombre);
                                        setShowCategoryDropdown(false);
                                      }}
                                      style={[styles.bottomSheetItem, isSel && styles.bottomSheetItemActive]}
                                    >
                                      <Text style={[styles.bottomSheetItemText, isSel && styles.bottomSheetItemTextActive]}>
                                        {c.nombre}
                                      </Text>
                                      {isSel && <CheckSquare size={rem(12)} color={colors.primary} />}
                                    </TouchableOpacity>
                                  );
                                })}
                              </ScrollView>
                            </MotiView>
                          </View>
                        </Modal>
                      )}
                    </View>
                    <View style={styles.formCol}>
                      <Text style={styles.inputLabel}>Zona Impresión</Text>
                      <TouchableOpacity
                        style={styles.dropdownTrigger}
                        activeOpacity={0.7}
                        onPress={() => { setShowPrintZoneDropdown(!showPrintZoneDropdown); setShowCategoryDropdown(false); setShowUnidadDropdown(false); }}
                      >
                        <Printer size={rem(12)} color={colors.primary} />
                        <Text style={styles.dropdownTriggerText} numberOfLines={1}>
                          {PRINT_ZONES.find(z => z.key === formPrintZone)?.label || 'Ninguna'}
                        </Text>
                        <ChevronDown size={rem(12)} color={colors.textMuted} />
                      </TouchableOpacity>
                      {showPrintZoneDropdown && (
                        <Modal
                          visible={showPrintZoneDropdown}
                          transparent
                          animationType="fade"
                          onRequestClose={() => setShowPrintZoneDropdown(false)}
                        >
                          <View style={styles.bottomSheetOverlay}>
                            <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setShowPrintZoneDropdown(false)} />
                            <MotiView
                              from={{ translateY: 300, opacity: 0 }}
                              animate={{ translateY: 0, opacity: 1 }}
                              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                              style={styles.bottomSheetContent}
                            >
                              <View style={styles.bottomSheetHeader}>
                                <Text style={styles.bottomSheetTitle}>Zonas de Impresión</Text>
                                <TouchableOpacity
                                  style={styles.bottomSheetCloseBtn}
                                  onPress={() => setShowPrintZoneDropdown(false)}
                                >
                                  <X size={rem(15)} color={colors.text} />
                                </TouchableOpacity>
                              </View>
                              <ScrollView style={styles.bottomSheetScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                                {PRINT_ZONES.map(zone => {
                                  const isSel = formPrintZone === zone.key;
                                  return (
                                    <TouchableOpacity
                                      key={zone.key || '_none'}
                                      activeOpacity={0.7}
                                      onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setFormPrintZone(zone.key);
                                        setShowPrintZoneDropdown(false);
                                      }}
                                      style={[styles.bottomSheetItem, isSel && styles.bottomSheetItemActive]}
                                    >
                                      <Text style={[styles.bottomSheetItemText, isSel && styles.bottomSheetItemTextActive]}>
                                        {zone.label}
                                      </Text>
                                      {isSel && <CheckSquare size={rem(12)} color={colors.primary} />}
                                    </TouchableOpacity>
                                  );
                                })}
                              </ScrollView>
                            </MotiView>
                          </View>
                        </Modal>
                      )}
                    </View>
                  </View>

                  <View style={styles.formRow}>
                    <View style={styles.formCol}>
                      <Text style={styles.inputLabel}>Unidad de Medida</Text>
                      <TouchableOpacity
                        style={styles.dropdownTrigger}
                        activeOpacity={0.7}
                        onPress={() => { setShowUnidadDropdown(!showUnidadDropdown); setShowCategoryDropdown(false); setShowPrintZoneDropdown(false); }}
                      >
                        <Scale size={rem(12)} color={colors.primary} />
                        <Text style={styles.dropdownTriggerText} numberOfLines={1}>{formUnidadMedida}</Text>
                        <ChevronDown size={rem(12)} color={colors.textMuted} />
                      </TouchableOpacity>
                      {showUnidadDropdown && (
                        <Modal
                          visible={showUnidadDropdown}
                          transparent
                          animationType="fade"
                          onRequestClose={() => setShowUnidadDropdown(false)}
                        >
                          <View style={styles.bottomSheetOverlay}>
                            <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setShowUnidadDropdown(false)} />
                            <MotiView
                              from={{ translateY: 300, opacity: 0 }}
                              animate={{ translateY: 0, opacity: 1 }}
                              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                              style={styles.bottomSheetContent}
                            >
                              <View style={styles.bottomSheetHeader}>
                                <Text style={styles.bottomSheetTitle}>Unidad de Medida</Text>
                                <TouchableOpacity
                                  style={styles.bottomSheetCloseBtn}
                                  onPress={() => setShowUnidadDropdown(false)}
                                >
                                  <X size={rem(15)} color={colors.text} />
                                </TouchableOpacity>
                              </View>
                              <ScrollView style={styles.bottomSheetScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                                {UNIT_MEASURES.map(unit => {
                                  const isSel = formUnidadMedida === unit;
                                  return (
                                    <TouchableOpacity
                                      key={unit}
                                      activeOpacity={0.7}
                                      onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setFormUnidadMedida(unit);
                                        setShowUnidadDropdown(false);
                                      }}
                                      style={[styles.bottomSheetItem, isSel && styles.bottomSheetItemActive]}
                                    >
                                      <Text style={[styles.bottomSheetItemText, isSel && styles.bottomSheetItemTextActive]}>
                                        {unit}
                                      </Text>
                                      {isSel && <CheckSquare size={rem(12)} color={colors.primary} />}
                                    </TouchableOpacity>
                                  );
                                })}
                              </ScrollView>
                            </MotiView>
                          </View>
                        </Modal>
                      )}
                    </View>
                    <View style={styles.formCol}>
                      <Text style={styles.inputLabel}>Imagen</Text>
                      <TouchableOpacity style={styles.imagePickerBtn} onPress={handlePickImage}>
                        <ImageIcon size={rem(14)} color={colors.textMuted} />
                        <Text style={styles.imagePickerText} numberOfLines={1}>
                          {formImagenUrl ? 'Cambiar' : 'Subir'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </MotiView>
              )}
              </View>

              {/* SECCIÓN 2: INVENTARIO Y STOCK */}
              <TouchableOpacity 
                style={styles.sectionHeader} 
                onPress={() => toggleSection('inventory')}
                activeOpacity={0.7}
              >
                <View style={styles.sectionTitleRow}>
                  <BarChart2 size={rem(16)} color={colors.primary} />
                  <Text style={styles.sectionTitle}>Inventario y Stock</Text>
                </View>
                {expandedSections.inventory ? <ChevronUp size={rem(16)} color={colors.text} /> : <ChevronDown size={rem(16)} color={colors.text} />}
              </TouchableOpacity>

              {expandedSections.inventory && (
                <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.sectionContent}>
                  <View style={styles.toggleItem}>
                    <View style={styles.toggleTextCol}>
                      <Text style={styles.toggleTitle}>Maneja Inventario</Text>
                      <Text style={styles.toggleSubtitle}>Descuenta stock en cada venta.</Text>
                    </View>
                    <Switch
                      value={formEsInventariable}
                      onValueChange={setFormEsInventariable}
                      trackColor={{ false: '#CBD5E1', true: colors.primary }}
                      thumbColor="#FFFFFF"
                    />
                  </View>

                  <View style={styles.toggleItem}>
                    <View style={styles.toggleTextCol}>
                      <Text style={styles.toggleTitle}>Permitir Decimales</Text>
                      <Text style={styles.toggleSubtitle}>Para productos vendidos por peso.</Text>
                    </View>
                    <Switch
                      value={formAllowDecimals}
                      onValueChange={setFormAllowDecimals}
                      trackColor={{ false: '#CBD5E1', true: colors.primary }}
                      thumbColor="#FFFFFF"
                    />
                  </View>

                  {/* IAStock Special Stock Utilizable */}
                  <View style={styles.toggleItem}>
                    <View style={styles.toggleTextCol}>
                      <Text style={styles.toggleTitle}>Usar Stock Utilizable</Text>
                      <Text style={styles.toggleSubtitle}>Divide el stock en utilizable y no utilizable.</Text>
                    </View>
                    <Switch
                      value={formUsaStockUtilizable}
                      onValueChange={setFormUsaStockUtilizable}
                      trackColor={{ false: '#CBD5E1', true: colors.primary }}
                      thumbColor="#FFFFFF"
                      disabled={!formEsInventariable}
                    />
                  </View>

                  {formEsInventariable && !formUsaStockUtilizable && (
                    <View style={{ marginTop: rem(10) }}>
                      <Text style={styles.inputLabel}>Stock Actual</Text>
                      <TextInput
                        style={styles.textInput}
                        keyboardType="numeric"
                        value={formStock}
                        onChangeText={setFormStock}
                        placeholder="0"
                        placeholderTextColor={colors.textMuted}
                        editable={!formEsCombo}
                      />
                    </View>
                  )}

                  {formEsInventariable && formUsaStockUtilizable && (
                    <View style={[styles.formRow, { marginTop: rem(10) }]}>
                      <View style={styles.formCol}>
                        <Text style={styles.inputLabel}>Cant. Utilizable</Text>
                        <TextInput
                          style={styles.textInput}
                          keyboardType="numeric"
                          value={formCantUtilizable}
                          onChangeText={setFormCantUtilizable}
                          placeholder="0"
                          placeholderTextColor={colors.textMuted}
                        />
                      </View>
                      <View style={styles.formCol}>
                        <Text style={styles.inputLabel}>Cant. No Utilizable</Text>
                        <TextInput
                          style={styles.textInput}
                          keyboardType="numeric"
                          value={formCantNoUtilizable}
                          onChangeText={setFormCantNoUtilizable}
                          placeholder="0"
                          placeholderTextColor={colors.textMuted}
                        />
                      </View>
                    </View>
                  )}

                  {formUsaStockUtilizable && (
                    <View style={styles.totalStockBanner}>
                      <Text style={styles.totalStockLabel}>Stock Total Calculado:</Text>
                      <Text style={styles.totalStockValue}>{formStock}</Text>
                    </View>
                  )}
                </MotiView>
              )}

              {/* SECCIÓN 3: RECETA (INGR/ADDN) */}
              <TouchableOpacity 
                style={styles.sectionHeader} 
                onPress={() => toggleSection('recipe')}
                activeOpacity={0.7}
              >
                <View style={styles.sectionTitleRow}>
                  <ClipboardList size={rem(16)} color={colors.primary} />
                  <Text style={styles.sectionTitle}>Receta (Ingredientes y Adiciones)</Text>
                </View>
                {expandedSections.recipe ? <ChevronUp size={rem(16)} color={colors.text} /> : <ChevronDown size={rem(16)} color={colors.text} />}
              </TouchableOpacity>

              {expandedSections.recipe && (
                <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.sectionContent}>
                  <View style={styles.toggleItem}>
                    <View style={styles.toggleTextCol}>
                      <Text style={styles.toggleTitle}>Tiene Ingredientes</Text>
                    </View>
                    <Switch
                      value={formTieneIngredientes}
                      onValueChange={setFormTieneIngredientes}
                      trackColor={{ false: '#CBD5E1', true: colors.primary }}
                      thumbColor="#FFFFFF"
                    />
                  </View>

                  {formTieneIngredientes && (
                    <View style={styles.featureSelectorContainer}>
                      {/* Selected chips */}
                      {formIngredientesReceta.length > 0 && (
                        <View style={styles.selectedChipsWrap}>
                          {formIngredientesReceta.map(ri => {
                            const ing = globalIngredients.find(g => g.id === ri.id);
                            return (
                              <View key={ri.id} style={styles.selectedChip}>
                                <Text style={styles.selectedChipText}>{ing?.nombre || ri.id}</Text>
                                <TouchableOpacity onPress={() => toggleRecipeItem(ri.id, 'INGR')}>
                                  <X size={rem(10)} color={colors.primary} />
                                </TouchableOpacity>
                              </View>
                            );
                          })}
                        </View>
                      )}
                      {/* Search input */}
                      <View style={styles.selectorSearchRow}>
                        <Search size={rem(13)} color={colors.textMuted} />
                        <TextInput
                          style={styles.selectorSearchInput}
                          placeholder="Buscar ingrediente..."
                          placeholderTextColor={colors.textMuted}
                          value={ingredientSearch}
                          onChangeText={setIngredientSearch}
                          autoCorrect={false}
                        />
                      </View>
                      {/* Filtered results (max 5 visible with scroll) */}
                      <ScrollView style={styles.selectorResultsScroll} nestedScrollEnabled showsVerticalScrollIndicator>
                        {globalIngredients
                          .filter(ing => ing.nombre.toLowerCase().includes(ingredientSearch.toLowerCase()))
                          .slice(0, 15)
                          .map(ing => {
                            const recipeItem = formIngredientesReceta.find(i => i.id === ing.id);
                            const isSel = !!recipeItem;
                            return (
                              <View key={ing.id} style={styles.recipeListItem}>
                                <TouchableOpacity
                                  style={styles.recipeCheckRow}
                                  onPress={() => toggleRecipeItem(ing.id, 'INGR')}
                                >
                                  {isSel ? <CheckSquare size={rem(16)} color={colors.primary} /> : <Square size={rem(16)} color={colors.textMuted} />}
                                  <Text style={[styles.recipeItemName, isSel && styles.textPrimary]}>{ing.nombre}</Text>
                                </TouchableOpacity>
                                {isSel && (
                                  <View style={styles.qtyInputContainer}>
                                    <TextInput
                                      style={styles.qtyInput}
                                      keyboardType="numeric"
                                      value={recipeItem.cantidad_use.toString()}
                                      onChangeText={(val) => updateRecipeItemQty(ing.id, val, 'INGR')}
                                    />
                                    <Text style={styles.unitText}>{ing.unidad_medida || 'unid'}</Text>
                                  </View>
                                )}
                              </View>
                            );
                          })}
                      </ScrollView>
                      {globalIngredients.filter(ing => ing.nombre.toLowerCase().includes(ingredientSearch.toLowerCase())).length > 5 && (
                        <MotiView
                          from={{ opacity: 0, translateY: -4 }}
                          animate={{ opacity: 1, translateY: 0 }}
                          style={styles.moreItemsIndicator}
                        >
                          <ChevronDown size={rem(10)} color={colors.primary} />
                          <Text style={styles.moreItemsText}>Desliza para ver más ingredientes</Text>
                        </MotiView>
                      )}
                      {ingredientSearch.length === 0 && globalIngredients.length > 5 && (
                        <Text style={styles.hintText}>Escribe para buscar entre {globalIngredients.length} ingredientes</Text>
                      )}
                    </View>
                  )}

                  <View style={[styles.toggleItem, { marginTop: rem(14) }]}>
                    <View style={styles.toggleTextCol}>
                      <Text style={styles.toggleTitle}>Tiene Adiciones</Text>
                    </View>
                    <Switch
                      value={formTieneAdiciones}
                      onValueChange={setFormTieneAdiciones}
                      trackColor={{ false: '#CBD5E1', true: colors.primary }}
                      thumbColor="#FFFFFF"
                    />
                  </View>

                  {formTieneAdiciones && (
                    <View style={styles.featureSelectorContainer}>
                      {formAdicionesReceta.length > 0 && (
                        <View style={styles.selectedChipsWrap}>
                          {formAdicionesReceta.map(ri => {
                            const add = globalAdditions.find(g => g.id === ri.id);
                            return (
                              <View key={ri.id} style={styles.selectedChip}>
                                <Text style={styles.selectedChipText}>{add?.nombre || ri.id}</Text>
                                <TouchableOpacity onPress={() => toggleRecipeItem(ri.id, 'ADDN')}>
                                  <X size={rem(10)} color={colors.primary} />
                                </TouchableOpacity>
                              </View>
                            );
                          })}
                        </View>
                      )}
                      <View style={styles.selectorSearchRow}>
                        <Search size={rem(13)} color={colors.textMuted} />
                        <TextInput
                          style={styles.selectorSearchInput}
                          placeholder="Buscar adición..."
                          placeholderTextColor={colors.textMuted}
                          value={additionSearch}
                          onChangeText={setAdditionSearch}
                          autoCorrect={false}
                        />
                      </View>
                      <ScrollView style={styles.selectorResultsScroll} nestedScrollEnabled showsVerticalScrollIndicator>
                        {globalAdditions
                          .filter(add => add.nombre.toLowerCase().includes(additionSearch.toLowerCase()))
                          .slice(0, 15)
                          .map(add => {
                            const recipeItem = formAdicionesReceta.find(i => i.id === add.id);
                            const isSel = !!recipeItem;
                            return (
                              <View key={add.id} style={styles.recipeListItem}>
                                <TouchableOpacity
                                  style={styles.recipeCheckRow}
                                  onPress={() => toggleRecipeItem(add.id, 'ADDN')}
                                >
                                  {isSel ? <CheckSquare size={rem(16)} color={colors.primary} /> : <Square size={rem(16)} color={colors.textMuted} />}
                                  <Text style={[styles.recipeItemName, isSel && styles.textPrimary]}>{add.nombre}</Text>
                                </TouchableOpacity>
                                {isSel && (
                                  <View style={styles.qtyInputContainer}>
                                    <TextInput
                                      style={styles.qtyInput}
                                      keyboardType="numeric"
                                      value={recipeItem.cantidad_use.toString()}
                                      onChangeText={(val) => updateRecipeItemQty(add.id, val, 'ADDN')}
                                    />
                                    <Text style={styles.unitText}>{add.unidad_medida || 'unid'}</Text>
                                  </View>
                                )}
                              </View>
                            );
                          })}
                      </ScrollView>
                      {globalAdditions.filter(add => add.nombre.toLowerCase().includes(additionSearch.toLowerCase())).length > 5 && (
                        <MotiView
                          from={{ opacity: 0, translateY: -4 }}
                          animate={{ opacity: 1, translateY: 0 }}
                          style={styles.moreItemsIndicator}
                        >
                          <ChevronDown size={rem(10)} color={colors.primary} />
                          <Text style={styles.moreItemsText}>Desliza para ver más adiciones</Text>
                        </MotiView>
                      )}
                      {additionSearch.length === 0 && globalAdditions.length > 5 && (
                        <Text style={styles.hintText}>Escribe para buscar entre {globalAdditions.length} adiciones</Text>
                      )}
                    </View>
                  )}
                </MotiView>
              )}

              {/* SECCIÓN 4: COMBO */}
              <TouchableOpacity 
                style={styles.sectionHeader} 
                onPress={() => toggleSection('combo')}
                activeOpacity={0.7}
              >
                <View style={styles.sectionTitleRow}>
                  <Combine size={rem(16)} color={colors.primary} />
                  <Text style={styles.sectionTitle}>Configuración de Combo</Text>
                </View>
                {expandedSections.combo ? <ChevronUp size={rem(16)} color={colors.text} /> : <ChevronDown size={rem(16)} color={colors.text} />}
              </TouchableOpacity>

              {expandedSections.combo && (
                <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.sectionContent}>
                  <View style={styles.toggleItem}>
                    <View style={styles.toggleTextCol}>
                      <Text style={styles.toggleTitle}>Es un Combo</Text>
                      <Text style={styles.toggleSubtitle}>Agrupa otros productos.</Text>
                    </View>
                    <Switch
                      value={formEsCombo}
                      onValueChange={setFormEsCombo}
                      trackColor={{ false: '#CBD5E1', true: colors.primary }}
                      thumbColor="#FFFFFF"
                    />
                  </View>

                  {formEsCombo && (
                    <View style={styles.featureSelectorContainer}>
                      {formComponentesCombo.length > 0 && (
                        <View style={styles.selectedChipsWrap}>
                          {formComponentesCombo.map(ci => {
                            const prod = globalProducts.find(g => g.id === ci.id);
                            return (
                              <View key={ci.id} style={styles.selectedChip}>
                                <Text style={styles.selectedChipText}>{prod?.nombre || ci.id}</Text>
                                <TouchableOpacity onPress={() => toggleComboComponent(ci.id)}>
                                  <X size={rem(10)} color={colors.primary} />
                                </TouchableOpacity>
                              </View>
                            );
                          })}
                        </View>
                      )}
                      <View style={styles.selectorSearchRow}>
                        <Search size={rem(13)} color={colors.textMuted} />
                        <TextInput
                          style={styles.selectorSearchInput}
                          placeholder="Buscar producto para combo..."
                          placeholderTextColor={colors.textMuted}
                          value={comboSearch}
                          onChangeText={setComboSearch}
                          autoCorrect={false}
                        />
                      </View>
                      <ScrollView style={styles.selectorResultsScroll} nestedScrollEnabled showsVerticalScrollIndicator>
                        {globalProducts
                          .filter(p => p.id !== editingProduct?.id && !p.es_combo && p.nombre.toLowerCase().includes(comboSearch.toLowerCase()))
                          .slice(0, 15)
                          .map(prod => {
                            const comboItem = formComponentesCombo.find(i => i.id === prod.id);
                            const isSel = !!comboItem;
                            return (
                              <View key={prod.id} style={styles.recipeListItem}>
                                <TouchableOpacity
                                  style={styles.recipeCheckRow}
                                  onPress={() => toggleComboComponent(prod.id)}
                                >
                                  {isSel ? <CheckSquare size={rem(16)} color={colors.primary} /> : <Square size={rem(16)} color={colors.textMuted} />}
                                  <Text style={[styles.recipeItemName, isSel && styles.textPrimary]}>{prod.nombre}</Text>
                                </TouchableOpacity>
                                {isSel && (
                                  <View style={styles.qtyInputContainer}>
                                    <TextInput
                                      style={styles.qtyInput}
                                      keyboardType="numeric"
                                      value={comboItem.cantidad_uso.toString()}
                                      onChangeText={(val) => updateComboComponentQty(prod.id, val)}
                                    />
                                    <Text style={styles.unitText}>unid</Text>
                                  </View>
                                )}
                              </View>
                            );
                          })}
                      </ScrollView>
                    </View>
                  )}

                  {formEsCombo && (
                    <View style={styles.totalStockBanner}>
                      <Text style={styles.totalStockLabel}>Stock Máximo Posible:</Text>
                      <Text style={styles.totalStockValue}>{formStock}</Text>
                    </View>
                  )}
                </MotiView>
              )}

              {/* SECCIÓN 5: FACTURACIÓN ELECTRÓNICA (Opcional) */}
              <TouchableOpacity 
                style={styles.sectionHeader} 
                onPress={() => toggleSection('billing')}
                activeOpacity={0.7}
              >
                <View style={styles.sectionTitleRow}>
                  <FileText size={rem(16)} color={colors.primary} />
                  <Text style={styles.sectionTitle}>Facturación Electrónica</Text>
                  <View style={styles.optionalBadge}>
                    <Text style={styles.optionalBadgeText}>Opcional</Text>
                  </View>
                </View>
                {expandedSections.billing ? <ChevronUp size={rem(16)} color={colors.text} /> : <ChevronDown size={rem(16)} color={colors.text} />}
              </TouchableOpacity>

              {expandedSections.billing && (
                <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.sectionContent}>
                  {/* Clear billing data button */}
                  {(formTasaImpuesto !== '0' || formTributeId !== '' || formUnitMeasureId !== '') && (
                    <TouchableOpacity
                      style={styles.clearBillingBtn}
                      activeOpacity={0.7}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setFormTasaImpuesto('0');
                        setFormTributeId('');
                        setFormUnitMeasureId('');
                      }}
                    >
                      <Trash2 size={rem(12)} color={colors.error} />
                      <Text style={styles.clearBillingText}>Borrar datos de facturación</Text>
                    </TouchableOpacity>
                  )}

                  <Text style={styles.inputLabel}>Tasa de Impuesto (IVA)</Text>
                  <View style={styles.categoryPickerRow}>
                    {TAX_RATES.map(rate => {
                      const isSel = formTasaImpuesto === rate.value;
                      return (
                        <TouchableOpacity
                          key={rate.value}
                          activeOpacity={0.8}
                          onPress={() => setFormTasaImpuesto(rate.value)}
                          style={[styles.pickerChip, isSel && styles.pickerChipActive]}
                        >
                          <Text style={[styles.pickerChipText, isSel && styles.pickerChipTextActive]}>
                            {rate.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <View style={styles.formRow}>
                    <View style={styles.formCol}>
                      <Text style={styles.inputLabel}>Código Tributo DIAN</Text>
                      <TextInput
                        style={styles.textInput}
                        keyboardType="numeric"
                        value={formTributeId}
                        onChangeText={setFormTributeId}
                        placeholder="Ej. 01"
                        placeholderTextColor={colors.textMuted}
                      />
                    </View>
                    <View style={styles.formCol}>
                      <Text style={styles.inputLabel}>Unidad Medida DIAN</Text>
                      <TextInput
                        style={styles.textInput}
                        keyboardType="numeric"
                        value={formUnitMeasureId}
                        onChangeText={setFormUnitMeasureId}
                        placeholder="Ej. 94"
                        placeholderTextColor={colors.textMuted}
                      />
                    </View>
                  </View>
                </MotiView>
              )}

              <View style={{ height: rem(30) }} />
            </ScrollView>

            {/* Pulse Floating Scroll down badge */}
            <AnimatePresence>
              {formScrollY < 40 && (
                <MotiView
                  from={{ opacity: 0, translateY: 15 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  exit={{ opacity: 0, translateY: 15 }}
                  transition={{ type: 'timing', duration: 250 }}
                  style={styles.scrollDownBadge}
                >
                  <MotiView
                    animate={{
                      translateY: [0, 4, 0]
                    }}
                    transition={{
                      loop: true,
                      duration: 1200,
                      type: 'timing'
                    }}
                  >
                    <ChevronDown size={rem(11)} color="#FFFFFF" style={{ marginBottom: -2 }} />
                  </MotiView>
                  <Text style={styles.scrollDownText}>Más secciones abajo</Text>
                </MotiView>
              )}
            </AnimatePresence>
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
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    marginHorizontal: rem(16),
    marginTop: rem(10),
    borderRadius: rem(10),
    padding: rem(4),
    borderWidth: 1,
    borderColor: mode === 'light' ? '#EAE5DA' : '#334155',
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: rem(8),
    gap: rem(4),
    borderRadius: rem(6),
  },
  tabItemActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: rem(10),
    fontFamily: 'Inter-Bold',
    color: colors.textMuted,
  },
  tabTextActive: {
    color: '#FFFFFF',
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
  categoriesContainer: {
    marginTop: rem(10),
    marginBottom: rem(4),
  },
  categoriesScroll: {
    paddingHorizontal: rem(16),
    gap: rem(8),
  },
  catChip: {
    backgroundColor: colors.surface,
    paddingHorizontal: rem(14),
    paddingVertical: rem(6),
    borderRadius: rem(18),
    borderWidth: 1,
    borderColor: mode === 'light' ? '#EAE5DA' : '#334155',
  },
  catChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  catChipText: {
    fontSize: rem(11),
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    color: colors.textMuted,
  },
  catChipTextActive: {
    color: '#FFFFFF',
  },
  listScroll: {
    padding: rem(16),
    paddingBottom: rem(40),
    gap: rem(8),
  },
  cardContainer: {
    backgroundColor: colors.surface,
    borderRadius: rem(16),
    padding: rem(14),
    borderWidth: 1,
    borderColor: mode === 'light' ? '#EAE5DA' : '#334155',
    shadowColor: '#1A365D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  cardDeleted: {
    opacity: 0.6,
    backgroundColor: mode === 'light' ? '#F1F5F9' : '#1E293B',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: rem(12),
  },
  cardHeaderLeft: {
    flex: 1,
    paddingRight: rem(8),
  },
  productName: {
    fontSize: rem(14),
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: colors.text,
    marginBottom: rem(4),
  },
  badgeRow: {
    flexDirection: 'row',
    gap: rem(6),
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: mode === 'light' ? '#F5F1E8' : 'rgba(255, 255, 255, 0.05)',
    borderRadius: rem(6),
    paddingHorizontal: rem(6),
    paddingVertical: rem(2),
    gap: rem(3),
  },
  categoryBadgeText: {
    fontSize: rem(8),
    fontFamily: 'Inter-Bold',
    color: colors.textMuted,
  },
  skuBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: mode === 'light' ? '#F5F1E8' : 'rgba(255, 255, 255, 0.05)',
    borderRadius: rem(6),
    paddingHorizontal: rem(6),
    paddingVertical: rem(2),
    gap: rem(3),
  },
  skuBadgeText: {
    fontSize: rem(8),
    fontFamily: 'Inter-Bold',
    color: colors.textMuted,
  },
  cardActions: {
    flexDirection: 'row',
    gap: rem(6),
  },
  actionBtn: {
    width: rem(28),
    height: rem(28),
    borderRadius: rem(8),
    backgroundColor: colors.primaryGlow,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: mode === 'light' ? 'rgba(13, 58, 148, 0.12)' : 'rgba(255, 255, 255, 0.1)',
  },
  deleteBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
    borderColor: 'rgba(239, 68, 68, 0.12)',
  },
  infoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderRadius: rem(10),
    padding: rem(10),
    borderWidth: 1,
    borderColor: mode === 'light' ? '#EAE5DA' : '#334155',
    marginBottom: rem(12),
  },
  infoCol: {
    alignItems: 'flex-start',
  },
  infoLabel: {
    fontSize: rem(9),
    fontFamily: 'Inter-Regular',
    color: colors.textMuted,
    marginBottom: rem(2),
  },
  infoValue: {
    fontSize: rem(11),
    fontFamily: 'Inter-Bold',
    color: colors.text,
  },
  stockArea: {
    marginTop: rem(2),
  },
  progressBarBg: {
    height: rem(5),
    backgroundColor: mode === 'light' ? 'rgba(30, 41, 59, 0.05)' : 'rgba(255, 255, 255, 0.1)',
    borderRadius: rem(3),
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: rem(3),
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: rem(60),
  },
  emptyText: {
    fontSize: rem(12),
    fontFamily: 'Inter-Regular',
    color: colors.textMuted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
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
  modalHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rem(8),
  },
  headerSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: rem(10),
    paddingHorizontal: rem(14),
    paddingVertical: rem(8),
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  headerSaveBtnText: {
    color: '#FFFFFF',
    fontSize: rem(12),
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
  },
  formScroll: {
    marginBottom: rem(10),
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: rem(12),
    borderBottomWidth: 1,
    borderBottomColor: mode === 'light' ? '#EAE5DA' : '#334155',
    marginBottom: rem(10),
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rem(8),
  },
  sectionTitle: {
    fontSize: rem(13),
    fontFamily: 'Inter-Bold',
    color: colors.text,
  },
  sectionContent: {
    marginBottom: rem(16),
  },
  inputLabel: {
    fontSize: rem(11),
    fontFamily: 'Inter-Bold',
    color: colors.text,
    marginBottom: rem(6),
    marginTop: rem(10),
  },
  subInputLabel: {
    fontSize: rem(10),
    fontFamily: 'Inter-Regular',
    color: colors.textMuted,
    marginBottom: rem(8),
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
    marginBottom: rem(10),
  },
  formRow: {
    flexDirection: 'row',
    gap: rem(12),
  },
  formCol: {
    flex: 1,
  },
  imagePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: mode === 'light' ? '#EAE5DA' : '#334155',
    borderRadius: rem(10),
    height: rem(42),
    gap: rem(6),
  },
  imagePickerText: {
    fontSize: rem(11),
    fontFamily: 'Inter-Regular',
    color: colors.textMuted,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: mode === 'light' ? '#EAE5DA' : '#334155',
    borderRadius: rem(10),
    height: rem(42),
    paddingHorizontal: rem(12),
    gap: rem(8),
    marginBottom: rem(4),
  },
  dropdownTriggerText: {
    flex: 1,
    fontSize: rem(12),
    fontFamily: 'Inter-Bold',
    color: colors.text,
  },
  dropdownBackdrop: {
    position: 'absolute',
    top: -SCREEN_HEIGHT,
    bottom: -SCREEN_HEIGHT,
    left: -SCREEN_WIDTH,
    right: -SCREEN_WIDTH,
    zIndex: 900,
    backgroundColor: 'transparent',
  },
  dropdownList: {
    position: 'absolute',
    top: rem(78),
    left: 0,
    right: 0,
    backgroundColor: mode === 'light' ? '#FFFFFF' : '#151E2E',
    borderWidth: 1,
    borderColor: mode === 'light' ? '#EAE5DA' : '#334155',
    borderRadius: rem(10),
    overflow: 'hidden',
    shadowColor: '#1A365D',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    zIndex: 999,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: rem(10),
    paddingHorizontal: rem(14),
    backgroundColor: mode === 'light' ? '#FFFFFF' : '#151E2E',
    borderBottomWidth: 1,
    borderBottomColor: mode === 'light' ? '#F5F1E8' : '#1E293B',
  },
  dropdownItemActive: {
    backgroundColor: colors.primaryGlow,
  },
  dropdownItemText: {
    fontSize: rem(12),
    fontFamily: 'Inter-Regular',
    color: colors.text,
  },
  dropdownItemTextActive: {
    fontFamily: 'Inter-Bold',
    color: colors.primary,
  },
  categoryPickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rem(6),
    marginBottom: rem(14),
  },
  pickerChip: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: mode === 'light' ? '#EAE5DA' : '#334155',
    paddingHorizontal: rem(12),
    paddingVertical: rem(6),
    borderRadius: rem(8),
  },
  pickerChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pickerChipText: {
    fontSize: rem(11),
    fontFamily: 'Inter-Regular',
    color: colors.textMuted,
  },
  pickerChipTextActive: {
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  toggleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: rem(12),
  },
  toggleTextCol: {
    flex: 1,
    paddingRight: rem(10),
  },
  toggleTitle: {
    fontSize: rem(12),
    fontFamily: 'Inter-Bold',
    color: colors.text,
  },
  toggleSubtitle: {
    fontSize: rem(10),
    fontFamily: 'Inter-Regular',
    color: colors.textMuted,
  },
  totalStockBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.primaryGlow,
    padding: rem(10),
    borderRadius: rem(8),
    borderWidth: 1,
    borderColor: colors.primary,
    marginTop: rem(10),
  },
  totalStockLabel: {
    fontSize: rem(11),
    fontFamily: 'Inter-Bold',
    color: colors.primary,
  },
  totalStockValue: {
    fontSize: rem(13),
    fontFamily: 'Inter-Bold',
    color: colors.primary,
  },
  featureSelectorContainer: {
    backgroundColor: colors.background,
    borderRadius: rem(12),
    padding: rem(12),
    borderWidth: 1,
    borderColor: mode === 'light' ? '#EAE5DA' : '#334155',
    marginTop: rem(6),
  },
  recipeListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: rem(8),
    borderBottomWidth: 1,
    borderBottomColor: mode === 'light' ? '#EAE5DA' : '#334155',
  },
  recipeCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rem(8),
    flex: 1,
  },
  recipeItemName: {
    fontSize: rem(12),
    fontFamily: 'Inter-Regular',
    color: colors.text,
  },
  qtyInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rem(4),
  },
  qtyInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: mode === 'light' ? '#EAE5DA' : '#334155',
    borderRadius: rem(6),
    width: rem(50),
    height: rem(30),
    textAlign: 'center',
    fontSize: rem(12),
    fontFamily: 'Inter-Regular',
    color: colors.text,
  },
  unitText: {
    fontSize: rem(10),
    fontFamily: 'Inter-Regular',
    color: colors.textMuted,
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
    marginTop: rem(20),
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: rem(13),
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
  },
  selectContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: mode === 'light' ? '#EAE5DA' : '#334155',
    borderRadius: rem(10),
    paddingLeft: rem(10),
    height: rem(42),
    marginBottom: rem(10),
    gap: rem(6),
  },
  selectScroll: {
    paddingRight: rem(10),
    paddingVertical: rem(4),
    gap: rem(6),
    alignItems: 'center',
  },
  selectChip: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: mode === 'light' ? '#EAE5DA' : '#334155',
    paddingHorizontal: rem(10),
    paddingVertical: rem(5),
    borderRadius: rem(8),
  },
  selectChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  selectChipText: {
    fontSize: rem(10),
    fontFamily: 'Inter-Bold',
    color: colors.textMuted,
  },
  selectChipTextActive: {
    color: '#FFFFFF',
  },
  optionalBadge: {
    backgroundColor: mode === 'light' ? '#FFF7ED' : 'rgba(251, 191, 36, 0.1)',
    paddingHorizontal: rem(8),
    paddingVertical: rem(2),
    borderRadius: rem(10),
    borderWidth: 1,
    borderColor: mode === 'light' ? '#FDE68A' : 'rgba(251, 191, 36, 0.25)',
    marginLeft: rem(6),
  },
  optionalBadgeText: {
    fontSize: rem(8),
    fontFamily: 'Inter-Bold',
    color: mode === 'light' ? '#B45309' : '#FCD34D',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  clearBillingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: mode === 'light' ? 'rgba(239, 68, 68, 0.06)' : 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: mode === 'light' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.2)',
    borderRadius: rem(8),
    paddingHorizontal: rem(12),
    paddingVertical: rem(8),
    gap: rem(6),
    marginBottom: rem(10),
  },
  clearBillingText: {
    fontSize: rem(11),
    fontFamily: 'Inter-Bold',
    color: colors.error,
  },
  textMuted: {
    color: colors.textMuted,
  },
  textPrimary: {
    color: colors.primary,
    fontFamily: 'Inter-Bold',
  },
  selectedChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rem(6),
    marginBottom: rem(10),
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryGlow,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: rem(16),
    paddingHorizontal: rem(10),
    paddingVertical: rem(4),
    gap: rem(5),
  },
  selectedChipText: {
    fontSize: rem(10),
    fontFamily: 'Inter-Bold',
    color: colors.primary,
  },
  selectorSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: mode === 'light' ? '#EAE5DA' : '#334155',
    borderRadius: rem(8),
    paddingHorizontal: rem(10),
    height: rem(36),
    marginBottom: rem(8),
    gap: rem(6),
  },
  selectorSearchInput: {
    flex: 1,
    color: colors.text,
    fontSize: rem(12),
    fontFamily: 'Inter-Regular',
  },
  hintText: {
    fontSize: rem(10),
    fontFamily: 'Inter-Regular',
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: rem(6),
    fontStyle: 'italic',
  },
  selectorResultsScroll: {
    maxHeight: rem(200),
  },
  bottomSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
  bottomSheetContent: {
    backgroundColor: mode === 'light' ? '#FFFFFF' : '#151E2E',
    borderTopLeftRadius: rem(20),
    borderTopRightRadius: rem(20),
    paddingBottom: rem(24),
    maxHeight: rem(400),
    borderTopWidth: 1,
    borderColor: mode === 'light' ? '#EAE5DA' : '#2D3748',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: rem(20),
    paddingVertical: rem(16),
    borderBottomWidth: 1,
    borderBottomColor: mode === 'light' ? '#EAE5DA' : '#2D3748',
  },
  bottomSheetTitle: {
    fontSize: rem(14),
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: colors.text,
    flex: 1,
  },
  bottomSheetCloseBtn: {
    width: rem(28),
    height: rem(28),
    borderRadius: rem(14),
    backgroundColor: mode === 'light' ? '#F1F5F9' : '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomSheetScroll: {
    paddingHorizontal: rem(16),
    marginTop: rem(10),
  },
  bottomSheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: rem(12),
    paddingHorizontal: rem(14),
    borderRadius: rem(10),
    marginBottom: rem(6),
    backgroundColor: mode === 'light' ? '#F8FAFC' : '#1E293B' + '40',
  },
  bottomSheetItemActive: {
    backgroundColor: colors.primaryGlow,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  bottomSheetItemText: {
    fontSize: rem(12),
    fontFamily: 'Inter-Regular',
    color: colors.text,
  },
  bottomSheetItemTextActive: {
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    color: colors.primary,
  },
  moreItemsIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rem(4),
    paddingVertical: rem(6),
    backgroundColor: colors.primaryGlow,
    borderRadius: rem(6),
    marginTop: rem(4),
  },
  moreItemsText: {
    fontSize: rem(9),
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  roadmapContainer: {
    borderBottomWidth: 1,
    borderBottomColor: mode === 'light' ? '#EAE5DA' : '#2D3748',
    backgroundColor: colors.surface,
    paddingVertical: rem(8),
  },
  roadmapScroll: {
    paddingHorizontal: rem(16),
    gap: rem(8),
  },
  roadmapChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: mode === 'light' ? '#F1F5F9' : '#1E293B',
    paddingHorizontal: rem(12),
    paddingVertical: rem(6),
    borderRadius: rem(20),
    borderWidth: 1,
    borderColor: mode === 'light' ? '#E2E8F0' : '#334155',
  },
  roadmapChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  roadmapText: {
    fontSize: rem(10),
    fontFamily: 'Inter-Regular',
    color: colors.text,
  },
  roadmapTextActive: {
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  roadmapIndicator: {
    width: rem(5),
    height: rem(5),
    borderRadius: rem(2.5),
    marginLeft: rem(6),
  },
  scrollDownBadge: {
    position: 'absolute',
    bottom: rem(16),
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: rem(12),
    paddingVertical: rem(8),
    borderRadius: rem(20),
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
    gap: rem(6),
  },
  scrollDownText: {
    fontSize: rem(9),
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyCardContainer: {
    backgroundColor: mode === 'light' ? '#FFFFFF' : '#151E2E',
    borderRadius: rem(20),
    paddingHorizontal: rem(24),
    paddingVertical: rem(36),
    marginHorizontal: rem(16),
    marginTop: rem(20),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: mode === 'light' ? '#EAE5DA' : '#2D3748',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: mode === 'light' ? 0.05 : 0.15,
    shadowRadius: 16,
    elevation: 4,
  },
  emptyIconOutline: {
    width: rem(72),
    height: rem(72),
    borderRadius: rem(36),
    borderWidth: 1.5,
    borderColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: rem(18),
  },
  emptyIconGlow: {
    width: rem(56),
    height: rem(56),
    borderRadius: rem(28),
    backgroundColor: colors.primaryGlow,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: rem(15),
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: colors.primary,
    marginBottom: rem(8),
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  emptySubtitle: {
    fontSize: rem(11),
    fontFamily: 'Inter-Regular',
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: rem(16),
    marginBottom: rem(24),
    paddingHorizontal: rem(10),
  },
  emptyCtaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: rem(12),
    paddingHorizontal: rem(18),
    paddingVertical: rem(12),
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  emptyCtaText: {
    fontSize: rem(11),
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Premium Slanted Inventory Health Dashboard Styles
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
    width: '32%',
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
    fontSize: rem(30),
    fontFamily: 'Inter-Bold',
    fontWeight: '900',
    color: colors.primary,
  },
  healthPercentSign: {
    fontSize: rem(14),
    fontFamily: 'Inter-Bold',
    color: colors.primary,
    marginLeft: rem(2),
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
  healthStatsRowGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: rem(8),
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
  customScrollbarTrack: {
    position: 'absolute',
    right: rem(4),
    top: rem(160), // Start after the header + dashboard!
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
  healthRightSection: {
    flex: 1,
    paddingLeft: rem(4),
    gap: rem(6),
  },
  healthStatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rem(8),
  },
  healthIconCircle: {
    width: rem(22),
    height: rem(22),
    borderRadius: rem(11),
    justifyContent: 'center',
    alignItems: 'center',
  },
  healthStatTextCol: {
    flex: 1,
  },
  healthStatLabel: {
    fontSize: rem(7),
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.3,
  },
  healthStatVal: {
    fontSize: rem(11),
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: colors.text,
  },

  // Controls Row & Filter Button
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: rem(16),
    marginTop: rem(6),
    marginBottom: rem(12),
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: rem(12),
    paddingVertical: rem(8),
    borderRadius: rem(12),
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  filterBtnText: {
    fontSize: rem(10),
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  filterCountBadge: {
    backgroundColor: '#EAB308',
    minWidth: rem(14),
    height: rem(14),
    borderRadius: rem(7),
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: rem(6),
    paddingHorizontal: rem(2),
  },
  filterCountText: {
    fontSize: rem(8),
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
    fontWeight: '900',
  },
  clearFiltersIconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: mode === 'light' ? '#F1F5F9' : '#1E293B',
    paddingHorizontal: rem(10),
    paddingVertical: rem(6),
    borderRadius: rem(8),
    borderWidth: 1,
    borderColor: mode === 'light' ? '#E2E8F0' : '#334155',
  },
  clearFiltersIconText: {
    fontSize: rem(9),
    fontFamily: 'Inter-Regular',
    color: colors.textMuted,
  },

  // Redesigned Product Card Styles
  productCard: {
    backgroundColor: mode === 'light' ? '#FFFFFF' : '#151E2E',
    borderRadius: rem(16),
    marginHorizontal: 0,
    marginBottom: 0,
    paddingTop: rem(12),
    paddingHorizontal: rem(12),
    paddingBottom: rem(12),
    borderWidth: 1,
    borderColor: mode === 'light' ? '#EAE5DA' : '#2D3748',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: mode === 'light' ? 0.02 : 0.1,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  cardMainRow: {
    flexDirection: 'row',
    gap: rem(10),
  },
  imageCol: {
    position: 'relative',
  },
  cardImage: {
    width: rem(68),
    height: rem(68),
    borderRadius: rem(12),
    backgroundColor: mode === 'light' ? '#F8FAFC' : '#1E293B',
  },
  cardImagePlaceholder: {
    width: rem(68),
    height: rem(68),
    borderRadius: rem(12),
    justifyContent: 'center',
    alignItems: 'center',
  },
  lowStockTinyBadge: {
    position: 'absolute',
    top: rem(-3),
    right: rem(-3),
    width: rem(14),
    height: rem(14),
    borderRadius: rem(7),
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: mode === 'light' ? '#FFFFFF' : '#151E2E',
  },
  cardDetailsCol: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: rem(6),
  },
  productNameText: {
    fontSize: rem(13),
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: colors.text,
    flex: 1,
  },
  cardActionsContainer: {
    flexDirection: 'row',
    gap: rem(6),
  },
  cardActionCircle: {
    width: rem(22),
    height: rem(22),
    borderRadius: rem(11),
    backgroundColor: colors.primaryGlow,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgesWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rem(4),
    marginVertical: rem(4),
  },
  cardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: mode === 'light' ? '#F8FAFC' : '#1E293B' + '80',
    paddingHorizontal: rem(6),
    paddingVertical: rem(2),
    borderRadius: rem(4),
    gap: rem(2.5),
  },
  cardBadgeText: {
    fontSize: rem(8),
    fontFamily: 'Inter-Regular',
    color: colors.textMuted,
    fontWeight: '600',
  },
  cardStatsRow: {
    flexDirection: 'row',
    backgroundColor: mode === 'light' ? '#F8FAFC' : '#1E293B' + '40',
    borderRadius: rem(8),
    paddingVertical: rem(4),
    paddingHorizontal: rem(8),
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: rem(2),
  },
  cardStatItem: {
    flex: 1,
  },
  statLabel: {
    fontSize: rem(7),
    fontFamily: 'Inter-Regular',
    color: colors.textMuted,
    marginBottom: rem(1),
  },
  statValue: {
    fontSize: rem(10),
    fontFamily: 'Inter-Medium',
    color: colors.text,
  },
  cardProgressContainer: {
    height: rem(3),
    backgroundColor: mode === 'light' ? '#F1F5F9' : '#334155',
    borderRadius: rem(1.5),
    marginTop: rem(8),
    overflow: 'hidden',
  },
  cardProgressBarFill: {
    height: '100%',
    borderRadius: rem(1.5),
  },

  // Slide-Up Filter Modal Content Styles
  filterModalContent: {
    backgroundColor: mode === 'light' ? '#FFFFFF' : '#151E2E',
    borderTopLeftRadius: rem(24),
    borderTopRightRadius: rem(24),
    paddingBottom: rem(24),
    paddingTop: rem(16),
    maxHeight: '85%',
    borderTopWidth: 1,
    borderColor: mode === 'light' ? '#EAE5DA' : '#2D3748',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 16,
  },
  filterModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: rem(20),
    paddingBottom: rem(14),
    borderBottomWidth: 1,
    borderBottomColor: mode === 'light' ? '#F1F5F9' : '#2D3748',
  },
  filterHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterModalTitle: {
    fontSize: rem(14),
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: colors.text,
  },
  filterModalScroll: {
    paddingHorizontal: rem(20),
    paddingVertical: rem(12),
  },
  filterSectionTitle: {
    fontSize: rem(10),
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: rem(12),
    marginBottom: rem(8),
  },
  modalSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: mode === 'light' ? '#EAE5DA' : '#334155',
    borderRadius: rem(10),
    paddingHorizontal: rem(12),
    height: rem(40),
  },
  modalSearchIcon: {
    marginRight: rem(8),
  },
  modalSearchInput: {
    flex: 1,
    color: colors.text,
    fontSize: rem(12),
    fontFamily: 'Inter-Regular',
  },
  modalTabsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: rem(6),
  },
  modalTabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: mode === 'light' ? '#F8FAFC' : '#1E293B',
    borderWidth: 1,
    borderColor: mode === 'light' ? '#E2E8F0' : '#334155',
    borderRadius: rem(10),
    height: rem(36),
  },
  modalTabItemActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  modalTabText: {
    fontSize: rem(10),
    fontFamily: 'Inter-Medium',
    color: colors.textMuted,
  },
  modalTabTextActive: {
    color: '#FFFFFF',
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
  },
  modalCategoriesWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rem(6),
  },
  modalCatChip: {
    backgroundColor: mode === 'light' ? '#F1F5F9' : '#1E293B',
    paddingHorizontal: rem(10),
    paddingVertical: rem(6),
    borderRadius: rem(20),
    borderWidth: 1,
    borderColor: mode === 'light' ? '#E2E8F0' : '#334155',
  },
  modalCatChipActive: {
    backgroundColor: colors.primaryGlow,
    borderColor: colors.primary + '40',
  },
  modalCatChipText: {
    fontSize: rem(9),
    fontFamily: 'Inter-Medium',
    color: colors.text,
  },
  modalCatChipTextActive: {
    color: colors.primary,
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
  },
  filterModalActions: {
    flexDirection: 'row',
    paddingHorizontal: rem(20),
    paddingTop: rem(14),
    borderTopWidth: 1,
    borderTopColor: mode === 'light' ? '#F1F5F9' : '#2D3748',
    gap: rem(10),
  },
  modalClearBtn: {
    flex: 1,
    height: rem(40),
    borderRadius: rem(12),
    borderWidth: 1,
    borderColor: mode === 'light' ? '#E2E8F0' : '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalClearBtnText: {
    fontSize: rem(12),
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    color: colors.textMuted,
  },
  modalApplyBtn: {
    flex: 2,
    height: rem(40),
    borderRadius: rem(12),
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  modalApplyBtnText: {
    fontSize: rem(12),
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: '#FFFFFF',
  }
});
