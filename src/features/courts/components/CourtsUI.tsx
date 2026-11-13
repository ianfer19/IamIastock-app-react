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
import {
    CourtsPalette,
    courtsFonts,
    courtsRadii,
    courtsShadow,
    courtsSpacing,
    courtsTypography,
    useCourtsColors,
} from '../theme/courtsTheme';

export type CourtsFilterValue = 'ACTIVE' | 'ALL' | 'INACTIVE';

export const SectionCard = ({
    children,
    style,
}: {
    children: React.ReactNode;
    style?: ViewStyle;
}) => {
    const colors = useCourtsColors();
    const styles = getStyles(colors);
    return <View style={[styles.sectionCard, style]}>{children}</View>;
};

export const SectionHeader = ({
    title,
    subtitle,
    right,
}: {
    title: string;
    subtitle?: string;
    right?: React.ReactNode;
}) => {
    const colors = useCourtsColors();
    const styles = getStyles(colors);
    return (
        <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderCopy}>
                <Text style={styles.sectionTitle}>{title}</Text>
                {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
            </View>
            {right}
        </View>
    );
};

export const CourtsFilterTabs = <T extends string,>({
    options,
    value,
    onChange,
}: {
    options: { value: T; label: string }[];
    value: T;
    onChange: (value: T) => void;
}) => {
    const colors = useCourtsColors();
    const styles = getStyles(colors);
    return (
        <View style={styles.filterTabs}>
            {options.map(option => {
                const active = option.value === value;
                return (
                    <Pressable
                        key={option.value}
                        onPress={() => onChange(option.value)}
                        style={[styles.filterTab, active && styles.filterTabActive]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                    >
                        <Text style={[styles.filterTabText, active && styles.filterTabTextActive]}>{option.label}</Text>
                    </Pressable>
                );
            })}
        </View>
    );
};

export const StatusPill = ({
    label,
    tone = 'active',
}: {
    label: string;
    tone?: 'active' | 'maintenance' | 'inactive';
}) => {
    const colors = useCourtsColors();
    const styles = getStyles(colors);
    return (
        <View style={[styles.statusPill, tone === 'maintenance' && styles.statusPillWarning, tone === 'inactive' && styles.statusPillOff]}>
            <Text style={[styles.statusText, tone === 'maintenance' && styles.statusTextWarning, tone === 'inactive' && styles.statusTextOff]}>
                {label}
            </Text>
        </View>
    );
};

export const TagPill = ({ label, icon: Icon }: { label: string; icon?: LucideIcon }) => {
    const colors = useCourtsColors();
    const styles = getStyles(colors);
    return (
        <View style={styles.tagPill}>
            {Icon ? <Icon size={rem(9)} color={colors.indigoDark} strokeWidth={2.4} /> : null}
            <Text style={styles.tagText}>{label}</Text>
        </View>
    );
};

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
}) => {
    const colors = useCourtsColors();
    const styles = getStyles(colors);
    return (
        <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
                <Icon size={rem(26)} color={colors.indigo} strokeWidth={1.8} />
            </View>
            <Text style={styles.emptyTitle}>{title}</Text>
            <Text style={styles.emptyMessage}>{message}</Text>
            {actionLabel && onAction ? (
                <Pressable onPress={onAction} style={styles.primaryButton} accessibilityRole="button">
                    <Text style={styles.primaryButtonText}>{actionLabel}</Text>
                </Pressable>
            ) : null}
        </View>
    );
};

