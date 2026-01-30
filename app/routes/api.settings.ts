import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { getSession } from "~/services/session.server";
import { encrypt } from "~/services/encryption.server";
import { validateApiKey } from "~/services/anthropic.server";
import { OpenAIProvider } from "~/lib/providers/openai";
import { ALL_MODELS } from "~/lib/models";
import { db, apiKeys } from "~/db";
import { eq, and } from "drizzle-orm";

function jsonResponse(data: unknown, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const userId = session.get("userId");

  if (!userId) {
    return jsonResponse({ error: "Authentication required" }, 401);
  }

  // Check if user has API keys stored (per provider)
  const userApiKeys = await db.query.apiKeys.findMany({
    where: eq(apiKeys.userId, userId),
  });

  const anthropicKey = userApiKeys.find((k) => k.provider === "anthropic");
  const openaiKey = userApiKeys.find((k) => k.provider === "openai");

  return jsonResponse({
    hasApiKey: !!anthropicKey,
    hasOpenAIKey: !!openaiKey,
    modelPreference: anthropicKey?.modelPreference ?? ALL_MODELS[0].id,
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const userId = session.get("userId");

  if (!userId) {
    return jsonResponse({ error: "Authentication required" }, 401);
  }

  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "save-api-key") {
    const apiKeyValue = formData.get("apiKey") as string;

    // Validate format
    if (!apiKeyValue || !apiKeyValue.startsWith("sk-")) {
      return jsonResponse(
        { error: "Invalid API key format. Key must start with 'sk-'" },
        400
      );
    }

    // Validate against Anthropic API
    const isValid = await validateApiKey(apiKeyValue);
    if (!isValid) {
      return jsonResponse(
        { error: "Invalid API key. Please check your key and try again." },
        400
      );
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

    return jsonResponse({ success: true });
  }

  if (intent === "save-openai-key") {
    const apiKeyValue = formData.get("openaiKey") as string;

    // Validate format - OpenAI keys start with sk-
    if (!apiKeyValue || !apiKeyValue.startsWith("sk-")) {
      return jsonResponse(
        { error: "Invalid OpenAI API key format. Key must start with 'sk-'" },
        400
      );
    }

    // Validate against OpenAI API
    const provider = new OpenAIProvider(apiKeyValue);
    const isValid = await provider.validateKey(apiKeyValue);
    if (!isValid) {
      return jsonResponse(
        { error: "Invalid OpenAI API key. Please check your key and try again." },
        400
      );
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

    return jsonResponse({ success: true });
  }

  if (intent === "update-model") {
    const modelPreference = formData.get("modelPreference") as string;

    // Validate model exists
    const validModel = ALL_MODELS.find((m) => m.id === modelPreference);
    if (!validModel) {
      return jsonResponse({ error: "Invalid model selection" }, 400);
    }

    // Update model preference on the anthropic key
    await db
      .update(apiKeys)
      .set({ modelPreference, updatedAt: new Date() })
      .where(and(eq(apiKeys.userId, userId), eq(apiKeys.provider, "anthropic")));

    return jsonResponse({ success: true });
  }

  return jsonResponse({ error: "Invalid intent" }, 400);
}
