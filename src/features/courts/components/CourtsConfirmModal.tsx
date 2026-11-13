import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react-native';
import { rem } from '@/core/utils/responsive';
import { CourtsModalShell } from './CourtsModalShell';
import { PrimaryButton } from './CourtsUI';
import { courtsColors, courtsFonts, courtsRadii, courtsTypography } from '../theme/courtsTheme';

interface CourtsConfirmModalProps {
    visible: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info';
    loading?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export const CourtsConfirmModal = ({
    visible,
    title,
    message,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    type = 'warning',
    loading = false,
    onConfirm,
    onCancel,
}: CourtsConfirmModalProps) => {
    const Icon = type === 'danger' ? AlertTriangle : type === 'info' ? CheckCircle2 : Info;
    const tone = type === 'danger'
        ? { bg: courtsColors.dangerSoft, color: courtsColors.dangerDark }
        : type === 'info'
            ? { bg: courtsColors.indigoSoft, color: courtsColors.indigoDark }
            : { bg: courtsColors.amber, color: courtsColors.amberText };

    return (
        <CourtsModalShell
            visible={visible}
            onClose={loading ? () => undefined : onCancel}
            title={title}
            eyebrow="Confirmación"
            size="sm"
            footer={(
                <>
                    <PrimaryButton label={cancelText} variant="ghost" onPress={onCancel} disabled={loading} compact />
                    <PrimaryButton
                        label={loading ? 'Procesando…' : confirmText}
                        variant={type === 'danger' ? 'danger' : 'primary'}
                        onPress={onConfirm}
                        disabled={loading}
                        compact
                    />
                </>
            )}
        >
            <View style={styles.content}>
                <View style={[styles.iconCircle, { backgroundColor: tone.bg }]}>
                    <Icon size={rem(24)} color={tone.color} strokeWidth={2.2} />
                </View>
                <Text style={styles.message}>{message}</Text>
            </View>
        </CourtsModalShell>
    );
};

const styles = StyleSheet.create({
    content: {
        alignItems: 'center',
        gap: rem(12),
        paddingVertical: rem(8),
    },
    iconCircle: {
        width: rem(54),
        height: rem(54),
        borderRadius: rem(courtsRadii.pill),
        alignItems: 'center',
        justifyContent: 'center',
    },
    message: {
        fontFamily: courtsFonts.medium,
        fontSize: rem(courtsTypography.body),
        lineHeight: rem(19),
        color: courtsColors.textMuted,
        textAlign: 'center',
    },
});
