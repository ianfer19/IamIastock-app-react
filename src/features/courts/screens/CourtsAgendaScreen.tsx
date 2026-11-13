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
    CalendarCheck,
    CalendarDays,
    Check,
    ChevronRight,
    CircleDollarSign,
    Clock,
    Plus,
    TriangleAlert,
    Wallet,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { rem } from '@/core/utils/responsive';
import { CourtsService } from '../services/courtsService';
import { Court, CourtAvailability, CourtBooking, Slot } from '../types/courts.types';
import {
    COURTS_DAYS,
    addDays,
    courtErrorMessage,
    formatDateLong,
    formatDateShort,
    formatHour,
    formatMoneyCompact,
    formatMoneyNoDecimals,
    isoDate,
    parseDate,
    timeToMinutes,
} from '../utils/formatters';
import {
    courtsColors,
    courtsFonts,
    courtsRadii,
    courtsShadow,
    courtsSpacing,
    courtsTypography,
} from '../theme/courtsTheme';
import { CourtsHero, CourtHeroStat } from '../components/CourtsHero';
import {
    EmptyState,
    LoadingState,
    PrimaryButton,
    SectionCard,
    StatusPill,
} from '../components/CourtsUI';
import {
    ALL_COURTS,
    CourtsAgendaFilters,
    CourtsAgendaViewMode,
} from '../components/CourtsAgendaFilters';
import { BookingFormModal } from '../components/BookingFormModal';
import { BookingDetailModal } from '../components/BookingDetailModal';

interface PeriodTotals {
    count: number;
    expected: number;
    collected: number;
    pending: number;
}

const totalsFor = (bookings: CourtBooking[]): PeriodTotals => {
    const active = bookings.filter(booking => booking.status !== 'CANCELLED');
    return {
        count: active.length,
        expected: active.reduce((sum, booking) => sum + Number(booking.total || 0), 0),
        collected: active.reduce((sum, booking) => sum + Number(booking.amount_paid || 0), 0),
        pending: active.filter(booking => Number(booking.balance_due || 0) > 0).length,
    };
};

const startOfWeek = (date: Date): Date => addDays(date, -((date.getDay() + 6) % 7));

const periodRange = (iso: string, mode: CourtsAgendaViewMode): { from: string; to: string } => {
    const date = parseDate(iso);
    if (mode === 'week') {
        const start = startOfWeek(date);
        return { from: isoDate(start), to: isoDate(addDays(start, 6)) };
    }
    if (mode === 'month') {
        const first = new Date(date.getFullYear(), date.getMonth(), 1, 12);
        const start = startOfWeek(first);
        return { from: isoDate(start), to: isoDate(addDays(start, 41)) };
    }
    return { from: iso, to: iso };
};

const shiftDate = (iso: string, mode: CourtsAgendaViewMode, direction: -1 | 1): string => {
    const base = parseDate(iso);
    if (mode === 'week') return isoDate(addDays(base, 7 * direction));
    if (mode === 'month') return isoDate(new Date(base.getFullYear(), base.getMonth() + direction, 1, 12));
    return isoDate(addDays(base, direction));
};

