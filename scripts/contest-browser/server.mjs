import { createServer } from "vite";
import { fileURLToPath } from "node:url";
const projectRoot = fileURLToPath(new URL("../..", import.meta.url));
import { memoryRepository } from "../../server/testRepository.js";
import { createAuthoring } from "../../server/authoring.js";
import { createContestJudge } from "../../server/contest.js";
import { gradeSubmission } from "../../server/judge.js";
import { problemTemplate } from "../../src/utils/problemAuthoring.js";
import { sortScoreboard } from "../../src/utils/contest.js";
export async function startPreview() {
  const seed = {
    "users/t": { role: "teacher" },
    "users/s": { role: "student", displayName: "Student demo" },
  };
  for (const id of ["p1", "p2", "p3"]) {
    const { hiddenTests, ...p } = structuredClone(problemTemplate);
    seed[`problems/${id}`] = {
      ...p,
      id,
      slug: id,
      title: `Bài ${id}`,
      published: true,
      createdBy: "t",
    };
    seed[`problemSecrets/${id}`] = { hiddenTests };
  }
  seed["contests/running"] = {
    id: "running",
    title: "Demo HSG running",
    description: "Mock browser fixture",
    status: "published",
    startAt: Date.now() - 10000,
    durationMinutes: 120,
    createdBy: "t",
    problems: ["p1", "p2", "p3"].map((problemId, i) => ({
      problemId,
      label: String.fromCharCode(65 + i),
      points: 100 + i * 50,
    })),
    updatedAt: 1,
  };
  const repository = memoryRepository(seed),
    author = createAuthoring({ repository });
  const execute = async (c) => ({
    statusId: 3,
    status: "Accepted",
    stdout: c.source.includes("AC")
      ? c.input === "2 3"
        ? "5"
        : c.input === "0 0"
          ? "0"
          : "2000000000"
      : "wrong",
    time: "0.01",
    memory: 120,
  });
  const judge = createContestJudge({
    repository,
    execute,
    grade: (options) => gradeSubmission({ ...options, execute }),
  });
  const server = await createServer({
    root: projectRoot,
    server: { port: 4178, host: "127.0.0.1", fs: { allow: [projectRoot] } },
    plugins: [
      {
        name: "isolated-contest-preview",
        enforce: "pre",
        resolveId(id) {
          if (
            id.endsWith("/services/contestService") ||
            id.endsWith("/services/contestService.js")
          )
            return fileURLToPath(
              new URL("./fixtureService.js", import.meta.url),
            );
        },
        transformIndexHtml(html) {
          return html.replace(
            "/src/main.jsx",
            "/scripts/contest-browser/preview.jsx",
          );
        },
        configureServer(s) {
          s.middlewares.use("/api/mock", async (req, res) => {
            try {
              let text = "";
              for await (const c of req) text += c;
              const b = JSON.parse(text);
              const caller = {
                uid: req.headers["x-test-user"] === "teacher" ? "t" : "s",
              };
              let result;
              switch (b.action) {
                case "contest":
                  result = await repository.get(`contests/${b.id}`);
                  break;
                case "problem":
                  result = await repository.get(`problems/${b.id}`);
                  break;
                case "contests":
                  result = await repository.list("contests", [
                    ["status", "==", "published"],
                  ]);
                  break;
                case "scoreboard":
                  result = sortScoreboard(
                    await repository.list(`contests/${b.id}/scoreboard`),
                  );
                  break;
                case "submissions":
                  result = (
                    await repository.list(
                      `contests/${b.id}/submissions`,
                      caller.uid === "t" ? [] : [["uid", "==", caller.uid]],
                    )
                  ).sort((a, b) => b.submittedAt - a.submittedAt);
                  break;
                case "judge":
                  result = await judge(b.body, caller);
                  break;
                default:
                  result = await author(b, caller);
              }
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify(result));
            } catch (e) {
              res.statusCode = e.status || 500;
              res.end(JSON.stringify({ error: e.message }));
            }
          });
        },
      },
    ],
  });
  await server.listen();
  return server;
}
