import { useEffect, useState, useMemo } from "react";
import Icon from "../components/Icon";
import {
  subscribeContestLeaderboard,
  syncAllContestScores,
  rankContestEntries,
} from "../services/contestRankingService";
import { initials } from "../utils/format";
import "./Ranking.css";

const ALL = "all";
const fmt = (n) => (Math.round((n || 0) * 10) / 10).toLocaleString("vi-VN");

/**
 * Bảng xếp hạng Contest HSG toàn trường
 * Đồng bộ giữa TẤT CẢ TÀI KHOẢN dựa trên TỔNG ĐIỂM THI CONTEST của mỗi học sinh
 */
export default function Ranking({ uid, lang, isTeacher = false }) {
  const [state, setState] = useState({
    loading: true,
    syncing: false,
    error: "",
    entries: [],
  });
  const [province, setProvince] = useState(ALL);
  const [search, setSearch] = useState("");
  const [syncNotice, setSyncNotice] = useState("");

  useEffect(() => {
    let cancelled = false;

    // 1. Lắng nghe realtime Bảng xếp hạng Contest đồng bộ
    const unsub = subscribeContestLeaderboard(({ entries, loading, error }) => {
      if (!cancelled) {
        setState((prev) => ({
          ...prev,
          loading,
          error,
          entries,
        }));
      }
    });

    // 2. Tự động đồng bộ điểm mới nhất từ các kỳ thi contest
    syncAllContestScores()
      .then(() => {
        // Updated entries will arrive via onSnapshot
      })
      .catch((err) => {
        console.warn("Lỗi auto sync contest scores:", err);
      });

    return () => {
      cancelled = true;
      unsub?.();
    };
  }, []);

  async function handleManualSync() {
    setState((prev) => ({ ...prev, syncing: true }));
    setSyncNotice("Đang đồng bộ điểm từ các kỳ thi Contest...");
    try {
      await syncAllContestScores();
      setSyncNotice("✓ Bảng xếp hạng đã được đồng bộ điểm số mới nhất!");
    } catch (err) {
      setSyncNotice("Không thể đồng bộ lúc này: " + err.message);
    } finally {
      setState((prev) => ({ ...prev, syncing: false }));
      setTimeout(() => setSyncNotice(""), 3500);
    }
  }

  // Danh sách tỉnh thành
  const provinces = useMemo(() => {
    return [...new Set(state.entries.map((e) => e.province).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, "vi")
    );
  }, [state.entries]);

  // Lọc theo tỉnh thành & tìm kiếm
  const filteredEntries = useMemo(() => {
    return state.entries.filter((e) => {
      const matchProv = province === ALL || e.province === province;
      const matchSearch =
        !search ||
        (e.displayName || "").toLowerCase().includes(search.toLowerCase()) ||
        (e.school || "").toLowerCase().includes(search.toLowerCase()) ||
        (e.className || "").toLowerCase().includes(search.toLowerCase());
      return matchProv && matchSearch;
    });
  }, [state.entries, province, search]);

  const shown = useMemo(() => rankContestEntries(filteredEntries), [filteredEntries]);
  const podium = [shown[1], shown[0], shown[2]]; // Bố cục bục: Hạng 2 - Hạng 1 - Hạng 3

  // Tìm thành tích của chính học sinh đang đăng nhập
  const me = useMemo(() => {
    return state.entries.find((e) => e.uid === uid) || null;
  }, [state.entries, uid]);

  return (
    <div className="content ranking-page">
      {/* ── Banner Hero ── */}
      <section className="ranking-hero">
        <div>
          <span className="ranking-kicker">
            <Icon name="trophy" /> BẢNG VÀNG CONTEST HSG TOÀN TRƯỜNG
          </span>
          <h1>Mỗi kỳ thi, một bước tiến gần bục vinh quang.</h1>
          <p>
            Bảng xếp hạng đồng bộ thời gian thực giữa tất cả tài khoản, tính theo tổng điểm thi phần
            Contest HSG của mỗi học sinh.
          </p>
          <div style={{ marginTop: 14 }}>
            <button
              type="button"
              onClick={handleManualSync}
              disabled={state.syncing}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 16px",
                borderRadius: 8,
                background: "#ffffff",
                color: "#2563eb",
                border: "none",
                fontWeight: 700,
                fontSize: 12.5,
                cursor: "pointer",
              }}
            >
              <Icon name="fire" />
              {state.syncing ? "Đang cập nhật..." : "Đồng bộ điểm thi mới nhất"}
            </button>
            {syncNotice && (
              <span style={{ marginLeft: 12, fontSize: 13, color: "#fef08a", fontWeight: 600 }}>
                {syncNotice}
              </span>
            )}
          </div>
        </div>

        {/* Thẻ thứ hạng cá nhân (Ẩn nếu là giáo viên) */}
        {!isTeacher && (
          <div className="my-ranking-card">
            <div className="my-ranking-avatar">
              {initials({ displayName: me?.displayName || "Bạn" })}
            </div>
            <div>
              <span>Thứ hạng của bạn</span>
              <strong>{me ? `#${me.rank}` : "—"}</strong>
              <small>
                {me
                  ? `${fmt(me.totalContestScore)} điểm · ${me.contestsCount || 0} kỳ thi`
                  : "Chưa tham gia Contest"}
              </small>
            </div>
          </div>
        )}
      </section>

      {/* Thẻ tóm tắt thành tích của học sinh */}
      {me && !isTeacher && (
        <section className="ranking-summary">
          <div>
            <span><Icon name="trophy" /></span>
            <p>
              <small>Tổng điểm Contest</small>
              <strong>{fmt(me.totalContestScore)}</strong>
            </p>
          </div>
          <div>
            <span><Icon name="check" /></span>
            <p>
              <small>Bài giải hoàn hảo (AC)</small>
              <strong>{me.totalAcProblems || 0}</strong>
            </p>
          </div>
          <div>
            <span><Icon name="chart" /></span>
            <p>
              <small>Kỳ thi tham gia</small>
              <strong>{me.contestsCount || 0}</strong>
            </p>
          </div>
        </section>
      )}

      {state.loading && <p className="ranking-state">Đang tải bảng xếp hạng Contest...</p>}
      {state.error && <p className="err">{state.error}</p>}

      {!state.loading && !state.error && state.entries.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--ps-text-sub, #64748b)" }}>
          <p style={{ fontSize: 16, fontWeight: 700, margin: "0 0 8px" }}>
            Chưa có dữ liệu bảng xếp hạng Contest
          </p>
          <p style={{ fontSize: 13, margin: 0 }}>
            Khi học sinh tham gia thi và nộp bài trong các kỳ thi Contest HSG, điểm số sẽ tự động cập nhật đồng bộ tại đây.
          </p>
        </div>
      )}

      {!state.loading && shown.length > 0 && (
        <>
          {/* ── Bục vinh quang (Podium Top 1, 2, 3) ── */}
          <section className="ranking-podium">
            {podium.map(
              (e, i) =>
                e && (
                  <article
                    className={`podium-card place-${i === 1 ? 1 : i === 0 ? 2 : 3}`}
                    key={e.uid}
                  >
                    <span className="podium-place">
                      {i === 1 ? "🥇 #1" : i === 0 ? "🥈 #2" : "🥉 #3"}
                    </span>
                    <div className="podium-avatar">
                      {initials({ displayName: e.displayName })}
                    </div>
                    <strong>{e.displayName}</strong>
                    <small>
                      {e.school || "—"}
                      {e.className ? ` · Lớp ${e.className}` : ""}
                    </small>
                    <p>
                      {fmt(e.totalContestScore)} <span>điểm</span>
                    </p>
                  </article>
                )
            )}
          </section>

          {/* ── Bảng xếp hạng chi tiết ── */}
          <section className="ranking-board">
            <div className="ranking-board-heading">
              <div>
                <span>Bảng xếp hạng tổng hợp</span>
                <h2>Thành tích từ các kỳ thi Contest HSG ({shown.length} học sinh)</h2>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <input
                  type="search"
                  placeholder="Tìm học sinh, trường, lớp..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    padding: "7px 12px",
                    borderRadius: 8,
                    border: "1px solid var(--ps-border, #cbd5e1)",
                    fontSize: 13,
                    background: "var(--ps-bg, #f8fafc)",
                    color: "var(--ps-text-main, #1e293b)",
                  }}
                />

                <label className="ranking-province-filter">
                  <Icon name="globe" />
                  <select
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    aria-label="Lọc theo tỉnh thành"
                  >
                    <option value={ALL}>Tất cả tỉnh thành</option>
                    {provinces.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="ranking-scroll">
              <div className="ranking-table-head">
                <span>Hạng</span>
                <span>Học viên</span>
                <span>Kỳ thi</span>
                <span>Bài AC</span>
                <span>Điểm TB</span>
                <span>Tổng điểm Contest</span>
              </div>

              <div className="ranking-list">
                {shown.map((e) => {
                  const isCurrent = e.uid === uid;
                  return (
                    <article className={isCurrent ? "current" : ""} key={e.uid}>
                      <span className={`ranking-number rank-${e.rank}`}>
                        {e.rank === 1 ? "🥇" : e.rank === 2 ? "🥈" : e.rank === 3 ? "🥉" : e.rank}
                      </span>
                      <div className="ranking-student">
                        <span>{initials({ displayName: e.displayName })}</span>
                        <p>
                          <strong>
                            {e.displayName}
                            {isCurrent && <em>Bạn</em>}
                          </strong>
                          <small>
                            {e.school || "Chưa cập nhật trường"}
                            {e.className ? ` · Lớp ${e.className}` : ""}
                          </small>
                          <small>{e.province || "Chưa cập nhật địa phương"}</small>
                        </p>
                      </div>
                      <span>{e.contestsCount || 0}</span>
                      <span style={{ color: "#16a34a", fontWeight: 700 }}>
                        {e.totalAcProblems || 0}
                      </span>
                      <strong>{fmt(e.averageScore || 0)}</strong>
                      <strong className="ranking-total">{fmt(e.totalContestScore)}</strong>
                    </article>
                  );
                })}
              </div>
            </div>

            <div className="ranking-note">
              <Icon name="clock" /> Thứ hạng được cập nhật đồng bộ tức thì cho tất cả tài khoản
              ngay khi có học sinh nộp bài và ghi điểm trong các kỳ thi Contest HSG.
            </div>
          </section>
        </>
      )}
    </div>
  );
}
