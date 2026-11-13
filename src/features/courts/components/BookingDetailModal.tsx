import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { rem } from '@/core/utils/responsive';
import { CourtsService } from '../services/courtsService';
import { CourtBooking } from '../types/courts.types';
import { courtErrorMessage, formatDateLong, formatMoneyNoDecimals } from '../utils/formatters';
import { CourtsPalette, courtsFonts, courtsRadii, courtsTypography, useCourtsColors } from '../theme/courtsTheme';
import { CourtsModalShell } from './CourtsModalShell';
import { CourtsConfirmModal } from './CourtsConfirmModal';
import { PrimaryButton, StatusPill } from './CourtsUI';

type ActionKind = 'cancel' | 'noShow' | 'close' | null;

export const BookingDetailModal = ({
    visible,
    booking,
    onClose,
    onChanged,
}: {
    visible: boolean;
    booking: CourtBooking | null;
    onClose: () => void;
    onChanged: () => void;
}) => {
    const colors = useCourtsColors();
    const styles = getStyles(colors);
    const [action, setAction] = useState<ActionKind>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (visible) {
            setAction(null);
            setError(null);
        }
    }, [visible, booking]);

    if (!booking) {
        return null;
    }

    const runAction = async (kind: ActionKind) => {
        if (!kind) return;
        try {
            setLoading(true);
            setError(null);
            if (kind === 'cancel') await CourtsService.cancelBooking(booking.booking_id, 'Cancelada desde la app');
            if (kind === 'noShow') await CourtsService.noShow(booking.booking_id);
            if (kind === 'close') await CourtsService.closeBooking(booking.booking_id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setAction(null);
            onChanged();
            onClose();
        } catch (actionError) {
            setError(courtErrorMessage(actionError, 'No se pudo actualizar la reserva.'));
        } finally {
            setLoading(false);
        }
    };

    const confirmCopy: Record<Exclude<ActionKind, null>, { title: string; message: string; confirm: string }> = {
        cancel: {
            title: 'Cancelar reserva',
            message: 'La reserva quedará cancelada y el horario se liberará.',
            confirm: 'Sí, cancelar',
        },
        noShow: {
            title: 'Marcar no-show',
            message: 'El cliente no llegó. La reserva se marcará como no-show.',
            confirm: 'Marcar no-show',
        },
        close: {
            title: 'Cerrar cuenta',
            message: 'La reserva se marcará como completada. ¿Deseas continuar?',
            confirm: 'Cerrar',
        },
    };

    const canCheckIn = booking.status === 'CONFIRMED' || booking.status === 'PENDING_PAYMENT';
    const canClose = booking.status === 'CHECKED_IN';
    const canCancel = booking.status !== 'CANCELLED' && booking.status !== 'COMPLETED';
    const canNoShow = canCheckIn;

    return (
        <>
            <CourtsModalShell
                visible={visible}
                onClose={onClose}
                title={booking.customer_name}
                eyebrow="Detalle de reserva"
                footer={<PrimaryButton label="Cerrar" variant="ghost" onPress={onClose} compact />}
            >
                <View style={styles.summary}>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>CANCHA</Text>
                        <Text style={styles.summaryValue}>{booking.court_name || '—'}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>FECHA</Text>
                        <Text style={styles.summaryValue}>{formatDateLong(booking.date)}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>HORARIO</Text>
                        <Text style={styles.summaryValue}>{booking.start_time} – {booking.end_time}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>TELÉFONO</Text>
                        <Text style={styles.summaryValue}>{booking.customer_phone}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>ESTADO</Text>
                        <StatusPill label={booking.status} tone={booking.status === 'CANCELLED' || booking.status === 'NO_SHOW' ? 'inactive' : 'active'} />
                    </View>
                </View>

                <View style={styles.paymentGrid}>
                    <PaymentBox label="TOTAL" value={formatMoneyNoDecimals(booking.total)} />
                    <PaymentBox label="PAGADO" value={formatMoneyNoDecimals(booking.amount_paid)} />
                    <PaymentBox label="SALDO" value={formatMoneyNoDecimals(booking.balance_due)} alert={booking.balance_due > 0} />
                </View>

                <View style={styles.actions}>
                    {canCheckIn ? (
                        <PrimaryButton
                            label="Check-in"
                            compact
                            onPress={async () => {
                                try {
                                    setLoading(true);
                                    await CourtsService.checkIn(booking.booking_id);
                                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                    onChanged();
                                    onClose();
                                } catch (checkInError) {
                                    setError(courtErrorMessage(checkInError, 'No se pudo hacer check-in.'));
                                } finally {
                                    setLoading(false);
                                }
                            }}
                            disabled={loading}
                        />
                    ) : null}
                    {canClose ? (
                        <PrimaryButton label="Cerrar cuenta" variant="ghost" compact onPress={() => setAction('close')} disabled={loading} />
                    ) : null}
                    {canNoShow ? (
                        <PrimaryButton label="No-show" variant="ghost" compact onPress={() => setAction('noShow')} disabled={loading} />
                    ) : null}
                    {canCancel ? (
                        <PrimaryButton label="Cancelar reserva" variant="danger" compact onPress={() => setAction('cancel')} disabled={loading} />
                    ) : null}
                </View>

                <Text style={styles.note}>
                    Los pagos, implementos y sorteo estarán disponibles en la siguiente fase móvil.
                </Text>
                {error ? <Text style={styles.errorText}>{error}</Text> : null}
            </CourtsModalShell>

            <CourtsConfirmModal
                visible={!!action}
                title={action ? confirmCopy[action].title : ''}
                message={action ? confirmCopy[action].message : ''}
                confirmText={action ? confirmCopy[action].confirm : 'Confirmar'}
                type={action === 'noShow' ? 'warning' : 'danger'}
                loading={loading}
                onConfirm={() => void runAction(action)}
                onCancel={() => setAction(null)}
            />
        </>
    );
};

