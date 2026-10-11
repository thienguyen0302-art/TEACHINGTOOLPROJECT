import { useCallback, useEffect, useState } from "react";
import { getAllProgress, getDailyActivity, getProfile } from "../services/progressService";
import { listChapters } from "../services/contentService";

// Gom dữ liệu dùng chung cho Shell, Tổng quan, Chương trình học, Tiến độ.
export default function useLearningData(uid, lang) {
  const [state, setState] = useState({
    loading: true, error: "", profile: {}, rows: [], chapters: [], daily: {},
  });

  const load = useCallback(async () => {
    try {
      const [profile, all, chapters, daily] = await Promise.all([
        getProfile(uid), getAllProgress(uid), listChapters(lang),
        getDailyActivity(uid).catch(() => ({})), // lỗi thống kê ngày không được làm hỏng cả trang
      ]);
      setState({
        loading: false, error: "", profile, chapters, daily,
        rows: all.filter((r) => r.language === lang),
      });
    } catch (e) {
      setState((s) => ({
        ...s, loading: false,
        error: "Không tải được tiến độ: " + (e.code || e.message),
      }));
    }
  }, [uid, lang]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}
