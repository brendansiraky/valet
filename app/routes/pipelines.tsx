import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { getSession } from "~/services/session.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const userId = session.get("userId");

  if (!userId) {
    return redirect("/login");
  }

  // Redirect to home tab
  return redirect("/pipelines/home");
}
