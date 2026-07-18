import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Animated,
  PanResponder,
  Platform,
} from 'react-native';
import {
  X,
  Trash2,
  BellOff,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  ShoppingBag,
  Package,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { rem } from '@/core/utils/responsive';
import { SoundService } from '@/core/services/soundService';
import {
  NotificationService,
  NotificationPayload,
} from '@/core/services/notificationService';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.75;
const SWIPE_THRESHOLD = 80;

const TYPE_CONFIGS = {
  success: { color: '#10B981', Icon: CheckCircle2, bgColor: '#ECFDF5' },
  error: { color: '#EF4444', Icon: XCircle, bgColor: '#FEF2F2' },
  warning: { color: '#F59E0B', Icon: AlertTriangle, bgColor: '#FFFBEB' },
  info: { color: '#3B82F6', Icon: Info, bgColor: '#EFF6FF' },
  order: { color: '#8B5CF6', Icon: ShoppingBag, bgColor: '#F5F3FF' },
  stock: { color: '#EC4899', Icon: Package, bgColor: '#FDF2F8' },
};

interface NotificationHistoryModalProps {
  isVisible: boolean;
  onClose: () => void;
}

export const NotificationHistoryModal: React.FC<NotificationHistoryModalProps> = ({
  isVisible,
  onClose,
}) => {
  const [history, setHistory] = useState<NotificationPayload[]>([]);

  // Flawless single-value translation to support Android smoothly
  const translateY = useRef(new Animated.Value(800)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isVisible) {
      // Load current history and subscribe to changes
      const unsubscribe = NotificationService.subscribeHistory((items) => {
        setHistory(items);
      });

      // Mark all as read when opening history
      NotificationService.markAllAsRead();

      // Reset and trigger parallel spring entry
      translateY.setValue(800);
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0.5,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();

      return () => {
        unsubscribe();
      };
    }
  }, [isVisible]);

  const handleClose = () => {
    SoundService.playClick();
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 800,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  // Android-tested gesture responder
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        } else {
          translateY.setValue(0);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > SWIPE_THRESHOLD || gestureState.vy > 0.4) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          Animated.parallel([
            Animated.timing(translateY, {
              toValue: 800,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(overlayOpacity, {
              toValue: 0,
              duration: 180,
              useNativeDriver: true,
            }),
          ]).start(() => {
            onClose();
          });
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            friction: 6,
            tension: 40,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const handleClearAll = async () => {
    if (history.length === 0) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await NotificationService.clearHistory();
  };

  const handleDeleteItem = async (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await NotificationService.deleteFromHistory(id);
  };

  const getRelativeTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 10) return 'Ahora mismo';
    if (seconds < 60) return `Hace ${seconds} s`;
    if (minutes < 60) return `Hace ${minutes} m`;
    if (hours < 24) return `Hace ${hours} h`;
    return `Hace ${days} d`;
  };

  return (
    <Modal
      transparent
      animationType="none"
      visible={isVisible}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        {/* Semi-transparent dark backdrop overlay */}
        <Animated.View
          style={[styles.backdrop, { opacity: overlayOpacity }]}
          pointerEvents="auto"
        >
          <TouchableOpacity
            style={styles.backdropClickable}
            activeOpacity={1}
            onPress={handleClose}
          />
        </Animated.View>

        {/* Sliding Bottom Sheet */}
        <Animated.View
          style={[
            styles.sheetContainer,
            {
              transform: [{ translateY }],
            },
          ]}
        >
          {/* Header dragging hotspot */}
          <View {...panResponder.panHandlers} style={styles.dragHeader}>
            <View style={styles.dragHandle} />
          </View>

          {/* Title Area */}
          <View style={styles.titleRow}>
            <Text style={styles.titleText}>Historial de Alertas</Text>
            {history.length > 0 && (
              <TouchableOpacity
                style={styles.clearBtn}
                activeOpacity={0.6}
                onPress={handleClearAll}
              >
                <Trash2 size={rem(14)} color="#EF4444" style={styles.clearIcon} />
                <Text style={styles.clearText}>Limpiar todo</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* List Scroll */}
          <ScrollView
            style={styles.scrollContainer}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {history.length === 0 ? (
              /* Empty state */
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                  <BellOff size={rem(28)} color="#94A3B8" />
                </View>
                <Text style={styles.emptyTitle}>¡Todo al día!</Text>
                <Text style={styles.emptySubtext}>
                  No tienes notificaciones recientes. Cuando ocurra algo nuevo te lo haremos saber aquí.
                </Text>
              </View>
            ) : (
              /* History cards */
              history.map((item) => {
                const config = TYPE_CONFIGS[item.type] || TYPE_CONFIGS.info;
                const IconComponent = config.Icon;

                return (
                  <View key={item.id} style={styles.notifCard}>
                    {/* Left Accent Color bar */}
                    <View style={[styles.cardAccentBar, { backgroundColor: config.color }]} />

                    <View style={styles.cardMain}>
                      {/* Left icon circle */}
                      <View style={[styles.cardIconCircle, { backgroundColor: config.bgColor }]}>
                        <IconComponent size={rem(15)} color={config.color} strokeWidth={2.5} />
                      </View>

                      {/* Info cluster */}
                      <View style={styles.cardTexts}>
                        <View style={styles.cardHeaderRow}>
                          <Text style={styles.cardTitle} numberOfLines={1}>
                            {item.title}
                          </Text>
                          <Text style={styles.cardTime}>
                            {getRelativeTime(item.timestamp)}
                          </Text>
                        </View>
                        <Text style={styles.cardMessage}>{item.message}</Text>
                      </View>

                      {/* Delete action item */}
                      <TouchableOpacity
                        style={styles.itemDeleteBtn}
                        activeOpacity={0.5}
                        onPress={() => handleDeleteItem(item.id)}
                      >
                        <X size={rem(13)} color="#94A3B8" strokeWidth={2.5} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>

          {/* Close Floating Ring */}
          <TouchableOpacity
            style={styles.floatingCloseBtn}
            activeOpacity={0.8}
            onPress={handleClose}
          >
            <X size={rem(18)} color="#64748B" strokeWidth={2.5} />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0F172A',
  },
  backdropClickable: {
    flex: 1,
  },
  sheetContainer: {
    height: SHEET_HEIGHT,
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: rem(24),
    borderTopRightRadius: rem(24),
    paddingBottom: Platform.OS === 'ios' ? rem(30) : rem(20),
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
      },
      android: {
        elevation: 20,
      },
    }),
  },
  dragHeader: {
    width: '100%',
    height: rem(26),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  dragHandle: {
    width: rem(36),
    height: rem(5),
    borderRadius: rem(3),
    backgroundColor: '#CBD5E1',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: rem(20),
    paddingBottom: rem(12),
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  titleText: {
    fontSize: rem(17),
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: 'Inter-Bold',
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: rem(10),
    paddingVertical: rem(6),
    borderRadius: rem(8),
  },
  clearIcon: {
    marginRight: rem(4),
  },
  clearText: {
    fontSize: rem(11),
    fontWeight: '700',
    color: '#EF4444',
    fontFamily: 'Inter-Bold',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: rem(16),
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: rem(80),
    paddingHorizontal: rem(30),
  },
  emptyIconCircle: {
    width: rem(60),
    height: rem(60),
    borderRadius: rem(30),
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: rem(14),
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  emptyTitle: {
    fontSize: rem(14.5),
    fontWeight: '700',
    color: '#475569',
    fontFamily: 'Inter-Bold',
    marginBottom: rem(6),
  },
  emptySubtext: {
    fontSize: rem(12),
    color: '#94A3B8',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: rem(17),
  },
  notifCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: rem(14),
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: rem(10),
    overflow: 'hidden',
    position: 'relative',
  },
  cardAccentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: rem(4),
    zIndex: 2,
  },
  cardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: rem(12),
    paddingVertical: rem(12),
    paddingLeft: rem(16),
  },
  cardIconCircle: {
    width: rem(28),
    height: rem(28),
    borderRadius: rem(8),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: rem(10),
  },
  cardTexts: {
    flex: 1,
    paddingRight: rem(4),
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: rem(2),
  },
  cardTitle: {
    fontSize: rem(12),
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: 'Inter-Bold',
    flex: 1,
    marginRight: rem(6),
  },
  cardTime: {
    fontSize: rem(9.5),
    fontWeight: '600',
    color: '#94A3B8',
    fontFamily: 'Inter-SemiBold',
  },
  cardMessage: {
    fontSize: rem(11),
    color: '#475569',
    fontFamily: 'Inter-Medium',
    lineHeight: rem(14),
  },
  itemDeleteBtn: {
    width: rem(20),
    height: rem(20),
    borderRadius: rem(10),
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: rem(6),
  },
  floatingCloseBtn: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? rem(40) : rem(30),
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    width: rem(44),
    height: rem(44),
    borderRadius: rem(22),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
    }),
  },
});
