import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FileText, Coins, Clock, SlidersHorizontal } from 'lucide-react-native';
import { MotiView } from 'moti';
import { rem } from '@/core/utils/responsive';
import { useTheme } from '@/core/theme/theme';

export type CajaSubTab = 'ACCIONES' | 'ORDENES' | 'HISTORIAL' | 'GESTION';

interface CajaSubHeaderProps {
  activeSubTab: CajaSubTab;
  setActiveSubTab: (tab: CajaSubTab) => void;
  triggerHaptic: () => void;
}

export const CajaSubHeader: React.FC<CajaSubHeaderProps> = ({
  activeSubTab,
  setActiveSubTab,
  triggerHaptic,
}) => {
  const { colors, mode } = useTheme();
  const styles = getStyles(colors, mode);

  const NavItem = ({ tab, icon: Icon }: { tab: CajaSubTab; icon: any }) => {
    const isActive = activeSubTab === tab;
    const activeBg = mode === 'light' ? '#EFF1FE' : '#1E1B4B';
    const inactiveBg = mode === 'light' ? '#FFFFFF' : '#0F172A';
    const activeBorder = mode === 'light' ? '#DCE2FF' : '#312E81';
    const inactiveBorder = mode === 'light' ? '#FFFFFF' : '#0F172A';

    return (
      <TouchableOpacity 
        style={styles.navItemWrapper}
        onPress={() => {
          triggerHaptic();
          setActiveSubTab(tab);
        }}
        activeOpacity={0.7}
        hitSlop={{ top: 12, bottom: 12, left: 10, right: 10 }}
      >
        <MotiView
          animate={{
            scale: isActive ? 1.05 : 1,
            backgroundColor: isActive ? activeBg : inactiveBg,
            borderColor: isActive ? activeBorder : inactiveBorder,
          }}
          transition={{ type: 'spring', stiffness: 350, damping: 20 }}
          style={styles.navItem}
        >
          <Icon size={rem(15.5)} strokeWidth={2.3} color={isActive ? colors.primary : colors.textMuted} />
        </MotiView>
      </TouchableOpacity>
    );
  };

  const getSubTabInfo = () => {
    switch (activeSubTab) {
      case 'ORDENES': 
        return { label: 'ORDENES DE HOY', icon: FileText };
      case 'ACCIONES': 
        return { label: 'CONTROL DE CAJA', icon: Coins };
      case 'HISTORIAL': 
        return { label: 'HISTORIAL CAJA', icon: Clock };
      case 'GESTION': 
        return { label: 'GESTIÓN DE CAJAS', icon: SlidersHorizontal };
      default: 
        return { label: 'CONTROL DE CAJA', icon: Coins };
    }
  };

  const { label, icon: TabIcon } = getSubTabInfo();

  return (
    <View style={styles.subHeader}>
      <View style={styles.navPill}>
        <NavItem tab="ORDENES" icon={FileText} />
        <NavItem tab="ACCIONES" icon={Coins} />
        <NavItem tab="HISTORIAL" icon={Clock} />
        <NavItem tab="GESTION" icon={SlidersHorizontal} />
      </View>

      <MotiView
        key={activeSubTab}
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
        <Text style={styles.labelText}>{label}</Text>
      </MotiView>
    </View>
  );
};

const getStyles = (colors: any, mode: string) => StyleSheet.create({
  subHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: rem(20),
    paddingVertical: rem(8),
    backgroundColor: 'transparent',
  },
  navPill: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: rem(20),
    padding: rem(3.5),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: mode === 'light' ? 0.05 : 0.2,
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
  },
  labelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: mode === 'light' ? '#EFF1FE' : '#1E1B4B',
    paddingLeft: rem(10),
    paddingRight: rem(14),
    paddingVertical: rem(6),
    borderRadius: rem(18),
    borderWidth: 1,
    borderColor: mode === 'light' ? '#DCE2FF' : '#312E81',
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
