// Simple notification service for user feedback
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
}

// For now, we'll use browser alerts, but this can be enhanced with a toast library
export const notifications = {
  success(title: string, message?: string): void {
    const fullMessage = message ? `${title}\n${message}` : title;
    alert(`✅ ${fullMessage}`);
  },

  error(title: string, message?: string): void {
    const fullMessage = message ? `${title}\n${message}` : title;
    alert(`❌ ${fullMessage}`);
  },

  warning(title: string, message?: string): void {
    const fullMessage = message ? `${title}\n${message}` : title;
    alert(`⚠️ ${fullMessage}`);
  },

  info(title: string, message?: string): void {
    const fullMessage = message ? `${title}\n${message}` : title;
    alert(`ℹ️ ${fullMessage}`);
  },
};

export default notifications;