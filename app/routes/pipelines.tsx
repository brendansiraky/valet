import { Navigate } from "react-router";

// Client-side redirect to home tab - no server loader to avoid blocking navigation
export default function PipelinesIndex() {
  return <Navigate to="/pipelines/home" replace />;
}
