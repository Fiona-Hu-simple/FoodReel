import type { Food } from '../types';

// 读取当前用户删除过的默认食物名称，并校验其为字符串数组。
export function loadDeletedDefaults(userId: string): string[] {
  const value: unknown = JSON.parse(localStorage.getItem('food-decider:user:' + userId + ':deletedDefaults') || '[]');
  if (!Array.isArray(value) || !value.every(name => typeof name === 'string' /* 判断删除偏好中的每一项是否为字符串。 */)) throw new Error('默认食物删除记录损坏');
  return value;
}

// 保存食物列表及默认项删除偏好，食物写入失败时回滚删除偏好。
export function saveFoodPreferences(userId: string, foods: Food[], deleted: string[]): void {
  const foodsKey = 'food-decider:user:' + userId + ':foods';
  const deletedKey = 'food-decider:user:' + userId + ':deletedDefaults';
  const old = localStorage.getItem(deletedKey);
  localStorage.setItem(deletedKey, JSON.stringify(deleted));
  try { localStorage.setItem(foodsKey, JSON.stringify(foods)); }
  catch (error) {
    if (old === null) localStorage.removeItem(deletedKey);
    else localStorage.setItem(deletedKey, old);
    throw error;
  }
}
