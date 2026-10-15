import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import Icon from "../components/Icon";
import { getExamById, listExamsByLang } from "../data/exams";
import { saveExamResult, getExamHistory } from "../services/examService";
import { useExamTimer, formatTime } from "../utils/timer";
import { auth } from "../services/firebase";
import { LANG_LABEL } from "../utils/format";
import "./Exam.css";

const CHOICE_LETTERS = ["A", "B", "C", "D", "E", "F"];

// ==========================================
// 1. Màn hình làm bài thi (Exam Room)
// ==========================================
function ExamRoom({ exam, onFinish }) {
  const [answers, setAnswers] = useState({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [examResult, setExamResult] = useState(null);
  const startTimeRef = useRef(0);
  const questionRefs = useRef([]);

  useEffect(() => {
    startTimeRef.current = Date.now();
  }, []);

  const questions = exam.questions;
  const total = questions.length;
  const answeredCount = Object.keys(answers).length;
  const durationSec = exam.durationMinutes * 60;

  // Xử lý nộp bài
  const handleSubmit = useCallback(async (autoSubmitted = false) => {
    if (isFinished || submitting) return;
    setSubmitting(true);
    setIsFinished(true);

    const start = startTimeRef.current || Date.now();
    const elapsedSec = Math.min(
      durationSec,
      Math.max(1, Math.round((Date.now() - start) / 1000))
    );

    let correctCount = 0;
    questions.forEach((q) => {
      if (answers[q.id] === q.answer) {
        correctCount += 1;
      }
    });

    const resultPayload = {
      examId: exam.id,
      language: exam.language,
      correct: correctCount,
      total,
      durationSec: elapsedSec,
      maxScore: exam.maxScore || 20,
      autoSubmitted,
      chapterIds: exam.chapterIds || [],
    };

    let saved = null;
    let saveError = null;
    const uid = auth.currentUser?.uid;
    if (uid) {
      try {
        saved = await saveExamResult(uid, resultPayload);
      } catch (err) {
        console.error("Lỗi khi lưu kết quả thi:", err);
        saveError = err.message || "Lỗi lưu điểm";
      }
    }

    setExamResult({
      ...resultPayload,
      percentage: Math.round((correctCount / total) * 100),
      points: Math.round(((correctCount / total) * (exam.maxScore || 20)) * 10) / 10,
      saved,
      saveError,
    });
    setSubmitting(false);
  }, [answers, durationSec, exam, isFinished, questions, submitting, total]);

  // Hook đếm ngược
  const { formatted, isWarning, isDanger } = useExamTimer({
    durationSec,
    onExpire: () => handleSubmit(true),
    active: !isFinished,
  });

  function handleSelect(qId, choice) {
    if (isFinished) return;
    setAnswers((prev) => ({ ...prev, [qId]: choice }));
  }

  function scrollToQuestion(index) {
    setCurrentIdx(index);
    const el = questionRefs.current[index];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  // MÀN HÌNH KẾT QUẢ SAU KHI NỘP BÀI
  if (examResult) {
    return (
      <div className="exam-result-wrap">
        <article className="exam-result-card">
          <span className="exam-kicker">
            <Icon name="check" /> KẾT QUẢ THI
          </span>
          <h1>{exam.title}</h1>
          <p className="exam-result-sub">
            {examResult.autoSubmitted
              ? "Bài thi đã tự động nộp khi hết thời gian quy định."
              : "Bạn đã hoàn thành và nộp bài thi thành công."}
          </p>

          <div className="exam-result-score">
            {examResult.points} <span style={{ fontSize: "1.5rem", color: "#64748b" }}>/ {exam.maxScore}</span>
          </div>

          <div className="exam-result-stats">
            <div>
              <strong>{examResult.correct} / {examResult.total}</strong>
              <small>Số câu đúng ({examResult.percentage}%)</small>
            </div>
            <div>
              <strong>{formatTime(examResult.durationSec)}</strong>
              <small>Thời gian làm bài</small>
            </div>
            <div>
              <strong style={{ color: examResult.saveError ? "#dc2626" : "#16a34a" }}>
                {examResult.saveError ? "Chưa lưu" : "Đã đồng bộ"}
              </strong>
              <small>Bảng xếp hạng</small>
            </div>
          </div>

          <div className="exam-result-actions">
            <Link className="exam-btn-primary" to="/ranking">
              <Icon name="trophy" /> Xem Bảng xếp hạng
            </Link>
            <button
              type="button"
              className="exam-btn-exit"
              onClick={onFinish}
            >
              Về danh sách đề thi
            </button>
          </div>
        </article>

        {/* Xem lại lời giải chi tiết */}
        <h2>Chi tiết đáp án & giải thích</h2>
        <div className="exam-review-list">
          {questions.map((q, idx) => {
            const userChoice = answers[q.id];
            const isCorrect = userChoice === q.answer;
            return (
              <article
                key={q.id}
                className="exam-question-card"
                style={{
                  borderLeft: `5px solid ${isCorrect ? "#16a34a" : userChoice ? "#dc2626" : "#94a3b8"}`,
                }}
              >
                <div className="exam-q-header">
                  <span className="exam-q-number">Câu {idx + 1}</span>
                  <span style={{ fontSize: "0.85rem", fontWeight: 600, color: isCorrect ? "#16a34a" : "#dc2626" }}>
                    {isCorrect ? "✓ Trả lời đúng" : userChoice ? "✗ Trả lời sai" : "— Chưa trả lời"}
                  </span>
                </div>
                <p className="exam-q-text">{q.question}</p>
                {q.code && <pre className="exam-q-code"><code>{q.code}</code></pre>}

                <div className="exam-choices">
                  {q.choices.map((choice, cIdx) => {
                    const isSelected = userChoice === choice;
                    const isAnswer = q.answer === choice;
                    let style = {};
                    if (isAnswer) {
                      style = { borderColor: "#16a34a", background: "#f0fdf4" };
                    } else if (isSelected && !isAnswer) {
                      style = { borderColor: "#dc2626", background: "#fef2f2" };
                    }
                    return (
                      <div key={cIdx} className="exam-choice-item disabled" style={style}>
                        <span className="exam-choice-label">{CHOICE_LETTERS[cIdx]}.</span>
                        <span className="exam-choice-content">{choice}</span>
                        {isAnswer && <span style={{ marginLeft: "auto", color: "#16a34a", fontWeight: 700 }}>Đáp án đúng</span>}
                      </div>
                    );
                  })}
                </div>

                {q.explanation && (
                  <div style={{ marginTop: "1rem", padding: "0.85rem", background: "#f8fafc", borderRadius: "0.5rem", fontSize: "0.9rem" }}>
                    <strong>💡 Giải thích:</strong> {q.explanation}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>
    );
  }

  // PHÒNG THI ĐANG LÀM
  return (
    <div className="exam-room">
      <header className="exam-room-header">
        <div className="exam-room-title">
          <h2>{exam.title}</h2>
          <span>Đã làm {answeredCount} / {total} câu</span>
        </div>

        <div className={`exam-timer-badge ${isDanger ? "danger" : isWarning ? "warning" : ""}`}>
          <Icon name="clock" />
          <span>{formatted}</span>
        </div>

        <div className="exam-room-actions">
          <button
            type="button"
            className="exam-btn-exit"
            onClick={() => {
              if (window.confirm("Bạn có chắc muốn thoát bài thi? Các câu trả lời chưa nộp sẽ không được lưu.")) {
                onFinish();
              }
            }}
          >
            Thoát
          </button>
          <button
            type="button"
            className="exam-btn-submit"
            disabled={submitting}
            onClick={() => {
              const unans = total - answeredCount;
              const msg = unans > 0
                ? `Bạn còn ${unans} câu chưa trả lời. Bạn có chắc muốn nộp bài ngay?`
                : "Bạn có chắc muốn nộp bài thi?";
              if (window.confirm(msg)) {
                handleSubmit(false);
              }
            }}
          >
            {submitting ? "Đang nộp..." : "Nộp bài thi"}
          </button>
        </div>
      </header>

      <div className="exam-layout">
        {/* Cột danh sách câu hỏi */}
        <div className="exam-questions-main">
          {questions.map((q, idx) => (
            <article
              key={q.id}
              ref={(el) => { questionRefs.current[idx] = el; }}
              className="exam-question-card"
            >
              <div className="exam-q-header">
                <span className="exam-q-number">Câu {idx + 1} / {total}</span>
                {answers[q.id] && <span style={{ fontSize: "0.8rem", color: "#2563eb", fontWeight: 600 }}>✓ Đã chọn</span>}
              </div>
              <p className="exam-q-text">{q.question}</p>
              {q.code && <pre className="exam-q-code"><code>{q.code}</code></pre>}

              <div className="exam-choices">
                {q.choices.map((choice, cIdx) => (
                  <div
                    key={cIdx}
                    className={`exam-choice-item ${answers[q.id] === choice ? "selected" : ""}`}
                    onClick={() => handleSelect(q.id, choice)}
                  >
                    <span className="exam-choice-label">{CHOICE_LETTERS[cIdx]}.</span>
                    <span className="exam-choice-content">{choice}</span>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>

        {/* Bảng Palette danh sách câu hỏi bên phải */}
        <aside className="exam-palette">
          <h4>Danh sách câu hỏi</h4>
          <div className="exam-palette-grid">
            {questions.map((q, idx) => (
              <button
                key={q.id}
                type="button"
                className={`exam-palette-btn ${answers[q.id] ? "answered" : ""} ${currentIdx === idx ? "current" : ""}`}
                onClick={() => scrollToQuestion(idx)}
                aria-label={`Câu hỏi ${idx + 1}`}
              >
                {idx + 1}
              </button>
            ))}
          </div>
          <div className="exam-palette-legend">
            <span><i className="done" /> Đã trả lời ({answeredCount})</span>
            <span><i className="undone" /> Chưa trả lời ({total - answeredCount})</span>
          </div>
        </aside>
      </div>
    </div>
  );
}

// ==========================================
// 2. Màn hình danh sách đề thi (Exam Catalog)
// ==========================================
export default function Exam({ lang }) {
  const { examId } = useParams();
  const nav = useNavigate();
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(() => Boolean(auth.currentUser?.uid));

  const exams = listExamsByLang(lang || "cpp");
  const activeExam = examId ? getExamById(examId) : null;

  // Tính toán thời gian và số câu động từ danh sách đề
  const durations = exams.map((e) => e.durationMinutes);
  const minDuration = durations.length ? Math.min(...durations) : 30;
  const maxDuration = durations.length ? Math.max(...durations) : 30;
  const timeText = minDuration === maxDuration ? `${minDuration} phút` : `${minDuration}–${maxDuration} phút`;

  const questionCounts = exams.map((e) => e.questions.length);
  const minQ = questionCounts.length ? Math.min(...questionCounts) : 15;
  const maxQ = questionCounts.length ? Math.max(...questionCounts) : 15;
  const qText = minQ === maxQ ? `${minQ} câu` : `${minQ}–${maxQ} câu`;

  // Tải lịch sử thi từ Firestore
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    let cancelled = false;
    getExamHistory(uid, 10)
      .then((res) => {
        if (!cancelled) {
          setHistory(res);
          setLoadingHistory(false);
        }
      })
      .catch((e) => {
        console.error("Lỗi tải lịch sử thi:", e);
        if (!cancelled) setLoadingHistory(false);
      });
    return () => { cancelled = true; };
  }, [examId]);

  if (activeExam) {
    return (
      <div className="content exam-page">
        <ExamRoom
          key={activeExam.id}
          exam={activeExam}
          onFinish={() => {
            nav("/exam");
          }}
        />
      </div>
    );
  }

  return (
    <div className="content exam-page">
      {/* 1. Banner đầu trang */}
      <section className="exam-hero">
        <div>
          <span>
            <Icon name="trophy" /> KHO ĐỀ THI HSG · {LANG_LABEL[lang] || lang?.toUpperCase() || "C++"}
          </span>
          <h1>Luyện đề thi thử Học sinh giỏi</h1>
          <p>
            Rèn kỹ năng làm bài dưới áp lực thời gian. Điểm cao nhất của mỗi đề được tính vào bảng xếp hạng.
          </p>
        </div>
        <div className="exam-hero-stat">
          <strong>{exams.length}</strong>
          <span>đề thi có sẵn</span>
          <button type="button" onClick={() => nav("/ranking")}>
            Bảng xếp hạng
          </button>
        </div>
      </section>

      {/* 2. Khu vực đề thi */}
      <div className="exam-section-heading">
        <h2>Đề thi có sẵn <em>({exams.length})</em></h2>
      </div>

      <div className="exam-catalog-layout">
        {/* Cột chính: danh sách đề thi */}
        <div className="exam-cards-list">
          {exams.map((ex) => (
            <article className="exam-card" key={ex.id}>
              <div className="exam-card-header">
                <span className={`exam-tag exam-tag--${ex.language}`}>
                  {LANG_LABEL[ex.language] || ex.language?.toUpperCase()}
                </span>
                <span className="exam-tag exam-tag--level">{ex.level}</span>
              </div>
              <h3>{ex.title}</h3>
              <p>{ex.description}</p>
              <div className="exam-card-meta">
                <span><Icon name="clock" /> {ex.durationMinutes} phút</span>
                <span><Icon name="check" /> {ex.questions.length} câu hỏi</span>
                <span><Icon name="trophy" /> Thang điểm {ex.maxScore}</span>
              </div>
              <button
                type="button"
                className="exam-btn-start"
                onClick={() => nav(`/exam/${ex.id}`)}
              >
                <Icon name="play" /> Bắt đầu làm bài
              </button>
            </article>
          ))}
        </div>

        {/* Cột phụ: Khung Trước khi bắt đầu */}
        <aside className="exam-guide-card">
          <div className="exam-guide-header">
            <span className="exam-guide-kicker">HƯỚNG DẪN ÔN THI</span>
            <h3>Trước khi bắt đầu</h3>
          </div>
          <ul className="exam-guide-list">
            <li>
              <span className="guide-icon"><Icon name="clock" /></span>
              <div>
                <strong>Thời gian làm bài</strong>
                <p>Mỗi đề thi kéo dài khoảng <b>{timeText}</b> gồm <b>{qText}</b> trắc nghiệm thuật toán.</p>
              </div>
            </li>
            <li>
              <span className="guide-icon"><Icon name="user" /></span>
              <div>
                <strong>Tập trung cao độ</strong>
                <p>Dành khoảng thời gian yên tĩnh, làm bài liền mạch để đánh giá đúng năng lực.</p>
              </div>
            </li>
            <li>
              <span className="guide-icon"><Icon name="code" /></span>
              <div>
                <strong>Đọc kỹ yêu cầu</strong>
                <p>Phân tích kỹ các trường hợp biên (edge cases) và cấu trúc dữ liệu trước khi chọn đáp án.</p>
              </div>
            </li>
          </ul>
          <div className="exam-guide-note">
            <Icon name="check" />
            <p>Điểm cao nhất của mỗi đề sẽ được tính vào bảng xếp hạng.</p>
          </div>
        </aside>
      </div>

      {/* 3. Lịch sử thi */}
      <section className="exam-history-card">
        <div className="exam-history-header">
          <div>
            <span className="exam-history-kicker">KẾT QUẢ CÁ NHÂN</span>
            <h2>Lịch sử thi của bạn</h2>
          </div>
          {history.length > 0 && (
            <span className="exam-history-count">{history.length} bài thi</span>
          )}
        </div>

        {loadingHistory ? (
          <div className="exam-history-loading">Đang tải lịch sử thi...</div>
        ) : history.length === 0 ? (
          <div className="exam-history-empty">
            <div className="empty-trophy-icon">
              <Icon name="trophy" />
            </div>
            <h3>Sẵn sàng cho bài thi đầu tiên?</h3>
            <p>Bạn chưa hoàn thành bài thi nào. Hãy thử sức với đề thi ở trên nhé!</p>
          </div>
        ) : (
          <div className="exam-table-wrap">
            <table className="exam-table">
              <thead>
                <tr>
                  <th scope="col">Mã đề thi</th>
                  <th scope="col">Ngôn ngữ</th>
                  <th scope="col">Số câu đúng</th>
                  <th scope="col">Điểm số</th>
                  <th scope="col">Thời gian</th>
                  <th scope="col">Cách nộp</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id}>
                    <td className="col-exam-id"><strong>{h.examId}</strong></td>
                    <td>
                      <span className="exam-lang-badge">
                        {LANG_LABEL[h.language] || h.language}
                      </span>
                    </td>
                    <td><b>{h.correct}</b> / {h.total}</td>
                    <td className="col-exam-score">
                      <strong>{h.points ?? h.score} điểm</strong>{" "}
                      <small>({h.score}%)</small>
                    </td>
                    <td>{formatTime(h.durationSec)}</td>
                    <td>
                      {h.autoSubmitted ? (
                        <span className="exam-submit-tag tag--auto">Tự động khi hết giờ</span>
                      ) : (
                        <span className="exam-submit-tag tag--manual">Chủ động nộp</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
