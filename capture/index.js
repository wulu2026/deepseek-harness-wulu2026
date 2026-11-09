import crypto from "node:crypto";
import { z } from "zod";
import { defineDomain, domainTable } from "@deepseek-ai/dsh-storage-domain";
import { defineTool } from "@deepseek-ai/dsh-tools";

// Persistent entity shape (DSH storage-domain will reject malformed records).
const PROJECT_SCHEMA = z.object({
  name: z.string().min(1),
  genre: z.string().optional(),
  logline: z.string().optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

const CaptureSpec = defineDomain({
  name: "capture",
  version: 1,
  tables: {
    projects: domainTable(PROJECT_SCHEMA),
    chapters: domainTable(z.any()),
    shots: domainTable(z.any()),
    assets: domainTable(z.any()),
    generations: domainTable(z.any()),
    trailers: domainTable(z.any()),
  },
});

const PROJECT_NAME_REQUIRED = "PROJECT_NAME_REQUIRED";

// Declares runtime services; DSH activates plugin only when these services are present.
export const inject = ["storage", "storageDomain", "webServer", "tools"];

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

/** Allow only same-origin/loopback browser traffic for /api/capture routes. */
function trustReport(request) {
  const host = request.headers.host;
  const origin = request.headers.origin;
  if (typeof origin === "string" && origin) {
    try {
      return new URL(origin).host === host;
    } catch {
      return false;
    }
  }
  return request.headers["sec-fetch-site"] === "same-origin";
}

/** Close storage domain without rejecting when open failed. */
async function closeDomain(domainPromise) {
  const domain = await domainPromise.catch(() => undefined);
  if (!domain) return;
  await domain.close?.().catch(() => {});
}

/**
 * Capture Host entry point.
 * Opens storage domain, registers Capture tools (agent-facing) and same-origin routes.
 * Everything uses ctx.effect to keep registrations owned & clean on unload.
 */
export function apply(ctx, config) {
  const domainPromise = ctx.storageDomain.open(CaptureSpec);

  if (typeof ctx.systemPrompt?.section === "function") {
    ctx.systemPrompt.section(
      "capture",
      "Capture is a story/shoot/trailer creation workspace. Use capture.project.create/list, then chapters, shots, assets and exports. Never modify a project without a proposal or the user's instruction.",
    );
  }

  const registerTool = (definition) => {
    const disposable = ctx.tools?.register?.(definition);
    if (typeof disposable === "function") {
      ctx.effect(() => disposable, `capture:tool:${definition.name}`);
    }
  };

  registerTool(
    defineTool({
      name: "capture.project.create",
      description: "Create a new Capture project.",
      parameters: {
        name: { type: "string", required: true, description: "Project name" },
        genre: { type: "string" },
        logline: { type: "string" },
      },
      output: { schema: { type: "object" } },
      async execute(args, exec) {
        const name = typeof args?.name === "string" ? args.name.trim() : "";
        if (!name) {
          return { ok: false, error: "INVALID_PROJECT_NAME", message: "project name is required" };
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
    }),
  );

  registerTool(
    defineTool({
      name: "capture.project.list",
      description: "List all Capture projects.",
      parameters: {},
      output: { schema: { type: "object" } },
      async execute() {
        const domain = await domainPromise;
        const projects = [...domain.table("projects").entries()].map(([id, value]) => ({
          id,
          name: value?.name,
          genre: value?.genre,
          createdAt: value?.createdAt,
        }));
        return { ok: true, projects };
      },
    }),
  );

  const route = ({ path, method, handle }) => {
    return ctx.webServer?.register?.({
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
          json(response, 500, { ok: false, error: "CaptureInternalError", message: String(error?.message ?? error) });
        }
      },
    });
  };

  const disposeStateRoute = route({
    path: "/api/capture/state",
    method: "GET",
    handle: async () => {
      const domain = await domainPromise;
      const projects = [...domain.table("projects").entries()].map(([id, value]) => ({
        id,
        name: value?.name,
        genre: value?.genre,
        createdAt: value?.createdAt,
      }));
      return { ok: true, projects };
    },
  });

  const disposeCreateRoute = route({
    path: "/api/capture/projects",
    method: "POST",
    handle: async (body) => {
      const name = typeof body?.name === "string" ? body.name.trim() : "";
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

  ctx.effect(() => () => {
    if (typeof disposeStateRoute === "function") disposeStateRoute();
    if (typeof disposeCreateRoute === "function") disposeCreateRoute();
    void closeDomain(domainPromise);
  }, "capture:domain-and-routes");

  ctx.logger?.info?.("[capture] plugin activated");
}
