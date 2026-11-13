import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Calendar, CalendarDays, CalendarRange, ChevronLeft, ChevronRight, CircleCheck } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { rem } from '@/core/utils/responsive';
import { courtsColors, courtsFonts, courtsRadii, courtsShadow, courtsTypography } from '../theme/courtsTheme';

export type CourtsAgendaViewMode = 'day' | 'week' | 'month';

export interface CourtsAgendaFilterCourt {
    id: string;
    name: string;
    footballType?: string;
}

const VIEW_OPTIONS: { key: CourtsAgendaViewMode; label: string; icon: typeof CalendarDays }[] = [
    { key: 'day', label: 'Día', icon: CalendarDays },
    { key: 'week', label: 'Semana', icon: CalendarRange },
    { key: 'month', label: 'Mes', icon: Calendar },
];

interface CourtsAgendaFiltersProps {
    viewMode: CourtsAgendaViewMode;
    onViewModeChange: (mode: CourtsAgendaViewMode) => void;
    courts: CourtsAgendaFilterCourt[];
    selectedCourtId: string;
    onSelectCourt: (courtId: string) => void;
    freeOnly: boolean;
    onToggleFreeOnly: () => void;
    periodLabel: string;
    periodCaption: string;
    onPrev: () => void;
    onNext: () => void;
    onToday: () => void;
}

export const ALL_COURTS = 'ALL';

