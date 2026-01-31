import { ANTHROPIC_MODELS, OPENAI_MODELS } from "~/lib/models";
import { formatModelPrice } from "~/lib/pricing";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

interface ModelSelectorProps {
  name: string;
  defaultValue?: string;
  configuredProviders: string[];
  showDefault?: boolean;
}

export function ModelSelector({
  name,
  defaultValue,
  configuredProviders,
  showDefault = true,
}: ModelSelectorProps) {
  const hasAnthropic = configuredProviders.includes("anthropic");
  const hasOpenAI = configuredProviders.includes("openai");

  // Empty state: no providers configured
  if (!hasAnthropic && !hasOpenAI) {
    return (
      <Select disabled name={name}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Configure API keys in Settings" />
        </SelectTrigger>
      </Select>
    );
  }

  return (
    <Select name={name} defaultValue={defaultValue ?? (showDefault ? "__default__" : undefined)}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select a model" />
      </SelectTrigger>
      <SelectContent>
        {showDefault && (
          <SelectItem value="__default__">Use default from settings</SelectItem>
        )}

        {hasAnthropic && (
          <SelectGroup>
            <SelectLabel>Anthropic</SelectLabel>
            {ANTHROPIC_MODELS.map((model) => (
              <SelectItem key={model.id} value={model.id}>
                <span className="flex w-full items-center justify-between gap-4">
                  <span>{model.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatModelPrice(model.id)}
                  </span>
                </span>
              </SelectItem>
            ))}
          </SelectGroup>
        )}

        {hasOpenAI && (
          <SelectGroup>
            <SelectLabel>OpenAI</SelectLabel>
            {OPENAI_MODELS.map((model) => (
              <SelectItem key={model.id} value={model.id}>
                <span className="flex w-full items-center justify-between gap-4">
                  <span>{model.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatModelPrice(model.id)}
                  </span>
                </span>
              </SelectItem>
            ))}
          </SelectGroup>
        )}
      </SelectContent>
    </Select>
  );
}
