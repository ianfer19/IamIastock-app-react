import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Animated,
  PanResponder,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  ShoppingBag,
  Package,
  X,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { rem } from '@/core/utils/responsive';
import { COLORS } from '@/core/theme/theme';
import { SoundService } from '@/core/services/soundService';
import { NotificationPayload } from '@/core/services/notificationService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TOAST_WIDTH = SCREEN_WIDTH * 0.92;
const DISMISS_THRESHOLD = -40;

const TYPE_CONFIGS = {
  success: {
    color: '#10B981', // Emerald
    bgColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    Icon: CheckCircle2,
    sound: 'success',
    haptic: Haptics.NotificationFeedbackType.Success,
  },
  error: {
    color: '#EF4444', // Crimson Red
    bgColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    Icon: XCircle,
    sound: 'error',
    haptic: Haptics.NotificationFeedbackType.Error,
  },
  warning: {
    color: '#F59E0B', // Amber
    bgColor: '#FFFBEB',
    borderColor: '#FDE68A',
    Icon: AlertTriangle,
    sound: 'error',
    haptic: Haptics.NotificationFeedbackType.Warning,
  },
  info: {
    color: '#3B82F6', // Blue
    bgColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    Icon: Info,
    sound: 'click',
    haptic: Haptics.ImpactFeedbackStyle.Light,
  },
  order: {
    color: '#8B5CF6', // Purple
    bgColor: '#F5F3FF',
    borderColor: '#DDD6FE',
    Icon: ShoppingBag,
    sound: 'success',
    haptic: Haptics.NotificationFeedbackType.Success,
  },
  stock: {
    color: '#EC4899', // Pink/Rose
    bgColor: '#FDF2F8',
    borderColor: '#FBCFE8',
    Icon: Package,
    sound: 'error',
    haptic: Haptics.NotificationFeedbackType.Warning,
  },
};

interface NotificationToastProps {
  notification: NotificationPayload;
  onDismiss: (id: string) => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({
  notification,
  onDismiss,
}) => {
  const { id, type, title, message, duration = 4000 } = notification;
  const config = TYPE_CONFIGS[type] || TYPE_CONFIGS.info;

  // Animation values
  const translateY = useRef(new Animated.Value(-150)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const swipeY = useRef(new Animated.Value(0)).current;
  
  // Progress bar animation using scales to utilize Native Driver (60 FPS!)
  const progressScaleX = useRef(new Animated.Value(1)).current;

  // Refs for timers
  const autoHideTimer = useRef<any>(null);

  // Trigger audio-tactile alerts on mount
  useEffect(() => {
    // Play corresponding chime
    if (config.sound === 'success') {
      SoundService.playSuccess();
    } else if (config.sound === 'error') {
      SoundService.playError();
    } else {
      SoundService.playClick();
    }

    // Trigger haptic feedback
    if (type === 'info') {
      Haptics.impactAsync(config.haptic as Haptics.ImpactFeedbackStyle);
    } else {
      Haptics.notificationAsync(config.haptic as Haptics.NotificationFeedbackType);
    }

    // Entry animation
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Progress bar shrink animation
    Animated.timing(progressScaleX, {
      toValue: 0,
      duration: duration,
      useNativeDriver: true,
    }).start();

    // Auto dismiss timer
    autoHideTimer.current = setTimeout(() => {
      dismiss();
    }, duration);

    return () => {
      if (autoHideTimer.current) clearTimeout(autoHideTimer.current);
    };
  }, []);

  const dismiss = () => {
    if (autoHideTimer.current) clearTimeout(autoHideTimer.current);

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -150,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss(id);
    });
  };

  // Pan responder for swipe-up to dismiss gesture
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only trigger if moving upwards
        return gestureState.dy < 0;
      },
      onPanResponderMove: (_, gestureState) => {
        // Only track upward movement
        if (gestureState.dy < 0) {
          swipeY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy < DISMISS_THRESHOLD) {
          // Swipe force met, trigger haptic & dismiss
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          dismiss();
        } else {
          // Snap back
          Animated.spring(swipeY, {
            toValue: 0,
            tension: 40,
            friction: 5,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const IconComponent = config.Icon;

  // Combine springs and swipe positions for translateY
  const combinedTranslateY = Animated.add(translateY, swipeY);

  return (
    <Animated.View
      style={[
        styles.toastWrapper,
        {
          opacity,
          transform: [{ translateY: combinedTranslateY }],
        },
      ]}
      {...panResponder.panHandlers}
    >
      <View style={[styles.toastCard, { backgroundColor: '#FFFFFF', borderColor: config.borderColor }]}>
        {/* Color Accent Left-Bar */}
        <View style={[styles.accentBar, { backgroundColor: config.color }]} />

        {/* Content Section */}
        <View style={styles.cardContent}>
          {/* Circular Icon Container */}
          <View style={[styles.iconContainer, { backgroundColor: config.bgColor }]}>
            <IconComponent size={rem(18)} color={config.color} strokeWidth={2.2} />
          </View>

          {/* Texts Block */}
          <View style={styles.textBlock}>
            <Text style={styles.titleText} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.messageText} numberOfLines={2}>
              {message}
            </Text>
          </View>

          {/* Close Button */}
          <TouchableOpacity
            style={styles.closeBtn}
            activeOpacity={0.6}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              dismiss();
            }}
          >
            <X size={rem(14)} color="#94A3B8" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        {/* Buttery Smooth Scaling Progress Bar */}
        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressBarFill,
              {
                backgroundColor: config.color,
                transform: [
                  { translateX: -TOAST_WIDTH / 2 },
                  { scaleX: progressScaleX },
                  { translateX: TOAST_WIDTH / 2 },
                ],
              },
            ]}
          />
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  toastWrapper: {
    width: TOAST_WIDTH,
    alignSelf: 'center',
    marginVertical: rem(4),
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  toastCard: {
    borderWidth: 1.5,
    borderRadius: rem(16),
    overflow: 'hidden',
    position: 'relative',
    flexDirection: 'column',
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: rem(5),
    zIndex: 2,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: rem(14),
    paddingVertical: rem(12),
    paddingLeft: rem(19), // Give space for left accent bar
  },
  iconContainer: {
    width: rem(34),
    height: rem(34),
    borderRadius: rem(10),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: rem(12),
  },
  textBlock: {
    flex: 1,
    paddingRight: rem(8),
  },
  titleText: {
    fontSize: rem(13.5),
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: 'Inter-Bold',
    marginBottom: rem(2),
  },
  messageText: {
    fontSize: rem(11.5),
    fontWeight: '500',
    color: '#64748B',
    fontFamily: 'Inter-Medium',
    lineHeight: rem(15),
  },
  closeBtn: {
    width: rem(24),
    height: rem(24),
    borderRadius: rem(12),
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressTrack: {
    height: rem(3),
    width: '100%',
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    width: '100%',
  },
});
