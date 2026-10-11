// Gắn Firebase ID token vào request tới backend (/api/judge, /api/ai/tutor).
// Import động để file này không làm hỏng test chạy bằng Node (firebase.js cần import.meta.env của Vite).
export async function authHeaders() {
  try {
    const { auth } = await import("./firebase.js");
    const token = await auth.currentUser?.getIdToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}
