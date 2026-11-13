import React, { useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TextInputProps,
    View,
    ViewStyle,
} from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { rem } from '@/core/utils/responsive';
import { courtsColors, courtsFonts, courtsRadii, courtsShadow, courtsSpacing, courtsTypography } from '../theme/courtsTheme';

export type CourtsFilterValue = 'ACTIVE' | 'ALL' | 'INACTIVE';

export const SectionCard = ({
    children,
    style,
}: {
    children: React.ReactNode;
    style?: ViewStyle;
}) => <View style={[ui.sectionCard, style]}>{children}</View>;

export const SectionHeader = ({
    title,
    subtitle,
    right,
}: {
    title: string;
    subtitle?: string;
    right?: React.ReactNode;
}) => (
    <View style={ui.sectionHeader}>
        <View style={ui.sectionHeaderCopy}>
            <Text style={ui.sectionTitle}>{title}</Text>
            {subtitle ? <Text style={ui.sectionSubtitle}>{subtitle}</Text> : null}
        </View>
        {right}
    </View>
);

export const CourtsFilterTabs = <T extends string,>({
    options,
    value,
    onChange,
}: {
    options: { value: T; label: string }[];
    value: T;
    onChange: (value: T) => void;
}) => (
    <View style={ui.filterTabs}>
        {options.map(option => {
            const active = option.value === value;
            return (
                <Pressable
                    key={option.value}
                    onPress={() => onChange(option.value)}
                    style={[ui.filterTab, active && ui.filterTabActive]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                >
                    <Text style={[ui.filterTabText, active && ui.filterTabTextActive]}>{option.label}</Text>
                </Pressable>
            );
        })}
    </View>
);

export const StatusPill = ({
    label,
    tone = 'active',
}: {
    label: string;
    tone?: 'active' | 'maintenance' | 'inactive';
}) => (
    <View style={[ui.statusPill, tone === 'maintenance' && ui.statusPillWarning, tone === 'inactive' && ui.statusPillOff]}>
        <Text style={[ui.statusText, tone === 'maintenance' && ui.statusTextWarning, tone === 'inactive' && ui.statusTextOff]}>
            {label}
        </Text>
    </View>
);

export const TagPill = ({ label, icon: Icon }: { label: string; icon?: LucideIcon }) => (
    <View style={ui.tagPill}>
        {Icon ? <Icon size={rem(9)} color={courtsColors.indigoDark} strokeWidth={2.4} /> : null}
        <Text style={ui.tagText}>{label}</Text>
    </View>
);

export const EmptyState = ({
    icon: Icon,
    title,
    message,
    actionLabel,
    onAction,
}: {
    icon: LucideIcon;
    title: string;
    message: string;
    actionLabel?: string;
    onAction?: () => void;
}) => (
    <View style={ui.emptyState}>
        <View style={ui.emptyIcon}>
            <Icon size={rem(26)} color={courtsColors.indigo} strokeWidth={1.8} />
        </View>
        <Text style={ui.emptyTitle}>{title}</Text>
        <Text style={ui.emptyMessage}>{message}</Text>
        {actionLabel && onAction ? (
            <Pressable onPress={onAction} style={ui.primaryButton} accessibilityRole="button">
                <Text style={ui.primaryButtonText}>{actionLabel}</Text>
            </Pressable>
        ) : null}
    </View>
);

export const LoadingState = ({ label = 'Cargando…' }: { label?: string }) => (
    <View style={ui.loadingState}>
        <ActivityIndicator color={courtsColors.indigo} />
        <Text style={ui.loadingText}>{label}</Text>
    </View>
);

export const PrimaryButton = ({
    label,
    onPress,
    icon: Icon,
    disabled,
    variant = 'primary',
    compact,
    style,
}: {
    label: string;
    onPress: () => void;
    icon?: LucideIcon;
    disabled?: boolean;
    variant?: 'primary' | 'ghost' | 'danger';
    compact?: boolean;
    style?: ViewStyle;
}) => (
    <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityState={{ disabled: !!disabled }}
        style={({ pressed }) => [
            ui.primaryButton,
            compact && ui.primaryButtonCompact,
            variant === 'ghost' && ui.ghostButton,
            variant === 'danger' && ui.dangerButton,
            disabled && ui.buttonDisabled,
            pressed && ui.buttonPressed,
            style,
        ]}
    >
        {Icon ? (
            <Icon
                size={rem(compact ? 12 : 13)}
                color={variant === 'ghost' ? courtsColors.text : courtsColors.white}
                strokeWidth={2.3}
            />
        ) : null}
        <Text style={[
            ui.primaryButtonText,
            variant === 'ghost' && ui.ghostButtonText,
            variant === 'danger' && ui.dangerButtonText,
        ]}>
            {label}
        </Text>
    </Pressable>
);

export const IconButton = ({
    icon: Icon,
    onPress,
    variant = 'default',
    label,
}: {
    icon: LucideIcon;
    onPress: () => void;
    variant?: 'default' | 'danger';
    label: string;
}) => (
    <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        hitSlop={8}
        style={({ pressed }) => [
            ui.iconButton,
            variant === 'danger' && ui.iconButtonDanger,
            pressed && ui.buttonPressed,
        ]}
    >
        <Icon size={rem(13)} color={variant === 'danger' ? courtsColors.dangerDark : courtsColors.textMuted} strokeWidth={2.2} />
    </Pressable>
);

export const Field = ({
    label,
    hint,
    error,
    children,
    containerStyle,
}: {
    label: string;
    hint?: string;
    error?: string;
    children: React.ReactNode;
    containerStyle?: ViewStyle;
}) => (
    <View style={[ui.field, containerStyle]}>
        <Text style={ui.fieldLabel}>{label}</Text>
        {children}
        {error ? <Text style={ui.fieldError}>{error}</Text> : hint ? <Text style={ui.fieldHint}>{hint}</Text> : null}
    </View>
);

export const TextField = ({
    label,
    hint,
    error,
    style,
    containerStyle,
    ...props
}: Omit<TextInputProps, 'style'> & {
    label: string;
    hint?: string;
    error?: string;
    style?: ViewStyle;
    containerStyle?: ViewStyle;
}) => {
    const [focused, setFocused] = useState(false);
    return (
        <Field label={label} hint={hint} error={error} containerStyle={containerStyle}>
            <TextInput
                {...props}
                onFocus={event => {
                    setFocused(true);
                    props.onFocus?.(event);
                }}
                onBlur={event => {
                    setFocused(false);
                    props.onBlur?.(event);
                }}
                placeholderTextColor={courtsColors.textSoft}
                style={[
                    ui.input,
                    focused && ui.inputFocused,
                    props.multiline && ui.inputMultiline,
                    style as object,
                ]}
            />
        </Field>
    );
};

export const SwitchRow = ({
    label,
    value,
    onValueChange,
}: {
    label: string;
    value: boolean;
    onValueChange: (value: boolean) => void;
}) => (
    <View style={ui.switchRow}>
        <Text style={ui.switchLabel}>{label}</Text>
        <Switch
            value={value}
            onValueChange={onValueChange}
            trackColor={{ false: courtsColors.border, true: courtsColors.indigo }}
            thumbColor={courtsColors.white}
        />
    </View>
);

export const DayChips = ({
    value,
    onChange,
}: {
    value: number[];
    onChange: (value: number[]) => void;
}) => {
    const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    return (
        <View style={ui.dayChips}>
            {days.map((day, index) => {
                const active = value.includes(index);
                return (
                    <Pressable
                        key={day}
                        onPress={() => onChange(
                            active ? value.filter(item => item !== index) : [...value, index].sort((a, b) => a - b)
                        )}
                        style={[ui.dayChip, active && ui.dayChipActive]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                    >
                        <Text style={[ui.dayChipText, active && ui.dayChipTextActive]}>{day}</Text>
                    </Pressable>
                );
            })}
        </View>
    );
};

export const OptionChips = <T extends string,>({
    options,
    value,
    onChange,
    label,
}: {
    options: { value: T; label: string }[];
    value: T;
    onChange: (value: T) => void;
    label?: string;
}) => (
    <View style={ui.field}>
        {label ? <Text style={ui.fieldLabel}>{label}</Text> : null}
        <View style={ui.optionChips}>
            {options.map(option => {
                const active = option.value === value;
                return (
                    <Pressable
                        key={option.value}
                        onPress={() => onChange(option.value)}
                        style={[ui.optionChip, active && ui.optionChipActive]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                    >
                        <Text style={[ui.optionChipText, active && ui.optionChipTextActive]}>{option.label}</Text>
                    </Pressable>
                );
            })}
        </View>
    </View>
);

const ui = StyleSheet.create({
    sectionCard: {
        backgroundColor: courtsColors.surface,
        borderRadius: rem(courtsRadii.card),
        padding: rem(courtsSpacing.xxl),
        ...courtsShadow.card,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: rem(10),
        marginBottom: rem(14),
    },
    sectionHeaderCopy: {
        flex: 1,
        minWidth: 0,
    },
    sectionTitle: {
        fontFamily: courtsFonts.extraBold,
        fontSize: rem(courtsTypography.section - 2),
        color: courtsColors.text,
    },
    sectionSubtitle: {
        marginTop: rem(2),
        fontFamily: courtsFonts.semibold,
        fontSize: rem(courtsTypography.micro),
        color: courtsColors.textMuted,
    },
    filterTabs: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: rem(4),
        padding: rem(4),
        borderRadius: rem(courtsRadii.md),
        backgroundColor: courtsColors.surfaceLow,
    },
    filterTab: {
        borderRadius: rem(courtsRadii.xs),
        paddingHorizontal: rem(10),
        paddingVertical: rem(6),
    },
    filterTabActive: {
        backgroundColor: courtsColors.surface,
        ...courtsShadow.soft,
    },
    filterTabText: {
        fontFamily: courtsFonts.bold,
        fontSize: rem(courtsTypography.caption),
        color: courtsColors.textMuted,
    },
    filterTabTextActive: {
        color: courtsColors.text,
    },
    statusPill: {
        alignSelf: 'flex-start',
        borderRadius: rem(courtsRadii.pill),
        backgroundColor: courtsColors.greenSoft,
        paddingHorizontal: rem(8),
        paddingVertical: rem(3),
    },
    statusPillWarning: {
        backgroundColor: courtsColors.amber,
    },
    statusPillOff: {
        backgroundColor: '#F3F4F6',
    },
    statusText: {
        fontFamily: courtsFonts.extraBold,
        fontSize: rem(courtsTypography.nano),
        color: courtsColors.greenMid,
        letterSpacing: 0.3,
    },
    statusTextWarning: {
        color: courtsColors.amberText,
    },
    statusTextOff: {
        color: courtsColors.textSoft,
    },
    tagPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: rem(4),
        alignSelf: 'flex-start',
        borderRadius: rem(courtsRadii.pill),
        backgroundColor: courtsColors.indigoSoft,
        paddingHorizontal: rem(7),
        paddingVertical: rem(3),
    },
    tagText: {
        fontFamily: courtsFonts.extraBold,
        fontSize: rem(courtsTypography.nano),
        color: courtsColors.indigoDark,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: rem(28),
        paddingHorizontal: rem(16),
    },
    emptyIcon: {
        width: rem(52),
        height: rem(52),
        borderRadius: rem(26),
        backgroundColor: courtsColors.indigoSoft,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: rem(10),
    },
    emptyTitle: {
        fontFamily: courtsFonts.bold,
        fontSize: rem(14),
        color: courtsColors.text,
        textAlign: 'center',
    },
    emptyMessage: {
        marginTop: rem(4),
        fontFamily: courtsFonts.medium,
        fontSize: rem(courtsTypography.caption),
        color: courtsColors.textMuted,
        textAlign: 'center',
        lineHeight: rem(16),
    },
    loadingState: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: rem(8),
        paddingVertical: rem(26),
    },
    loadingText: {
        fontFamily: courtsFonts.semibold,
        fontSize: rem(courtsTypography.caption),
        color: courtsColors.textMuted,
    },
    primaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: rem(6),
        borderRadius: rem(courtsRadii.pill),
        backgroundColor: courtsColors.indigoDark,
        paddingHorizontal: rem(18),
        paddingVertical: rem(11),
        minHeight: rem(44),
        ...courtsShadow.floating,
    },
    primaryButtonCompact: {
        minHeight: rem(36),
        paddingHorizontal: rem(12),
        paddingVertical: rem(7),
    },
    primaryButtonText: {
        fontFamily: courtsFonts.extraBold,
        fontSize: rem(courtsTypography.bodySmall),
        color: courtsColors.white,
    },
    ghostButton: {
        backgroundColor: courtsColors.surface,
        borderWidth: 1,
        borderColor: courtsColors.border,
        ...courtsShadow.soft,
    },
    ghostButtonText: {
        color: courtsColors.text,
    },
    dangerButton: {
        backgroundColor: courtsColors.dangerSoft,
        borderWidth: 1,
        borderColor: courtsColors.dangerBorder,
        ...courtsShadow.soft,
    },
    dangerButtonText: {
        color: courtsColors.dangerDark,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    buttonPressed: {
        opacity: 0.78,
        transform: [{ scale: 0.985 }],
    },
    iconButton: {
        width: rem(32),
        height: rem(32),
        borderRadius: rem(courtsRadii.xs),
        borderWidth: 1,
        borderColor: courtsColors.border,
        backgroundColor: courtsColors.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconButtonDanger: {
        borderColor: courtsColors.dangerBorder,
        backgroundColor: courtsColors.dangerSoft,
    },
    field: {
        gap: rem(5),
        minWidth: 0,
    },
    fieldLabel: {
        fontFamily: courtsFonts.extraBold,
        fontSize: rem(courtsTypography.micro),
        color: '#4B4B63',
        letterSpacing: 0.3,
        textTransform: 'uppercase',
    },
    input: {
        width: '100%',
        minHeight: rem(44),
        borderWidth: 1,
        borderColor: courtsColors.border,
        borderRadius: rem(courtsRadii.sm),
        backgroundColor: courtsColors.background,
        paddingHorizontal: rem(12),
        paddingVertical: rem(10),
        fontFamily: courtsFonts.medium,
        fontSize: rem(courtsTypography.body),
        color: courtsColors.text,
    },
    inputFocused: {
        borderColor: courtsColors.indigoBorder,
        backgroundColor: courtsColors.surface,
    },
    inputMultiline: {
        minHeight: rem(78),
        textAlignVertical: 'top',
    },
    fieldHint: {
        fontFamily: courtsFonts.medium,
        fontSize: rem(courtsTypography.nano),
        color: courtsColors.textSoft,
        lineHeight: rem(13),
    },
    fieldError: {
        fontFamily: courtsFonts.semibold,
        fontSize: rem(courtsTypography.nano),
        color: courtsColors.danger,
    },
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: rem(10),
        borderRadius: rem(courtsRadii.sm),
        backgroundColor: courtsColors.surfaceLow,
        paddingHorizontal: rem(12),
        paddingVertical: rem(8),
        minHeight: rem(44),
    },
    switchLabel: {
        flex: 1,
        fontFamily: courtsFonts.bold,
        fontSize: rem(courtsTypography.caption),
        color: courtsColors.text,
    },
    dayChips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: rem(6),
    },
    dayChip: {
        borderWidth: 1,
        borderColor: courtsColors.border,
        borderRadius: rem(courtsRadii.pill),
        backgroundColor: courtsColors.background,
        paddingHorizontal: rem(11),
        paddingVertical: rem(7),
        minWidth: rem(42),
        alignItems: 'center',
    },
    dayChipActive: {
        backgroundColor: courtsColors.indigo,
        borderColor: courtsColors.indigo,
    },
    dayChipText: {
        fontFamily: courtsFonts.bold,
        fontSize: rem(courtsTypography.micro),
        color: '#4B4B63',
    },
    dayChipTextActive: {
        color: courtsColors.white,
    },
    optionChips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: rem(6),
    },
    optionChip: {
        borderWidth: 1,
        borderColor: courtsColors.border,
        borderRadius: rem(courtsRadii.pill),
        backgroundColor: courtsColors.background,
        paddingHorizontal: rem(12),
        paddingVertical: rem(8),
        minHeight: rem(38),
        justifyContent: 'center',
    },
    optionChipActive: {
        backgroundColor: courtsColors.indigoSoft,
        borderColor: courtsColors.indigoBorder,
    },
    optionChipText: {
        fontFamily: courtsFonts.bold,
        fontSize: rem(courtsTypography.micro),
        color: courtsColors.textMuted,
    },
    optionChipTextActive: {
        color: courtsColors.indigoDark,
    },
});
