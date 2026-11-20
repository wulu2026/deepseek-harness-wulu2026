// Capture 客户端 API 层：封装同源 fetch /api/capture/*，统一 credentials / safeJson / 错误包装。
const { safeJson } = require("./safeJson.js");

const BASE = "/api/capture";

// GET /api/capture/state
async function fetchState() {
  const res = await fetch(`${BASE}/state`, { credentials: "same-origin" });
  return safeJson(res);
}

// POST /api/capture/projects
async function createProject(body) {
  const res = await fetch(`${BASE}/projects`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  return safeJson(res);
}

module.exports = { fetchState, createProject };
