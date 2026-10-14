import { useEffect, useState } from "react";
import Icon from "../components/Icon";
import { getLeaderboard, getMyEntry, getMyRank } from "../services/leaderboardService";
import { LANG_LABEL, initials } from "../utils/format";
import { rankEntries } from "../utils/ranking";
import "./Ranking.css";

const ALL = "all";
const fmt = (n) => (Math.round(n * 100) / 100).toLocaleString("vi-VN", { maximumFractionDigits: 2 });

// Bảng xếp hạng: tổng điểm cao nhất của từng đề trong Kho đề thi thật, tách theo ngôn ngữ.
export default function Ranking({ uid, lang }) {
  const [state, setState] = useState({ loading: true, error: "", entries: [], me: null, myRank: null });
  const [province, setProvince] = useState(ALL);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const entries = await getLeaderboard(lang);
      const ranked = rankEntries(entries);
      let me = ranked.find((e) => e.uid === uid) ?? null;
      let myRank = me?.rank ?? null;
      if (!me) {
        // Có điểm nhưng nằm ngoài top 100: lấy riêng dòng của mình và hạng thật.
        me = await getMyEntry(lang, uid);
        if (me) myRank = await getMyRank(lang, me.total);
      }
      if (!cancelled) setState({ loading: false, error: "", entries: ranked, me, myRank });
    })().catch((e) => {
      if (!cancelled) setState({ loading: false, error: "Không tải được bảng xếp hạng: " + (e.code || e.message), entries: [], me: null, myRank: null });
    });
    return () => { cancelled = true; };
  }, [lang, uid]);

  const provinces = [...new Set(state.entries.map((e) => e.province).filter(Boolean))].sort((a, b) => a.localeCompare(b, "vi"));
  const shown = rankEntries(province === ALL ? state.entries : state.entries.filter((e) => e.province === province));
  const podium = [shown[1], shown[0], shown[2]]; // bố cục: hạng 2 - hạng 1 - hạng 3
  const { me, myRank } = state;

  return (
    <div className="content ranking-page">
      <section className="ranking-hero">
        <div>
          <span className="ranking-kicker"><Icon name="trophy" /> Bảng vàng PeanutCode · {LANG_LABEL[lang]}</span>
          <h1>Mỗi bài thi, một bước tiến gần bục vinh quang.</h1>
          <p>Thứ hạng tính từ tổng điểm cao nhất của từng đề trong Kho đề thi thật. Thi lại đề cũ chỉ tính lần điểm cao nhất.</p>
        </div>
        <div className="my-ranking-card">
          <div className="my-ranking-avatar">{initials({ displayName: me?.displayName || "Bạn" })}</div>
          <div>
            <span>Thứ hạng của bạn</span>
            <strong>{me ? `#${myRank}` : "—"}</strong>
            <small>{me ? `${fmt(me.total)} điểm · ${me.examCount} đề thi` : "Chưa có điểm thi"}</small>
          </div>
        </div>
      </section>

      {me && (
        <section className="ranking-summary">
          <div><span><Icon name="trophy" /></span><p><small>Tổng điểm</small><strong>{fmt(me.total)}</strong></p></div>
          <div><span><Icon name="chart" /></span><p><small>Điểm trung bình</small><strong>{fmt(me.average)}</strong></p></div>
          <div><span><Icon name="check" /></span><p><small>Đề đã hoàn thành</small><strong>{me.examCount}</strong></p></div>
        </section>
      )}

      {state.loading && <p className="ranking-state">Đang tải bảng xếp hạng...</p>}
      {state.error && <p className="err">{state.error}</p>}

      {!state.loading && !state.error && state.entries.length === 0 && (
        <p className="ranking-state">Chưa có ai có điểm thi {LANG_LABEL[lang]}. Hoàn thành một đề trong Kho đề thi thật để lên bảng xếp hạng.</p>
      )}

      {!state.loading && shown.length > 0 && (
        <>
          <section className="ranking-podium">
            {podium.map((e, i) => e && (
              <article className={`podium-card place-${i === 1 ? 1 : i === 0 ? 2 : 3}`} key={e.uid}>
                <span className="podium-place">{e.rank}</span>
                <div className="podium-avatar">{initials({ displayName: e.displayName })}</div>
                <strong>{e.displayName}</strong>
                <small>{e.school || "—"}</small>
                <p>{fmt(e.total)} <span>điểm</span></p>
              </article>
            ))}
          </section>

          <section className="ranking-board">
            <div className="ranking-board-heading">
              <div><span>Xếp hạng học viên</span><h2>Thành tích từ đề thi thật</h2></div>
              <label className="ranking-province-filter">
                <Icon name="globe" />
                <select value={province} onChange={(e) => setProvince(e.target.value)} aria-label="Lọc theo tỉnh thành">
                  <option value={ALL}>Tất cả tỉnh thành</option>
                  {provinces.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </label>
            </div>
            <div className="ranking-scroll">
              <div className="ranking-table-head"><span>Hạng</span><span>Học viên</span><span>Đề đã làm</span><span>Điểm TB</span><span>Tổng điểm</span></div>
              <div className="ranking-list">
                {shown.map((e) => (
                  <article className={e.uid === uid ? "current" : ""} key={e.uid}>
                    <span className={`ranking-number rank-${e.rank}`}>{e.rank}</span>
                    <div className="ranking-student">
                      <span>{initials({ displayName: e.displayName })}</span>
                      <p>
                        <strong>{e.displayName}{e.uid === uid && <em>Bạn</em>}</strong>
                        <small>{e.school || "Chưa cập nhật trường"}{e.className ? ` · Lớp ${e.className}` : ""}</small>
                        <small>{[e.district, e.province].filter(Boolean).join(", ") || "Chưa cập nhật địa phương"}</small>
                      </p>
                    </div>
                    <span>{e.examCount}</span>
                    <strong>{fmt(e.average)}</strong>
                    <strong className="ranking-total">{fmt(e.total)}</strong>
                  </article>
                ))}
              </div>
            </div>
            <div className="ranking-note"><Icon name="clock" /> Hiển thị tối đa 100 học viên cao điểm nhất. Tên, trường và lớp của bạn hiện công khai trên bảng này.</div>
          </section>
        </>
      )}
    </div>
  );
}
