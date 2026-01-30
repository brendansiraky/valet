import { createContext, useContext } from "react";

interface PipelineContextValue {
  pipelineId: string;
}

export const PipelineContext = createContext<PipelineContextValue | null>(null);

export function usePipelineContext(): PipelineContextValue {
  const context = useContext(PipelineContext);
  if (!context) {
    throw new Error("usePipelineContext must be used within PipelineContext.Provider");
  }
  return context;
}
