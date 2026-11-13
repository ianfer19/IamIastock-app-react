import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { rem } from '@/core/utils/responsive';
import { CourtsService } from '../services/courtsService';
import { Rate } from '../types/courts.types';
import { courtErrorMessage, roundAmount, timeToMinutes } from '../utils/formatters';
import { courtsColors, courtsFonts, courtsRadii, courtsTypography } from '../theme/courtsTheme';
import { CourtsModalShell } from './CourtsModalShell';
import { DayChips, OptionChips, PrimaryButton, SwitchRow, TextField } from './CourtsUI';

const SCOPES: { value: Rate['scope']; label: string }[] = [
    { value: 'COURT', label: 'Solo esta cancha' },
    { value: 'STORE', label: 'Toda la tienda' },
];

export const RateFormModal = ({
    visible,
    rate,
    courtId,
    onClose,
    onSaved,
}: {
    visible: boolean;
    rate: Rate | null;
    courtId: string;
    onClose: () => void;
    onSaved: () => void;
}) => {
    const [name, setName] = useState('');
    const [scope, setScope] = useState<Rate['scope']>('COURT');
    const [price, setPrice] = useState('0');
    const [startTime, setStartTime] = useState('18:00');
    const [endTime, setEndTime] = useState('22:00');
    const [priority, setPriority] = useState('0');
    const [days, setDays] = useState<number[]>([]);
    const [validFrom, setValidFrom] = useState('');
    const [validTo, setValidTo] = useState('');
    const [includeHolidays, setIncludeHolidays] = useState(true);
    const [active, setActive] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!visible) return;
        setName(rate?.name || '');
        setScope(rate?.scope || 'COURT');
        setPrice(String(Math.round(Number(rate?.price_per_hour || 0))));
        setStartTime(rate?.start_time || '18:00');
        setEndTime(rate?.end_time || '22:00');
        setPriority(String(rate?.priority || 0));
        setDays([...(rate?.days_of_week || [])]);
        setValidFrom(rate?.valid_from || '');
        setValidTo(rate?.valid_to || '');
        setIncludeHolidays(rate?.include_holidays !== false);
        setActive(rate?.active !== false);
        setError(null);
    }, [visible, rate]);

    const handleSave = async () => {
        setError(null);
        if (name.trim().length < 2) {
            setError('El nombre de la tarifa debe tener al menos 2 caracteres.');
            return;
        }
        if (!courtId && scope === 'COURT') {
            setError('Selecciona una cancha para la tarifa.');
            return;
        }
        if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
            setError('La hora final debe ser mayor a la hora inicial.');
            return;
        }
        if (roundAmount(price) <= 0) {
            setError('El precio por hora debe ser mayor a cero.');
            return;
        }

        const payload: Partial<Rate> = {
            name: name.trim(),
            scope,
            days_of_week: days,
            start_time: startTime,
            end_time: endTime,
            price_per_hour: roundAmount(price),
            priority: Number(priority) || 0,
            valid_from: validFrom || null,
            valid_to: validTo || null,
            include_holidays: includeHolidays,
            active,
        };

        try {
            setSaving(true);
            if (rate?.rate_id) {
                await CourtsService.updateRate(rate.rate_id, courtId, payload);
            } else {
                await CourtsService.createRate(courtId, payload);
            }
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onSaved();
        } catch (saveError) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setError(courtErrorMessage(saveError, 'No se pudo guardar la tarifa.'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <CourtsModalShell
            visible={visible}
            onClose={onClose}
            title={rate?.name || 'Franja de precio'}
            eyebrow={rate ? 'Editar tarifa' : 'Nueva tarifa'}
            footer={(
                <>
                    <PrimaryButton label="Cancelar" variant="ghost" onPress={onClose} disabled={saving} compact />
                    <PrimaryButton
                        label={saving ? 'Guardando…' : rate ? 'Guardar cambios' : 'Crear tarifa'}
                        onPress={() => void handleSave()}
                        disabled={saving}
                        compact
                    />
                </>
            )}
        >
            <TextField label="Nombre" value={name} onChangeText={setName} placeholder="Horario pico" />
            <OptionChips label="Alcance" options={SCOPES} value={scope} onChange={setScope} />
            <View style={styles.grid}>
                <TextField label="Precio por hora" value={price} onChangeText={setPrice} keyboardType="number-pad" containerStyle={styles.half} />
                <TextField label="Prioridad" value={priority} onChangeText={setPriority} keyboardType="number-pad" containerStyle={styles.half} />
                <TextField label="Desde" value={startTime} onChangeText={setStartTime} placeholder="18:00" containerStyle={styles.half} />
                <TextField label="Hasta" value={endTime} onChangeText={setEndTime} placeholder="22:00" containerStyle={styles.half} />
            </View>
            <View>
                <Text style={styles.label}>Días de la semana</Text>
                <DayChips value={days} onChange={setDays} />
                <Text style={styles.hint}>Sin días seleccionados aplica todos los días.</Text>
            </View>
            <View style={styles.grid}>
                <TextField label="Vigente desde" value={validFrom} onChangeText={setValidFrom} placeholder="2026-11-13" containerStyle={styles.half} />
                <TextField label="Vigente hasta" value={validTo} onChangeText={setValidTo} placeholder="2026-12-31" containerStyle={styles.half} />
            </View>
            <SwitchRow label="Aplicar en festivos" value={includeHolidays} onValueChange={setIncludeHolidays} />
            <SwitchRow label="Tarifa activa" value={active} onValueChange={setActive} />
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
    label: {
        fontFamily: courtsFonts.extraBold,
        fontSize: rem(courtsTypography.micro),
        letterSpacing: 0.3,
        color: '#4B4B63',
        textTransform: 'uppercase',
        marginBottom: rem(6),
    },
    hint: {
        marginTop: rem(5),
        fontFamily: courtsFonts.medium,
        fontSize: rem(courtsTypography.nano),
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
