import { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export type NotificationType = 'success' | 'warning' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  type: NotificationType;
  text: string;
}

interface NotificationProps {
  notifications: ToastMessage[];
  onDismiss: (id: string) => void;
}

export default function Notification({ notifications, onDismiss }: NotificationProps) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full px-4 sm:px-0">
      <AnimatePresence>
        {notifications.map((notif) => (
          <ToastItem key={notif.id} notif={notif} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastItem({ notif, onDismiss }: { notif: ToastMessage; onDismiss: (id: string) => void; key?: string | number }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(notif.id);
    }, 4000);
    return () => clearTimeout(timer);
  }, [notif.id, onDismiss]);

  const icons = {
    success: <CheckCircle className="h-5 w-5 text-emerald-600" />,
    warning: <AlertTriangle className="h-5 w-5 text-amber-500" />,
    error: <XCircle className="h-5 w-5 text-rose-500" />,
    info: <Info className="h-5 w-5 text-blue-500" />,
  };

  const bgColors = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    warning: 'bg-amber-50 border-amber-200 text-amber-900',
    error: 'bg-rose-50 border-rose-200 text-rose-900',
    info: 'bg-blue-50 border-blue-200 text-blue-900',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
      className={`flex items-start gap-3 p-4 rounded-xl border shadow-lg ${bgColors[notif.type]} backdrop-blur-md`}
    >
      <div className="flex-shrink-0 mt-0.5">{icons[notif.type]}</div>
      <div className="flex-grow text-sm font-medium pr-1">{notif.text}</div>
      <button
        onClick={() => onDismiss(notif.id)}
        className="flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors rounded-lg p-0.5"
      >
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  );
}
