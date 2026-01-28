import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("register", "routes/register.tsx"),
  route("login", "routes/login.tsx"),
  route("logout", "routes/logout.tsx"),
  route("dashboard", "routes/dashboard.tsx"),
  route("settings", "routes/settings.tsx"),
  route("agents", "routes/agents.tsx"),
  route("api/agent/:agentId/run", "routes/api.agent.$agentId.run.ts"),
] satisfies RouteConfig;
