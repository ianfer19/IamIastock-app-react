import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ShoppingCart } from 'lucide-react-native';
import { MotiView } from 'moti';
import { MotiPressable } from 'moti/interactions';
import * as Haptics from 'expo-haptics';
import { rem } from '@/core/utils/responsive';
import { COLORS } from '@/core/theme/theme';
import { useAppSelector } from '@/core/store/store';
import { SoundService } from '@/core/services/soundService';

interface FloatingCartProps {
  onPress: () => void;
}

export const FloatingCart = ({ onPress }: FloatingCartProps) => {
  const cartItemsCount = useAppSelector(state => state.cart.cart.length);

  const handlePress = () => {
    SoundService.playClick();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <MotiPressable
      onPress={handlePress}
      animate={({ pressed }: { pressed: boolean }) => {
        'worklet';
        return { scale: pressed ? 0.9 : 1 };
      }}
      style={styles.fab}
    >
      <ShoppingCart size={rem(20)} color="#fff" />
      {cartItemsCount > 0 && (
        <MotiView 
          from={{ scale: 0 }}
          animate={{ scale: 1 }}
          style={styles.badge}
        >
          <Text style={styles.badgeText}>{cartItemsCount}</Text>
        </MotiView>
      )}
    </MotiPressable>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: rem(20),
    bottom: rem(70),
    width: rem(50), // Increased by ~10% (from 45 to 50)
    height: rem(50),
    borderRadius: rem(25),
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    zIndex: 100,
  },
  badge: {
    position: 'absolute',
    top: -rem(4),
    right: -rem(4),
    backgroundColor: '#EF4444',
    borderRadius: rem(10),
    minWidth: rem(18),
    height: rem(18),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: rem(8),
    fontWeight: '900',
  },
});
