import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { X } from 'lucide-react-native';
import { rem } from '@/core/utils/responsive';
import { CourtsService } from '../services/courtsService';
import { Promotion } from '../types/courts.types';
import { courtErrorMessage, dayLabel } from '../utils/formatters';
import { courtsColors, courtsFonts, courtsRadii, courtsTypography } from '../theme/courtsTheme';
import { CourtsModalShell } from './CourtsModalShell';
import { OptionChips, PrimaryButton, TextField } from './CourtsUI';

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((label, index) => ({
    value: String(index),
    label,
}));

export const PromotionExceptionsModal = ({
    visible,
    promotion,
    onClose,
    onChanged,
}: {
    visible: boolean;
    promotion: Promotion | null;
    onClose: () => void;
    onChanged: () => void;
}) => {
    const [current, setCurrent] = useState<Promotion | null>(promotion);
    const [date, setDate] = useState('');
    const [week, setWeek] = useState('');
    const [weekday, setWeekday] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!visible) return;
        setCurrent(promotion);
        setDate('');
        setWeek('');
        setWeekday('');
        setError(null);
    }, [visible, promotion]);

    const addException = async (kind: 'date' | 'week' | 'weekday') => {
        if (!current || saving) return;
        const payload = kind === 'date' && date
            ? { dates: [date] }
            : kind === 'week' && week.trim()
                ? { iso_weeks: [week.trim().toUpperCase()] }
                : kind === 'weekday' && weekday !== ''
                    ? { weekdays: [Number(weekday)] }
                    : null;
        if (!payload) return;

        try {
            setSaving(true);
            const updated = await CourtsService.addPromotionException(current.promo_id, payload);
            setCurrent(updated);
            setDate('');
            setWeek('');
            setWeekday('');
            onChanged();
        } catch (addError) {
            setError(courtErrorMessage(addError, 'No se pudo agregar la excepción.'));
        } finally {
            setSaving(false);
        }
    };

    const removeException = async (kind: 'date' | 'week' | 'weekday', value: string | number) => {
        if (!current || saving) return;
        const payload = kind === 'date'
            ? { dates: [String(value)] }
            : kind === 'week'
                ? { iso_weeks: [String(value)] }
                : { weekdays: [Number(value)] };
        try {
            setSaving(true);
            const updated = await CourtsService.removePromotionException(current.promo_id, payload);
            setCurrent(updated);
            onChanged();
        } catch (removeError) {
            setError(courtErrorMessage(removeError, 'No se pudo eliminar la excepción.'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <CourtsModalShell
            visible={visible}
            onClose={onClose}
            title={current?.name || 'Excepciones'}
            eyebrow="Excepciones"
            footer={<PrimaryButton label="Listo" onPress={onClose} compact />}
        >
            <Text style={styles.intro}>
                Suspende la promoción un día exacto, una semana ISO (2026-W12) o un día de la semana.
            </Text>
            <TextField label="Fecha exacta" value={date} onChangeText={setDate} placeholder="2026-11-20" />
            <PrimaryButton label="Pausar fecha" variant="ghost" compact onPress={() => void addException('date')} />
            <TextField label="Semana ISO" value={week} onChangeText={setWeek} placeholder="2026-W12" autoCapitalize="characters" />
            <PrimaryButton label="Pausar semana" variant="ghost" compact onPress={() => void addException('week')} />
            <OptionChips label="Día de la semana" options={WEEKDAYS} value={weekday} onChange={setWeekday} />
            <PrimaryButton label="Pausar día" variant="ghost" compact onPress={() => void addException('weekday')} />

            <View>
                <Text style={styles.label}>EXCEPCIONES ACTIVAS</Text>
                <View style={styles.chips}>
                    {(current?.exceptions?.dates || []).map(item => (
                        <Chip key={`date-${item}`} label={item} onRemove={() => void removeException('date', item)} />
                    ))}
                    {(current?.exceptions?.iso_weeks || []).map(item => (
                        <Chip key={`week-${item}`} label={item} onRemove={() => void removeException('week', item)} />
                    ))}
                    {(current?.exceptions?.weekdays || []).map(item => (
                        <Chip key={`day-${item}`} label={dayLabel(item)} onRemove={() => void removeException('weekday', item)} />
                    ))}
                    {!current?.exceptions?.dates?.length && !current?.exceptions?.iso_weeks?.length && !current?.exceptions?.weekdays?.length ? (
                        <Text style={styles.empty}>No hay excepciones configuradas.</Text>
                    ) : null}
                </View>
            </View>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </CourtsModalShell>
    );
};

const Chip = ({ label, onRemove }: { label: string; onRemove: () => void }) => (
    <View style={styles.chip}>
        <Text style={styles.chipText}>{label}</Text>
        <Pressable onPress={onRemove} hitSlop={6} accessibilityRole="button" accessibilityLabel={`Eliminar ${label}`}>
            <X size={rem(10)} color={courtsColors.amberText} />
        </Pressable>
    </View>
);

const styles = StyleSheet.create({
    intro: {
        fontFamily: courtsFonts.medium,
        fontSize: rem(courtsTypography.caption),
        lineHeight: rem(16),
        color: courtsColors.textMuted,
    },
    label: {
        fontFamily: courtsFonts.extraBold,
        fontSize: rem(courtsTypography.nano),
        letterSpacing: 0.8,
        color: courtsColors.textMuted,
        marginBottom: rem(6),
    },
    chips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: rem(6),
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: rem(4),
        borderRadius: rem(courtsRadii.pill),
        backgroundColor: courtsColors.amber,
        paddingHorizontal: rem(9),
        paddingVertical: rem(5),
    },
    chipText: {
        fontFamily: courtsFonts.bold,
        fontSize: rem(10),
        color: courtsColors.amberText,
    },
    empty: {
        fontFamily: courtsFonts.medium,
        fontSize: rem(courtsTypography.caption),
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
