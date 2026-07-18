import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { MotiView } from 'moti';
import { MotiPressable } from 'moti/interactions';
import { Users, Clock, Layers, ChevronRight } from 'lucide-react-native';
import { rem } from '@/core/utils/responsive';
import { COLORS, useTheme } from '@/core/theme/theme';
import { CurrencyService } from '@/core/services/currencyService';
import { LinearGradient } from 'expo-linear-gradient';

export type TableStatus = 'LIBRE' | 'OCUPADA' | 'POR_PAGAR' | 'RESERVADA';

export interface TableItem {
  id: string;
  nombre: string;
  ubicacion?: string;
  capacidad?: number;
  estado: TableStatus;
  orderTotal?: number;
  orderTime?: number;
}

interface TableCardProps {
  table: TableItem;
  onPress: (table: TableItem) => void;
}

/**
 * LOADING STATE: Pulse Skeleton (Compact)
 */
export const TableSkeleton = () => {
  const { colors, mode } = useTheme();
  const styles = getStyles(colors, mode);
  
  return (
    <MotiView
      from={{ opacity: 0.6 }}
      animate={{ opacity: 1 }}
      transition={{ loop: true, type: 'timing', duration: 1000 }}
      style={styles.cardWrapper}
    >
      <View style={[styles.container, styles.skeletonContainer]}>
        <View style={styles.topRow}>
          <View style={[styles.skeletonTag, { width: rem(35) }]} />
        </View>
        <View style={styles.centerSection}>
          <View style={[styles.skeletonCircle, { width: rem(35), height: rem(35) }]} />
        </View>
        <View style={[styles.skeletonFooter, { height: rem(12) }]} />
      </View>
    </MotiView>
  );
};

