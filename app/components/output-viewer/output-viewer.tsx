import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Button } from "~/components/ui/button";
import { MarkdownViewer } from "./markdown-viewer";
import { DownloadButtons } from "./download-buttons";
import { calculateCost, formatCost, formatTokens } from "~/lib/pricing";

interface StepOutput {
  agentName: string;
  output: string;
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
 * Includes download buttons for the final output.
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

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Pipeline Output</CardTitle>
          <DownloadButtons content={finalOutput} pipelineName={pipelineName} />
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={defaultTab}>
          <TabsList className="mb-4">
            {steps.map((step, index) => (
              <TabsTrigger key={index} value={`step-${index}`}>
                {step.agentName}
              </TabsTrigger>
            ))}
            <TabsTrigger value="final">Final Output</TabsTrigger>
          </TabsList>

          {steps.map((step, index) => (
            <TabsContent key={index} value={`step-${index}`}>
              <ScrollArea className="h-[400px] rounded-md border p-4">
                <MarkdownViewer content={step.output || "No output"} />
              </ScrollArea>
            </TabsContent>
          ))}

          <TabsContent value="final">
            <ScrollArea className="h-[400px] rounded-md border p-4">
              <MarkdownViewer content={finalOutput || "No output"} />
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Usage Summary */}
        {usage && model && (
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
