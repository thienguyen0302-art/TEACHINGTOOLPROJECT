/**
 * contestRankingService.js
 * Bảng xếp hạng Contest HSG: TÍNH KHI ĐỌC từ scoreboard của từng kỳ thi.
 * Scoreboard do server ghi (học sinh không sửa được), nên không còn ghi
 * điểm xếp hạng từ trình duyệt lên Firestore.
 */
import { collection, doc, getDocs, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { listContests, loadScoreboard } from "./contestService";

const LOCAL_STORAGE_RANKING_KEY = "peanut_contest_leaderboard_cache";

function getLocalCache() {
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_RANKING_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalCache(list) {
  try {
    window.localStorage.setItem(LOCAL_STORAGE_RANKING_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

/**
 * Xếp hạng danh sách theo tổng điểm Contest giảm dần
 * Tie-break: ai đạt điểm sớm hơn (lastSubmissionAt nhỏ hơn) thì đứng trước
 */
export function rankContestEntries(entries = []) {
  const sorted = [...entries].sort((a, b) => {
    if ((b.totalContestScore || 0) !== (a.totalContestScore || 0)) {
      return (b.totalContestScore || 0) - (a.totalContestScore || 0);
    }
    if ((a.lastSubmissionAt || 0) && (b.lastSubmissionAt || 0)) {
      return (a.lastSubmissionAt || 0) - (b.lastSubmissionAt || 0);
    }
    return (a.displayName || "").localeCompare(b.displayName || "", "vi");
  });

  return sorted.map((entry, index) => ({
    ...entry,
    rank: index + 1,
  }));
}

const REFRESH_MS = 60000;
const listeners = new Set();
let timer = null;
let inflight = null;

/** Tổng hợp điểm của mọi học sinh từ scoreboard các kỳ thi, trả về danh sách đã xếp hạng. */
async function computeLeaderboard() {
  const contests = await listContests().catch(() => []);
  if (!contests || contests.length === 0) return [];

  // Hồ sơ người dùng chỉ đọc được khi là giáo viên; học sinh dùng tên trong scoreboard.
  const userProfiles = {};
  try {
    const userDocs = await getDocs(collection(db, "users"));
    userDocs.docs.forEach((d) => {
      userProfiles[d.id] = { uid: d.id, ...d.data() };
    });
  } catch {
    // học sinh không có quyền đọc users: bỏ qua
  }

  // 3. Tổng hợp điểm contest của từng học sinh: { [uid]: studentData }
  const studentAggregates = {};

  for (const c of contests) {
    try {
      const rows = await loadScoreboard(c.id).catch(() => []);
      const maxScore = (c.problems || []).reduce((sum, p) => sum + (p.points || 0), 0);

      (rows || []).forEach((row) => {
        const uid = row.uid;
        if (!uid) return;

        // Bỏ qua nếu tài khoản là giáo viên
        const profile = userProfiles[uid];
        if (profile?.role === "teacher") return;

        if (!studentAggregates[uid]) {
          studentAggregates[uid] = {
            uid,
            displayName: profile?.displayName || row.displayName || `Học sinh ${uid.slice(0, 6)}`,
            className: profile?.className || "",
            school: profile?.school || "",
            province: profile?.province || "",
            totalContestScore: 0,
            contestsCount: 0,
            contestsParticipated: [],
            totalAcProblems: 0,
            lastSubmissionAt: 0,
          };
        }

        const agg = studentAggregates[uid];
        const contestScore = row.totalScore || 0;
        agg.totalContestScore += contestScore;
        agg.contestsCount += 1;

        // Đếm số bài giải AC trong kỳ thi này
        let acInContest = 0;
        if (row.problems) {
          Object.values(row.problems).forEach((p) => {
            if (p.accepted || (p.bestScore && p.bestScore >= 100)) {
              acInContest += 1;
            }
          });
        }
        agg.totalAcProblems += acInContest;

        agg.contestsParticipated.push({
          contestId: c.id,
          contestTitle: c.title,
          score: contestScore,
          maxScore,
          lastSubmissionAt: row.lastSubmissionAt || 0,
        });

        if ((row.lastSubmissionAt || 0) > agg.lastSubmissionAt) {
          agg.lastSubmissionAt = row.lastSubmissionAt;
        }
      });
    } catch {
      // ignore single contest load error
    }
  }


  return rankContestEntries(
    Object.values(studentAggregates).map((entry) => ({
      ...entry,
      averageScore:
        entry.contestsCount > 0
          ? Math.round((entry.totalContestScore / entry.contestsCount) * 10) / 10
          : 0,
    }))
  );
}

function notify(payload) {
  listeners.forEach((cb) => {
    try { cb(payload); } catch (err) { console.warn("Lỗi listener xếp hạng:", err); }
  });
}

async function refresh() {
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const ranked = await computeLeaderboard();
      saveLocalCache(ranked);
      notify({ entries: ranked, loading: false, error: "" });
      return ranked;
    } catch (err) {
      console.warn("Không tính được bảng xếp hạng, dùng cache:", err);
      const cached = rankContestEntries(getLocalCache());
      notify({ entries: cached, loading: false, error: "" });
      return cached;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/** Đăng ký nhận bảng xếp hạng; tự làm mới mỗi 60 giây khi còn người xem. */
export function subscribeContestLeaderboard(callback) {
  listeners.add(callback);
  callback({ entries: rankContestEntries(getLocalCache()), loading: true, error: "" });
  refresh();
  if (!timer) timer = setInterval(refresh, REFRESH_MS);
  return () => {
    listeners.delete(callback);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

/** Giữ tên cũ cho nơi đang gọi: nay chỉ tính lại và thông báo, KHÔNG ghi Firestore. */
export async function syncAllContestScores() {
  return refresh();
}

/**
 * Lưu lịch sử thi của 1 học sinh khi hoàn thành/nộp bài contest
 */
export async function recordStudentContestHistory(uid, contestId, contestData) {
  if (!uid || !contestId) return;
  const now = Date.now();
  try {
    const historyRef = doc(db, "users", uid, "contestHistory", contestId);
    await setDoc(
      historyRef,
      {
        contestId,
        contestTitle: contestData.contestTitle || "",
        score: contestData.score || 0,
        maxScore: contestData.maxScore || 0,
        problems: contestData.problems || {},
        lastSubmissionAt: contestData.lastSubmissionAt || now,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn("Lỗi lưu student contest history:", err);
  }
}
