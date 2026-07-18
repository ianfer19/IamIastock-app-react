import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Platform, Modal } from 'react-native';
import { Calendar, Filter, Store, X, ChevronRight, ChevronDown } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { rem } from '@/core/utils/responsive';
import { useTheme } from '@/core/theme/theme';
import * as Haptics from 'expo-haptics';

export interface OrdersFilters {
  status: string;
  type: string;
  startDate: Date | null;
  endDate: Date | null;
  registerId?: string;
  cajaId?: string;
}

interface CajaOrdersFilterBarProps {
  filters: OrdersFilters;
  setFilters: React.Dispatch<React.SetStateAction<OrdersFilters>>;
  registers?: any[];
}

export const CajaOrdersFilterBar: React.FC<CajaOrdersFilterBarProps> = ({ filters, setFilters, registers = [] }) => {
  const { colors, mode } = useTheme();
  const styles = getStyles(colors, mode);
  
  const [activeFilterGroup, setActiveFilterGroup] = useState<'status' | 'type' | 'caja' | 'date' | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Date picker states
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date | null>(null);

  const statuses = [
    { label: 'Todas', value: 'ALL' },
    { label: 'Cobradas', value: 'COBRADA' },
    { label: 'Abiertas', value: 'ABIERTA' },
    { label: 'Anuladas', value: 'ANULADA' },
  ];

  const types = [
    { label: 'Todos', value: 'ALL' },
    { label: 'Mostrador', value: 'MOSTRADOR' },
    { label: 'Mesa', value: 'MESA' },
    { label: 'Domicilio', value: 'DOMICILIO' },
  ];

  const triggerHaptic = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

  const toggleGroup = (group: 'status' | 'type' | 'caja' | 'date') => {
    triggerHaptic();
    setActiveFilterGroup(activeFilterGroup === group ? null : group);
  };

  const handleSelect = (key: keyof OrdersFilters, value: string) => {
    triggerHaptic();
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    triggerHaptic();
    setFilters({ status: 'ALL', type: 'ALL', startDate: null, endDate: null, registerId: 'ALL' });
    setActiveFilterGroup(null);
  };

  const isFiltered = 
    filters.status !== 'ALL' || 
    filters.type !== 'ALL' || 
    filters.startDate !== null || 
    filters.endDate !== null || 
    (filters.registerId && filters.registerId !== 'ALL');

  const formatDate = (d: Date | null) => {
    if (!d) return '--/--/----';
    return d.toLocaleDateString();
  };

  const renderDatePicker = (
    show: boolean,
    setShow: (s: boolean) => void,
    value: Date | null,
    onSelect: (d: Date) => void
  ) => {
    if (!show) return null;

    if (Platform.OS === 'ios') {
      return (
        <Modal
          transparent={true}
          animationType="slide"
          visible={show}
          onRequestClose={() => setShow(false)}
        >
          <View style={styles.iosModalOverlay}>
            <TouchableOpacity 
              style={styles.iosModalDismiss} 
              activeOpacity={1} 
              onPress={() => setShow(false)} 
            />
            <View style={styles.iosModalContent}>
              <View style={styles.iosModalHeader}>
                <TouchableOpacity onPress={() => setShow(false)}>
                  <Text style={styles.iosCancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => {
                  triggerHaptic();
                  const finalDate = tempDate || value || new Date();
                  onSelect(finalDate);
                  setShow(false);
                }}>
                  <Text style={styles.iosConfirmText}>Listo</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempDate || value || new Date()}
                mode="date"
                display="spinner"
                onChange={(event, selectedDate) => {
                  if (selectedDate) {
                    setTempDate(selectedDate);
                  }
                }}
              />
            </View>
          </View>
        </Modal>
      );
    }

    // Android
    return (
      <DateTimePicker
        value={value || new Date()}
        mode="date"
        display="default"
        onChange={(event, selectedDate) => {
          setShow(false);
          if (event.type === 'set' && selectedDate) {
            onSelect(selectedDate);
          }
        }}
      />
    );
  };

  const activeFiltersCount = [
    filters.status !== 'ALL',
    filters.type !== 'ALL',
    !!(filters.registerId && filters.registerId !== 'ALL'),
    filters.startDate !== null,
    filters.endDate !== null,
  ].filter(Boolean).length;

  const getSelectedRegisterName = () => {
    if (!filters.registerId || filters.registerId === 'ALL') return 'Todas';
    return registers.find(r => r.id === filters.registerId)?.name || `Caja ${filters.registerId}`;
  };

  const getDateFilterSummary = () => {
    const { startDate, endDate } = filters;
    if (!startDate && !endDate) return 'Todas';
    if (startDate && !endDate) return `Desde ${formatDate(startDate)}`;
    if (!startDate && endDate) return `Hasta ${formatDate(endDate)}`;
    if (startDate && endDate) {
      const startStr = startDate.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' });
      const endStr = endDate.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' });
      return `${startStr} - ${endStr}`;
    }
    return 'Todas';
  };

  return (
    <View style={styles.container}>
      {/* Touchable Collapsible Header */}
      <TouchableOpacity 
        style={styles.headerRow} 
        activeOpacity={0.7} 
        onPress={() => {
          triggerHaptic();
          setIsExpanded(!isExpanded);
        }}
      >
        <View style={styles.titleContainer}>
          <Filter size={rem(14)} color={isExpanded ? colors.primary : colors.textMuted} />
          <Text style={[styles.titleText, isExpanded && styles.titleTextActive]}>
            Filtros (Aplicados en Servidor)
          </Text>
          {activeFiltersCount > 0 && (
            <View style={styles.activeFiltersBadge}>
              <Text style={styles.activeFiltersBadgeText}>{activeFiltersCount}</Text>
            </View>
          )}
        </View>
        <View style={styles.headerRight}>
          {isFiltered && (
            <TouchableOpacity 
              onPress={(e) => {
                e.stopPropagation(); // Prevent toggling accordion expand/collapse
                clearFilters();
              }} 
              style={styles.clearButton}
            >
              <Text style={styles.clearButtonText}>Limpiar</Text>
              <X size={rem(10)} color="#EF4444" />
            </TouchableOpacity>
          )}
          <ChevronDown 
            size={rem(14)} 
            color={colors.textMuted} 
            style={{ 
              transform: [{ rotate: isExpanded ? '180deg' : '0deg' }],
              marginLeft: rem(6)
            }} 
          />
        </View>
      </TouchableOpacity>

      {/* Collapsible Body */}
      {isExpanded && (
        <View style={styles.collapsibleBody}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <TouchableOpacity 
              style={[styles.pill, activeFilterGroup === 'date' && styles.pillActive]}
              onPress={() => toggleGroup('date')}
            >
              <Calendar size={rem(11)} color={activeFilterGroup === 'date' ? colors.primary : colors.textMuted} style={{ marginRight: rem(2) }} />
              <Text style={[styles.pillText, activeFilterGroup === 'date' && styles.pillTextActive]}>
                Fecha: {getDateFilterSummary()}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.pill, activeFilterGroup === 'status' && styles.pillActive]}
              onPress={() => toggleGroup('status')}
            >
              <Text style={[styles.pillText, activeFilterGroup === 'status' && styles.pillTextActive]}>
                Estado: {statuses.find(s => s.value === filters.status)?.label}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.pill, activeFilterGroup === 'type' && styles.pillActive]}
              onPress={() => toggleGroup('type')}
            >
              <Store size={rem(11)} color={activeFilterGroup === 'type' ? colors.primary : colors.textMuted} style={{ marginRight: rem(2) }} />
              <Text style={[styles.pillText, activeFilterGroup === 'type' && styles.pillTextActive]}>
                Tipo: {types.find(s => s.value === filters.type)?.label}
              </Text>
            </TouchableOpacity>

            {registers.length > 1 && (
              <TouchableOpacity 
                style={[styles.pill, activeFilterGroup === 'caja' && styles.pillActive]}
                onPress={() => toggleGroup('caja')}
              >
                <Store size={rem(11)} color={activeFilterGroup === 'caja' ? colors.primary : colors.textMuted} style={{ marginRight: rem(2) }} />
                <Text style={[styles.pillText, activeFilterGroup === 'caja' && styles.pillTextActive]}>
                  Caja: {getSelectedRegisterName()}
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>

          {/* Expanded Selection Area */}
          {activeFilterGroup === 'status' && (
            <View style={styles.expandedArea}>
              {statuses.map(s => (
                <TouchableOpacity 
                  key={s.value} 
                  style={[styles.subPill, filters.status === s.value && styles.subPillActive]}
                  onPress={() => handleSelect('status', s.value)}
                >
                  <Text style={[styles.subPillText, filters.status === s.value && styles.subPillTextActive]}>
                    {s.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {activeFilterGroup === 'type' && (
            <View style={styles.expandedArea}>
              {types.map(s => (
                <TouchableOpacity 
                  key={s.value} 
                  style={[styles.subPill, filters.type === s.value && styles.subPillActive]}
                  onPress={() => handleSelect('type', s.value)}
                >
                  <Text style={[styles.subPillText, filters.type === s.value && styles.subPillTextActive]}>
                    {s.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {activeFilterGroup === 'caja' && (
            <View style={styles.expandedArea}>
              <TouchableOpacity 
                style={[styles.subPill, (!filters.registerId || filters.registerId === 'ALL') && styles.subPillActive]}
                onPress={() => handleSelect('registerId', 'ALL')}
              >
                <Text style={[styles.subPillText, (!filters.registerId || filters.registerId === 'ALL') && styles.subPillTextActive]}>
                  Todas las Cajas
                </Text>
              </TouchableOpacity>
              {registers.map(reg => (
                <TouchableOpacity 
                  key={reg.id} 
                  style={[styles.subPill, filters.registerId === reg.id && styles.subPillActive]}
                  onPress={() => handleSelect('registerId', reg.id)}
                >
                  <Text style={[styles.subPillText, filters.registerId === reg.id && styles.subPillTextActive]}>
                    {reg.name || `Caja ${reg.id}`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Date Picker Fields Area (Grouped inside dates filter selection) */}
          {activeFilterGroup === 'date' && (
            <>
              <View style={styles.divider} />
              
              <View style={styles.customDateContainer}>
                <View style={styles.datePickerBtnContainer}>
                  <Text style={styles.datePickerSectionTitle}>Rango de Fechas</Text>
                  
                  <View style={styles.dateRow}>
                    <TouchableOpacity 
                      style={[styles.datePickerBtn, filters.startDate !== null && styles.datePickerBtnActive]}
                      onPress={() => {
                        triggerHaptic();
                        setTempDate(filters.startDate || new Date());
                        setShowStartPicker(true);
                      }}
                    >
                      <View style={styles.datePickerBtnLeft}>
                        <Calendar size={rem(14)} color={filters.startDate ? colors.primary : colors.textMuted} />
                        <Text style={styles.datePickerLabel}>Desde</Text>
                      </View>
                      <Text style={[styles.datePickerValue, filters.startDate !== null && styles.datePickerValueActive]}>
                        {formatDate(filters.startDate)}
                      </Text>
                    </TouchableOpacity>
                    {filters.startDate !== null && (
                      <TouchableOpacity 
                        style={styles.clearSingleDateBtn} 
                        onPress={() => {
                          triggerHaptic();
                          setFilters(prev => ({ ...prev, startDate: null }));
                        }}
                      >
                        <X size={rem(12)} color="#EF4444" />
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={styles.dateRow}>
                    <TouchableOpacity 
                      style={[styles.datePickerBtn, filters.endDate !== null && styles.datePickerBtnActive]}
                      onPress={() => {
                        triggerHaptic();
                        setTempDate(filters.endDate || new Date());
                        setShowEndPicker(true);
                      }}
                    >
                      <View style={styles.datePickerBtnLeft}>
                        <Calendar size={rem(14)} color={filters.endDate ? colors.primary : colors.textMuted} />
                        <Text style={styles.datePickerLabel}>Hasta</Text>
                      </View>
                      <Text style={[styles.datePickerValue, filters.endDate !== null && styles.datePickerValueActive]}>
                        {formatDate(filters.endDate)}
                      </Text>
                    </TouchableOpacity>
                    {filters.endDate !== null && (
                      <TouchableOpacity 
                        style={styles.clearSingleDateBtn} 
                        onPress={() => {
                          triggerHaptic();
                          setFilters(prev => ({ ...prev, endDate: null }));
                        }}
                      >
                        <X size={rem(12)} color="#EF4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            </>
          )}
        </View>
      )}

      {renderDatePicker(showStartPicker, setShowStartPicker, filters.startDate, (date) => {
        setFilters(prev => ({ ...prev, startDate: date }));
      })}

      {renderDatePicker(showEndPicker, setShowEndPicker, filters.endDate, (date) => {
        setFilters(prev => ({ ...prev, endDate: date }));
      })}
    </View>
  );
};

const getStyles = (colors: any, mode: string) => StyleSheet.create({
  container: {
    marginBottom: rem(12),
    backgroundColor: colors.surface,
    borderRadius: rem(12),
    borderWidth: 1,
    borderColor: mode === 'light' ? '#E2E8F0' : '#334155',
    padding: rem(10),
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: rem(4),
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rem(6),
  },
  titleText: {
    fontSize: rem(12),
    fontWeight: 'bold',
    color: colors.textMuted,
    fontFamily: 'Inter-Bold',
  },
  titleTextActive: {
    color: colors.primary,
  },
  activeFiltersBadge: {
    backgroundColor: colors.primary,
    borderRadius: rem(9),
    width: rem(18),
    height: rem(18),
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeFiltersBadgeText: {
    fontSize: rem(10),
    color: '#FFFFFF',
    fontFamily: 'Inter-Bold',
    fontWeight: 'bold',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rem(4),
    backgroundColor: mode === 'light' ? '#FEF2F2' : '#7f1d1d',
    paddingHorizontal: rem(8),
    paddingVertical: rem(4),
    borderRadius: rem(6),
  },
  clearButtonText: {
    fontSize: rem(10),
    color: '#EF4444',
    fontFamily: 'Inter-Bold',
  },
  collapsibleBody: {
    marginTop: rem(10),
    width: '100%',
  },
  scrollContent: {
    gap: rem(8),
    paddingBottom: rem(4),
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: mode === 'light' ? '#F1F5F9' : '#1E293B',
    paddingHorizontal: rem(12),
    paddingVertical: rem(8),
    borderRadius: rem(20),
    gap: rem(6),
    borderWidth: 1,
    borderColor: mode === 'light' ? '#E2E8F0' : '#334155',
  },
  pillActive: {
    backgroundColor: mode === 'light' ? '#EEF2FF' : '#1E1B4B',
    borderColor: colors.primary,
  },
  pillText: {
    fontSize: rem(12),
    color: colors.text,
    fontFamily: 'Inter-Medium',
  },
  pillTextActive: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  expandedArea: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rem(8),
    marginTop: rem(10),
    paddingTop: rem(10),
    borderTopWidth: 1,
    borderTopColor: mode === 'light' ? '#F1F5F9' : '#334155',
  },
  subPill: {
    backgroundColor: colors.surface,
    paddingHorizontal: rem(10),
    paddingVertical: rem(6),
    borderRadius: rem(8),
    borderWidth: 1,
    borderColor: mode === 'light' ? '#E2E8F0' : '#334155',
  },
  subPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  subPillText: {
    fontSize: rem(11),
    color: colors.text,
    fontFamily: 'Inter-Medium',
  },
  subPillTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: mode === 'light' ? '#F1F5F9' : '#334155',
    marginVertical: rem(10),
  },
  customDateContainer: {
    width: '100%',
    backgroundColor: mode === 'light' ? '#F8FAFC' : '#0F172A',
    borderRadius: rem(12),
    padding: rem(12),
    borderWidth: 1,
    borderColor: mode === 'light' ? '#E2E8F0' : '#334155',
  },
  datePickerBtnContainer: {
    width: '100%',
    gap: rem(8),
  },
  datePickerSectionTitle: {
    fontSize: rem(11),
    fontWeight: 'bold',
    color: colors.textMuted,
    fontFamily: 'Inter-Bold',
    marginBottom: rem(2),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rem(8),
    width: '100%',
  },
  datePickerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: mode === 'light' ? '#E2E8F0' : '#334155',
    borderRadius: rem(8),
    paddingVertical: rem(10),
    paddingHorizontal: rem(12),
  },
  datePickerBtnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rem(6),
  },
  datePickerBtnActive: {
    borderColor: colors.primary,
    backgroundColor: mode === 'light' ? '#EEF2FF' : '#1E1B4B',
  },
  datePickerLabel: {
    fontSize: rem(12),
    color: colors.text,
    fontFamily: 'Inter-Medium',
  },
  datePickerValue: {
    fontSize: rem(12),
    color: colors.textMuted,
    fontFamily: 'Inter-Bold',
  },
  datePickerValueActive: {
    color: colors.primary,
  },
  iosModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  iosModalDismiss: {
    flex: 1,
  },
  iosModalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: rem(15),
    borderTopRightRadius: rem(15),
    paddingBottom: rem(30),
  },
  iosModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: rem(14),
    borderBottomWidth: 1,
    borderBottomColor: mode === 'light' ? '#F1F5F9' : '#334155',
  },
  iosCancelText: {
    fontSize: rem(14),
    color: colors.textMuted,
    fontFamily: 'Inter-Medium',
  },
  iosConfirmText: {
    fontSize: rem(14),
    color: colors.primary,
    fontWeight: 'bold',
    fontFamily: 'Inter-Bold',
  },
  clearSingleDateBtn: {
    backgroundColor: mode === 'light' ? '#FEF2F2' : '#7f1d1d',
    borderWidth: 1,
    borderColor: mode === 'light' ? '#FEE2E2' : '#991b1b',
    borderRadius: rem(12),
    width: rem(22),
    height: rem(22),
    justifyContent: 'center',
    alignItems: 'center',
  },
});
