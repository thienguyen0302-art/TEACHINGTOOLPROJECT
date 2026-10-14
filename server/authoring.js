import {
  publicProblem,
  validateProblem,
} from "../src/utils/problemAuthoring.js";
import {
  problemLabel,
  toMillis,
  validateContest,
} from "../src/utils/contest.js";
import { fail } from "./contest.js";
const idOk = (id) =>
  typeof id === "string" && /^[a-zA-Z0-9_-]{1,128}$/.test(id);
export function createAuthoring({ repository, now = Date.now }) {
  return async (body, caller) => {
    if (!caller?.uid) fail(401, "Cần đăng nhập.");
    const profile = await repository.get(`users/${caller.uid}`);
    if (profile?.role !== "teacher") fail(403, "Chỉ giáo viên được thao tác.");
    const { action, id, data } = body ?? {};
    if (action === "listProblems")
      return {
        items: await repository.list("problems", [
          ["createdBy", "==", caller.uid],
        ]),
      };
    if (action === "listContests")
      return {
        items: await repository.list("contests", [
          ["createdBy", "==", caller.uid],
        ]),
      };
    if (action === "getProblem") {
      if (!idOk(id)) fail(400, "Mã bài không hợp lệ.");
      const [p, s] = await Promise.all([
        repository.get(`problems/${id}`),
        repository.get(`problemSecrets/${id}`),
      ]);
      if (!p || p.createdBy !== caller.uid)
        fail(404, "Không tìm thấy bài của bạn.");
      return { item: { ...p, hiddenTests: s?.hiddenTests ?? [] } };
    }
    if (action === "saveProblem") {
      const errors = validateProblem(data);
      if (errors.length) fail(400, errors.join("\n"));
      const problemId = id || repository.id("problems");
      if (!idOk(problemId)) fail(400, "Mã bài không hợp lệ.");
      await repository.transaction(async (tx) => {
        const [old, slug] = await Promise.all([
          tx.get(`problems/${problemId}`),
          tx.get(`problemSlugs/${data.slug}`),
        ]);
        if (id && (!old || old.createdBy !== caller.uid))
          fail(403, "Không được sửa bài này.");
        if (old?.lockedUntil > now())
          fail(
            409,
            "Bài đã được dùng trong contest đã publish; chờ contest kết thúc hoặc tạo bài mới.",
          );
        if (slug && slug.problemId !== problemId) fail(409, "Slug đã tồn tại.");
        const timestamp = now();
        tx.set(`problems/${problemId}`, {
          ...publicProblem(data),
          id: problemId,
          createdBy: caller.uid,
          createdAt: old?.createdAt ?? timestamp,
          updatedAt: timestamp,
          lockedUntil: old?.lockedUntil ?? 0,
        });
        tx.set(`problemSecrets/${problemId}`, {
          hiddenTests: data.hiddenTests.map((t) => ({
            input: t.input,
            output: t.output,
          })),
          updatedAt: timestamp,
          lockedUntil: old?.lockedUntil ?? 0,
        });
        tx.set(`problemSlugs/${data.slug}`, { problemId });
        if (old?.slug && old.slug !== data.slug)
          tx.delete(`problemSlugs/${old.slug}`);
      });
      return { id: problemId };
    }
    if (action === "saveContest") {
      if (
        !data ||
        !Array.isArray(data.problems) ||
        data.problems.length > 26 ||
        data.problems.some((p) => !idOk(p?.problemId))
      )
        fail(400, "Danh sách bài không hợp lệ.");
      const contestId = id || repository.id("contests");
      if (!idOk(contestId)) fail(400, "Mã contest không hợp lệ.");
      await repository.transaction(async (tx) => {
        const old = await tx.get(`contests/${contestId}`);
        if (id && (!old || old.createdBy !== caller.uid))
          fail(403, "Không được sửa contest này.");
        if (old?.status === "published" && now() >= toMillis(old.startAt))
          fail(409, "Contest đã bắt đầu: không được thay đổi cấu hình.");
        const catalog = await Promise.all(
          data.problems.map(async (p) => {
            const [problem, secrets] = await Promise.all([
              tx.get(`problems/${p.problemId}`),
              tx.get(`problemSecrets/${p.problemId}`),
            ]);
            if (!problem || problem.createdBy !== caller.uid)
              fail(400, "Chỉ chọn bài do bạn tạo.");
            return {
              ...problem,
              secrets,
              hasHiddenTests: !!secrets?.hiddenTests?.length,
            };
          }),
        );
        const errors = validateContest(data, catalog);
        if (data.status === "published" && toMillis(data.startAt) <= now())
          errors.push("Chọn thời gian bắt đầu trong tương lai để publish.");
        if (errors.length) fail(400, errors.join("\n"));
        const timestamp = now();
        const clean = {
          id: contestId,
          title: data.title,
          description: String(data.description ?? "").slice(0, 10000),
          status: data.status,
          startAt: toMillis(data.startAt),
          durationMinutes: data.durationMinutes,
          scoringMode: "partial",
          problems: data.problems.map((p, i) => ({
            problemId: p.problemId,
            points: p.points,
            label: problemLabel(i),
          })),
          createdBy: caller.uid,
          createdAt: old?.createdAt ?? timestamp,
          updatedAt: timestamp,
        };
        if (data.status === "published")
          for (const p of catalog) {
            const lockedUntil = Math.max(
              p.lockedUntil ?? 0,
              clean.startAt + clean.durationMinutes * 60000,
            );
            const { secrets, hasHiddenTests: _, ...problem } = p;
            void _;
            tx.set(`problems/${p.id}`, { ...problem, lockedUntil });
            tx.set(`problemSecrets/${p.id}`, { ...secrets, lockedUntil });
          }
        tx.set(`contests/${contestId}`, clean);
      });
      return { id: contestId };
    }
    fail(400, "Thao tác không hợp lệ.");
  };
}
