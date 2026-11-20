// Capture 客户端 API 层：封装同源 fetch /api/capture/*，统一 credentials / safeJson / 错误包装。
// 组件只调用这里的函数，不直接写 fetch，便于后续切换为 Typert 或其他 RPC 时只改这一层。
import { safeJson } from "./safeJson.js";

const BASE = "/api/capture";

// GET /api/capture/state
export async function fetchState() {
  const res = await fetch(`${BASE}/state`, { credentials: "same-origin" });
  return safeJson(res);
}

// POST /api/capture/projects
// body: { name: string, genre?: string, logline? string }
// 返回 { ok, project? } 或 { ok: false, error?, message? }
export async function createProject(body) {
  const res = await fetch(`${BASE}/projects`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  return safeJson(res);
}
