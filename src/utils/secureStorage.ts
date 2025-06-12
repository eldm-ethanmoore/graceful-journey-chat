const STORAGE_KEY = 'graceful_journey_secure_storage';

export const secureStorage = {
  set: (key: string, value: string): void => {
    try {
      const data = localStorage.getItem(STORAGE_KEY) || '{}';
      const parsedData = JSON.parse(data);
      parsedData[key] = value;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsedData));
    } catch (error) {
      console.error('Error saving to secure storage:', error);
    }
  },

  get: (key: string): string | null => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data)[key] : null;
    } catch (error) {
      console.error('Error reading from secure storage:', error);
      return null;
    }
  },

  remove: (key: string): void => {
    try {
      const data = localStorage.getItem(STORAGE_KEY) || '{}';
      const parsedData = JSON.parse(data);
      delete parsedData[key];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsedData));
    } catch (error) {
      console.error('Error removing from secure storage:', error);
    }
  },

  clear: (): void => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing secure storage:', error);
    }
  }
};
