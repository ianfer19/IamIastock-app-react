import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Utensils, LayoutGrid, Store, Calendar } from 'lucide-react-native';
import { MotiView } from 'moti';
import { rem } from '@/core/utils/responsive';
import { useTheme } from '@/core/theme/theme';

export type PosTab = 'MESAS' | 'POS' | 'MOSTRADOR' | 'RESERVAS';

interface PosSubHeaderProps {
  activeTab: PosTab;
  title: string;
  onNavigate: (tab: PosTab) => void;
}

export const PosSubHeader = ({ activeTab, title, onNavigate }: PosSubHeaderProps) => {
  const { colors, mode } = useTheme();
  const styles = getStyles(colors, mode);

  const NavItem = ({ tab, icon: Icon }: { tab: PosTab; icon: any }) => {
    const isActive = activeTab === tab;
    return (
      <TouchableOpacity 
        style={styles.navItemWrapper}
        onPress={() => onNavigate(tab)}
        activeOpacity={0.7}
        hitSlop={{ top: 12, bottom: 12, left: 10, right: 10 }}
      >
        <MotiView
          animate={{
            scale: isActive ? 1.05 : 1,
            backgroundColor: isActive ? (mode === 'light' ? '#EFF1FE' : colors.primary + '20') : colors.surface,
            borderColor: isActive ? (mode === 'light' ? '#DCE2FF' : colors.primary + '40') : colors.surface,
          }}
          transition={{ type: 'spring', stiffness: 350, damping: 20 }}
          style={styles.navItem}
        >
          <Icon size={rem(15.5)} strokeWidth={2.3} color={isActive ? colors.primary : colors.textMuted} />
        </MotiView>
      </TouchableOpacity>
    );
  };

  // Find matching icon for active title/tab
  const getTabIcon = () => {
    switch (activeTab) {
      case 'MESAS': return Utensils;
      case 'POS': return LayoutGrid;
      case 'MOSTRADOR': return Store;
      case 'RESERVAS': return Calendar;
      default: return Utensils;
    }
  };

  const TabIcon = getTabIcon();

  return (
    <View style={styles.subHeader}>
      <View style={styles.navPill}>
        <NavItem tab="MESAS" icon={Utensils} />
        <NavItem tab="POS" icon={LayoutGrid} />
        <NavItem tab="MOSTRADOR" icon={Store} />
        <NavItem tab="RESERVAS" icon={Calendar} />
      </View>

      <MotiView
        key={activeTab}
        from={{ opacity: 0, scale: 0.9, translateX: 15 }}
        animate={{ opacity: 1, scale: 1, translateX: 0 }}
        transition={{ type: 'spring', damping: 15, stiffness: 180 }}
        style={styles.labelPill}
      >
        <MotiView 
          from={{ rotate: '-15deg', scale: 0.8 }}
          animate={{ rotate: '0deg', scale: 1 }}
          transition={{ type: 'spring', damping: 12, stiffness: 150 }}
          style={styles.iconContainer}
        >
          <TabIcon size={rem(11)} color={colors.primary} />
        </MotiView>
        <Text style={styles.labelText}>{title}</Text>
      </MotiView>
    </View>
  );
};

const getStyles = (colors: any, mode: string) => StyleSheet.create({
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: rem(20),
    paddingVertical: rem(8),
    backgroundColor: 'transparent',
  },
  navPill: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    padding: rem(3.5),
    borderRadius: rem(20),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    gap: rem(3),
  },
  navItemWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  navItem: {
    width: rem(44),
    height: rem(32),
    borderRadius: rem(16),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surface,
  },
  labelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: mode === 'light' ? '#EFF1FE' : colors.primary + '20',
    paddingLeft: rem(10),
    paddingRight: rem(14),
    paddingVertical: rem(6),
    borderRadius: rem(18),
    borderWidth: 1,
    borderColor: mode === 'light' ? '#DCE2FF' : colors.primary + '40',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    gap: rem(4),
  },
  iconContainer: {
    width: rem(20),
    height: rem(20),
    borderRadius: rem(10),
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  labelText: {
    fontSize: rem(9.5),
    fontWeight: '900',
    color: colors.primary,
    fontFamily: 'Inter-Bold',
    letterSpacing: 1.0,
  },
});
