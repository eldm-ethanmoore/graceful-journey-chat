const STORAGE_KEY = 'graceful_journey_secure_storage';
const SETTINGS_KEY = 'graceful_journey_settings';

export interface AppSettings {
  temperature: number;
  maxTokens: number;
  enableTimestamps: boolean;
  showTimestamps: boolean;
  isDark: boolean;           // Added for theme preference
  selectedModel: string;     // Added for model selection
  hasConsented: boolean | null; // Added for consent tracking (null = not decided)
  exportWithSystemPrompt: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  temperature: 0.7,
  maxTokens: 4096,
  enableTimestamps: false,
  showTimestamps: true,
  isDark: true,              // Default to dark mode
  selectedModel: "phala/llama-3.3-70b-instruct", // Default model
  hasConsented: null,         // Default to not decided
  exportWithSystemPrompt: false
};

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
  },
  
  // Settings storage methods
  saveSettings: (settings: AppSettings): void => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  },
  
  loadSettings: (): AppSettings => {
    try {
      const data = localStorage.getItem(SETTINGS_KEY);
      return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
    } catch (error) {
      console.error('Error loading settings:', error);
      return DEFAULT_SETTINGS;
    }
  }
};
