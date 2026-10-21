import './SwipeableFilmTrack.css';
import { useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import type { Food } from '../../types';

type SwipeableFilmTrackProps = {
  foods: Food[];
  position: number;
  isSpinning: boolean;
  onStep: (step: -1 | 1) => void;
};

const BUFFER_OFFSETS = [-2, -1, 0, 1, 2] as const;
const wrapIndex = (index: number, length: number) => ((index % length) + length) % length;

export const SwipeableFilmTrack = ({ foods, position, isSpinning, onStep }: SwipeableFilmTrackProps) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const anchor = Math.floor(position);
  const fraction = position - anchor;
  const frames = useMemo(() => {
    if (foods.length === 0) return [];
    return BUFFER_OFFSETS.map((offset) => ({
      food: foods[wrapIndex(anchor + offset, foods.length)],
      offset,
    }));
  }, [anchor, foods]);

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: { offset: { x: number } }) => {
    const threshold = (trackRef.current?.getBoundingClientRect().width ?? 0) / 6;
    if (!isSpinning && foods.length > 1 && Math.abs(info.offset.x) >= threshold) {
      onStep(info.offset.x < 0 ? 1 : -1);
    }
  };

  return (
    <div ref={trackRef} className="film-track" role="group" aria-label="可左右滑动的电影胶片">
      <div className="film-position-shift" style={{ transform: `translateX(${-(1 + fraction) * 100 / 3}%)` }}>
        <motion.div
          className="film-cards-row"
          drag={isSpinning ? false : 'x'}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.05}
          onDragEnd={handleDragEnd}
          style={{ willChange: isSpinning ? 'transform, filter' : 'transform' }}
        >
          {frames.map(({ food, offset }) => (
            <div
              key={food.id + '-' + (anchor + offset)}
              className="food-card"
              style={{ filter: 'brightness(' + (1 - Math.min(Math.abs(offset), 1) * 0.22) + ')' }}
            >
              <span className="food-card-text">{food.name}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
};