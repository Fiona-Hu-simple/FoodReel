import { useState, useCallback, useEffect } from 'react';
import type { Food } from '../types';
import { loadFoods, saveFoods, generateId } from '../utils/storage';
import { loadDeletedDefaults, saveFoodPreferences } from '../utils/foodPreferences';
import { createDefaultFoods } from '../data/defaultFoods';

// 管理当前用户的食物库及持久化，提供增删、默认列表维护和避免连续重复的随机抽取。
export const useFoods = (userId: string) => {
  const [foods, setFoods] = useState<Food[]>(() => loadFoods(userId) /* 从当前用户的本地存储加载初始食物库。 */);
  const [lastPickedId, setLastPickedId] = useState<string | null>(null);

  // 在食物库或用户变化时保存食物列表。
  useEffect(() => {
    saveFoods(userId, foods);
  }, [foods, userId]);

  // 校验食物名称，拒绝空值、超长和重复项，并添加自定义食物。
  const addFood = useCallback((name: string): { success: boolean; message: string } => {
    const trimmed = name.trim();
    if (!trimmed) {
      return { success: false, message: '食物名称不能为空' };
    }
    if (trimmed.length > 20) {
      return { success: false, message: '食物名称不能超过20个字符' };
    }
    const exists = foods.some((f) => f.name === trimmed /* 判断是否已有同名食物。 */);
    if (exists) {
      return { success: false, message: '该食物已存在' };
    }
    const newFood: Food = {
      id: generateId(),
      name: trimmed,
      isDefault: false,
      createdAt: Date.now(),
    };
    setFoods((prev) => [...prev, newFood] /* 在现有食物列表末尾追加新食物。 */);
    return { success: true, message: '添加成功' };
  }, [foods]);

  // 删除指定食物，持久化默认项删除偏好并按需清除上次抽取标识。
  const deleteFood = useCallback((id: string) => {
    const food = foods.find(item => item.id === id /* 查找待删除的食物。 */);
    const deleted = new Set(loadDeletedDefaults(userId));
    if (food?.isDefault) deleted.add(food.name);
    const updated = foods.filter(item => item.id !== id /* 保留标识不同于待删除项的食物。 */);
    saveFoodPreferences(userId, updated, [...deleted]);
    setFoods(updated);
    if (lastPickedId === id) setLastPickedId(null);
  }, [foods, lastPickedId, userId]);

  // 合并个人食物与最新默认列表，保留删除偏好、优先保留同名个人项并保存结果。
  const updateDefaults = useCallback((): void => {
    const deleted = new Set(loadDeletedDefaults(userId));
    // 新默认食物与个人食物同名时，优先保留个人食物。
    const names = new Set<string>();
    const updatedFoods = [
      ...foods.filter((food) => food.isDefault !== true /* 筛选个人添加的食物。 */),
      ...createDefaultFoods().filter(food => !deleted.has(food.name) /* 排除用户已删除的默认食物。 */),
    ].filter((food) => {
      if (names.has(food.name)) return false;
      names.add(food.name);
      return true;
    } /* 按名称去重并保留首次出现的食物。 */);

    // 先保存数据，避免写入失败时仍向用户提示更新成功。
    saveFoods(userId, updatedFoods);
    setFoods(updatedFoods);
    setLastPickedId(null);
  }, [foods, userId]);

  // 用去重后的最新默认列表替换食物库，清空删除偏好和上次抽取标识。
  const restoreDefaults = useCallback((): void => {
    const names = new Set<string>();
    const updated = createDefaultFoods().filter(food => {
      if (names.has(food.name)) return false;
      names.add(food.name);
      return true;
    } /* 按名称去重并保留首次出现的默认食物。 */);
    saveFoodPreferences(userId, updated, []);
    setFoods(updated);
    setLastPickedId(null);
  }, [userId]);

  // 从食物库随机选取食物，多于一项时排除上次结果并记录本次标识。
  const pickRandomFood = useCallback((): Food | null => {
    if (foods.length === 0) return null;
    let pool = foods;
    if (foods.length > 1 && lastPickedId) {
      pool = foods.filter((f) => f.id !== lastPickedId /* 从候选池排除上次抽中的食物。 */);
    }
    const randomIndex = Math.floor(Math.random() * pool.length);
    const picked = pool[randomIndex];
    setLastPickedId(picked.id);
    return picked;
  }, [foods, lastPickedId]);

  return {
    foods,
    addFood,
    deleteFood,
    updateDefaults,
    restoreDefaults,
    pickRandomFood,
  };
};
