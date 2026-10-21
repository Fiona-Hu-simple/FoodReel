import type { Food, RecordsByDate } from '../types';
import { createDefaultFoods } from '../data/defaultFoods';

// 拼接按用户隔离的数据存储键。
const userKey = (userId: string, kind: string) => 'food-decider:user:' + userId + ':' + kind;

// 解析本地存储文本，缺失或解析失败时返回指定默认值。
const safeParse = <T>(value: string | null, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

// 加载用户食物列表，未读取到可用列表时创建并保存默认食物。
export const loadFoods = (userId: string): Food[] => {
  const stored = localStorage.getItem(userKey(userId, 'foods'));
  if (stored) {
    const parsed = safeParse<Food[]>(stored, []);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  }
  const defaults = createDefaultFoods();
  localStorage.setItem(userKey(userId, 'foods'), JSON.stringify(defaults));
  return defaults;
};

// 将当前用户的食物列表序列化保存到本地存储。
export const saveFoods = (userId: string, foods: Food[]): void => {
  localStorage.setItem(userKey(userId, 'foods'), JSON.stringify(foods));
};

// 读取当前用户的日期分组记录，缺失或解析失败时返回空对象。
export const loadRecords = (userId: string): RecordsByDate => {
  const stored = localStorage.getItem(userKey(userId, 'records'));
  return safeParse<RecordsByDate>(stored, {});
};

// 将当前用户的饮食记录序列化保存到本地存储。
export const saveRecords = (userId: string, records: RecordsByDate): void => {
  localStorage.setItem(userKey(userId, 'records'), JSON.stringify(records));
};

// 组合当前时间戳和随机字符串，生成食物或记录的标识。
export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
};
