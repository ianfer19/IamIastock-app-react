import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { rem } from '@/core/utils/responsive';
import { DashboardHeader } from '../components/DashboardLayout';
import { PosSubHeader, PosTab } from '../components/PosSubHeader';
import { Calendar } from 'lucide-react-native';
import { MotiView } from 'moti';
import { useTheme } from '@/core/theme/theme';

export const ReservasScreen = ({ onNavigate }: { onNavigate: (tab: PosTab) => void }) => {
  const { colors, mode } = useTheme();
  const styles = getStyles(colors, mode);

  return (
    <View style={styles.container}>
      <DashboardHeader />
      
      <PosSubHeader 
        activeTab="RESERVAS" 
        title="RESERVACIONES" 
        onNavigate={onNavigate} 
      />

      <View style={styles.outerContent}>
        <View style={styles.bentoContainer}>
          <MotiView 
            from={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            style={styles.emptyState}
          >
            <View style={styles.iconCircle}>
              <Calendar size={rem(40)} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>Módulo de Reservas</Text>
            <Text style={styles.emptySubtitle}>
              Próximamente: Gestión de reservas sincronizada con WhatsApp y Google Calendar para tu restaurante.
            </Text>
          </MotiView>
        </View>
      </View>
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
    padding: rem(20),
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: rem(40),
  },
  iconCircle: {
    width: rem(80),
    height: rem(80),
    borderRadius: rem(40),
    backgroundColor: mode === 'light' ? '#EEF2FF' : colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: rem(20),
  },
  emptyTitle: {
    fontSize: rem(16),
    fontWeight: '800',
    color: colors.text,
    marginBottom: rem(10),
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: rem(12),
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: rem(18),
  },
});
