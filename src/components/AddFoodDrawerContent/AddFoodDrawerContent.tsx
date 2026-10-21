import './AddFoodDrawerContent.css';
import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {  ChefHat } from 'lucide-react';
import type { Food } from '../../types';
import { FoodMapPreview } from '../NearbyFoodMap/FoodMapPreview';
import { NearbyFoodMapPage } from '../NearbyFoodMap/NearbyFoodMapPage';

type AddFoodDrawerContentProps = {
  onAdd: (name: string) => { success: boolean; message: string };
  onClose: () => void;
  foods: Food[];
  showToast: (message: string, type?: 'success' | 'error' | 'info', duration?: number) => void;
};

// 渲染食物输入表单和附近美食地图入口，管理添加操作。
export const AddFoodDrawerContent = ({ onAdd, onClose, showToast }: AddFoodDrawerContentProps) => {
  const [input, setInput] = useState('');
  const [isMapOpen, setIsMapOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 延迟聚焦食物输入框，并在卸载时清除定时器。
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    } /* 聚焦食物名称输入框。 */, 300);
    return () => clearTimeout(timer) /* 清除尚未执行的聚焦定时器。 */;
  }, []);

  // 提交食物名称，根据添加结果显示提示，并在成功后清空输入和关闭抽屉。
  const handleAdd = () => {
    const result = onAdd(input);
    if (result.success) {
      showToast(result.message, 'success');
      setInput('');
      onClose();
    } else {
      showToast(result.message, 'error');
    }
  };



  return (
    <div className="add-food-content">
      <div className="field-wrap">
        <label className="field-label">
          想吃什么呀？
        </label>
        <div className="input-wrap">
          <ChefHat className="absolute left-4 top-1/2 -translate-y-1/2 panel-accent" size={22} />
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value) /* 同步食物名称输入内容。 */}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd();
            } /* 按回车键时提交添加操作。 */}
            placeholder="输入食物名称"
            maxLength={20}
            className="input-primary"
          />
        </div>
        <div className="input-hint-row">
          <span>最多20个字符</span>
          <span>{input.length}/20</span>
        </div>
      </div>

      <FoodMapPreview onOpen={() => setIsMapOpen(true) /* 打开附近美食地图详情。 */} />
      {isMapOpen && (
        <NearbyFoodMapPage
          onClose={() => setIsMapOpen(false) /* 关闭附近美食地图详情。 */}
          onAdd={onAdd}
        />
      )}

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={handleAdd}
        disabled={!input.trim()}
        className="btn-primary"
      >
        确认添加
      </motion.button>
    </div>
  );
};
