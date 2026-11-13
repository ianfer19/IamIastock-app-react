import React from 'react';
import { ImageBackground, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { LucideIcon } from 'lucide-react-native';
import Svg, { Polygon } from 'react-native-svg';
import { rem } from '@/core/utils/responsive';
import {
    courtsColors,
    courtsFonts,
    courtsRadii,
    courtsShadow,
    courtsSpacing,
    courtsTypography,
} from '../theme/courtsTheme';

export type CourtHeroTone = 'indigo' | 'green' | 'amber' | 'soft';

export interface CourtHeroStat {
    label: string;
    value: string | number;
    icon: LucideIcon;
    tone?: CourtHeroTone;
}

interface CourtsHeroProps {
    eyebrow: string;
    value: string | number;
    suffix?: string;
    progress?: number | null;
    hint?: string;
    image?: string | null;
    stats: CourtHeroStat[];
    compact?: boolean;
}

export const CourtsHero = ({
    eyebrow,
    value,
    suffix = '',
    progress = null,
    hint,
    image,
    stats,
    compact = true,
}: CourtsHeroProps) => {
    const { width } = useWindowDimensions();
    const stacked = width < 720;
    const progressValue = Math.min(100, Math.max(0, Number(progress ?? 0) || 0));

    return (
        <MotiView
            from={{ opacity: 0, translateY: rem(8) }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 280 }}
            style={[styles.hero, stacked && styles.heroStacked]}
        >
            <View style={[styles.pitch, stacked && styles.pitchStacked, compact && styles.pitchCompact]}>
                {image ? (
                    <ImageBackground
                        source={{ uri: image }}
                        style={StyleSheet.absoluteFill}
                        resizeMode="cover"
                    >
                        <LinearGradient
                            colors={['rgba(20,83,45,0.95)', 'rgba(22,101,52,0.70)']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={StyleSheet.absoluteFill}
                        />
                    </ImageBackground>
                ) : (
                    <View style={styles.stripeRow}>
                        {Array.from({ length: 10 }).map((_, index) => (
                            <View
                                key={index}
                                style={[
                                    styles.stripe,
                                    { backgroundColor: index % 2 === 0 ? courtsColors.green : courtsColors.greenMid },
                                ]}
                            />
                        ))}
                    </View>
                )}

                {!stacked ? (
                    <Svg style={StyleSheet.absoluteFill} viewBox="0 0 100 100" preserveAspectRatio="none">
                        <Polygon points="100,0 100,100 84,100" fill={courtsColors.background} />
                    </Svg>
                ) : null}

                <View style={styles.pitchContent}>
                    <Text style={styles.eyebrow}>{eyebrow.toUpperCase()}</Text>
                    <View style={styles.valueRow}>
                        <Text style={[styles.bigValue, compact && styles.bigValueCompact]} numberOfLines={1} adjustsFontSizeToFit>
                            {value}
                        </Text>
                        {suffix ? <Text style={styles.suffix}>{suffix}</Text> : null}
                    </View>
                    {progress !== null ? (
                        <View style={styles.progressTrack}>
                            <View style={[styles.progressFill, { width: `${progressValue}%` }]} />
                        </View>
                    ) : null}
                    {hint ? <Text style={styles.hint}>{hint}</Text> : null}
                </View>
            </View>

            <View style={[styles.stats, stacked && styles.statsStacked]}>
                {stats.map(stat => {
                    const tone = stat.tone || 'indigo';
                    const toneStyle = tone === 'green'
                        ? styles.iconGreen
                        : tone === 'amber'
                            ? styles.iconAmber
                            : tone === 'soft'
                                ? styles.iconSoft
                                : styles.iconIndigo;
                    const iconColor = tone === 'green'
                        ? courtsColors.green
                        : tone === 'amber'
                            ? '#B45309'
                            : courtsColors.indigo;
                    const Icon = stat.icon;
                    return (
                        <View key={stat.label} style={styles.stat}>
                            <View style={[styles.statIcon, toneStyle]}>
                                <Icon size={rem(compact ? 16 : 20)} color={iconColor} strokeWidth={2.1} />
                            </View>
                            <View style={styles.statCopy}>
                                <Text style={styles.statLabel} numberOfLines={1}>{stat.label}</Text>
                                <Text style={[styles.statValue, compact && styles.statValueCompact]} numberOfLines={1}>
                                    {stat.value}
                                </Text>
                            </View>
                        </View>
                    );
                })}
            </View>
        </MotiView>
    );
};

const styles = StyleSheet.create({
    hero: {
        flexDirection: 'row',
        minHeight: rem(176),
        borderRadius: rem(courtsRadii.hero),
        backgroundColor: courtsColors.surface,
        overflow: 'hidden',
        ...courtsShadow.card,
    },
    heroStacked: {
        flexDirection: 'column',
        minHeight: 0,
    },
    pitch: {
        width: '36%',
        minWidth: rem(260),
        paddingHorizontal: rem(30),
        paddingVertical: rem(26),
        justifyContent: 'center',
        overflow: 'hidden',
    },
    pitchStacked: {
        width: '100%',
        minWidth: 0,
    },
    pitchCompact: {
        paddingHorizontal: rem(24),
        paddingVertical: rem(21),
    },
    stripeRow: {
        ...StyleSheet.absoluteFillObject,
        flexDirection: 'row',
    },
    stripe: {
        flex: 1,
    },
    pitchContent: {
        zIndex: 2,
    },
    eyebrow: {
        fontFamily: courtsFonts.extraBold,
        fontSize: rem(10),
        letterSpacing: 1.4,
        color: '#D9F99D',
    },
    valueRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: rem(5),
        marginTop: rem(6),
    },
    bigValue: {
        fontFamily: courtsFonts.extraBold,
        fontSize: rem(courtsTypography.heroValue),
        lineHeight: rem(courtsTypography.heroValue + 4),
        letterSpacing: -1,
        color: courtsColors.white,
    },
    bigValueCompact: {
        fontSize: rem(courtsTypography.heroValueSmall),
        lineHeight: rem(courtsTypography.heroValueSmall + 4),
    },
    suffix: {
        marginBottom: rem(7),
        fontFamily: courtsFonts.extraBold,
        fontSize: rem(18),
        color: courtsColors.lime,
    },
    progressTrack: {
        marginTop: rem(8),
        width: rem(144),
        maxWidth: '100%',
        height: rem(6),
        borderRadius: rem(3),
        backgroundColor: 'rgba(255,255,255,0.25)',
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: rem(3),
        backgroundColor: courtsColors.lime,
    },
    hint: {
        marginTop: rem(7),
        fontFamily: courtsFonts.semibold,
        fontSize: rem(courtsTypography.nano + 1),
        lineHeight: rem(14),
        color: 'rgba(255,255,255,0.78)',
    },
    stats: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        flexWrap: 'wrap',
        gap: rem(11),
        paddingHorizontal: rem(21),
        paddingVertical: rem(16),
    },
    statsStacked: {
        justifyContent: 'space-between',
        paddingHorizontal: rem(16),
    },
    stat: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: rem(9),
        minWidth: rem(104),
    },
    statIcon: {
        width: rem(43),
        height: rem(43),
        borderRadius: rem(14),
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconIndigo: { backgroundColor: '#E4E6FF' },
    iconGreen: { backgroundColor: '#DCFCE7' },
    iconAmber: { backgroundColor: courtsColors.amber },
    iconSoft: { backgroundColor: courtsColors.indigoSoft },
    statCopy: {
        flexShrink: 1,
    },
    statLabel: {
        fontFamily: courtsFonts.extraBold,
        fontSize: rem(courtsTypography.nano),
        letterSpacing: 0.5,
        color: '#4B4B63',
    },
    statValue: {
        marginTop: rem(1),
        fontFamily: courtsFonts.extraBold,
        fontSize: rem(courtsTypography.heroStat),
        color: courtsColors.text,
    },
    statValueCompact: {
        fontSize: rem(18),
    },
});
