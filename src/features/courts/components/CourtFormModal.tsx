import React, { useEffect, useState } from 'react';
import {
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    View,
} from 'react-native';
import { ImagePlus, Star, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { rem } from '@/core/utils/responsive';
import { CourtsService } from '../services/courtsService';
import { CourtUploadService } from '../services/courtUploadService';
import { Court, CourtAttributeDef } from '../types/courts.types';
import { courtErrorMessage, roundAmount } from '../utils/formatters';
import {
    courtsColors,
    courtsFonts,
    courtsRadii,
    courtsSpacing,
    courtsTypography,
} from '../theme/courtsTheme';
import { CourtsModalShell } from './CourtsModalShell';
import { Field, OptionChips, PrimaryButton, SwitchRow, TextField } from './CourtsUI';

interface HourDraft {
    open: boolean;
    start: string;
    end: string;
}

interface CourtFormModalProps {
    visible: boolean;
    court: Court | null;
    attributes: CourtAttributeDef[];
    onClose: () => void;
    onSaved: () => void;
}

const FOOTBALL_TYPES: { value: Court['football_type']; label: string }[] = [
    { value: 'F5', label: 'F5' },
    { value: 'F6', label: 'F6' },
    { value: 'F7', label: 'F7' },
    { value: 'F8', label: 'F8' },
    { value: 'F11', label: 'F11' },
];

const SURFACES: { value: Court['surface']; label: string }[] = [
    { value: 'SYNTHETIC', label: 'Sintética' },
    { value: 'CONCRETE', label: 'Cemento' },
    { value: 'NATURAL_GRASS', label: 'Grama natural' },
    { value: 'OTHER', label: 'Otra' },
];

const STATUSES: { value: Court['status']; label: string }[] = [
    { value: 'ACTIVE', label: 'Activa' },
    { value: 'MAINTENANCE', label: 'Mantenimiento' },
    { value: 'INACTIVE', label: 'Inactiva' },
];

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const defaultHours = (): HourDraft[] =>
    Array.from({ length: 7 }, () => ({ open: true, start: '06:00', end: '24:00' }));

export const CourtFormModal = ({
    visible,
    court,
    attributes,
    onClose,
    onSaved,
}: CourtFormModalProps) => {
    const [name, setName] = useState('');
    const [footballType, setFootballType] = useState<Court['football_type']>('F5');
    const [surface, setSurface] = useState<Court['surface']>('SYNTHETIC');
    const [capacity, setCapacity] = useState('10');
    const [basePrice, setBasePrice] = useState('0');
    const [minSlot, setMinSlot] = useState('60');
    const [granularity, setGranularity] = useState('60');
    const [status, setStatus] = useState<Court['status']>('ACTIVE');
    const [images, setImages] = useState<string[]>([]);
    const [hours, setHours] = useState<HourDraft[]>(defaultHours);
    const [attributeValues, setAttributeValues] = useState<Record<string, unknown>>({});
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const editing = !!court?.court_id;

    useEffect(() => {
        if (!visible) return;
        if (court) {
            setName(court.name);
            setFootballType(court.football_type);
            setSurface(court.surface);
            setCapacity(String(court.capacity));
            setBasePrice(String(Math.round(Number(court.base_price || 0))));
            setMinSlot(String(court.min_slot_minutes || 60));
            setGranularity(String(court.slot_granularity_minutes || 60));
            setStatus(court.status);
            setImages((court.images || []).filter(Boolean));
            setHours(Array.from({ length: 7 }, (_, index) => {
                const interval = court.operating_hours?.[String(index)]?.[0];
                return {
                    open: !!interval,
                    start: interval?.start || '06:00',
                    end: interval?.end || '24:00',
                };
            }));
            setAttributeValues({ ...(court.attributes || {}) });
        } else {
            setName('');
            setFootballType('F5');
            setSurface('SYNTHETIC');
            setCapacity('10');
            setBasePrice('0');
            setMinSlot('60');
            setGranularity('60');
            setStatus('ACTIVE');
            setImages([]);
            setHours(defaultHours());
            setAttributeValues({});
        }
        setError(null);
    }, [visible, court]);

    const updateHour = (index: number, patch: Partial<HourDraft>) => {
        setHours(current => current.map((hour, i) => i === index ? { ...hour, ...patch } : hour));
    };

    const pickImage = async () => {
        if (images.length >= 5) {
            setError('Puedes subir hasta 5 imágenes por cancha.');
            return;
        }
        try {
            setUploading(true);
            setError(null);
            const url = await CourtUploadService.pickAndUpload();
            if (url) {
                setImages(current => [...current, url]);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
        } catch (uploadError) {
            setError(uploadError instanceof Error ? uploadError.message : 'No se pudo subir la imagen.');
        } finally {
            setUploading(false);
        }
    };

    const makeCover = (index: number) => {
        setImages(current => {
            const copy = [...current];
            const [selected] = copy.splice(index, 1);
            return [selected, ...copy];
        });
    };

    const handleSave = async () => {
        setError(null);
        if (name.trim().length < 2) {
            setError('El nombre de la cancha debe tener al menos 2 caracteres.');
            return;
        }
        const missing = attributes
            .filter(attribute => attribute.required && attribute.active !== false)
            .find(attribute => {
                const value = attributeValues[attribute.key];
                return value === undefined || value === null || value === '';
            });
        if (missing) {
            setError(`La característica "${missing.label}" es obligatoria.`);
            return;
        }
        for (const hour of hours) {
            if (hour.open && hour.start >= hour.end) {
                setError('La hora final debe ser mayor a la hora inicial en todos los días abiertos.');
                return;
            }
        }

        const operatingHours: Record<string, { start: string; end: string }[]> = {};
        hours.forEach((hour, index) => {
            if (hour.open) operatingHours[String(index)] = [{ start: hour.start, end: hour.end }];
        });

        const payload: Partial<Court> = {
            name: name.trim(),
            football_type: footballType,
            surface,
            capacity: Number(capacity) || 1,
            base_price: roundAmount(basePrice),
            min_slot_minutes: Number(minSlot) || 60,
            slot_granularity_minutes: Number(granularity) || 60,
            status,
            operating_hours: operatingHours,
            attributes: attributeValues,
            images,
        };

        try {
            setSaving(true);
            if (court?.court_id) {
                await CourtsService.updateCourt(court.court_id, payload);
            } else {
                await CourtsService.createCourt(payload);
            }
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onSaved();
        } catch (saveError) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setError(courtErrorMessage(saveError, 'No se pudo guardar la cancha.'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <CourtsModalShell
            visible={visible}
            onClose={onClose}
            title={editing ? court?.name || 'Editar cancha' : 'Agregar cancha'}
            eyebrow={editing ? 'Editar cancha' : 'Nueva cancha'}
            size="md"
            footer={(
                <>
                    <PrimaryButton label="Cancelar" variant="ghost" onPress={onClose} disabled={saving} compact />
                    <PrimaryButton
                        label={saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear cancha'}
                        onPress={() => void handleSave()}
                        disabled={saving || uploading}
                        compact
                    />
                </>
            )}
        >
            <View style={styles.formGrid}>
                <TextField
                    label="Nombre"
                    value={name}
                    onChangeText={setName}
                    placeholder="Cancha Central"
                    containerStyle={styles.fullField}
                />
            </View>

            <OptionChips label="Tipo" options={FOOTBALL_TYPES} value={footballType} onChange={setFootballType} />
            <OptionChips label="Superficie" options={SURFACES} value={surface} onChange={setSurface} />

            <View style={styles.formGrid}>
                <TextField label="Capacidad" value={capacity} onChangeText={setCapacity} keyboardType="number-pad" containerStyle={styles.halfField} />
                <TextField label="Precio base / hora" value={basePrice} onChangeText={setBasePrice} keyboardType="number-pad" containerStyle={styles.halfField} />
                <TextField label="Duración mínima" value={minSlot} onChangeText={setMinSlot} keyboardType="number-pad" hint="Minutos" containerStyle={styles.halfField} />
                <TextField
                    label="Granularidad"
                    value={granularity}
                    onChangeText={setGranularity}
                    keyboardType="number-pad"
                    hint={editing ? 'No se puede cambiar después de crear.' : '30 o 60 minutos'}
                    editable={!editing}
                    containerStyle={styles.halfField}
                />
            </View>

            <OptionChips label="Estado" options={STATUSES} value={status} onChange={setStatus} />

            <Field label="Imágenes" hint="La primera imagen es la portada. Hasta 5 imágenes.">
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imageRow}>
                    <Pressable
                        onPress={() => void pickImage()}
                        style={({ pressed }) => [styles.addImage, pressed && styles.pressed]}
                        accessibilityRole="button"
                        accessibilityLabel="Subir imagen"
                    >
                        <ImagePlus size={rem(22)} color={courtsColors.indigo} strokeWidth={2} />
                        <Text style={styles.addImageText}>{uploading ? 'Subiendo…' : 'Subir'}</Text>
                    </Pressable>
                    {images.map((image, index) => (
                        <View key={`${image}-${index}`} style={styles.imageTile}>
                            <Image source={{ uri: image }} style={styles.image} resizeMode="cover" />
                            {index === 0 ? (
                                <View style={styles.coverTag}>
                                    <Text style={styles.coverTagText}>PORTADA</Text>
                                </View>
                            ) : null}
                            <View style={styles.imageActions}>
                                {index > 0 ? (
                                    <Pressable onPress={() => makeCover(index)} style={styles.imageAction} hitSlop={4}>
                                        <Star size={rem(10)} color={courtsColors.white} />
                                    </Pressable>
                                ) : null}
                                <Pressable
                                    onPress={() => setImages(current => current.filter((_, i) => i !== index))}
                                    style={styles.imageAction}
                                    hitSlop={4}
                                >
                                    <X size={rem(10)} color={courtsColors.white} />
                                </Pressable>
                            </View>
                        </View>
                    ))}
                </ScrollView>
            </Field>

            <Field label="Horario por día">
                <View style={styles.hoursList}>
                    {hours.map((hour, index) => (
                        <View key={DAYS[index]} style={styles.hourRow}>
                            <View style={styles.hourDay}>
                                <Text style={styles.hourDayText}>{DAYS[index]}</Text>
                                <Switch
                                    value={hour.open}
                                    onValueChange={open => updateHour(index, { open })}
                                    trackColor={{ false: courtsColors.border, true: courtsColors.indigo }}
                                    thumbColor={courtsColors.white}
                                />
                            </View>
                            <TextInput
                                value={hour.start}
                                onChangeText={start => updateHour(index, { start })}
                                editable={hour.open}
                                placeholder="06:00"
                                placeholderTextColor={courtsColors.textSoft}
                                style={[styles.hourInput, !hour.open && styles.inputDisabled]}
                            />
                            <TextInput
                                value={hour.end}
                                onChangeText={end => updateHour(index, { end })}
                                editable={hour.open}
                                placeholder="24:00"
                                placeholderTextColor={courtsColors.textSoft}
                                style={[styles.hourInput, !hour.open && styles.inputDisabled]}
                            />
                        </View>
                    ))}
                </View>
            </Field>

            <Field label="Características">
                <View style={styles.attributesList}>
                    {!attributes.length ? (
                        <Text style={styles.mutedText}>No hay características configuradas.</Text>
                    ) : attributes.map(attribute => {
                        const value = attributeValues[attribute.key];
                        if (attribute.type === 'BOOLEAN') {
                            return (
                                <SwitchRow
                                    key={attribute.key}
                                    label={`${attribute.label}${attribute.required ? ' *' : ''}`}
                                    value={!!value}
                                    onValueChange={next => setAttributeValues(current => ({ ...current, [attribute.key]: next }))}
                                />
                            );
                        }
                        if (attribute.type === 'SELECT') {
                            return (
                                <OptionChips
                                    key={attribute.key}
                                    label={`${attribute.label}${attribute.required ? ' *' : ''}`}
                                    options={(attribute.options || []).map(option => ({ value: option, label: option }))}
                                    value={String(value || '')}
                                    onChange={next => setAttributeValues(current => ({ ...current, [attribute.key]: next }))}
                                />
                            );
                        }
                        return (
                            <TextField
                                key={attribute.key}
                                label={`${attribute.label}${attribute.required ? ' *' : ''}`}
                                value={value === undefined || value === null ? '' : String(value)}
                                onChangeText={next => setAttributeValues(current => ({
                                    ...current,
                                    [attribute.key]: attribute.type === 'NUMBER' ? Number(next) || 0 : next,
                                }))}
                                keyboardType={attribute.type === 'NUMBER' ? 'number-pad' : 'default'}
                            />
                        );
                    })}
                </View>
            </Field>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </CourtsModalShell>
    );
};

const styles = StyleSheet.create({
    formGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: rem(10),
    },
    fullField: {
        flexBasis: '100%',
        flexGrow: 1,
    },
    halfField: {
        flexBasis: '47%',
        flexGrow: 1,
        minWidth: rem(130),
    },
    imageRow: {
        flexDirection: 'row',
        gap: rem(8),
        paddingVertical: rem(2),
    },
    addImage: {
        width: rem(92),
        height: rem(70),
        borderRadius: rem(courtsRadii.sm),
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: courtsColors.borderStrong,
        backgroundColor: courtsColors.background,
        alignItems: 'center',
        justifyContent: 'center',
        gap: rem(4),
    },
    addImageText: {
        fontFamily: courtsFonts.bold,
        fontSize: rem(9),
        color: courtsColors.indigo,
    },
    imageTile: {
        width: rem(92),
        height: rem(70),
        borderRadius: rem(courtsRadii.sm),
        overflow: 'hidden',
        backgroundColor: courtsColors.border,
    },
    image: {
        width: '100%',
        height: '100%',
    },
    coverTag: {
        position: 'absolute',
        left: rem(4),
        bottom: rem(4),
        borderRadius: rem(courtsRadii.pill),
        backgroundColor: 'rgba(20,83,45,0.9)',
        paddingHorizontal: rem(5),
        paddingVertical: rem(2),
    },
    coverTagText: {
        fontFamily: courtsFonts.extraBold,
        fontSize: rem(7),
        color: '#D9F99D',
    },
    imageActions: {
        position: 'absolute',
        top: rem(4),
        right: rem(4),
        flexDirection: 'row',
        gap: rem(3),
    },
    imageAction: {
        width: rem(20),
        height: rem(20),
        borderRadius: rem(10),
        backgroundColor: 'rgba(15,23,42,0.72)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    hoursList: {
        gap: rem(6),
    },
    hourRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: rem(6),
    },
    hourDay: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        minWidth: rem(76),
    },
    hourDayText: {
        fontFamily: courtsFonts.bold,
        fontSize: rem(10),
        color: courtsColors.textMuted,
    },
    hourInput: {
        width: rem(64),
        minHeight: rem(38),
        borderWidth: 1,
        borderColor: courtsColors.border,
        borderRadius: rem(courtsRadii.xs),
        backgroundColor: courtsColors.background,
        paddingHorizontal: rem(8),
        paddingVertical: rem(6),
        textAlign: 'center',
        fontFamily: courtsFonts.medium,
        fontSize: rem(11),
        color: courtsColors.text,
    },
    inputDisabled: {
        opacity: 0.45,
    },
    attributesList: {
        gap: rem(8),
    },
    mutedText: {
        fontFamily: courtsFonts.medium,
        fontSize: rem(courtsTypography.caption),
        color: courtsColors.textMuted,
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
    pressed: {
        opacity: 0.75,
    },
});
