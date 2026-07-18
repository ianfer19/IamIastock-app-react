import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { MotiView } from 'moti';
import { COLORS, TYPOGRAPHY, GLOBS } from '../../core/theme/theme';

interface PremiumButtonProps {
  title: string;
  onPress: () => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
  variant?: 'primary' | 'gold' | 'glass';
}

export const PremiumButton: React.FC<PremiumButtonProps> = ({ 
  title, 
  onPress, 
  style, 
  textStyle,
  variant = 'primary' 
}) => {
  const getBackgroundColor = () => {
    switch (variant) {
      case 'gold': return COLORS.gold;
      case 'glass': return COLORS.glass;
      default: return COLORS.primary;
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case 'gold': return COLORS.background;
      default: return COLORS.text;
    }
  };

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <MotiView
        from={{ scale: 1 }}
        animate={{ scale: 1 }}
        transition={{ type: 'timing', duration: 150 }}
        style={[
          styles.button, 
          { backgroundColor: getBackgroundColor() },
          variant === 'glass' && styles.glassBorder,
          style
        ]}
      >
        <Text style={[styles.text, { color: getTextColor() }, textStyle]}>
          {title}
        </Text>
      </MotiView>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: GLOBS.borderRadius,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primaryGlow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  glassBorder: {
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  text: {
    ...TYPOGRAPHY.body,
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
  },
});
