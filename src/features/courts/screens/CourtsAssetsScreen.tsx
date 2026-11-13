import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from 'react-native';
import { Boxes, CircleCheck, CircleDollarSign, TriangleAlert } from 'lucide-react-native';
import { rem } from '@/core/utils/responsive';
import { CourtsService } from '../services/courtsService';
import { CourtAsset } from '../types/courts.types';
import { courtsColors, courtsFonts, courtsRadii, courtsShadow, courtsSpacing, courtsTypography } from '../theme/courtsTheme';
import { EmptyState, SectionCard } from '../components/CourtsUI';

export const CourtsAssetsScreen = () => {
    const { width } = useWindowDimensions();
    const twoColumns = width >= 760;
    const [assets, setAssets] = useState<CourtAsset[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async (refresh = false) => {
        if (refresh) setRefreshing(true);
        else setLoading(true);
        try {
            const data = await CourtsService.listCourtAssets();
            setAssets(data.filter(asset => asset.estado !== 'ELIMINADO'));
        } catch (error) {
            console.error('[CourtsAssets] Error loading assets', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    const totals = useMemo(() => assets.reduce((acc, asset) => {
        const stock = asset.resumen_stock;
        acc.total += Number(stock?.operativo || 0) + Number(stock?.alquilado || 0)
            + Number(stock?.danado || 0) + Number(stock?.mantenimiento || 0) + Number(stock?.perdido || 0);
        acc.available += Number(stock?.operativo || 0);
        acc.rented += Number(stock?.alquilado || 0);
        acc.damaged += Number(stock?.danado || 0) + Number(stock?.mantenimiento || 0);
        return acc;
    }, { total: 0, available: 0, rented: 0, damaged: 0 }), [assets]);

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator color={courtsColors.indigo} />
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            refreshControl={(
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={() => void load(true)}
                    tintColor={courtsColors.indigo}
                />
            )}
        >
            <SectionCard style={styles.summaryCard}>
                <View style={styles.summaryHeader}>
                    <View>
                        <Text style={styles.summaryEyebrow}>STOCK DE IMPLEMENTOS</Text>
                        <Text style={styles.summaryTitle}>{totals.total} unidades</Text>
                    </View>
                    <View style={styles.summaryIcon}>
                        <Boxes size={rem(22)} color={courtsColors.indigo} strokeWidth={2} />
                    </View>
                </View>
                <View style={styles.summaryRow}>
                    <SummaryItem icon={CircleCheck} label="Operativos" value={totals.available} tone="green" />
                    <SummaryItem icon={CircleDollarSign} label="Alquilados" value={totals.rented} tone="indigo" />
                    <SummaryItem icon={TriangleAlert} label="Novedades" value={totals.damaged} tone="amber" />
                </View>
            </SectionCard>

            {!assets.length ? (
                <SectionCard>
                    <EmptyState
                        icon={Boxes}
                        title="No hay implementos registrados"
                        message="Crea balones, petos o mobiliario desde Activos Fijos."
                    />
                </SectionCard>
            ) : (
                <View style={styles.grid}>
                    {assets.map(asset => (
                        <View key={asset.id} style={{ width: twoColumns ? '48.5%' : '100%' }}>
                            <AssetCard asset={asset} />
                        </View>
                    ))}
                </View>
            )}
        </ScrollView>
    );
};

const AssetCard = ({ asset }: { asset: CourtAsset }) => {
    const stock = asset.resumen_stock;
    const total = Number(stock?.operativo || 0) + Number(stock?.alquilado || 0)
        + Number(stock?.danado || 0) + Number(stock?.mantenimiento || 0) + Number(stock?.perdido || 0);
    const available = Number(stock?.operativo || 0);
    const percent = total ? Math.round((available / total) * 100) : 0;
    const isBall = (asset.categoria || '').toUpperCase().includes('BALON');
    const Icon = Boxes;

    return (
        <View style={styles.assetCard}>
            <View style={styles.assetHeader}>
                <View style={[styles.assetIcon, isBall ? styles.assetIconBall : styles.assetIconVest]}>
                    <Icon size={rem(18)} color={isBall ? courtsColors.indigo : courtsColors.greenMid} strokeWidth={2.1} />
                </View>
                <View style={styles.assetTitleWrap}>
                    <Text style={styles.assetName} numberOfLines={1}>{asset.nombre}</Text>
                    <Text style={styles.assetMeta} numberOfLines={1}>
                        {asset.categoria} · {asset.ubicacion || 'Sin ubicación'}
                    </Text>
                </View>
                <View style={styles.stockPill}>
                    <Text style={styles.stockPillText}>{available} disp.</Text>
                </View>
            </View>

            <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${percent}%` }]} />
            </View>

            <View style={styles.assetStats}>
                <AssetStat label="OPERATIVOS" value={available} />
                <AssetStat label="ALQUILADOS" value={Number(stock?.alquilado || 0)} />
                <AssetStat label="DAÑADOS" value={Number(stock?.danado || 0)} />
                <AssetStat label="PERDIDOS" value={Number(stock?.perdido || 0)} />
            </View>
        </View>
    );
};

const SummaryItem = ({
    icon: Icon,
    label,
    value,
    tone,
}: {
    icon: typeof CircleCheck;
    label: string;
    value: number;
    tone: 'green' | 'indigo' | 'amber';
}) => {
    const color = tone === 'green' ? courtsColors.greenMid : tone === 'amber' ? courtsColors.amberText : courtsColors.indigo;
    return (
        <View style={styles.summaryItem}>
            <Icon size={rem(15)} color={color} strokeWidth={2.2} />
            <Text style={styles.summaryValue}>{value}</Text>
            <Text style={styles.summaryLabel}>{label}</Text>
        </View>
    );
};

const AssetStat = ({ label, value }: { label: string; value: number }) => (
    <View style={styles.assetStat}>
        <Text style={styles.assetStatLabel}>{label}</Text>
        <Text style={styles.assetStatValue}>{value}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: courtsColors.background,
    },
    content: {
        padding: rem(courtsSpacing.lg),
        gap: rem(courtsSpacing.lg),
        paddingBottom: rem(40),
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: courtsColors.background,
    },
    summaryCard: {
        padding: rem(courtsSpacing.xxl),
    },
    summaryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: rem(10),
    },
    summaryEyebrow: {
        fontFamily: courtsFonts.extraBold,
        fontSize: rem(courtsTypography.nano),
        letterSpacing: 1.2,
        color: courtsColors.indigoDark,
    },
    summaryTitle: {
        marginTop: rem(3),
        fontFamily: courtsFonts.extraBold,
        fontSize: rem(22),
        color: courtsColors.text,
    },
    summaryIcon: {
        width: rem(46),
        height: rem(46),
        borderRadius: rem(15),
        backgroundColor: courtsColors.indigoSoft,
        alignItems: 'center',
        justifyContent: 'center',
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: rem(8),
        marginTop: rem(16),
    },
    summaryItem: {
        flex: 1,
        alignItems: 'center',
        gap: rem(2),
        borderRadius: rem(courtsRadii.md),
        backgroundColor: courtsColors.surfaceLow,
        paddingVertical: rem(10),
    },
    summaryValue: {
        fontFamily: courtsFonts.extraBold,
        fontSize: rem(19),
        color: courtsColors.text,
    },
    summaryLabel: {
        fontFamily: courtsFonts.bold,
        fontSize: rem(courtsTypography.nano),
        color: courtsColors.textMuted,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: rem(12),
    },
    assetCard: {
        backgroundColor: courtsColors.surface,
        borderRadius: rem(courtsRadii.card),
        borderWidth: 1,
        borderColor: courtsColors.border,
        padding: rem(16),
        ...courtsShadow.card,
    },
    assetHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: rem(10),
    },
    assetIcon: {
        width: rem(42),
        height: rem(42),
        borderRadius: rem(13),
        alignItems: 'center',
        justifyContent: 'center',
    },
    assetIconBall: {
        backgroundColor: courtsColors.indigoSoft,
    },
    assetIconVest: {
        backgroundColor: courtsColors.greenSoft,
    },
    assetTitleWrap: {
        flex: 1,
        minWidth: 0,
    },
    assetName: {
        fontFamily: courtsFonts.extraBold,
        fontSize: rem(courtsTypography.cardTitle),
        color: courtsColors.text,
    },
    assetMeta: {
        marginTop: rem(2),
        fontFamily: courtsFonts.semibold,
        fontSize: rem(courtsTypography.nano),
        color: courtsColors.textMuted,
    },
    stockPill: {
        borderRadius: rem(courtsRadii.pill),
        backgroundColor: courtsColors.greenSoft,
        paddingHorizontal: rem(8),
        paddingVertical: rem(4),
    },
    stockPillText: {
        fontFamily: courtsFonts.extraBold,
        fontSize: rem(courtsTypography.nano),
        color: courtsColors.greenMid,
    },
    progressTrack: {
        marginTop: rem(12),
        height: rem(7),
        borderRadius: rem(4),
        backgroundColor: courtsColors.surfaceLow,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: rem(4),
        backgroundColor: courtsColors.lime,
    },
    assetStats: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: rem(6),
        marginTop: rem(12),
    },
    assetStat: {
        flex: 1,
        alignItems: 'center',
        gap: rem(1),
    },
    assetStatLabel: {
        fontFamily: courtsFonts.extraBold,
        fontSize: rem(7.5),
        letterSpacing: 0.4,
        color: courtsColors.textSoft,
    },
    assetStatValue: {
        fontFamily: courtsFonts.extraBold,
        fontSize: rem(14),
        color: courtsColors.text,
    },
});
