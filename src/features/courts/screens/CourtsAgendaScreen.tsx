import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import {
    CalendarDays,
    Check,
    CircleDollarSign,
    Clock,
    Plus,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { rem } from '@/core/utils/responsive';
import { CourtsService } from '../services/courtsService';
import { Court, CourtAvailability, CourtBooking, Slot } from '../types/courts.types';
import {
    addDays,
    formatDateLong,
    formatHour,
    formatMoneyNoDecimals,
    isoDate,
    timeToMinutes,
} from '../utils/formatters';
import {
    courtsColors,
    courtsFonts,
    courtsRadii,
    courtsShadow,
    courtsSpacing,
} from '../theme/courtsTheme';
import { CourtsHero, CourtHeroStat } from '../components/CourtsHero';
import {
    EmptyState,
    PrimaryButton,
    SectionCard,
    StatusPill,
} from '../components/CourtsUI';
import { BookingFormModal } from '../components/BookingFormModal';
import { BookingDetailModal } from '../components/BookingDetailModal';

export const CourtsAgendaScreen = () => {
    const [courts, setCourts] = useState<Court[]>([]);
    const [grid, setGrid] = useState<CourtAvailability | null>(null);
    const [bookings, setBookings] = useState<CourtBooking[]>([]);
    const [selectedDate, setSelectedDate] = useState(isoDate());
    const [selectedCourtId, setSelectedCourtId] = useState('');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [bookingFormVisible, setBookingFormVisible] = useState(false);
    const [bookingPreset, setBookingPreset] = useState<{ courtId?: string; date?: string; startTime?: string } | null>(null);
    const [selectedBooking, setSelectedBooking] = useState<CourtBooking | null>(null);

    const load = useCallback(async (date: string, refresh = false) => {
        if (refresh) setRefreshing(true);
        else setLoading(true);
        try {
            const [courtList, availability, bookingList] = await Promise.all([
                CourtsService.listCourts(false),
                CourtsService.getGrid(date),
                CourtsService.listBookings(date),
            ]);
            setCourts(courtList);
            setGrid(availability);
            setBookings(bookingList);
            const availableCourts = availability?.courts || [];
            const preferred = selectedCourtId && availableCourts.some(court => court.court_id === selectedCourtId)
                ? selectedCourtId
                : availableCourts[0]?.court_id || '';
            setSelectedCourtId(preferred);
        } catch (error) {
            console.error('[CourtsAgenda] Error loading', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [selectedCourtId]);

    useEffect(() => {
        void load(selectedDate);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedDate]);

    const selectedRow = useMemo(
        () => grid?.courts.find(court => court.court_id === selectedCourtId) || grid?.courts[0],
        [grid, selectedCourtId]
    );

    const stats = useMemo(() => {
        const slots = (grid?.courts || []).flatMap(court => court.slots || []);
        const available = slots.filter(slot => slot.status === 'AVAILABLE').length;
        const taken = slots.filter(slot => slot.status === 'TAKEN').length;
        const total = available + taken;
        return {
            occupancy: total ? Math.round((taken / total) * 100) : 0,
            upcoming: bookings.filter(booking => booking.status === 'CONFIRMED').length,
            inPlay: bookings.filter(booking => booking.status === 'CHECKED_IN').length,
            pending: bookings.filter(booking => Number(booking.balance_due || 0) > 0).length,
            freeHours: Math.round((available * (grid?.duration_minutes || 60)) / 60),
        };
    }, [grid, bookings]);

    const heroStats: CourtHeroStat[] = useMemo(() => [
        { label: 'PRÓXIMOS', value: stats.upcoming, icon: Clock, tone: 'indigo' },
        { label: 'EN JUEGO', value: stats.inPlay, icon: Check, tone: 'green' },
        { label: 'ABONOS PENDIENTES', value: stats.pending, icon: CircleDollarSign, tone: 'amber' },
        { label: 'HORAS LIBRES', value: stats.freeHours, icon: Plus, tone: 'soft' },
    ], [stats]);

    const heroImage = useMemo(() => {
        const court = courts.find(item => item.court_id === selectedCourtId && item.images?.length)
            || courts.find(item => item.images?.length);
        return court?.images?.find(Boolean) || null;
    }, [courts, selectedCourtId]);

    const dates = useMemo(() => {
        const base = new Date();
        return Array.from({ length: 7 }, (_, index) => {
            const date = addDays(base, index);
            return {
                iso: isoDate(date),
                label: date.toLocaleDateString('es-CO', { weekday: 'short' }).replace('.', ''),
                day: date.getDate(),
            };
        });
    }, []);

    const bookingForSlot = (courtId: string, start: string): CourtBooking | undefined =>
        bookings.find(booking =>
            booking.court_id === courtId
            && booking.start_time === start
            && booking.status !== 'CANCELLED'
        );

    const openNewBooking = (courtId?: string, startTime?: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setBookingPreset({
            courtId: courtId || selectedCourtId,
            date: selectedDate,
            startTime: startTime || '18:00',
        });
        setBookingFormVisible(true);
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator color={courtsColors.indigo} />
            </View>
        );
    }

    return (
        <View style={styles.flex}>
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                refreshControl={(
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => void load(selectedDate, true)}
                        tintColor={courtsColors.indigo}
                    />
                )}
            >
                <CourtsHero
                    eyebrow="OCUPACIÓN DEL DÍA"
                    value={stats.occupancy}
                    suffix="%"
                    progress={stats.occupancy}
                    hint="Toca un horario libre para crear una reserva."
                    image={heroImage}
                    stats={heroStats}
                    compact
                />

                <View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateStrip}>
                        {dates.map(day => {
                            const active = day.iso === selectedDate;
                            return (
                                <Pressable
                                    key={day.iso}
                                    onPress={() => setSelectedDate(day.iso)}
                                    style={[styles.datePill, active && styles.datePillActive]}
                                >
                                    <Text style={[styles.dateLabel, active && styles.dateLabelActive]}>{day.label}</Text>
                                    <Text style={[styles.dateDay, active && styles.dateDayActive]}>{day.day}</Text>
                                </Pressable>
                            );
                        })}
                    </ScrollView>
                </View>

                <SectionCard>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionCopy}>
                            <Text style={styles.sectionTitle}>Grilla del día</Text>
                            <Text style={styles.sectionSubtitle}>{formatDateLong(selectedDate)}</Text>
                        </View>
                        <PrimaryButton
                            label="Nueva reserva"
                            icon={Plus}
                            compact
                            onPress={() => openNewBooking()}
                        />
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.courtChips}>
                        {(grid?.courts || []).map(court => {
                            const active = court.court_id === selectedCourtId;
                            return (
                                <Pressable
                                    key={court.court_id}
                                    onPress={() => setSelectedCourtId(court.court_id)}
                                    style={[styles.courtChip, active && styles.courtChipActive]}
                                >
                                    <Text style={[styles.courtChipText, active && styles.courtChipTextActive]} numberOfLines={1}>
                                        {court.name}
                                    </Text>
                                    <Text style={[styles.courtChipMeta, active && styles.courtChipMetaActive]}>
                                        {court.football_type}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </ScrollView>

                    <View style={styles.legend}>
                        <LegendItem color={courtsColors.indigo} label="Confirmada" />
                        <LegendItem color={courtsColors.greenMid} label="En juego" />
                        <LegendItem color={courtsColors.amberBorder} label="Pago pendiente" />
                        <LegendItem color="#E7E5E4" label="Mantenimiento" />
                        <LegendItem color={courtsColors.indigoSoft} label="Libre" dashed />
                    </View>

                    {!selectedRow ? (
                        <EmptyState
                            icon={CalendarDays}
                            title="No hay canchas configuradas"
                            message="Crea una cancha para ver la agenda."
                        />
                    ) : (
                        <View style={styles.timeline}>
                            {selectedRow.slots.map(slot => (
                                <TimelineSlot
                                    key={`${slot.start}-${slot.end}`}
                                    slot={slot}
                                    booking={bookingForSlot(selectedRow.court_id, slot.start)}
                                    onPressFree={() => openNewBooking(selectedRow.court_id, slot.start)}
                                    onPressBooking={booking => setSelectedBooking(booking)}
                                />
                            ))}
                        </View>
                    )}
                </SectionCard>
            </ScrollView>

            <BookingFormModal
                visible={bookingFormVisible}
                courts={courts}
                preset={bookingPreset}
                onClose={() => setBookingFormVisible(false)}
                onSaved={() => {
                    setBookingFormVisible(false);
                    void load(selectedDate);
                }}
            />
            <BookingDetailModal
                visible={!!selectedBooking}
                booking={selectedBooking}
                onClose={() => setSelectedBooking(null)}
                onChanged={() => void load(selectedDate)}
            />
        </View>
    );
};

const TimelineSlot = ({
    slot,
    booking,
    onPressFree,
    onPressBooking,
}: {
    slot: Slot;
    booking?: CourtBooking;
    onPressFree: () => void;
    onPressBooking: (booking: CourtBooking) => void;
}) => {
    if (slot.status === 'AVAILABLE') {
        return (
            <View style={styles.slotRow}>
                <Text style={styles.slotTime}>{formatHour(timeToMinutes(slot.start))}</Text>
                <Pressable
                    onPress={onPressFree}
                    style={({ pressed }) => [styles.slotCard, styles.freeSlot, pressed && styles.pressed]}
                    accessibilityRole="button"
                >
                    <View style={styles.slotCopy}>
                        <Text style={styles.freeTitle}>Libre</Text>
                        <Text style={styles.freeMeta}>{slot.start} – {slot.end}</Text>
                    </View>
                    {slot.price ? <Text style={styles.freePrice}>{formatMoneyNoDecimals(slot.price)}</Text> : null}
                    <Plus size={rem(15)} color={courtsColors.indigo} />
                </Pressable>
            </View>
        );
    }

    if (slot.status === 'TAKEN' && booking) {
        const paid = booking.payment_status === 'PAID';
        const inPlay = booking.status === 'CHECKED_IN';
        return (
            <View style={styles.slotRow}>
                <Text style={styles.slotTime}>{formatHour(timeToMinutes(slot.start))}</Text>
                <Pressable
                    onPress={() => onPressBooking(booking)}
                    style={({ pressed }) => [
                        styles.slotCard,
                        inPlay ? styles.inPlaySlot : paid ? styles.paidSlot : styles.pendingSlot,
                        pressed && styles.pressed,
                    ]}
                >
                    <View style={styles.slotCopy}>
                        <Text style={[styles.bookingTitle, (inPlay || paid) && styles.bookingTitleLight]} numberOfLines={1}>
                            {booking.customer_name}
                        </Text>
                        <Text style={[styles.bookingMeta, (inPlay || paid) && styles.bookingMetaLight]} numberOfLines={1}>
                            {booking.start_time} – {booking.end_time} · {formatMoneyNoDecimals(booking.total)}
                        </Text>
                    </View>
                    <View style={styles.bookingPills}>
                        {inPlay ? <StatusPill label="En juego" tone="active" /> : null}
                        {!inPlay && !paid ? <StatusPill label="Pago pendiente" tone="maintenance" /> : null}
                    </View>
                </Pressable>
            </View>
        );
    }

    const blocked = slot.status === 'BLOCKED';
    return (
        <View style={styles.slotRow}>
            <Text style={styles.slotTime}>{formatHour(timeToMinutes(slot.start))}</Text>
            <View style={[styles.slotCard, styles.closedSlot]}>
                <View style={styles.slotCopy}>
                    <Text style={styles.closedTitle}>{blocked ? 'Mantenimiento' : slot.status === 'PAST' ? 'Pasado' : 'No disponible'}</Text>
                    <Text style={styles.closedMeta}>{slot.start} – {slot.end}</Text>
                </View>
            </View>
        </View>
    );
};

const LegendItem = ({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) => (
    <View style={styles.legendItem}>
        <View style={[styles.legendDot, { backgroundColor: color }, dashed && styles.legendDashed]} />
        <Text style={styles.legendText}>{label}</Text>
    </View>
);

const styles = StyleSheet.create({
    flex: { flex: 1 },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: courtsColors.background,
    },
    container: {
        flex: 1,
        backgroundColor: courtsColors.background,
    },
    content: {
        padding: rem(courtsSpacing.lg),
        gap: rem(courtsSpacing.lg),
        paddingBottom: rem(40),
    },
    dateStrip: {
        gap: rem(8),
        paddingVertical: rem(2),
    },
    datePill: {
        width: rem(52),
        height: rem(64),
        borderRadius: rem(courtsRadii.xl),
        backgroundColor: courtsColors.surface,
        borderWidth: 1,
        borderColor: courtsColors.border,
        alignItems: 'center',
        justifyContent: 'center',
        gap: rem(2),
        ...courtsShadow.soft,
    },
    datePillActive: {
        backgroundColor: courtsColors.indigo,
        borderColor: courtsColors.indigo,
    },
    dateLabel: {
        fontFamily: courtsFonts.semibold,
        fontSize: rem(10),
        color: courtsColors.textMuted,
        textTransform: 'capitalize',
    },
    dateLabelActive: {
        color: '#E4E6FF',
    },
    dateDay: {
        fontFamily: courtsFonts.extraBold,
        fontSize: rem(18),
        color: courtsColors.text,
    },
    dateDayActive: {
        color: courtsColors.white,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: rem(10),
        marginBottom: rem(12),
    },
    sectionCopy: {
        flex: 1,
        minWidth: 0,
    },
    sectionTitle: {
        fontFamily: courtsFonts.extraBold,
        fontSize: rem(17),
        color: courtsColors.text,
    },
    sectionSubtitle: {
        marginTop: rem(2),
        fontFamily: courtsFonts.semibold,
        fontSize: rem(10),
        color: courtsColors.textMuted,
        textTransform: 'capitalize',
    },
    courtChips: {
        gap: rem(6),
        paddingVertical: rem(2),
        marginBottom: rem(10),
    },
    courtChip: {
        borderWidth: 1,
        borderColor: courtsColors.border,
        borderRadius: rem(courtsRadii.pill),
        backgroundColor: courtsColors.surface,
        paddingHorizontal: rem(12),
        paddingVertical: rem(7),
        maxWidth: rem(160),
    },
    courtChipActive: {
        backgroundColor: courtsColors.green,
        borderColor: courtsColors.green,
    },
    courtChipText: {
        fontFamily: courtsFonts.bold,
        fontSize: rem(10),
        color: courtsColors.textMuted,
    },
    courtChipTextActive: {
        color: courtsColors.white,
    },
    courtChipMeta: {
        fontFamily: courtsFonts.extraBold,
        fontSize: rem(7),
        color: courtsColors.greenMid,
    },
    courtChipMetaActive: {
        color: courtsColors.lime,
    },
    legend: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: rem(10),
        marginBottom: rem(12),
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: rem(4),
    },
    legendDot: {
        width: rem(8),
        height: rem(8),
        borderRadius: rem(2),
    },
    legendDashed: {
        borderWidth: 1,
        borderColor: courtsColors.indigo,
        borderStyle: 'dashed',
    },
    legendText: {
        fontFamily: courtsFonts.medium,
        fontSize: rem(8),
        color: courtsColors.textMuted,
    },
    timeline: {
        gap: rem(6),
    },
    slotRow: {
        flexDirection: 'row',
        alignItems: 'stretch',
        gap: rem(8),
    },
    slotTime: {
        width: rem(38),
        paddingTop: rem(10),
        fontFamily: courtsFonts.semibold,
        fontSize: rem(9),
        color: courtsColors.textMuted,
        textAlign: 'right',
    },
    slotCard: {
        flex: 1,
        minHeight: rem(54),
        borderRadius: rem(courtsRadii.md),
        paddingHorizontal: rem(12),
        paddingVertical: rem(8),
        flexDirection: 'row',
        alignItems: 'center',
        gap: rem(8),
    },
    slotCopy: {
        flex: 1,
        minWidth: 0,
    },
    freeSlot: {
        backgroundColor: courtsColors.indigoSoft,
        borderWidth: 1,
        borderColor: courtsColors.indigoBorder,
        borderStyle: 'dashed',
    },
    freeTitle: {
        fontFamily: courtsFonts.extraBold,
        fontSize: rem(11),
        color: courtsColors.indigoDark,
    },
    freeMeta: {
        fontFamily: courtsFonts.medium,
        fontSize: rem(8),
        color: '#6366F1',
    },
    freePrice: {
        fontFamily: courtsFonts.extraBold,
        fontSize: rem(10),
        color: courtsColors.indigoDark,
    },
    paidSlot: {
        backgroundColor: courtsColors.indigo,
    },
    inPlaySlot: {
        backgroundColor: courtsColors.greenMid,
    },
    pendingSlot: {
        backgroundColor: courtsColors.amber,
        borderWidth: 1,
        borderColor: courtsColors.amberBorder,
    },
    bookingTitle: {
        fontFamily: courtsFonts.extraBold,
        fontSize: rem(11),
        color: '#78350F',
    },
    bookingTitleLight: {
        color: courtsColors.white,
    },
    bookingMeta: {
        fontFamily: courtsFonts.medium,
        fontSize: rem(8),
        color: '#92400E',
    },
    bookingMetaLight: {
        color: 'rgba(255,255,255,0.82)',
    },
    bookingPills: {
        alignItems: 'flex-end',
        gap: rem(3),
    },
    closedSlot: {
        backgroundColor: '#F5F5F4',
        borderWidth: 1,
        borderColor: '#D6D3D1',
    },
    closedTitle: {
        fontFamily: courtsFonts.bold,
        fontSize: rem(10),
        color: '#44403C',
    },
    closedMeta: {
        fontFamily: courtsFonts.medium,
        fontSize: rem(8),
        color: '#78716C',
    },
    pressed: {
        opacity: 0.78,
    },
});
