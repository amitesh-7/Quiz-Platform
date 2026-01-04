import AsyncStorage from '@react-native-async-storage/async-storage';
import {STORAGE_KEYS} from '../utils/constants';

/**
 * Storage service for managing local data persistence
 */
export const storageService = {
  /**
   * Store a value
   */
  set: async (key: string, value: any): Promise<void> => {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, jsonValue);
    } catch (error) {
      console.error('Storage set error:', error);
      throw error;
    }
  },

  /**
   * Get a value
   */
  get: async <T>(key: string): Promise<T | null> => {
    try {
      const jsonValue = await AsyncStorage.getItem(key);
      return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (error) {
      console.error('Storage get error:', error);
      return null;
    }
  },

  /**
   * Remove a value
   */
  remove: async (key: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Storage remove error:', error);
      throw error;
    }
  },

  /**
   * Clear all storage
   */
  clear: async (): Promise<void> => {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Storage clear error:', error);
      throw error;
    }
  },

  /**
   * Get all keys
   */
  getAllKeys: async (): Promise<readonly string[]> => {
    try {
      return await AsyncStorage.getAllKeys();
    } catch (error) {
      console.error('Storage getAllKeys error:', error);
      return [];
    }
  },

  // Auth specific helpers
  auth: {
    getToken: async (): Promise<string | null> => {
      return storageService.get<string>(STORAGE_KEYS.TOKEN);
    },

    setToken: async (token: string): Promise<void> => {
      return storageService.set(STORAGE_KEYS.TOKEN, token);
    },

    removeToken: async (): Promise<void> => {
      return storageService.remove(STORAGE_KEYS.TOKEN);
    },

    getUser: async (): Promise<any> => {
      return storageService.get(STORAGE_KEYS.USER);
    },

    setUser: async (user: any): Promise<void> => {
      return storageService.set(STORAGE_KEYS.USER, user);
    },

    removeUser: async (): Promise<void> => {
      return storageService.remove(STORAGE_KEYS.USER);
    },

    clearAuth: async (): Promise<void> => {
      await Promise.all([
        storageService.remove(STORAGE_KEYS.TOKEN),
        storageService.remove(STORAGE_KEYS.USER),
      ]);
    },
  },

  // Theme specific helpers
  theme: {
    getPreference: async (): Promise<'light' | 'dark' | null> => {
      return storageService.get(STORAGE_KEYS.THEME);
    },

    setPreference: async (theme: 'light' | 'dark'): Promise<void> => {
      return storageService.set(STORAGE_KEYS.THEME, theme);
    },
  },
};

export default storageService;
