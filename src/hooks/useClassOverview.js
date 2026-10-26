import { useCallback, useEffect, useState } from "react";
import { getClassOverview, subscribeClassOverview } from "../services/teacherService";

// Dữ liệu lớp học dùng chung cho Teacher.jsx và TeacherStudents.jsx:
// tải nhanh lần đầu + lắng nghe realtime + nút "Đồng bộ ngay".
export default function useClassOverview() {
  const [state, setState] = useState({ loading: true, error: "", overview: null });
  const [lastSyncTime, setLastSyncTime] = useState(() => new Date());
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const apply = (overview) => {
      if (cancelled) return;
      setState({ loading: false, error: "", overview });
      setLastSyncTime(new Date());
    };
    getClassOverview()
      .then(apply)
      .catch((e) => {
        if (!cancelled) setState({ loading: false, error: "Không tải được dữ liệu lớp: " + (e.code || e.message), overview: null });
      });
    const unsubscribe = subscribeClassOverview(apply, (e) => console.warn("[Teacher] Lỗi đồng bộ realtime:", e));
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  // Trả về null nếu thành công, hoặc thông báo lỗi.
  const syncNow = useCallback(async () => {
    setRefreshing(true);
    try {
      const overview = await getClassOverview();
      setState({ loading: false, error: "", overview });
      setLastSyncTime(new Date());
      return null;
    } catch (e) {
      return e.message || "Vui lòng thử lại";
    } finally {
      setRefreshing(false);
    }
  }, []);

  return { ...state, lastSyncTime, refreshing, syncNow };
}
