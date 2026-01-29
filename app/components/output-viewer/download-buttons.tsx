import { Button } from "~/components/ui/button";
import { FileText, FileCode } from "lucide-react";
import { downloadTextFile, downloadMarkdownFile, sanitizeFilename } from "~/lib/download";

interface DownloadButtonsProps {
  content: string;
  pipelineName: string;
  stepName?: string;
  contentType?: 'input' | 'output' | 'final';
}

/**
 * Download action buttons for pipeline output.
 * Provides both text (.txt) and markdown (.md) download options.
 *
 * Filenames are context-aware:
 * - Step input: {pipelineName}-{stepName}-input.txt
 * - Step output: {pipelineName}-{stepName}-output.txt
 * - Final output: {pipelineName}-final.txt
 */
export function DownloadButtons({
  content,
  pipelineName,
  stepName,
  contentType = 'final',
}: DownloadButtonsProps) {
  // Build filename based on context
  const sanitizedPipeline = sanitizeFilename(pipelineName) || 'pipeline';
  const sanitizedStep = stepName ? sanitizeFilename(stepName) : null;

  let baseFilename: string;
  if (sanitizedStep && contentType !== 'final') {
    // Step input or output: my-pipeline-AgentName-input or my-pipeline-AgentName-output
    baseFilename = `${sanitizedPipeline}-${sanitizedStep}-${contentType}`;
  } else {
    // Final output: my-pipeline-final
    baseFilename = `${sanitizedPipeline}-final`;
  }

  const handleDownloadText = () => {
    downloadTextFile(content, `${baseFilename}.txt`);
  };

  const handleDownloadMarkdown = () => {
    downloadMarkdownFile(content, `${baseFilename}.md`);
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={handleDownloadText}>
        <FileText className="w-4 h-4 mr-2" />
        Download .txt
      </Button>
      <Button variant="outline" size="sm" onClick={handleDownloadMarkdown}>
        <FileCode className="w-4 h-4 mr-2" />
        Download .md
      </Button>
    </div>
  );
}
