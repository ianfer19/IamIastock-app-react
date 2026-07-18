import React from 'react';
import { StyleSheet, ScrollView, Text, View } from 'react-native';
import { MotiView, MotiText } from 'moti';
import { MotiPressable } from 'moti/interactions';
import { rem } from '@/core/utils/responsive';
import { useTheme } from '@/core/theme/theme';
import * as Haptics from 'expo-haptics';

interface ZoneFilterProps {
  label: string;
  zones: string[];
  activeZone: string;
  onZoneChange: (zone: string) => void;
  activeColor?: string;
}

export const ZoneFilter = ({ label, zones, activeZone, onZoneChange, activeColor }: ZoneFilterProps) => {
  const { colors, mode } = useTheme();
  const styles = getStyles(colors, mode);
  const finalActiveColor = activeColor || colors.primary;

  const handlePress = (zone: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onZoneChange(zone);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {zones.map((zone) => {
          const isActive = activeZone === zone;
          
          return (
            <MotiPressable
              key={zone}
              onPress={() => handlePress(zone)}
              animate={({ pressed }) => {
                'worklet';
                return {
                  scale: pressed ? 0.95 : 1,
                  backgroundColor: isActive ? finalActiveColor : (mode === 'light' ? '#F8FAFC' : '#1E293B'),
                };
              }}
              style={[
                styles.pill,
                isActive && { borderColor: finalActiveColor }
              ]}
            >
              <MotiText
                style={[
                  styles.text,
                  { color: isActive ? '#FFFFFF' : colors.textMuted },
                  isActive && styles.activeText
                ]}
              >
                {zone}
              </MotiText>
            </MotiPressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

const getStyles = (colors: any, mode: string) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: rem(2),
    gap: rem(6),
  },
  label: {
    fontSize: rem(8),
    fontWeight: '900',
    color: colors.textMuted,
    textTransform: 'uppercase',
    width: rem(35),
  },
  scrollContent: {
    paddingHorizontal: rem(2),
    gap: rem(4),
  },
  pill: {
    paddingHorizontal: rem(8),
    paddingVertical: rem(4),
    borderRadius: rem(8),
    borderWidth: 1,
    borderColor: mode === 'light' ? '#F1F5F9' : '#334155',
  },
  text: {
    fontSize: rem(8),
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  activeText: {
    fontWeight: '900',
  },
});
