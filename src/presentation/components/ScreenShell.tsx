import React from 'react';
import { Platform, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '@/core/theme/theme';
import { rem } from '@/core/utils/responsive';

interface ScreenShellProps {
    children: React.ReactNode;
    /** Radio del contenedor principal (default 26). */
    radius?: number;
    /** Padding interno del contenedor (default 12). */
    padding?: number;
    /** Estilo extra para el contenedor exterior (márgenes). */
    style?: ViewStyle;
    /** Estilo extra para el contenedor interior. */
    contentStyle?: ViewStyle;
    /** Si es true, el contenedor interior es transparente (sin superficie). */
    plain?: boolean;
}

/**
 * Layout estándar de pantallas (obligatorio).
 *
 * Estructura:
 *   DashboardHeader → nav del módulo → ScreenShell → contenido desplazable
 *
 * Reproduce el patrón de Ventas (POS) y Caja: fondo del tema, márgenes de 12
 * y una superficie redondeada tipo "bento" que contiene la pantalla.
 */
export const ScreenShell = ({
    children,
    radius = 26,
    padding = 12,
    style,
    contentStyle,
    plain = false,
}: ScreenShellProps) => {
    const { colors, mode } = useTheme();

    return (
        <View style={[styles.outer, style]}>
            <View
                style={[
                    styles.bento,
                    {
                        backgroundColor: plain ? 'transparent' : colors.surface,
                        borderColor: mode === 'light' ? '#E2E8F0' : '#334155',
                        borderWidth: plain ? 0 : 1,
                        borderRadius: rem(radius),
                        padding: rem(padding),
                    },
                    ...(plain ? [] : [styles.shadow]),
                    contentStyle,
                ]}
            >
                {children}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    outer: {
        flex: 1,
        paddingHorizontal: rem(12),
        paddingBottom: rem(12),
    },
    bento: {
        flex: 1,
        overflow: 'hidden',
    },
    shadow: Platform.select({
        ios: {
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 10,
        },
        android: { elevation: 3 },
        default: {},
    }),
});