export const CourtsAgendaFilters = ({
    viewMode,
    onViewModeChange,
    courts,
    selectedCourtId,
    onSelectCourt,
    freeOnly,
    onToggleFreeOnly,
    periodLabel,
    periodCaption,
    onPrev,
    onNext,
    onToday,
}: CourtsAgendaFiltersProps) => {
    const haptic = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    return (
        <View style={styles.wrapper}>
            <View style={styles.topRow}>
                <View style={styles.segment}>
                    {VIEW_OPTIONS.map(option => {
                        const active = option.key === viewMode;
                        const Icon = option.icon;
                        return (
                            <Pressable
                                key={option.key}
                                onPress={() => {
                                    if (active) return;
                                    haptic();
                                    onViewModeChange(option.key);
                                }}
                                style={[styles.segmentItem, active && styles.segmentItemActive]}
                                accessibilityRole="tab"
                                accessibilityState={{ selected: active }}
                                accessibilityLabel={`Vista ${option.label}`}
                            >
                                <Icon
                                    size={rem(12)}
                                    strokeWidth={2.3}
                                    color={active ? courtsColors.indigo : courtsColors.textMuted}
                                />
                                <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{option.label}</Text>
                            </Pressable>
                        );
                    })}
                </View>

                <Pressable
                    onPress={() => {
                        haptic();
                        onToggleFreeOnly();
                    }}
                    style={[styles.freeToggle, freeOnly && styles.freeToggleActive]}
                    accessibilityRole="switch"
                    accessibilityState={{ checked: freeOnly }}
                    accessibilityLabel="Mostrar solo horarios libres"
                >
                    <CircleCheck
                        size={rem(12)}
                        strokeWidth={2.3}
                        color={freeOnly ? courtsColors.greenMid : courtsColors.textMuted}
                    />
                    <Text style={[styles.freeToggleText, freeOnly && styles.freeToggleTextActive]}>Solo libres</Text>
                </Pressable>
            </View>

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.courts}
                bounces={false}
            >
                <Pressable
                    onPress={() => {
                        haptic();
                        onSelectCourt(ALL_COURTS);
                    }}
                    style={[styles.courtChip, selectedCourtId === ALL_COURTS && styles.courtChipActive]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: selectedCourtId === ALL_COURTS }}
                >
                    <Text style={[styles.courtChipText, selectedCourtId === ALL_COURTS && styles.courtChipTextActive]}>
                        Todas
                    </Text>
                </Pressable>
                {courts.map(court => {
                    const active = court.id === selectedCourtId;
                    const id = court.id;
                    return (
                        <Pressable
                            key={id}
                            onPress={() => {
                                haptic();
                                onSelectCourt(id);
                            }}
                            style={[styles.courtChip, active && styles.courtChipActive]}
                            accessibilityRole="button"
                            accessibilityState={{ selected: active }}
                        >
                            <Text
                                style={[styles.courtChipText, active && styles.courtChipTextActive]}
                                numberOfLines={1}
                            >
                                {court.name}
                            </Text>
                            {court.footballType ? (
                                <Text style={[styles.courtChipMeta, active && styles.courtChipMetaActive]}>
                                    {court.footballType}
                                </Text>
                            ) : null}
                        </Pressable>
                    );
                })}
            </ScrollView>

            <View style={styles.periodRow}>
                <View style={styles.periodNav}>
                    <Pressable onPress={onPrev} style={styles.periodButton} accessibilityLabel="Período anterior" hitSlop={6}>
                        <ChevronLeft size={rem(14)} color={courtsColors.indigo} strokeWidth={2.6} />
                    </Pressable>
                    <Pressable onPress={onToday} style={styles.periodToday} accessibilityLabel="Ir a hoy">
                        <Text style={styles.periodTodayText}>Hoy</Text>
                    </Pressable>
                    <Pressable onPress={onNext} style={styles.periodButton} accessibilityLabel="Período siguiente" hitSlop={6}>
                        <ChevronRight size={rem(14)} color={courtsColors.indigo} strokeWidth={2.6} />
                    </Pressable>
                </View>

                <View style={styles.periodCopy}>
                    <Text style={styles.periodLabel} numberOfLines={1}>{periodLabel}</Text>
                    <Text style={styles.periodCaption} numberOfLines={1}>{periodCaption}</Text>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        gap: rem(8),
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: rem(8),
    },
    segment: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: rem(2),
        padding: rem(3),
        borderRadius: rem(courtsRadii.pill),
        backgroundColor: courtsColors.surfaceLow,
        borderWidth: 1,
        borderColor: courtsColors.border,
    },
    segmentItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: rem(4),
        minHeight: rem(32),
        paddingHorizontal: rem(9),
        borderRadius: rem(courtsRadii.pill),
    },
    segmentItemActive: {
        backgroundColor: courtsColors.surface,
        ...courtsShadow.soft,
    },
    segmentText: {
        fontFamily: courtsFonts.bold,
        fontSize: rem(courtsTypography.micro),
        color: courtsColors.textMuted,
    },
    segmentTextActive: {
        color: courtsColors.indigo,
    },
    freeToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: rem(4),
        minHeight: rem(32),
        paddingHorizontal: rem(10),
        borderRadius: rem(courtsRadii.pill),
        borderWidth: 1,
        borderColor: courtsColors.border,
        backgroundColor: courtsColors.surface,
    },
    freeToggleActive: {
        backgroundColor: courtsColors.greenSoft,
        borderColor: '#86EFAC',
    },
    freeToggleText: {
        fontFamily: courtsFonts.bold,
        fontSize: rem(courtsTypography.micro),
        color: courtsColors.textMuted,
    },
    freeToggleTextActive: {
        color: courtsColors.greenMid,
    },
    courts: {
        gap: rem(6),
        paddingRight: rem(4),
    },
    courtChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: rem(5),
        borderWidth: 1,
        borderColor: courtsColors.border,
        borderRadius: rem(courtsRadii.pill),
        backgroundColor: courtsColors.surface,
        paddingHorizontal: rem(11),
        paddingVertical: rem(6),
        minHeight: rem(32),
        maxWidth: rem(180),
    },
    courtChipActive: {
        backgroundColor: courtsColors.green,
        borderColor: courtsColors.green,
    },
    courtChipText: {
        flexShrink: 1,
        fontFamily: courtsFonts.bold,
        fontSize: rem(courtsTypography.micro),
        color: courtsColors.textMuted,
    },
    courtChipTextActive: {
        color: courtsColors.white,
    },
    courtChipMeta: {
        fontFamily: courtsFonts.extraBold,
        fontSize: rem(7),
        color: courtsColors.greenMid,
    },
    courtChipMetaActive: {
        color: courtsColors.lime,
    },
    periodRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: rem(8),
    },
    periodNav: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: rem(3),
        padding: rem(3),
        borderRadius: rem(courtsRadii.pill),
        backgroundColor: courtsColors.surface,
        borderWidth: 1,
        borderColor: courtsColors.border,
        ...courtsShadow.soft,
    },
    periodButton: {
        width: rem(28),
        height: rem(28),
        borderRadius: rem(14),
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: courtsColors.indigoSoft,
    },
    periodToday: {
        minWidth: rem(40),
        height: rem(28),
        paddingHorizontal: rem(6),
        borderRadius: rem(14),
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: courtsColors.surfaceLow,
    },
    periodTodayText: {
        fontFamily: courtsFonts.extraBold,
        fontSize: rem(9),
        letterSpacing: 0.4,
        color: courtsColors.indigoDark,
    },
    periodCopy: {
        flex: 1,
        minWidth: 0,
        alignItems: 'flex-end',
    },
    periodLabel: {
        fontFamily: courtsFonts.extraBold,
        fontSize: rem(12),
        color: courtsColors.text,
        textTransform: 'capitalize',
    },
    periodCaption: {
        fontFamily: courtsFonts.semibold,
        fontSize: rem(8),
        letterSpacing: 0.5,
        color: courtsColors.textMuted,
        textTransform: 'uppercase',
    },
});
