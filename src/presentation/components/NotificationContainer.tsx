import React, { useState, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { rem } from '@/core/utils/responsive';
import {
  NotificationService,
  NotificationPayload,
} from '@/core/services/notificationService';
import { NotificationToast } from './NotificationToast';

export const NotificationContainer: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationPayload[]>([]);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    // Subscribe to incoming notifications
    const unsubscribe = NotificationService.subscribe((notification) => {
      setNotifications((prev) => {
        // Limit maximum concurrent toasts to 3 for elegant UX density
        const activeList = [...prev, notification];
        if (activeList.length > 3) {
          return activeList.slice(activeList.length - 3);
        }
        return activeList;
      });
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleDismiss = (id: string) => {
    setNotifications((prev) => prev.filter((item) => item.id !== id));
  };

  if (notifications.length === 0) return null;

  return (
    <View
      style={[
        styles.globalOverlay,
        {
          top: insets.top + rem(10),
        },
      ]}
      pointerEvents="box-none"
    >
      {notifications.map((notif) => (
        <NotificationToast
          key={notif.id}
          notification={notif}
          onDismiss={handleDismiss}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  globalOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 999999, // Ensure it sits above all views, modals, drawers, and tabs
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
});
