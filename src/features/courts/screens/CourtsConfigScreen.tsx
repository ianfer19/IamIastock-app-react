import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from 'react-native';
import {
    CircleOff,
    Goal,
    Pencil,
    Plus,
    Settings2,
    Trash2,
    Wrench,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { rem } from '@/core/utils/responsive';
import { CourtsService } from '../services/courtsService';
import { Court, CourtAttributeDef, CourtBlock, CourtSettings } from '../types/courts.types';
import {
    attributeTypeLabel,
    courtErrorMessage,
    formatDateShort,
} from '../utils/formatters';
import {
    courtsColors,
    courtsFonts,
    courtsRadii,
    courtsSpacing,
    courtsTypography,
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
    TextField,
} from '../components/CourtsUI';
import { CourtCard } from '../components/CourtCard';
import { CourtFormModal } from '../components/CourtFormModal';
import { AttributeFormModal } from '../components/AttributeFormModal';
import { BlockFormModal } from '../components/BlockFormModal';
import { CourtsConfirmModal } from '../components/CourtsConfirmModal';

type AttributeFilter = 'ACTIVE' | 'ALL';
type BlockFilter = 'ACTIVE' | 'ALL';

export const CourtsConfigScreen = () => {
    const { width } = useWindowDimensions();
    const twoColumns = width >= 760;
    const [courts, setCourts] = useState<Court[]>([]);
    const [attributes, setAttributes] = useState<CourtAttributeDef[]>([]);
    const [blocks, setBlocks] = useState<CourtBlock[]>([]);
    const [settings, setSettings] = useState<CourtSettings | null>(null);
    const [selectedCourtId, setSelectedCourtId] = useState('');
    const [courtFilter, setCourtFilter] = useState<CourtsFilterValue>('ACTIVE');
    const [attributeFilter, setAttributeFilter] = useState<AttributeFilter>('ACTIVE');
    const [blockFilter, setBlockFilter] = useState<BlockFilter>('ACTIVE');
    const [publicBaseUrl, setPublicBaseUrl] = useState('');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [savingSettings, setSavingSettings] = useState(false);

    const [courtModalVisible, setCourtModalVisible] = useState(false);
    const [editingCourt, setEditingCourt] = useState<Court | null>(null);
    const [attributeModalVisible, setAttributeModalVisible] = useState(false);
    const [editingAttribute, setEditingAttribute] = useState<CourtAttributeDef | null>(null);
    const [blockModalVisible, setBlockModalVisible] = useState(false);

    const [confirm, setConfirm] = useState<{
        visible: boolean;
        title: string;
        message: string;
        confirmText: string;
        type: 'danger' | 'warning' | 'info';
        action: () => Promise<void> | void;
    }>({
        visible: false,
        title: '',
        message: '',
        confirmText: 'Confirmar',
        type: 'danger',
        action: () => undefined,
    });
    const [confirmLoading, setConfirmLoading] = useState(false);

    const load = useCallback(async (refresh = false) => {
        if (refresh) setRefreshing(true);
        else setLoading(true);
        try {
            const [courtList, attributeList, settingsData] = await Promise.all([
                CourtsService.listCourts(true),
                CourtsService.listAttributes(),
                CourtsService.getSettings().catch(() => null),
            ]);
            setCourts(courtList);
            setAttributes(attributeList);
            if (settingsData) {
                setSettings(settingsData);
                setPublicBaseUrl(settingsData.public_base_url || '');
            }
            const preferred = selectedCourtId && courtList.some(court => court.court_id === selectedCourtId)
                ? selectedCourtId
                : courtList[0]?.court_id || '';
            setSelectedCourtId(preferred);
            if (preferred) {
                const blockList = await CourtsService.listBlocks(preferred);
                setBlocks(blockList);
            } else {
                setBlocks([]);
            }
        } catch (error) {
            console.error('[CourtsConfig] Error loading', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [selectedCourtId]);

    useEffect(() => {
        void load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const activeAttributes = useMemo(
        () => attributes.filter(attribute => attribute.active !== false),
        [attributes]
    );

    const filteredCourts = useMemo(() => {
        if (courtFilter === 'ALL') return courts;
        if (courtFilter === 'INACTIVE') return courts.filter(court => court.status === 'INACTIVE');
        return courts.filter(court => court.status !== 'INACTIVE');
    }, [courts, courtFilter]);

    const filteredAttributes = useMemo(() => {
        if (attributeFilter === 'ALL') return attributes;
        return attributes.filter(attribute => attribute.active !== false);
    }, [attributes, attributeFilter]);

    const filteredBlocks = useMemo(() => {
        if (blockFilter === 'ALL') return blocks;
        return blocks.filter(block => String(block.status || 'ACTIVE').toUpperCase() !== 'DELETED');
    }, [blocks, blockFilter]);

    const selectedCourtName = useMemo(
        () => courts.find(court => court.court_id === selectedCourtId)?.name || 'Selecciona una cancha',
        [courts, selectedCourtId]
    );

    const heroStats: CourtHeroStat[] = useMemo(() => [
        { label: 'TOTAL', value: courts.length, icon: Goal, tone: 'indigo' },
        { label: 'ACTIVAS', value: courts.filter(court => court.status === 'ACTIVE').length, icon: Goal, tone: 'green' },
        { label: 'MANTENIMIENTO', value: courts.filter(court => court.status === 'MAINTENANCE').length, icon: Wrench, tone: 'amber' },
        { label: 'INACTIVAS', value: courts.filter(court => court.status === 'INACTIVE').length, icon: CircleOff, tone: 'soft' },
    ], [courts]);

    const openCourtModal = (court: Court | null) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setEditingCourt(court);
        setCourtModalVisible(true);
    };

    const openAttributeModal = (attribute: CourtAttributeDef | null) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setEditingAttribute(attribute);
        setAttributeModalVisible(true);
    };

    const selectCourtForBlocks = async (courtId: string) => {
        setSelectedCourtId(courtId);
        try {
            const blockList = await CourtsService.listBlocks(courtId);
            setBlocks(blockList);
        } catch (error) {
            console.error('[CourtsConfig] Error loading blocks', error);
        }
    };

    const requestDeactivateCourt = (court: Court) => {
        setConfirm({
            visible: true,
            title: 'Desactivar cancha',
            message: `La cancha "${court.name}" quedará inactiva y no aparecerá en la agenda. Podrás reactivarla después.`,
            confirmText: 'Desactivar',
            type: 'danger',
            action: async () => {
                try {
                    await CourtsService.deleteCourt(court.court_id);
                    await load();
                } catch (error) {
                    console.error('[CourtsConfig] Error deactivating court', error);
                }
            },
        });
    };

    const requestDeleteAttribute = (attribute: CourtAttributeDef) => {
        setConfirm({
            visible: true,
            title: 'Desactivar atributo',
            message: `La característica "${attribute.label}" quedará inactiva. No se borrará de las canchas que ya la usan.`,
            confirmText: 'Desactivar',
            type: 'danger',
            action: async () => {
                try {
                    await CourtsService.deleteAttribute(attribute.key);
                    setAttributes(await CourtsService.listAttributes());
                } catch (error) {
                    console.error('[CourtsConfig] Error deactivating attribute', error);
                }
            },
        });
    };

    const requestDeleteBlock = (block: CourtBlock) => {
        setConfirm({
            visible: true,
            title: 'Desactivar bloqueo',
            message: `El bloqueo del ${formatDateShort(block.date)} (${block.start_time} – ${block.end_time}) quedará inactivo.`,
            confirmText: 'Desactivar',
            type: 'danger',
            action: async () => {
                try {
                    await CourtsService.deleteBlock(block.block_id, block.court_id);
                    setBlocks(await CourtsService.listBlocks(block.court_id));
                } catch (error) {
                    console.error('[CourtsConfig] Error deactivating block', error);
                }
            },
        });
    };

    const confirmAction = async () => {
        try {
            setConfirmLoading(true);
            await confirm.action();
            setConfirm(current => ({ ...current, visible: false }));
        } finally {
            setConfirmLoading(false);
        }
    };

    const saveSettingsValue = async (value: string | null) => {
        try {
            setSavingSettings(true);
            const next = await CourtsService.updateSettings(value);
            setSettings(next);
            setPublicBaseUrl(next.public_base_url || '');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error) {
            console.error('[CourtsConfig] Error saving settings', error);
        } finally {
            setSavingSettings(false);
        }
    };

    const saveSettings = () => saveSettingsValue(publicBaseUrl.trim() || null);

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
                        onRefresh={() => void load(true)}
                        tintColor={courtsColors.indigo}
                    />
                )}
            >
                <CourtsHero
                    eyebrow="CANCHAS ACTIVAS"
                    value={courts.filter(court => court.status === 'ACTIVE').length}
                    suffix={`/ ${courts.length}`}
                    progress={courts.length ? Math.round((courts.filter(court => court.status === 'ACTIVE').length / courts.length) * 100) : 0}
                    hint="Las canchas activas aparecen en la agenda y en los links públicos."
                    stats={heroStats}
                    compact
                />

                <SectionCard>
                    <SectionHeader
                        title="Canchas"
                        subtitle={`${filteredCourts.length} de ${courts.length}`}
                        right={(
                            <PrimaryButton
                                label="Nueva"
                                icon={Plus}
                                onPress={() => openCourtModal(null)}
                                compact
                            />
                        )}
                    />
                    <CourtsFilterTabs
                        value={courtFilter}
                        onChange={setCourtFilter}
                        options={[
                            { value: 'ACTIVE', label: 'Activas' },
                            { value: 'ALL', label: 'Todas' },
                            { value: 'INACTIVE', label: 'Inactivas' },
                        ]}
                    />
                    <View style={styles.cardsGrid}>
                        {!filteredCourts.length ? (
                            <EmptyState
                                icon={Goal}
                                title="No hay canchas en este filtro"
                                message="Crea una cancha o cambia el filtro para ver las inactivas."
                                actionLabel="Crear cancha"
                                onAction={() => openCourtModal(null)}
                            />
                        ) : filteredCourts.map(court => (
                            <CourtCard
                                key={court.court_id}
                                court={court}
                                style={{ width: twoColumns ? '48.5%' : '100%' }}
                                onEdit={() => openCourtModal(court)}
                                onDeactivate={() => requestDeactivateCourt(court)}
                                onReactivate={() => {
                                    void CourtsService.updateCourt(court.court_id, { status: 'ACTIVE' })
                                        .then(() => load())
                                        .catch(error => console.error('[CourtsConfig] Error reactivating court', error));
                                }}
                            />
                        ))}
                    </View>
                </SectionCard>

                <SectionCard>
                    <SectionHeader
                        title="Atributos configurables"
                        subtitle="Características de las canchas"
                        right={(
                            <PrimaryButton
                                label="Nuevo"
                                icon={Plus}
                                onPress={() => openAttributeModal(null)}
                                compact
                            />
                        )}
                    />
                    <CourtsFilterTabs
                        value={attributeFilter}
                        onChange={setAttributeFilter}
                        options={[
                            { value: 'ACTIVE', label: 'Activos' },
                            { value: 'ALL', label: 'Todos' },
                        ]}
                    />
                    <View style={styles.definitionList}>
                        {!filteredAttributes.length ? (
                            <Text style={styles.mutedText}>No hay atributos en este filtro.</Text>
                        ) : filteredAttributes.map(attribute => (
                            <View
                                key={attribute.key}
                                style={[styles.definitionRow, attribute.active === false && styles.rowOff]}
                            >
                                <View style={styles.definitionCopy}>
                                    <Text style={styles.definitionTitle}>
                                        {attribute.label}{attribute.required ? ' *' : ''}
                                    </Text>
                                    <Text style={styles.definitionMeta}>
                                        {attribute.key} · {attributeTypeLabel(attribute.type)}
                                    </Text>
                                </View>
                                <View style={styles.definitionActions}>
                                    {attribute.active === false ? (
                                        <>
                                            <StatusPill label="Inactivo" tone="inactive" />
                                            <PrimaryButton
                                                label="Reactivar"
                                                variant="ghost"
                                                compact
                                                onPress={() => {
                                                    void CourtsService.upsertAttribute({
                                                        key: attribute.key,
                                                        label: attribute.label,
                                                        type: attribute.type,
                                                        required: !!attribute.required,
                                                        options: attribute.options || [],
                                                    })
                                                        .then(() => CourtsService.listAttributes())
                                                        .then(setAttributes)
                                                        .catch(error => console.error('[CourtsConfig] Error reactivating attribute', error));
                                                }}
                                            />
                                        </>
                                    ) : (
                                        <>
                                            <IconButton
                                                icon={Pencil}
                                                label="Editar atributo"
                                                onPress={() => openAttributeModal(attribute)}
                                            />
                                            <IconButton
                                                icon={Trash2}
                                                label="Desactivar atributo"
                                                variant="danger"
                                                onPress={() => requestDeleteAttribute(attribute)}
                                            />
                                        </>
                                    )}
                                </View>
                            </View>
                        ))}
                    </View>
                </SectionCard>

                <SectionCard>
                    <SectionHeader
                        title="Bloqueos y mantenimiento"
                        subtitle={selectedCourtName}
                        right={(
                            <PrimaryButton
                                label="Nuevo"
                                icon={Plus}
                                onPress={() => {
                                    if (!selectedCourtId) return;
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setBlockModalVisible(true);
                                }}
                                compact
                            />
                        )}
                    />
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.courtChips}>
                        {courts.map(court => {
                            const active = court.court_id === selectedCourtId;
                            return (
                                <Pressable
                                    key={court.court_id}
                                    onPress={() => void selectCourtForBlocks(court.court_id)}
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
                        value={blockFilter}
                        onChange={setBlockFilter}
                        options={[
                            { value: 'ACTIVE', label: 'Activos' },
                            { value: 'ALL', label: 'Todos' },
                        ]}
                    />
                    <View style={styles.blockList}>
                        {!filteredBlocks.length ? (
                            <Text style={styles.mutedText}>No hay bloqueos en este filtro.</Text>
                        ) : filteredBlocks.map(block => {
                            const isActive = String(block.status || 'ACTIVE').toUpperCase() !== 'DELETED';
                            return (
                                <View key={block.block_id} style={[styles.blockRow, !isActive && styles.rowOff]}>
                                    <View style={styles.blockCopy}>
                                        <Text style={styles.blockTitle}>
                                            {formatDateShort(block.date)} · {block.start_time} – {block.end_time}
                                        </Text>
                                        <Text style={styles.blockMeta} numberOfLines={2}>
                                            {block.type}{block.reason ? ` · ${block.reason}` : ''}{!isActive ? ' · Inactivo' : ''}
                                        </Text>
                                    </View>
                                    {isActive ? (
                                        <IconButton
                                            icon={Trash2}
                                            label="Desactivar bloqueo"
                                            variant="danger"
                                            onPress={() => requestDeleteBlock(block)}
                                        />
                                    ) : null}
                                </View>
                            );
                        })}
                    </View>
                </SectionCard>

                <SectionCard>
                    <SectionHeader
                        title="Links públicos"
                        subtitle="Dominio de agenda, gestión y portal"
                        right={<TagPill label={settings?.source === 'COURT_SETTINGS' ? 'Dominio propio' : 'Heredado'} icon={Settings2} />}
                    />
                    <TextField
                        label="Dominio público"
                        value={publicBaseUrl}
                        onChangeText={setPublicBaseUrl}
                        placeholder="https://canchas.cliente.com"
                        autoCapitalize="none"
                    />
                    <View style={styles.settingsActions}>
                        <PrimaryButton
                            label={savingSettings ? 'Guardando…' : 'Guardar'}
                            onPress={() => void saveSettings()}
                            disabled={savingSettings}
                            compact
                        />
                        <PrimaryButton
                            label="Usar ia-stock.com"
                            variant="ghost"
                            onPress={() => {
                                setPublicBaseUrl('');
                                void saveSettingsValue(null);
                            }}
                            compact
                        />
                    </View>
                    <View style={styles.effectiveUrl}>
                        <Text style={styles.effectiveLabel}>DOMINIO EFECTIVO</Text>
                        <Text style={styles.effectiveValue}>{settings?.effective_public_base_url || '—'}</Text>
                        <Text style={styles.effectiveExample}>{settings?.effective_public_base_url}/c/ABC123</Text>
                    </View>
                </SectionCard>
            </ScrollView>

            <CourtFormModal
                visible={courtModalVisible}
                court={editingCourt}
                attributes={activeAttributes}
                onClose={() => setCourtModalVisible(false)}
                onSaved={() => {
                    setCourtModalVisible(false);
                    void load();
                }}
            />
            <AttributeFormModal
                visible={attributeModalVisible}
                attribute={editingAttribute}
                onClose={() => setAttributeModalVisible(false)}
                onSaved={() => {
                    setAttributeModalVisible(false);
                    void CourtsService.listAttributes().then(setAttributes);
                }}
            />
            <BlockFormModal
                visible={blockModalVisible}
                courtId={selectedCourtId}
                courtName={selectedCourtName}
                onClose={() => setBlockModalVisible(false)}
                onSaved={() => {
                    setBlockModalVisible(false);
                    void CourtsService.listBlocks(selectedCourtId).then(setBlocks);
                }}
            />
            <CourtsConfirmModal
                visible={confirm.visible}
                title={confirm.title}
                message={confirm.message}
                confirmText={confirm.confirmText}
                type={confirm.type}
                loading={confirmLoading}
                onConfirm={() => void confirmAction()}
                onCancel={() => setConfirm(current => ({ ...current, visible: false }))}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
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
    cardsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: rem(12),
        marginTop: rem(12),
    },
    mutedText: {
        fontFamily: courtsFonts.medium,
        fontSize: rem(courtsTypography.caption),
        color: courtsColors.textMuted,
        paddingVertical: rem(10),
    },
    definitionList: {
        gap: rem(8),
        marginTop: rem(12),
    },
    definitionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: rem(8),
        borderWidth: 1,
        borderColor: '#F1EDE5',
        borderRadius: rem(courtsRadii.md),
        backgroundColor: courtsColors.surfaceLow,
        paddingHorizontal: rem(12),
        paddingVertical: rem(10),
    },
    rowOff: {
        opacity: 0.65,
    },
    definitionCopy: {
        flex: 1,
        minWidth: 0,
    },
    definitionTitle: {
        fontFamily: courtsFonts.extraBold,
        fontSize: rem(12),
        color: courtsColors.text,
    },
    definitionMeta: {
        marginTop: rem(2),
        fontFamily: courtsFonts.semibold,
        fontSize: rem(9),
        color: courtsColors.textSoft,
    },
    definitionActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: rem(6),
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
        paddingVertical: rem(8),
        maxWidth: rem(160),
    },
    courtChipActive: {
        backgroundColor: courtsColors.indigo,
        borderColor: courtsColors.indigo,
    },
    courtChipText: {
        fontFamily: courtsFonts.bold,
        fontSize: rem(10),
        color: courtsColors.textMuted,
    },
    courtChipTextActive: {
        color: courtsColors.white,
    },
    blockList: {
        gap: rem(8),
        marginTop: rem(12),
    },
    blockRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: rem(8),
        borderWidth: 1,
        borderColor: '#F1EDE5',
        borderRadius: rem(courtsRadii.md),
        backgroundColor: courtsColors.surfaceLow,
        paddingHorizontal: rem(12),
        paddingVertical: rem(10),
    },
    blockCopy: {
        flex: 1,
        minWidth: 0,
    },
    blockTitle: {
        fontFamily: courtsFonts.extraBold,
        fontSize: rem(12),
        color: courtsColors.text,
    },
    blockMeta: {
        marginTop: rem(2),
        fontFamily: courtsFonts.medium,
        fontSize: rem(9),
        color: courtsColors.textMuted,
    },
    settingsActions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: rem(8),
    },
    effectiveUrl: {
        borderRadius: rem(courtsRadii.md),
        backgroundColor: courtsColors.surfaceLow,
        paddingHorizontal: rem(14),
        paddingVertical: rem(12),
    },
    effectiveLabel: {
        fontFamily: courtsFonts.extraBold,
        fontSize: rem(8),
        letterSpacing: 1,
        color: courtsColors.textSoft,
    },
    effectiveValue: {
        marginTop: rem(2),
        fontFamily: courtsFonts.extraBold,
        fontSize: rem(14),
        color: courtsColors.text,
    },
    effectiveExample: {
        marginTop: rem(1),
        fontFamily: courtsFonts.medium,
        fontSize: rem(10),
        color: courtsColors.textSoft,
    },
});
