import { useEffect, useRef, useState, useSyncExternalStore, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { submissionProgressStore } from "../services/submissionProgressService";
import { lessonCompletion, computeLessonProgress, runnableExercises } from "../utils/lessonCompletion";
import LessonPractice from "../components/LessonPractice";
import LessonSummary from "../components/LessonSummary";
import LessonTheory from "../components/LessonTheory";
import ResumeLessonModal from "../components/ResumeLessonModal";
import { auth } from "../services/firebase";
import { loadChapter, listChapters } from "../services/contentService";
import {
  saveProgress,
  getChapterProgress,
  getSolvedExerciseIds,
  getLocalChapterState,
  saveLocalChapterState,
  clearLocalChapterState,
} from "../services/progressService";
import { calculateScore, countAnswered, chapterScore } from "../utils/grading";
import "./Lesson.css";

const TABS = [
  ["overview", "Tổng quan"],
  ["theory", "Lý thuyết"],
  ["practice", "Thực hành"],
  ["summary", "Tổng kết"],
];

function LessonOverview({ chapter, onRead }) {
  const endRef = useRef(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) onRead(true); }, { threshold: 1 });
    if (endRef.current) observer.observe(endRef.current);
    return () => observer.disconnect();
  }, [onRead]);
  return <section className="lesson-overview" aria-labelledby="lesson-overview-title">
    <div className="lesson-section-heading"><span>BẮT ĐẦU</span><h3 id="lesson-overview-title">Em sẽ học gì trong chương này?</h3></div>
    <p className="lesson-overview__description">{chapter.description}</p>
    <div className="lesson-overview__columns">
      <section><h4>Mục tiêu học tập</h4><ul>{chapter.objectives.map((item, index) => <li key={index}>{item}</li>)}</ul></section>
      <section><h4>Kiến thức cần có trước</h4><ul>{chapter.prerequisites.map((item, index) => <li key={index}>{item}</li>)}</ul></section>
    </div>
    {chapter.references?.length > 0 && <section className="lesson-references"><h4>Nguồn tham khảo và đọc thêm</h4><p>Nội dung tiếng Việt, bài tập và minh họa được biên soạn cho lộ trình này.</p><ul>{chapter.references.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a></li>)}</ul></section>}
    <div ref={endRef} className="lesson-overview-end">Hết phần tổng quan · Tiếp tục với Lý thuyết bên dưới.</div>
  </section>;
}

function LessonBody({ lang }) {
  const { id } = useParams();
  return <LessonContent key={`${lang}:${id}`} lang={lang} id={id} />;
}

