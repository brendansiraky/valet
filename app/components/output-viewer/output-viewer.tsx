import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { MarkdownViewer } from "./markdown-viewer";
import { DownloadButtons } from "./download-buttons";
import { calculateCost, formatCost, formatTokens } from "~/lib/pricing";
import { ALL_MODELS } from "~/lib/models";

interface StepOutput {
  agentName: string;
  output: string;
  input?: string;
  model?: string;
}

/**
 * Get display name for a model ID.
 */
function getModelDisplayName(modelId: string): string {
  const model = ALL_MODELS.find((m) => m.id === modelId);
  return model?.name ?? modelId;
}

interface OutputViewerProps {
  steps: StepOutput[];
  finalOutput: string;
  pipelineName: string;
  usage?: { inputTokens: number; outputTokens: number } | null;
  model?: string | null;
  onClose?: () => void;
}

/**
 * Tabbed output viewer for pipeline execution results.
 * Shows each agent's output in separate tabs with a final output tab.
 * Each step has Input/Output sub-tabs for visibility into data flow.
 */
export function OutputViewer({
  steps,
  finalOutput,
  pipelineName,
  usage,
  model,
  onClose,
}: OutputViewerProps) {
  const defaultTab = steps.length > 0 ? "final" : "step-0";

  // Track which main tab is selected
  const [activeTab, setActiveTab] = useState(defaultTab);

  // Track which sub-tab (input/output) is selected for each step
  const [stepViews, setStepViews] = useState<Record<number, 'input' | 'output'>>({});

  const getStepView = (index: number) => stepViews[index] || 'output';

  const setStepView = (index: number, view: 'input' | 'output') => {
    setStepViews(prev => ({ ...prev, [index]: view }));
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Pipeline Output</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            {steps.map((step, index) => (
              <TabsTrigger key={index} value={`step-${index}`}>
                {step.agentName}
              </TabsTrigger>
            ))}
            <TabsTrigger value="final">Final Output</TabsTrigger>
          </TabsList>

          {steps.map((step, index) => {
            // Use step-specific model if available, fallback to pipeline model
            const stepModel = step.model ?? model;
            return (
              <TabsContent key={index} value={`step-${index}`}>
                <Tabs
                  value={getStepView(index)}
                  onValueChange={(v) => setStepView(index, v as 'input' | 'output')}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <TabsList>
                        <TabsTrigger value="input">Input</TabsTrigger>
                        <TabsTrigger value="output">Output</TabsTrigger>
                      </TabsList>
                      {stepModel && (
                        <Badge variant="secondary" className="text-xs">
                          {getModelDisplayName(stepModel)}
                        </Badge>
                      )}
                    </div>
                    <DownloadButtons
                      content={getStepView(index) === 'input' ? (step.input ?? '') : step.output}
                      pipelineName={pipelineName}
                      stepName={step.agentName}
                      contentType={getStepView(index)}
                    />
                  </div>
                  <TabsContent value="input">
                    <ScrollArea className="h-[400px] rounded-md border p-4">
                      <MarkdownViewer content={step.input || "No input"} />
                    </ScrollArea>
                  </TabsContent>
                  <TabsContent value="output">
                    <ScrollArea className="h-[400px] rounded-md border p-4">
                      <MarkdownViewer content={step.output || "No output"} />
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </TabsContent>
            );
          })}

          <TabsContent value="final">
            <div className="flex items-center justify-end mb-4">
              <DownloadButtons
                content={finalOutput}
                pipelineName={pipelineName}
                contentType="final"
              />
            </div>
            <ScrollArea className="h-[400px] rounded-md border p-4">
              <MarkdownViewer content={finalOutput || "No output"} />
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Usage Summary - only shown on Final Output tab */}
        {activeTab === "final" && usage && model && (
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <h4 className="text-sm font-medium mb-2">Usage Summary</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Input tokens:</span>
                <span className="ml-2 font-mono">{formatTokens(usage.inputTokens)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Output tokens:</span>
                <span className="ml-2 font-mono">{formatTokens(usage.outputTokens)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Estimated cost:</span>
                <span className="ml-2 font-medium">
                  {formatCost(calculateCost(model, usage.inputTokens, usage.outputTokens))}
                </span>
              </div>
            </div>
          </div>
        )}

        {onClose && (
          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
