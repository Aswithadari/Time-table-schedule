
export interface SavedFacultyData {
  data: any[];
  savedAt: string;
  fileName?: string;
}

const STORAGE_KEY = 'timetable_faculty_data';

export const saveFacultyData = (data: any[], fileName?: string): void => {
  const savedData: SavedFacultyData = {
    data,
    savedAt: new Date().toISOString(),
    fileName
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(savedData));
};

export const getSavedFacultyData = (): SavedFacultyData | null => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.error('Error loading saved faculty data:', error);
    return null;
  }
};

export const clearSavedFacultyData = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};

export const hasSavedFacultyData = (): boolean => {
  return localStorage.getItem(STORAGE_KEY) !== null;
};