const PaymentBox = ({ label, value, alert }: { label: string; value: string; alert?: boolean }) => {
    const colors = useCourtsColors();
    const styles = getStyles(colors);
    return (
        <View style={styles.paymentBox}>
            <Text style={styles.paymentLabel}>{label}</Text>
            <Text style={[styles.paymentValue, alert && styles.paymentAlert]}>{value}</Text>
        </View>
    );
};

const getStyles = (colors: CourtsPalette) => StyleSheet.create({
    summary: {
        borderRadius: rem(courtsRadii.md),
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
        padding: rem(12),
        gap: rem(8),
    },
    summaryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: rem(8),
    },
    summaryLabel: {
        fontFamily: courtsFonts.extraBold,
        fontSize: rem(8),
        letterSpacing: 0.7,
        color: colors.textSoft,
    },
    summaryValue: {
        flexShrink: 1,
        textAlign: 'right',
        fontFamily: courtsFonts.bold,
        fontSize: rem(11),
        color: colors.text,
    },
    paymentGrid: {
        flexDirection: 'row',
        gap: rem(8),
    },
    paymentBox: {
        flex: 1,
        borderRadius: rem(courtsRadii.sm),
        backgroundColor: colors.surfaceLow,
        padding: rem(10),
        alignItems: 'center',
    },
    paymentLabel: {
        fontFamily: courtsFonts.extraBold,
        fontSize: rem(7.5),
        letterSpacing: 0.5,
        color: colors.textSoft,
    },
    paymentValue: {
        marginTop: rem(3),
        fontFamily: courtsFonts.extraBold,
        fontSize: rem(12),
        color: colors.text,
    },
    paymentAlert: {
        color: colors.dangerDark,
    },
    actions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: rem(8),
    },
    note: {
        fontFamily: courtsFonts.medium,
        fontSize: rem(9),
        lineHeight: rem(14),
        color: colors.textSoft,
        textAlign: 'center',
    },
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
