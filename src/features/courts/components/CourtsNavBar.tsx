import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';
import { rem } from '@/core/utils/responsive';
import { CourtsPalette, courtsFonts, courtsRadii, courtsShadow, useCourtsColors } from '../theme/courtsTheme';

export interface CourtsNavItem {
    key: string;
    label: string;
    shortLabel: string;
    icon: LucideIcon;
}

interface CourtsNavBarProps {
    items: CourtsNavItem[];
    active: string;
    onChange: (key: string) => void;
}

/**
 * Barra de navegación del módulo de Canchas.
 * Replica el patrón de `PosSubHeader` (Ventas): pastilla de iconos + etiqueta activa.
 */
export const CourtsNavBar = ({ items, active, onChange }: CourtsNavBarProps) => {
    const colors = useCourtsColors();
    const styles = getStyles(colors);
    const activeItem = items.find(item => item.key === active) || items[0];
    const ActiveIcon = activeItem?.icon;

    return (
        <View style={styles.wrapper}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.navPill}
                style={styles.navScroll}
                bounces={false}
            >
                {items.map(item => {
                    const isActive = item.key === active;
                    const Icon = item.icon;
                    return (
                        <Pressable
                            key={item.key}
                            onPress={() => {
                                if (isActive) return;
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                onChange(item.key);
                            }}
                            hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
                            accessibilityRole="tab"
                            accessibilityLabel={item.label}
                            accessibilityState={{ selected: isActive }}
                            style={styles.navItemWrapper}
                        >
                            <MotiView
                                animate={{
                                    scale: isActive ? 1.05 : 1,
                                    backgroundColor: isActive ? colors.indigoSoft : colors.surface,
                                    borderColor: isActive ? colors.indigoBorder : colors.surface,
                                }}
                                transition={{ type: 'spring', stiffness: 350, damping: 20 }}
                                style={styles.navItem}
                            >
                                <Icon
                                    size={rem(15.5)}
                                    strokeWidth={2.3}
                                    color={isActive ? colors.indigo : colors.textMuted}
                                />
                            </MotiView>
                        </Pressable>
                    );
                })}
            </ScrollView>

            <MotiView
                key={activeItem?.key}
                from={{ opacity: 0, scale: 0.9, translateX: 12 }}
                animate={{ opacity: 1, scale: 1, translateX: 0 }}
                transition={{ type: 'spring', damping: 15, stiffness: 180 }}
                style={styles.labelPill}
            >
                {activeItem && ActiveIcon ? (
                    <>
                        <View style={styles.iconContainer}>
                            <ActiveIcon size={rem(11)} color={colors.indigo} strokeWidth={2.4} />
                        </View>
                        <Text style={styles.labelText} numberOfLines={1}>{activeItem.shortLabel}</Text>
                    </>
                ) : null}
            </MotiView>
        </View>
    );
};

const getStyles = (colors: CourtsPalette) => StyleSheet.create({
    wrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: rem(8),
        paddingHorizontal: rem(16),
        paddingVertical: rem(8),
        backgroundColor: 'transparent',
    },
    navPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        padding: rem(3.5),
        borderRadius: rem(courtsRadii.pill),
        gap: rem(3),
        ...courtsShadow.soft,
    },
    navScroll: {
        flexShrink: 1,
    },
    navItemWrapper: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    navItem: {
        width: rem(42),
        height: rem(32),
        borderRadius: rem(courtsRadii.pill),
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
    },
    labelPill: {
        flexShrink: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.indigoSoft,
        paddingLeft: rem(8),
        paddingRight: rem(12),
        paddingVertical: rem(6),
        borderRadius: rem(courtsRadii.pill),
        borderWidth: 1,
        borderColor: colors.indigoBorder,
        gap: rem(5),
        ...courtsShadow.soft,
    },
    iconContainer: {
        width: rem(20),
        height: rem(20),
        borderRadius: rem(10),
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
    },
    labelText: {
        flexShrink: 1,
        fontFamily: courtsFonts.extraBold,
        fontSize: rem(9.5),
        letterSpacing: 0.8,
        color: colors.indigo,
    },
});
