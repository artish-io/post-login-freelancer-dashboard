'use client';

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info, HelpCircle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'confirmation';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  customStyle?: {
    backgroundColor?: string;
    textColor?: string;
    borderColor?: string;
    icon?: React.ReactNode | null;
  };
}

interface ToastContextType {
  showToast: (toast: Omit<Toast, 'id'>) => void;
  hideToast: (id: string) => void;
  showConfirmation: (options: {
    title: string;
    message?: string;
    onConfirm: () => void;
    onCancel?: () => void;
    confirmText?: string;
    cancelText?: string;
  }) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: Toast = {
      ...toast,
      id,
      duration: toast.duration || 5000,
    };

    setToasts((prev) => [...prev, newToast]);

    // Auto-remove toast after duration (except for confirmations)
    if (newToast.duration > 0 && newToast.type !== 'confirmation') {
      setTimeout(() => {
        hideToast(id);
      }, newToast.duration);
    }
  };

  const showConfirmation = (options: {
    title: string;
    message?: string;
    onConfirm: () => void;
    onCancel?: () => void;
    confirmText?: string;
    cancelText?: string;
  }) => {
    const id = Math.random().toString(36).substr(2, 9);
    const confirmationToast: Toast = {
      id,
      type: 'confirmation',
      title: options.title,
      message: options.message,
      duration: 0, // Don't auto-remove confirmations
      onConfirm: () => {
        options.onConfirm();
        hideToast(id);
      },
      onCancel: () => {
        options.onCancel?.();
        hideToast(id);
      },
      confirmText: options.confirmText || 'Confirm',
      cancelText: options.cancelText || 'Cancel',
    };

    setToasts((prev) => [...prev, confirmationToast]);
  };

  const hideToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast, hideToast, showConfirmation }}>
      {children}
      <ToastContainer toasts={toasts} onHideToast={hideToast} />
    </ToastContext.Provider>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  onHideToast: (id: string) => void;
}

function ToastContainer({ toasts, onHideToast }: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onHide={onHideToast} />
        ))}
      </AnimatePresence>
    </div>
  );
}

interface ToastItemProps {
  toast: Toast;
  onHide: (id: string) => void;
}

function ToastItem({ toast, onHide }: ToastItemProps) {
  const getIcon = () => {
    // If custom icon is explicitly set (including null), use it
    if (toast.customStyle?.icon !== undefined) {
      return toast.customStyle.icon;
    }

    switch (toast.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-500" />;
      case 'confirmation':
        return <HelpCircle className="w-5 h-5 text-[#eb1966]" />;
      default:
        return <Info className="w-5 h-5 text-gray-500" />;
    }
  };

  const getBorderColor = () => {
    if (toast.customStyle?.borderColor) {
      return `border-l-[${toast.customStyle.borderColor}]`;
    }

    switch (toast.type) {
      case 'success':
        return 'border-l-green-500';
      case 'error':
        return 'border-l-red-500';
      case 'info':
        return 'border-l-blue-500';
      case 'confirmation':
        return 'border-l-[#eb1966]';
      default:
        return 'border-l-gray-500';
    }
  };

  const getBackgroundColor = () => {
    if (toast.customStyle?.backgroundColor) {
      return toast.customStyle.backgroundColor;
    }
    return toast.type === 'confirmation' ? '#FCD5E3' : 'white';
  };

  const getTextColor = () => {
    if (toast.customStyle?.textColor) {
      return toast.customStyle.textColor;
    }
    return '#111827'; // Default dark text
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 300, scale: 0.3 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 300, scale: 0.5, transition: { duration: 0.2 } }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`
        rounded-lg shadow-lg border-l-4 ${getBorderColor()}
        p-4 min-w-[320px] max-w-[400px]
        ${toast.type === 'confirmation' ? 'flex flex-col gap-3' : 'flex items-start gap-3'}
      `}
      style={{
        backgroundColor: getBackgroundColor(),
        color: getTextColor()
      }}
    >
      {toast.type === 'confirmation' ? (
        // Confirmation toast layout
        <>
          <div className="flex items-start gap-3">
            {getIcon()}
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm" style={{ color: getTextColor() }}>{toast.title}</h4>
              {toast.message && (
                <p className="text-sm mt-1" style={{ color: getTextColor(), opacity: 0.8 }}>{toast.message}</p>
              )}
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={toast.onCancel}
              className="px-3 py-1.5 text-sm hover:opacity-80 transition-colors"
              style={{ color: getTextColor() }}
            >
              {toast.cancelText}
            </button>
            <button
              onClick={toast.onConfirm}
              className="px-3 py-1.5 text-sm bg-[#eb1966] text-white rounded-lg hover:bg-[#d1155a] transition-colors"
            >
              {toast.confirmText}
            </button>
          </div>
        </>
      ) : (
        // Regular toast layout
        <>
          {getIcon()}
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm" style={{ color: getTextColor() }}>{toast.title}</h4>
            {toast.message && (
              <p className="text-sm mt-1" style={{ color: getTextColor(), opacity: 0.8 }}>{toast.message}</p>
            )}
          </div>
          <button
            onClick={() => onHide(toast.id)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </>
      )}
    </motion.div>
  );
}

// Convenience hooks for different toast types
export function useSuccessToast() {
  const { showToast } = useToast();
  return (title: string, message?: string) => showToast({
    type: 'success',
    title,
    message,
    customStyle: {
      backgroundColor: '#FCD5E3',
      textColor: '#111827',
      borderColor: '#FCD5E3',
      icon: null // Remove checkmark icon
    }
  });
}

export function useErrorToast() {
  const { showToast } = useToast();
  return (title: string, message?: string) => showToast({ type: 'error', title, message });
}

export function useInfoToast() {
  const { showToast } = useToast();
  return (title: string, message?: string) => showToast({ type: 'info', title, message });
}

export function useConfirmation() {
  const { showConfirmation } = useToast();
  return showConfirmation;
}
