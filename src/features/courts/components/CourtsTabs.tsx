import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { rem } from '@/core/utils/responsive';
import { courtsColors, courtsFonts, courtsRadii, courtsShadow, courtsTypography } from '../theme/courtsTheme';

export interface CourtsTabItem {
    key: string;
    label: string;
    icon: LucideIcon;
    count?: number;
}

export const CourtsTabs = ({
    tabs,
    active,
    onChange,
}: {
    tabs: CourtsTabItem[];
    active: string;
    onChange: (key: string) => void;
}) => (
    <View style={styles.wrapper}>
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.content}
        >
            {tabs.map(tab => {
                const isActive = tab.key === active;
                const Icon = tab.icon;
                return (
                    <Pressable
                        key={tab.key}
                        onPress={() => onChange(tab.key)}
                        accessibilityRole="tab"
                        accessibilityState={{ selected: isActive }}
                        style={({ pressed }) => [
                            styles.tab,
                            isActive && styles.tabActive,
                            pressed && styles.tabPressed,
                        ]}
                    >
                        <Icon
                            size={rem(13)}
                            color={isActive ? courtsColors.white : courtsColors.textMuted}
                            strokeWidth={2.3}
                        />
                        <Text style={[styles.label, isActive && styles.labelActive]}>{tab.label}</Text>
                        {typeof tab.count === 'number' ? (
                            <View style={[styles.count, isActive && styles.countActive]}>
                                <Text style={[styles.countText, isActive && styles.countTextActive]}>{tab.count}</Text>
                            </View>
                        ) : null}
                    </Pressable>
                );
            })}
        </ScrollView>
    </View>
);

const styles = StyleSheet.create({
    wrapper: {
        paddingHorizontal: rem(16),
        paddingVertical: rem(8),
    },
    content: {
        gap: rem(6),
        paddingRight: rem(16),
    },
    tab: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: rem(6),
        borderRadius: rem(courtsRadii.pill),
        backgroundColor: courtsColors.surface,
        borderWidth: 1,
        borderColor: courtsColors.border,
        paddingHorizontal: rem(13),
        paddingVertical: rem(9),
        minHeight: rem(42),
        ...courtsShadow.soft,
    },
    tabActive: {
        backgroundColor: courtsColors.indigo,
        borderColor: courtsColors.indigo,
        ...courtsShadow.floating,
    },
    tabPressed: {
        opacity: 0.8,
    },
    label: {
        fontFamily: courtsFonts.bold,
        fontSize: rem(courtsTypography.caption),
        color: courtsColors.textMuted,
    },
    labelActive: {
        color: courtsColors.white,
    },
    count: {
        minWidth: rem(17),
        height: rem(17),
        paddingHorizontal: rem(4),
        borderRadius: rem(9),
        backgroundColor: courtsColors.indigoSoft,
        alignItems: 'center',
        justifyContent: 'center',
    },
    countActive: {
        backgroundColor: 'rgba(255,255,255,0.22)',
    },
    countText: {
        fontFamily: courtsFonts.extraBold,
        fontSize: rem(8),
        color: courtsColors.indigoDark,
    },
    countTextActive: {
        color: courtsColors.white,
    },
});
