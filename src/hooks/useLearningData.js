import { useCallback, useEffect, useState } from "react";
import { getAllProgress, getProfile } from "../services/progressService";
import { listChapters } from "../services/contentService";

// Gom dữ liệu dùng chung cho Shell, Tổng quan, Chương trình học, Tiến độ.
export default function useLearningData(uid, lang) {
  const [state, setState] = useState({
    loading: true, error: "", profile: {}, rows: [], chapters: [],
  });

  const load = useCallback(async () => {
    try {
      const [profile, all, chapters] = await Promise.all([
        getProfile(uid), getAllProgress(uid), listChapters(lang),
      ]);
      setState({
        loading: false, error: "", profile, chapters,
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
