import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import { useNotice } from "../hooks/useNotice";
import { languageCourses, LANG_BY_KEY, curriculum } from "../data/curriculum";
import { firstName, fmtTime, todayText } from "../utils/format";
import { calcStreak, weekSummary } from "../utils/activity";
import { isProfileComplete } from "../utils/profile";
import AllAnnouncementsModal from "../components/AllAnnouncementsModal";
import CreateAnnouncementModal from "../components/CreateAnnouncementModal";
import QuickGoalModal from "../components/QuickGoalModal";
import {
  subscribeGoals,
  toggleGoalCompleted,
  getDueGoals,
} from "../services/goalService";
import {
  subscribeAnnouncements,
  ANNOUNCEMENT_TYPES,
  getReadNotificationIds,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "../services/announcementService";
import { fetchRecentActivities } from "../services/activityService";
import { getProblemCount, listProblems, difficultyLabels } from "../services/problemService";
import { listContests } from "../services/contestService";
import { getLocalChapterState } from "../services/progressService";
import { getCodeSubmissionHistory } from "../services/submissionPersistence";
import { generateSmartRecommendation, fetchLiveAiAdvice } from "../services/aiRecommendationService";

const GOAL_TYPES = {
  practice: { label: "Bài tập Code", cls: "practice" },
  exam:     { label: "Luyện đề HSG", cls: "exam" },
  theory:   { label: "Lý thuyết", cls: "theory" },
  time:     { label: "Thời lượng", cls: "time" },
  custom:   { label: "Khác", cls: "custom" },
};

function formatGoalDate(dateStr) {
  if (!dateStr) return null;
  const today = new Date().toISOString().slice(0, 10);
  const parts = dateStr.split("-");
  const formatted = parts.length === 3 ? `${parts[2]}/${parts[1]}` : dateStr;
  return {
    text: `Hạn ${formatted}`,
    isToday: dateStr === today,
    isOverdue: dateStr < today,
  };
}

// Các khối chưa có dữ liệu thật (chuỗi ngày học, XP, nhật ký, bài tập…) giữ số liệu mẫu của bản thiết kế.
export default function Overview({ user, lang, data, onChangeLang }) {
  const nav = useNavigate();
  const notice = useNotice();
  const label = LANG_BY_KEY[lang];
  const course = languageCourses[label];
  const firstChapter = data.chapters[0];
  const week = weekSummary(data.daily);
  const streak = calcStreak(data.daily);

  // Thông báo lớp học
  const isTeacher = data?.profile?.role === "teacher";
  const [announcements, setAnnouncements] = useState([]);
  const [readIds, setReadIds] = useState(() => getReadNotificationIds(user?.uid));
  const [isAllNotifOpen, setIsAllNotifOpen] = useState(false);
  const [isCreateNotifOpen, setIsCreateNotifOpen] = useState(false);

  // Mục tiêu học tập cá nhân & nhắc nhở
  const [goals, setGoals] = useState([]);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setReadIds(getReadNotificationIds(user?.uid)));
  }, [user?.uid]);

  useEffect(() => {
    const unsub = subscribeGoals(user?.uid, (list) => {
      setGoals(list || []);
    });
    return () => unsub?.();
  }, [user?.uid]);

  const activeGoals = goals.filter((g) => !g.completed);
  const dueGoals = getDueGoals(goals);

  const handleToggleGoal = async (goal) => {
    const nextVal = !goal.completed;
    setGoals((prev) =>
      prev.map((g) => (g.id === goal.id ? { ...g, completed: nextVal } : g))
    );
    await toggleGoalCompleted(user?.uid, goal.id, nextVal);
    notice(nextVal ? `🎉 Xuất sắc! Bạn đã hoàn thành: ${goal.title}` : "Đã mở lại mục tiêu");
  };

  // Nhật ký hoạt động thực tế của cá nhân học viên
  const [activities, setActivities] = useState([]);
  const [loadingActivities, setLoadingActivities] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function loadActivities() {
      setLoadingActivities(true);
      try {
        const list = await fetchRecentActivities(user?.uid, {
          lang,
          chapters: data.chapters,
          rows: data.rows,
          goals,
        });
        if (!cancelled) {
          setActivities(list);
        }
      } catch (err) {
        console.error("Lỗi khi tải hoạt động gần đây:", err);
      } finally {
        if (!cancelled) {
          setLoadingActivities(false);
        }
      }
    }

    if (user?.uid) {
      loadActivities();
    } else {
      setActivities([]);
      setLoadingActivities(false);
    }

    return () => {
      cancelled = true;
    };
  }, [user?.uid, lang, data.rows, data.chapters, goals]);

  useEffect(() => {
    const unsub = subscribeAnnouncements((items) => {
      setAnnouncements(items);
    }, { uid: user?.uid, isTeacher: false });
    return () => unsub?.();
  }, [user?.uid]);

  const handleMarkRead = (id) => {
    markNotificationAsRead(user?.uid, id);
    setReadIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const handleMarkAllRead = () => {
    const allIds = announcements.map((a) => a.id);
    markAllNotificationsAsRead(user?.uid, allIds);
    setReadIds(allIds);
  };

  const openFirst = () => {
    if (firstChapter) nav(`/lesson/${firstChapter.id}`);
    else notice("Nội dung bài học đang được cập nhật");
  };

  // ── DỮ LIỆU CONTEST HSG ĐỒNG BỘ ───────────────────────────
  const [contests, setContests] = useState([]);
  useEffect(() => {
    let active = true;
    listContests()
      .then((items) => {
        if (active && Array.isArray(items)) {
          setContests(items);
        }
      })
      .catch((err) => {
        console.warn("Không tải được danh sách contest:", err);
      });
    return () => {
      active = false;
    };
  }, []);

  const publishedContests = useMemo(
    () => contests.filter((c) => c.status === "published" || c.status === undefined),
    [contests]
  );
  const contestCount = publishedContests.length;
  const contestProblemCount = publishedContests.reduce(
    (sum, c) => sum + (c.problems?.length || 0),
    0
  );

  const now = Date.now();
  const runningContest = useMemo(() => {
    return publishedContests.find((c) => {
      const start = c.startAt || 0;
      const end = start + (c.durationMinutes || 120) * 60 * 1000;
      return now >= start && now <= end;
    });
  }, [publishedContests, now]);

  const upcomingContest = useMemo(() => {
    return publishedContests.find((c) => (c.startAt || 0) > now);
  }, [publishedContests, now]);

  // ── TIẾN ĐỘ LÝ THUYẾT ĐỒNG BỘ TỰ ĐỘNG DỰA TRÊN DỮ LIỆU ─────
  const contentByOrder = useMemo(
    () => Object.fromEntries((data.chapters || []).map((c) => [c.order, c.id])),
    [data.chapters]
  );
  const progressById = useMemo(
    () => Object.fromEntries((data.rows || []).map((r) => [r.chapterId, r])),
    [data.rows]
  );
  const curriculumList = useMemo(() => curriculum[label] || [], [label]);

  const chaptersProgress = useMemo(() => {
    return curriculumList.map((c, i) => {
      const id = contentByOrder[i + 1];
      let p = id ? progressById[id] : undefined;
      if (id && (!p || !p.completed)) {
        const local = getLocalChapterState(user?.uid, lang, id);
        if (local && (!p || (local.progressPercent ?? 0) > (p.progressPercent ?? 0) || local.completed)) {
          p = { ...p, ...local };
        }
      }
      const progress = p?.completed ? 100 : p ? Math.max(0, Math.min(99, Math.round(p.progressPercent ?? p.bestScore ?? 0))) : 0;
      return { ...c, n: i + 1, id, progress, completed: p?.completed || progress === 100 };
    });
  }, [curriculumList, contentByOrder, progressById, user?.uid, lang]);

  const totalChaptersCount = chaptersProgress.length || data.chapters.length || 1;
  const completedChaptersCount = chaptersProgress.filter((c) => c.completed).length;
  const totalLessonsCount = curriculumList.reduce((sum, c) => sum + (c.lessons || 1), 0);
  const overallTheoryProgress = totalChaptersCount > 0
    ? Math.round(chaptersProgress.reduce((sum, c) => sum + c.progress, 0) / totalChaptersCount)
    : 0;

  const resumeChapter = useMemo(() => {
    return chaptersProgress.find((c) => c.id && c.progress < 100) || chaptersProgress[0];
  }, [chaptersProgress]);

  const openTheory = useCallback(() => {
    if (resumeChapter?.id) nav(`/lesson/${resumeChapter.id}`);
    else nav("/curriculum");
  }, [resumeChapter, nav]);

  // ── BÀI TẬP VÀ LỊCH SỬ NỘP CODE ──────────────────────────
  const [solvedSlugs, setSolvedSlugs] = useState(() => new Set());
  useEffect(() => {
    if (!user?.uid) return;
    let active = true;
    getCodeSubmissionHistory(user.uid)
      .then((subs) => {
        if (!active) return;
        const solved = new Set(
          subs
            .filter((s) => s.solved || s.status === "accepted" || s.lastStatus === "accepted")
            .map((s) => s.slug)
        );
        setSolvedSlugs(solved);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [user?.uid]);

  const allProblems = useMemo(() => listProblems(), []);
  const dailyProblem = useMemo(() => {
    return allProblems.find((p) => !solvedSlugs.has(p.slug)) || allProblems[0];
  }, [allProblems, solvedSlugs]);

  // ── TÍNH NĂNG AI GỢI Ý THÔNG MINH HOÀN THIỆN ─────────────
  const smartRec = useMemo(() => {
    return generateSmartRecommendation({
      lang,
      chaptersProgress,
      overallTheoryProgress,
      resumeChapter,
      solvedSlugs,
      problems: allProblems,
      dueGoals,
      contests: publishedContests,
      now,
    });
  }, [lang, chaptersProgress, overallTheoryProgress, resumeChapter, solvedSlugs, allProblems, dueGoals, publishedContests, now]);

  const [liveAiAdvice, setLiveAiAdvice] = useState(null);
  const [loadingAiAdvice, setLoadingAiAdvice] = useState(false);

  const handleFetchLiveAdvice = async () => {
    setLoadingAiAdvice(true);
    try {
      const advice = await fetchLiveAiAdvice({
        lang,
        overallTheoryProgress,
        currentTopic: resumeChapter?.title || "Cơ bản",
        solvedCount: solvedSlugs.size,
        streak,
      });
      if (advice) {
        setLiveAiAdvice(advice);
        notice("Peanut AI đã đưa ra lời khuyên dành riêng cho bạn!");
      } else {
        notice("Đã cập nhật lộ trình gợi ý dựa trên tiến trình gần đây.");
      }
    } catch {
      notice("Tạm thời chưa kết nối được Peanut AI.");
    } finally {
      setLoadingAiAdvice(false);
    }
  };

  const handleExecuteRecommendation = () => {
    if (smartRec.actionPath === "GOAL_MODAL") {
      setIsGoalModalOpen(true);
    } else if (smartRec.actionPath) {
      nav(smartRec.actionPath);
    }
  };

  return (
    <div className="content overview-content">
      {!data.loading && !isProfileComplete(data.profile) && (
        <div className="profile-banner">
          <span>Hoàn thiện hồ sơ (họ tên, trường, lớp, địa phương) để giáo viên nhận ra bạn trong lớp.</span>
          <button onClick={() => nav("/profile")}>Cập nhật ngay</button>
        </div>
      )}
      <section className="overview-hero">
        <div className="overview-copy">
          <div className="overview-kicker">
            <span><Icon name="code" /></span>
            Lộ trình {label} của bạn
          </div>
          <p className="overview-date">{todayText()}</p>
          <h1>
            <span className="greeting-line">Chào {firstName(user)}, hôm nay mình</span>
            <span className="start-line">bắt đầu viết code nhé!</span>
          </h1>
          <p className="overview-description">
            Mỗi lập trình viên giỏi đều bắt đầu từ một dòng code đầu tiên. PeanutCode sẽ đồng
            hành cùng bạn từng bước, từ nền tảng đến những bài toán thú vị.
          </p>
          <div className="overview-actions">
            <button onClick={openFirst}>
              <span><Icon name="play" /></span>
              Bắt đầu bài học đầu tiên
            </button>
            <button className="change-course" onClick={onChangeLang}>Đổi ngôn ngữ</button>
          </div>
          <div className="first-step-note">
            <span>01</span>
            <p><strong>Không cần biết trước lập trình</strong>Bài học được thiết kế dành cho người mới bắt đầu.</p>
          </div>
        </div>

        <div className="first-lesson-card">
          <div className="lesson-window-bar">
            <div><i /><i /><i /></div>
            <span>bai_hoc_01.{lang === "python" ? "py" : "cpp"}</span>
            <em>{label}</em>
          </div>
          <div className="lesson-code">
            <div className="line-numbers">1<br />2<br />3<br />4<br />5<br />6</div>
            <pre>{course.code}</pre>
          </div>
          <div className="lesson-info">
            <span>Bài học đầu tiên</span>
            <h2>{course.firstLesson}</h2>
            <p><Icon name="clock" /> Khoảng 15 phút <i /> <Icon name="book" /> Kiến thức nền tảng</p>
            <button onClick={openFirst}>Vào học ngay <Icon name="chevron" /></button>
          </div>
        </div>
      </section>

      <section className="overview-roadmap">
        <div><span>Bước đầu tiên</span><strong>Làm quen cú pháp</strong></div>
        <i />
        <div><span>Tiếp theo</span><strong>Biến & dữ liệu</strong></div>
        <i />
        <div><span>Sau đó</span><strong>Rẽ nhánh tư duy</strong></div>
      </section>

      {/* ── KHỐI KẾ HOẠCH ÔN LUYỆN (NẰM NGANG) ─────────────────── */}
      <section className="dash-block dash-goals-block">
          <div className="dash-block-header">
            <div>
              <div className="dash-title-row">
                <h2 className="dash-block-title">Kế hoạch ôn luyện</h2>
                {goals.length > 0 && <span className="dash-count-pill">{goals.length}</span>}
              </div>
              <p className="dash-block-desc">Theo dõi nhiệm vụ và mục tiêu chuẩn bị cho kỳ thi HSG.</p>
            </div>
            <div className="dash-block-actions">
              <span className="dash-shortcut-hint" title="Bấm phím G trên bàn phím để mở nhanh">
                Phím tắt <kbd>G</kbd>
              </span>
              <button
                type="button"
                className="dash-action-btn"
                onClick={() => setIsGoalModalOpen(true)}
              >
                Xem kế hoạch
              </button>
            </div>
          </div>

          {dueGoals.length > 0 && (
            <div className="dash-due-alert">
              <Icon name="clock" />
              <span>Bạn có {dueGoals.length} nhiệm vụ đến hạn hôm nay hoặc đã quá hạn.</span>
            </div>
          )}

          {activeGoals.length > 0 ? (
            <div className="dash-tasks-list">
              {activeGoals.slice(0, 4).map((g) => {
                const typeCfg = GOAL_TYPES[g.targetType] || GOAL_TYPES.custom;
                const dateInfo = formatGoalDate(g.targetDate);
                return (
                  <article key={g.id} className="dash-task-item">
                    <input
                      type="checkbox"
                      className="dash-task-checkbox"
                      checked={g.completed}
                      onChange={() => handleToggleGoal(g)}
                      title={g.completed ? "Đánh dấu chưa xong" : "Đánh dấu hoàn thành"}
                      aria-label={g.title}
                    />
                    <div className="dash-task-body">
                      <h3 className="dash-task-title">{g.title}</h3>
                      <div className="dash-task-meta">
                        <span className="dash-meta-badge">{typeCfg.label}</span>
                        {g.targetValue && <span className="dash-meta-value">{g.targetValue}</span>}
                        {dateInfo && (
                          <span className={`dash-meta-due ${dateInfo.isToday ? "is-today" : dateInfo.isOverdue ? "is-overdue" : ""}`}>
                            <Icon name="calendar" />
                            <span>{dateInfo.text}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : goals.length > 0 ? (
            <div className="dash-empty-content">
              <p>🎉 Bạn đã hoàn thành tất cả mục tiêu đặt ra.</p>
            </div>
          ) : (
            <div className="dash-empty-content">
              <p>Chưa có mục tiêu nào trong kế hoạch.</p>
            </div>
          )}
        </section>

        {/* ── KHỐI THÔNG BÁO MỚI ─────────────────────────────── */}
        <section className="dash-block dash-announcements-block">
          <div className="dash-block-header">
            <div>
              <div className="dash-title-row">
                <h2 className="dash-block-title">
                  Thông báo mới
                </h2>
                {announcements.length > 0 && (
                  <span className="dash-count-pill">{announcements.length}</span>
                )}
              </div>
              <p className="dash-block-desc">Cập nhật từ giáo viên và nhà trường.</p>
            </div>
            <div className="dash-block-actions">
              {isTeacher && (
                <button
                  type="button"
                  className="dash-action-btn"
                  onClick={() => setIsCreateNotifOpen(true)}
                  title="Đăng thông báo mới"
                >
                  + Đăng mới
                </button>
              )}
              {announcements.length > 0 && (
                <button
                  type="button"
                  className="dash-action-btn"
                  onClick={() => setIsAllNotifOpen(true)}
                >
                  Xem tất cả
                </button>
              )}
            </div>
          </div>

          {announcements.length === 0 ? (
            <div style={{ padding: "28px 16px", textAlign: "center", color: "#64748b" }}>
              <div style={{ width: 38, height: 38, margin: "0 auto 10px", borderRadius: "50%", background: "#f1f5f9", display: "grid", placeItems: "center", color: "#94a3b8" }}>
                <Icon name="bell" />
              </div>
              <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: "13.5px", color: "#14294d" }}>Chưa có thông báo mới nào</p>
              <p style={{ margin: 0, fontSize: "12px" }}>Các thông báo, dặn dò và lịch thi từ giáo viên sẽ hiển thị tại đây.</p>
            </div>
          ) : (
            <div className="dash-announcements-grid">
              {announcements.slice(0, 3).map((item) => {
                const meta = ANNOUNCEMENT_TYPES[item.type] || ANNOUNCEMENT_TYPES.general;
                const isUnread = !readIds.includes(item.id);
                return (
                  <article
                    key={item.id}
                    className={`dash-announcement-card ${isUnread ? "is-unread" : ""}`}
                    onClick={() => {
                      if (isUnread) handleMarkRead(item.id);
                      setIsAllNotifOpen(true);
                    }}
                  >
                    <div className="dash-announcement-top">
                      <span className="dash-meta-badge">
                        {meta.badge}
                      </span>
                      {item.pinned && (
                        <span className="dash-pinned-badge">
                          <Icon name="pin" /> Đã ghim
                        </span>
                      )}
                      {isUnread && (
                        <span className="dash-unread-badge">
                          <span className="dash-unread-dot" /> Chưa đọc
                        </span>
                      )}
                    </div>
                    <h3 className="dash-announcement-title">{item.title}</h3>
                    <p className="dash-announcement-content">{item.content}</p>
                    <div className="dash-announcement-foot">
                      <span>
                        <Icon name="user" /> {item.authorName || "Giáo viên"}
                      </span>
                      <span>
                        <Icon name="calendar" /> {item.createdAt ? new Date(item.createdAt).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }) : "Vừa xong"}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

      <section className="learning-hub">
        <div className="learning-hub-heading">
          <div>
            <span>Lộ trình học tập</span>
            <h2>Học chắc từng phần, chinh phục từng bài toán.</h2>
          </div>
          <p>
            Nội dung được sắp xếp theo đúng trình tự từ kiến thức nền tảng đến vận dụng trong
            các đề thi học sinh giỏi thực tiễn.
          </p>
        </div>

        <div className="learning-section-grid">
          <article
            className="learning-section-card theory-card"
            onClick={openTheory}
            style={{ cursor: "pointer" }}
          >
            <div className="learning-card-top">
              <span className="learning-card-icon"><Icon name="book" /></span>
              <span className={`learning-status ${overallTheoryProgress > 0 ? "active" : ""}`}>
                {overallTheoryProgress === 100 ? "Hoàn thành" : overallTheoryProgress > 0 ? "Đang học" : "Mới"}
              </span>
            </div>
            <span className="learning-index">Phần 01</span>
            <h3>Lý thuyết</h3>
            <p>Nắm chắc khái niệm, cú pháp và tư duy cốt lõi qua nội dung ngắn gọn, ví dụ trực quan.</p>
            <div className="learning-meta">
              <span><Icon name="book" /> {totalChaptersCount} chương ({totalLessonsCount} bài học)</span>
              <span><Icon name="clock" /> {completedChaptersCount}/{totalChaptersCount} chương xong</span>
            </div>
            <div className="learning-card-progress">
              <div><span>Tiến độ</span><strong>{overallTheoryProgress}%</strong></div>
              <div className="progress-track"><span style={{ width: `${overallTheoryProgress}%` }} /></div>
            </div>
            <button onClick={(e) => { e.stopPropagation(); openTheory(); }}>
              {overallTheoryProgress === 100 ? "Ôn tập lý thuyết" : overallTheoryProgress > 0 ? "Tiếp tục học lý thuyết" : "Bắt đầu học lý thuyết"} <Icon name="chevron" />
            </button>
          </article>

          <article
            className="learning-section-card practice-card"
            onClick={() => nav("/practice")}
            style={{ cursor: "pointer" }}
          >
            <div className="learning-card-top">
              <span className="learning-card-icon"><Icon name="code" /></span>
              <span className="learning-status">Kho bài tập</span>
            </div>
            <span className="learning-index">Phần 02</span>
            <h3>Thực hành</h3>
            <p>Viết code trực tiếp, nhận kết quả chấm bài và gợi ý để cải thiện từng lời giải.</p>
            <div className="learning-meta">
              <span><Icon name="code" /> {getProblemCount()} bài tập</span>
              <span><Icon name="check" /> Chấm tự động</span>
            </div>
            <div className="learning-levels">
              <span>Cơ bản</span><span>Vận dụng</span><span>Nâng cao</span>
            </div>
            <button onClick={(e) => { e.stopPropagation(); nav("/practice"); }}>
              Vào kho bài tập <Icon name="chevron" />
            </button>
          </article>

          <article className="learning-section-card review-card">
            <div className="learning-card-top">
              <span className="learning-card-icon"><Icon name="grid" /></span>
              <span className="learning-status">Theo chương</span>
            </div>
            <span className="learning-index">Phần 03</span>
            <h3>Ôn tập tổng hợp chương</h3>
            <p>Hệ thống lại kiến thức, luyện bài tổng hợp và kiểm tra mức độ thành thạo sau mỗi chương.</p>
            <div className="review-checklist">
              <span><i><Icon name="check" /></i>Tóm tắt kiến thức trọng tâm</span>
              <span><i><Icon name="check" /></i>Bài kiểm tra cuối chương</span>
            </div>
            <button onClick={() => nav("/curriculum")}>Xem nội dung ôn tập <Icon name="chevron" /></button>
          </article>

          <article
            className="learning-section-card contest-card"
            onClick={() => nav("/contests")}
            style={{ cursor: "pointer" }}
          >
            <div className="learning-card-top">
              <span className="learning-card-icon"><Icon name="trophy" /></span>
              <span className="learning-status">Thử thách</span>
            </div>
            <span className="learning-index">Phần 04</span>
            <h3>Đấu trường Contest HSG</h3>
            <p>Giải các bộ đề thi thử, kỳ thi chọn đội tuyển và cọ xát trực tiếp với thời gian thực.</p>
            <div className="contest-stats">
              <div><strong>{contestCount}</strong><span>Kỳ thi</span></div>
              <div><strong>{contestProblemCount}</strong><span>Bài thi</span></div>
              <div><strong>Real-time</strong><span>Bảng xếp hạng</span></div>
            </div>
            <button onClick={(e) => { e.stopPropagation(); nav("/contests"); }}>
              Vào đấu trường Contest <Icon name="chevron" />
            </button>
          </article>
        </div>
      </section>

      {/* ── KHỐI THỬ THÁCH HÔM NAY ĐỒNG BỘ CONTEST HOẶC BÀI TẬP ── */}
      <section className="daily-challenge">
        {runningContest ? (
          <>
            <div className="challenge-copy">
              <span className="challenge-label"><Icon name="fire" /> Contest đang diễn ra</span>
              <h2>{runningContest.title}</h2>
              <p>
                {runningContest.description || "Kỳ thi đấu trường HSG đang mở làm bài và chấm điểm trực tiếp. Tham gia ngay để kiểm tra phong độ và cạnh tranh trên bảng xếp hạng!"}
              </p>
              <div className="challenge-meta">
                <span><Icon name="clock" /> {runningContest.durationMinutes || 120} phút</span>
                <span><Icon name="code" /> {runningContest.problems?.length || 4} bài thi</span>
                <span><Icon name="trophy" /> Xếp hạng tự động</span>
              </div>
              <button onClick={() => nav(`/contest/${runningContest.id}`)}>
                Vào phòng thi ngay <Icon name="chevron" />
              </button>
            </div>
            <div className="challenge-visual" aria-hidden="true">
              <span className="challenge-code-line">CONTEST HSG</span>
              <span className="challenge-code-line">REALTIME JUDGE</span>
              <div className="challenge-badge"><Icon name="trophy" /><strong>LIVE</strong><small>Đang diễn ra</small></div>
            </div>
          </>
        ) : upcomingContest ? (
          <>
            <div className="challenge-copy">
              <span className="challenge-label"><Icon name="clock" /> Thử thách sắp diễn ra</span>
              <h2>{upcomingContest.title}</h2>
              <p>
                {upcomingContest.description || "Kỳ thi Contest HSG chuẩn bị mở đề. Hãy chuẩn bị sẵn sàng kiến thức và kỹ năng làm bài để đạt điểm số tối đa!"}
              </p>
              <div className="challenge-meta">
                <span><Icon name="calendar" /> {new Date(upcomingContest.startAt).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                <span><Icon name="clock" /> {upcomingContest.durationMinutes || 120} phút</span>
                <span><Icon name="trophy" /> Contest HSG</span>
              </div>
              <button onClick={() => nav("/contests")}>
                Xem chi tiết kỳ thi <Icon name="chevron" />
              </button>
            </div>
            <div className="challenge-visual" aria-hidden="true">
              <span className="challenge-code-line">UPCOMING</span>
              <span className="challenge-code-line">CONTEST</span>
              <div className="challenge-badge"><Icon name="trophy" /><strong>HSG</strong><small>Sắp diễn ra</small></div>
            </div>
          </>
        ) : dailyProblem ? (
          <>
            <div className="challenge-copy">
              <span className="challenge-label"><Icon name="fire" /> Thử thách hôm nay</span>
              <h2>{dailyProblem.title}</h2>
              <p>
                {dailyProblem.statement ? dailyProblem.statement.slice(0, 140) + "..." : "Vận dụng kiến thức đã học để giải quyết bài toán và vượt qua tất cả bộ test của máy chấm."}
              </p>
              <div className="challenge-meta">
                <span><Icon name="chart" /> {difficultyLabels[dailyProblem.difficulty] || "Cơ bản"}</span>
                <span><Icon name="code" /> {label}</span>
                <span><Icon name="trophy" /> +50 XP</span>
              </div>
              <button onClick={() => nav(`/practice/problem/${dailyProblem.slug}`)}>
                Làm thử thách ngay <Icon name="chevron" />
              </button>
            </div>
            <div className="challenge-visual" aria-hidden="true">
              <span className="challenge-code-line">{lang === "python" ? "a, b = map(int, input().split())" : "cin >> a >> b;"}</span>
              <span className="challenge-code-line">{lang === "python" ? "print(result)" : "cout << result;"}</span>
              <div className="challenge-badge"><Icon name="trophy" /><strong>+50</strong><small>điểm XP</small></div>
            </div>
          </>
        ) : (
          <>
            <div className="challenge-copy">
              <span className="challenge-label"><Icon name="trophy" /> Đấu trường HSG</span>
              <h2>Thử sức với các kỳ thi Tin học</h2>
              <p>
                Tham gia thi đấu cùng các bạn học sinh, rèn luyện áp lực thời gian và nâng cao tư duy lập trình.
              </p>
              <button onClick={() => nav("/contests")}>
                Vào đấu trường Contest <Icon name="chevron" />
              </button>
            </div>
            <div className="challenge-visual" aria-hidden="true">
              <span className="challenge-code-line">CONTEST</span>
              <span className="challenge-code-line">PEANUTCODE</span>
              <div className="challenge-badge"><Icon name="trophy" /><strong>HSG</strong><small>Đấu trường</small></div>
            </div>
          </>
        )}
      </section>

      <section className="overview-insights">
        <div className="week-progress-card">
          <div className="insight-heading">
            <div><span>Tiến độ tuần</span><h2>Một tuần học tập hiệu quả</h2></div>
            <strong>{week.activeCount}/7 ngày</strong>
          </div>
          <div className="study-days">
            {week.days.map((day, index) => (
              <div className={day.active ? "completed" : day.isToday ? "today" : ""} key={day.key}>
                <span>{day.active ? <Icon name="check" /> : index + 1}</span>
                <small>{day.label}</small>
              </div>
            ))}
          </div>
          <div className="week-summary">
            <div><span><Icon name="clock" /></span><p><strong>{fmtTime(week.totalSeconds)}</strong><small>Thời gian học</small></p></div>
            <div><span><Icon name="code" /></span><p><strong>{data.rows.filter((r) => r.completed).length} chương</strong><small>Đã hoàn thành</small></p></div>
            <div><span><Icon name="fire" /></span><p><strong>{streak} ngày</strong><small>Chuỗi hiện tại</small></p></div>
          </div>
        </div>

        {/* ── KHỐI AI GỢI Ý THÔNG MINH HOÀN THIỆN ──────────────── */}
        <div className="mentor-card">
          <div className="mentor-top-row">
            <div className="mentor-top">
              <span className="mentor-icon">AI</span>
              <span>Gợi ý dành cho bạn</span>
              <span className="mentor-ai-badge">{smartRec.badge}</span>
            </div>
            <button
              type="button"
              className="mentor-ai-refresh-btn"
              onClick={handleFetchLiveAdvice}
              disabled={loadingAiAdvice}
              title="Nhận phân tích và lời khuyên trực tiếp từ Peanut AI"
            >
              <Icon name="sparkles" />
              <span>{loadingAiAdvice ? "Đang hỏi AI..." : "Hỏi Peanut AI"}</span>
            </button>
          </div>

          <h2>{smartRec.title}</h2>
          <p>{smartRec.description}</p>

          {liveAiAdvice && (
            <div className="mentor-ai-bubble">
              <strong>💡 Lời khuyên từ Peanut AI:</strong> {liveAiAdvice}
            </div>
          )}

          <div className="mentor-progress">
            <span>
              <i style={{ width: `${Math.max(5, Math.min(100, smartRec.progressPercent))}%` }} />
            </span>
            <strong>{smartRec.progressText}</strong>
          </div>

          <div className="mentor-btn-group">
            <button type="button" onClick={handleExecuteRecommendation}>
              <span>{smartRec.actionText}</span>
              <Icon name="chevron" />
            </button>
          </div>
        </div>
      </section>

      <section className="recent-learning">
        <div className="recent-heading">
          <div>
            <span>Nhật ký học tập</span>
            <h2>Hoạt động gần đây</h2>
          </div>
          <button type="button" onClick={() => nav("/exam-history")}>
            Xem tất cả <Icon name="chevron" />
          </button>
        </div>

        {loadingActivities ? (
          <div style={{ padding: "28px 16px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
            Đang tải nhật ký hoạt động gần đây...
          </div>
        ) : activities.length === 0 ? (
          <div style={{
            padding: "28px 16px",
            textAlign: "center",
            color: "#64748b",
            background: "#f8fafc",
            borderRadius: "14px",
            border: "1px dashed #cbd5e1",
            marginTop: "16px"
          }}>
            <div style={{
              width: 40,
              height: 40,
              margin: "0 auto 10px",
              borderRadius: "50%",
              background: "#e2e8f0",
              display: "grid",
              placeItems: "center",
              color: "#64748b"
            }}>
              <Icon name="clock" />
            </div>
            <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: "13px", color: "#1e293b" }}>
              Chưa có hoạt động học tập nào
            </p>
            <p style={{ margin: "0 0 14px", fontSize: "12px", color: "#64748b" }}>
              Hãy bắt đầu làm bài học lý thuyết hoặc giải bài tập code để ghi nhận nhật ký học tập tại đây.
            </p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
              <button
                type="button"
                onClick={() => nav("/curriculum")}
                style={{
                  padding: "7px 14px",
                  background: "#3978ed",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                Vào học ngay
              </button>
              <button
                type="button"
                onClick={() => nav("/practice")}
                style={{
                  padding: "7px 14px",
                  background: "#fff",
                  color: "#3978ed",
                  border: "1px solid #3978ed",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                Luyện tập code
              </button>
            </div>
          </div>
        ) : (
          <div className="recent-list">
            {activities.slice(0, 5).map((item) => (
              <article
                key={item.id}
                onClick={() => item.link && nav(item.link)}
                style={{ cursor: item.link ? "pointer" : "default" }}
                title={item.link ? "Nhấp để xem chi tiết" : ""}
              >
                <span className={`recent-icon ${item.iconClass}`}>
                  <Icon name={item.icon} />
                </span>
                <div>
                  <strong>{item.title}</strong>
                  <small>{item.subtitle}</small>
                </div>
                <em>{item.badge}</em>
              </article>
            ))}
          </div>
        )}
      </section>

      <AllAnnouncementsModal
        isOpen={isAllNotifOpen}
        onClose={() => setIsAllNotifOpen(false)}
        announcements={announcements}
        readIds={readIds}
        onMarkRead={handleMarkRead}
        onMarkAllRead={handleMarkAllRead}
        isTeacher={isTeacher}
        onOpenCreateModal={() => setIsCreateNotifOpen(true)}
      />

      {isTeacher && (
        <CreateAnnouncementModal
          isOpen={isCreateNotifOpen}
          onClose={() => setIsCreateNotifOpen(false)}
          currentUser={user}
        />
      )}

      <QuickGoalModal
        isOpen={isGoalModalOpen}
        onClose={() => setIsGoalModalOpen(false)}
        user={user}
      />
    </div>
  );
}

