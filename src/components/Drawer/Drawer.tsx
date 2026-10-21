import './Drawer.css';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

type DrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  height?: 'sm' | 'md' | 'lg' | 'full';
  showClose?: boolean;
};

const heightClasses: Record<string, string> = {
  sm: 'max-h-[40vh]',
  md: 'max-h-[60vh]',
  lg: 'max-h-[80vh]',
  full: 'h-[92vh]',
};

// 渲染可配置高度的底部抽屉，提供遮罩、标题、关闭入口及进出动画。
export const Drawer = ({
  isOpen,
  onClose,
  title,
  children,
  height = 'md',
  showClose = true,
}: DrawerProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="drawer-backdrop"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{
              type: 'spring',
              damping: 30,
              stiffness: 300,
              mass: 0.8,
            }}
            className={`drawer-panel ${heightClasses[height]}`}
          >
            <div className="drawer-handle">
              <div className="drawer-handle-bar" />
            </div>
            <div className="drawer-header">
              <h2 className="drawer-title">{title}</h2>
              {showClose && (
                <button
                  onClick={onClose}
                  className="btn-close"
                >
                  <X size={20} />
                </button>
              )}
            </div>
            <div className="drawer-body">
              {children}
            </div>
            <div className="drawer-safe" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
