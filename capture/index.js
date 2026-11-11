import crypto from "node:crypto";

// ---------------------------------------------------------------------------
// Capture Host entry point.
//
// Runs inside the DSH host process. Registers:
//   * a storage domain "capture" (projects / chapters / shots / assets ...)
//   * capture.* model-facing tools via ctx.tools.register
//   * same-origin JSON routes /api/capture/* via ctx.webServer
//   * a system-prompt section so agents know Capture exists.
//
// Every registration is owned by ctx.effect so unloading cleans it up.
// ---------------------------------------------------------------------------

// ---- Minimal inlined domain spec builders ---------------------------------
// @deepseek-ai/dsh-storage-domain is an internal DSH bundle, not a pnpm
// dependency a plugin may import. defineDomain() / domainTable() are tiny,
// so we inline them here and pass plain spec objects to ctx.storageDomain.

const UNIT_NAME_RE = /^[a-z][a-z0-9_]*$/;

function domainTable(valueSchema) {
  return { valueSchema };
}

function defineDomain(spec) {
  if (!UNIT_NAME_RE.test(spec.name))
    throw new Error(`domain name '${spec.name}' must match ${UNIT_NAME_RE}`);
  if (!Number.isInteger(spec.version) || spec.version < 0)
    throw new Error(`domain '${spec.name}' version must be a non-negative integer`);
  for (const table of Object.keys(spec.tables))
    if (!UNIT_NAME_RE.test(table))
      throw new Error(`domain '${spec.name}' table '${table}' must match ${UNIT_NAME_RE}`);
  return spec;
}

// Phase 1 stores records without zod validation (zod is not resolvable from
// a plugin package). A passthrough schema lets storageDomain.loadAll()/put()
// work while we add real schema validation in a later phase.
const passthroughSchema = { parse: (v) => v };

const CaptureSpec = defineDomain({
  name: "capture",
  version: 1,
  tables: {
    projects: domainTable(passthroughSchema),
    chapters: domainTable(passthroughSchema),
    shots: domainTable(passthroughSchema),
    assets: domainTable(passthroughSchema),
    generations: domainTable(passthroughSchema),
    trailers: domainTable(passthroughSchema),
  },
});

// ---- JSON helpers ---------------------------------------------------------
function json(response, status, payload) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
}

async function readJsonBody(request) {
  let body = "";
  for await (const chunk of request) body += chunk;
  if (!body.trim()) return {};
  try {
    return JSON.parse(body);
  } catch {
    return { __parseError: true };
  }
}

// ---- Same-origin trust gate -----------------------------------------------
function trustReport(request) {
  const host = request.headers.host;
  const origin = request.headers.origin;
  const secFetchSite = request.headers["sec-fetch-site"];

  // 显式跨站 → 拒绝
  if (secFetchSite === "cross-site") return false;
  // 字面 null 来源 → 拒绝
  if (origin === "null") return false;
  // 有 Origin 则比对 host（浏览器同源请求）
  if (typeof origin === "string" && origin) {
    try {
      return new URL(origin).host === host;
    } catch {
      return false;
    }
  }
  // Origin 缺席（桌面壳转发 / 非浏览器客户端）→ 放行
  return true;
}

// ---- Route registration ---------------------------------------------------
function route(ctx, { path, method, handle }) {
  return ctx.webServer.register({
    kind: "exact",
    path,
    handler: async (request, response) => {
      if (request.method !== method) {
        json(response, 405, { ok: false, error: "method-not-allowed", path });
        return;
      }
      if (!trustReport(request)) {
        json(response, 403, { ok: false, error: "forbidden" });
        return;
      }
      const body = method === "POST" ? await readJsonBody(request) : {};
      if (body && body.__parseError) {
        json(response, 400, { ok: false, error: "invalid-json-body" });
        return;
      }
      try {
        json(response, 200, await handle(body));
      } catch (error) {
        ctx.logger?.warn?.("[capture] route failed", error);
        json(response, 500, {
          ok: false,
          error: "CaptureInternalError",
          message: String(error?.message ?? error),
        });
      }
    },
  });
}

