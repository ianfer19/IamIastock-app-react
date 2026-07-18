import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
  Switch,
  Alert,
  KeyboardAvoidingView,
  Image
} from 'react-native';
import {
  X,
  Plus,
  Minus,
  ChefHat,
  PlusCircle,
  FileText,
  Percent,
  CircleDollarSign,
  ChevronDown,
  Sparkles,
  ShoppingBasket,
  Cpu,
  Edit2,
  Tag
} from 'lucide-react-native';
import { useAppDispatch, useAppSelector } from '@/core/store/store';
import { updateCartItemCustomization, removeFromCart, updateOrderDiscount } from '@/core/store/slices/cartSlice';
import { CurrencyService } from '@/core/services/currencyService';
import { SoundService } from '@/core/services/soundService';
import { rem } from '@/core/utils/responsive';
import { Ingredient, Addition } from '@/domain/entities/Product';

interface PersonalizarScreenProps {
  cartId: string | null;
  onBack: () => void;
}

interface CustomizedState {
  cartId: string;
  productName: string;
  imageUrl?: string;
  quantity: number;
  originalPrice: number;
  selectedIngredients: Ingredient[];
  selectedAdditions: Addition[];
  notes: string;
  price_override?: number;
  isPriceOverrideActive: boolean;
  priceOverrideStr: string;
  discount?: { type: 'FIXED' | 'PERCENTAGE'; value: number };
  isDiscountActive: boolean;
  discountValueStr: string;
  discountType: 'FIXED' | 'PERCENTAGE';
}

