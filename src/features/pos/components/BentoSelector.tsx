import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, FlatList, TouchableWithoutFeedback } from 'react-native';
import { ChevronDown, Check } from 'lucide-react-native';
import { rem } from '@/core/utils/responsive';
import { useTheme } from '@/core/theme/theme';
import { MotiView } from 'moti';

interface BentoSelectorOption {
  id: string;
  label: string;
}

interface BentoSelectorProps {
  label: string;
  options: BentoSelectorOption[];
  selected: string; // The ID of the selected option
  onSelect: (id: string) => void;
  activeColor: string;
  isLoading?: boolean;
}

export const BentoSelector = ({ 
  label, 
  options, 
  selected, 
  onSelect, 
  activeColor,
  isLoading 
}: BentoSelectorProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const { colors, mode } = useTheme();
  const styles = getStyles(colors, mode);
  const selectedOption = options.find(o => o.id === selected) || options[0];

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity 
        style={[
          styles.container, 
          { borderColor: activeColor + '30' },
          isLoading && styles.loadingContainer
        ]} 
        onPress={() => !isLoading && setIsVisible(true)}
        activeOpacity={0.7}
        disabled={isLoading}
      >
        {isLoading ? (
          <MotiView
            from={{ opacity: 0.4 }}
            animate={{ opacity: 1 }}
            transition={{ loop: true, type: 'timing', duration: 800 }}
            style={styles.loadingPlaceholder}
          />
        ) : (
          <Text numberOfLines={1} style={[styles.selectedText, { color: activeColor }]}>
            {selectedOption?.label || 'SELECCIONAR'}
          </Text>
        )}
        <ChevronDown size={rem(12)} color={isLoading ? (mode === 'light' ? '#CBD5E1' : '#475569') : activeColor} />
      </TouchableOpacity>

      <Modal visible={isVisible} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setIsVisible(false)}>
          <View style={styles.overlay}>
            <MotiView 
              from={{ opacity: 0, scale: 0.9, translateY: 10 }}
              animate={{ opacity: 1, scale: 1, translateY: 0 }}
              style={styles.modal}
            >
              <Text style={styles.modalTitle}>Seleccionar {label}</Text>
              <FlatList
                data={options}
                keyExtractor={item => item.id}
                renderItem={({ item }) => {
                  const isActive = item.id === selected;
                  return (
                    <TouchableOpacity 
                      style={[styles.option, isActive && { backgroundColor: activeColor + '10' }]}
                      onPress={() => {
                        onSelect(item.id);
                        setIsVisible(false);
                      }}
                    >
                      <Text style={[styles.optionText, isActive && { color: activeColor, fontWeight: '800' }]}>
                        {item.label}
                      </Text>
                      {isActive && <Check size={rem(14)} color={activeColor} />}
                    </TouchableOpacity>
                  );
                }}
              />
            </MotiView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const getStyles = (colors: any, mode: string) => StyleSheet.create({
  wrapper: {
    flex: 1,
    gap: rem(4),
  },
  label: {
    fontSize: rem(8),
    fontWeight: '900',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: rem(4),
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: mode === 'light' ? '#F8FAFC' : '#1E293B',
    borderRadius: rem(12),
    paddingHorizontal: rem(10),
    paddingVertical: rem(8),
    borderWidth: 1.5,
    minHeight: rem(34),
  },
  loadingContainer: {
    backgroundColor: mode === 'light' ? '#F1F5F9' : '#334155',
    borderColor: mode === 'light' ? '#E2E8F0' : '#475569',
  },
  loadingPlaceholder: {
    width: '60%',
    height: rem(10),
    backgroundColor: mode === 'light' ? '#CBD5E1' : '#475569',
    borderRadius: rem(4),
  },
  selectedText: {
    fontSize: rem(10),
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: rem(20),
  },
  modal: {
    width: '80%',
    backgroundColor: colors.surface,
    borderRadius: rem(24),
    padding: rem(20),
    maxHeight: '60%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: rem(14),
    fontWeight: '900',
    color: colors.text,
    marginBottom: rem(15),
    textTransform: 'uppercase',
    letterSpacing: 1,
    textAlign: 'center',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: rem(12),
    paddingHorizontal: rem(15),
    borderRadius: rem(12),
    marginBottom: rem(4),
  },
  optionText: {
    fontSize: rem(12),
    color: colors.text,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
});
