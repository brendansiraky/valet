import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, Link, redirect, useActionData, useLoaderData } from "react-router";
import { getSession, commitSession } from "~/services/session.server";
import { encrypt } from "~/services/encryption.server";
import { validateApiKey, AVAILABLE_MODELS } from "~/services/anthropic.server";
import { db, users, apiKeys } from "~/db";
import { eq } from "drizzle-orm";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const userId = session.get("userId");

  if (!userId) {
    return redirect("/login");
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    return redirect("/login");
  }

  // Check if user has an API key stored
  const apiKey = await db.query.apiKeys.findFirst({
    where: eq(apiKeys.userId, userId),
  });

  return {
    user: { id: user.id, email: user.email },
    hasApiKey: !!apiKey,
    modelPreference: apiKey?.modelPreference ?? AVAILABLE_MODELS[0].id,
  };
}

export async function action({ request }: ActionFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const userId = session.get("userId");

  if (!userId) {
    return redirect("/login");
  }

  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "save-api-key") {
    const apiKeyValue = formData.get("apiKey") as string;

    // Validate format
    if (!apiKeyValue || !apiKeyValue.startsWith("sk-")) {
      session.flash("error", "Invalid API key format. Key must start with 'sk-'");
      return redirect("/settings", {
        headers: {
          "Set-Cookie": await commitSession(session),
        },
      });
    }

    // Validate against Anthropic API
    const isValid = await validateApiKey(apiKeyValue);
    if (!isValid) {
      session.flash("error", "Invalid API key. Please check your key and try again.");
      return redirect("/settings", {
        headers: {
          "Set-Cookie": await commitSession(session),
        },
      });
    }

    // Encrypt and store
    const encryptedKey = encrypt(apiKeyValue);

    // Upsert API key
    const existingKey = await db.query.apiKeys.findFirst({
      where: eq(apiKeys.userId, userId),
    });

    if (existingKey) {
      await db
        .update(apiKeys)
        .set({ encryptedKey, updatedAt: new Date() })
        .where(eq(apiKeys.userId, userId));
    } else {
      await db.insert(apiKeys).values({
        userId,
        encryptedKey,
        provider: "anthropic",
      });
    }

    session.flash("success", "API key saved successfully");
    return redirect("/settings", {
      headers: {
        "Set-Cookie": await commitSession(session),
      },
    });
  }

  if (intent === "update-model") {
    const modelPreference = formData.get("modelPreference") as string;

    // Validate model exists
    const validModel = AVAILABLE_MODELS.find((m) => m.id === modelPreference);
    if (!validModel) {
      session.flash("error", "Invalid model selection");
      return redirect("/settings", {
        headers: {
          "Set-Cookie": await commitSession(session),
        },
      });
    }

    // Update model preference
    await db
      .update(apiKeys)
      .set({ modelPreference, updatedAt: new Date() })
      .where(eq(apiKeys.userId, userId));

    session.flash("success", "Model preference updated");
    return redirect("/settings", {
      headers: {
        "Set-Cookie": await commitSession(session),
      },
    });
  }

  return null;
}

export default function Settings() {
  const { user, hasApiKey, modelPreference } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  // Get flash messages from loader
  // Note: We're using redirect with flash, so we need to get messages from loader
  // This is a simplified approach - in production you might want a more robust flash system

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Settings</CardTitle>
          <CardDescription>
            Manage your API key and preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* API Key Section */}
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Anthropic API Key</h3>
              <p className="text-sm text-muted-foreground">
                {hasApiKey
                  ? "Your API key is saved. Enter a new key to update it."
                  : "Enter your Anthropic API key to use Claude models."}
              </p>
            </div>
            <Form method="post" className="space-y-4">
              <input type="hidden" name="intent" value="save-api-key" />
              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key</Label>
                <Input
                  id="apiKey"
                  name="apiKey"
                  type="password"
                  placeholder="sk-ant-..."
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                {hasApiKey ? "Update API Key" : "Save API Key"}
              </Button>
            </Form>
            {hasApiKey && (
              <p className="text-sm text-green-600 dark:text-green-400">
                API key is saved and validated
              </p>
            )}
          </div>

          {/* Model Selection Section - Only show if API key exists */}
          {hasApiKey && (
            <div className="space-y-4 border-t pt-6">
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Model Preference</h3>
                <p className="text-sm text-muted-foreground">
                  Select which Claude model to use for your agents.
                </p>
              </div>
              <Form method="post" className="space-y-4">
                <input type="hidden" name="intent" value="update-model" />
                <div className="space-y-2">
                  <Label htmlFor="modelPreference">Claude Model</Label>
                  <Select name="modelPreference" defaultValue={modelPreference}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a model" />
                    </SelectTrigger>
                    <SelectContent>
                      {AVAILABLE_MODELS.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" variant="outline" className="w-full">
                  Save Model Preference
                </Button>
              </Form>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Link to="/dashboard" className="w-full">
            <Button variant="ghost" className="w-full">
              Back to Dashboard
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
