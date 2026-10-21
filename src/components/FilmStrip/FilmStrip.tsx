import './FilmStrip.css';
import { useEffect, useState } from 'react';
import type { Food } from '../../types';
import { SwipeableFilmTrack } from '../SwipeableFilmTrack/SwipeableFilmTrack';

type FilmStripProps = {
  foods: Food[];
  isSpinning: boolean;
  pickedFood: Food | null;
  onSpinEnd: () => void;
  onFocusChange: (food: Food) => void;
};

const SPIN_DURATION = 1000;
const SPROCKET_COUNT = 15;

// 渲染胶片上下边缘的装饰齿孔条。
const SprocketBar = () => (
  <div className="film-tooth-bar" aria-hidden="true">
    {Array.from({ length: SPROCKET_COUNT }, (_, index) => (
      <span key={index} className="film-sprocket" />
    ) /* 生成单个胶片装饰齿孔。 */)}
  </div>
);

// 组合胶片装饰与滑动轨道，管理随机转动和手动切换位置。
export const FilmStrip = ({ foods, isSpinning, pickedFood, onSpinEnd, onFocusChange }: FilmStripProps) => {
  const [spinPosition, setSpinPosition] = useState(0);
  const [manualPosition, setManualPosition] = useState(0);


  // 启动随机转动动画，并在依赖变化或卸载时清理动画与定时器。
  useEffect(() => {
    if (!isSpinning || foods.length === 0) return;
    let completionTimeout: ReturnType<typeof setTimeout> | undefined;
    const startTime = performance.now();
    const totalLaps = 3 + Math.floor(Math.random() * 2);
    const pickedIndex = foods.findIndex((food) => food.id === pickedFood?.id /* 查找本次随机抽中食物在食物库中的位置。 */);
    const targetIndex = pickedIndex >= 0 ? pickedIndex : 0;
    const totalDistance = totalLaps * foods.length + targetIndex;

    // 根据缓动进度更新胶片位置，在到达目标后同步位置并延迟通知动画结束。
    let animationFrame = 0;
    const animate = (currentTime: number) => {
      const progress = Math.min((currentTime - startTime) / SPIN_DURATION, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      if (progress >= 1) {
        setSpinPosition(targetIndex);
        setManualPosition(targetIndex);
        completionTimeout = setTimeout(onSpinEnd, 100);
        return;
      }
      setSpinPosition(totalDistance * easedProgress);
      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(animationFrame);
      clearTimeout(completionTimeout);
    } /* 取消未完成的动画帧和结束通知定时器。 */;
  }, [isSpinning, foods, pickedFood, onSpinEnd]);

  // 按指定方向移动一格，循环计算食物索引并通知当前聚焦食物。
  const handleManualStep = (step: -1 | 1) => {
    if (foods.length === 0) return;

    const nextPosition = manualPosition + step;
    const focusedIndex = ((nextPosition % foods.length) + foods.length) % foods.length;
    setManualPosition(nextPosition);
    onFocusChange(foods[focusedIndex]);
  };
  return (
    <div className="film-strip">
      <div className="film-outer">
        <SprocketBar />
        <SwipeableFilmTrack foods={foods} position={isSpinning ? spinPosition : manualPosition}
          isSpinning={isSpinning} onStep={handleManualStep} />
        <SprocketBar />
      </div>
    </div>
  );
};
