import { Button } from "~/components/ui/button";
import { FileText, FileCode } from "lucide-react";
import { downloadTextFile, downloadMarkdownFile, sanitizeFilename } from "~/lib/download";

interface DownloadButtonsProps {
  content: string;
  pipelineName: string;
}

/**
 * Download action buttons for pipeline output.
 * Provides both text (.txt) and markdown (.md) download options.
 */
export function DownloadButtons({ content, pipelineName }: DownloadButtonsProps) {
  const baseFilename = sanitizeFilename(pipelineName) || 'pipeline-output';

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
