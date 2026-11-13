import React, { useEffect, useMemo, useRef } from 'react';
import {
    NativeScrollEvent,
    NativeSyntheticEvent,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { rem } from '@/core/utils/responsive';
import { CourtBooking, CourtGridRow, Slot } from '../types/courts.types';
import { formatHour, formatMoneyNoDecimals, timeToMinutes } from '../utils/formatters';
import { CourtsPalette, courtsFonts, courtsRadii, useCourtsColors } from '../theme/courtsTheme';

const CELL_WIDTH = 72;
const ROW_HEIGHT = 56;
const HEADER_HEIGHT = 32;
const COURT_WIDTH = 88;

interface CourtsAgendaMatrixProps {
    rows: CourtGridRow[];
    bookings: CourtBooking[];
    durationMinutes: number;
    freeOnly: boolean;
    onPressFree: (courtId: string, slot: Slot) => void;
    onPressBooking: (booking: CourtBooking) => void;
}

type CellTone = 'free' | 'paid' | 'pending' | 'playing' | 'blocked' | 'past' | 'empty';

/**
 * Agenda diaria en formato horizontal: una fila por cancha y una columna por
 * horario. La columna de canchas queda fija y el resto se desplaza en horizontal.
 */
export const CourtsAgendaMatrix = ({
    rows,
    bookings,
    durationMinutes,
    freeOnly,
    onPressFree,
    onPressBooking,
}: CourtsAgendaMatrixProps) => {
    const colors = useCourtsColors();
    const styles = getStyles(colors);
    const headerRef = useRef<ScrollView>(null);
    const bodyRef = useRef<ScrollView>(null);

    const step = Math.max(30, durationMinutes || 60);

    const times = useMemo(() => {
        const starts: number[] = [];
        const ends: number[] = [];
        rows.forEach(row => {
            (row.slots || []).forEach(slot => {
                starts.push(timeToMinutes(slot.start));
                ends.push(timeToMinutes(slot.end));
            });
        });
        if (!starts.length) return [] as number[];
        const from = Math.min(...starts);
        const to = Math.max(...ends);
        const list: number[] = [];
        for (let minute = from; minute < to; minute += step) list.push(minute);
        return list;
    }, [rows, step]);

    const slotsByCourt = useMemo(() => {
        const map = new Map<string, Map<number, Slot>>();
        rows.forEach(row => {
            map.set(
                row.court_id,
                new Map((row.slots || []).map(slot => [timeToMinutes(slot.start), slot]))
            );
        });
        return map;
    }, [rows]);

    const bookingsByKey = useMemo(() => {
        const map = new Map<string, CourtBooking>();
        bookings.forEach(booking => {
            if (booking.status === 'CANCELLED') return;
            map.set(`${booking.court_id}|${timeToMinutes(booking.start_time)}`, booking);
        });
        return map;
    }, [bookings]);

    // Cache de montos: evita crear un Intl.NumberFormat por celda.
    const money = useMemo(() => {
        const cache = new Map<number, string>();
        return (value?: number | null): string => {
            if (value === null || value === undefined) return '';
            const amount = Math.round(Number(value));
            const cached = cache.get(amount);
            if (cached) return cached;
            const formatted = formatMoneyNoDecimals(amount);
            cache.set(amount, formatted);
            return formatted;
        };
    }, []);

    const syncHeader = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        headerRef.current?.scrollTo({ x: event.nativeEvent.contentOffset.x, animated: false });
    };

    // Al abrir la agenda, desplaza hasta la hora actual.
    useEffect(() => {
        if (!times.length) return;
        const now = new Date();
        const minutes = now.getHours() * 60 + now.getMinutes();
        const index = times.findIndex(time => time >= minutes);
        const target = Math.max(0, (index === -1 ? 0 : index - 1)) * CELL_WIDTH;
        bodyRef.current?.scrollTo({ x: target, animated: false });
        headerRef.current?.scrollTo({ x: target, animated: false });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [times.length]);

    const toneFor = (slot: Slot, booking?: CourtBooking): CellTone => {
        if (slot.status === 'AVAILABLE') return 'free';
        if (slot.status === 'BLOCKED') return 'blocked';
        if (slot.status === 'PAST' || slot.status === 'CLOSED') return 'past';
        if (!booking) return 'past';
        if (booking.status === 'CHECKED_IN') return 'playing';
        if (booking.payment_status === 'PAID') return 'paid';
        return 'pending';
    };

    const renderCell = (row: CourtGridRow, minute: number) => {
        const slot = slotsByCourt.get(row.court_id)?.get(minute);
        if (!slot) {
            return <View key={`${row.court_id}-${minute}-empty`} style={[styles.cell, styles.cellEmpty]} />;
        }

        const booking = bookingsByKey.get(`${row.court_id}|${minute}`);
        const tone = toneFor(slot, booking);

        if (tone !== 'free' && freeOnly) {
            return <View key={`${row.court_id}-${minute}`} style={[styles.cell, styles.cellMuted]} />;
        }

        if (tone === 'free') {
            return (
                <Pressable
                    key={`${row.court_id}-${minute}`}
                    onPress={() => onPressFree(row.court_id, slot)}
                    style={({ pressed }) => [styles.cell, styles.cellFree, pressed && styles.pressed]}
                    accessibilityRole="button"
                    accessibilityLabel={`${row.name} libre a las ${slot.start}`}
                >
                    <Text style={styles.freeLabel}>Libre</Text>
                    {slot.price ? (
                        <Text style={styles.freePrice} numberOfLines={1}>
                            {money(slot.price)}
                        </Text>
                    ) : null}
                </Pressable>
            );
        }

        if ((tone === 'paid' || tone === 'playing' || tone === 'pending') && booking) {
            const light = tone !== 'pending';
            return (
                <Pressable
                    key={`${row.court_id}-${minute}`}
                    onPress={() => onPressBooking(booking)}
                    style={({ pressed }) => [
                        styles.cell,
                        tone === 'playing' && styles.cellPlaying,
                        tone === 'paid' && styles.cellPaid,
                        tone === 'pending' && styles.cellPending,
                        pressed && styles.pressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`${row.name} reservada por ${booking.customer_name} a las ${slot.start}`}
                >
                    <Text
                        style={[styles.bookingName, light && styles.bookingNameLight]}
                        numberOfLines={1}
                    >
                        {booking.customer_name}
                    </Text>
                    <Text style={[styles.bookingMeta, light && styles.bookingMetaLight]} numberOfLines={1}>
                        {money(booking.total)}
                    </Text>
                </Pressable>
            );
        }

        const blocked = tone === 'blocked';
        return (
            <View
                key={`${row.court_id}-${minute}`}
                style={[styles.cell, blocked ? styles.cellBlocked : styles.cellMuted]}
            >
                <Text style={[styles.stateLabel, blocked ? styles.blockedLabel : styles.mutedLabel]}>
                    {blocked ? 'Mant.' : '—'}
                </Text>
            </View>
        );
    };

    if (!times.length || !rows.length) {
        return null;
    }

    return (
        <View style={styles.matrix}>
            <View style={styles.courtColumn}>
                <View style={[styles.courtHead, { height: HEADER_HEIGHT }]}>
                    <Text style={styles.courtHeadText}>CANCHA</Text>
                </View>
                {rows.map(row => (
                    <View key={row.court_id} style={[styles.courtCell, { height: ROW_HEIGHT }]}>
                        <Text style={styles.courtName} numberOfLines={2}>{row.name}</Text>
                        <Text style={styles.courtMeta} numberOfLines={1}>{row.football_type}</Text>
                    </View>
                ))}
            </View>

            <View style={styles.timeline}>
                <ScrollView
                    ref={headerRef}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    scrollEnabled={false}
                    bounces={false}
                >
                    <View style={styles.row}>
                        {times.map(minute => (
                            <View key={minute} style={[styles.timeCell, { width: CELL_WIDTH, height: HEADER_HEIGHT }]}>
                                <Text style={styles.timeText}>{formatHour(minute)}</Text>
                            </View>
                        ))}
                    </View>
                </ScrollView>

                <ScrollView
                    ref={bodyRef}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    bounces={false}
                    onScroll={syncHeader}
                    scrollEventThrottle={16}
                >
                    <View>
                        {rows.map(row => (
                            <View key={row.court_id} style={[styles.row, { height: ROW_HEIGHT }]}>
                                {times.map(minute => renderCell(row, minute))}
                            </View>
                        ))}
                    </View>
                </ScrollView>
            </View>
        </View>
    );
};

const getStyles = (colors: CourtsPalette) => StyleSheet.create({
    matrix: {
        flexDirection: 'row',
        borderRadius: rem(courtsRadii.lg),
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surfaceMuted,
        overflow: 'hidden',
    },
    courtColumn: {
        width: COURT_WIDTH,
        borderRightWidth: 1,
        borderRightColor: colors.border,
        backgroundColor: colors.surfaceLow,
        zIndex: 2,
    },
    courtHead: {
        justifyContent: 'center',
        paddingHorizontal: rem(8),
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    courtHeadText: {
        fontFamily: courtsFonts.extraBold,
        fontSize: rem(7.5),
        letterSpacing: 0.6,
        color: colors.textMuted,
    },
    courtCell: {
        justifyContent: 'center',
        paddingHorizontal: rem(8),
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    courtName: {
        fontFamily: courtsFonts.extraBold,
        fontSize: rem(10),
        color: colors.text,
    },
    courtMeta: {
        marginTop: rem(1),
        fontFamily: courtsFonts.semibold,
        fontSize: rem(7.5),
        color: colors.textMuted,
    },
    timeline: {
        flex: 1,
    },
    row: {
        flexDirection: 'row',
    },
    timeCell: {
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingHorizontal: rem(6),
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        borderRightWidth: 1,
        borderRightColor: colors.borderSoft,
    },
    timeText: {
        fontFamily: courtsFonts.extraBold,
        fontSize: rem(8.5),
        color: colors.textMuted,
    },
    cell: {
        width: CELL_WIDTH,
        height: ROW_HEIGHT,
        justifyContent: 'center',
        paddingHorizontal: rem(6),
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        borderRightWidth: 1,
        borderRightColor: colors.borderSoft,
    },
    cellEmpty: {
        backgroundColor: 'transparent',
    },
    cellMuted: {
        backgroundColor: colors.surfaceMuted,
    },
    cellFree: {
        backgroundColor: colors.indigoSoft,
    },
    cellPaid: {
        backgroundColor: colors.indigo,
    },
    cellPending: {
        backgroundColor: colors.amber,
    },
    cellPlaying: {
        backgroundColor: colors.greenPanel,
    },
    cellBlocked: {
        backgroundColor: colors.neutralSoft,
    },
    freeLabel: {
        fontFamily: courtsFonts.extraBold,
        fontSize: rem(9),
        color: colors.indigoDark,
    },
    freePrice: {
        marginTop: rem(1),
        fontFamily: courtsFonts.semibold,
        fontSize: rem(7.5),
        color: colors.indigoText,
    },
    bookingName: {
        fontFamily: courtsFonts.extraBold,
        fontSize: rem(9),
        color: colors.amberStrong,
    },
    bookingNameLight: {
        color: colors.white,
    },
    bookingMeta: {
        marginTop: rem(1),
        fontFamily: courtsFonts.semibold,
        fontSize: rem(7.5),
        color: colors.amberText,
    },
    bookingMetaLight: {
        color: 'rgba(255,255,255,0.82)',
    },
    stateLabel: {
        fontFamily: courtsFonts.bold,
        fontSize: rem(8),
    },
    blockedLabel: {
        color: colors.neutralText,
    },
    mutedLabel: {
        color: colors.textSoft,
    },
    pressed: {
        opacity: 0.75,
    },
});
