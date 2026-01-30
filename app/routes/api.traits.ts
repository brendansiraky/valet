import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { z } from "zod";
import { getSession } from "~/services/session.server";
import { db, traits } from "~/db";
import { eq, and, asc } from "drizzle-orm";

function jsonResponse(data: unknown, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Accept both hex (#RRGGBB) and OKLCH formats for backward compatibility
const colorRegex = /^(#[0-9A-Fa-f]{6}|oklch\(\d+\.?\d*\s+\d+\.?\d*\s+\d+\.?\d*\))$/;

const TraitSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be 100 characters or less"),
  context: z.string().min(1, "Context is required").max(50000, "Context must be 50,000 characters or less"),
  color: z.string().regex(colorRegex, "Invalid color format").optional(),
});

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const userId = session.get("userId");

  if (!userId) {
    return jsonResponse({ error: "Authentication required" }, 401);
  }

  // Query traits for this user, ordered by name
  const userTraits = await db.query.traits.findMany({
    where: eq(traits.userId, userId),
    orderBy: [asc(traits.name)],
    columns: {
      id: true,
      name: true,
      context: true,
      color: true,
      updatedAt: true,
    },
  });

  return jsonResponse({ traits: userTraits });
}

export async function action({ request }: ActionFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const userId = session.get("userId");

  if (!userId) {
    return jsonResponse({ error: "Authentication required" }, 401);
  }

  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  switch (intent) {
    case "create": {
      const result = TraitSchema.safeParse({
        name: formData.get("name"),
        context: formData.get("context"),
        color: formData.get("color") || undefined,
      });

      if (!result.success) {
        return jsonResponse(
          { errors: result.error.flatten().fieldErrors },
          400
        );
      }

      const [newTrait] = await db
        .insert(traits)
        .values({
          userId,
          name: result.data.name,
          context: result.data.context,
          color: result.data.color,
        })
        .returning({ id: traits.id });

      return jsonResponse({ success: true, trait: newTrait });
    }

    case "update": {
      const traitId = formData.get("traitId") as string;

      if (!traitId) {
        return jsonResponse({ error: "Trait ID is required" }, 400);
      }

      const result = TraitSchema.safeParse({
        name: formData.get("name"),
        context: formData.get("context"),
        color: formData.get("color") || undefined,
      });

      if (!result.success) {
        return jsonResponse(
          { errors: result.error.flatten().fieldErrors },
          400
        );
      }

      // Update trait with ownership check
      await db
        .update(traits)
        .set({
          name: result.data.name,
          context: result.data.context,
          color: result.data.color,
        })
        .where(and(eq(traits.id, traitId), eq(traits.userId, userId)));

      return jsonResponse({ success: true });
    }

    case "delete": {
      const traitId = formData.get("traitId") as string;

      if (!traitId) {
        return jsonResponse({ error: "Trait ID is required" }, 400);
      }

      // Delete trait with ownership check
      await db
        .delete(traits)
        .where(and(eq(traits.id, traitId), eq(traits.userId, userId)));

      return jsonResponse({ success: true });
    }

    default:
      return jsonResponse({ error: "Invalid intent" }, 400);
  }
}