export const CourtsAgendaScreen = () => {
    const [courts, setCourts] = useState<Court[]>([]);
    const [grid, setGrid] = useState<CourtAvailability | null>(null);
    const [bookings, setBookings] = useState<CourtBooking[]>([]);
    const [periodBookings, setPeriodBookings] = useState<Record<string, CourtBooking[]>>({});
    const [viewMode, setViewMode] = useState<CourtsAgendaViewMode>('day');
    const [selectedDate, setSelectedDate] = useState(isoDate());
    const [selectedCourtId, setSelectedCourtId] = useState(ALL_COURTS);
    const [freeOnly, setFreeOnly] = useState(false);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [bookingFormVisible, setBookingFormVisible] = useState(false);
    const [bookingPreset, setBookingPreset] = useState<{ courtId?: string; date?: string; startTime?: string } | null>(null);
    const [selectedBooking, setSelectedBooking] = useState<CourtBooking | null>(null);

    const todayIso = useMemo(() => isoDate(), []);

    const load = useCallback(async (date: string, mode: CourtsAgendaViewMode, refresh = false) => {
        if (refresh) setRefreshing(true);
        else setLoading(true);
        setError(null);
        try {
            if (mode === 'day') {
                const [courtList, availability, bookingList] = await Promise.all([
                    CourtsService.listCourts(false),
                    CourtsService.getGrid(date),
                    CourtsService.listBookings(date),
                ]);
                setCourts(courtList);
                setGrid(availability);
                setBookings(bookingList);
                setPeriodBookings({});
            } else {
                const { from, to } = periodRange(date, mode);
                const [courtList, range] = await Promise.all([
                    CourtsService.listCourts(false),
                    CourtsService.listBookingsRange(from, to),
                ]);
                const grouped: Record<string, CourtBooking[]> = {};
                for (const booking of range || []) {
                    const key = booking.date;
                    if (!key) continue;
                    if (!grouped[key]) grouped[key] = [];
                    grouped[key].push(booking);
                }
                setCourts(courtList);
                setPeriodBookings(grouped);
            }
        } catch (loadError) {
            setError(courtErrorMessage(loadError, 'No se pudo cargar la agenda.'));
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        void load(selectedDate, viewMode);
    }, [selectedDate, viewMode, load]);

    const courtOptions = useMemo(
        () => courts
            .filter(court => court.status !== 'INACTIVE')
            .map(court => ({ id: court.court_id, name: court.name, footballType: court.football_type })),
        [courts]
    );

    const gridRows = useMemo(() => {
        const rows = grid?.courts || [];
        return selectedCourtId === ALL_COURTS ? rows : rows.filter(row => row.court_id === selectedCourtId);
    }, [grid, selectedCourtId]);

    const dayStats = useMemo(() => {
        const slots = gridRows.flatMap(row => row.slots || []);
        const available = slots.filter(slot => slot.status === 'AVAILABLE').length;
        const taken = slots.filter(slot => slot.status === 'TAKEN').length;
        const total = available + taken;
        const scoped = selectedCourtId === ALL_COURTS
            ? bookings
            : bookings.filter(booking => booking.court_id === selectedCourtId);
        return {
            occupancy: total ? Math.round((taken / total) * 100) : 0,
            upcoming: scoped.filter(booking => booking.status === 'CONFIRMED').length,
            inPlay: scoped.filter(booking => booking.status === 'CHECKED_IN').length,
            pending: scoped.filter(booking => Number(booking.balance_due || 0) > 0).length,
            freeHours: Math.round((available * (grid?.duration_minutes || 60)) / 60),
        };
    }, [gridRows, grid, bookings, selectedCourtId]);

    const periodScope = useMemo(() => {
        const scoped: Record<string, CourtBooking[]> = {};
        Object.entries(periodBookings).forEach(([date, list]) => {
            scoped[date] = selectedCourtId === ALL_COURTS
                ? list
                : list.filter(booking => booking.court_id === selectedCourtId);
        });
        return scoped;
    }, [periodBookings, selectedCourtId]);

    const periodTotals = useMemo(() => {
        if (viewMode === 'day') return totalsFor(bookings);
        const base = parseDate(selectedDate);
        const from = viewMode === 'month'
            ? isoDate(new Date(base.getFullYear(), base.getMonth(), 1, 12))
            : periodRange(selectedDate, 'week').from;
        const to = viewMode === 'month'
            ? isoDate(new Date(base.getFullYear(), base.getMonth() + 1, 0, 12))
            : periodRange(selectedDate, 'week').to;
        return totalsFor(
            Object.entries(periodScope)
                .filter(([date]) => date >= from && date <= to)
                .flatMap(([, list]) => list)
        );
    }, [bookings, periodScope, selectedDate, viewMode]);

    const weekDays = useMemo(() => {
        const { from } = periodRange(selectedDate, 'week');
        return Array.from({ length: 7 }, (_, index) => {
            const date = addDays(parseDate(from), index);
            const iso = isoDate(date);
            return {
                iso,
                label: date.toLocaleDateString('es-CO', { weekday: 'short' }).replace('.', ''),
                day: date.getDate(),
                totals: totalsFor(periodScope[iso] || []),
                bookings: periodScope[iso] || [],
            };
        });
    }, [selectedDate, periodScope]);

    const monthCells = useMemo(() => {
        const { from } = periodRange(selectedDate, 'month');
        const base = parseDate(selectedDate);
        return Array.from({ length: 42 }, (_, index) => {
            const date = addDays(parseDate(from), index);
            const iso = isoDate(date);
            const totals = totalsFor(periodScope[iso] || []);
            return {
                iso,
                day: date.getDate(),
                inMonth: date.getMonth() === base.getMonth(),
                isToday: iso === todayIso,
                count: totals.count,
                pending: totals.pending > 0,
            };
        });
    }, [selectedDate, periodScope, todayIso]);

    const heroImage = useMemo(() => {
        const court = courts.find(item => item.court_id === selectedCourtId && item.images?.length)
            || courts.find(item => item.images?.length);
        return court?.images?.find(Boolean) || null;
    }, [courts, selectedCourtId]);

    const heroStats: CourtHeroStat[] = useMemo(() => {
        if (viewMode !== 'day') {
            return [
                { label: 'RESERVAS', value: periodTotals.count, icon: CalendarCheck, tone: 'indigo' },
                { label: 'ESPERADO', value: formatMoneyCompact(periodTotals.expected), icon: Wallet, tone: 'green' },
                { label: 'COBRADO', value: formatMoneyCompact(periodTotals.collected), icon: CircleDollarSign, tone: 'amber' },
                { label: 'PENDIENTES', value: periodTotals.pending, icon: TriangleAlert, tone: 'soft' },
            ];
        }
        return [
            { label: 'PRÓXIMOS', value: dayStats.upcoming, icon: Clock, tone: 'indigo' },
            { label: 'EN JUEGO', value: dayStats.inPlay, icon: Check, tone: 'green' },
            { label: 'ABONOS PENDIENTES', value: dayStats.pending, icon: CircleDollarSign, tone: 'amber' },
            { label: 'HORAS LIBRES', value: dayStats.freeHours, icon: Plus, tone: 'soft' },
        ];
    }, [viewMode, periodTotals, dayStats]);

    const heroProgress = viewMode === 'day'
        ? dayStats.occupancy
        : periodTotals.expected
            ? Math.round((periodTotals.collected / periodTotals.expected) * 100)
            : 0;

    const periodLabel = useMemo(() => {
        if (viewMode === 'month') {
            const date = parseDate(selectedDate);
            return date.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
        }
        if (viewMode === 'week') {
            const { from, to } = periodRange(selectedDate, 'week');
            return `${formatDateShort(from)} – ${formatDateShort(to)}`;
        }
        return formatDateLong(selectedDate);
    }, [selectedDate, viewMode]);

    const dateStrip = useMemo(() => {
        const base = parseDate(selectedDate);
        return Array.from({ length: 7 }, (_, index) => {
            const date = addDays(base, index - 3);
            return {
                iso: isoDate(date),
                label: date.toLocaleDateString('es-CO', { weekday: 'short' }).replace('.', ''),
                day: date.getDate(),
            };
        });
    }, [selectedDate]);

    const bookingForSlot = (courtId: string, start: string): CourtBooking | undefined =>
        bookings.find(booking =>
            booking.court_id === courtId
            && booking.start_time === start
            && booking.status !== 'CANCELLED'
        );

    const openNewBooking = (courtId?: string, startTime?: string, date?: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setBookingPreset({
            courtId: courtId || (selectedCourtId === ALL_COURTS ? gridRows[0]?.court_id : selectedCourtId),
            date: date || selectedDate,
            startTime: startTime || '18:00',
        });
        setBookingFormVisible(true);
    };

    const openDay = (iso: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedDate(iso);
        setViewMode('day');
    };

    const shiftPeriod = (direction: -1 | 1) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedDate(previous => shiftDate(previous, viewMode, direction));
    };

    const goToday = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedDate(todayIso);
    };

    if (loading && !courts.length && !grid && !Object.keys(periodBookings).length) {
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
                        onRefresh={() => void load(selectedDate, viewMode, true)}
                        tintColor={courtsColors.indigo}
                    />
                )}
            >
                <CourtsHero
                    eyebrow={
                        viewMode === 'week'
                            ? 'RESERVAS DE LA SEMANA'
                            : viewMode === 'month'
                                ? 'RESERVAS DEL MES'
                                : 'OCUPACIÓN DEL DÍA'
                    }
                    value={viewMode === 'day' ? dayStats.occupancy : periodTotals.count}
                    suffix={viewMode === 'day' ? '%' : 'reservas'}
                    progress={heroProgress}
                    hint={
                        viewMode === 'day'
                            ? 'Toca un horario libre para crear una reserva.'
                            : `Cobrado ${formatMoneyNoDecimals(periodTotals.collected)} de ${formatMoneyNoDecimals(periodTotals.expected)} esperados.`
                    }
                    image={heroImage}
                    stats={heroStats}
                    compact
                />

                <CourtsAgendaFilters
                    viewMode={viewMode}
                    onViewModeChange={mode => {
                        setFreeOnly(false);
                        setViewMode(mode);
                    }}
                    courts={courtOptions}
                    selectedCourtId={selectedCourtId}
                    onSelectCourt={setSelectedCourtId}
                    freeOnly={freeOnly}
                    onToggleFreeOnly={() => setFreeOnly(current => !current)}
                    periodLabel={periodLabel}
                    periodCaption={viewMode === 'day' ? 'Vista diaria' : viewMode === 'week' ? 'Vista semanal' : 'Vista mensual'}
                    onPrev={() => shiftPeriod(-1)}
                    onNext={() => shiftPeriod(1)}
                    onToday={goToday}
                />

                {error ? (
                    <View style={styles.errorBox}>
                        <Text style={styles.errorText}>{error}</Text>
                        <PrimaryButton
                            label="Reintentar"
                            variant="ghost"
                            compact
                            onPress={() => void load(selectedDate, viewMode)}
                        />
                    </View>
                ) : null}

                {viewMode === 'day' ? (
                    <>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateStrip}>
                            {dateStrip.map(day => {
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

                        <SectionCard>
                            <View style={styles.sectionHeader}>
                                <View style={styles.sectionCopy}>
                                    <Text style={styles.sectionTitle}>
                                        {freeOnly ? 'Horarios libres' : 'Grilla del día'}
                                    </Text>
                                    <Text style={styles.sectionSubtitle}>{formatDateLong(selectedDate)}</Text>
                                </View>
                                <PrimaryButton
                                    label="Nueva reserva"
                                    icon={Plus}
                                    compact
                                    onPress={() => openNewBooking()}
                                />
                            </View>

                            {!freeOnly ? (
                                <View style={styles.legend}>
                                    <LegendItem color={courtsColors.indigo} label="Confirmada" />
                                    <LegendItem color={courtsColors.greenMid} label="En juego" />
                                    <LegendItem color={courtsColors.amberBorder} label="Pago pendiente" />
                                    <LegendItem color="#E7E5E4" label="Mantenimiento" />
                                    <LegendItem color={courtsColors.indigoSoft} label="Libre" dashed />
                                </View>
                            ) : null}

                            {loading ? (
                                <LoadingState label="Cargando agenda…" />
                            ) : !gridRows.length ? (
                                <EmptyState
                                    icon={CalendarDays}
                                    title="No hay canchas para mostrar"
                                    message={selectedCourtId === ALL_COURTS
                                        ? 'Crea una cancha para ver la agenda.'
                                        : 'La cancha seleccionada no está disponible en esta fecha.'}
                                />
                            ) : (
                                gridRows.map((row, index) => {
                                    const slots = freeOnly
                                        ? row.slots.filter(slot => slot.status === 'AVAILABLE')
                                        : row.slots;
                                    const freeCount = row.slots.filter(slot => slot.status === 'AVAILABLE').length;
                                    return (
                                        <View
                                            key={row.court_id}
                                            style={[styles.courtBlock, index > 0 && styles.courtBlockDivider]}
                                        >
                                            {gridRows.length > 1 || selectedCourtId === ALL_COURTS ? (
                                                <View style={styles.courtBlockHead}>
                                                    <View style={styles.courtBlockCopy}>
                                                        <Text style={styles.courtBlockName} numberOfLines={1}>{row.name}</Text>
                                                        <Text style={styles.courtBlockMeta}>
                                                            {row.football_type} · {freeCount} libres
                                                        </Text>
                                                    </View>
                                                    <StatusPill
                                                        label={freeCount ? `${freeCount} libres` : 'Sin cupo'}
                                                        tone={freeCount ? 'active' : 'inactive'}
                                                    />
                                                </View>
                                            ) : null}

                                            {!slots.length ? (
                                                <Text style={styles.freeEmpty}>Sin horarios libres para esta cancha.</Text>
                                            ) : (
                                                <View style={styles.timeline}>
                                                    {slots.map(slot => (
                                                        <TimelineSlot
                                                            key={`${row.court_id}-${slot.start}-${slot.end}`}
                                                            slot={slot}
                                                            booking={bookingForSlot(row.court_id, slot.start)}
                                                            onPressFree={() => openNewBooking(row.court_id, slot.start)}
                                                            onPressBooking={booking => setSelectedBooking(booking)}
                                                        />
                                                    ))}
                                                </View>
                                            )}
                                        </View>
                                    );
                                })
                            )}
                        </SectionCard>
                    </>
                ) : null}

                {viewMode === 'week' ? (
                    <SectionCard>
                        <View style={styles.sectionHeader}>
                            <View style={styles.sectionCopy}>
                                <Text style={styles.sectionTitle}>Semana</Text>
                                <Text style={styles.sectionSubtitle}>{periodLabel} · toca un día para ver su agenda</Text>
                            </View>
                            <PrimaryButton
                                label="Nueva"
                                icon={Plus}
                                compact
                                onPress={() => openNewBooking(undefined, '18:00', weekDays[0]?.iso)}
                            />
                        </View>

                        {loading ? (
                            <LoadingState label="Cargando semana…" />
                        ) : (
                            <View style={styles.weekList}>
                                {weekDays.map(day => {
                                    const ratio = day.totals.expected
                                        ? Math.min(100, Math.round((day.totals.collected / day.totals.expected) * 100))
                                        : 0;
                                    const isToday = day.iso === todayIso;
                                    return (
                                        <Pressable
                                            key={day.iso}
                                            onPress={() => openDay(day.iso)}
                                            style={({ pressed }) => [
                                                styles.weekRow,
                                                isToday && styles.weekRowToday,
                                                pressed && styles.pressed,
                                            ]}
                                            accessibilityRole="button"
                                        >
                                            <View style={[styles.weekDayBadge, isToday && styles.weekDayBadgeToday]}>
                                                <Text style={[styles.weekDayLabel, isToday && styles.weekDayLabelToday]}>
                                                    {day.label}
                                                </Text>
                                                <Text style={[styles.weekDayNumber, isToday && styles.weekDayNumberToday]}>
                                                    {day.day}
                                                </Text>
                                            </View>

                                            <View style={styles.weekCopy}>
                                                <Text style={styles.weekCount}>
                                                    {day.totals.count} {day.totals.count === 1 ? 'reserva' : 'reservas'}
                                                </Text>
                                                <Text style={styles.weekMoney} numberOfLines={1}>
                                                    {formatMoneyNoDecimals(day.totals.expected)} esperado · {formatMoneyNoDecimals(day.totals.collected)} cobrado
                                                </Text>
                                                <View style={styles.weekBarTrack}>
                                                    <View style={[styles.weekBarFill, { width: `${ratio}%` }]} />
                                                </View>
                                                {day.bookings.length ? (
                                                    <Text style={styles.weekSample} numberOfLines={1}>
                                                        {day.bookings
                                                            .slice(0, 2)
                                                            .map(booking => `${booking.start_time} ${booking.customer_name}`)
                                                            .join(' · ')}
                                                    </Text>
                                                ) : (
                                                    <Text style={styles.weekEmpty}>Sin reservas</Text>
                                                )}
                                            </View>

                                            <ChevronRight size={rem(14)} color={courtsColors.textMuted} strokeWidth={2.2} />
                                        </Pressable>
                                    );
                                })}
                            </View>
                        )}
                    </SectionCard>
                ) : null}

                {viewMode === 'month' ? (
                    <SectionCard>
                        <View style={styles.sectionHeader}>
                            <View style={styles.sectionCopy}>
                                <Text style={styles.sectionTitle}>{periodLabel}</Text>
                                <Text style={styles.sectionSubtitle}>
                                    {periodTotals.count} reservas · {periodTotals.pending} con saldo pendiente
                                </Text>
                            </View>
                            <PrimaryButton
                                label="Nueva"
                                icon={Plus}
                                compact
                                onPress={() => openNewBooking()}
                            />
                        </View>

                        {loading ? (
                            <LoadingState label="Cargando mes…" />
                        ) : (
                            <View style={styles.monthGrid}>
                                {COURTS_DAYS.map(label => (
                                    <Text key={label} style={styles.monthWeekday}>{label}</Text>
                                ))}
                                {monthCells.map(cell => (
                                    <Pressable
                                        key={cell.iso}
                                        onPress={() => openDay(cell.iso)}
                                        style={styles.monthCellWrap}
                                        accessibilityRole="button"
                                    >
                                        <View style={[
                                            styles.monthCell,
                                            !cell.inMonth && styles.monthCellOut,
                                            cell.isToday && styles.monthCellToday,
                                        ]}>
                                            <Text style={[
                                                styles.monthDay,
                                                !cell.inMonth && styles.monthDayOut,
                                                cell.isToday && styles.monthDayToday,
                                            ]}>
                                                {cell.day}
                                            </Text>
                                            {cell.count ? (
                                                <View style={[styles.monthBadge, cell.pending && styles.monthBadgePending]}>
                                                    <Text style={[
                                                        styles.monthBadgeText,
                                                        cell.pending && styles.monthBadgeTextPending,
                                                    ]}>
                                                        {cell.count}
                                                    </Text>
                                                </View>
                                            ) : null}
                                        </View>
                                    </Pressable>
                                ))}
                            </View>
                        )}

                        <View style={styles.monthLegend}>
                            <LegendItem color={courtsColors.indigo} label="Con reservas" />
                            <LegendItem color={courtsColors.amberBorder} label="Saldo pendiente" />
                        </View>
                    </SectionCard>
                ) : null}
            </ScrollView>

            <BookingFormModal
                visible={bookingFormVisible}
                courts={courts}
                preset={bookingPreset}
                onClose={() => setBookingFormVisible(false)}
                onSaved={() => {
                    setBookingFormVisible(false);
                    void load(selectedDate, viewMode);
                }}
            />
            <BookingDetailModal
                visible={!!selectedBooking}
                booking={selectedBooking}
                onClose={() => setSelectedBooking(null)}
                onChanged={() => void load(selectedDate, viewMode)}
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
                        <Text style={[styles.bookingMeta, (inPlay || paid) && styles.bookingMetaLight]}>
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
    errorBox: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: rem(10),
        borderRadius: rem(courtsRadii.md),
        borderWidth: 1,
        borderColor: courtsColors.dangerBorder,
        backgroundColor: courtsColors.dangerSoft,
        paddingHorizontal: rem(12),
        paddingVertical: rem(8),
    },
    errorText: {
        flex: 1,
        fontFamily: courtsFonts.semibold,
        fontSize: rem(courtsTypography.caption),
        color: courtsColors.dangerDark,
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
    courtBlock: {
        gap: rem(6),
    },
    courtBlockDivider: {
        marginTop: rem(12),
        paddingTop: rem(12),
        borderTopWidth: 1,
        borderTopColor: courtsColors.border,
    },
    courtBlockHead: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: rem(8),
    },
    courtBlockCopy: {
        flex: 1,
        minWidth: 0,
    },
    courtBlockName: {
        fontFamily: courtsFonts.extraBold,
        fontSize: rem(12),
        color: courtsColors.text,
    },
    courtBlockMeta: {
        marginTop: rem(1),
        fontFamily: courtsFonts.semibold,
        fontSize: rem(8),
        color: courtsColors.textMuted,
    },
    freeEmpty: {
        fontFamily: courtsFonts.medium,
        fontSize: rem(9),
        color: courtsColors.textSoft,
        paddingVertical: rem(4),
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
    weekList: {
        gap: rem(8),
    },
    weekRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: rem(10),
        borderRadius: rem(courtsRadii.lg),
        borderWidth: 1,
        borderColor: courtsColors.border,
        backgroundColor: courtsColors.surfaceMuted,
        padding: rem(10),
    },
    weekRowToday: {
        borderColor: courtsColors.indigoBorder,
        backgroundColor: courtsColors.indigoSoft,
    },
    weekDayBadge: {
        width: rem(42),
        height: rem(46),
        borderRadius: rem(courtsRadii.sm),
        backgroundColor: courtsColors.surface,
        borderWidth: 1,
        borderColor: courtsColors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    weekDayBadgeToday: {
        backgroundColor: courtsColors.indigo,
        borderColor: courtsColors.indigo,
    },
    weekDayLabel: {
        fontFamily: courtsFonts.semibold,
        fontSize: rem(8),
        color: courtsColors.textMuted,
        textTransform: 'capitalize',
    },
    weekDayLabelToday: {
        color: '#E4E6FF',
    },
    weekDayNumber: {
        fontFamily: courtsFonts.extraBold,
        fontSize: rem(16),
        color: courtsColors.text,
    },
    weekDayNumberToday: {
        color: courtsColors.white,
    },
    weekCopy: {
        flex: 1,
        minWidth: 0,
        gap: rem(2),
    },
    weekCount: {
        fontFamily: courtsFonts.extraBold,
        fontSize: rem(11),
        color: courtsColors.text,
    },
    weekMoney: {
        fontFamily: courtsFonts.semibold,
        fontSize: rem(8),
        color: courtsColors.textMuted,
    },
    weekBarTrack: {
        marginTop: rem(2),
        height: rem(4),
        borderRadius: rem(2),
        backgroundColor: courtsColors.surfaceLow,
        overflow: 'hidden',
    },
    weekBarFill: {
        height: '100%',
        borderRadius: rem(2),
        backgroundColor: courtsColors.greenMid,
    },
    weekSample: {
        marginTop: rem(2),
        fontFamily: courtsFonts.medium,
        fontSize: rem(8),
        color: courtsColors.textSoft,
    },
    weekEmpty: {
        marginTop: rem(2),
        fontFamily: courtsFonts.medium,
        fontSize: rem(8),
        color: courtsColors.textSoft,
    },
    monthGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    monthWeekday: {
        width: '14.2857%',
        textAlign: 'center',
        fontFamily: courtsFonts.extraBold,
        fontSize: rem(8),
        letterSpacing: 0.4,
        color: courtsColors.textMuted,
        textTransform: 'uppercase',
        paddingBottom: rem(4),
    },
    monthCellWrap: {
        width: '14.2857%',
        padding: rem(2),
    },
    monthCell: {
        minHeight: rem(44),
        borderRadius: rem(courtsRadii.xs),
        borderWidth: 1,
        borderColor: courtsColors.border,
        backgroundColor: courtsColors.surface,
        padding: rem(4),
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
    },
    monthCellOut: {
        backgroundColor: 'transparent',
        borderColor: 'transparent',
    },
    monthCellToday: {
        borderColor: courtsColors.indigo,
        backgroundColor: courtsColors.indigoSoft,
    },
    monthDay: {
        fontFamily: courtsFonts.extraBold,
        fontSize: rem(10),
        color: courtsColors.text,
    },
    monthDayOut: {
        color: courtsColors.borderStrong,
    },
    monthDayToday: {
        color: courtsColors.indigoDark,
    },
    monthBadge: {
        position: 'absolute',
        right: rem(3),
        bottom: rem(3),
        minWidth: rem(15),
        height: rem(15),
        paddingHorizontal: rem(3),
        borderRadius: rem(8),
        backgroundColor: courtsColors.greenSoft,
        alignItems: 'center',
        justifyContent: 'center',
    },
    monthBadgePending: {
        backgroundColor: courtsColors.amber,
    },
    monthBadgeText: {
        fontFamily: courtsFonts.extraBold,
        fontSize: rem(8),
        color: courtsColors.greenMid,
    },
    monthBadgeTextPending: {
        color: courtsColors.amberText,
    },
    monthLegend: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: rem(10),
        marginTop: rem(10),
    },
    pressed: {
        opacity: 0.78,
    },
});
