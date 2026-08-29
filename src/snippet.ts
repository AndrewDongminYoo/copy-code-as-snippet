import * as path from "path";

export const enum SnippetFormat {
  Markdown = "markdown",
  Html = "html",
  Plain = "plain",
}

export type FenceStrategy = "default" | "autoUpgrade" | "tilde";
export type MarkdownPathPlacement = "legacy" | "header";

export interface SnippetOptions {
  format: SnippetFormat;
  language: string;
  relativePath: string;
  content: string;
  includeFilePath: boolean;
  fenceStrategy: FenceStrategy;
  aiModeEnabled: boolean;
  rangeText: string;
  pathPlacement: MarkdownPathPlacement;
}

export function detectLanguage(
  filePath: string,
  defaultLanguage: string,
): string {
  const fileName = path.basename(filePath);
  const fileExtension = path.extname(filePath);
  if (filePath.includes("android") && fileName === "build.gradle") {
    return "groovy";
  }

  if (fileName === "Dockerfile") {
    return "dockerfile";
  }

  if (
    (fileExtension === ".yml" || fileExtension === ".yaml") &&
    fileName.includes("docker-compose")
  ) {
    return "docker-compose";
  }

  return defaultLanguage;
}

export function createSnippet(options: SnippetOptions): string {
  switch (options.format) {
    case SnippetFormat.Markdown:
      return createMarkdownSnippet(options);
    case SnippetFormat.Html:
      return createHtmlSnippet(options);
    case SnippetFormat.Plain:
      return options.content;
    default:
      return createMarkdownSnippet(options);
  }
}

export function createSelectionRangeText(
  startLine: number,
  endLine: number,
  endCharacter: number,
): string {
  const inclusiveEndLine =
    endCharacter === 0 && endLine > startLine ? endLine : endLine + 1;
  return `lines ${startLine + 1}-${inclusiveEndLine} (selection)`;
}

export function createHeadTailSample(
  headContent: string,
  tailContent: string,
  omittedLines: number,
): string {
  return `${headContent}\n... ${omittedLines} lines omitted ...\n${tailContent}`;
}

function createMarkdownSnippet(options: SnippetOptions): string {
  const fence = resolveFence(options.fenceStrategy, options.content);

  if (options.aiModeEnabled) {
    const lead = options.includeFilePath
      ? `File: ${options.relativePath}`
      : `Language: ${options.language}`;
    const details = [
      options.includeFilePath ? options.language : undefined,
      options.rangeText || undefined,
    ].filter((part): part is string => Boolean(part));
    const header =
      details.length > 0
        ? `### ${lead} (${details.join(", ")})`
        : `### ${lead}`;

    return `${header}\n\n${fence}${options.language}\n${options.content}\n${fence}`;
  }

  if (options.pathPlacement === "header" && options.includeFilePath) {
    return `### File: ${options.relativePath}\n\n${fence}${options.language}\n${options.content}\n${fence}`;
  }

  const header = options.includeFilePath
    ? `${options.language}:${options.relativePath}`
    : options.language;

  return `${fence}${header}\n${options.content}\n${fence}`;
}

function createHtmlSnippet(options: SnippetOptions): string {
  const classAttr = `language-${options.language}`;
  const filenameAttr = options.includeFilePath
    ? ` data-filename="${escapeHtml(options.relativePath)}"`
    : "";
  return `<pre><code class="${classAttr}"${filenameAttr}>${escapeHtml(
    options.content,
  )}</code></pre>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function resolveFence(fenceStrategy: FenceStrategy, content: string): string {
  if (fenceStrategy === "tilde") {
    return "~~~";
  }

  if (fenceStrategy === "autoUpgrade") {
    let longestRun = 0;
    for (const match of content.matchAll(/`+/g)) {
      longestRun = Math.max(longestRun, match[0].length);
    }
    return "`".repeat(Math.max(3, longestRun + 1));
  }

  return "```";
}