export const PersonalizarScreen = ({ cartId, onBack }: PersonalizarScreenProps) => {
  const dispatch = useAppDispatch();
  const cartItems = useAppSelector(state => state.cart.cart);
  const cartDiscount = useAppSelector(state => state.cart.discount);

  // local state list for all customized items
  const [customizedList, setCustomizedList] = useState<CustomizedState[]>([]);
  const [sortBy, setSortBy] = useState<'TODOS' | 'CON_ADICIONES' | 'CON_DESCUENTO'>('TODOS');
  const [invoiceDiscount, setInvoiceDiscount] = useState<string>(
    cartDiscount && cartDiscount.type === 'FIXED' ? cartDiscount.value.toString() : '0'
  );

  // Initialize from Redux cart
  useEffect(() => {
    if (cartItems && cartItems.length > 0) {
      const list = cartItems.map(item => {
        // Ingredients mapping
        const productIngredients = item.product.ingredientes || [];
        const itemIngredients = item.selectedIngredients || [];
        const mappedIngredients = productIngredients.map(ing => {
          const selected = itemIngredients.find(i => i.id === ing.id || i.nombre === ing.nombre);
          return {
            ...ing,
            cantidad: selected !== undefined ? selected.cantidad : 1 // default to 1 (active)
          };
        });

        // Additions mapping
        const productAdditions = item.product.adiciones || [];
        const itemAdditions = item.selectedAdditions || [];
        const mappedAdditions = productAdditions.map(add => {
          const selected = itemAdditions.find(a => a.id === add.id || a.nombre === add.nombre);
          return {
            ...add,
            cantidad: selected !== undefined ? selected.cantidad : 0 // default to 0
          };
        });

        return {
          cartId: item.cartId,
          productName: item.product.nombre,
          imageUrl: item.product.imagen_url,
          quantity: item.quantity,
          originalPrice: item.product.precio || 0,
          selectedIngredients: mappedIngredients,
          selectedAdditions: mappedAdditions,
          notes: item.notes || '',
          price_override: item.price_override,
          isPriceOverrideActive: item.price_override !== undefined,
          priceOverrideStr: item.price_override !== undefined ? item.price_override.toString() : '',
          discount: item.discount ? { type: item.discount.type as any, value: item.discount.value } : undefined,
          isDiscountActive: item.discount !== undefined,
          discountValueStr: item.discount ? item.discount.value.toString() : '',
          discountType: item.discount ? (item.discount.type as any) : 'PERCENTAGE'
        };
      });
      setCustomizedList(list);
    } else {
      setCustomizedList([]);
    }
  }, [cartItems]);

  // Synchronize invoiceDiscount with Redux cartDiscount on mount or when changed
  useEffect(() => {
    if (cartDiscount && cartDiscount.type === 'FIXED') {
      setInvoiceDiscount(cartDiscount.value.toString());
    } else {
      setInvoiceDiscount('0');
    }
  }, [cartDiscount]);

  if (cartItems.length === 0) {
    return (
      <View style={styles.errorContainer}>
        <ShoppingBasket size={rem(50)} color="#94A3B8" style={{ marginBottom: rem(12) }} />
        <Text style={styles.errorText}>No hay productos en el carrito para personalizar.</Text>
        <TouchableOpacity style={styles.errorBtn} onPress={onBack}>
          <Text style={styles.errorBtnText}>Ir al Catálogo</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Individual item calculation
  const getItemPrices = (item: CustomizedState) => {
    const currentBasePrice = item.isPriceOverrideActive && item.priceOverrideStr
      ? parseFloat(item.priceOverrideStr) || 0
      : item.originalPrice;
    const additionsSum = item.selectedAdditions.reduce((acc, add) => acc + ((add.precio || 0) * (add.cantidad || 0)), 0);
    const unitPrice = currentBasePrice + additionsSum;
    let subtotal = unitPrice * item.quantity;
    if (item.isDiscountActive && item.discountValueStr) {
      const val = parseFloat(item.discountValueStr) || 0;
      if (item.discountType === 'FIXED') {
        subtotal = Math.max(0, subtotal - val);
      } else {
        subtotal = Math.max(0, subtotal * (1 - val / 100));
      }
    }
    return { currentBasePrice, additionsSum, unitPrice, subtotal };
  };

  // Updaters for items
  const updateProductQty = (itemIdx: number, delta: number) => {
    SoundService.playClick();
    setCustomizedList(prev =>
      prev.map((item, i) => {
        if (i !== itemIdx) return item;
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      })
    );
  };

  const removeProductFromCart = (itemIdx: number, cartId: string) => {
    Alert.alert(
      'Quitar producto',
      '¿Deseas eliminar este producto del pedido?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            dispatch(removeFromCart(cartId));
          }
        }
      ]
    );
  };

  const updateIngredientQty = (itemIdx: number, ingIdx: number, delta: number) => {
    SoundService.playClick();
    setCustomizedList(prev =>
      prev.map((item, i) => {
        if (i !== itemIdx) return item;
        const updatedIngredients = item.selectedIngredients.map((ing, k) => {
          if (k !== ingIdx) return ing;
          const currentQty = ing.cantidad || 0;
          const newQty = currentQty + delta;
          // According to screenshot and logic: ingredients range from 0 (excluded) up to standard quantities or stock limit
          const maxQty = ing.stock !== undefined ? ing.stock : 99;

          if (newQty < 0 || newQty > maxQty) return ing;
          return { ...ing, cantidad: newQty };
        });
        return { ...item, selectedIngredients: updatedIngredients };
      })
    );
  };

  const updateAdditionQty = (itemIdx: number, addIdx: number, delta: number) => {
    SoundService.playClick();
    setCustomizedList(prev =>
      prev.map((item, i) => {
        if (i !== itemIdx) return item;
        const updatedAdditions = item.selectedAdditions.map((add, k) => {
          if (k !== addIdx) return add;
          const currentQty = add.cantidad || 0;
          const newQty = currentQty + delta;
          const maxQty = add.stock !== undefined ? add.stock : 99;

          if (newQty < 0 || newQty > maxQty) return add;
          return { ...add, cantidad: newQty };
        });
        return { ...item, selectedAdditions: updatedAdditions };
      })
    );
  };

  const toggleDiscountType = (itemIdx: number) => {
    SoundService.playClick();
    setCustomizedList(prev =>
      prev.map((item, i) => {
        if (i !== itemIdx) return item;
        const nextType = item.discountType === 'PERCENTAGE' ? 'FIXED' : 'PERCENTAGE';
        return {
          ...item,
          discountType: nextType,
          discountValueStr: ''
        };
      })
    );
  };

  const handleToggleDiscountActive = (itemIdx: number) => {
    SoundService.playClick();
    setCustomizedList(prev =>
      prev.map((item, i) => {
        if (i !== itemIdx) return item;
        const nextActive = !item.isDiscountActive;
        return {
          ...item,
          isDiscountActive: nextActive,
          discountValueStr: nextActive ? '10' : ''
        };
      })
    );
  };

  const updateDiscountValueText = (itemIdx: number, text: string) => {
    setCustomizedList(prev =>
      prev.map((item, i) => (i === itemIdx ? { ...item, discountValueStr: text } : item))
    );
  };

  const updateNotes = (itemIdx: number, text: string) => {
    setCustomizedList(prev =>
      prev.map((item, i) => (i === itemIdx ? { ...item, notes: text } : item))
    );
  };

  const handleTogglePriceOverrideActive = (itemIdx: number) => {
    SoundService.playClick();
    setCustomizedList(prev =>
      prev.map((item, i) => {
        if (i !== itemIdx) return item;
        const nextActive = !item.isPriceOverrideActive;
        return {
          ...item,
          isPriceOverrideActive: nextActive,
          priceOverrideStr: nextActive ? item.originalPrice.toString() : ''
        };
      })
    );
  };

  const updatePriceOverrideText = (itemIdx: number, text: string) => {
    setCustomizedList(prev =>
      prev.map((item, i) => (i === itemIdx ? { ...item, priceOverrideStr: text } : item))
    );
  };

  const handleSaveAllAndBack = () => {
    customizedList.forEach(item => {
      const finalIngredients = item.selectedIngredients;
      const finalAdditions = item.selectedAdditions.filter(add => (add.cantidad || 0) > 0);
      const finalPriceOverride = item.isPriceOverrideActive && item.priceOverrideStr ? parseFloat(item.priceOverrideStr) : undefined;
      const finalDiscount = item.isDiscountActive && item.discountValueStr
        ? { type: item.discountType, value: parseFloat(item.discountValueStr) }
        : null;

      dispatch(updateCartItemCustomization({
        cartId: item.cartId,
        selectedIngredients: finalIngredients,
        selectedAdditions: finalAdditions,
        notes: item.notes,
        price_override: finalPriceOverride,
        discount: finalDiscount
      }));
    });

    const discountVal = parseFloat(invoiceDiscount) || 0;
    dispatch(updateOrderDiscount(discountVal > 0 ? { type: 'FIXED', value: discountVal } : null));

    onBack();
  };

  // Sorting/filtering list based on ORDENAR POR dropdown
  const filteredList = customizedList.filter(item => {
    if (sortBy === 'CON_ADICIONES') {
      return item.selectedAdditions.some(add => (add.cantidad || 0) > 0);
    }
    if (sortBy === 'CON_DESCUENTO') {
      return item.isDiscountActive;
    }
    return true;
  });

  const grandOriginalTotal = cartItems.reduce((acc, item) => acc + (item.product.precio || 0) * item.quantity, 0);
  const grandCustomizedTotal = customizedList.reduce((acc, item) => acc + getItemPrices(item).subtotal, 0);

  // Invoice discount calculation
  const finalBillTotal = Math.max(0, grandCustomizedTotal - (parseFloat(invoiceDiscount) || 0));

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Premium branded header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View style={styles.logoAndTitleGroup}>
            <View style={styles.logoSection}>
              <View style={styles.logoIcon}>
                <Cpu size={rem(14)} color="#FFFFFF" strokeWidth={2.5} />
              </View>
              <Text style={styles.logoText}>
                IA<Text style={styles.logoTextBold}>Stock</Text>
              </Text>
            </View>
            
            <View style={styles.headerDivider} />
            
            <Text style={styles.headerTitleText}>Personalizar Pedido</Text>
          </View>

          <TouchableOpacity onPress={onBack} style={styles.headerCloseBtn} activeOpacity={0.7}>
            <X size={rem(16)} color="#1E293B" />
          </TouchableOpacity>
        </View>

        {/* Sort/Filter Dropdown styled exactly like screenshot */}
        <View style={styles.sortContainer}>
          <Text style={styles.sortLabel}>ORDENAR POR:</Text>
          <TouchableOpacity
            style={styles.dropdownTrigger}
            activeOpacity={0.8}
            onPress={() => {
              // Cycle sort option for mobile simplicity with dropdown styling
              setSortBy(prev => {
                if (prev === 'TODOS') return 'CON_ADICIONES';
                if (prev === 'CON_ADICIONES') return 'CON_DESCUENTO';
                return 'TODOS';
              });
            }}
          >
            <Text style={styles.dropdownText}>
              {sortBy === 'TODOS' && 'Todos los productos'}
              {sortBy === 'CON_ADICIONES' && 'Con Adiciones'}
              {sortBy === 'CON_DESCUENTO' && 'Con Descuento'}
            </Text>
            <ChevronDown size={rem(14)} color="#475569" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollBody} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {filteredList.map((item, itemIdx) => {
          const prices = getItemPrices(item);

          return (
            <View key={item.cartId} style={styles.productCard}>
              {/* Product Info Row */}
              <View style={styles.productHeaderRow}>
                <View style={styles.productTitleArea}>
                  <Text style={styles.productTitle} numberOfLines={2}>
                    {item.productName}
                  </Text>
                </View>

                {/* Stepper + Remove X on far right */}
                <View style={styles.productHeaderControls}>
                  <View style={styles.mainQtyStepper}>
                    <TouchableOpacity
                      style={styles.circleStepperBtn}
                      onPress={() => updateProductQty(itemIdx, -1)}
                      activeOpacity={0.7}
                    >
                      <Minus size={rem(11)} color="#4F46E5" strokeWidth={2.5} />
                    </TouchableOpacity>
                    <Text style={styles.mainQtyText}>{item.quantity}</Text>
                    <TouchableOpacity
                      style={styles.circleStepperBtn}
                      onPress={() => updateProductQty(itemIdx, 1)}
                      activeOpacity={0.7}
                    >
                      <Plus size={rem(11)} color="#4F46E5" strokeWidth={2.5} />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={styles.removeProductBtn}
                    onPress={() => removeProductFromCart(itemIdx, item.cartId)}
                    activeOpacity={0.7}
                  >
                    <X size={rem(15)} color="#94A3B8" strokeWidth={2.5} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Notes input block — Full Width & Premium */}
              <View style={styles.notesInputBlock}>
                <FileText size={rem(14)} color="#6366F1" style={styles.notesIcon} />
                <TextInput
                  style={styles.notesTextInput}
                  placeholder="Instrucciones para cocina (ej: sin cebolla, bien tostado...)"
                  placeholderTextColor="#94A3B8"
                  value={item.notes}
                  onChangeText={(text) => updateNotes(itemIdx, text)}
                />
              </View>

              {/* Subtotal, unit price, and discount trigger pill */}
              <View style={styles.pricesAndDiscountRow}>
                <View style={styles.priceColumn}>
                  <Text style={styles.priceLabel}>PRECIO UNITARIO</Text>
                  <Text style={styles.unitPriceText}>{CurrencyService.format(prices.unitPrice)} COP</Text>
                </View>

                <View style={styles.priceColumn}>
                  <Text style={styles.priceLabel}>SUBTOTAL</Text>
                  <Text style={styles.subtotalPriceText}>
                    {CurrencyService.format(prices.subtotal)} COP
                  </Text>
                </View>

                {/* Premium Adjustment Buttons Row */}
                <View style={styles.adjustmentsRow}>
                  {/* Discount Button */}
                  <TouchableOpacity
                    style={[styles.adjustmentPill, item.isDiscountActive && styles.adjustmentPillActive]}
                    onPress={() => handleToggleDiscountActive(itemIdx)}
                    activeOpacity={0.7}
                  >
                    <Tag size={rem(12)} color={item.isDiscountActive ? '#4F46E5' : '#64748B'} strokeWidth={2.2} />
                    <Text style={[styles.adjustmentPillText, item.isDiscountActive && styles.adjustmentPillTextActive]}>
                      {item.isDiscountActive
                        ? `${item.discountType === 'PERCENTAGE' ? `${item.discountValueStr}%` : `$${item.discountValueStr}`}`
                        : 'Descuento'
                      }
                    </Text>
                  </TouchableOpacity>

                  {/* Price Override Button */}
                  <TouchableOpacity
                    style={[styles.adjustmentPill, item.isPriceOverrideActive && styles.adjustmentPillActive]}
                    onPress={() => handleTogglePriceOverrideActive(itemIdx)}
                    activeOpacity={0.7}
                  >
                    <Edit2 size={rem(12)} color={item.isPriceOverrideActive ? '#4F46E5' : '#64748B'} strokeWidth={2.2} />
                    <Text style={[styles.adjustmentPillText, item.isPriceOverrideActive && styles.adjustmentPillTextActive]}>
                      {item.isPriceOverrideActive
                        ? 'Precio Personalizado'
                        : 'Modificar Precio'
                      }
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Active Adjustment Control Panel (Inputs) */}
              {(item.isDiscountActive || item.isPriceOverrideActive) && (
                <View style={styles.adjustmentControlPanel}>
                  {item.isDiscountActive && (
                    <View style={styles.controlPanelRow}>
                      <View style={styles.segmentContainer}>
                        <TouchableOpacity
                          style={[styles.segmentBtn, item.discountType === 'PERCENTAGE' && styles.segmentBtnActive]}
                          onPress={() => {
                            if (item.discountType !== 'PERCENTAGE') {
                              toggleDiscountType(itemIdx);
                            }
                          }}
                          activeOpacity={0.7}
                        >
                          <Percent size={rem(11)} color={item.discountType === 'PERCENTAGE' ? '#4F46E5' : '#64748B'} strokeWidth={2.5} />
                          <Text style={[styles.segmentBtnText, item.discountType === 'PERCENTAGE' && styles.segmentBtnTextActive]}>Porcentaje</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.segmentBtn, item.discountType === 'FIXED' && styles.segmentBtnActive]}
                          onPress={() => {
                            if (item.discountType !== 'FIXED') {
                              toggleDiscountType(itemIdx);
                            }
                          }}
                          activeOpacity={0.7}
                        >
                          <CircleDollarSign size={rem(11)} color={item.discountType === 'FIXED' ? '#4F46E5' : '#64748B'} strokeWidth={2.5} />
                          <Text style={[styles.segmentBtnText, item.discountType === 'FIXED' && styles.segmentBtnTextActive]}>Fijo (COP)</Text>
                        </TouchableOpacity>
                      </View>

                      <View style={styles.premiumInputBox}>
                        <TextInput
                          style={styles.premiumInputText}
                          keyboardType="numeric"
                          value={item.discountValueStr}
                          placeholder={item.discountType === 'PERCENTAGE' ? "Ej: 10%" : "Ej: 2000"}
                          placeholderTextColor="#94A3B8"
                          onChangeText={(text) => updateDiscountValueText(itemIdx, text)}
                        />
                      </View>
                    </View>
                  )}

                  {item.isPriceOverrideActive && (
                    <View style={styles.controlPanelRow}>
                      <View style={styles.overrideLabelContainer}>
                        <CircleDollarSign size={rem(13)} color="#4F46E5" strokeWidth={2.2} />
                        <Text style={styles.overrideLabelText}>Nuevo precio base unitario (COP):</Text>
                      </View>

                      <View style={styles.premiumInputBox}>
                        <TextInput
                          style={styles.premiumInputText}
                          keyboardType="numeric"
                          value={item.priceOverrideStr}
                          placeholder="Nuevo precio..."
                          placeholderTextColor="#94A3B8"
                          onChangeText={(text) => updatePriceOverrideText(itemIdx, text)}
                        />
                      </View>
                    </View>
                  )}
                </View>
              )}

              {/* DASHED SEPARATOR LINE exact match */}
              {(item.selectedIngredients.length > 0 || item.selectedAdditions.length > 0) && (
                <View style={styles.dashedLine} />
              )}

              {/* Two columns side-by-side for Ingredients & Additions */}
              {(item.selectedIngredients.length > 0 || item.selectedAdditions.length > 0) && (
                <View style={styles.columnsContainer}>
                  {/* INGREDIENTS COLUMN */}
                  {item.selectedIngredients.length > 0 && (
                    <View style={[styles.columnHalf, item.selectedAdditions.length === 0 && { width: '100%' }]}>
                      <View style={styles.columnHeader}>
                        <ChefHat size={rem(13)} color="#64748B" style={{ marginRight: rem(4) }} />
                        <Text style={styles.columnHeaderText}>INGREDIENTES</Text>
                      </View>

                      <View style={styles.itemsWrapper}>
                        {item.selectedIngredients.map((ing, ingIdx) => {
                          const qty = ing.cantidad || 0;
                          const isActive = qty > 0;
                          return (
                            <View
                              key={ing.id || `ing-${ingIdx}`}
                              style={[styles.stepperSubCard, isActive && styles.stepperSubCardActive]}
                            >
                              <View style={styles.subCardInfo}>
                                <Text style={[styles.subCardLabel, isActive && styles.subCardLabelActive]}>{ing.nombre}</Text>
                                {ing.stock !== undefined && (
                                  <Text style={styles.subCardStock}>Stock: {ing.stock}</Text>
                                )}
                              </View>

                              <View style={styles.miniStepper}>
                                <TouchableOpacity
                                  style={styles.miniStepperBtn}
                                  onPress={() => updateIngredientQty(itemIdx, ingIdx, -1)}
                                  activeOpacity={0.7}
                                >
                                  <Minus size={rem(8)} color="#64748B" />
                                </TouchableOpacity>
                                <Text style={styles.miniStepperQty}>{qty}</Text>
                                <TouchableOpacity
                                  style={styles.miniStepperBtn}
                                  onPress={() => updateIngredientQty(itemIdx, ingIdx, 1)}
                                  activeOpacity={0.7}
                                >
                                  <Plus size={rem(8)} color="#64748B" />
                                </TouchableOpacity>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  )}

                  {/* ADICIONES COLUMN */}
                  {item.selectedAdditions.length > 0 && (
                    <View style={[styles.columnHalf, item.selectedIngredients.length === 0 && { width: '100%' }]}>
                      <View style={styles.columnHeader}>
                        <PlusCircle size={rem(13)} color="#64748B" style={{ marginRight: rem(4) }} />
                        <Text style={styles.columnHeaderText}>ADICIONES</Text>
                      </View>

                      <View style={styles.itemsWrapper}>
                        {item.selectedAdditions.map((add, addIdx) => {
                          const qty = add.cantidad || 0;
                          const isSelected = qty > 0;
                          return (
                            <View key={add.id || `add-${addIdx}`} style={styles.stepperSubCard}>
                              <View style={styles.subCardInfo}>
                                <Text style={styles.subCardLabel}>{add.nombre}</Text>
                                <Text style={styles.subCardPrice}>+{add.precio || 0} COP</Text>
                              </View>

                              {add.stock !== undefined && (
                                <View style={styles.stockBadge}>
                                  <Text style={styles.stockBadgeText}>Stock: {add.stock}</Text>
                                </View>
                              )}

                              <View style={styles.miniStepper}>
                                <TouchableOpacity
                                  style={styles.miniStepperBtn}
                                  onPress={() => updateAdditionQty(itemIdx, addIdx, -1)}
                                  activeOpacity={0.7}
                                >
                                  <Minus size={rem(8)} color="#64748B" />
                                </TouchableOpacity>
                                <Text style={styles.miniStepperQty}>{qty}</Text>
                                <TouchableOpacity
                                  style={styles.miniStepperBtn}
                                  onPress={() => updateAdditionQty(itemIdx, addIdx, 1)}
                                  activeOpacity={0.7}
                                >
                                  <Plus size={rem(8)} color="#64748B" />
                                </TouchableOpacity>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  )}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Sticky footer styled with invoice discount and total matching screenshot */}
      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          <Text style={styles.footerTotalLabel}>TOTAL:</Text>
          <Text style={styles.footerTotalValue}>{CurrencyService.format(finalBillTotal)} COP</Text>
        </View>

        {/* Desc Factura input layout */}
        <View style={styles.invoiceDiscountArea}>
          <Text style={styles.invoiceDiscountLabel}>Desc. Factura</Text>
          <View style={styles.invoiceDiscountInputBox}>
            <View style={styles.invoiceDiscountIconCircle}>
              <Text style={styles.invoiceDiscountIconText}>$</Text>
            </View>
            <TextInput
              style={styles.invoiceDiscountInput}
              keyboardType="numeric"
              value={invoiceDiscount}
              onChangeText={setInvoiceDiscount}
            />
          </View>
        </View>

        {/* Large "Listo" solid blue button on right */}
        <TouchableOpacity style={styles.listoBtn} onPress={handleSaveAllAndBack} activeOpacity={0.85}>
          <Text style={styles.listoBtnText}>Listo</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? rem(50) : rem(35),
    paddingBottom: rem(10),
    paddingHorizontal: rem(18),
    backgroundColor: '#FFFFFF',
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: rem(10),
  },
  logoAndTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: rem(12),
  },
  logoIcon: {
    width: rem(26),
    height: rem(26),
    backgroundColor: '#6366F1',
    borderRadius: rem(8),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: rem(6),
  },
  logoText: {
    fontSize: rem(15),
    color: '#0F172A',
    fontFamily: 'Inter-Regular',
    letterSpacing: -0.3,
  },
  logoTextBold: {
    fontWeight: '900',
    color: '#6366F1',
    fontFamily: 'Inter-Black',
  },
  headerDivider: {
    width: 1,
    height: rem(16),
    backgroundColor: '#E2E8F0',
    marginRight: rem(12),
  },
  headerTitleText: {
    fontSize: rem(15),
    fontWeight: '800',
    color: '#334155', // Slate-700 for a highly premium dark look
  },
  headerCloseBtn: {
    width: rem(30),
    height: rem(30),
    borderRadius: rem(15),
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: rem(2),
    marginBottom: rem(6),
  },
  sortLabel: {
    fontSize: rem(10),
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: rem(10),
    paddingHorizontal: rem(10),
    paddingVertical: rem(5),
    marginLeft: rem(10),
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dropdownText: {
    fontSize: rem(11),
    fontWeight: '700',
    color: '#1E293B',
    marginRight: rem(5),
  },
  scrollBody: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: rem(14),
    paddingVertical: rem(10),
  },
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: rem(16),
    borderWidth: 1.2,
    borderColor: '#EDF2F7',
    padding: rem(14),
    marginBottom: rem(14),
    ...Platform.select({
      ios: {
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 10,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  productHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: rem(10),
  },
  productTitleArea: {
    flex: 1,
    paddingRight: rem(10),
  },
  productTitle: {
    fontSize: rem(14.5),
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: rem(6),
  },
  notesInputBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: rem(10),
    paddingHorizontal: rem(10),
    paddingVertical: rem(6),
    marginBottom: rem(12),
  },
  notesIcon: {
    marginRight: rem(6),
  },
  notesTextInput: {
    flex: 1,
    fontSize: rem(11.5),
    fontWeight: '600',
    color: '#334155',
    padding: 0,
  },
  productHeaderControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rem(12),
  },
  mainQtyStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: rem(15),
    padding: rem(2),
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  circleStepperBtn: {
    width: rem(22),
    height: rem(22),
    borderRadius: rem(11),
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  mainQtyText: {
    fontSize: rem(11.5),
    fontWeight: '800',
    color: '#0F172A',
    paddingHorizontal: rem(10),
  },
  removeProductBtn: {
    width: rem(22),
    height: rem(22),
    justifyContent: 'center',
    alignItems: 'center',
  },
  pricesAndDiscountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: rem(12),
    gap: rem(12),
    flexWrap: 'wrap',
  },
  priceColumn: {
    gap: rem(2),
  },
  priceLabel: {
    fontSize: rem(8.5),
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  unitPriceText: {
    fontSize: rem(11.5),
    fontWeight: '600',
    color: '#64748B',
  },
  subtotalPriceText: {
    fontSize: rem(13.5),
    fontWeight: '800',
    color: '#6366F1', // bold brand subtotal
  },
  adjustmentsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rem(6),
  },
  adjustmentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: rem(12),
    paddingHorizontal: rem(10),
    paddingVertical: rem(6),
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: rem(4),
  },
  adjustmentPillActive: {
    borderColor: '#6366F1',
    backgroundColor: '#EEF2FF',
  },
  adjustmentPillText: {
    fontSize: rem(11),
    fontWeight: '700',
    color: '#475569',
  },
  adjustmentPillTextActive: {
    color: '#6366F1',
  },
  adjustmentControlPanel: {
    backgroundColor: '#F8FAFC',
    borderRadius: rem(12),
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: rem(10),
    marginBottom: rem(12),
    gap: rem(8),
    width: '100%',
  },
  controlPanelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: rem(10),
    width: '100%',
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: rem(10),
    padding: rem(2),
    gap: rem(2),
  },
  segmentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: rem(8),
    paddingVertical: rem(4),
    borderRadius: rem(8),
    gap: rem(3),
  },
  segmentBtnActive: {
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  segmentBtnText: {
    fontSize: rem(10.5),
    fontWeight: '700',
    color: '#64748B',
  },
  segmentBtnTextActive: {
    color: '#4F46E5',
  },
  premiumInputBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: rem(10),
    borderWidth: 1.2,
    borderColor: '#CBD5E1',
    paddingHorizontal: rem(10),
    height: rem(32),
    minWidth: rem(80),
    justifyContent: 'center',
  },
  premiumInputText: {
    fontSize: rem(12),
    fontWeight: '800',
    color: '#4F46E5',
    textAlign: 'right',
    padding: 0,
    minWidth: rem(60),
  },
  overrideLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rem(4),
  },
  overrideLabelText: {
    fontSize: rem(11),
    fontWeight: '700',
    color: '#475569',
  },
  dashedLine: {
    borderStyle: 'dashed',
    borderWidth: 0.6,
    borderColor: '#CBD5E1',
    marginVertical: rem(10),
  },
  columnsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  columnHalf: {
    width: '49%',
  },
  columnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: rem(8),
  },
  columnHeaderText: {
    fontSize: rem(10),
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  itemsWrapper: {
    gap: rem(6),
  },
  stepperSubCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EDF2F7',
    borderRadius: rem(10),
    padding: rem(8),
    flexDirection: 'column',
    gap: rem(4),
  },
  stepperSubCardActive: {
    backgroundColor: '#EFF6FF', // Soft light blue highlight active ingredient matching screenshot
    borderColor: '#BFDBFE',
  },
  subCardInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  subCardLabel: {
    fontSize: rem(11.5),
    fontWeight: '700',
    color: '#475569',
  },
  subCardLabelActive: {
    color: '#2563EB', // Blue active ingredient text
  },
  subCardStock: {
    fontSize: rem(9),
    color: '#94A3B8',
    fontWeight: '500',
  },
  subCardPrice: {
    fontSize: rem(10),
    color: '#10B981', // green value COP for adiciones matching screenshot
    fontWeight: '700',
  },
  stockBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: rem(4),
    paddingVertical: rem(1),
    borderRadius: rem(4),
  },
  stockBadgeText: {
    fontSize: rem(8),
    fontWeight: '600',
    color: '#64748B',
  },
  miniStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: rem(10),
    padding: rem(2),
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignSelf: 'flex-end',
    width: '65%',
    justifyContent: 'space-between',
  },
  miniStepperBtn: {
    width: rem(18),
    height: rem(18),
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniStepperQty: {
    fontSize: rem(10.5),
    fontWeight: '800',
    color: '#0F172A',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: rem(16),
    paddingVertical: rem(12),
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerLeft: {
    gap: rem(2),
  },
  footerTotalLabel: {
    fontSize: rem(10),
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  footerTotalValue: {
    fontSize: rem(16),
    fontWeight: '800',
    color: '#4F46E5', // vibrant grand total purple color
  },
  invoiceDiscountArea: {
    gap: rem(4),
  },
  invoiceDiscountLabel: {
    fontSize: rem(10.5),
    fontWeight: '700',
    color: '#64748B',
  },
  invoiceDiscountInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: rem(10),
    paddingHorizontal: rem(8),
    height: rem(36),
    width: rem(100),
  },
  invoiceDiscountIconCircle: {
    width: rem(20),
    height: rem(20),
    borderRadius: rem(10),
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: rem(6),
  },
  invoiceDiscountIconText: {
    color: '#FFFFFF',
    fontSize: rem(10),
    fontWeight: '800',
  },
  invoiceDiscountInput: {
    flex: 1,
    fontSize: rem(11.5),
    fontWeight: '700',
    color: '#4F46E5',
    padding: 0,
  },
  listoBtn: {
    backgroundColor: '#4F46E5', // exact blue-purple matching Listo button screenshot
    height: rem(42),
    borderRadius: rem(12),
    paddingHorizontal: rem(26),
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  listoBtnText: {
    fontSize: rem(14),
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: rem(20),
    backgroundColor: '#F8FAFC',
  },
  errorText: {
    fontSize: rem(13),
    color: '#64748B',
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: rem(15),
  },
  errorBtn: {
    paddingHorizontal: rem(16),
    paddingVertical: rem(10),
    backgroundColor: '#4F46E5',
    borderRadius: rem(8),
  },
  errorBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: rem(12.5),
  },
});
