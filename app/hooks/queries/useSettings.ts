import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queries } from "./keys";

// Types for API responses
interface SettingsData {
  hasApiKey: boolean;
  hasOpenAIKey: boolean;
  modelPreference: string;
}

interface MutationError {
  error?: string;
}

// Fetch function with typed return
async function fetchSettings(): Promise<SettingsData> {
  const response = await fetch("/api/settings");
  if (!response.ok) {
    throw new Error("Failed to fetch settings");
  }
  const data = await response.json();
  return data;
}

// Query hook for settings
export function useSettings() {
  return useQuery({
    queryKey: queries.settings.all.queryKey,
    queryFn: fetchSettings,
  });
}

// Save Anthropic API key mutation
interface SaveApiKeyData {
  apiKey: string;
}

export function useSaveApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SaveApiKeyData) => {
      const formData = new FormData();
      formData.append("intent", "save-api-key");
      formData.append("apiKey", data.apiKey);

      const response = await fetch("/api/settings", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        const error = new Error("Failed to save API key") as Error & { data: MutationError };
        error.data = result;
        throw error;
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queries.settings._def });
    },
  });
}

// Save OpenAI API key mutation
interface SaveOpenAIKeyData {
  openaiKey: string;
}

export function useSaveOpenAIKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SaveOpenAIKeyData) => {
      const formData = new FormData();
      formData.append("intent", "save-openai-key");
      formData.append("openaiKey", data.openaiKey);

      const response = await fetch("/api/settings", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        const error = new Error("Failed to save OpenAI API key") as Error & { data: MutationError };
        error.data = result;
        throw error;
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queries.settings._def });
    },
  });
}

// Update model preference mutation
interface UpdateModelPreferenceData {
  modelPreference: string;
}

export function useUpdateModelPreference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateModelPreferenceData) => {
      const formData = new FormData();
      formData.append("intent", "update-model");
      formData.append("modelPreference", data.modelPreference);

      const response = await fetch("/api/settings", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        const error = new Error("Failed to update model preference") as Error & { data: MutationError };
        error.data = result;
        throw error;
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queries.settings._def });
    },
  });
}
