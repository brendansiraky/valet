import { createQueryKeys } from "@lukemorales/query-key-factory";

export const pipelinesKeys = createQueryKeys("pipelines", {
  all: null,
  detail: (id: string) => [id],
});
