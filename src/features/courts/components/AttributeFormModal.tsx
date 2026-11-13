import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import * as Haptics from 'expo-haptics';
import { rem } from '@/core/utils/responsive';
import { CourtsService } from '../services/courtsService';
import { CourtAttributeDef } from '../types/courts.types';
import {
    courtErrorMessage,
    isValidAttributeKey,
    sanitizeAttributeKey,
    slugifyAttributeKey,
} from '../utils/formatters';
import {
    CourtsPalette,
    courtsFonts,
    courtsRadii,
    courtsTypography,
    useCourtsColors,
} from '../theme/courtsTheme';
import { CourtsModalShell } from './CourtsModalShell';
import { OptionChips, PrimaryButton, SwitchRow, TextField } from './CourtsUI';

const TYPES: { value: CourtAttributeDef['type']; label: string }[] = [
    { value: 'BOOLEAN', label: 'Sí / No' },
    { value: 'TEXT', label: 'Texto' },
    { value: 'NUMBER', label: 'Número' },
    { value: 'SELECT', label: 'Lista' },
];

export const AttributeFormModal = ({
    visible,
    attribute,
    onClose,
    onSaved,
}: {
    visible: boolean;
    attribute: CourtAttributeDef | null;
    onClose: () => void;
    onSaved: () => void;
}) => {
    const colors = useCourtsColors();
    const styles = getStyles(colors);
    const [label, setLabel] = useState('');
    const [key, setKey] = useState('');
    const [type, setType] = useState<CourtAttributeDef['type']>('BOOLEAN');
    const [required, setRequired] = useState(false);
    const [options, setOptions] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const keyTouched = useRef(false);

    useEffect(() => {
        if (!visible) return;
        keyTouched.current = !!attribute;
        setLabel(attribute?.label || '');
        setKey(attribute?.key || '');
        setType(attribute?.type || 'BOOLEAN');
        setRequired(!!attribute?.required);
        setOptions((attribute?.options || []).join(', '));
        setError(null);
    }, [visible, attribute]);

    const updateLabel = (value: string) => {
        setLabel(value);
        if (!keyTouched.current) setKey(slugifyAttributeKey(value));
    };

    const handleSave = async () => {
        setError(null);
        if (label.trim().length < 2) {
            setError('El nombre del atributo debe tener al menos 2 caracteres.');
            return;
        }
        if (!isValidAttributeKey(key)) {
            setError('La clave debe tener entre 2 y 40 caracteres y solo permite minúsculas, números y guion bajo.');
            return;
        }
        const parsedOptions = options.split(',').map(option => option.trim()).filter(Boolean);
        if (type === 'SELECT' && !parsedOptions.length) {
            setError('Agrega al menos una opción para la lista.');
            return;
        }

        try {
            setSaving(true);
            await CourtsService.upsertAttribute({
                key,
                label: label.trim(),
                type,
                required,
                options: parsedOptions,
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onSaved();
        } catch (saveError) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setError(courtErrorMessage(saveError, 'No se pudo guardar el atributo.'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <CourtsModalShell
            visible={visible}
            onClose={onClose}
            title={attribute ? attribute.label : 'Característica de cancha'}
            eyebrow={attribute ? 'Editar atributo' : 'Nuevo atributo'}
            size="sm"
            footer={(
                <>
                    <PrimaryButton label="Cancelar" variant="ghost" onPress={onClose} disabled={saving} compact />
                    <PrimaryButton
                        label={saving ? 'Guardando…' : attribute ? 'Guardar cambios' : 'Crear atributo'}
                        onPress={() => void handleSave()}
                        disabled={saving}
                        compact
                    />
                </>
            )}
        >
            <TextField label="Nombre visible" value={label} onChangeText={updateLabel} placeholder="Iluminación" />
            <TextField
                label="Clave interna"
                value={key}
                onChangeText={value => {
                    keyTouched.current = true;
                    setKey(sanitizeAttributeKey(value));
                }}
                editable={!attribute}
                hint="Se genera automáticamente. Solo minúsculas, números y guion bajo."
                placeholder="iluminacion"
            />
            <OptionChips label="Tipo" options={TYPES} value={type} onChange={setType} />
            <TextField
                label="Opciones de la lista"
                value={options}
                onChangeText={setOptions}
                editable={type === 'SELECT'}
                placeholder="A, B, C"
                hint="Separa las opciones con comas."
            />
            <SwitchRow
                label="Obligatorio al crear o editar una cancha"
                value={required}
                onValueChange={setRequired}
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </CourtsModalShell>
    );
};

const getStyles = (colors: CourtsPalette) => StyleSheet.create({
    errorText: {
        fontFamily: courtsFonts.semibold,
        fontSize: rem(courtsTypography.caption),
        lineHeight: rem(16),
        color: colors.danger,
        backgroundColor: colors.dangerSoft,
        borderWidth: 1,
        borderColor: colors.dangerBorder,
        borderRadius: rem(courtsRadii.sm),
        paddingHorizontal: rem(12),
        paddingVertical: rem(10),
    },
});
