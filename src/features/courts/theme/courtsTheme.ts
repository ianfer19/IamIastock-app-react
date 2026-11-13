import { Platform } from 'react-native';

export const courtsColors = {
    background: '#FAF8F4',
    surface: '#FFFFFF',
    surfaceLow: '#F6F3EC',
    surfaceMuted: '#FBF9F5',
    text: '#14142B',
    textMuted: '#55556B',
    textSoft: '#6B7280',
    border: '#ECE8E0',
    borderStrong: '#D6D3D1',
    indigo: '#4F46E5',
    indigoDark: '#4338CA',
    indigoSoft: '#EEF0FF',
    indigoBorder: '#C7D2FE',
    green: '#14532D',
    greenMid: '#166534',
    greenSoft: '#DCFCE7',
    lime: '#BEF264',
    amber: '#FEF3C7',
    amberText: '#92400E',
    amberBorder: '#F59E0B',
    danger: '#DC2626',
    dangerDark: '#B91C1C',
    dangerSoft: '#FEF2F2',
    dangerBorder: '#FECACA',
    white: '#FFFFFF',
    black: '#0F172A',
    overlay: 'rgba(15, 23, 42, 0.55)',
    disabled: 'rgba(20, 20, 43, 0.42)',
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
