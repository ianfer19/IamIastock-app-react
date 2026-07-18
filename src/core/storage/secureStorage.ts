import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const SECURE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  ID_TOKEN: 'id_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_DATA: 'user_data',
  CASH_REGISTER_ID: 'cash_register_id',
  CASH_REGISTER_NAME: 'cash_register_name',
};

export const SecureStorage = {
  saveToken: async (key: string, value: string) => {
    await SecureStore.setItemAsync(key, value);
  },

  getToken: async (key: string) => {
    return await SecureStore.getItemAsync(key);
  },

  saveUser: async (user: any) => {
    try {
      await AsyncStorage.setItem(SECURE_KEYS.USER_DATA, JSON.stringify(user));
      // Clean up legacy SecureStore entry if present to keep keychain clean
      await SecureStore.deleteItemAsync(SECURE_KEYS.USER_DATA).catch(() => {});
    } catch (e) {
      console.error('Error storing user profile in AsyncStorage', e);
    }
  },

  getUser: async () => {
    try {
      // 1. Try reading from AsyncStorage (No size limit, perfect for rich profiles)
      const cached = await AsyncStorage.getItem(SECURE_KEYS.USER_DATA);
      if (cached) {
        return JSON.parse(cached);
      }

      // 2. Migration fallback: If not in AsyncStorage, check SecureStore
      const secureCached = await SecureStore.getItemAsync(SECURE_KEYS.USER_DATA);
      if (secureCached) {
        // Migrate to AsyncStorage for future loads
        await AsyncStorage.setItem(SECURE_KEYS.USER_DATA, secureCached);
        await SecureStore.deleteItemAsync(SECURE_KEYS.USER_DATA).catch(() => {});
        return JSON.parse(secureCached);
      }
      return null;
    } catch (e) {
      console.error('Error retrieving user profile', e);
      return null;
    }
  },

  saveCashRegister: async (id: string, name: string) => {
    await SecureStore.setItemAsync(SECURE_KEYS.CASH_REGISTER_ID, id);
    await SecureStore.setItemAsync(SECURE_KEYS.CASH_REGISTER_NAME, name);
  },

  getCashRegister: async () => {
    const id = await SecureStore.getItemAsync(SECURE_KEYS.CASH_REGISTER_ID);
    const name = await SecureStore.getItemAsync(SECURE_KEYS.CASH_REGISTER_NAME);
    return id ? { id, name } : null;
  },

  clearCashRegister: async () => {
    await SecureStore.deleteItemAsync(SECURE_KEYS.CASH_REGISTER_ID);
    await SecureStore.deleteItemAsync(SECURE_KEYS.CASH_REGISTER_NAME);
  },

  clearAll: async () => {
    await SecureStore.deleteItemAsync(SECURE_KEYS.ACCESS_TOKEN);
    await SecureStore.deleteItemAsync(SECURE_KEYS.ID_TOKEN);
    await SecureStore.deleteItemAsync(SECURE_KEYS.REFRESH_TOKEN);
    await SecureStore.deleteItemAsync(SECURE_KEYS.CASH_REGISTER_ID);
    await SecureStore.deleteItemAsync(SECURE_KEYS.CASH_REGISTER_NAME);
    
    // Clear AsyncStorage entry
    try {
      await AsyncStorage.removeItem(SECURE_KEYS.USER_DATA);
    } catch (e) {
      console.error('Error removing user profile from AsyncStorage', e);
    }
    // Delete legacy SecureStore entry if any remains
    await SecureStore.deleteItemAsync(SECURE_KEYS.USER_DATA).catch(() => {});
  }
};
