import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, redirect, useLoaderData, data } from "react-router";
import { getSession, commitSession } from "~/services/session.server";
import { encrypt } from "~/services/encryption.server";
import { validateApiKey } from "~/services/anthropic.server";
import { ALL_MODELS, ANTHROPIC_MODELS, OPENAI_MODELS } from "~/lib/models";
import { OpenAIProvider } from "~/lib/providers/openai";
import { db, users, apiKeys } from "~/db";
import { eq } from "drizzle-orm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { ThemeSwitcher, ColorModeToggle } from "~/components/ui/theme-switcher";
import { CheckCircle2, Info } from "lucide-react";

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

  // Check if user has API keys stored (per provider)
  const userApiKeys = await db.query.apiKeys.findMany({
    where: eq(apiKeys.userId, userId),
  });

  const anthropicKey = userApiKeys.find((k) => k.provider === "anthropic");
  const openaiKey = userApiKeys.find((k) => k.provider === "openai");

  // Get flash messages (reading clears them)
  const successMessage = session.get("success") as string | undefined;
  const errorMessage = session.get("error") as string | undefined;

  return data(
    {
      user: { id: user.id, email: user.email },
      hasApiKey: !!anthropicKey,
      hasOpenAIKey: !!openaiKey,
      modelPreference: anthropicKey?.modelPreference ?? ALL_MODELS[0].id,
      successMessage,
      errorMessage,
    },
    {
      headers: {
        "Set-Cookie": await commitSession(session),
      },
    }
  );
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

    session.flash("success", "Anthropic API key saved successfully");
    return redirect("/settings", {
      headers: {
        "Set-Cookie": await commitSession(session),
      },
    });
  }

  if (intent === "save-openai-key") {
    const apiKeyValue = formData.get("openaiKey") as string;

    // Validate format - OpenAI keys start with sk-
    if (!apiKeyValue || !apiKeyValue.startsWith("sk-")) {
      session.flash("error", "Invalid OpenAI API key format. Key must start with 'sk-'");
      return redirect("/settings", {
        headers: {
          "Set-Cookie": await commitSession(session),
        },
      });
    }

    // Validate against OpenAI API
    const provider = new OpenAIProvider(apiKeyValue);
    const isValid = await provider.validateKey(apiKeyValue);
    if (!isValid) {
      session.flash("error", "Invalid OpenAI API key. Please check your key and try again.");
      return redirect("/settings", {
        headers: {
          "Set-Cookie": await commitSession(session),
        },
      });
    }

    // Encrypt and store
    const encryptedKey = encrypt(apiKeyValue);

    // Upsert OpenAI API key
    const existingKey = await db.query.apiKeys.findFirst({
      where: (keys, { and, eq }) => and(eq(keys.userId, userId), eq(keys.provider, "openai")),
    });

    if (existingKey) {
      await db
        .update(apiKeys)
        .set({ encryptedKey, updatedAt: new Date() })
        .where(eq(apiKeys.id, existingKey.id));
    } else {
      await db.insert(apiKeys).values({
        userId,
        encryptedKey,
        provider: "openai",
      });
    }

    session.flash("success", "OpenAI API key saved successfully");
    return redirect("/settings", {
      headers: {
        "Set-Cookie": await commitSession(session),
      },
    });
  }

  if (intent === "update-model") {
    const modelPreference = formData.get("modelPreference") as string;

    // Validate model exists
    const validModel = ALL_MODELS.find((m) => m.id === modelPreference);
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
  const { user, hasApiKey, hasOpenAIKey, modelPreference, successMessage, errorMessage } = useLoaderData<typeof loader>();

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account, API keys, and preferences
        </p>
      </div>

      {/* Flash Messages */}
      {successMessage && (
        <div className="rounded-md bg-green-50 p-4 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
          {errorMessage}
        </div>
      )}

      {/* Profile Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Profile</CardTitle>
          <CardDescription>Manage your account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Email</Label>
            <p className="text-sm font-medium">{user.email}</p>
          </div>
          <p className="text-sm text-muted-foreground">
            Profile picture and name settings coming soon.
          </p>
        </CardContent>
      </Card>

      {/* Anthropic API Key Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Anthropic</CardTitle>
          <CardDescription>
            Connect your Anthropic API key to use Claude models
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
            <Button type="submit">
              {hasApiKey ? "Update API Key" : "Save API Key"}
            </Button>
          </Form>
          {hasApiKey && (
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <CheckCircle2 className="size-4" />
              <span>API key saved and validated</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* OpenAI API Key Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">OpenAI</CardTitle>
          <CardDescription>
            Connect your OpenAI API key to use GPT models
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Form method="post" className="space-y-4">
            <input type="hidden" name="intent" value="save-openai-key" />
            <div className="space-y-2">
              <Label htmlFor="openaiKey">API Key</Label>
              <Input
                id="openaiKey"
                name="openaiKey"
                type="password"
                placeholder="sk-proj-..."
                required
              />
            </div>
            <Button type="submit">
              {hasOpenAIKey ? "Update OpenAI Key" : "Save OpenAI Key"}
            </Button>
          </Form>
          {hasOpenAIKey && (
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <CheckCircle2 className="size-4" />
              <span>OpenAI API key saved and validated</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Default Model Section - Only show if any API key exists */}
      {(hasApiKey || hasOpenAIKey) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Default Model</CardTitle>
            <CardDescription>
              Global setting applied to new agents
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-2 rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
              <Info className="mt-0.5 size-4 shrink-0" />
              <span>
                This sets the default model for new agents. Individual agents can override this with their own model selection.
              </span>
            </div>
            <Form method="post" className="space-y-4">
              <input type="hidden" name="intent" value="update-model" />
              <div className="space-y-2">
                <Label htmlFor="modelPreference">Model</Label>
                <Select name="modelPreference" defaultValue={modelPreference}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent>
                    {hasApiKey && (
                      <SelectGroup>
                        <SelectLabel>Anthropic</SelectLabel>
                        {ANTHROPIC_MODELS.map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            {model.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    )}
                    {hasOpenAIKey && (
                      <SelectGroup>
                        <SelectLabel>OpenAI</SelectLabel>
                        {OPENAI_MODELS.map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            {model.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" variant="outline">
                Save Model Preference
              </Button>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Appearance Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Appearance</CardTitle>
          <CardDescription>Customize how Valet looks</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <ColorModeToggle />
          <div className="space-y-2">
            <Label>Color Theme</Label>
            <ThemeSwitcher />
          </div>
        </CardContent>
      </Card>

      {/* Account Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Account</CardTitle>
          <CardDescription>Manage your account</CardDescription>
        </CardHeader>
        <CardContent>
          <Form method="post" action="/logout">
            <Button type="submit" variant="destructive">
              Sign out
            </Button>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
