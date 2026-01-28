import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
  // Public routes
  index("routes/home.tsx"),
  route("register", "routes/register.tsx"),
  route("login", "routes/login.tsx"),
  route("logout", "routes/logout.tsx"),

  // Authenticated layout
  layout("layouts/authenticated.tsx", [
    route("dashboard", "routes/dashboard.tsx"),
    route("settings", "routes/settings.tsx"),
    route("agents", "routes/agents.tsx"),
    route("pipelines", "routes/pipelines.tsx"),
    route("pipelines/:id", "routes/pipelines.$id.tsx"),
    route("traits", "routes/traits.tsx"),
  ]),

  // API routes (no layout)
  route("api/agent/:agentId/run", "routes/api.agent.$agentId.run.ts"),
  route("api/pipelines", "routes/api.pipelines.ts"),
  route("api/pipeline/:pipelineId/run", "routes/api.pipeline.$pipelineId.run.ts"),
  route("api/pipeline/run/:runId/stream", "routes/api.pipeline.run.$runId.stream.ts"),
] satisfies RouteConfig;
