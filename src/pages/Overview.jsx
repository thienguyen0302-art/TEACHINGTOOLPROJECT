import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import { useNotice } from "../hooks/useNotice";
import { languageCourses, LANG_BY_KEY } from "../data/curriculum";
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

const GOAL_TYPES = {
  practice: { label: "Bài tập Code", cls: "practice" },
  contest:  { label: "Contest HSG", cls: "contest" },
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

  useEffect(() => {
    const unsub = subscribeAnnouncements((items) => {
      setAnnouncements(items);
    });
    return () => unsub?.();
  }, []);

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

      {/* ── KHỐI KẾ HOẠCH ÔN LUYỆN ─────────────────────────── */}
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
            <h2 className="dash-block-title">
              Thông báo mới
              {announcements.length > 0 && (
                <span className="dash-count-pill">{announcements.length}</span>
              )}
            </h2>
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
          <div style={{ padding: "36px 16px", textAlign: "center", color: "#64748b" }}>
            <div style={{ width: 44, height: 44, margin: "0 auto 12px", borderRadius: "50%", background: "#f1f5f9", display: "grid", placeItems: "center", color: "#94a3b8" }}>
              <Icon name="bell" />
            </div>
            <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: "15px", color: "#1e293b" }}>Chưa có thông báo mới nào</p>
            <p style={{ margin: 0, fontSize: "13px" }}>Các thông báo, dặn dò và lịch thi từ giáo viên sẽ hiển thị tại đây.</p>
          </div>
        ) : (
          <div className="dash-announcements-grid">
            {announcements.slice(0, 2).map((item) => {
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
                    {isUnread && <span className="dash-unread-dot" title="Chưa đọc" />}
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
          <article className="learning-section-card theory-card">
            <div className="learning-card-top">
              <span className="learning-card-icon"><Icon name="book" /></span>
              <span className="learning-status active">Đang học</span>
            </div>
            <span className="learning-index">Phần 01</span>
            <h3>Lý thuyết</h3>
            <p>Nắm chắc khái niệm, cú pháp và tư duy cốt lõi qua nội dung ngắn gọn, ví dụ trực quan.</p>
            <div className="learning-meta">
              <span><Icon name="book" /> 24 bài học</span>
              <span><Icon name="clock" /> 8 giờ</span>
            </div>
            <div className="learning-card-progress">
              <div><span>Tiến độ</span><strong>35%</strong></div>
              <div className="progress-track"><span style={{ width: "35%" }} /></div>
            </div>
            <button onClick={() => nav("/curriculum")}>Tiếp tục học lý thuyết <Icon name="chevron" /></button>
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
              <span><Icon name="check" /> Chấm tự động</span>
              <span><Icon name="chart" /> Theo dõi kết quả</span>
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
            <div className="contest-glow" />
            <div className="learning-card-top">
              <span className="learning-card-icon"><Icon name="trophy" /></span>
              <span className="learning-status">Thử thách</span>
            </div>
            <span className="learning-index">Phần 04</span>
            <h3>Tham gia Contest HSG</h3>
            <p>Giải các bài lập trình trong vòng thi có thời gian, nộp code và theo dõi bảng điểm.</p>
            <div className="contest-stats">
              <div><strong>A–Z</strong><span>Bài lập trình</span></div>
              <div><strong>Test</strong><span>Chấm tự động</span></div>
              <div><strong>Điểm</strong><span>Từng phần</span></div>
            </div>
            <button onClick={(e) => { e.stopPropagation(); nav("/contests"); }}>
              Xem các contest <Icon name="chevron" />
            </button>
          </article>
        </div>
      </section>

      <section className="daily-challenge">
        <div className="challenge-copy">
          <span className="challenge-label"><Icon name="fire" /> Thử thách hôm nay</span>
          <h2>Tìm số lớn nhất trong ba số</h2>
          <p>
            Vận dụng câu lệnh điều kiện để tìm đáp án tối ưu. Hoàn thành trong 15 phút để nhận
            thêm 50 điểm kinh nghiệm.
          </p>
          <div className="challenge-meta">
            <span><Icon name="clock" /> 15 phút</span>
            <span><Icon name="chart" /> Cơ bản</span>
            <span><Icon name="trophy" /> +50 XP</span>
          </div>
          <button onClick={() => notice("Thử thách hằng ngày đang được cập nhật")}>
            Làm thử thách ngay <Icon name="chevron" />
          </button>
        </div>
        <div className="challenge-visual" aria-hidden="true">
          <span className="challenge-code-line">if (a &gt; b)</span>
          <span className="challenge-code-line">max = a;</span>
          <div className="challenge-badge"><Icon name="trophy" /><strong>+50</strong><small>điểm XP</small></div>
        </div>
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

        <div className="mentor-card">
          <div className="mentor-top">
            <span className="mentor-icon">AI</span>
            <span>Gợi ý dành cho bạn</span>
          </div>
          <h2>Hãy ôn lại câu lệnh điều kiện</h2>
          <p>
            Bạn đã làm tốt phần nhập xuất. Trước khi sang vòng lặp, hãy hoàn thành thêm 3 bài
            điều kiện để củng cố tư duy rẽ nhánh.
          </p>
          <div className="mentor-progress"><span><i /></span><strong>2/5 bài</strong></div>
          <button onClick={() => notice("Gợi ý của AI đang được cập nhật")}>
            Xem bài được đề xuất <Icon name="chevron" />
          </button>
        </div>
      </section>

      <section className="recent-learning">
        <div className="recent-heading">
          <div><span>Nhật ký học tập</span><h2>Hoạt động gần đây</h2></div>
          <button onClick={() => nav("/progress")}>Xem tất cả <Icon name="chevron" /></button>
        </div>
        <div className="recent-list">
          <article>
            <span className="recent-icon done"><Icon name="check" /></span>
            <div><strong>Hoàn thành bài “Biến và kiểu dữ liệu”</strong><small>Hôm nay, 09:30 · Điểm số 9/10</small></div>
            <em>+30 XP</em>
          </article>
          <article>
            <span className="recent-icon code"><Icon name="code" /></span>
            <div><strong>Nộp bài “Tính tổng hai số”</strong><small>Hôm qua, 20:15 · Accepted</small></div>
            <em>Đúng 100%</em>
          </article>
          <article>
            <span className="recent-icon badge"><Icon name="trophy" /></span>
            <div><strong>Nhận huy hiệu “Khởi đầu thuận lợi”</strong><small>18 tháng 5 · Hoàn thành 10 bài đầu tiên</small></div>
            <em>Huy hiệu mới</em>
          </article>
        </div>
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

