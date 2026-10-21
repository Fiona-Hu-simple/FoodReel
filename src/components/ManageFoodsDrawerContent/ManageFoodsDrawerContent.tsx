import './ManageFoodsDrawerContent.css';
import { useState } from 'react';
import { RestoreDefaultsDialog } from '../RestoreDefaultsDialog/RestoreDefaultsDialog';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, RotateCcw, RefreshCw, AlertTriangle } from 'lucide-react';
import type { Food } from '../../types';

type ManageFoodsDrawerContentProps = {
  foods: Food[];
  onDelete: (id: string) => void;
  onUpdateDefaults: () => void;
  onRestoreDefaults: () => void;
  onClose: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info', duration?: number) => void;
};

// 展示食物库及空状态，提供删除、刷新默认列表和恢复默认列表的操作。
export const ManageFoodsDrawerContent = ({
  foods,
  onDelete,
  onUpdateDefaults,
  onRestoreDefaults,
  onClose,
  showToast,
}: ManageFoodsDrawerContentProps) => {
  const [restoreOpen, setRestoreOpen] = useState(false);

  // 刷新默认食物并提示结果，保留个人添加项及默认食物删除偏好。
  const handleUpdate = () => {
    try {
      onUpdateDefaults();
      showToast('默认食物已刷新，个人添加和删除已保留', 'success');
    } catch {
      showToast('更新失败，请检查浏览器存储空间或权限', 'error');
    }
  };

  // 关闭确认弹窗，恢复默认食物并显示成功或失败提示。
  const handleRestore = () => {
    setRestoreOpen(false);
    try {
      onRestoreDefaults();
      showToast('已恢复最新默认食物，个人添加和删除已重置', 'success');
    } catch {
      showToast('恢复失败，请检查浏览器存储空间或权限', 'error');
    }
  };

  // 删除指定食物并显示结果提示。
  const handleDelete = (id: string, name: string) => {
    try {
      onDelete(id);
      showToast(`已删除「${name}」`, 'info');
    } catch {
      showToast('删除失败，请检查浏览器存储空间或权限', 'error');
    }
  };

  return (
    <div className="manage-food-content">
      <RestoreDefaultsDialog open={restoreOpen} onCancel={() => setRestoreOpen(false) /* 关闭恢复默认食物确认弹窗。 */} onConfirm={handleRestore} />
      <div className="food-default-actions">
        <motion.button type="button" whileTap={{ scale: 0.97 }} onClick={() => setRestoreOpen(true) /* 打开恢复默认食物确认弹窗。 */} className="btn-restore">
          <RotateCcw size={18} />恢复默认食物
        </motion.button>
        <motion.button type="button" whileTap={{ scale: 0.97 }} onClick={handleUpdate} className="btn-restore">
          <RefreshCw size={18} />刷新默认食物
        </motion.button>
      </div>

      <AnimatePresence>
        {foods.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="alert-empty"
          >
            <AlertTriangle className="panel-accent shrink-0 mt-0.5" size={20} />
            <div>
              <div className="font-semibold panel-text">食物库是空的！</div>
              <div className="text-sm panel-muted mt-1">
                点击上方「恢复默认食物」按钮，或关闭抽屉后点击左下角「＋」按钮添加食物。
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-2">
        <div className="list-meta">
          <span className="text-sm font-medium panel-muted">
            共 {foods.length} 种食物
          </span>
        </div>
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {foods.map((food) => (
              <motion.div
                key={food.id}
                layout
                initial={{ opacity: 0, x: -20, height: 0 }}
                animate={{ opacity: 1, x: 0, height: 'auto' }}
                exit={{ opacity: 0, x: 20, height: 0, marginBottom: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className="card-food-item"
              >
                <div className="manage-record-row">
                  <div
                    className={`food-avatar ${
                      food.isDefault
                        ? 'avatar-default'
                        : 'avatar-custom'
                    }`}
                  >
                    {food.name.slice(0, 1)}
                  </div>
                  <div className="food-info">
                    <div className="food-name">{food.name}</div>
                    <div className="food-tag">
                      {food.isDefault ? '默认食物' : '自定义'}
                    </div>
                  </div>
                </div>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleDelete(food.id, food.name) /* 删除点击的食物。 */}
                  className="btn-del-md"
                >
                  <Trash2 size={18} />
                </motion.button>
              </motion.div>
            ) /* 渲染单个食物的名称、来源标记与删除入口。 */)}
          </AnimatePresence>
        </div>
      </div>

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={onClose}
        className="btn-secondary"
      >
        关闭
      </motion.button>
    </div>
  );
};
