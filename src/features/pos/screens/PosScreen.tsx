import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Platform,
  ActivityIndicator,
  Modal,
  TouchableWithoutFeedback,
  Image
} from 'react-native';
import {
  Search,
  SlidersHorizontal,
  Package,
  RefreshCw,
  LayoutGrid,
  Plus
} from 'lucide-react-native';
import { COLORS, useTheme } from '@/core/theme/theme';
import { rem } from '@/core/utils/responsive';
import { DashboardHeader } from '../components/DashboardLayout';
import { usePosData } from '../hooks/usePosData';
import { Product } from '@/domain/entities/Product';
import { CurrencyService } from '@/core/services/currencyService';
import { useAppDispatch, useAppSelector } from '@/core/store/store';
import { addToCart as cartAction } from '@/core/store/slices/cartSlice';
import { CartModal } from '../components/CartModal';
import { PosSubHeader, PosTab } from '../components/PosSubHeader';
import { FloatingCart } from '../components/FloatingCart';

export const PosScreen = ({ onNavigate }: { onNavigate: (tab: PosTab, cartId?: string) => void }) => {
  const { colors, mode } = useTheme();
  const styles = getStyles(colors, mode);
  const { products, categories, isLoading, error, refresh } = usePosData();

  const [search, setSearch] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [isCartVisible, setIsCartVisible] = useState(false);

  const dispatch = useAppDispatch();
  const cart = useAppSelector(state => state.cart.cart);
  const addToCart = (product: Product) => dispatch(cartAction(product));

  const filteredProducts = useMemo(() => {
    const filtered = products.filter(product => {
      const matchesSearch = product.nombre.toLowerCase().includes(search.toLowerCase());
      
      const selectedCategory = categories.find(c => c.id === selectedCategoryId);
      const matchesCategory = !selectedCategoryId || 
        product.categoria_id === selectedCategoryId || 
        product.categoria === selectedCategoryId ||
        (selectedCategory && product.categoria === selectedCategory.nombre);

      return matchesSearch && matchesCategory;
    });

    // --- SMART SORTING (Aligned with CloudFront Front-End & Dynamic Stock) ---
    return [...filtered].sort((a, b) => {
      const isAInventoriable = a.es_inventariable !== false;
      const isBInventoriable = b.es_inventariable !== false;

      const cartQtyA = cart.reduce((sum, cartItem) => cartItem.product.id === a.id ? sum + cartItem.quantity : sum, 0);
      const cartQtyB = cart.reduce((sum, cartItem) => cartItem.product.id === b.id ? sum + cartItem.quantity : sum, 0);

      const stockA = isAInventoriable ? Math.max(0, (a.stock || 0) - cartQtyA) : 0;
      const stockB = isBInventoriable ? Math.max(0, (b.stock || 0) - cartQtyB) : 0;

      const isAOut = isAInventoriable && stockA <= 0;
      const isBOut = isBInventoriable && stockB <= 0;

      // Priority 1: Out of stock (Agotados) is ALWAYS last
      if (isAOut && !isBOut) return 1;
      if (!isAOut && isBOut) return -1;

      // Priority 2: Non-inventoriables go after inventoriables with stock
      if (isAInventoriable && !isBInventoriable && stockA > 0) return -1;
      if (!isAInventoriable && isBInventoriable && stockB > 0) return 1;

      // Priority 3: Stock quantity descending (within their groups)
      if (stockB !== stockA) return stockB - stockA;

      return a.nombre.localeCompare(b.nombre);
    });
  }, [products, search, selectedCategoryId, cart, categories]);

  const renderProduct = ({ item }: { item: Product }) => {
    const isInventoriable = item.es_inventariable !== false;

    // Dynamically calculate remaining available stock by subtracting cart quantity
    const cartQty = cart.reduce((sum, cartItem) => {
      if (cartItem.product.id === item.id) {
        return sum + cartItem.quantity;
      }
      return sum;
    }, 0);

    const effectiveStock = isInventoriable ? Math.max(0, (item.stock || 0) - cartQty) : 0;
    const isOutOfStock = isInventoriable && effectiveStock <= 0;
    const hasImage = !!item.imagen_url;

    // Color-coded inventory metadata
    let stockColor = '#10B981';     // Emerald
    let stockBg = '#ECFDF5';        // Green light
    let stockBorder = '#A7F3D0';
    let stockText = 'Disponible';

    if (isInventoriable) {
      stockText = `${effectiveStock} UND`;
      if (effectiveStock < 15) {
        stockColor = '#D97706';     // Amber
        stockBg = '#FFFBEB';
        stockBorder = '#FCD34D';
      }
    }

    return (
      <TouchableOpacity
        style={[
          styles.productCard,
          isOutOfStock && styles.disabledCard
        ]}
        activeOpacity={0.7}
        onPress={() => {
          if (!isOutOfStock) {
            addToCart(item);
          }
        }}
      >
        {/* Dynamic Image/Placeholder Frame */}
        <View style={styles.productImageContainer}>
          {hasImage ? (
            <Image 
              source={{ uri: item.imagen_url }} 
              style={styles.productImage} 
              resizeMode="contain"
            />
          ) : (
            <View style={styles.placeholderGradient}>
              <Package size={rem(30)} color="#818CF8" strokeWidth={1.5} />
            </View>
          )}

          {/* Overlaid Badges */}
          {isOutOfStock ? (
            <View style={styles.outOfStockOverlay}>
              <Text style={styles.outOfStockText}>AGOTADO</Text>
            </View>
          ) : (
            <View style={[styles.stockBadge, { backgroundColor: stockBg, borderColor: stockBorder }]}>
              <Text style={[styles.stockText, { color: stockColor }]}>
                {stockText}
              </Text>
            </View>
          )}
        </View>

        {/* Info Block */}
        <View style={styles.cardInfo}>
          <Text style={styles.productName}>
            {item.nombre}
          </Text>
          
          <View style={styles.priceRow}>
            <Text style={styles.productPrice}>
              {CurrencyService.format(item.precio)}
            </Text>
            {!isOutOfStock && (
              <View style={styles.plusButton}>
                <Plus size={rem(11)} color="#FFFFFF" strokeWidth={3} />
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <DashboardHeader />

      <PosSubHeader 
        activeTab="POS" 
        title="PUNTO DE VENTA" 
        onNavigate={onNavigate} 
      />

      <View style={styles.outerContent}>
        <View style={styles.bentoContainer}>
          <View style={styles.searchSection}>
            <View style={styles.searchBar}>
              <Search size={rem(16)} color="#94A3B8" />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar productos..."
                placeholderTextColor="#94A3B8"
                value={search}
                onChangeText={setSearch}
              />
            </View>
            <TouchableOpacity
              style={[styles.filterButton, selectedCategoryId && styles.filterButtonActive]}
              onPress={() => setIsFilterVisible(true)}
            >
              <SlidersHorizontal size={rem(16)} color={selectedCategoryId ? '#6366F1' : '#92400E'} />
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Cargando menú...</Text>
            </View>
          ) : error ? (
            <View style={styles.centerContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={refresh} style={styles.retryButton}>
                <Text style={styles.retryText}>Reintentar</Text>
              </TouchableOpacity>
            </View>
          ) : filteredProducts.length === 0 ? (
            <View style={styles.centerContainer}>
              <Package size={rem(48)} color="#E2E8F0" />
              <Text style={styles.emptyText}>No se encontraron productos</Text>
            </View>
          ) : (
            <FlatList
              key={`products-grid-2`}
              data={filteredProducts}
              renderItem={renderProduct}
              keyExtractor={(item) => item.id}
              numColumns={2}
              contentContainerStyle={styles.listContent}
              columnWrapperStyle={styles.columnWrapper}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </View>

      <Modal
        visible={isFilterVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsFilterVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsFilterVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.filterModal}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Categorías</Text>
                  <TouchableOpacity onPress={refresh}>
                    <RefreshCw size={rem(14)} color="#6366F1" />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.categoryItem, !selectedCategoryId && styles.categoryItemActive]}
                  onPress={() => {
                    setSelectedCategoryId(null);
                    setIsFilterVisible(false);
                  }}
                >
                  <LayoutGrid size={rem(18)} color={!selectedCategoryId ? '#6366F1' : '#64748B'} />
                  <Text style={[styles.categoryText, !selectedCategoryId && styles.categoryTextActive]}>Todas</Text>
                </TouchableOpacity>

                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.categoryItem, selectedCategoryId === cat.id && styles.categoryItemActive]}
                    onPress={() => {
                      setSelectedCategoryId(cat.id);
                      setIsFilterVisible(false);
                    }}
                  >
                    <Package size={rem(18)} color={selectedCategoryId === cat.id ? '#6366F1' : '#64748B'} />
                    <Text style={[styles.categoryText, selectedCategoryId === cat.id && styles.categoryTextActive]}>
                      {cat.nombre}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <FloatingCart onPress={() => setIsCartVisible(true)} />

      <CartModal
        isVisible={isCartVisible}
        onClose={() => setIsCartVisible(false)}
        onNavigateToCheckout={() => onNavigate('CHECKOUT' as PosTab)}
        onNavigateToPersonalizar={(cartId) => onNavigate('PERSONALIZAR' as any, cartId)}
      />


    </View>
  );
};

