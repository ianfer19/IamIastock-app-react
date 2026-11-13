import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ArrowLeft, Boxes, CalendarDays, Goal, Percent } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { rem } from '@/core/utils/responsive';
import { DashboardHeader } from '@/features/pos/components/DashboardLayout';
import { CourtsNavBar, CourtsNavItem } from '../components/CourtsNavBar';
import { courtsColors, courtsFonts, courtsRadii, courtsTypography } from '../theme/courtsTheme';
import { CourtsAgendaScreen } from './CourtsAgendaScreen';
import { CourtsConfigScreen } from './CourtsConfigScreen';
import { CourtsPricingScreen } from './CourtsPricingScreen';
import { CourtsAssetsScreen } from './CourtsAssetsScreen';

type CourtsTab = 'AGENDA' | 'CONFIG' | 'PRICING' | 'ASSETS';

const TABS: CourtsNavItem[] = [
    { key: 'AGENDA', label: 'Agenda', shortLabel: 'AGENDA', icon: CalendarDays },
    { key: 'CONFIG', label: 'Canchas', shortLabel: 'CANCHAS', icon: Goal },
    { key: 'PRICING', label: 'Tarifas y promos', shortLabel: 'TARIFAS', icon: Percent },
    { key: 'ASSETS', label: 'Implementos', shortLabel: 'IMPLEMENTOS', icon: Boxes },
];

export const CourtsModuleScreen = ({ onBack }: { onBack: () => void }) => {
    const [tab, setTab] = useState<CourtsTab>('AGENDA');

    return (
        <View style={styles.container}>
            <DashboardHeader />

            <View style={styles.header}>
                <Pressable
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        onBack();
                    }}
                    style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
                    accessibilityRole="button"
                    accessibilityLabel="Volver al inicio"
                >
                    <ArrowLeft size={rem(17)} color={courtsColors.indigo} strokeWidth={2.5} />
                </Pressable>
                <View style={styles.headerCopy}>
                    <Text style={styles.eyebrow}>CANCHAS</Text>
                    <Text style={styles.title} numberOfLines={1}>Cancha Profesional</Text>
                </View>
            </View>

            <CourtsNavBar
                items={TABS}
                active={tab}
                onChange={key => setTab(key as CourtsTab)}
            />

            <View style={styles.content}>
                {tab === 'AGENDA' ? <CourtsAgendaScreen /> : null}
                {tab === 'CONFIG' ? <CourtsConfigScreen /> : null}
                {tab === 'PRICING' ? <CourtsPricingScreen /> : null}
                {tab === 'ASSETS' ? <CourtsAssetsScreen /> : null}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: courtsColors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: rem(12),
        paddingHorizontal: rem(16),
        paddingTop: rem(14),
        paddingBottom: rem(6),
    },
    backButton: {
        width: rem(40),
        height: rem(40),
        borderRadius: rem(courtsRadii.pill),
        backgroundColor: courtsColors.surface,
        borderWidth: 1,
        borderColor: courtsColors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pressed: {
        opacity: 0.72,
    },
    headerCopy: {
        flex: 1,
        minWidth: 0,
    },
    eyebrow: {
        fontFamily: courtsFonts.extraBold,
        fontSize: rem(courtsTypography.nano),
        letterSpacing: 1.3,
        color: courtsColors.indigoDark,
    },
    title: {
        marginTop: rem(2),
        fontFamily: courtsFonts.extraBold,
        fontSize: rem(22),
        letterSpacing: -0.5,
        color: courtsColors.text,
    },
    content: {
        flex: 1,
        minHeight: 0,
    },
});
