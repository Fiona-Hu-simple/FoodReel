import { useState, useCallback, useEffect } from 'react';
import type { MealRecord, RecordsByDate } from '../types';
import { loadRecords, saveRecords, generateId } from '../utils/storage';
import { formatDate } from '../utils/date';

// 管理当前用户按日期分组的饮食记录，并提供持久化、增删及查询方法。
export const useRecords = (userId: string) => {
  const [records, setRecords] = useState<RecordsByDate>(() => loadRecords(userId) /* 从本地存储加载当前用户的初始饮食记录。 */);

  // 在记录或用户变化时保存饮食记录。
  useEffect(() => {
    saveRecords(userId, records);
  }, [records, userId]);

  // 生成饮食记录并按时间戳对应的本地日期添加到记录集合。
  const addRecord = useCallback((foodName: string, timestamp: number = Date.now()): MealRecord => {
    const record: MealRecord = {
      id: generateId(),
      foodName,
      timestamp,
    };
    const dateKey = formatDate(new Date(timestamp));
    setRecords((prev) => {
      const dayRecords = prev[dateKey] ? [...prev[dateKey]] : [];
      dayRecords.push(record);
      return {
        ...prev,
        [dateKey]: dayRecords,
      };
    } /* 以不可变方式将新记录追加到对应日期。 */);
    return record;
  }, []);

  // 删除指定日期下的指定记录。
  const deleteRecord = useCallback((dateKey: string, recordId: string) => {
    setRecords((prev) => {
      const dayRecords = prev[dateKey];
      if (!dayRecords) return prev;
      const filtered = dayRecords.filter((r) => r.id !== recordId /* 保留标识不同于待删除项的记录。 */);
      const newRecords = { ...prev };
      if (filtered.length === 0) {
        delete newRecords[dateKey];
      } else {
        newRecords[dateKey] = filtered;
      }
      return newRecords;
    } /* 生成删除后的记录集合，并移除已无记录的日期分组。 */);
  }, []);

  // 返回所选日期的记录副本，并按时间从新到旧排序。
  const getRecordsByDate = useCallback(
    (dateKey: string): MealRecord[] => {
      return records[dateKey] ? [...records[dateKey]].sort((a, b) => b.timestamp - a.timestamp /* 比较时间戳以将较新的记录排在前面。 */) : [];
    },
    [records]
  );

  // 判断指定日期是否存在饮食记录。
  const hasRecordsOnDate = useCallback(
    (dateKey: string): boolean => {
      return !!records[dateKey] && records[dateKey].length > 0;
    },
    [records]
  );

  return {
    records,
    addRecord,
    deleteRecord,
    getRecordsByDate,
    hasRecordsOnDate,
  };
};