// ---- apply ----------------------------------------------------------------
export const inject = ["storage", "storageDomain", "webServer", "tools", "systemPrompt"];

export async function apply(ctx, config) {
  // Reuse an already-open domain when the plugin is reloaded/HMR'd.
  // Opening the same domain name twice throws `already-open` and would crash
  // the whole host, so prefer the handle already held by this plugin fiber.
  let domain = ctx.storageDomain?.get?.("capture");
  if (!domain) {
    domain = await ctx.storageDomain.open(CaptureSpec);
  }
  const domainPromise = Promise.resolve(domain);

  if (typeof ctx.systemPrompt?.section === "function") {
    ctx.systemPrompt.section({
      name: "capture",
      order: 100,
      text: "Capture is a story/shoot/trailer creation workspace. Use capture_project_create/list, then chapters, shots, assets and exports. Never modify a project without the user's instruction.",
    });
  }

  const registerTool = (definition) => {
    const disposable = ctx.tools?.register?.(definition);
    if (typeof disposable === "function") {
      ctx.effect(() => disposable, `capture:tool:${definition.name}`);
    }
  };

  // capture_project_create
  registerTool({
    name: "capture_project_create",
    description: "Create a new Capture project.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Project name" },
        genre: { type: "string" },
        logline: { type: "string" },
      },
      required: ["name"],
      additionalProperties: false,
    },
    output: {
      schema: { type: "object" },
      render: (_args, value) => [{ type: "text", text: JSON.stringify(value) }],
    },
    async execute(args, exec) {
      const name =
        typeof args?.name === "string" ? args.name.trim() : "";
      if (!name) {
        return {
          ok: false,
          error: "INVALID_PROJECT_NAME",
          message: "project name is required",
        };
      }
      const domain = await domainPromise;
      const id = crypto.randomUUID();
      const now = Date.now();
      await domain.table("projects").put(id, {
        name,
        genre: args?.genre?.trim?.() || "",
        logline: args?.logline?.trim?.() || "",
        createdAt: now,
        updatedAt: now,
      });
      return { ok: true, project: { id, name, createdAt: now } };
    },
  });

  // capture_project_list
  registerTool({
    name: "capture_project_list",
    description: "List all Capture projects.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
    output: {
      schema: { type: "object" },
      render: (_args, value) => [{ type: "text", text: JSON.stringify(value) }],
    },
    async execute() {
      const domain = await domainPromise;
      const projects = [...domain.table("projects").entries()].map(
        ([id, value]) => ({
          id,
          name: value?.name,
          genre: value?.genre,
          createdAt: value?.createdAt,
        }),
      );
      return { ok: true, projects };
    },
  });

  const disposeStateRoute = route(ctx, {
    path: "/api/capture/state",
    method: "GET",
    handle: async () => {
      const domain = await domainPromise;
      const projects = [...domain.table("projects").entries()].map(
        ([id, value]) => ({
          id,
          name: value?.name,
          genre: value?.genre,
          createdAt: value?.createdAt,
        }),
      );
      return { ok: true, projects };
    },
  });

  const disposeCreateRoute = route(ctx, {
    path: "/api/capture/projects",
    method: "POST",
    handle: async (body) => {
      const name =
        typeof body?.name === "string" ? body.name.trim() : "";
      if (!name) {
        return { ok: false, error: "INVALID_PROJECT_NAME", message: "project name is required" };
      }
      const domain = await domainPromise;
      const id = crypto.randomUUID();
      const now = Date.now();
      await domain.table("projects").put(id, {
        name,
        genre: body?.genre?.trim?.() || "",
        logline: body?.logline?.trim?.() || "",
        createdAt: now,
        updatedAt: now,
      });
      return { ok: true, project: { id, name, createdAt: now } };
    },
  });

  ctx.effect(async () => async () => {
    if (typeof disposeStateRoute === "function") disposeStateRoute();
    if (typeof disposeCreateRoute === "function") disposeCreateRoute();
    const domain = await domainPromise.catch(() => undefined);
    if (domain) await domain.close?.().catch(() => {});
  }, "capture:domain-and-routes");

  ctx.logger?.info?.("[capture] plugin activated");
}
