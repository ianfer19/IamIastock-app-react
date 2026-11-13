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
import { Court, CourtAvailability, CourtBooking } from '../types/courts.types';
import {
    COURTS_DAYS,
    addDays,
    courtErrorMessage,
    formatDateLong,
    formatDateShort,
    formatMoneyCompact,
    formatMoneyNoDecimals,
    isoDate,
    parseDate,
} from '../utils/formatters';
import {
    CourtsPalette,
    courtsFonts,
    courtsRadii,
    courtsSpacing,
    courtsTypography,
    useCourtsColors,
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
import { CourtsAgendaMatrix } from '../components/CourtsAgendaMatrix';
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
    const colors = useCourtsColors();
    const styles = getStyles(colors);

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
                <ActivityIndicator color={colors.indigo} />
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
                        tintColor={colors.indigo}
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

                        <SectionCard style={{ padding: rem(12) }}>
                            <View style={styles.sectionHeader}>
                                <View style={styles.sectionCopy}>
                                    <Text style={styles.sectionTitle}>
                                        {freeOnly ? 'Horarios libres' : 'Grilla del día'}
                                    </Text>
                                    <Text style={styles.sectionSubtitle}>
                                        {formatDateLong(selectedDate)} · desliza para ver más horas
                                    </Text>
                                </View>
                                <PrimaryButton
                                    label="Nueva"
                                    icon={Plus}
                                    compact
                                    onPress={() => openNewBooking()}
                                />
                            </View>

                            {!freeOnly ? (
                                <View style={styles.legend}>
                                    <LegendItem color={colors.indigo} label="Pagada" />
                                    <LegendItem color={colors.greenPanel} label="En juego" />
                                    <LegendItem color={colors.amberBorder} label="Pago pendiente" />
                                    <LegendItem color={colors.neutral} label="Mantenimiento" />
                                    <LegendItem color={colors.indigoSoft} label="Libre" dashed />
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
                                <CourtsAgendaMatrix
                                    rows={gridRows}
                                    bookings={bookings}
                                    durationMinutes={grid?.duration_minutes || 60}
                                    freeOnly={freeOnly}
                                    onPressFree={(courtId, slot) => openNewBooking(courtId, slot.start)}
                                    onPressBooking={booking => setSelectedBooking(booking)}
                                />
                            )}

                            {!loading && gridRows.length ? (
                                <View style={styles.matrixFooter}>
                                    <Text style={styles.matrixFooterText}>
                                        {gridRows.length} {gridRows.length === 1 ? 'cancha' : 'canchas'} ·{' '}
                                        {gridRows.reduce((total, row) => total + row.slots.filter(slot => slot.status === 'AVAILABLE').length, 0)} horarios libres
                                    </Text>
                                    <StatusPill label={`${gridRows.reduce((total, row) => total + row.slots.filter(slot => slot.status === 'TAKEN').length, 0)} reservados`} tone="active" />
                                </View>
                            ) : null}
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

                                            <ChevronRight size={rem(14)} color={colors.textMuted} strokeWidth={2.2} />
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
                            <LegendItem color={colors.indigo} label="Con reservas" />
                            <LegendItem color={colors.amberBorder} label="Saldo pendiente" />
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

const LegendItem = ({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) => {
    const colors = useCourtsColors();
    const styles = getStyles(colors);
    return (
        <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: color }, dashed && styles.legendDashed]} />
            <Text style={styles.legendText}>{label}</Text>
        </View>
    );
};