export const LoadingState = ({ label = 'Cargando…' }: { label?: string }) => {
    const colors = useCourtsColors();
    const styles = getStyles(colors);
    return (
        <View style={styles.loadingState}>
            <ActivityIndicator color={colors.indigo} />
            <Text style={styles.loadingText}>{label}</Text>
        </View>
    );
};

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
}) => {
    const colors = useCourtsColors();
    const styles = getStyles(colors);
    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityState={{ disabled: !!disabled }}
            style={({ pressed }) => [
                styles.primaryButton,
                compact && styles.primaryButtonCompact,
                variant === 'ghost' && styles.ghostButton,
                variant === 'danger' && styles.dangerButton,
                disabled && styles.buttonDisabled,
                pressed && styles.buttonPressed,
                style,
            ]}
        >
            {Icon ? (
                <Icon
                    size={rem(compact ? 12 : 13)}
                    color={variant === 'ghost' ? colors.text : colors.white}
                    strokeWidth={2.3}
                />
            ) : null}
            <Text style={[
                styles.primaryButtonText,
                variant === 'ghost' && styles.ghostButtonText,
                variant === 'danger' && styles.dangerButtonText,
            ]}>
                {label}
            </Text>
        </Pressable>
    );
};

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
}) => {
    const colors = useCourtsColors();
    const styles = getStyles(colors);
    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={label}
            hitSlop={8}
            style={({ pressed }) => [
                styles.iconButton,
                variant === 'danger' && styles.iconButtonDanger,
                pressed && styles.buttonPressed,
            ]}
        >
            <Icon size={rem(13)} color={variant === 'danger' ? colors.dangerDark : colors.textMuted} strokeWidth={2.2} />
        </Pressable>
    );
};

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
}) => {
    const colors = useCourtsColors();
    const styles = getStyles(colors);
    return (
        <View style={[styles.field, containerStyle]}>
            <Text style={styles.fieldLabel}>{label}</Text>
            {children}
            {error ? <Text style={styles.fieldError}>{error}</Text> : hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
        </View>
    );
};

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
    const colors = useCourtsColors();
    const styles = getStyles(colors);
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
                placeholderTextColor={colors.textSoft}
                style={[
                    styles.input,
                    focused && styles.inputFocused,
                    props.multiline && styles.inputMultiline,
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
}) => {
    const colors = useCourtsColors();
    const styles = getStyles(colors);
    return (
        <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>{label}</Text>
            <Switch
                value={value}
                onValueChange={onValueChange}
                trackColor={{ false: colors.border, true: colors.indigo }}
                thumbColor={colors.white}
            />
        </View>
    );
};

export const DayChips = ({
    value,
    onChange,
}: {
    value: number[];
    onChange: (value: number[]) => void;
}) => {
    const colors = useCourtsColors();
    const styles = getStyles(colors);
    const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    return (
        <View style={styles.dayChips}>
            {days.map((day, index) => {
                const active = value.includes(index);
                return (
                    <Pressable
                        key={day}
                        onPress={() => onChange(
                            active ? value.filter(item => item !== index) : [...value, index].sort((a, b) => a - b)
                        )}
                        style={[styles.dayChip, active && styles.dayChipActive]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                    >
                        <Text style={[styles.dayChipText, active && styles.dayChipTextActive]}>{day}</Text>
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
}) => {
    const colors = useCourtsColors();
    const styles = getStyles(colors);
    return (
        <View style={styles.field}>
            {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
            <View style={styles.optionChips}>
                {options.map(option => {
                    const active = option.value === value;
                    return (
                        <Pressable
                            key={option.value}
                            onPress={() => onChange(option.value)}
                            style={[styles.optionChip, active && styles.optionChipActive]}
                            accessibilityRole="button"
                            accessibilityState={{ selected: active }}
                        >
                            <Text style={[styles.optionChipText, active && styles.optionChipTextActive]}>{option.label}</Text>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
};

const getStyles = (colors: CourtsPalette) => StyleSheet.create({
    sectionCard: {
        backgroundColor: colors.surfaceLow,
        borderWidth: 1,
        borderColor: colors.border,
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
        color: colors.text,
    },
    sectionSubtitle: {
        marginTop: rem(2),
        fontFamily: courtsFonts.semibold,
        fontSize: rem(courtsTypography.micro),
        color: colors.textMuted,
    },
    filterTabs: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: rem(4),
        padding: rem(4),
        borderRadius: rem(courtsRadii.md),
        backgroundColor: colors.surfaceLow,
    },
    filterTab: {
        borderRadius: rem(courtsRadii.xs),
        paddingHorizontal: rem(10),
        paddingVertical: rem(6),
    },
    filterTabActive: {
        backgroundColor: colors.surface,
        ...courtsShadow.soft,
    },
    filterTabText: {
        fontFamily: courtsFonts.bold,
        fontSize: rem(courtsTypography.caption),
        color: colors.textMuted,
    },
    filterTabTextActive: {
        color: colors.text,
    },
    statusPill: {
        alignSelf: 'flex-start',
        borderRadius: rem(courtsRadii.pill),
        backgroundColor: colors.greenSoft,
        paddingHorizontal: rem(8),
        paddingVertical: rem(3),
    },
    statusPillWarning: {
        backgroundColor: colors.amber,
    },
    statusPillOff: {
        backgroundColor: colors.slateSoft,
    },
    statusText: {
        fontFamily: courtsFonts.extraBold,
        fontSize: rem(courtsTypography.nano),
        color: colors.greenMid,
        letterSpacing: 0.3,
    },
    statusTextWarning: {
        color: colors.amberText,
    },
    statusTextOff: {
        color: colors.textSoft,
    },
    tagPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: rem(4),
        alignSelf: 'flex-start',
        borderRadius: rem(courtsRadii.pill),
        backgroundColor: colors.indigoSoft,
        paddingHorizontal: rem(7),
        paddingVertical: rem(3),
    },
    tagText: {
        fontFamily: courtsFonts.extraBold,
        fontSize: rem(courtsTypography.nano),
        color: colors.indigoDark,
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
        backgroundColor: colors.indigoSoft,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: rem(10),
    },
    emptyTitle: {
        fontFamily: courtsFonts.bold,
        fontSize: rem(14),
        color: colors.text,
        textAlign: 'center',
    },
    emptyMessage: {
        marginTop: rem(4),
        fontFamily: courtsFonts.medium,
        fontSize: rem(courtsTypography.caption),
        color: colors.textMuted,
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
        color: colors.textMuted,
    },
    primaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: rem(6),
        borderRadius: rem(courtsRadii.pill),
        backgroundColor: colors.indigoDark,
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
        color: colors.white,
    },
    ghostButton: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        ...courtsShadow.soft,
    },
    ghostButtonText: {
        color: colors.text,
    },
    dangerButton: {
        backgroundColor: colors.dangerSoft,
        borderWidth: 1,
        borderColor: colors.dangerBorder,
        ...courtsShadow.soft,
    },
    dangerButtonText: {
        color: colors.dangerDark,
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
        borderColor: colors.border,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconButtonDanger: {
        borderColor: colors.dangerBorder,
        backgroundColor: colors.dangerSoft,
    },
    field: {
        gap: rem(5),
        minWidth: 0,
    },
    fieldLabel: {
        fontFamily: courtsFonts.extraBold,
        fontSize: rem(courtsTypography.micro),
        color: colors.label,
        letterSpacing: 0.3,
        textTransform: 'uppercase',
    },
    input: {
        width: '100%',
        minHeight: rem(44),
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: rem(courtsRadii.sm),
        backgroundColor: colors.background,
        paddingHorizontal: rem(12),
        paddingVertical: rem(10),
        fontFamily: courtsFonts.medium,
        fontSize: rem(courtsTypography.body),
        color: colors.text,
    },
    inputFocused: {
        borderColor: colors.indigoBorder,
        backgroundColor: colors.surface,
    },
    inputMultiline: {
        minHeight: rem(78),
        textAlignVertical: 'top',
    },
    fieldHint: {
        fontFamily: courtsFonts.medium,
        fontSize: rem(courtsTypography.nano),
        color: colors.textSoft,
        lineHeight: rem(13),
    },
    fieldError: {
        fontFamily: courtsFonts.semibold,
        fontSize: rem(courtsTypography.nano),
        color: colors.danger,
    },
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: rem(10),
        borderRadius: rem(courtsRadii.sm),
        backgroundColor: colors.surfaceLow,
        paddingHorizontal: rem(12),
        paddingVertical: rem(8),
        minHeight: rem(44),
    },
    switchLabel: {
        flex: 1,
        fontFamily: courtsFonts.bold,
        fontSize: rem(courtsTypography.caption),
        color: colors.text,
    },
    dayChips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: rem(6),
    },
    dayChip: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: rem(courtsRadii.pill),
        backgroundColor: colors.background,
        paddingHorizontal: rem(11),
        paddingVertical: rem(7),
        minWidth: rem(42),
        alignItems: 'center',
    },
    dayChipActive: {
        backgroundColor: colors.indigo,
        borderColor: colors.indigo,
    },
    dayChipText: {
        fontFamily: courtsFonts.bold,
        fontSize: rem(courtsTypography.micro),
        color: colors.label,
    },
    dayChipTextActive: {
        color: colors.white,
    },
    optionChips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: rem(6),
    },
    optionChip: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: rem(courtsRadii.pill),
        backgroundColor: colors.background,
        paddingHorizontal: rem(12),
        paddingVertical: rem(8),
        minHeight: rem(38),
        justifyContent: 'center',
    },
    optionChipActive: {
        backgroundColor: colors.indigoSoft,
        borderColor: colors.indigoBorder,
    },
    optionChipText: {
        fontFamily: courtsFonts.bold,
        fontSize: rem(courtsTypography.micro),
        color: colors.textMuted,
    },
    optionChipTextActive: {
        color: colors.indigoDark,
    },
});
