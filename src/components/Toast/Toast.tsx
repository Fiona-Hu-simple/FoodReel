import './Toast.css';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Info } from 'lucide-react';
import type { ToastState } from '../../hooks/useToast';

type ToastProps = {
  toast: ToastState;
};

// 根据提示状态显示对应图标、颜色和消息，并播放出现与退出动画。
export const Toast = ({ toast }: ToastProps) => {
  const iconMap = {
    success: <CheckCircle size={20} className="text-green-500" />,
    error: <XCircle size={20} className="text-red-500" />,
    info: <Info size={20} className="text-blue-500" />,
  };

  const bgMap = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    info: 'bg-blue-50 border-blue-200',
  };

  return (
    <AnimatePresence>
      {toast.visible && (
        <motion.div
          initial={{ opacity: 0, y: -30, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          transition={{ type: 'spring', damping: 20 }}
          className="toast-wrap"
        >
          <div
            className={`toast-card ${bgMap[toast.type]}`}
          >
            {iconMap[toast.type]}
            <span className="font-medium text-gray-700">{toast.message}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
