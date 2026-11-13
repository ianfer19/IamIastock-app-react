import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Boxes, CalendarDays, Goal, Percent } from 'lucide-react-native';
import { useTheme } from '@/core/theme/theme';
import { DashboardHeader } from '@/features/pos/components/DashboardLayout';
import { ScreenShell } from '@/presentation/components/ScreenShell';
import { CourtsNavBar, CourtsNavItem } from '../components/CourtsNavBar';
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

/**
 * Shell del módulo de Canchas: header global + navegación del módulo + ScreenShell.
 */
export const CourtsModuleScreen = () => {
    const { colors } = useTheme();
    const [tab, setTab] = useState<CourtsTab>('AGENDA');

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <DashboardHeader />

            <CourtsNavBar
                items={TABS}
                active={tab}
                onChange={key => setTab(key as CourtsTab)}
            />

            <ScreenShell>
                {tab === 'AGENDA' ? <CourtsAgendaScreen /> : null}
                {tab === 'CONFIG' ? <CourtsConfigScreen /> : null}
                {tab === 'PRICING' ? <CourtsPricingScreen /> : null}
                {tab === 'ASSETS' ? <CourtsAssetsScreen /> : null}
            </ScreenShell>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