function LessonContent({ lang, id }) {
  const nav = useNavigate();
  const [chapter, setChapter] = useState(undefined);
  const [allChapters, setAllChapters] = useState([]);
  const [tab, setTab] = useState("overview");
  const headingRef = useRef(null);
  const changedTabRef = useRef(false);

  const [practiceMode, setPracticeMode] = useState("quiz");
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const [overviewRead, setOverviewRead] = useState(false);
  const [reflections, setReflections] = useState({});
  const [completedReflections, setCompletedReflections] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [summaryVisited, setSummaryVisited] = useState(false);
  const [persistedSolved, setPersistedSolved] = useState([]); // bài code đã Accepted (lưu trên Firestore)
  const [hydrated, setHydrated] = useState(false);
  const [completeMsg, setCompleteMsg] = useState("");

  // Resume modal state
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [savedData, setSavedData] = useState(null);
  const promptedRef = useRef(false);
  const saveTimeoutRef = useRef(null);

  const uid = auth.currentUser?.uid;
  const solvedKey = useSyncExternalStore(
    submissionProgressStore.subscribe,
    () =>
      (chapter?.practice ?? [])
        .filter((item) => item.runnable && submissionProgressStore.get({ slug: `lesson/${lang}/${id}/practice/${item.id}`, language: lang }, uid)?.stats.solved)
        .map((item) => item.id)
        .join(","),
    () => ""
  );

  // Hợp nhất bài đã giải trong phiên này + bài đã lưu trên Firestore (tải lại trang / đổi thiết bị không mất).
  const solvedIds = [...new Set([...solvedKey.split(",").filter(Boolean), ...persistedSolved])];
  const solvedIdsKey = [...solvedIds].sort().join(",");

  useEffect(() => {
    if (!changedTabRef.current) return;
    headingRef.current?.scrollIntoView({ block: "start", behavior: "instant" });
    headingRef.current?.focus({ preventScroll: true });
  }, [tab]);

  // Load chapter and chapter list
  useEffect(() => {
    let active = true;
    loadChapter(lang, id).then((result) => { if (active) setChapter(result); });
    listChapters(lang).then((list) => { if (active) setAllChapters(list); });
    return () => { active = false; };
  }, [lang, id]);

  // Check saved progress from local and remote
  useEffect(() => {
    if (!chapter) return;
    if (promptedRef.current) return;
    promptedRef.current = true;

    async function checkSaved() {
      if (!uid) setHydrated(true);
      const local = getLocalChapterState(uid, lang, id);
      let remote = null;
      if (uid) {
        try {
          remote = await getChapterProgress(uid, lang, id);
        } catch { /* offline: dùng bản lưu cục bộ */ }
      }

      let solvedRemote = [];
      if (uid) {
        try {
          solvedRemote = await getSolvedExerciseIds(uid, lang, id);
        } catch { /* offline: dùng bài đã giải trong phiên */ }
      }
      setPersistedSolved([...new Set([...(remote?.solvedIds ?? []), ...solvedRemote])]);
      setSummaryVisited(Boolean(remote?.summaryVisited || remote?.completed));
      setHydrated(true);

      const combined =
        local && (local.progressPercent ?? 0) >= (remote?.progressPercent ?? 0)
          ? { ...remote, ...local }
          : { ...local, ...remote };

      if (!local && !remote) return;

      const hasProgress =
        Boolean(combined.completed) ||
        (combined.progressPercent ?? 0) > 0 ||
        Boolean(combined.overviewRead) ||
        Object.keys(combined.answers || {}).length > 0 ||
        (combined.lastTab && combined.lastTab !== "overview");

      if (hasProgress) {
        setSavedData(combined);
        setShowResumeModal(true);
      }
    }

    checkSaved();
  }, [chapter, lang, id, uid]);

  // Helpers to persist state
  const persistState = useCallback(
    (overrides = {}) => {
      const currentTabVal = overrides.tab ?? tab;
      const currentPracticeMode = overrides.practiceMode ?? practiceMode;
      const currentAnswers = overrides.answers ?? answers;
      const currentReflections = overrides.reflections ?? reflections;
      const currentOverviewRead = overrides.overviewRead ?? overviewRead;
      const currentQuizSubmitted = overrides.quizSubmitted ?? quizSubmitted;
      const currentSummary = (overrides.summaryVisited ?? summaryVisited) || currentTabVal === "summary";
      const legacyDone = overrides.isCompleted ?? isCompleted;

      const computed = computeLessonProgress({
        chapter,
        overviewRead: currentOverviewRead,
        reflections: currentReflections,
        answers: currentAnswers,
        quizSubmitted: currentQuizSubmitted,
        solvedIds,
        summaryVisited: currentSummary,
        tab: currentTabVal,
      });
      const currentIsCompleted = legacyDone || computed >= 100;
      const percent = currentIsCompleted ? 100 : computed;

      const cs = chapterScore(chapter, {
        quizPercent: calculateScore(chapter?.quiz ?? [], currentAnswers).percentage,
        quizSubmitted: currentQuizSubmitted,
        solvedIds,
      });

      const payload = {
        language: lang,
        chapterId: id,
        chapterScore: cs.score,
        codeSolved: cs.solved,
        codeTotal: cs.exercises,
        lastTab: currentTabVal,
        lastPracticeMode: currentPracticeMode,
        overviewRead: currentOverviewRead,
        reflections: currentReflections,
        answers: currentAnswers,
        quizSubmitted: currentQuizSubmitted,
        completed: currentIsCompleted,
        progressPercent: percent,
        solvedIds,
        summaryVisited: currentSummary,
        ...(overrides.reset ? { reset: true } : {}),
      };

      // 1. Lưu ngay vào localStorage
      saveLocalChapterState(uid, lang, id, payload);

      // 2. Debounce lưu lên Firestore
      if (uid) {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => {
          saveProgress(uid, id, payload).catch((e) =>
            console.warn("Lỗi lưu nền:", e)
          );
        }, 800);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tab, practiceMode, answers, reflections, overviewRead, quizSubmitted, isCompleted, summaryVisited, chapter, solvedIdsKey, lang, id, uid]
  );

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  // Giải xong bài code (hoặc nạp xong danh sách bài đã giải) -> ghi % + điểm ngay, không chờ thao tác khác.
  const persistRef = useRef(persistState);
  useEffect(() => {
    persistRef.current = persistState;
  });
  useEffect(() => {
    if (!chapter || !hydrated || !uid) return;
    persistRef.current();
  }, [solvedIdsKey, hydrated, chapter, uid]);

  if (chapter === undefined) return <p>Đang tải bài học...</p>;
  if (chapter === null) return <p>Không tìm thấy chương này.</p>;

  const questions = chapter.quiz ?? [];
  const answeredCount = countAnswered(questions, answers);
  const score = calculateScore(questions, answers);
  const canSubmit = score.total > 0 && answeredCount === score.total;

  const baseProgress = computeLessonProgress({
    chapter,
    overviewRead,
    reflections,
    answers,
    quizSubmitted,
    solvedIds,
    summaryVisited: summaryVisited || tab === "summary",
    tab,
  });
  const done = isCompleted || baseProgress >= 100;
  const currentPercent = done ? 100 : baseProgress;

  const completion = lessonCompletion(chapter, {
    overviewRead,
    reflections: completedReflections,
    quizSubmitted,
    solvedIds,
    isCompleted: done,
    currentTab: tab,
  });

  const next = TABS[TABS.findIndex(([key]) => key === tab) + 1];

  // Next chapter info
  const nextChapter = allChapters.find((c) => c.order === chapter.order + 1);

  function changeTab(key) {
    if (!completion.unlocked[key] && !done) return;
    changedTabRef.current = true;
    setTab(key);
    if (key === "summary") setSummaryVisited(true);
    persistState({ tab: key, ...(key === "summary" ? { summaryVisited: true } : {}) });
  }

  function handleOverviewRead(isRead) {
    setOverviewRead(isRead);
    persistState({ overviewRead: isRead });
  }

  function handleSelect(questionId, choice) {
    if (!submitted) {
      const nextAnswers = { ...answers, [questionId]: choice };
      setAnswers(nextAnswers);
      persistState({ answers: nextAnswers });
    }
  }

  function resetQuiz() {
    setAnswers({});
    setSubmitted(false);
    setSaveStatus("");
    persistState({ answers: {}, quizSubmitted: false });
  }

  async function handleSubmitQuiz(currentScore) {
    if (!canSubmit) return;
    setSubmitted(true);
    setQuizSubmitted(true);
    const uidCurrent = auth.currentUser?.uid;
    setSaveStatus("saving");

    const newPercent = computeLessonProgress({
      chapter, overviewRead, reflections, answers, quizSubmitted: true, solvedIds, summaryVisited, tab: "practice",
    });

    const payload = {
      language: lang,
      chapterId: id,
      quizScore: currentScore.percentage,
      ...(() => {
        const cs = chapterScore(chapter, {
          quizPercent: currentScore.percentage,
          quizSubmitted: true,
          solvedIds,
        });
        return { chapterScore: cs.score, codeSolved: cs.solved, codeTotal: cs.exercises };
      })(),
      correct: currentScore.correct,
      total: currentScore.total,
      isQuizSubmit: true,
      progressPercent: newPercent,
      lastTab: "practice",
      lastPracticeMode: practiceMode,
      overviewRead,
      reflections,
      answers,
      quizSubmitted: true,
      solvedIds,
      summaryVisited,
      completed: done || newPercent >= 100,
    };

    saveLocalChapterState(uidCurrent, lang, id, payload);

    if (uidCurrent) {
      try {
        await saveProgress(uidCurrent, id, payload);
        setSaveStatus("saved");
      } catch (error) {
        console.error("Lỗi lưu tiến độ:", error);
        setSaveStatus("error");
      }
    } else {
      setSaveStatus("saved");
    }
  }

  async function handleCompleteChapter() {
    // Nút này chỉ ghi nhận đã xem Tổng kết. Chương chỉ 100% khi các phần còn lại cũng đã xong.
    setSummaryVisited(true);
    const percent = computeLessonProgress({
      chapter, overviewRead: true, reflections, answers, quizSubmitted, solvedIds, summaryVisited: true, tab: "summary",
    });

    if (percent < 100) {
      const missing = [];
      if (completion.checks > 0 && completion.answered < completion.checks) missing.push(`Self-Check ${completion.answered}/${completion.checks}`);
      if ((chapter.quiz?.length ?? 0) > 0 && !quizSubmitted) missing.push("nộp Quiz");
      const total = runnableExercises(chapter).length;
      if (total > 0 && completion.solved < total) missing.push(`bài code Accepted ${completion.solved}/${total}`);
      setCompleteMsg(`Chương mới đạt ${percent}%. Còn thiếu: ${missing.join(", ") || "một số phần"}.`);
    } else {
      setCompleteMsg("");
    }

    setIsSaving(true);
    const uidCurrent = auth.currentUser?.uid;
    const cs = chapterScore(chapter, {
      quizPercent: calculateScore(chapter?.quiz ?? [], answers).percentage,
      quizSubmitted,
      solvedIds,
    });
    const payload = {
      language: lang,
      chapterId: id,
      completed: percent >= 100,
      progressPercent: percent,
      chapterScore: cs.score,
      codeSolved: cs.solved,
      codeTotal: cs.exercises,
      solvedIds,
      summaryVisited: true,
      lastTab: "summary",
      lastPracticeMode: practiceMode,
      overviewRead: true,
      reflections,
      answers,
      quizSubmitted,
    };

    saveLocalChapterState(uidCurrent, lang, id, payload);

    if (uidCurrent) {
      try {
        await saveProgress(uidCurrent, id, payload);
      } catch (e) {
        console.error("Lỗi đánh dấu hoàn thành:", e);
      }
    }
    setIsSaving(false);
  }

  // Handler khi chọn "Tiếp tục học" từ Resume Modal
  function handleResumeContinue() {
    if (!savedData) {
      setShowResumeModal(false);
      return;
    }
    const targetTab = savedData.lastTab || "overview";
    const targetMode = savedData.lastPracticeMode || "quiz";
    const targetAnswers = savedData.answers || {};
    const targetReflections = savedData.reflections || {};
    const targetOverview = Boolean(savedData.overviewRead || targetTab !== "overview");
    const targetQuizSubmitted = Boolean(savedData.quizSubmitted);
    const targetCompleted = Boolean(savedData.completed);

    setSummaryVisited(Boolean(savedData.summaryVisited || targetCompleted));
    setTab(targetTab);
    setPracticeMode(targetMode);
    setAnswers(targetAnswers);
    setReflections(targetReflections);
    setOverviewRead(targetOverview);
    setQuizSubmitted(targetQuizSubmitted);
    setSubmitted(targetQuizSubmitted);
    setIsCompleted(targetCompleted);

    const completedRefl = {};
    Object.keys(targetReflections).forEach((k) => {
      if (targetReflections[k]?.trim()) completedRefl[k] = "answered";
    });
    setCompletedReflections(completedRefl);

    setShowResumeModal(false);
  }

  // Handler khi chọn "Học lại từ đầu" từ Resume Modal
  function handleResumeRestart() {
    clearLocalChapterState(uid, lang, id);
    setTab("overview");
    setPracticeMode("quiz");
    setAnswers({});
    setReflections({});
    setCompletedReflections({});
    setSubmitted(false);
    setQuizSubmitted(false);
    setOverviewRead(false);
    setIsCompleted(false);
    setSummaryVisited(false);
    setCompleteMsg("");
    setShowResumeModal(false);
    persistState({
      reset: true,
      summaryVisited: false,
      tab: "overview",
      practiceMode: "quiz",
      answers: {},
      reflections: {},
      overviewRead: false,
      quizSubmitted: false,
      isCompleted: false,
    });
  }

  return (
    <div>
      <header className="lesson-heading" ref={headingRef} tabIndex={-1}>
        <div className="lesson-heading-top">
          <p>
            CHƯƠNG {chapter.order} · {TABS.find(([key]) => key === tab)?.[1]}
          </p>
          <div className="lesson-progress-badge">
            <span>
              Tiến độ: <strong>{currentPercent}%</strong>
            </span>
            <div className="lesson-progress-bar">
              <span style={{ width: `${currentPercent}%` }} />
            </div>
          </div>
        </div>
        <h2>{chapter.title}</h2>
      </header>

      <nav className="tabs lesson-tabs" aria-label="Các mục bài học">
        {TABS.map(([key, label]) => (
          <button
            type="button"
            key={key}
            disabled={!completion.unlocked[key] && !done}
            className={tab === key ? "on" : ""}
            aria-current={tab === key ? "page" : undefined}
            onClick={() => changeTab(key)}
          >
            {!completion.unlocked[key] && !done && (
              <span aria-hidden="true">🔒 </span>
            )}
            {label}
          </button>
        ))}
      </nav>

      {tab === "overview" && (
        <LessonOverview chapter={chapter} onRead={handleOverviewRead} />
      )}

      {tab === "theory" && (
        <LessonTheory
          chapter={chapter}
          language={lang}
          reflections={reflections}
          onExplanationChange={(theoryId, value) => {
            const nextReflections = { ...reflections, [theoryId]: value };
            setReflections(nextReflections);
            if (value.trim()) {
              setCompletedReflections((prev) => ({
                ...prev,
                [theoryId]: "answered",
              }));
            }
            persistState({ reflections: nextReflections });
          }}
        />
      )}

      {tab === "practice" && (
        <LessonPractice
          chapter={chapter}
          language={lang}
          practiceMode={practiceMode}
          setPracticeMode={(mode) => {
            setPracticeMode(mode);
            persistState({ practiceMode: mode });
          }}
          answers={answers}
          submitted={submitted}
          saveStatus={saveStatus}
          answeredCount={answeredCount}
          score={score}
          canSubmit={canSubmit}
          onSelect={handleSelect}
          onSubmit={handleSubmitQuiz}
          onReset={resetQuiz}
        />
      )}

      {tab === "summary" && (
        <LessonSummary
          chapter={chapter}
          isCompleted={done}
          onCompleteChapter={handleCompleteChapter}
          isSaving={isSaving}
          onRestartChapter={handleResumeRestart}
          onNextChapter={() => {
            if (nextChapter?.id) nav(`/lesson/${nextChapter.id}`);
          }}
          hasNextChapter={Boolean(nextChapter?.id)}
        />
      )}

      <footer className="lesson-completion">
        {tab === "overview" && (
          <p>
            {overviewRead
              ? "✓ Đã đọc phần tổng quan."
              : "Đọc đến cuối tổng quan để mở Lý thuyết."}
          </p>
        )}
        {tab === "theory" && (
          <p>
            Đã tự trả lời {completion.answered}/{completion.checks} câu Self-Check.
            Trả lời đủ để mở Thực hành; không cần điểm AI.
          </p>
        )}
        {tab === "practice" && (
          <p>
            {quizSubmitted ? "✓ Đã nộp Quiz" : "Cần nộp Quiz"} · Bài luyện tập
            Accepted: {completion.solved}/{completion.exercises}. Bài HSG là tùy
            chọn.
          </p>
        )}
        {tab === "summary" && (
          <p>
            {done
              ? "✓ Đã hoàn thành chương học (100%)."
              : completeMsg || `Tiến độ chương: ${currentPercent}%. Hoàn thành đủ Self-Check, Quiz và bài code để đạt 100%.`}
          </p>
        )}
        {next && (
          <button
            type="button"
            disabled={!completion.unlocked[next[0]] && !done}
            onClick={() => changeTab(next[0])}
          >
            Tiếp tục: {next[1]} →
          </button>
        )}
      </footer>

      {/* Modal hỏi tiếp tục học hay học lại từ đầu */}
      <ResumeLessonModal
        isOpen={showResumeModal}
        chapter={chapter}
        progressPercent={savedData?.progressPercent || 0}
        isCompleted={Boolean(savedData?.completed)}
        savedTab={savedData?.lastTab || "overview"}
        savedPracticeMode={savedData?.lastPracticeMode || "quiz"}
        savedAnsweredCount={Object.keys(savedData?.answers || {}).length}
        totalQuizQuestions={questions.length || 10}
        onContinue={handleResumeContinue}
        onRestart={handleResumeRestart}
        onClose={handleResumeContinue}
      />
    </div>
  );
}

export default function Lesson({ lang }) {
  return (
    <div className="content lesson-page">
      <LessonBody lang={lang} />
    </div>
  );
}

