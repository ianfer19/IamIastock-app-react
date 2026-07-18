import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Cpu, Bell, Menu, Sun, Moon, MessageSquare } from 'lucide-react-native';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/core/theme/theme';
import { useThemeStore } from '@/presentation/store/themeStore';
import { rem } from '@/core/utils/responsive';
import { Env } from '@/core/config/env';
import { useAppSelector } from '@/core/store/store';
import { useNavigation } from '@react-navigation/native';

import { Sidebar } from './Sidebar';
import { NotificationHistoryModal } from '@/presentation/components/NotificationHistoryModal';
import { NotificationService } from '@/core/services/notificationService';

// ─────────────────────────────────────────────────────────
// DashboardHeader — Premium Navbar (Logo + Hamburger)
// ─────────────────────────────────────────────────────────
export const DashboardHeader = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [isSidebarVisible, setIsSidebarVisible] = React.useState(false);
  const [isNotifVisible, setIsNotifVisible] = React.useState(false);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const { user } = useAppSelector((state) => state.auth);
  const { colors, mode } = useTheme();
  const { toggleTheme } = useThemeStore();
  const styles = getStyles(colors, mode);

  React.useEffect(() => {
    const unsubscribe = NotificationService.subscribeHistory(() => {
      setUnreadCount(NotificationService.getUnreadCount());
    });
    return () => unsubscribe();
  }, []);

  const handleOpenNotifications = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsNotifVisible(true);
  };

  const handleToggleTheme = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleTheme();
  };

  const headerHeight = rem(56) + insets.top;
  const initial = (user?.name || user?.nombre || user?.email || 'U')[0].toUpperCase();

  return (
    <>
      <View style={[styles.header, { height: headerHeight, paddingTop: insets.top }]}>
        {/* ── Left: Logo ─────────────────────────── */}
        <View style={styles.logoSection}>
          <MotiView
            from={{ scale: 0.9, rotate: '-10deg' }}
            animate={{ scale: 1, rotate: '0deg' }}
            transition={{ type: 'spring', damping: 15, stiffness: 180 }}
            style={styles.logoIcon}
          >
            <Cpu size={rem(16)} color="#FFFFFF" />
          </MotiView>
          <Text style={styles.logoText}>
            IA<Text style={styles.logoTextBold}>Stock</Text>
          </Text>

          {/* DEV Badge — only in development */}
          {Env.IS_DEV && (
            <MotiView
              from={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 15, stiffness: 200, delay: 200 }}
              style={styles.devBadge}
            >
              <View style={styles.devDot} />
              <Text style={styles.devBadgeText}>DEV</Text>
            </MotiView>
          )}
        </View>

        {/* ── Right: Actions ─────────────────────── */}
        <View style={styles.actionsSection}>
          {/* Theme Toggle */}
          <TouchableOpacity
            style={styles.actionBtn}
            activeOpacity={0.7}
            onPress={handleToggleTheme}
          >
            {mode === 'light' ? (
              <Moon size={rem(18)} color={colors.textMuted} strokeWidth={2} />
            ) : (
              <Sun size={rem(18)} color={colors.gold} strokeWidth={2} />
            )}
          </TouchableOpacity>

          {/* Notification Bell */}
          <TouchableOpacity
            style={styles.actionBtn}
            activeOpacity={0.7}
            onPress={handleOpenNotifications}
          >
            <Bell size={rem(18)} color={colors.textMuted} strokeWidth={2} />
            {unreadCount > 0 && (
              <View style={styles.badgeContainer}>
                <Text style={styles.badgeText}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Omnichannel Chat Button */}
          <TouchableOpacity
            style={styles.actionBtn}
            activeOpacity={0.7}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate('OMNICHAT');
            }}
          >
            <MessageSquare size={rem(18)} color={colors.primary} strokeWidth={2} />
          </TouchableOpacity>

          {/* Hamburger Menu */}
          <TouchableOpacity
            style={styles.menuBtn}
            activeOpacity={0.8}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setIsSidebarVisible(true);
            }}
          >
            <Menu size={rem(20)} color={colors.text} strokeWidth={2.2} />
          </TouchableOpacity>
        </View>
      </View>

      <Sidebar
        isVisible={isSidebarVisible}
        onClose={() => setIsSidebarVisible(false)}
      />

      <NotificationHistoryModal
        isVisible={isNotifVisible}
        onClose={() => setIsNotifVisible(false)}
      />
    </>
  );
};

export const DashboardFooter = () => null;

const getStyles = (colors: any, mode: string) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: rem(16),
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: mode === 'light' ? '#F1F5F9' : '#334155',
    ...Platform.select({
      ios: {
        shadowColor: colors.text,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: mode === 'light' ? 0.04 : 0.2,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
    }),
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rem(7),
  },
  logoIcon: {
    width: rem(30),
    height: rem(30),
    backgroundColor: colors.primary,
    borderRadius: rem(9),
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: rem(18),
    color: colors.text,
    fontFamily: 'Inter-Regular',
    letterSpacing: -0.3,
  },
  logoTextBold: {
    fontWeight: '900',
    color: colors.primary,
    fontFamily: 'Inter-Black',
  },
  devBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: mode === 'light' ? '#EEF2FF' : '#1E1B4B',
    paddingHorizontal: rem(8),
    paddingVertical: rem(3),
    borderRadius: rem(6),
    borderWidth: 1,
    borderColor: mode === 'light' ? '#E0E7FF' : '#312E81',
    gap: rem(4),
    marginLeft: rem(2),
  },
  devDot: {
    width: rem(5),
    height: rem(5),
    borderRadius: rem(3),
    backgroundColor: colors.primary,
  },
  devBadgeText: {
    color: colors.primary,
    fontSize: rem(8),
    fontWeight: '800',
    fontFamily: 'Inter-Bold',
    letterSpacing: 0.5,
  },
  actionsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rem(6),
  },
  actionBtn: {
    width: rem(36),
    height: rem(36),
    backgroundColor: mode === 'light' ? '#F8FAFC' : '#0F172A',
    borderRadius: rem(11),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: mode === 'light' ? '#F1F5F9' : '#334155',
  },
  avatarPill: {
    position: 'relative',
  },
  avatarCircle: {
    width: rem(32),
    height: rem(32),
    borderRadius: rem(10),
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontSize: rem(13),
    fontWeight: '800',
    fontFamily: 'Inter-Bold',
  },
  avatarOnlineDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: rem(9),
    height: rem(9),
    borderRadius: rem(5),
    backgroundColor: '#10B981',
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  menuBtn: {
    width: rem(36),
    height: rem(36),
    backgroundColor: mode === 'light' ? '#F8FAFC' : '#0F172A',
    borderRadius: rem(11),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: mode === 'light' ? '#F1F5F9' : '#334155',
  },
  badgeContainer: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    borderRadius: rem(8),
    minWidth: rem(15),
    height: rem(15),
    paddingHorizontal: rem(3),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: rem(8),
    fontWeight: '900',
    fontFamily: 'Inter-Bold',
  },
});
