import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queries } from "./keys";

export interface Trait {
  id: string;
  name: string;
  context: string;
  color: string;
  updatedAt: Date;
}

interface TraitsResponse {
  traits: Trait[];
}

interface MutationResponse {
  success?: boolean;
  trait?: Trait;
  errors?: {
    name?: string[];
    context?: string[];
    color?: string[];
  };
  error?: string;
}

async function fetchTraits(): Promise<Trait[]> {
  const response = await fetch("/api/traits");
  if (!response.ok) throw new Error("Failed to fetch traits");
  const data: TraitsResponse = await response.json();
  return data.traits ?? [];
}

export function useTraits() {
  return useQuery({
    queryKey: queries.traits.all.queryKey,
    queryFn: fetchTraits,
  });
}

export interface CreateTraitInput {
  name: string;
  context: string;
  color?: string;
}

export function useCreateTrait() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTraitInput): Promise<MutationResponse> => {
      const formData = new FormData();
      formData.append("intent", "create");
      formData.append("name", data.name);
      formData.append("context", data.context);
      if (data.color) {
        formData.append("color", data.color);
      }

      const response = await fetch("/api/traits", {
        method: "POST",
        body: formData,
      });

      const result: MutationResponse = await response.json();

      if (!response.ok || result.errors) {
        throw new Error(
          result.errors?.name?.[0] ||
          result.errors?.context?.[0] ||
          result.errors?.color?.[0] ||
          result.error ||
          "Failed to create trait"
        );
      }

      return result;
    },
    onMutate: async (newTrait) => {
      await queryClient.cancelQueries({ queryKey: queries.traits.all.queryKey });

      const previous = queryClient.getQueryData<Trait[]>(queries.traits.all.queryKey);

      const optimisticTrait: Trait = {
        id: `temp-${Date.now()}`,
        name: newTrait.name,
        context: newTrait.context,
        color: newTrait.color ?? "#3b82f6",
        updatedAt: new Date(),
      };

      queryClient.setQueryData<Trait[]>(queries.traits.all.queryKey, (old) => [
        optimisticTrait,
        ...(old ?? []),
      ]);

      return { previous };
    },
    onError: (_err, _newTrait, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queries.traits.all.queryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queries.traits._def });
    },
  });
}

export interface UpdateTraitInput {
  traitId: string;
  name: string;
  context: string;
  color?: string;
}

export function useUpdateTrait() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateTraitInput): Promise<MutationResponse> => {
      const formData = new FormData();
      formData.append("intent", "update");
      formData.append("traitId", data.traitId);
      formData.append("name", data.name);
      formData.append("context", data.context);
      if (data.color) {
        formData.append("color", data.color);
      }

      const response = await fetch("/api/traits", {
        method: "POST",
        body: formData,
      });

      const result: MutationResponse = await response.json();

      if (!response.ok || result.errors) {
        throw new Error(
          result.errors?.name?.[0] ||
          result.errors?.context?.[0] ||
          result.errors?.color?.[0] ||
          result.error ||
          "Failed to update trait"
        );
      }

      return result;
    },
    onMutate: async (updatedTrait) => {
      await queryClient.cancelQueries({ queryKey: queries.traits.all.queryKey });

      const previous = queryClient.getQueryData<Trait[]>(queries.traits.all.queryKey);

      queryClient.setQueryData<Trait[]>(queries.traits.all.queryKey, (old) =>
        old?.map((trait) =>
          trait.id === updatedTrait.traitId
            ? {
                ...trait,
                name: updatedTrait.name,
                context: updatedTrait.context,
                color: updatedTrait.color ?? trait.color,
                updatedAt: new Date(),
              }
            : trait
        )
      );

      return { previous };
    },
    onError: (_err, _updatedTrait, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queries.traits.all.queryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queries.traits._def });
    },
  });
}

export interface DeleteTraitInput {
  traitId: string;
}

export function useDeleteTrait() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: DeleteTraitInput): Promise<MutationResponse> => {
      const formData = new FormData();
      formData.append("intent", "delete");
      formData.append("traitId", data.traitId);

      const response = await fetch("/api/traits", {
        method: "POST",
        body: formData,
      });

      const result: MutationResponse = await response.json();

      if (!response.ok || result.error) {
        throw new Error(result.error || "Failed to delete trait");
      }

      return result;
    },
    onMutate: async (deletedTrait) => {
      await queryClient.cancelQueries({ queryKey: queries.traits.all.queryKey });

      const previous = queryClient.getQueryData<Trait[]>(queries.traits.all.queryKey);

      queryClient.setQueryData<Trait[]>(queries.traits.all.queryKey, (old) =>
        old?.filter((trait) => trait.id !== deletedTrait.traitId)
      );

      return { previous };
    },
    onError: (_err, _deletedTrait, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queries.traits.all.queryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queries.traits._def });
    },
  });
}
