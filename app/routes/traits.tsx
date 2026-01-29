import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { redirect, useLoaderData, data } from "react-router";
import { z } from "zod";
import { getSession } from "~/services/session.server";
import { db, users, traits } from "~/db";
import { eq, and, desc } from "drizzle-orm";
import { Plus } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { TraitCard } from "~/components/trait-card";
import { TraitFormDialog } from "~/components/trait-form-dialog";

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
    return redirect("/login");
  }

  // Verify user exists
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    return redirect("/login");
  }

  // Query traits for this user, ordered by updatedAt desc
  const userTraits = await db.query.traits.findMany({
    where: eq(traits.userId, userId),
    orderBy: [desc(traits.updatedAt)],
    columns: {
      id: true,
      name: true,
      context: true,
      color: true,
      updatedAt: true,
    },
  });

  return { traits: userTraits };
}

export async function action({ request }: ActionFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const userId = session.get("userId");

  if (!userId) {
    return redirect("/login");
  }

  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "create") {
    const result = TraitSchema.safeParse({
      name: formData.get("name"),
      context: formData.get("context"),
      color: formData.get("color"),
    });

    if (!result.success) {
      return data(
        { errors: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    await db.insert(traits).values({
      userId,
      name: result.data.name,
      context: result.data.context,
      color: result.data.color,
    });

    return { success: true };
  }

  if (intent === "update") {
    const traitId = formData.get("traitId") as string;
    const result = TraitSchema.safeParse({
      name: formData.get("name"),
      context: formData.get("context"),
      color: formData.get("color"),
    });

    if (!result.success) {
      return data(
        { errors: result.error.flatten().fieldErrors },
        { status: 400 }
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

    return { success: true };
  }

  if (intent === "delete") {
    const traitId = formData.get("traitId") as string;

    // Delete trait with ownership check
    await db
      .delete(traits)
      .where(and(eq(traits.id, traitId), eq(traits.userId, userId)));

    return { success: true };
  }

  return null;
}

export default function Traits() {
  const { traits: userTraits } = useLoaderData<typeof loader>();

  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">My Traits</h1>
          <p className="text-muted-foreground">
            Create reusable context snippets for your agents
          </p>
        </div>
        <TraitFormDialog
          trigger={
            <Button>
              <Plus className="mr-2 size-4" />
              Create Trait
            </Button>
          }
        />
      </div>

      {/* Content */}
      {userTraits.length === 0 ? (
        <Card className="mx-auto max-w-md">
          <CardHeader className="text-center">
            <CardTitle>No traits yet</CardTitle>
            <CardDescription>
              Create your first trait to get started. Traits define reusable context that can be attached to agents.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <TraitFormDialog
              trigger={
                <Button>
                  <Plus className="mr-2 size-4" />
                  Create Your First Trait
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {userTraits.map((trait) => (
            <TraitCard key={trait.id} trait={trait} />
          ))}
        </div>
      )}
    </div>
  );
}
