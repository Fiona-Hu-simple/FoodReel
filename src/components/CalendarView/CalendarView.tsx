import './CalendarView.css';
import { useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, CalendarDays, Trash2, Clock, Utensils } from 'lucide-react';
import type { MealRecord } from '../../types';
import {
  formatDate,
  formatTime,
  getDaysInMonth,
  getFirstDayOfMonth,
  isToday,
  getMealType,
  getMealTypeLabel,
} from '../../utils/date';

type CalendarViewProps = {
  hasRecordsOnDate: (dateKey: string) => boolean;
  getRecordsByDate: (dateKey: string) => MealRecord[];
  onDeleteRecord: (dateKey: string, recordId: string) => void;
  onAddRecord: (foodName: string, timestamp: number) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info', duration?: number) => void;
};

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

// 显示按月排列的饮食日历，支持查看、添加和删除所选日期的记录。
export const CalendarView = ({
  hasRecordsOnDate,
  getRecordsByDate,
  onDeleteRecord,
  onAddRecord,
  showToast,
}: CalendarViewProps) => {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<string>(formatDate(now));
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [manualFood, setManualFood] = useState('');
  const manualInputRef = useRef<HTMLInputElement>(null);

  // 计算当前月份的天数。
  const daysInMonth = useMemo(() => getDaysInMonth(year, month), [year, month]);
  // 计算当前月份首日对应的星期序号。
  const firstDay = useMemo(() => getFirstDayOfMonth(year, month), [year, month]);

  // 生成包含月初和月末空白格的完整日历网格。
  const calendarCells = useMemo(() => {
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) {
      cells.push(null);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      cells.push(day);
    }
    while (cells.length % 7 !== 0) {
      cells.push(null);
    }
    return cells;
  }, [firstDay, daysInMonth]);

  const selectedRecords = getRecordsByDate(selectedDate);
  // 关闭手动添加窗口并清空食物名称。
  const closeManualAdd = () => {
    setIsAddOpen(false);
    setManualFood('');
  };

  // 打开手动添加窗口时聚焦输入框并注册退出快捷键。
  useEffect(() => {
    if (!isAddOpen) return;
    manualInputRef.current?.focus();
    // 按退出键关闭手动添加窗口。
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeManualAdd();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape) /* 移除手动添加窗口的键盘监听。 */;
  }, [isAddOpen]);

  // 校验食物名称，以所选日期和当前时分秒生成时间戳并添加记录。
  const handleManualAdd = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const foodName = manualFood.trim();
    if (!foodName) {
      showToast('请输入食物名称', 'error');
      manualInputRef.current?.focus();
      return;
    }
    const [selectedYear, selectedMonth, selectedDay] = selectedDate.split('-').map(Number);
    const currentTime = new Date();
    const timestamp = new Date(selectedYear, selectedMonth - 1, selectedDay, currentTime.getHours(), currentTime.getMinutes(), currentTime.getSeconds()).getTime();
    onAddRecord(foodName, timestamp);
    showToast('已记录：' + foodName, 'success', 1500);
    closeManualAdd();
  };

  // 切换到上个月，必要时跨到上一年。
  const prevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1 /* 将年份减少一年。 */);
    } else {
      setMonth((m) => m - 1 /* 将月份减少一个月。 */);
    }
  };

  // 切换到下个月，必要时跨到下一年。
  const nextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1 /* 将年份增加一年。 */);
    } else {
      setMonth((m) => m + 1 /* 将月份增加一个月。 */);
    }
  };

  // 将点击的日期设为当前选中日期。
  const handleSelectDate = (day: number) => {
    const dateKey = formatDate(new Date(year, month, day));
    setSelectedDate(dateKey);
  };

  // 删除所选日期中的指定记录并显示提示。
  const handleDelete = (recordId: string, foodName: string) => {
    onDeleteRecord(selectedDate, recordId);
    showToast(`已删除「${foodName}」记录`, 'info');
  };

  // 将日历月份和选中日期重置到今天。
  const goToToday = () => {
    const today = new Date();
    setYear(today.getFullYear());
    setMonth(today.getMonth());
    setSelectedDate(formatDate(today));
  };

  return (
    <div className="cal-content">
      <div className="card-white">
        <div className="cal-nav-row">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={prevMonth}
            className="btn-cal-nav"
          >
            <ChevronLeft size={22} />
          </motion.button>

          <div className="cal-title">
            <CalendarDays size={20} className="panel-accent" />
            <span className="cal-month-text">
              {year}年{month + 1}月
            </span>
          </div>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={nextMonth}
            className="btn-cal-nav"
          >
            <ChevronRight size={22} />
          </motion.button>
        </div>

        <div className="cal-weekdays">
          {WEEKDAY_LABELS.map((label, idx) => (
            <div
              key={label}
              className={`cal-weekday ${
                idx === 0 || idx === 6 ? 'cal-weekend' : ''
              }`}
            >
              {label}
            </div>
          ) /* 渲染星期标题并标记周末。 */)}
        </div>

        <div className="cal-grid">
          {calendarCells.map((day, idx) => {
            if (day === null) {
              return <div key={`empty-${idx}`} className="cal-cell-empty" />;
            }
            const date = new Date(year, month, day);
            const dateKey = formatDate(date);
            const isSelected = dateKey === selectedDate;
            const today = isToday(date);
            const hasRecord = hasRecordsOnDate(dateKey);
            const weekday = idx % 7;

            return (
              <motion.button
                key={dateKey}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleSelectDate(day) /* 选中点击的日期。 */}
                className={`cal-cell ${
                  isSelected
                    ? 'cal-cell-selected'
                    : today
                    ? 'cal-cell-today'
                    : 'cal-cell-normal'
                }`}
              >
                <span
                  className={`cal-day-text ${
                    !isSelected && (weekday === 0 || weekday === 6) ? 'cal-weekend' : ''
                  }`}
                >
                  {day}
                </span>
                {hasRecord && (
                  <div
                    className="cal-dot"
                  />
                )}
              </motion.button>
            );
          } /* 渲染日期按钮或空白格，并标记选中日期、今天及有记录的日期。 */)}
        </div>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={goToToday}
          className="btn-today"
        >
          回到今天
        </motion.button>
      </div>

      <div className="cal-records">
        <div className="cal-records-header">
          <h3 className="cal-records-title">
            <Utensils size={18} className="panel-accent" />
            {selectedDate} 的记录
          </h3>
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            className="cal-records-self"
            onClick={() => setIsAddOpen(true) /* 打开手动添加记录窗口。 */}
            aria-label="手动添加饮食记录"
          >
            +
          </motion.button>
        </div>

        <AnimatePresence mode="popLayout">
          {selectedRecords.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="card-empty"
            >
              <div className="text-5xl mb-3">🍽️</div>
              <div className="panel-muted font-medium">这一天还没有记录</div>
              <div className="text-sm panel-muted mt-1">
                快去用 <span className="font-bold">Play</span> 决定今天吃什么吧！
              </div>
            </motion.div>
          ) : (
            <div className="cal-records-list">
              {selectedRecords.map((record) => {
                const mealType = getMealType(record.timestamp);
                return (
                  <motion.div
                    key={record.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="card-record"
                  >
                    <div className="cal-record-row">
                      <div
                        className="meal-avatar"
                      >
                        {mealType === 'breakfast'
                          ? '🌅'
                          : mealType === 'lunch'
                          ? '☀️'
                          : mealType === 'dinner'
                          ? '🌙'
                          : '🌃'}
                      </div>
                      <div className="record-info">
                        <div className="record-name">
                          {record.foodName}
                        </div>
                        <div className="record-meta">
                          <span
                            className="chip-meal"
                          >
                            {getMealTypeLabel(mealType)}
                          </span>
                          <span className="record-time">
                            <Clock size={12} />
                            {formatTime(record.timestamp)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleDelete(record.id, record.foodName) /* 删除当前点击的饮食记录。 */}
                      className="btn-del-sm"
                    >
                      <Trash2 size={16} />
                    </motion.button>
                  </motion.div>
                );
              } /* 渲染饮食记录的食物名称、餐次、时间和删除入口。 */)}
            </div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {isAddOpen && (
          <motion.div className="cal-add-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onMouseDown={(event) => { if (event.target === event.currentTarget) closeManualAdd(); } /* 点击弹窗遮罩时关闭手动添加窗口。 */}>
            <motion.div role="dialog" aria-modal="true" aria-labelledby="cal-add-title" className="cal-add-dialog"
              initial={{ opacity: 0, y: 18, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.97 }}>
              <form onSubmit={handleManualAdd}>
                <label className="cal-add-label" htmlFor="manual-food">食物名称</label>
                <input ref={manualInputRef} id="manual-food" className="cal-add-input" value={manualFood}
                  onChange={(event) => setManualFood(event.target.value) /* 同步手动添加的食物名称。 */} maxLength={40} placeholder="例如：牛肉面" autoComplete="off" />
                <div className="cal-add-actions">
                  <button type="button" className="cal-add-cancel" onClick={closeManualAdd}>取消</button>
                  <button type="submit" className="cal-add-submit">添加记录</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
