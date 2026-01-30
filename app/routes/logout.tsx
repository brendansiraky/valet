import type { ActionFunctionArgs } from "react-router";
import { logout } from "~/services/auth.server";

export async function action({ request }: ActionFunctionArgs) {
  return logout(request, "/login");
}
