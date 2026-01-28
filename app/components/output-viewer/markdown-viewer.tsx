import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '~/lib/utils';

interface MarkdownViewerProps {
  content: string;
  className?: string;
}

/**
 * Renders markdown content with Tailwind typography styling.
 * Supports GitHub Flavored Markdown (tables, task lists, strikethrough).
 * Safe by default - no dangerouslySetInnerHTML.
 */
export function MarkdownViewer({ content, className }: MarkdownViewerProps) {
  return (
    <article
      className={cn(
        "prose prose-sm dark:prose-invert max-w-none",
        // Ensure proper spacing and readable line length
        "prose-headings:mt-4 prose-headings:mb-2",
        "prose-p:my-2 prose-pre:my-2",
        className
      )}
    >
      <Markdown remarkPlugins={[remarkGfm]}>
        {content}
      </Markdown>
    </article>
  );
}