const getStyles = (colors: CourtsPalette) => StyleSheet.create({
    flex: { flex: 1 },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    content: {
        padding: rem(2),
        gap: rem(courtsSpacing.lg),
        paddingBottom: rem(28),
    },
    errorBox: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: rem(10),
        borderRadius: rem(courtsRadii.md),
        borderWidth: 1,
        borderColor: colors.dangerBorder,
        backgroundColor: colors.dangerSoft,
        paddingHorizontal: rem(12),
        paddingVertical: rem(8),
    },
    errorText: {
        flex: 1,
        fontFamily: courtsFonts.semibold,
        fontSize: rem(courtsTypography.caption),
        color: colors.dangerDark,
    },
    dateStrip: {
        gap: rem(8),
        paddingVertical: rem(2),
    },
    datePill: {
        width: rem(52),
        height: rem(64),
        borderRadius: rem(courtsRadii.xl),
        backgroundColor: colors.surfaceLow,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        gap: rem(2),
    },
    datePillActive: {
        backgroundColor: colors.indigo,
        borderColor: colors.indigo,
    },
    dateLabel: {
        fontFamily: courtsFonts.semibold,
        fontSize: rem(10),
        color: colors.textMuted,
        textTransform: 'capitalize',
    },
    dateLabelActive: {
        color: colors.indigoMuted,
    },
    dateDay: {
        fontFamily: courtsFonts.extraBold,
        fontSize: rem(18),
        color: colors.text,
    },
    dateDayActive: {
        color: colors.white,
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
        color: colors.text,
    },
    sectionSubtitle: {
        marginTop: rem(2),
        fontFamily: courtsFonts.semibold,
        fontSize: rem(10),
        color: colors.textMuted,
        textTransform: 'capitalize',
    },
    legend: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: rem(10),
        marginBottom: rem(10),
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
        borderColor: colors.indigo,
        borderStyle: 'dashed',
    },
    legendText: {
        fontFamily: courtsFonts.medium,
        fontSize: rem(8),
        color: colors.textMuted,
    },
    matrixFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: rem(8),
        marginTop: rem(10),
    },
    matrixFooterText: {
        flex: 1,
        fontFamily: courtsFonts.semibold,
        fontSize: rem(9),
        color: colors.textMuted,
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
        borderColor: colors.border,
        backgroundColor: colors.surfaceMuted,
        padding: rem(10),
    },
    weekRowToday: {
        borderColor: colors.indigoBorder,
        backgroundColor: colors.indigoSoft,
    },
    weekDayBadge: {
        width: rem(42),
        height: rem(46),
        borderRadius: rem(courtsRadii.sm),
        backgroundColor: colors.surfaceLow,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    weekDayBadgeToday: {
        backgroundColor: colors.indigo,
        borderColor: colors.indigo,
    },
    weekDayLabel: {
        fontFamily: courtsFonts.semibold,
        fontSize: rem(8),
        color: colors.textMuted,
        textTransform: 'capitalize',
    },
    weekDayLabelToday: {
        color: colors.indigoMuted,
    },
    weekDayNumber: {
        fontFamily: courtsFonts.extraBold,
        fontSize: rem(16),
        color: colors.text,
    },
    weekDayNumberToday: {
        color: colors.white,
    },
    weekCopy: {
        flex: 1,
        minWidth: 0,
        gap: rem(2),
    },
    weekCount: {
        fontFamily: courtsFonts.extraBold,
        fontSize: rem(11),
        color: colors.text,
    },
    weekMoney: {
        fontFamily: courtsFonts.semibold,
        fontSize: rem(8),
        color: colors.textMuted,
    },
    weekBarTrack: {
        marginTop: rem(2),
        height: rem(4),
        borderRadius: rem(2),
        backgroundColor: colors.surfaceRaised,
        overflow: 'hidden',
    },
    weekBarFill: {
        height: '100%',
        borderRadius: rem(2),
        backgroundColor: colors.greenMid,
    },
    weekSample: {
        marginTop: rem(2),
        fontFamily: courtsFonts.medium,
        fontSize: rem(8),
        color: colors.textSoft,
    },
    weekEmpty: {
        marginTop: rem(2),
        fontFamily: courtsFonts.medium,
        fontSize: rem(8),
        color: colors.textSoft,
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
        color: colors.textMuted,
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
        borderColor: colors.border,
        backgroundColor: colors.surfaceLow,
        padding: rem(4),
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
    },
    monthCellOut: {
        backgroundColor: 'transparent',
        borderColor: 'transparent',
    },
    monthCellToday: {
        borderColor: colors.indigo,
        backgroundColor: colors.indigoSoft,
    },
    monthDay: {
        fontFamily: courtsFonts.extraBold,
        fontSize: rem(10),
        color: colors.text,
    },
    monthDayOut: {
        color: colors.borderStrong,
    },
    monthDayToday: {
        color: colors.indigoDark,
    },
    monthBadge: {
        position: 'absolute',
        right: rem(3),
        bottom: rem(3),
        minWidth: rem(15),
        height: rem(15),
        paddingHorizontal: rem(3),
        borderRadius: rem(8),
        backgroundColor: colors.greenSoft,
        alignItems: 'center',
        justifyContent: 'center',
    },
    monthBadgePending: {
        backgroundColor: colors.amber,
    },
    monthBadgeText: {
        fontFamily: courtsFonts.extraBold,
        fontSize: rem(8),
        color: colors.greenMid,
    },
    monthBadgeTextPending: {
        color: colors.amberText,
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
