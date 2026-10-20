import { askGlobalChat } from "./globalChatService";
import { difficultyLabels } from "./problemService";

/**
 * Phân tích tiến trình học tập thực tế của học viên và sinh ra gợi ý sư phạm thông minh.
 */
export function generateSmartRecommendation({
  lang = "cpp",
  chaptersProgress = [],
  overallTheoryProgress = 0,
  resumeChapter = null,
  solvedSlugs = new Set(),
  problems = [],
  dueGoals = [],
  contests = [],
  now = Date.now(),
}) {
  const label = lang === "python" ? "Python" : "C++";

  // 1. Nếu có mục tiêu ôn luyện HSG đến hạn hôm nay hoặc quá hạn -> Ưu tiên nhắc nhở
  if (dueGoals && dueGoals.length > 0) {
    const goal = dueGoals[0];
    return {
      type: "goal",
      badge: "Kế hoạch HSG",
      title: `Ưu tiên mục tiêu: ${goal.title}`,
      description: `Mục tiêu này đang đến hạn cần hoàn thành. Hãy tập trung xử lý để giữ vững tiến độ ôn thi HSG theo kế hoạch của bạn.`,
      progressText: "Đang đến hạn",
      progressPercent: 50,
      actionText: "Mở kế hoạch ôn luyện",
      actionPath: "GOAL_MODAL",
      tag: "Trọng tâm",
    };
  }

  // 2. Nếu có Contest HSG đang diễn ra hoặc sắp diễn ra trong vòng 24h
  const runningContest = (contests || []).find((c) => {
    if (c.status !== "published") return false;
    const start = c.startAt || 0;
    const end = start + (c.durationMinutes || 120) * 60 * 1000;
    return now >= start && now <= end;
  });

  if (runningContest && overallTheoryProgress >= 15) {
    return {
      type: "contest",
      badge: "Đấu trường Contest",
      title: `Tham gia: ${runningContest.title}`,
      description: `Kỳ thi Contest đang mở chấm điểm trực tiếp. Đây là cơ hội tuyệt vời để bạn cọ xát với đề thi thực tế và kiểm tra áp lực thời gian.`,
      progressText: `${runningContest.durationMinutes || 120} phút thi đấu`,
      progressPercent: 100,
      actionText: "Vào phòng thi ngay",
      actionPath: `/contest/${runningContest.id}`,
      tag: "Trực tiếp",
    };
  }

  // 3. Nếu người học mới bắt đầu (chưa hoàn thành chương nào và tiến độ < 10%)
  if (overallTheoryProgress < 10 && (!resumeChapter || resumeChapter.n === 1 && resumeChapter.progress < 20)) {
    const first = chaptersProgress[0] || resumeChapter;
    const rawTitle = first?.title || `Khởi đầu với ${label}`;
    const cleanTitle = rawTitle.toLowerCase().startsWith("làm quen")
      ? rawTitle
      : `Làm quen với ${rawTitle}`;
    const prog = first?.progress && first.progress > 0 ? first.progress : 0;

    return {
      type: "lesson",
      badge: "Khởi động lộ trình",
      title: cleanTitle,
      description: `Bạn đang ở bước đầu của lộ trình ${label}. Hãy bắt đầu từ cú pháp, nhập xuất và cách tư duy logic để xây nền tảng vững chắc.`,
      progressText: `Chương 01 · ${prog}%`,
      progressPercent: prog,
      actionText: "Bắt đầu bài học 01",
      actionPath: first?.id ? `/lesson/${first.id}` : "/curriculum",
      tag: "Nền tảng",
    };
  }

  // 4. Nếu đang học dở một chương lý thuyết (progress > 0 và < 100)
  if (resumeChapter && resumeChapter.progress > 0 && resumeChapter.progress < 100) {
    return {
      type: "lesson",
      badge: "Tiếp tục bài học",
      title: `Chương ${resumeChapter.n}: ${resumeChapter.title}`,
      description: `Bạn đang học dở chương này (${resumeChapter.progress}%). Hãy hoàn thành các câu hỏi Self-Check, trắc nghiệm và bài thực hành để mở khóa 100%.`,
      progressText: `Đã hoàn thành ${resumeChapter.progress}%`,
      progressPercent: resumeChapter.progress,
      actionText: `Học tiếp Chương ${resumeChapter.n}`,
      actionPath: resumeChapter.id ? `/lesson/${resumeChapter.id}` : "/curriculum",
      tag: "Đang học",
    };
  }

  // 5. Nếu vừa hoàn thành một chương hoặc cần luyện tập bài tập code tương ứng
  const unsolvedProblem = (problems || []).find((p) => !solvedSlugs.has(p.slug));
  if (unsolvedProblem) {
    const diff = difficultyLabels[unsolvedProblem.difficulty] || "Cơ bản";
    const solvedCount = solvedSlugs.size;
    const totalCount = problems.length || 1;
    const pct = Math.min(100, Math.round((solvedCount / totalCount) * 100));
    return {
      type: "problem",
      badge: "Luyện phản xạ Code",
      title: `Bài tập: ${unsolvedProblem.title}`,
      description: `Vận dụng lý thuyết đã học vào bài tập [${diff}] để rèn kỹ năng viết code chuẩn và tư duy giải thuật.`,
      progressText: `${solvedCount}/${totalCount} bài đã giải`,
      progressPercent: pct,
      actionText: `Giải bài "${unsolvedProblem.title}"`,
      actionPath: `/practice/problem/${unsolvedProblem.slug}`,
      tag: diff,
    };
  }

  // 6. Nếu đã hoàn thành nhiều phần -> Đề xuất sang chương tiếp theo
  if (resumeChapter && resumeChapter.progress === 0) {
    return {
      type: "lesson",
      badge: "Bài học tiếp theo",
      title: `Chương ${resumeChapter.n}: ${resumeChapter.title}`,
      description: `Bạn đã hoàn thành tốt các phần trước. Hãy tiếp tục khám phá kiến thức mới ở Chương ${resumeChapter.n}.`,
      progressText: `Chương ${resumeChapter.n}/${chaptersProgress.length}`,
      progressPercent: Math.round(((resumeChapter.n - 1) / (chaptersProgress.length || 1)) * 100),
      actionText: `Bắt đầu Chương ${resumeChapter.n}`,
      actionPath: resumeChapter.id ? `/lesson/${resumeChapter.id}` : "/curriculum",
      tag: "Chương mới",
    };
  }

  // 7. Mặc định: Ôn tập tổng hợp
  return {
    type: "review",
    badge: "Gợi ý thông minh",
    title: "Ôn tập và củng cố kiến thức",
    description: `Duy trì thói quen học tập đều đặn mỗi ngày sẽ giúp bạn ghi nhớ sâu cú pháp và giải bài thi nhanh hơn.`,
    progressText: `${overallTheoryProgress}% toàn khóa`,
    progressPercent: overallTheoryProgress,
    actionText: "Vào chương trình học",
    actionPath: "/curriculum",
    tag: "Chung",
  };
}

/**
 * Gọi Peanut AI để phân tích sâu hơn và đưa ra lời khuyên cá nhân hóa trực tiếp.
 */
export async function fetchLiveAiAdvice({
  lang = "cpp",
  overallTheoryProgress = 0,
  currentTopic = "",
  solvedCount = 0,
  streak = 0,
  signal,
}) {
  const label = lang === "python" ? "Python" : "C++";
  const prompt = `Tôi là học sinh đang học ${label} trên PeanutCode. 
Hiện tại:
- Tiến trình lý thuyết: ${overallTheoryProgress}%
- Chủ đề đang học: ${currentTopic || "Nền tảng"}
- Số bài tập đã giải: ${solvedCount} bài
- Chuỗi học liên tục: ${streak} ngày.

Hãy đưa ra lời khuyên học tập ngắn gọn (tối đa 3 câu), mang tính định hướng phương pháp và truyền cảm hứng cho tôi hôm nay.`;

  try {
    const res = await askGlobalChat({
      message: prompt,
      language: lang,
      pageContext: { pathname: "/" },
      signal,
    });
    return res.message;
  } catch (err) {
    console.warn("Không gọi được AI Live Advice, dùng phân tích nội bộ:", err);
    return null;
  }
}
