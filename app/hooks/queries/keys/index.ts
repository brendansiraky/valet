import { mergeQueryKeys } from "@lukemorales/query-key-factory";
import { pipelinesKeys } from "./pipelines";
import { agentsKeys } from "./agents";
import { traitsKeys } from "./traits";
import { settingsKeys } from "./settings";

export const queries = mergeQueryKeys(
  pipelinesKeys,
  agentsKeys,
  traitsKeys,
  settingsKeys
);
