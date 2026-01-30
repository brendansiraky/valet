import type { LoaderFunctionArgs } from "react-router";
import { redirect, useLoaderData, Form } from "react-router";
import { useState } from "react";
import { toast } from "sonner";
import { getSession } from "~/services/session.server";
import { ANTHROPIC_MODELS, OPENAI_MODELS } from "~/lib/models";
import { db, users } from "~/db";
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
import { CheckCircle2, Info, Loader2 } from "lucide-react";
import {
  useSettings,
  useSaveApiKey,
  useSaveOpenAIKey,
  useUpdateModelPreference,
} from "~/hooks/queries/useSettings";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const userId = session.get("userId");

  if (!userId) {
    return redirect("/login");
  }

  // Get user email for display (static, no React Query needed)
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { email: true },
  });

  if (!user) {
    return redirect("/login");
  }

  return { user: { email: user.email } };
}

export default function Settings() {
  const { user } = useLoaderData<typeof loader>();

  // React Query hooks
  const settingsQuery = useSettings();
  const saveApiKeyMutation = useSaveApiKey();
  const saveOpenAIKeyMutation = useSaveOpenAIKey();
  const updateModelMutation = useUpdateModelPreference();

  // Form state
  const [anthropicKey, setAnthropicKey] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");

  // Handler for Anthropic API key
  const handleSaveAnthropicKey = (e: React.FormEvent) => {
    e.preventDefault();
    saveApiKeyMutation.mutate(
      { apiKey: anthropicKey },
      {
        onSuccess: () => {
          toast.success("Anthropic API key saved successfully");
          setAnthropicKey("");
        },
        onError: (error) => {
          const mutationError = error as Error & { data?: { error?: string } };
          toast.error(mutationError.data?.error || "Failed to save API key");
        },
      }
    );
  };

  // Handler for OpenAI API key
  const handleSaveOpenAIKey = (e: React.FormEvent) => {
    e.preventDefault();
    saveOpenAIKeyMutation.mutate(
      { openaiKey: openaiKey },
      {
        onSuccess: () => {
          toast.success("OpenAI API key saved successfully");
          setOpenaiKey("");
        },
        onError: (error) => {
          const mutationError = error as Error & { data?: { error?: string } };
          toast.error(mutationError.data?.error || "Failed to save OpenAI API key");
        },
      }
    );
  };

  // Handler for model preference
  const handleModelChange = (value: string) => {
    updateModelMutation.mutate(
      { modelPreference: value },
      {
        onSuccess: () => {
          toast.success("Model preference updated");
        },
        onError: (error) => {
          const mutationError = error as Error & { data?: { error?: string } };
          toast.error(mutationError.data?.error || "Failed to update model preference");
        },
      }
    );
  };

  // Loading state
  if (settingsQuery.isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-8 px-4 py-8">
        <div>
          <h1 className="text-2xl font-semibold">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your account, API keys, and preferences
          </p>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  // Error state
  if (settingsQuery.isError) {
    return (
      <div className="mx-auto max-w-2xl space-y-8 px-4 py-8">
        <div>
          <h1 className="text-2xl font-semibold">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your account, API keys, and preferences
          </p>
        </div>
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
          Failed to load settings. Please refresh the page.
        </div>
      </div>
    );
  }

  const hasApiKey = settingsQuery.data?.hasApiKey ?? false;
  const hasOpenAIKey = settingsQuery.data?.hasOpenAIKey ?? false;
  const modelPreference = settingsQuery.data?.modelPreference ?? "";

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account, API keys, and preferences
        </p>
      </div>

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
          <form onSubmit={handleSaveAnthropicKey} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="sk-ant-..."
                value={anthropicKey}
                onChange={(e) => setAnthropicKey(e.target.value)}
                required
                disabled={saveApiKeyMutation.isPending}
              />
            </div>
            <Button type="submit" disabled={saveApiKeyMutation.isPending}>
              {saveApiKeyMutation.isPending && (
                <Loader2 className="mr-2 size-4 animate-spin" />
              )}
              {hasApiKey ? "Update API Key" : "Save API Key"}
            </Button>
          </form>
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
          <form onSubmit={handleSaveOpenAIKey} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="openaiKey">API Key</Label>
              <Input
                id="openaiKey"
                type="password"
                placeholder="sk-proj-..."
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                required
                disabled={saveOpenAIKeyMutation.isPending}
              />
            </div>
            <Button type="submit" disabled={saveOpenAIKeyMutation.isPending}>
              {saveOpenAIKeyMutation.isPending && (
                <Loader2 className="mr-2 size-4 animate-spin" />
              )}
              {hasOpenAIKey ? "Update OpenAI Key" : "Save OpenAI Key"}
            </Button>
          </form>
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
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="modelPreference">Model</Label>
                <Select
                  value={modelPreference}
                  onValueChange={handleModelChange}
                  disabled={updateModelMutation.isPending}
                >
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
              {updateModelMutation.isPending && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  <span>Saving...</span>
                </div>
              )}
            </div>
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
