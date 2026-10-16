/**
 * contestRankingService.js
 * Đồng bộ Bảng xếp hạng Contest HSG giữa TẤT CẢ TÀI KHOẢN
 * Dựa trên TỔNG ĐIỂM THI CONTEST của mỗi học sinh
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import { listContests, loadScoreboard, loadContestSubmissions } from "./contestService";

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

/**
 * Lắng nghe REALTIME bảng xếp hạng Contest HSG đồng bộ giữa tất cả tài khoản
 */
export function subscribeContestLeaderboard(callback) {
  try {
    const colRef = collection(db, "contestLeaderboard");
    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        const items = snapshot.docs.map((d) => ({
          uid: d.id,
          ...d.data(),
        }));
        const ranked = rankContestEntries(items);
        saveLocalCache(ranked);
        callback({ entries: ranked, loading: false, error: "" });
      },
      (error) => {
        console.warn("Lỗi Firestore realtime contestLeaderboard, dùng cache:", error.message);
        const cached = rankContestEntries(getLocalCache());
        callback({ entries: cached, loading: false, error: "" });
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn("Không khởi tạo được listener contestLeaderboard:", err);
    const cached = rankContestEntries(getLocalCache());
    callback({ entries: cached, loading: false, error: "" });
    return () => {};
  }
}

/**
 * Đồng bộ tổng hợp điểm Contest của tất cả học sinh vào collection contestLeaderboard
 * Tính từ scoreboard của các kỳ thi contest đã tổ chức
 */
export async function syncAllContestScores() {
  try {
    // 1. Lấy danh sách kỳ thi
    const contests = await listContests().catch(() => []);
    if (!contests || contests.length === 0) return [];

    // 2. Lấy thông tin người dùng từ users collection
    const userProfiles = {};
    try {
      const userDocs = await getDocs(collection(db, "users"));
      userDocs.docs.forEach((d) => {
        userProfiles[d.id] = { uid: d.id, ...d.data() };
      });
    } catch {
      // ignore
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

    // 4. Lưu đồng bộ từng học sinh vào Firestore contestLeaderboard
    const entries = Object.values(studentAggregates);
    await Promise.all(
      entries.map(async (entry) => {
        const docRef = doc(db, "contestLeaderboard", entry.uid);
        await setDoc(
          docRef,
          {
            ...entry,
            averageScore:
              entry.contestsCount > 0
                ? Math.round((entry.totalContestScore / entry.contestsCount) * 10) / 10
                : 0,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      })
    );

    return entries;
  } catch (err) {
    console.error("Lỗi đồng bộ contest leaderboard:", err);
    return [];
  }
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
