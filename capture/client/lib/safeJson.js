// Safe JSON parsing for fetch responses. Returns { ok, error?, message? } envelope.
async function safeJson(response) {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const text = await response.text();
    return { ok: false, error: `HTTP_${response.status}`, message: text.slice(0, 200) };
  }
  try {
    return await response.json();
  } catch (e) {
    return { ok: false, error: "INVALID_JSON", message: String(e?.message ?? e) };
  }
}

module.exports = { safeJson };
