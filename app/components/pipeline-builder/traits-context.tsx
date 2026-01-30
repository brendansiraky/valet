import { createContext, useContext } from "react";

// Minimal trait interface for context lookup (name display, color styling)
export interface TraitContextValue {
  id: string;
  name: string;
  color: string;
  context: string;
}

export const TraitsContext = createContext<Map<string, TraitContextValue>>(new Map());
export const useTraitsContext = () => useContext(TraitsContext);
