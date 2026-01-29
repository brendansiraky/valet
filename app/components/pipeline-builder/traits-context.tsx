import { createContext, useContext } from "react";
import type { Trait } from "~/db/schema/traits";

export const TraitsContext = createContext<Map<string, Trait>>(new Map());
export const useTraits = () => useContext(TraitsContext);