export const TableCard = ({ table, onPress }: TableCardProps) => {
  const { colors, mode } = useTheme();
  const styles = getStyles(colors, mode);

  const getStatusTheme = (status: TableStatus) => {
    switch (status) {
      case 'OCUPADA':
        return {
          bg: mode === 'light' ? ['#F8FAFC', '#1E293B'] : ['#1E293B', '#0F172A'],
          accent: COLORS.gold,
          text: '#FFFFFF',
          muted: '#94a3b8',
          label: 'Ocupada',
          border: COLORS.goldGlow,
        };
      case 'POR_PAGAR':
        return {
          bg: ['#7f1d1d', '#450a0a'],
          accent: '#f87171',
          text: '#FFFFFF',
          muted: '#fca5a5',
          label: 'Cuenta',
          border: 'rgba(248, 113, 113, 0.2)',
        };
      default:
        return {
          bg: mode === 'light' ? ['#FFFFFF', '#F8FAFC'] : ['#1E293B', '#0F172A'],
          accent: colors.primary,
          text: colors.text,
          muted: colors.textMuted,
          label: 'Libre',
          border: mode === 'light' ? '#E2E8F0' : '#334155',
        };
    }
  };

  const theme = getStatusTheme(table.estado);
  const isOccupied = table.estado !== 'LIBRE';

  return (
    <MotiPressable
      onPress={() => onPress(table)}
      animate={({ pressed }: { pressed: boolean }) => {
        'worklet';
        return { scale: pressed ? 0.96 : 1 };
      }}
      style={styles.cardWrapper}
    >
      <LinearGradient
        colors={theme.bg as any}
        style={[
          styles.container,
          { borderColor: theme.border },
          isOccupied ? styles.darkShadow : styles.lightShadow
        ]}
      >
        {/* Top Section */}
        <View style={styles.topRow}>
          <View style={[styles.statusTag, { backgroundColor: isOccupied ? 'rgba(255,255,255,0.1)' : colors.primary + '10' }]}>
            <MotiView 
              from={{ opacity: 0.5 }}
              animate={{ opacity: 1 }}
              transition={{ loop: true, type: 'timing', duration: 1500 }}
              style={[styles.statusDot, { backgroundColor: theme.accent }]} 
            />
            <Text style={[styles.statusLabel, { color: isOccupied ? '#FFFFFF' : colors.primary }]}>
              {theme.label}
            </Text>
          </View>
        </View>

        {/* Middle Section */}
        <View style={styles.centerSection}>
          <Text 
            numberOfLines={1} 
            adjustsFontSizeToFit 
            style={[styles.tableNumber, { color: theme.text }]}
          >
            {table.nombre?.toUpperCase() || 'S/N'}
          </Text>
          <View style={styles.zoneRow}>
            <Layers size={rem(7)} color={theme.muted} />
            <Text numberOfLines={1} style={[styles.zoneName, { color: theme.muted }]}>
              {table.ubicacion || 'Salón'}
            </Text>
          </View>
        </View>

        {/* Bottom Section */}
        <View style={[styles.footer, { borderTopColor: isOccupied ? 'rgba(255,255,255,0.1)' : (mode === 'light' ? '#F1F5F9' : '#334155') }]}>
          {isOccupied ? (
            <View style={styles.orderContent}>
              <Text style={[styles.totalValue, { color: theme.accent }]}>
                {CurrencyService.format(table.orderTotal || 0)}
              </Text>
              <View style={styles.timeTag}>
                <Clock size={rem(7)} color={theme.accent} />
                <Text style={[styles.timeText, { color: theme.accent }]}>
                  {table.orderTime ? new Date(table.orderTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.actionRow}>
              <Text style={styles.actionText}>Abrir</Text>
              <ChevronRight size={rem(8)} color={colors.primary} />
            </View>
          )}
        </View>
      </LinearGradient>
    </MotiPressable>
  );
};

const getStyles = (colors: any, mode: string) => StyleSheet.create({
  cardWrapper: {
    width: rem(96), // Reduced to ensure 3 columns fit
    height: rem(130),
    margin: rem(3),
  },
  container: {
    flex: 1,
    borderRadius: rem(16),
    padding: rem(8),
    borderWidth: 1.5,
    justifyContent: 'space-between',
  },
  skeletonContainer: {
    backgroundColor: colors.surface,
    borderColor: mode === 'light' ? '#E2E8F0' : '#334155',
    borderStyle: 'dashed',
  },
  skeletonTag: {
    width: rem(45),
    height: rem(12),
    backgroundColor: mode === 'light' ? '#E2E8F0' : '#334155',
    borderRadius: rem(4),
  },
  skeletonCircle: {
    backgroundColor: mode === 'light' ? '#E2E8F0' : '#334155',
    borderRadius: rem(8),
  },
  skeletonFooter: {
    backgroundColor: mode === 'light' ? '#E2E8F0' : '#334155',
    borderRadius: rem(4),
  },
  lightShadow: {
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  darkShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: rem(5),
    paddingVertical: rem(2),
    borderRadius: rem(6),
    gap: rem(2),
  },
  statusDot: {
    width: rem(3),
    height: rem(3),
    borderRadius: rem(1.5),
  },
  statusLabel: {
    fontSize: rem(7),
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  centerSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: rem(2),
  },
  tableNumber: {
    fontSize: rem(16),
    fontWeight: '900',
    textAlign: 'center',
    width: '100%',
  },
  zoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rem(2),
    marginTop: rem(1),
  },
  zoneName: {
    fontSize: rem(7),
    fontWeight: '600',
  },
  footer: {
    borderTopWidth: 1,
    paddingTop: rem(4),
  },
  orderContent: {
    alignItems: 'center',
    gap: rem(1),
  },
  totalValue: {
    fontSize: rem(9),
    fontWeight: '900',
  },
  timeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rem(2),
  },
  timeText: {
    fontSize: rem(7),
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: rem(2),
  },
  actionText: {
    fontSize: rem(8),
    color: colors.textMuted,
    fontWeight: '700',
  },
});
