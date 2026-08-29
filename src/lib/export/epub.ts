import http from "http";
import type { AddressInfo } from "net";
import epub, { Options } from "epub-gen-memory";
import { ExportBook } from "./types";

const EXTENSION_BY_MEDIA_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

function dataUrlToBuffer(
  dataUrl: string
): { data: Buffer; mediaType: string; extension: string } | null {
  const match = /^data:([^;]+);base64,(.*)$/.exec(dataUrl);
  if (!match) return null;
  const mediaType = match[1];
  const extension = EXTENSION_BY_MEDIA_TYPE[mediaType];
  if (!extension) return null;
  return { data: Buffer.from(match[2], "base64"), mediaType, extension };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function chapterToHtml(content: string): string {
  return content
    .split(/\n{2,}/)
    .map((para) => `<p>${escapeHtml(para.trim()).replace(/\n/g, "<br/>")}</p>`)
    .join("\n");
}

/**
 * epub-gen-memory only accepts a fetchable http(s) URL (or a browser File)
 * for the cover image — it can't take an in-memory buffer or a data: URL
 * directly. We briefly serve the cover bytes over a loopback HTTP server so
 * the library can "fetch" it, then tear the server down.
 */
async function withLoopbackImageServer<T>(
  buffer: Buffer,
  mediaType: string,
  extension: string,
  fn: (url: string) => Promise<T>
): Promise<T> {
  const server = http.createServer((_req, res) => {
    res.writeHead(200, { "Content-Type": mediaType, "Content-Length": buffer.length });
    res.end(buffer);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const { port } = server.address() as AddressInfo;
    // epub-gen-memory detects the cover's media type from the URL's file
    // extension (via `mime.getType`), so the loopback URL needs one —
    // an extensionless path silently skips the cover.
    return await fn(`http://127.0.0.1:${port}/cover.${extension}`);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

export async function buildEpub(book: ExportBook): Promise<Buffer> {
  const chapters = book.chapters.map((c) => ({
    title: c.title,
    content: chapterToHtml(c.content),
  }));

  const baseOptions: Options = {
    title: book.title,
    author: book.author || "Unknown",
    tocTitle: "Contents",
    numberChaptersInTOC: true,
  };

  const cover = book.coverImageDataUrl ? dataUrlToBuffer(book.coverImageDataUrl) : null;
  if (!cover) {
    return epub(baseOptions, chapters);
  }

  return withLoopbackImageServer(cover.data, cover.mediaType, cover.extension, (url) =>
    epub({ ...baseOptions, cover: url }, chapters)
  );
}
