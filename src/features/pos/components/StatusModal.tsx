import React, { useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  Dimensions,
  Platform
} from 'react-native';
import { MotiView } from 'moti';
import { Check, X, AlertTriangle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { rem } from '@/core/utils/responsive';
import { COLORS } from '@/core/theme/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface StatusModalProps {
  isVisible: boolean;
  type: 'success' | 'error' | 'warning';
  title: string;
  message: string;
  onClose: () => void;
  actionText?: string;
}

export const StatusModal = ({
  isVisible,
  type,
  title,
  message,
  onClose,
  actionText = 'Aceptar'
}: StatusModalProps) => {

  // Play appropriate haptics on visibility change
  useEffect(() => {
    if (isVisible) {
      if (type === 'success') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (type === 'error') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    }
  }, [isVisible, type]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <Check size={rem(28)} color="#059669" />;
      case 'error':
        return <X size={rem(28)} color="#DC2626" />;
      case 'warning':
        return <AlertTriangle size={rem(28)} color="#D97706" />;
    }
  };

  const getColors = () => {
    switch (type) {
      case 'success':
        return {
          iconBg: '#ECFDF5',
          iconRing: 'rgba(16, 185, 129, 0.12)',
          buttonBg: '#059669',
          shadow: 'rgba(16, 185, 129, 0.25)',
          accent: '#10B981'
        };
      case 'error':
        return {
          iconBg: '#FEF2F2',
          iconRing: 'rgba(239, 68, 68, 0.12)',
          buttonBg: '#DC2626',
          shadow: 'rgba(239, 68, 68, 0.25)',
          accent: '#EF4444'
        };
      case 'warning':
        return {
          iconBg: '#FFFBEB',
          iconRing: 'rgba(245, 158, 11, 0.12)',
          buttonBg: '#D97706',
          shadow: 'rgba(245, 158, 11, 0.25)',
          accent: '#F59E0B'
        };
    }
  };

  const colors = getColors();

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <MotiView
          from={{ opacity: 0, scale: 0.9, translateY: 20 }}
          animate={{
            opacity: isVisible ? 1 : 0,
            scale: isVisible ? 1 : 0.9,
            translateY: isVisible ? 0 : 20
          }}
          transition={{
            type: 'spring',
            damping: 18,
            stiffness: 140
          }}
          style={styles.modalCard}
        >
          {/* Circular Glowing Icon Ring */}
          <View style={styles.iconContainer}>
            <MotiView
              from={{ scale: 0.8, opacity: 0.2 }}
              animate={{ scale: 1.25, opacity: 0 }}
              transition={{ loop: true, duration: 2500, type: 'timing' }}
              style={[styles.pulseRing, { backgroundColor: colors.iconRing }]}
            />
            <MotiView
              from={{ scale: 0.9, opacity: 0.3 }}
              animate={{ scale: 1.35, opacity: 0 }}
              transition={{ loop: true, duration: 2500, delay: 500, type: 'timing' }}
              style={[styles.pulseRing, { backgroundColor: colors.iconRing }]}
            />
            <View style={[styles.iconCircle, { backgroundColor: colors.iconBg }]}>
              {getIcon()}
            </View>
          </View>

          {/* Text Contents */}
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          {/* Solid Premium Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onClose();
            }}
            style={[styles.button, { backgroundColor: colors.buttonBg, shadowColor: colors.shadow }]}
          >
            <Text style={styles.buttonText}>{actionText}</Text>
          </TouchableOpacity>
        </MotiView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)', // Premium dark glass shadow
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: rem(24)
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: rem(30),
    paddingHorizontal: rem(24),
    paddingVertical: rem(32),
    width: '100%',
    maxWidth: rem(340),
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#F1EBE0' // Subtle warm border matching beige aesthetic
  },
  iconContainer: {
    width: rem(80),
    height: rem(80),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: rem(20)
  },
  pulseRing: {
    position: 'absolute',
    width: rem(80),
    height: rem(80),
    borderRadius: rem(40)
  },
  iconCircle: {
    width: rem(54),
    height: rem(54),
    borderRadius: rem(27),
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1
  },
  title: {
    fontSize: rem(18),
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: rem(8),
    letterSpacing: -0.5,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Inter-Bold'
  },
  message: {
    fontSize: rem(13.5),
    color: '#64748B',
    textAlign: 'center',
    lineHeight: rem(20),
    paddingHorizontal: rem(10),
    marginBottom: rem(24),
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Inter-Regular'
  },
  button: {
    height: rem(46),
    borderRadius: rem(14),
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3
  },
  buttonText: {
    fontSize: rem(13.5),
    fontWeight: '800',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Inter-Bold'
  }
});
