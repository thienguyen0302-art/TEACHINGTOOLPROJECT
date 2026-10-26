import { useCallback, useEffect, useState } from "react";
import { getAllProgress, getDailyActivity, getProfile } from "../services/progressService";
import { listChapters } from "../services/contentService";
import { recalculateProgress } from "../services/progressSync";

// Gom dữ liệu dùng chung cho Shell, Tổng quan, Chương trình học, Tiến độ.
export default function useLearningData(uid, lang, includeChapters = true) {
  const [state, setState] = useState({
    loading: true, error: "", profile: {}, rows: [], chapters: [], daily: {},
  });

  const load = useCallback(async () => {
    try {
      // Đồng bộ lại % / điểm từ dữ liệu thật (bài code đã giải, quiz...) 1 lần mỗi phiên.
      const syncKey = `progress_synced_${uid}_${lang}`;
      if (uid && !sessionStorage.getItem(syncKey)) {
        sessionStorage.setItem(syncKey, "1");
        await recalculateProgress(uid, lang).catch((e) => {
          sessionStorage.removeItem(syncKey);
          console.warn("[progressSync]", e);
        });
      }
      const [profile, all, chapters, daily] = await Promise.all([
        getProfile(uid), getAllProgress(uid), includeChapters ? listChapters(lang) : Promise.resolve([]),
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
  }, [uid, lang, includeChapters]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}
