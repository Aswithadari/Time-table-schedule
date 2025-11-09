
export interface SavedConfigData {
  classPeriodConfigs: any[];
  classConfigs: any[];
  savedAt: string;
}

const CONFIG_STORAGE_KEY = 'timetable_config_data';

export const saveConfigData = (classPeriodConfigs: any[], classConfigs: any[]): void => {
  const savedData: SavedConfigData = {
    classPeriodConfigs,
    classConfigs,
    savedAt: new Date().toISOString(),
  };
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(savedData));
  console.log('Configuration data saved to localStorage');
};

export const getSavedConfigData = (): SavedConfigData | null => {
  try {
    const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.error('Error loading saved config data:', error);
    return null;
  }
};

export const clearSavedConfigData = (): void => {
  localStorage.removeItem(CONFIG_STORAGE_KEY);
  console.log('Saved configuration data cleared');
};

export const hasSavedConfigData = (): boolean => {
  return localStorage.getItem(CONFIG_STORAGE_KEY) !== null;
};
