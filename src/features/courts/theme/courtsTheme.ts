import { useMemo } from 'react';
import { Platform } from 'react-native';
import { useTheme } from '@/core/theme/theme';

export interface CourtsPalette {
    background: string;
    surface: string;
    surfaceLow: string;
    surfaceMuted: string;
    surfaceRaised: string;
    text: string;
    textMuted: string;
    textSoft: string;
    label: string;
    border: string;
    borderStrong: string;
    borderSoft: string;
    divider: string;
    indigo: string;
    indigoDark: string;
    indigoSoft: string;
    indigoBorder: string;
    indigoMuted: string;
    indigoText: string;
    green: string;
    greenMid: string;
    greenPanel: string;
    greenSoft: string;
    greenBorder: string;
    lime: string;
    limeSoft: string;
    amber: string;
    amberText: string;
    amberDeep: string;
    amberStrong: string;
    amberBorder: string;
    danger: string;
    dangerDark: string;
    dangerSoft: string;
    dangerBorder: string;
    neutral: string;
    neutralSoft: string;
    neutralBorder: string;
    neutralText: string;
    neutralMuted: string;
    slateSoft: string;
    white: string;
    black: string;
    overlay: string;
    disabled: string;
}

/**
 * Paleta clara: mantiene la identidad beige de la web de Canchas.
 */
export const courtsLightColors: CourtsPalette = {
    background: '#FAF8F4',
    surface: '#FFFFFF',
    surfaceLow: '#F6F3EC',
    surfaceMuted: '#FBF9F5',
    surfaceRaised: '#F1EDE5',
    text: '#14142B',
    textMuted: '#55556B',
    textSoft: '#6B7280',
    label: '#4B4B63',
    border: '#ECE8E0',
    borderStrong: '#D6D3D1',
    borderSoft: '#E9E4DA',
    divider: '#F1F5F9',
    indigo: '#4F46E5',
    indigoDark: '#4338CA',
    indigoSoft: '#EEF0FF',
    indigoBorder: '#C7D2FE',
    indigoMuted: '#E4E6FF',
    indigoText: '#6366F1',
    green: '#14532D',
    greenMid: '#166534',
    greenPanel: '#166534',
    greenSoft: '#DCFCE7',
    greenBorder: '#86EFAC',
    lime: '#BEF264',
    limeSoft: '#D9F99D',
    amber: '#FEF3C7',
    amberText: '#92400E',
    amberDeep: '#B45309',
    amberStrong: '#78350F',
    amberBorder: '#F59E0B',
    danger: '#DC2626',
    dangerDark: '#B91C1C',
    dangerSoft: '#FEF2F2',
    dangerBorder: '#FECACA',
    neutral: '#E7E5E4',
    neutralSoft: '#F5F5F4',
    neutralBorder: '#D6D3D1',
    neutralText: '#44403C',
    neutralMuted: '#78716C',
    slateSoft: '#F3F4F6',
    white: '#FFFFFF',
    black: '#0F172A',
    overlay: 'rgba(15, 23, 42, 0.55)',
    disabled: 'rgba(20, 20, 43, 0.42)',
};

/**
 * Paleta oscura: alineada con `darkColors` del tema global (POS / Caja).
 */
export const courtsDarkColors: CourtsPalette = {
    background: '#0F172A',
    surface: '#1E293B',
    surfaceLow: '#172033',
    surfaceMuted: '#16202F',
    surfaceRaised: '#243244',
    text: '#F8FAFC',
    textMuted: '#94A3B8',
    textSoft: '#7C8DA6',
    label: '#CBD5E1',
    border: '#334155',
    borderStrong: '#475569',
    borderSoft: '#2A3A50',
    divider: '#253247',
    indigo: '#6366F1',
    indigoDark: '#A5B4FC',
    indigoSoft: 'rgba(99, 102, 241, 0.16)',
    indigoBorder: 'rgba(129, 140, 248, 0.45)',
    indigoMuted: 'rgba(99, 102, 241, 0.24)',
    indigoText: '#818CF8',
    green: '#14532D',
    greenMid: '#34D399',
    greenPanel: '#166534',
    greenSoft: 'rgba(34, 197, 94, 0.16)',
    greenBorder: 'rgba(74, 222, 128, 0.42)',
    lime: '#BEF264',
    limeSoft: '#D9F99D',
    amber: 'rgba(245, 158, 11, 0.16)',
    amberText: '#FCD34D',
    amberDeep: '#FBBF24',
    amberStrong: '#FDE68A',
    amberBorder: '#F59E0B',
    danger: '#F87171',
    dangerDark: '#FCA5A5',
    dangerSoft: 'rgba(239, 68, 68, 0.12)',
    dangerBorder: 'rgba(248, 113, 113, 0.42)',
    neutral: '#334155',
    neutralSoft: '#1F2A3A',
    neutralBorder: '#475569',
    neutralText: '#CBD5E1',
    neutralMuted: '#94A3B8',
    slateSoft: '#1E293B',
    white: '#FFFFFF',
    black: '#0F172A',
    overlay: 'rgba(2, 6, 23, 0.72)',
    disabled: 'rgba(226, 232, 240, 0.32)',
};

export const getCourtsColors = (mode: string): CourtsPalette =>
    mode === 'light' ? courtsLightColors : courtsDarkColors;

/**
 * Colores del módulo de Canchas según el tema global (light/dark).
 */
export const useCourtsColors = (): CourtsPalette => {
    const { mode } = useTheme();
    return useMemo(() => getCourtsColors(mode), [mode]);
};

export const courtsFonts = {
    regular: 'PlusJakartaSans-Regular',
    medium: 'PlusJakartaSans-Medium',
    semibold: 'PlusJakartaSans-SemiBold',
    bold: 'PlusJakartaSans-Bold',
    extraBold: 'PlusJakartaSans-ExtraBold',
};

export const courtsSpacing = {
    xxs: 4,
    xs: 6,
    sm: 8,
    md: 10,
    lg: 12,
    xl: 14,
    xxl: 18,
    xxxl: 22,
    huge: 28,
};

export const courtsRadii = {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    xxl: 20,
    card: 26,
    hero: 28,
    pill: 999,
};

export const courtsTypography = {
    heroValue: 48,
    heroValueSmall: 34,
    heroStat: 22,
    title: 28,
    titleSmall: 21,
    section: 19,
    cardTitle: 14,
    body: 13,
    bodySmall: 12,
    caption: 11,
    micro: 10,
    nano: 9,
};

export const courtsShadow = {
    card: Platform.select({
        ios: {
            shadowColor: '#14142B',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.06,
            shadowRadius: 15,
        },
        android: { elevation: 3 },
        default: {},
    }),
    soft: Platform.select({
        ios: {
            shadowColor: '#14142B',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
        },
        android: { elevation: 2 },
        default: {},
    }),
    floating: Platform.select({
        ios: {
            shadowColor: '#4338CA',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.24,
            shadowRadius: 18,
        },
        android: { elevation: 8 },
        default: {},
    }),
};

export const courtStatusTone = (status: string): 'active' | 'maintenance' | 'inactive' => {
    if (status === 'MAINTENANCE') return 'maintenance';
    if (status === 'INACTIVE') return 'inactive';
    return 'active';
};
