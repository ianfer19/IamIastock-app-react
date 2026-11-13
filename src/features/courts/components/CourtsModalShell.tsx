import React from 'react';
import {
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from 'react-native';
import { X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { rem } from '@/core/utils/responsive';
import {
    CourtsPalette,
    courtsFonts,
    courtsRadii,
    courtsShadow,
    courtsSpacing,
    courtsTypography,
    useCourtsColors,
} from '../theme/courtsTheme';

interface CourtsModalShellProps {
    visible: boolean;
    onClose: () => void;
    title: string;
    eyebrow?: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
    size?: 'sm' | 'md' | 'lg';
}

export const CourtsModalShell = ({
    visible,
    onClose,
    title,
    eyebrow,
    children,
    footer,
    size = 'md',
}: CourtsModalShellProps) => {
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const colors = useCourtsColors();
    const styles = getStyles(colors);
    const isPhone = width < 640;
    const maxWidth = size === 'sm' ? 520 : size === 'lg' ? 820 : 680;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            statusBarTranslucent
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.keyboard}
            >
                <Pressable style={styles.overlay} onPress={onClose} accessibilityRole="button" accessibilityLabel="Cerrar modal">
                    <Pressable
                        style={[
                            styles.card,
                            isPhone && styles.cardPhone,
                            { maxWidth, paddingBottom: isPhone ? Math.max(insets.bottom, rem(12)) : rem(18) },
                        ]}
                        onPress={() => undefined}
                    >
                        <View style={styles.header}>
                            <View style={styles.headerCopy}>
                                {eyebrow ? <Text style={styles.eyebrow}>{eyebrow.toUpperCase()}</Text> : null}
                                <Text style={styles.title} numberOfLines={2}>{title}</Text>
                            </View>
                            <Pressable
                                onPress={onClose}
                                style={({ pressed }) => [styles.closeButton, pressed && styles.closePressed]}
                                hitSlop={8}
                                accessibilityRole="button"
                                accessibilityLabel="Cerrar"
                            >
                                <X size={rem(16)} color={colors.text} strokeWidth={2.4} />
                            </Pressable>
                        </View>

                        <ScrollView
                            style={styles.scroll}
                            contentContainerStyle={styles.body}
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                        >
                            {children}
                        </ScrollView>

                        {footer ? <View style={styles.footer}>{footer}</View> : null}
                    </Pressable>
                </Pressable>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const getStyles = (colors: CourtsPalette) => StyleSheet.create({
    keyboard: {
        flex: 1,
    },
    overlay: {
        flex: 1,
        backgroundColor: colors.overlay,
        justifyContent: 'center',
        alignItems: 'center',
        padding: rem(16),
    },
    card: {
        width: '100%',
        maxHeight: '92%',
        backgroundColor: colors.surface,
        borderRadius: rem(courtsRadii.hero),
        overflow: 'hidden',
        ...courtsShadow.card,
    },
    cardPhone: {
        marginTop: 'auto',
        borderRadius: rem(courtsRadii.hero),
        maxHeight: '94%',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: rem(12),
        paddingHorizontal: rem(courtsSpacing.xxl),
        paddingTop: rem(20),
        paddingBottom: rem(10),
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
    },
    headerCopy: {
        flex: 1,
        minWidth: 0,
    },
    eyebrow: {
        alignSelf: 'flex-start',
        borderRadius: rem(courtsRadii.pill),
        backgroundColor: colors.indigoMuted,
        color: colors.indigoDark,
        fontFamily: courtsFonts.extraBold,
        fontSize: rem(courtsTypography.nano),
        letterSpacing: 1,
        paddingHorizontal: rem(9),
        paddingVertical: rem(4),
        overflow: 'hidden',
    },
    title: {
        marginTop: rem(6),
        fontFamily: courtsFonts.extraBold,
        fontSize: rem(21),
        lineHeight: rem(25),
        letterSpacing: -0.4,
        color: colors.text,
    },
    closeButton: {
        width: rem(36),
        height: rem(36),
        borderRadius: rem(18),
        backgroundColor: colors.surfaceLow,
        alignItems: 'center',
        justifyContent: 'center',
    },
    closePressed: {
        opacity: 0.7,
    },
    scroll: {
        flexGrow: 0,
    },
    body: {
        paddingHorizontal: rem(courtsSpacing.xxl),
        paddingTop: rem(16),
        paddingBottom: rem(18),
        gap: rem(14),
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: rem(8),
        paddingHorizontal: rem(courtsSpacing.xxl),
        paddingTop: rem(12),
        paddingBottom: rem(12),
        borderTopWidth: 1,
        borderTopColor: colors.divider,
        backgroundColor: colors.surface,
    },
});
