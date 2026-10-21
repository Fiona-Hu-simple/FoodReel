import { AppHeader } from './components/AppHeader/AppHeader';
import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Minus, Play } from 'lucide-react';
import type { Food } from './types';
import { useFoods } from './hooks/useFoods';
import { useRecords } from './hooks/useRecords';
import { useToast } from './hooks/useToast';
import { FilmStrip } from './components/FilmStrip/FilmStrip';
import { Drawer } from './components/Drawer/Drawer';
import { Toast } from './components/Toast/Toast';
import { AddFoodDrawerContent } from './components/AddFoodDrawerContent/AddFoodDrawerContent';
import { ManageFoodsDrawerContent } from './components/ManageFoodsDrawerContent/ManageFoodsDrawerContent';
import { CalendarView } from './components/CalendarView/CalendarView';
import './App.css';
import { LoginPage } from './components/LoginPage/LoginPage';
import type { User } from './utils/auth';

// 组合登录后的主页，协调食物抽取、确认记录、抽屉与提示状态。
function FoodApp({ user, onLogout }: { user: User; onLogout: () => void }) {
  const { foods, addFood, deleteFood, updateDefaults, restoreDefaults, pickRandomFood } = useFoods(user.id);
  const { addRecord, deleteRecord, getRecordsByDate, hasRecordsOnDate } = useRecords(user.id);
  const { toast, showToast } = useToast();

  const [isSpinning, setIsSpinning] = useState(false);
  const [pickedFood, setPickedFood] = useState<Food | null>(null);
  const [pendingFood, setPendingFood] = useState<Food | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // 检查食物库和转动状态，抽取食物并启动胶片动画。
  const handleSpin = useCallback(() => {
    if (foods.length === 0) {
      showToast('请先添加食物', 'error');
      return;
    }
    if (isSpinning) return;

    const picked = pickRandomFood();
    if (!picked) {
      showToast('请先添加食物', 'error');
      return;
    }

    setPendingFood(null);
    setPickedFood(picked);
    setIsSpinning(true);
  }, [foods, isSpinning, pickRandomFood, showToast]);

  // 将手动聚焦的食物设为待确认结果。
  const handleFilmFocus = useCallback((food: Food) => {
    setPickedFood(food);
    setPendingFood(food);
  }, []);

  // 在动画结束后保存待确认食物并解除转动状态。
  const handleSpinEnd = useCallback(() => {
    setPendingFood(pickedFood);
    setIsSpinning(false);
  }, [pickedFood]);

  const canConfirm = !isSpinning && pendingFood !== null &&
    foods.some((food) => food.id === pendingFood.id);

  // 保存待确认食物的饮食记录，提示成功并清空待确认结果。
  const handleConfirm = useCallback(() => {
    if (!canConfirm || !pendingFood) return;
    addRecord(pendingFood.name);
    showToast(`已记录：${pendingFood.name}`, 'success', 1500);
    setPendingFood(null);
  }, [canConfirm, pendingFood, addRecord, showToast]);

  return (
    <div className="app-root">
      <div className="app-bg-layer">
        <div className="app-bg-blob app-bg-blob-primary" />
        <div className="app-bg-blob app-bg-blob-secondary" />
        <div className="app-bg-blob app-bg-blob-accent" />
      </div>

      <AppHeader name={user.name} onLogout={onLogout} onOpenCalendar={() => setIsCalendarOpen(true)} />

      <main className="app-main">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="app-content"
        >
          <div className="app-filmstrip">
            <FilmStrip
              foods={foods}
              isSpinning={isSpinning}
              pickedFood={pickedFood}
              onSpinEnd={handleSpinEnd}
              onFocusChange={handleFilmFocus}
            />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="app-spin-action"
          >
            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              whileHover={!isSpinning ? { scale: 1.03 } : {}}
              onClick={handleSpin}
              disabled={isSpinning || foods.length === 0}
              className="btn-cd"
              aria-label={isSpinning ? '正在随机选择食物' : '播放，随机选择食物'}
              aria-busy={isSpinning}
            >
              <span className="cd-disc" aria-hidden="true" />
              <span className="cd-center">
                <Play className="cd-play-icon" fill="currentColor" aria-hidden="true" />
                <span className="cd-play-label">play</span>
              </span>
            </motion.button>
            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              whileHover={canConfirm ? { scale: 1.03 } : {}}
              onClick={handleConfirm}
              disabled={!canConfirm}
              className="btn-confirm"
              aria-label={canConfirm ? `确认记录：${pendingFood?.name}` : '随机结束后确认记录'}
              title={canConfirm ? `确认记录：${pendingFood?.name}` : '随机结束后确认记录'}
            >
              <span aria-hidden="true">confirm</span>
            </motion.button>
          </motion.div>
        </motion.div>
      </main>

      <nav className="app-nav">
        <div className="nav-inner">
          <motion.button
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.05 }}
            onClick={() => setIsAddOpen(true)}
            className="btn-add"
          >
            <Plus size={30} strokeWidth={3} />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.05 }}
            onClick={() => setIsManageOpen(true)}
            className="btn-manage"
          >
            <Minus size={30} strokeWidth={3} />
          </motion.button>
        </div>
      </nav>

      <Drawer isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="添加食物" height="md">
        <AddFoodDrawerContent
          onAdd={addFood}
          onClose={() => setIsAddOpen(false)}
          foods={foods}
          showToast={showToast}
        />
      </Drawer>

      <Drawer isOpen={isManageOpen} onClose={() => setIsManageOpen(false)} title="管理食物库" height="lg">
        <ManageFoodsDrawerContent
          foods={foods}
          onDelete={deleteFood}
          onUpdateDefaults={updateDefaults}
          onRestoreDefaults={restoreDefaults}
          onClose={() => setIsManageOpen(false)}
          showToast={showToast}
        />
      </Drawer>

      <Drawer isOpen={isCalendarOpen} onClose={() => setIsCalendarOpen(false)} title="饮食记录" height="full">
        <CalendarView
          hasRecordsOnDate={hasRecordsOnDate}
          getRecordsByDate={getRecordsByDate}
          onDeleteRecord={deleteRecord}
          onAddRecord={addRecord}
          showToast={showToast}
        />
      </Drawer>
      <Toast toast={toast} />
    </div>
  );
}

// 根据当前登录用户切换登录页和选餐主页。
export default function FoodReelApp() {
  const [user, setUser] = useState<User | null>(null);
  return user
    ? <FoodApp key={user.id} user={user} onLogout={() => setUser(null)} />
    : <LoginPage onLogin={setUser} />;
}
