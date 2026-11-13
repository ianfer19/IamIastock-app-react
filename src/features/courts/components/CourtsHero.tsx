import React from 'react';
import { ImageBackground, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { LucideIcon } from 'lucide-react-native';
import Svg, { Circle, Line, Path, Polygon, Rect } from 'react-native-svg';
import { rem } from '@/core/utils/responsive';
import {
    courtsColors,
    courtsFonts,
    courtsRadii,
    courtsShadow,
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

/**
 * Marcas de cancha (líneas) dibujadas sobre el fondo verde del hero.
 */
const PitchMarks = () => (
    <Svg style={StyleSheet.absoluteFill} viewBox="0 0 100 60" preserveAspectRatio="none" pointerEvents="none">
        <Rect x="3" y="3" width="94" height="54" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="0.7" />
        <Line x1="50" y1="3" x2="50" y2="57" stroke="rgba(255,255,255,0.18)" strokeWidth="0.7" />
        <Circle cx="50" cy="30" r="9.5" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.7" />
        <Circle cx="50" cy="30" r="1" fill="rgba(255,255,255,0.3)" />
        <Rect x="28" y="3" width="44" height="11" fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="0.6" />
        <Rect x="28" y="46" width="44" height="11" fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="0.6" />
    </Svg>
);

const BALL_SPOKES: [number, number, number, number][] = [
    [32, 19, 32, 4],
    [42.4, 26.6, 57.4, 21.8],
    [38.4, 38.9, 49.6, 49.4],
    [25.6, 38.9, 14.4, 49.4],
    [21.6, 26.6, 6.6, 21.8],
];

/**
 * Balón de fútbol decorativo del hero.
 */
const FootballBall = ({ size }: { size: number }) => (
    <Svg width={size} height={size} viewBox="0 0 64 64" pointerEvents="none">
        <Circle
            cx="32"
            cy="32"
            r="29"
            fill="rgba(255,255,255,0.10)"
            stroke="rgba(255,255,255,0.42)"
            strokeWidth="1.4"
        />
        <Path
            d="M32 18.5 L42.6 26.3 L38.6 38.8 H25.4 L21.4 26.3 Z"
            fill="rgba(255,255,255,0.38)"
            stroke="rgba(255,255,255,0.6)"
            strokeWidth="1.1"
            strokeLinejoin="round"
        />
        {BALL_SPOKES.map(([x1, y1, x2, y2], index) => (
            <Line
                key={index}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="rgba(255,255,255,0.42)"
                strokeWidth="1.1"
            />
        ))}
    </Svg>
);

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
    const ballSize = rem(compact ? 44 : 56);

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

                <PitchMarks />
                <View style={[styles.ball, { width: ballSize, height: ballSize }]}>
                    <FootballBall size={ballSize} />
                </View>

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
                        {suffix ? <Text style={[styles.suffix, compact && styles.suffixCompact]}>{suffix}</Text> : null}
                    </View>
                    {progress !== null ? (
                        <View style={[styles.progressTrack, compact && styles.progressTrackCompact]}>
                            <View style={[styles.progressFill, { width: `${progressValue}%` }]} />
                        </View>
                    ) : null}
                    {hint ? <Text style={styles.hint} numberOfLines={compact ? 2 : 3}>{hint}</Text> : null}
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
                            <View style={[styles.statIcon, compact && styles.statIconCompact, toneStyle]}>
                                <Icon size={rem(compact ? 14 : 18)} color={iconColor} strokeWidth={2.1} />
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
        minHeight: rem(112),
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
        paddingHorizontal: rem(18),
        paddingVertical: rem(9),
    },
    stripeRow: {
        ...StyleSheet.absoluteFillObject,
        flexDirection: 'row',
    },
    stripe: {
        flex: 1,
    },
    ball: {
        position: 'absolute',
        right: rem(8),
        bottom: rem(4),
        opacity: 0.9,
    },
    pitchContent: {
        zIndex: 2,
    },
    eyebrow: {
        fontFamily: courtsFonts.extraBold,
        fontSize: rem(8.5),
        letterSpacing: 1.2,
        color: '#D9F99D',
    },
    valueRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: rem(4),
        marginTop: rem(3),
    },
    bigValue: {
        fontFamily: courtsFonts.extraBold,
        fontSize: rem(courtsTypography.heroValue),
        lineHeight: rem(courtsTypography.heroValue + 4),
        letterSpacing: -1,
        color: courtsColors.white,
    },
    bigValueCompact: {
        fontSize: rem(22),
        lineHeight: rem(25),
    },
    suffix: {
        marginBottom: rem(7),
        fontFamily: courtsFonts.extraBold,
        fontSize: rem(18),
        color: courtsColors.lime,
    },
    suffixCompact: {
        marginBottom: rem(3),
        fontSize: rem(12),
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
    progressTrackCompact: {
        marginTop: rem(4),
        width: rem(104),
        height: rem(4),
        borderRadius: rem(2),
    },
    progressFill: {
        height: '100%',
        borderRadius: rem(2),
        backgroundColor: courtsColors.lime,
    },
    hint: {
        marginTop: rem(3),
        paddingRight: rem(34),
        fontFamily: courtsFonts.semibold,
        fontSize: rem(8.5),
        lineHeight: rem(11),
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
        paddingHorizontal: rem(12),
        paddingVertical: rem(8),
        gap: rem(6),
    },
    stat: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: rem(6),
        minWidth: rem(76),
    },
    statIcon: {
        width: rem(43),
        height: rem(43),
        borderRadius: rem(14),
        alignItems: 'center',
        justifyContent: 'center',
    },
    statIconCompact: {
        width: rem(28),
        height: rem(28),
        borderRadius: rem(9),
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
        fontSize: rem(8),
        letterSpacing: 0.4,
        color: '#4B4B63',
    },
    statValue: {
        marginTop: rem(1),
        fontFamily: courtsFonts.extraBold,
        fontSize: rem(courtsTypography.heroStat),
        color: courtsColors.text,
    },
    statValueCompact: {
        marginTop: 0,
        fontSize: rem(15),
    },
});
