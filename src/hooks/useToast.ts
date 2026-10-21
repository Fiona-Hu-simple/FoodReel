import { useState, useCallback } from 'react';

type ToastType = 'success' | 'error' | 'info';

export type ToastState = {
  visible: boolean;
  message: string;
  type: ToastType;
};

// 维护提示消息状态并提供可指定类型和显示时长的显示方法。
export const useToast = () => {
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    message: '',
    type: 'info',
  });

  // 显示提示消息，并设置延时隐藏操作。
  const showToast = useCallback((message: string, type: ToastType = 'info', duration: number = 2000) => {
    setToast({ visible: true, message, type });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }) /* 保留提示内容和类型，仅将可见状态设为隐藏。 */);
    } /* 在显示时间结束后隐藏提示。 */, duration);
  }, []);

  return { toast, showToast };
};
