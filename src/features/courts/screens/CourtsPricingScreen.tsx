import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from 'react-native';
import {
    CalendarX2,
    Clock,
    Pencil,
    Percent,
    Plus,
    RotateCcw,
    Store,
    Tag,
    Ticket,
    Trash2,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { rem } from '@/core/utils/responsive';
import { CourtsService } from '../services/courtsService';
import { Court, Promotion, Rate } from '../types/courts.types';
import {
    dayLabel,
    formatMoneyNoDecimals,
    promotionTimeLabel,
    promotionValueLabel,
    rateKey,
    roundAmount,
} from '../utils/formatters';
import {
    CourtsPalette,
    courtsFonts,
    courtsRadii,
    courtsShadow,
    courtsSpacing,
    courtsTypography,
    useCourtsColors,
} from '../theme/courtsTheme';
import { CourtsHero, CourtHeroStat } from '../components/CourtsHero';
import {
    CourtsFilterTabs,
    CourtsFilterValue,
    EmptyState,
    IconButton,
    PrimaryButton,
    SectionCard,
    SectionHeader,
    StatusPill,
    TagPill,
} from '../components/CourtsUI';
import { RateFormModal } from '../components/RateFormModal';
import { PromotionFormModal } from '../components/PromotionFormModal';
import { PromotionExceptionsModal } from '../components/PromotionExceptionsModal';
import { CourtsConfirmModal } from '../components/CourtsConfirmModal';

type PricingTab = 'RATES' | 'PROMOTIONS';

export const CourtsPricingScreen = () => {
    const colors = useCourtsColors();
    const styles = getStyles(colors);
    const { width } = useWindowDimensions();
    const twoColumns = width >= 760;
    const [courts, setCourts] = useState<Court[]>([]);
    const [selectedCourtId, setSelectedCourtId] = useState('');
    const [rates, setRates] = useState<Rate[]>([]);
    const [promotions, setPromotions] = useState<Promotion[]>([]);
    const [tab, setTab] = useState<PricingTab>('RATES');
    const [rateFilter, setRateFilter] = useState<CourtsFilterValue>('ACTIVE');
    const [promoFilter, setPromoFilter] = useState<CourtsFilterValue>('ACTIVE');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [rateModalVisible, setRateModalVisible] = useState(false);
    const [editingRate, setEditingRate] = useState<Rate | null>(null);
    const [promoModalVisible, setPromoModalVisible] = useState(false);
    const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
    const [exceptionsVisible, setExceptionsVisible] = useState(false);
    const [exceptionsPromotion, setExceptionsPromotion] = useState<Promotion | null>(null);

    const [confirm, setConfirm] = useState<{
        visible: boolean;
        title: string;
        message: string;
        type: 'danger' | 'warning' | 'info';
        action: () => Promise<void> | void;
    }>({
        visible: false,
        title: '',
        message: '',
        type: 'danger',
        action: () => undefined,
    });
    const [confirmLoading, setConfirmLoading] = useState(false);

    const loadRates = useCallback(async (courtId: string) => {
        if (!courtId) {
            setRates([]);
            return;
        }
        const data = await CourtsService.listRates(courtId);
        setRates(data);
    }, []);

    const load = useCallback(async (refresh = false) => {
        if (refresh) setRefreshing(true);
        else setLoading(true);
        try {
            const [courtList, promotionList] = await Promise.all([
                CourtsService.listCourts(false),
                CourtsService.listPromotions(),
            ]);
            setCourts(courtList);
            setPromotions(promotionList);
            const preferred = selectedCourtId && courtList.some(court => court.court_id === selectedCourtId)
                ? selectedCourtId
                : courtList[0]?.court_id || '';
            setSelectedCourtId(preferred);
            await loadRates(preferred);
        } catch (error) {
            console.error('[CourtsPricing] Error loading', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [loadRates, selectedCourtId]);

    useEffect(() => {
        void load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const activeRates = useMemo(() => rates.filter(rate => rate.active !== false), [rates]);
    const activePromotions = useMemo(() => promotions.filter(promo => promo.active !== false), [promotions]);

    const filteredRates = useMemo(() => {
        if (rateFilter === 'ALL') return rates;
        if (rateFilter === 'INACTIVE') return rates.filter(rate => rate.active === false);
        return rates.filter(rate => rate.active !== false);
    }, [rates, rateFilter]);

    const filteredPromotions = useMemo(() => {
        if (promoFilter === 'ALL') return promotions;
        if (promoFilter === 'INACTIVE') return promotions.filter(promo => promo.active === false);
        return promotions.filter(promo => promo.active !== false);
    }, [promotions, promoFilter]);

    const averageRate = useMemo(() => {
        if (!activeRates.length) return 0;
        return Math.round(activeRates.reduce((sum, rate) => sum + roundAmount(rate.price_per_hour), 0) / activeRates.length);
    }, [activeRates]);

    const maxRate = useMemo(
        () => activeRates.length ? Math.max(...activeRates.map(rate => roundAmount(rate.price_per_hour))) : 0,
        [activeRates]
    );

    const todayRateCount = useMemo(() => {
        const weekday = (new Date().getDay() + 6) % 7;
        return activeRates.filter(rate => !rate.days_of_week?.length || rate.days_of_week.includes(weekday)).length;
    }, [activeRates]);

    const heroStats: CourtHeroStat[] = useMemo(() => {
        if (tab === 'RATES') {
            return [
                { label: 'ACTIVAS', value: activeRates.length, icon: Percent, tone: 'indigo' },
                { label: 'FRANJAS HOY', value: todayRateCount, icon: Clock, tone: 'green' },
                { label: 'PRECIO MÁXIMO', value: formatMoneyNoDecimals(maxRate), icon: Tag, tone: 'amber' },
                { label: 'DE TIENDA', value: activeRates.filter(rate => rate.scope === 'STORE').length, icon: Store, tone: 'soft' },
            ];
        }
        const exceptionCount = activePromotions.reduce((sum, promo) => sum
            + (promo.exceptions?.dates?.length || 0)
            + (promo.exceptions?.iso_weeks?.length || 0)
            + (promo.exceptions?.weekdays?.length || 0), 0);
        return [
            { label: 'ACTIVAS', value: activePromotions.length, icon: Percent, tone: 'indigo' },
            { label: 'USOS', value: activePromotions.reduce((sum, promo) => sum + Number(promo.used_count || 0), 0), icon: Ticket, tone: 'green' },
            { label: 'CON CÓDIGO', value: activePromotions.filter(promo => !!promo.code).length, icon: Tag, tone: 'amber' },
            { label: 'EXCEPCIONES', value: exceptionCount, icon: CalendarX2, tone: 'soft' },
        ];
    }, [tab, activeRates, activePromotions, todayRateCount, maxRate]);

    const heroValue = tab === 'RATES' ? formatMoneyNoDecimals(averageRate) : activePromotions.length;
    const heroSuffix = tab === 'RATES' ? '/h' : `/${promotions.length}`;
    const heroProgress = tab === 'RATES'
        ? (rates.length ? Math.round((activeRates.length / rates.length) * 100) : 0)
        : (promotions.length ? Math.round((activePromotions.length / promotions.length) * 100) : 0);
    const heroHint = tab === 'RATES'
        ? `${activeRates.length} tarifas activas de ${rates.length}. Se aplican por franja y prioridad.`
        : `${activePromotions.length} promociones activas de ${promotions.length}. Puedes pausarlas por fecha o semana.`;

    const selectCourt = async (courtId: string) => {
        setSelectedCourtId(courtId);
        try {
            await loadRates(courtId);
        } catch (error) {
            console.error('[CourtsPricing] Error loading rates', error);
        }
    };

    const requestDeleteRate = (rate: Rate) => {
        setConfirm({
            visible: true,
            title: 'Desactivar tarifa',
            message: `La tarifa "${rate.name}" quedará inactiva y dejará de aplicarse en los precios.`,
            type: 'danger',
            action: async () => {
                await CourtsService.deleteRate(rate.rate_id, selectedCourtId, rate.scope);
                await loadRates(selectedCourtId);
            },
        });
    };

    const requestDeletePromotion = (promotion: Promotion) => {
        setConfirm({
            visible: true,
            title: 'Desactivar promoción',
            message: `La promoción "${promotion.name}" quedará inactiva y no se aplicará en nuevas reservas.`,
            type: 'danger',
            action: async () => {
                await CourtsService.deletePromotion(promotion.promo_id);
                setPromotions(await CourtsService.listPromotions());
            },
        });
    };

    const confirmAction = async () => {
        try {
            setConfirmLoading(true);
            await confirm.action();
            setConfirm(current => ({ ...current, visible: false }));
        } catch (error) {
            console.error('[CourtsPricing] Confirm action error', error);
        } finally {
            setConfirmLoading(false);
        }
    };

    if (loading) {
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
                        onRefresh={() => void load(true)}
                        tintColor={colors.indigo}
                    />
                )}
            >
                <CourtsHero
                    eyebrow={tab === 'RATES' ? 'TARIFA PROMEDIO / HORA' : 'PROMOCIONES ACTIVAS'}
                    value={heroValue}
                    suffix={heroSuffix}
                    progress={heroProgress}
                    hint={heroHint}
                    stats={heroStats}
                    compact
                />

                <View style={styles.tabs}>
                    <Pressable
                        onPress={() => setTab('RATES')}
                        style={[styles.tab, tab === 'RATES' && styles.tabActive]}
                    >
                        <Percent size={rem(13)} color={tab === 'RATES' ? colors.white : colors.textMuted} />
                        <Text style={[styles.tabText, tab === 'RATES' && styles.tabTextActive]}>Tarifas</Text>
                        <View style={[styles.tabCount, tab === 'RATES' && styles.tabCountActive]}>
                            <Text style={[styles.tabCountText, tab === 'RATES' && styles.tabCountTextActive]}>{rates.length}</Text>
                        </View>
                    </Pressable>
                    <Pressable
                        onPress={() => setTab('PROMOTIONS')}
                        style={[styles.tab, tab === 'PROMOTIONS' && styles.tabActive]}
                    >
                        <Ticket size={rem(13)} color={tab === 'PROMOTIONS' ? colors.white : colors.textMuted} />
                        <Text style={[styles.tabText, tab === 'PROMOTIONS' && styles.tabTextActive]}>Promociones</Text>
                        <View style={[styles.tabCount, tab === 'PROMOTIONS' && styles.tabCountActive]}>
                            <Text style={[styles.tabCountText, tab === 'PROMOTIONS' && styles.tabCountTextActive]}>{promotions.length}</Text>
                        </View>
                    </Pressable>
                </View>

                {tab === 'RATES' ? (
                    <SectionCard>
                        <SectionHeader
                            title="Tarifas por franja"
                            subtitle={courts.find(court => court.court_id === selectedCourtId)?.name || 'Selecciona una cancha'}
                            right={(
                                <PrimaryButton
                                    label="Nueva"
                                    icon={Plus}
                                    compact
                                    onPress={() => {
                                        setEditingRate(null);
                                        setRateModalVisible(true);
                                    }}
                                />
                            )}
                        />
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.courtChips}>
                            {courts.map(court => {
                                const active = court.court_id === selectedCourtId;
                                return (
                                    <Pressable
                                        key={court.court_id}
                                        onPress={() => void selectCourt(court.court_id)}
                                        style={[styles.courtChip, active && styles.courtChipActive]}
                                    >
                                        <Text style={[styles.courtChipText, active && styles.courtChipTextActive]} numberOfLines={1}>
                                            {court.name}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </ScrollView>
                        <CourtsFilterTabs
                            value={rateFilter}
                            onChange={setRateFilter}
                            options={[
                                { value: 'ACTIVE', label: 'Activas' },
                                { value: 'ALL', label: 'Todas' },
                                { value: 'INACTIVE', label: 'Inactivas' },
                            ]}
                        />
                        <View style={styles.list}>
                            {!filteredRates.length ? (
                                <EmptyState
                                    icon={Percent}
                                    title="No hay tarifas en este filtro"
                                    message="Crea una franja para horarios pico, valle o fines de semana."
                                    actionLabel="Crear tarifa"
                                    onAction={() => {
                                        setEditingRate(null);
                                        setRateModalVisible(true);
                                    }}
                                />
                            ) : filteredRates.map(rate => (
                                <RateCard
                                    key={rateKey(rate)}
                                    rate={rate}
                                    onEdit={() => {
                                        setEditingRate(rate);
                                        setRateModalVisible(true);
                                    }}
                                    onDelete={() => requestDeleteRate(rate)}
                                    onReactivate={() => {
                                        void CourtsService.updateRate(rate.rate_id, selectedCourtId, { ...rate, active: true })
                                            .then(() => loadRates(selectedCourtId))
                                            .catch(error => console.error('[CourtsPricing] Error reactivating rate', error));
                                    }}
                                />
                            ))}
                        </View>
                    </SectionCard>
                ) : (
                    <SectionCard>
                        <SectionHeader
                            title="Promociones"
                            subtitle="Imagen, código, días y excepciones"
                            right={(
                                <PrimaryButton
                                    label="Nueva"
                                    icon={Plus}
                                    compact
                                    onPress={() => {
                                        setEditingPromotion(null);
                                        setPromoModalVisible(true);
                                    }}
                                />
                            )}
                        />
                        <CourtsFilterTabs
                            value={promoFilter}
                            onChange={setPromoFilter}
                            options={[
                                { value: 'ACTIVE', label: 'Activas' },
                                { value: 'ALL', label: 'Todas' },
                                { value: 'INACTIVE', label: 'Inactivas' },
                            ]}
                        />
                        <View style={styles.promoGrid}>
                            {!filteredPromotions.length ? (
                                <EmptyState
                                    icon={Ticket}
                                    title="No hay promociones en este filtro"
                                    message="Crea combos o descuentos por día, horario o ambos."
                                    actionLabel="Crear promoción"
                                    onAction={() => {
                                        setEditingPromotion(null);
                                        setPromoModalVisible(true);
                                    }}
                                />
                            ) : filteredPromotions.map(promo => (
                                <View key={promo.promo_id} style={{ width: twoColumns ? '48.5%' : '100%' }}>
                                    <PromoCard
                                        promotion={promo}
                                        onEdit={() => {
                                            setEditingPromotion(promo);
                                            setPromoModalVisible(true);
                                        }}
                                        onDelete={() => requestDeletePromotion(promo)}
                                        onExceptions={() => {
                                            setExceptionsPromotion(promo);
                                            setExceptionsVisible(true);
                                        }}
                                        onReactivate={() => {
                                            void CourtsService.updatePromotion(promo.promo_id, { ...promo, active: true })
                                                .then(() => CourtsService.listPromotions())
                                                .then(setPromotions)
                                                .catch(error => console.error('[CourtsPricing] Error reactivating promo', error));
                                        }}
                                    />
                                </View>
                            ))}
                        </View>
                    </SectionCard>
                )}
            </ScrollView>

            <RateFormModal
                visible={rateModalVisible}
                rate={editingRate}
                courtId={selectedCourtId}
                onClose={() => setRateModalVisible(false)}
                onSaved={() => {
                    setRateModalVisible(false);
                    void loadRates(selectedCourtId);
                }}
            />
            <PromotionFormModal
                visible={promoModalVisible}
                promotion={editingPromotion}
                onClose={() => setPromoModalVisible(false)}
                onSaved={() => {
                    setPromoModalVisible(false);
                    void CourtsService.listPromotions().then(setPromotions);
                }}
            />
            <PromotionExceptionsModal
                visible={exceptionsVisible}
                promotion={exceptionsPromotion}
                onClose={() => setExceptionsVisible(false)}
                onChanged={() => {
                    void CourtsService.listPromotions().then(setPromotions);
                }}
            />
            <CourtsConfirmModal
                visible={confirm.visible}
                title={confirm.title}
                message={confirm.message}
                type={confirm.type}
                loading={confirmLoading}
                onConfirm={() => void confirmAction()}
                onCancel={() => setConfirm(current => ({ ...current, visible: false }))}
            />
        </View>
    );
};

const RateCard = ({
    rate,
    onEdit,
    onDelete,
    onReactivate,
}: {
    rate: Rate;
    onEdit: () => void;
    onDelete: () => void;
    onReactivate: () => void;
}) => {
    const colors = useCourtsColors();
    const styles = getStyles(colors);
    return (
        <View style={[styles.rateCard, rate.active === false && styles.off]}>
            <View style={styles.rateTopRow}>
                <View style={styles.rateMain}>
                    <View style={styles.rateTitleRow}>
                        <Text style={styles.rateName}>{rate.name}</Text>
                        <StatusPill label={rate.active === false ? 'Inactiva' : 'Activa'} tone={rate.active === false ? 'inactive' : 'active'} />
                        <TagPill label={rate.scope === 'STORE' ? 'Tienda' : 'Cancha'} />
                    </View>
                    <Text style={styles.rateMeta}>
                        {rate.start_time} – {rate.end_time} · prioridad {rate.priority}
                    </Text>
                    <View style={styles.days}>
                        {(rate.days_of_week || []).length ? rate.days_of_week.map(day => (
                            <Text key={day} style={styles.dayPill}>{dayLabel(day)}</Text>
                        )) : <Text style={styles.dayPill}>Todos los días</Text>}
                    </View>
                </View>
                <View style={styles.rateSide}>
                    <Text style={styles.ratePrice}>{formatMoneyNoDecimals(rate.price_per_hour)}</Text>
                    <Text style={styles.ratePriceLabel}>por hora</Text>
                </View>
            </View>
            <View style={styles.rateActions}>
                {rate.active === false ? (
                    <PrimaryButton label="Reactivar" variant="ghost" compact icon={RotateCcw} onPress={onReactivate} />
                ) : (
                    <>
                        <IconButton icon={Pencil} label="Editar tarifa" onPress={onEdit} />
                        <IconButton icon={Trash2} label="Desactivar tarifa" variant="danger" onPress={onDelete} />
                    </>
                )}
            </View>
        </View>
    );
};

const PromoCard = ({
    promotion,
    onEdit,
    onDelete,
    onExceptions,
    onReactivate,
}: {
    promotion: Promotion;
    onEdit: () => void;
    onDelete: () => void;
    onExceptions: () => void;
    onReactivate: () => void;
}) => {
    const colors = useCourtsColors();
    const styles = getStyles(colors);
    const image = promotion.images?.[0] || null;
    return (
        <View style={[styles.promoCard, promotion.active === false && styles.off]}>
            <View style={styles.promoMedia}>
                {image ? (
                    <Image source={{ uri: image }} style={styles.promoImage} resizeMode="cover" />
                ) : (
                    <View style={styles.promoPlaceholder}>
                        <Percent size={rem(34)} color="rgba(255,255,255,0.55)" />
                    </View>
                )}
                <View style={styles.promoStatus}>
                    <StatusPill label={promotion.active === false ? 'Inactiva' : 'Activa'} tone={promotion.active === false ? 'inactive' : 'active'} />
                </View>
                <View style={styles.promoValue}>
                    <Text style={styles.promoValueText}>{promotionValueLabel(promotion)}</Text>
                </View>
            </View>
            <View style={styles.promoBody}>
                <Text style={styles.promoName} numberOfLines={1}>{promotion.name}</Text>
                <Text style={styles.promoMeta} numberOfLines={1}>
                    {promotion.type === 'PERCENT' ? 'Porcentaje' : promotion.type === 'FIXED' ? 'Monto fijo' : '2x1'} · {promotionTimeLabel(promotion)}
                </Text>
                <View style={styles.days}>
                    {(promotion.days_of_week || []).length ? promotion.days_of_week.map(day => (
                        <Text key={day} style={styles.dayPill}>{dayLabel(day)}</Text>
                    )) : <Text style={styles.dayPill}>Todos los días</Text>}
                </View>
                {promotion.code ? (
                    <View style={styles.promoCode}>
                        <Ticket size={rem(9)} color={colors.indigoDark} />
                        <Text style={styles.promoCodeText}>{promotion.code}</Text>
                    </View>
                ) : null}
            </View>
            <View style={styles.promoActions}>
                {promotion.active === false ? (
                    <PrimaryButton label="Reactivar" variant="ghost" compact icon={RotateCcw} onPress={onReactivate} />
                ) : (
                    <>
                        <PrimaryButton label="Excepciones" variant="ghost" compact icon={CalendarX2} onPress={onExceptions} />
                        <IconButton icon={Pencil} label="Editar promoción" onPress={onEdit} />
                        <IconButton icon={Trash2} label="Desactivar promoción" variant="danger" onPress={onDelete} />
                    </>
                )}
            </View>
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
    },
    content: {
        padding: rem(2),
        gap: rem(courtsSpacing.lg),
        paddingBottom: rem(24),
    },
    tabs: {
        flexDirection: 'row',
        gap: rem(6),
        padding: rem(5),
        borderRadius: rem(courtsRadii.lg),
        backgroundColor: colors.surfaceLow,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: rem(5),
        borderRadius: rem(courtsRadii.md),
        paddingVertical: rem(9),
        minHeight: rem(42),
    },
    tabActive: {
        backgroundColor: colors.surface,
        ...courtsShadow.soft,
    },
    tabText: {
        fontFamily: courtsFonts.bold,
        fontSize: rem(11),
        color: colors.textMuted,
    },
    tabTextActive: {
        color: colors.text,
    },
    tabCount: {
        minWidth: rem(17),
        height: rem(17),
        borderRadius: rem(9),
        backgroundColor: colors.indigoSoft,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: rem(4),
    },
    tabCountActive: {
        backgroundColor: colors.indigo,
    },
    tabCountText: {
        fontFamily: courtsFonts.extraBold,
        fontSize: rem(8),
        color: colors.indigoDark,
    },
    tabCountTextActive: {
        color: colors.white,
    },
    courtChips: {
        gap: rem(6),
        paddingVertical: rem(2),
        marginBottom: rem(10),
    },
    courtChip: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: rem(courtsRadii.pill),
        backgroundColor: colors.surface,
        paddingHorizontal: rem(12),
        paddingVertical: rem(8),
        maxWidth: rem(160),
    },
    courtChipActive: {
        backgroundColor: colors.indigo,
        borderColor: colors.indigo,
    },
    courtChipText: {
        fontFamily: courtsFonts.bold,
        fontSize: rem(10),
        color: colors.textMuted,
    },
    courtChipTextActive: {
        color: colors.white,
    },
    list: {
        gap: rem(10),
        marginTop: rem(12),
    },
    rateCard: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: rem(courtsRadii.xl),
        backgroundColor: colors.surfaceLow,
        padding: rem(14),
        gap: rem(8),
    },
    off: {
        opacity: 0.66,
    },
    rateTopRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: rem(10),
    },
    rateMain: {
        flex: 1,
        gap: rem(3),
        minWidth: 0,
    },
    rateTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: rem(6),
        flexWrap: 'wrap',
    },
    rateName: {
        fontFamily: courtsFonts.extraBold,
        fontSize: rem(13),
        color: colors.text,
    },
    rateMeta: {
        fontFamily: courtsFonts.semibold,
        fontSize: rem(10),
        color: colors.textMuted,
    },
    days: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: rem(4),
        marginTop: rem(4),
    },
    dayPill: {
        fontFamily: courtsFonts.extraBold,
        fontSize: rem(8),
        color: colors.indigoDark,
        backgroundColor: colors.indigoSoft,
        borderRadius: rem(courtsRadii.pill),
        paddingHorizontal: rem(7),
        paddingVertical: rem(3),
        overflow: 'hidden',
    },
    rateSide: {
        alignItems: 'flex-end',
    },
    ratePrice: {
        fontFamily: courtsFonts.extraBold,
        fontSize: rem(16),
        color: colors.green,
    },
    ratePriceLabel: {
        fontFamily: courtsFonts.bold,
        fontSize: rem(8),
        color: colors.textSoft,
    },
    rateActions: {
        flexDirection: 'row',
        gap: rem(6),
        justifyContent: 'flex-end',
    },
    promoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: rem(12),
        marginTop: rem(12),
    },
    promoCard: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: rem(courtsRadii.xxl),
        backgroundColor: colors.surfaceLow,
        overflow: 'hidden',
        ...courtsShadow.card,
    },
    promoMedia: {
        aspectRatio: 16 / 9,
        backgroundColor: colors.borderSoft,
    },
    promoImage: {
        width: '100%',
        height: '100%',
    },
    promoPlaceholder: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.indigoDark,
    },
    promoStatus: {
        position: 'absolute',
        top: rem(10),
        left: rem(10),
    },
    promoValue: {
        position: 'absolute',
        right: rem(10),
        bottom: rem(10),
        borderRadius: rem(courtsRadii.pill),
        backgroundColor: 'rgba(20,83,45,0.92)',
        paddingHorizontal: rem(9),
        paddingVertical: rem(4),
    },
    promoValueText: {
        fontFamily: courtsFonts.extraBold,
        fontSize: rem(11),
        color: colors.limeSoft,
    },
    promoBody: {
        paddingHorizontal: rem(14),
        paddingTop: rem(12),
        paddingBottom: rem(6),
        gap: rem(2),
    },
    promoName: {
        fontFamily: courtsFonts.extraBold,
        fontSize: rem(14),
        color: colors.text,
    },
    promoMeta: {
        fontFamily: courtsFonts.semibold,
        fontSize: rem(9),
        color: colors.textMuted,
    },
    promoCode: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: rem(4),
        alignSelf: 'flex-start',
        marginTop: rem(6),
        borderRadius: rem(courtsRadii.pill),
        backgroundColor: colors.indigoSoft,
        paddingHorizontal: rem(8),
        paddingVertical: rem(4),
    },
    promoCodeText: {
        fontFamily: courtsFonts.extraBold,
        fontSize: rem(9),
        color: colors.indigoDark,
    },
    promoActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: rem(6),
        paddingHorizontal: rem(12),
        paddingBottom: rem(12),
        paddingTop: rem(4),
        flexWrap: 'wrap',
    },
});
