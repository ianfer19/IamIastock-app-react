import React, { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import * as Haptics from 'expo-haptics';
import { rem } from '@/core/utils/responsive';
import { CourtsService } from '../services/courtsService';
import { CourtBlock } from '../types/courts.types';
import { courtErrorMessage, isoDate } from '../utils/formatters';
import { courtsColors, courtsFonts, courtsRadii, courtsTypography } from '../theme/courtsTheme';
import { CourtsModalShell } from './CourtsModalShell';
import { OptionChips, PrimaryButton, TextField } from './CourtsUI';

const TYPES: { value: CourtBlock['type']; label: string }[] = [
    { value: 'MAINTENANCE', label: 'Mantenimiento' },
    { value: 'WEATHER', label: 'Lluvia / clima' },
    { value: 'PRIVATE', label: 'Evento privado' },
    { value: 'OTHER', label: 'Otro' },
];

export const BlockFormModal = ({
    visible,
    courtId,
    courtName,
    onClose,
    onSaved,
}: {
    visible: boolean;
    courtId: string;
    courtName: string;
    onClose: () => void;
    onSaved: () => void;
}) => {
    const [date, setDate] = useState(isoDate());
    const [startTime, setStartTime] = useState('00:00');
    const [endTime, setEndTime] = useState('02:00');
    const [type, setType] = useState<CourtBlock['type']>('MAINTENANCE');
    const [reason, setReason] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!visible) return;
        setDate(isoDate());
        setStartTime('00:00');
        setEndTime('02:00');
        setType('MAINTENANCE');
        setReason('');
        setError(null);
    }, [visible]);

    const handleSave = async () => {
        setError(null);
        if (!courtId) {
            setError('Selecciona una cancha.');
            return;
        }
        if (!date) {
            setError('La fecha del bloqueo es obligatoria.');
            return;
        }
        if (startTime >= endTime) {
            setError('La hora final debe ser mayor a la hora inicial.');
            return;
        }
        try {
            setSaving(true);
            await CourtsService.createBlock(courtId, {
                date,
                start_time: startTime,
                end_time: endTime,
                type,
                reason: reason.trim() || undefined,
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onSaved();
        } catch (saveError) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setError(courtErrorMessage(saveError, 'No se pudo crear el bloqueo.'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <CourtsModalShell
            visible={visible}
            onClose={onClose}
            title={courtName || 'Bloqueo de cancha'}
            eyebrow="Nuevo bloqueo"
            size="sm"
            footer={(
                <>
                    <PrimaryButton label="Cancelar" variant="ghost" onPress={onClose} disabled={saving} compact />
                    <PrimaryButton
                        label={saving ? 'Guardando…' : 'Crear bloqueo'}
                        onPress={() => void handleSave()}
                        disabled={saving}
                        compact
                    />
                </>
            )}
        >
            <TextField label="Fecha" value={date} onChangeText={setDate} placeholder="2026-11-20" hint="Formato YYYY-MM-DD" />
            <TextField label="Hora inicial" value={startTime} onChangeText={setStartTime} placeholder="00:00" />
            <TextField label="Hora final" value={endTime} onChangeText={setEndTime} placeholder="02:00" />
            <OptionChips label="Tipo" options={TYPES} value={type} onChange={setType} />
            <TextField label="Motivo" value={reason} onChangeText={setReason} placeholder="Riego y corte de grama" />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </CourtsModalShell>
    );
};

const styles = StyleSheet.create({
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
