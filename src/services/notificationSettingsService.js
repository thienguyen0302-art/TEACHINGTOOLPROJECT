/**
 * notificationSettingsService.js – Quản lý cài đặt bật/tắt thông báo của người dùng
 */

const DEFAULT_SETTINGS = {
  enabled: true,          // Bật/tắt toàn bộ thông báo
  goalReminders: true,    // Nhắc nhở mục tiêu học tập & lịch học
  contestAlerts: true,    // Thông báo kỳ thi Contest & bài tập mới
  sound: true,            // Âm thanh thông báo
};

function getStorageKey(uid) {
  return `peanut_notif_settings_${uid || "guest"}`;
}

export function getNotificationSettings(uid) {
  try {
    const raw = window.localStorage.getItem(getStorageKey(uid));
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch {
    // ignore
  }
  return { ...DEFAULT_SETTINGS };
}

export function saveNotificationSettings(uid, settings) {
  const current = getNotificationSettings(uid);
  const updated = { ...current, ...settings };
  try {
    window.localStorage.setItem(getStorageKey(uid), JSON.stringify(updated));
    // Dispatch an event so components listening can re-render immediately
    window.dispatchEvent(new CustomEvent("peanut_notification_settings_change", { detail: updated }));
  } catch {
    // ignore
  }
  return updated;
}
