import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { rem } from '@/core/utils/responsive';
import { CourtsService } from '../services/courtsService';
import { Court, PriceBreakdown } from '../types/courts.types';
import { courtErrorMessage, formatMoneyNoDecimals, isoDate, timeToMinutes } from '../utils/formatters';
import { courtsColors, courtsFonts, courtsRadii, courtsTypography } from '../theme/courtsTheme';
import { CourtsModalShell } from './CourtsModalShell';
import { Field, OptionChips, PrimaryButton, TextField } from './CourtsUI';

interface BookingPreset {
    courtId?: string;
    date?: string;
    startTime?: string;
}

export const BookingFormModal = ({
    visible,
    courts,
    preset,
    onClose,
    onSaved,
}: {
    visible: boolean;
    courts: Court[];
    preset: BookingPreset | null;
    onClose: () => void;
    onSaved: () => void;
}) => {
    const [courtId, setCourtId] = useState('');
    const [date, setDate] = useState(isoDate());
    const [startTime, setStartTime] = useState('18:00');
    const [duration, setDuration] = useState('60');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [notes, setNotes] = useState('');
    const [promoCode, setPromoCode] = useState('');
    const [quote, setQuote] = useState<PriceBreakdown | null>(null);
    const [loadingQuote, setLoadingQuote] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!visible) return;
        setCourtId(preset?.courtId || courts[0]?.court_id || '');
        setDate(preset?.date || isoDate());
        setStartTime(preset?.startTime || '18:00');
        setDuration('60');
        setName('');
        setPhone('');
        setNotes('');
        setPromoCode('');
        setQuote(null);
        setError(null);
    }, [visible, preset, courts]);

    useEffect(() => {
        if (!visible || !courtId || !date || !startTime) return;
        let cancelled = false;
        const timer = setTimeout(async () => {
            try {
                setLoadingQuote(true);
                const result = await CourtsService.quote(
                    courtId,
                    date,
                    startTime,
                    Number(duration) || 60,
                    promoCode || undefined
                );
                if (!cancelled) setQuote(result);
            } catch {
                if (!cancelled) setQuote(null);
            } finally {
                if (!cancelled) setLoadingQuote(false);
            }
        }, 400);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [visible, courtId, date, startTime, duration, promoCode]);

    const courtOptions = useMemo(
        () => courts.map(court => ({
            value: court.court_id,
            label: `${court.name} · ${court.football_type}`,
        })),
        [courts]
    );

    const handleSave = async () => {
        setError(null);
        if (!courtId) {
            setError('Selecciona una cancha.');
            return;
        }
        if (name.trim().length < 2) {
            setError('El nombre del cliente o equipo es obligatorio.');
            return;
        }
        if (phone.trim().length < 7) {
            setError('Ingresa un teléfono válido.');
            return;
        }
        if (timeToMinutes(startTime) + Number(duration) > 24 * 60) {
            setError('La reserva no puede terminar después de las 24:00.');
            return;
        }

        try {
            setSaving(true);
            await CourtsService.createBooking({
                court_id: courtId,
                date,
                start_time: startTime,
                duration_minutes: Number(duration) || 60,
                customer: { name: name.trim(), phone: phone.trim() },
                notes: notes.trim() || undefined,
                promo_code: promoCode.trim() || undefined,
                channel: 'ADMIN',
                idempotency_key: `mobile-${Date.now()}`,
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onSaved();
        } catch (saveError) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setError(courtErrorMessage(saveError, 'No se pudo crear la reserva.'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <CourtsModalShell
            visible={visible}
            onClose={onClose}
            title="Agenda tu cancha"
            eyebrow="Nueva reserva"
            footer={(
                <>
                    <PrimaryButton label="Cancelar" variant="ghost" onPress={onClose} disabled={saving} compact />
                    <PrimaryButton
                        label={saving ? 'Guardando…' : 'Confirmar reserva'}
                        onPress={() => void handleSave()}
                        disabled={saving}
                        compact
                    />
                </>
            )}
        >
            <OptionChips
                label="Cancha"
                options={courtOptions}
                value={courtId}
                onChange={setCourtId}
            />
            <View style={styles.grid}>
                <TextField label="Fecha" value={date} onChangeText={setDate} placeholder="2026-11-13" containerStyle={styles.half} />
                <TextField label="Hora inicio" value={startTime} onChangeText={setStartTime} placeholder="18:00" containerStyle={styles.half} />
            </View>
            <OptionChips
                label="Duración"
                options={[
                    { value: '60', label: '60 min' },
                    { value: '90', label: '90 min' },
                    { value: '120', label: '120 min' },
                ]}
                value={duration}
                onChange={setDuration}
            />
            <TextField label="Nombre del cliente / equipo" value={name} onChangeText={setName} placeholder="Los Cracks FC" />
            <TextField label="Teléfono" value={phone} onChangeText={setPhone} placeholder="+57 300 000 0000" keyboardType="phone-pad" />
            <TextField label="Código promocional (opcional)" value={promoCode} onChangeText={setPromoCode} placeholder="JUEVES2X1" autoCapitalize="characters" />
            <TextField label="Notas" value={notes} onChangeText={setNotes} placeholder="Indicaciones para el equipo" multiline />

            <Field label="Desglose del precio">
                <View style={styles.quoteBox}>
                    {loadingQuote ? (
                        <Text style={styles.quoteMuted}>Calculando…</Text>
                    ) : quote ? (
                        <>
                            {quote.segments.map(segment => (
                                <View key={`${segment.from}-${segment.to}`} style={styles.quoteLine}>
                                    <Text style={styles.quoteLabel}>{segment.from} – {segment.to} · {segment.rate_name}</Text>
                                    <Text style={styles.quoteValue}>{formatMoneyNoDecimals(segment.amount)}</Text>
                                </View>
                            ))}
                            {quote.discounts.map(discount => (
                                <View key={`${discount.promo_id || discount.name}`} style={styles.quoteLine}>
                                    <Text style={styles.quoteDiscount}>{discount.name || 'Descuento'}</Text>
                                    <Text style={styles.quoteDiscount}>-{formatMoneyNoDecimals(discount.amount)}</Text>
                                </View>
                            ))}
                            <View style={[styles.quoteLine, styles.quoteTotal]}>
                                <Text style={styles.quoteTotalLabel}>Total</Text>
                                <Text style={styles.quoteTotalValue}>{formatMoneyNoDecimals(quote.total)}</Text>
                            </View>
                        </>
                    ) : (
                        <Text style={styles.quoteMuted}>Completa cancha, fecha y hora para ver el precio.</Text>
                    )}
                </View>
            </Field>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </CourtsModalShell>
    );
};

const styles = StyleSheet.create({
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: rem(10),
    },
    half: {
        flexBasis: '47%',
        flexGrow: 1,
        minWidth: rem(130),
    },
    quoteBox: {
        borderRadius: rem(courtsRadii.md),
        borderWidth: 1,
        borderColor: courtsColors.border,
        backgroundColor: courtsColors.background,
        padding: rem(12),
        gap: rem(6),
    },
    quoteLine: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: rem(8),
    },
    quoteLabel: {
        flex: 1,
        fontFamily: courtsFonts.medium,
        fontSize: rem(10),
        color: courtsColors.textMuted,
    },
    quoteValue: {
        fontFamily: courtsFonts.bold,
        fontSize: rem(10),
        color: courtsColors.text,
    },
    quoteDiscount: {
        fontFamily: courtsFonts.bold,
        fontSize: rem(10),
        color: courtsColors.greenMid,
    },
    quoteTotal: {
        borderTopWidth: 1,
        borderTopColor: courtsColors.border,
        paddingTop: rem(7),
        marginTop: rem(2),
    },
    quoteTotalLabel: {
        fontFamily: courtsFonts.extraBold,
        fontSize: rem(12),
        color: courtsColors.text,
    },
    quoteTotalValue: {
        fontFamily: courtsFonts.extraBold,
        fontSize: rem(14),
        color: courtsColors.text,
    },
    quoteMuted: {
        fontFamily: courtsFonts.medium,
        fontSize: rem(10),
        color: courtsColors.textSoft,
    },
    errorText: {
        fontFamily: courtsFonts.semibold,
        fontSize: rem(courtsTypography.caption),
        lineHeight: rem(16),
        color: courtsColors.danger,
        backgroundColor: courtsColors.dangerSoft,
        borderWidth: 1,
        borderColor: courtsColors.dangerBorder,
        borderRadius: rem(courtsRadii.sm),
        paddingHorizontal: rem(12),
        paddingVertical: rem(10),
    },
});
