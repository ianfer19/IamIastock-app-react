import React, { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { ImagePlus, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { rem } from '@/core/utils/responsive';
import { CourtsService } from '../services/courtsService';
import { CourtUploadService } from '../services/courtUploadService';
import { Promotion } from '../types/courts.types';
import { courtErrorMessage, roundAmount, timeToMinutes } from '../utils/formatters';
import { courtsColors, courtsFonts, courtsRadii, courtsTypography } from '../theme/courtsTheme';
import { CourtsModalShell } from './CourtsModalShell';
import { DayChips, Field, OptionChips, PrimaryButton, SwitchRow, TextField } from './CourtsUI';

const TYPES: { value: Promotion['type']; label: string }[] = [
    { value: 'PERCENT', label: 'Porcentaje' },
    { value: 'FIXED', label: 'Monto fijo' },
    { value: 'TWO_FOR_ONE', label: '2x1' },
];

const APPLIES: { value: Promotion['applies_to']; label: string }[] = [
    { value: 'COURT_TIME', label: 'Tiempo de cancha' },
    { value: 'CONSUMPTION', label: 'Consumos' },
    { value: 'BOOKING_TOTAL', label: 'Total reserva' },
];

export const PromotionFormModal = ({
    visible,
    promotion,
    onClose,
    onSaved,
}: {
    visible: boolean;
    promotion: Promotion | null;
    onClose: () => void;
    onSaved: () => void;
}) => {
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [type, setType] = useState<Promotion['type']>('PERCENT');
    const [value, setValue] = useState('0');
    const [appliesTo, setAppliesTo] = useState<Promotion['applies_to']>('COURT_TIME');
    const [startTime, setStartTime] = useState('18:00');
    const [endTime, setEndTime] = useState('22:00');
    const [days, setDays] = useState<number[]>([]);
    const [validFrom, setValidFrom] = useState('');
    const [validTo, setValidTo] = useState('');
    const [priority, setPriority] = useState('0');
    const [maxUses, setMaxUses] = useState('');
    const [stackable, setStackable] = useState(false);
    const [includeHolidays, setIncludeHolidays] = useState(true);
    const [active, setActive] = useState(true);
    const [image, setImage] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!visible) return;
        const range = promotion?.time_ranges?.[0];
        setName(promotion?.name || '');
        setCode(promotion?.code || '');
        setType(promotion?.type || 'PERCENT');
        setValue(String(Math.round(Number(promotion?.value || 0))));
        setAppliesTo(promotion?.applies_to || 'COURT_TIME');
        setStartTime(range?.start || '18:00');
        setEndTime(range?.end || '22:00');
        setDays([...(promotion?.days_of_week || [])]);
        setValidFrom(promotion?.valid_from || '');
        setValidTo(promotion?.valid_to || '');
        setPriority(String(promotion?.priority || 0));
        setMaxUses(promotion?.max_uses ? String(promotion.max_uses) : '');
        setStackable(!!promotion?.stackable);
        setIncludeHolidays(promotion?.include_holidays !== false);
        setActive(promotion?.active !== false);
        setImage(promotion?.images?.[0] || null);
        setError(null);
    }, [visible, promotion]);

    const pickImage = async () => {
        try {
            setUploading(true);
            setError(null);
            const url = await CourtUploadService.pickAndUpload();
            if (url) setImage(url);
        } catch (uploadError) {
            setError(uploadError instanceof Error ? uploadError.message : 'No se pudo subir la imagen.');
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async () => {
        setError(null);
        if (name.trim().length < 2) {
            setError('El nombre de la promoción debe tener al menos 2 caracteres.');
            return;
        }
        if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
            setError('La hora final debe ser mayor a la hora inicial.');
            return;
        }
        if (type === 'PERCENT' && (roundAmount(value) <= 0 || roundAmount(value) > 100)) {
            setError('El porcentaje debe estar entre 1 y 100.');
            return;
        }
        if (type === 'FIXED' && roundAmount(value) <= 0) {
            setError('El monto fijo debe ser mayor a cero.');
            return;
        }
        if (maxUses && Number(maxUses) < 1) {
            setError('El tope de usos debe ser mayor o igual a 1.');
            return;
        }

        const payload: Partial<Promotion> = {
            name: name.trim(),
            code: code.trim() ? code.trim().toUpperCase() : null,
            type,
            value: roundAmount(value),
            applies_to: appliesTo,
            days_of_week: days,
            time_ranges: [{ start: startTime, end: endTime }],
            valid_from: validFrom || null,
            valid_to: validTo || null,
            stackable,
            priority: Number(priority) || 0,
            max_uses: maxUses ? Number(maxUses) : null,
            include_holidays: includeHolidays,
            exceptions: promotion?.exceptions || { dates: [], iso_weeks: [], weekdays: [] },
            combo: promotion?.combo || null,
            images: image ? [image] : [],
            active,
        };

        try {
            setSaving(true);
            if (promotion?.promo_id) {
                await CourtsService.updatePromotion(promotion.promo_id, payload);
            } else {
                await CourtsService.createPromotion(payload);
            }
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onSaved();
        } catch (saveError) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setError(courtErrorMessage(saveError, 'No se pudo guardar la promoción.'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <CourtsModalShell
            visible={visible}
            onClose={onClose}
            title={promotion?.name || 'Combos y descuentos'}
            eyebrow={promotion ? 'Editar promoción' : 'Nueva promoción'}
            footer={(
                <>
                    <PrimaryButton label="Cancelar" variant="ghost" onPress={onClose} disabled={saving} compact />
                    <PrimaryButton
                        label={saving ? 'Guardando…' : promotion ? 'Guardar cambios' : 'Crear promoción'}
                        onPress={() => void handleSave()}
                        disabled={saving || uploading}
                        compact
                    />
                </>
            )}
        >
            <TextField label="Nombre" value={name} onChangeText={setName} placeholder="Jueves 2x1" />
            <TextField label="Código (opcional)" value={code} onChangeText={setCode} placeholder="JUEVES2X1" autoCapitalize="characters" />
            <OptionChips label="Tipo" options={TYPES} value={type} onChange={setType} />
            <TextField
                label="Valor"
                value={value}
                onChangeText={setValue}
                keyboardType="number-pad"
                editable={type !== 'TWO_FOR_ONE'}
                hint={type === 'PERCENT' ? 'Porcentaje entre 1 y 100.' : type === 'FIXED' ? 'Monto fijo sin decimales.' : 'El 2x1 no usa valor.'}
            />
            <OptionChips label="Aplica a" options={APPLIES} value={appliesTo} onChange={setAppliesTo} />
            <View style={styles.grid}>
                <TextField label="Desde" value={startTime} onChangeText={setStartTime} placeholder="18:00" containerStyle={styles.half} />
                <TextField label="Hasta" value={endTime} onChangeText={setEndTime} placeholder="22:00" containerStyle={styles.half} />
                <TextField label="Prioridad" value={priority} onChangeText={setPriority} keyboardType="number-pad" containerStyle={styles.half} />
                <TextField label="Tope de usos" value={maxUses} onChangeText={setMaxUses} keyboardType="number-pad" placeholder="Sin límite" containerStyle={styles.half} />
                <TextField label="Vigente desde" value={validFrom} onChangeText={setValidFrom} placeholder="2026-11-13" containerStyle={styles.half} />
                <TextField label="Vigente hasta" value={validTo} onChangeText={setValidTo} placeholder="2026-12-31" containerStyle={styles.half} />
            </View>
            <View>
                <Text style={styles.label}>Días de la semana</Text>
                <DayChips value={days} onChange={setDays} />
                <Text style={styles.hint}>Sin días seleccionados aplica todos los días.</Text>
            </View>
            <Field label="Imagen de la promoción">
                {image ? (
                    <View style={styles.imagePreview}>
                        <Image source={{ uri: image }} style={styles.image} resizeMode="cover" />
                        <Pressable onPress={() => setImage(null)} style={styles.removeImage} hitSlop={6}>
                            <X size={rem(12)} color={courtsColors.white} />
                        </Pressable>
                    </View>
                ) : (
                    <Pressable
                        onPress={() => void pickImage()}
                        style={({ pressed }) => [styles.imageDrop, pressed && styles.pressed]}
                    >
                        <ImagePlus size={rem(22)} color={courtsColors.indigo} strokeWidth={2} />
                        <Text style={styles.imageDropText}>{uploading ? 'Subiendo…' : 'Subir imagen'}</Text>
                        <Text style={styles.imageDropHint}>JPG, PNG, WEBP · máximo 5MB</Text>
                    </Pressable>
                )}
            </Field>
            <SwitchRow label="Acumulable con otras promos" value={stackable} onValueChange={setStackable} />
            <SwitchRow label="Aplicar en festivos" value={includeHolidays} onValueChange={setIncludeHolidays} />
            <SwitchRow label="Promoción activa" value={active} onValueChange={setActive} />
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
    imageDrop: {
        minHeight: rem(100),
        borderRadius: rem(courtsRadii.md),
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: courtsColors.borderStrong,
        backgroundColor: courtsColors.background,
        alignItems: 'center',
        justifyContent: 'center',
        gap: rem(4),
    },
    imageDropText: {
        fontFamily: courtsFonts.bold,
        fontSize: rem(11),
        color: courtsColors.indigo,
    },
    imageDropHint: {
        fontFamily: courtsFonts.medium,
        fontSize: rem(8),
        color: courtsColors.textSoft,
    },
    imagePreview: {
        borderRadius: rem(courtsRadii.md),
        overflow: 'hidden',
        height: rem(170),
    },
    image: {
        width: '100%',
        height: '100%',
    },
    removeImage: {
        position: 'absolute',
        top: rem(8),
        right: rem(8),
        width: rem(26),
        height: rem(26),
        borderRadius: rem(13),
        backgroundColor: 'rgba(15,23,42,0.72)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    pressed: {
        opacity: 0.75,
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
