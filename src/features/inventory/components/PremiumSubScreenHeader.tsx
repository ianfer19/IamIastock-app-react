import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform } from 'react-native';
import { ArrowLeft, Plus } from 'lucide-react-native';
import { rem } from '@/core/utils/responsive';
import * as Haptics from 'expo-haptics';
import { MotiView } from 'moti';
import { useTheme } from '@/core/theme/theme';

interface PremiumSubScreenHeaderProps {
  title: string;
  subtitle: string;
  onBack: () => void;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: React.ReactNode;
}

export const PremiumSubScreenHeader = ({
  title,
  subtitle,
  onBack,
  actionLabel,
  onAction,
  actionIcon,
}: PremiumSubScreenHeaderProps) => {
  const { colors, mode } = useTheme();
  const styles = getStyles(colors, mode);

  return (
    <View style={styles.headerContainer}>
      <View style={styles.leftSection}>
        {/* Sleek, circular back button with custom micro-animation */}
        <TouchableOpacity
          style={styles.backBtn}
          activeOpacity={0.7}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onBack();
          }}
        >
          <ArrowLeft size={rem(18)} color={colors.primary} strokeWidth={2.5} />
        </TouchableOpacity>

        {/* Vertical text stack: futuristic gold metadata + bold premium title */}
        <View style={styles.titleStack}>
          <Text style={styles.subtitleText}>{subtitle.toUpperCase()}</Text>
          <Text style={styles.titleText} numberOfLines={1}>
            {title}
          </Text>
        </View>
      </View>

      {/* Right Column: Dynamic premium action button or spacer */}
      {actionLabel && onAction ? (
        <MotiView
          from={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 15 }}
        >
          <TouchableOpacity
            style={styles.actionBtn}
            activeOpacity={0.8}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onAction();
            }}
          >
            {actionIcon || <Plus size={rem(14)} color="#FFFFFF" strokeWidth={2.5} />}
            <Text style={styles.actionBtnText}>{actionLabel}</Text>
          </TouchableOpacity>
        </MotiView>
      ) : (
        <View style={{ width: rem(40) }} />
      )}
    </View>
  );
};

const getStyles = (colors: any, mode: 'light' | 'dark') => StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: rem(16),
    paddingVertical: rem(14),
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: mode === 'light' ? '#EAE5DA' : '#334155',
    ...Platform.select({
      ios: {
        shadowColor: '#1C2D5A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: mode === 'light' ? 0.03 : 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: rem(12),
  },
  backBtn: {
    width: rem(38),
    height: rem(38),
    borderRadius: rem(19),
    backgroundColor: mode === 'light' ? '#F8F9FC' : 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: mode === 'light' ? '#EAE5DA' : '#334155',
    marginRight: rem(12),
    shadowColor: '#0D3A94',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  titleStack: {
    flex: 1,
    justifyContent: 'center',
  },
  subtitleText: {
    fontSize: rem(9),
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: colors.gold,
    letterSpacing: rem(1.5),
    marginBottom: rem(2),
  },
  titleText: {
    fontSize: rem(17),
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderColor: colors.gold,
    borderWidth: rem(1.2),
    borderRadius: rem(12),
    paddingVertical: rem(8),
    paddingHorizontal: rem(14),
    gap: rem(4),
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 6,
    elevation: 3,
  },
  actionBtnText: {
    fontSize: rem(12),
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
});
