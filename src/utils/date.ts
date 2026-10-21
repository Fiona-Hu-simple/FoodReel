import type { MealType } from '../types';

// 将本地日期格式化为四位年、两位月和两位日组成的日期键。
export const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// 将时间戳转换为本地二十四小时制的时分文本。
export const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

// 按本地小时将时间戳划分为早餐、午餐、晚餐或夜宵。
export const getMealType = (timestamp: number): MealType => {
  const hour = new Date(timestamp).getHours();
  if (hour >= 5 && hour < 10) return 'breakfast';
  if (hour >= 10 && hour < 14) return 'lunch';
  if (hour >= 14 && hour < 20) return 'dinner';
  return 'supper';
};

// 返回餐次对应的中文名称。
export const getMealTypeLabel = (type: MealType): string => {
  const labels: Record<MealType, string> = {
    breakfast: '早餐',
    lunch: '午餐',
    dinner: '晚餐',
    supper: '夜宵',
  };
  return labels[type];
};

// 返回餐次对应的背景色与文字颜色样式类。
export const getMealTypeColor = (type: MealType): string => {
  const colors: Record<MealType, string> = {
    breakfast: 'bg-orange-100 text-orange-700',
    lunch: 'bg-yellow-100 text-yellow-700',
    dinner: 'bg-blue-100 text-blue-700',
    supper: 'bg-purple-100 text-purple-700',
  };
  return colors[type];
};

// 返回指定年月的天数，其中月份从零开始计数。
export const getDaysInMonth = (year: number, month: number): number => {
  return new Date(year, month + 1, 0).getDate();
};

// 返回指定月份首日的星期序号，星期日为零且月份从零开始。
export const getFirstDayOfMonth = (year: number, month: number): number => {
  return new Date(year, month, 1).getDay();
};

// 比较两个本地日期的年、月、日是否相同。
export const isSameDate = (d1: Date, d2: Date): boolean => {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

// 判断给定日期是否为本地今天。
export const isToday = (date: Date): boolean => {
  return isSameDate(date, new Date());
};
