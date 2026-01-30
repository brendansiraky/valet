import { useQuery } from "@tanstack/react-query";

interface Pipeline {
  id: string;
  name: string;
}

async function fetchPipelines(): Promise<Pipeline[]> {
  const response = await fetch("/api/pipelines");
  if (!response.ok) throw new Error("Failed to fetch pipelines");
  const data = await response.json();
  return data.pipelines ?? [];
}

export function usePipelines() {
  return useQuery({
    queryKey: ["pipelines"],
    queryFn: fetchPipelines,
  });
}
