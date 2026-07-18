import * as SecureStore from 'expo-secure-store';

export type NotificationType = 'success' | 'error' | 'warning' | 'info' | 'order' | 'stock';

export interface NotificationPayload {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  duration?: number;
  timestamp: number;
  read?: boolean;
}

type NotificationListener = (notification: NotificationPayload) => void;
type HistoryListener = (history: NotificationPayload[]) => void;

const HISTORY_STORAGE_KEY = 'iamiastock_notifications_history';
const MAX_HISTORY_ITEMS = 50;

class NotificationServiceClass {
  private listeners: Set<NotificationListener> = new Set();
  private historyListeners: Set<HistoryListener> = new Set();
  private historyList: NotificationPayload[] = [];
  private isInitialized = false;

  constructor() {
    this.init();
  }

  private async init() {
    try {
      const storedHistory = await SecureStore.getItemAsync(HISTORY_STORAGE_KEY);
      if (storedHistory) {
        this.historyList = JSON.parse(storedHistory);
      }
    } catch (err) {
      console.error('[NotificationService] Error loading stored history:', err);
    } finally {
      this.isInitialized = true;
      this.notifyHistoryListeners();
    }
  }

  // Active toast subscribers
  subscribe(listener: NotificationListener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  // History update subscribers
  subscribeHistory(listener: HistoryListener) {
    this.historyListeners.add(listener);
    // Emit initial load if already initialized
    if (this.isInitialized) {
      listener(this.historyList);
    }
    return () => {
      this.historyListeners.delete(listener);
    };
  }

  private notifyHistoryListeners() {
    this.historyListeners.forEach((listener) => {
      try {
        listener([...this.historyList]);
      } catch (err) {
        console.error('[NotificationService] Error in history listener:', err);
      }
    });
  }

  private async saveHistory() {
    try {
      await SecureStore.setItemAsync(HISTORY_STORAGE_KEY, JSON.stringify(this.historyList));
    } catch (err) {
      console.error('[NotificationService] Error persisting history:', err);
    }
  }

  async show(notification: Omit<NotificationPayload, 'id' | 'timestamp' | 'read'>) {
    const fullNotification: NotificationPayload = {
      id: Math.random().toString(36).substring(7),
      duration: 4000,
      timestamp: Date.now(),
      read: false,
      ...notification,
    };

    // Prepend to history, cap to maximum limit
    this.historyList = [fullNotification, ...this.historyList].slice(0, MAX_HISTORY_ITEMS);
    this.notifyHistoryListeners();
    await this.saveHistory();

    // Trigger active screen alerts
    this.listeners.forEach((listener) => {
      try {
        listener(fullNotification);
      } catch (err) {
        console.error('[NotificationService] Error in active listener:', err);
      }
    });
  }

  // History operations
  getHistory(): NotificationPayload[] {
    return [...this.historyList];
  }

  async clearHistory() {
    this.historyList = [];
    this.notifyHistoryListeners();
    await this.saveHistory();
  }

  async deleteFromHistory(id: string) {
    this.historyList = this.historyList.filter((item) => item.id !== id);
    this.notifyHistoryListeners();
    await this.saveHistory();
  }

  async markAllAsRead() {
    let changed = false;
    this.historyList = this.historyList.map((item) => {
      if (!item.read) {
        changed = true;
        return { ...item, read: true };
      }
      return item;
    });

    if (changed) {
      this.notifyHistoryListeners();
      await this.saveHistory();
    }
  }

  getUnreadCount(): number {
    return this.historyList.filter((item) => !item.read).length;
  }

  // Quick shortcuts
  success(title: string, message: string, duration?: number) {
    this.show({ type: 'success', title, message, duration });
  }

  error(title: string, message: string, duration?: number) {
    this.show({ type: 'error', title, message, duration });
  }

  warning(title: string, message: string, duration?: number) {
    this.show({ type: 'warning', title, message, duration });
  }

  info(title: string, message: string, duration?: number) {
    this.show({ type: 'info', title, message, duration });
  }

  order(title: string, message: string, duration?: number) {
    this.show({ type: 'order', title, message, duration });
  }

  stock(title: string, message: string, duration?: number) {
    this.show({ type: 'stock', title, message, duration });
  }
}

export const NotificationService = new NotificationServiceClass();
