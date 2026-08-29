import { ExportBook } from "./types";

export function buildMarkdown(book: ExportBook): string {
  const parts: string[] = [`# ${book.title}`];
  if (book.author) parts.push(`*by ${book.author}*`);
  for (const chapter of book.chapters) {
    parts.push(`\n\n## ${chapter.title}\n\n${chapter.content.trim()}`);
  }
  return parts.join("\n");
}
