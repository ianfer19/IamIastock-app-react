import React from 'react';
import { Image, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Pause, Pencil, RotateCcw } from 'lucide-react-native';
import { rem } from '@/core/utils/responsive';
import { Court } from '../types/courts.types';
import { formatMoneyNoDecimals, statusLabel, surfaceLabel } from '../utils/formatters';
import { courtStatusTone, courtsColors, courtsFonts, courtsRadii, courtsShadow, courtsTypography } from '../theme/courtsTheme';
import { StatusPill } from './CourtsUI';

export const CourtCard = ({
    court,
    onEdit,
    onDeactivate,
    onReactivate,
    style,
}: {
    court: Court;
    onEdit: () => void;
    onDeactivate: () => void;
    onReactivate: () => void;
    style?: ViewStyle;
}) => {
    const cover = court.images?.find(Boolean);
    const tone = courtStatusTone(court.status);

    return (
        <View style={[styles.card, tone === 'inactive' && styles.cardOff, style]}>
            <View style={styles.media}>
                {cover ? (
                    <Image source={{ uri: cover }} style={styles.image} resizeMode="cover" />
                ) : (
                    <View style={styles.placeholder}>
                        {Array.from({ length: 8 }).map((_, index) => (
                            <View
                                key={index}
                                style={[
                                    styles.placeholderStripe,
                                    { backgroundColor: index % 2 === 0 ? courtsColors.green : courtsColors.greenMid },
                                ]}
                            />
                        ))}
                    </View>
                )}
                <View style={styles.statusOverlay}>
                    <StatusPill label={statusLabel(court.status)} tone={tone} />
                </View>
            </View>

            <View style={styles.body}>
                <View style={styles.titleRow}>
                    <View style={styles.titleWrap}>
                        <Text style={styles.name} numberOfLines={1}>{court.name}</Text>
                        <Text style={styles.meta} numberOfLines={1}>
                            {court.football_type} · {surfaceLabel(court.surface)} · {court.capacity} jugadores
                        </Text>
                    </View>
                    <View style={styles.priceWrap}>
                        <Text style={styles.price}>{formatMoneyNoDecimals(court.base_price)}</Text>
                        <Text style={styles.priceLabel}>/ hora</Text>
                    </View>
                </View>
            </View>

            <View style={styles.actions}>
                <Pressable
                    onPress={onEdit}
                    style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
                    accessibilityRole="button"
                >
                    <Pencil size={rem(12)} color={courtsColors.text} strokeWidth={2.2} />
                    <Text style={styles.actionText}>Editar</Text>
                </Pressable>

                {tone === 'inactive' ? (
                    <Pressable
                        onPress={onReactivate}
                        style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
                        accessibilityRole="button"
                    >
                        <RotateCcw size={rem(12)} color={courtsColors.greenMid} strokeWidth={2.2} />
                        <Text style={[styles.actionText, styles.reactivateText]}>Reactivar</Text>
                    </Pressable>
                ) : (
                    <Pressable
                        onPress={onDeactivate}
                        style={({ pressed }) => [styles.actionButton, styles.dangerButton, pressed && styles.pressed]}
                        accessibilityRole="button"
                    >
                        <Pause size={rem(12)} color={courtsColors.dangerDark} strokeWidth={2.2} />
                        <Text style={[styles.actionText, styles.dangerText]}>Desactivar</Text>
                    </Pressable>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: courtsColors.surfaceLow,
        borderRadius: rem(courtsRadii.xxl),
        borderWidth: 1,
        borderColor: courtsColors.border,
        overflow: 'hidden',
        ...courtsShadow.card,
    },
    cardOff: {
        opacity: 0.72,
    },
    media: {
        aspectRatio: 16 / 9,
        backgroundColor: '#E9E4DA',
        overflow: 'hidden',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    placeholder: {
        flex: 1,
        flexDirection: 'row',
    },
    placeholderStripe: {
        flex: 1,
    },
    statusOverlay: {
        position: 'absolute',
        top: rem(10),
        left: rem(10),
    },
    body: {
        paddingHorizontal: rem(14),
        paddingTop: rem(13),
        paddingBottom: rem(8),
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: rem(8),
    },
    titleWrap: {
        flex: 1,
        minWidth: 0,
    },
    name: {
        fontFamily: courtsFonts.extraBold,
        fontSize: rem(courtsTypography.cardTitle),
        color: courtsColors.text,
    },
    meta: {
        marginTop: rem(2),
        fontFamily: courtsFonts.semibold,
        fontSize: rem(courtsTypography.nano),
        color: courtsColors.textMuted,
    },
    priceWrap: {
        alignItems: 'flex-end',
    },
    price: {
        fontFamily: courtsFonts.extraBold,
        fontSize: rem(15),
        color: courtsColors.green,
    },
    priceLabel: {
        fontFamily: courtsFonts.bold,
        fontSize: rem(8),
        color: courtsColors.textSoft,
    },
    actions: {
        flexDirection: 'row',
        gap: rem(6),
        paddingHorizontal: rem(12),
        paddingBottom: rem(12),
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: rem(5),
        borderWidth: 1,
        borderColor: courtsColors.border,
        borderRadius: rem(courtsRadii.pill),
        backgroundColor: courtsColors.surface,
        paddingVertical: rem(8),
        minHeight: rem(40),
    },
    dangerButton: {
        borderColor: courtsColors.dangerBorder,
        backgroundColor: courtsColors.dangerSoft,
    },
    actionText: {
        fontFamily: courtsFonts.bold,
        fontSize: rem(10),
        color: courtsColors.text,
    },
    dangerText: {
        color: courtsColors.dangerDark,
    },
    reactivateText: {
        color: courtsColors.greenMid,
    },
    pressed: {
        opacity: 0.75,
    },
});
