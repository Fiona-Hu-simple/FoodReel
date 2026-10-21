export type Food = {
  id: string;
  name: string;
  isDefault?: boolean;
  createdAt: number;
};

export type MealRecord = {
  id: string;
  foodName: string;
  timestamp: number;
};

export type RecordsByDate = {
  [date: string]: MealRecord[];
};

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'supper';

export const FOODS_KEY = 'food-decider:foods';
export const RECORDS_KEY = 'food-decider:records';