const getStyles = (colors: any, mode: string) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  outerContent: {
    flex: 1,
    paddingHorizontal: rem(12),
    paddingBottom: rem(12),
  },
  bentoContainer: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: rem(30),
    padding: rem(15),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: mode === 'light' ? 0.05 : 0.2,
    shadowRadius: 10,
    elevation: 3,
    overflow: 'hidden',
  },
  searchSection: {
    flexDirection: 'row',
    paddingTop: rem(5),
    paddingBottom: rem(10),
    gap: rem(8),
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: mode === 'light' ? '#F8FAFC' : '#1E293B',
    borderRadius: rem(20),
    paddingHorizontal: rem(12),
    height: rem(40),
    borderWidth: 1,
    borderColor: mode === 'light' ? '#E2E8F0' : '#334155',
  },
  searchInput: {
    flex: 1,
    marginHorizontal: rem(6),
    fontSize: rem(13),
    color: colors.text,
  },
  filterButton: {
    width: rem(40),
    height: rem(40),
    backgroundColor: mode === 'light' ? '#FEF3C7' : 'rgba(217, 119, 6, 0.2)',
    borderRadius: rem(20),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: mode === 'light' ? '#FDE68A' : '#D97706',
  },
  filterButtonActive: {
    backgroundColor: mode === 'light' ? '#EEF2FF' : 'rgba(99, 102, 241, 0.2)',
    borderColor: '#6366F1',
  },
  listContent: {
    paddingTop: rem(5),
    paddingBottom: rem(80),
  },
  columnWrapper: {
    justifyContent: 'flex-start',
    marginBottom: rem(2),
    alignItems: 'stretch',
  },
  productCard: {
    flex: 1,
    margin: rem(6),
    backgroundColor: colors.surface,
    borderRadius: rem(24), // Ultra-premium extra rounded corners
    borderWidth: 1.5,
    borderColor: mode === 'light' ? '#E2E8F0' : '#334155', // Sleek clean slate outline instead of brownish cream
    alignItems: 'stretch',
    minHeight: rem(180),
    position: 'relative',
    overflow: 'hidden', // Genius: automatically clips the full-bleed image on top!
    ...Platform.select({
      ios: {
        shadowColor: '#475569',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: mode === 'light' ? 0.06 : 0.2,
        shadowRadius: 16,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  disabledCard: {
    opacity: 0.7,
    backgroundColor: mode === 'light' ? '#F8FAFC' : '#0F172A',
    borderColor: mode === 'light' ? '#E2E8F0' : '#334155',
  },
  stockBadge: {
    position: 'absolute',
    top: rem(8),
    left: rem(8),
    paddingHorizontal: rem(8),
    paddingVertical: rem(4),
    borderRadius: rem(20), // Luxurious pill capsule
    borderWidth: 1,
    zIndex: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  stockText: {
    fontSize: rem(8.5),
    fontWeight: '800',
    fontFamily: 'Inter-Bold',
    letterSpacing: 0.2,
  },
  productImageContainer: {
    width: '100%',
    height: rem(110), // Taller image box for amazing photography visibility
    backgroundColor: mode === 'light' ? '#FFFFFF' : '#1E293B', // Clean pure white so product backgrounds blend perfectly!
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderBottomWidth: 1.5,
    borderColor: mode === 'light' ? '#F1F5F9' : '#334155', // Elegant bottom divider
  },
  productImage: {
    width: '92%',
    height: '92%',
  },
  placeholderGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: mode === 'light' ? '#F1F5F9' : '#1E293B', // Soft background
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: mode === 'light' ? '#F1F5F9' : '#334155',
  },
  outOfStockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.45)', // Sleek charcoal translucent dim
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 15,
  },
  outOfStockText: {
    color: '#FFFFFF',
    fontSize: rem(11),
    fontWeight: '900',
    fontFamily: 'Inter-Black',
    letterSpacing: 1.5,
  },
  cardInfo: {
    padding: rem(12), // Spacious interior details padding
    flex: 1,
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
  },
  productName: {
    fontSize: rem(12.5),
    fontWeight: '700',
    color: colors.text, // Deep Charcoal
    fontFamily: 'Inter-Bold',
    lineHeight: rem(15),
    marginBottom: rem(6),
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 'auto',
  },
  productPrice: {
    fontSize: rem(13.5),
    fontWeight: '800',
    color: colors.primary, // Slightly richer royal indigo
    fontFamily: 'Inter-ExtraBold',
  },
  plusButton: {
    width: rem(24),
    height: rem(24),
    borderRadius: rem(12),
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: rem(20),
  },
  loadingText: {
    marginTop: rem(10),
    color: colors.textMuted,
    fontSize: rem(14),
  },
  errorText: {
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: rem(15),
  },
  retryButton: {
    paddingHorizontal: rem(20),
    paddingVertical: rem(8),
    backgroundColor: colors.primary,
    borderRadius: rem(20),
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  emptyText: {
    marginTop: rem(10),
    color: colors.textMuted,
    fontSize: rem(14),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-end',
  },
  filterModal: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: rem(30),
    borderTopRightRadius: rem(30),
    padding: rem(25),
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: rem(20),
  },
  modalTitle: {
    fontSize: rem(18),
    fontWeight: 'bold',
    color: colors.text,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: rem(12),
    borderBottomWidth: 1,
    borderBottomColor: mode === 'light' ? '#F1F5F9' : '#334155',
    gap: rem(12),
  },
  categoryItemActive: {
    backgroundColor: mode === 'light' ? '#F8FAFC' : '#1E293B',
  },
  categoryText: {
    fontSize: rem(14),
    color: colors.textMuted,
  },
  categoryTextActive: {
    color: colors.primary,
    fontWeight: 'bold',
  }
});
