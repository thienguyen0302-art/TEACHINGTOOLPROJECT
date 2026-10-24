import { useEffect, useState } from "react";
import {
  HonorBanner,
  HonorPodium,
  HonorCard,
  HonorFooter,
  TableCard,
} from "../components/hsg-admin/HsgAdminUI";
import { subscribeContestLeaderboard } from "../services/contestRankingService";
import "../components/hsg-admin/HsgAdmin.css";

/**
 * Bảng vàng Contest HSG: lấy dữ liệu thật từ scoreboard của các contest
 * (xem contestRankingService.subscribeContestLeaderboard), làm mới mỗi 60 giây.
 */
function cardProps(entry) {
  if (!entry) return { title: "Chờ vinh danh", subtitle: "Chưa có kết quả" };
  const parts = [`${entry.totalContestScore} điểm`, `${entry.contestsCount} kỳ thi`];
  return { title: entry.displayName, subtitle: parts.join(" · ") };
}

export default function Ranking({ uid }) {
  const [state, setState] = useState({ entries: [], loading: true, error: "" });

  useEffect(() => subscribeContestLeaderboard(setState), []);

  const { entries, loading, error } = state;
  const [first, second, third] = entries;
  const hasResults = entries.length > 0;

  return (
    <div className="content hsg-page">
      <div className="hsg-frame-inner">
        <HonorBanner
          badge="BẢNG VÀNG CONTEST HSG TOÀN TRƯỜNG"
          title="Mỗi kỳ thi, một bước tiến gần bục vinh quang."
          description="Thứ hạng được cập nhật từ tổng điểm thi Contest HSG của mỗi học sinh."
        />

        <HonorPodium>
          <HonorCard rank={2} rankLabel="Hạng 2" {...cardProps(second)} />
          <HonorCard rank={1} rankLabel="Hạng 1" {...cardProps(first)} />
          <HonorCard rank={3} rankLabel="Hạng 3" {...cardProps(third)} />
        </HonorPodium>

        {hasResults && (
          <TableCard headers={["Hạng", "Học sinh", "Lớp", "Số kỳ thi", "Bài đạt tối đa", "Tổng điểm"]}>
            {entries.map((entry) => (
              <tr key={entry.uid} className={entry.uid === uid ? "contest-current-user" : ""}>
                <td>{entry.rank}</td>
                <td>{entry.displayName}{entry.uid === uid ? " (bạn)" : ""}</td>
                <td>{entry.className || "—"}</td>
                <td>{entry.contestsCount}</td>
                <td>{entry.totalAcProblems}</td>
                <td><b>{entry.totalContestScore}</b></td>
              </tr>
            ))}
          </TableCard>
        )}

        <HonorFooter
          mainText={
            hasResults
              ? "Xếp hạng theo tổng điểm các kỳ thi; bằng điểm thì ai nộp bài sớm hơn đứng trước."
              : loading
                ? "Đang tải bảng xếp hạng…"
                : "Chưa có kết quả xếp hạng. Ba vị trí vinh danh sẽ được cập nhật khi có bài thi hợp lệ."
          }
          noteText={error || (hasResults ? "Tự động cập nhật mỗi 60 giây." : "")}
        />
      </div>
    </div>
  );
}
