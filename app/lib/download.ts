/**
 * Download content as a text file.
 * Uses Blob API for client-side file generation.
 */
export function downloadTextFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  triggerDownload(blob, filename);
}

/**
 * Download content as a markdown file.
 */
export function downloadMarkdownFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  triggerDownload(blob, filename);
}

/**
 * Sanitize a string for use as a filename.
 * Removes forbidden characters and limits length.
 */
export function sanitizeFilename(name: string): string {
  return name
    .replace(/[/\\?%*:|"<>]/g, '-')  // Replace forbidden chars
    .replace(/\s+/g, '-')            // Replace spaces with dashes
    .replace(/-+/g, '-')             // Collapse multiple dashes
    .replace(/^-|-$/g, '')           // Remove leading/trailing dashes
    .slice(0, 200);                  // Limit length
}

/**
 * Internal helper to trigger file download via temporary anchor element.
 * Always revokes object URL to prevent memory leaks.
 */
function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
