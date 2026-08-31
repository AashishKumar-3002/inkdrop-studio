import { describe, expect, it } from "vitest";
import { buildMarkdown } from "@/lib/export/markdown";
import { buildEpub } from "@/lib/export/epub";
import { buildPdf } from "@/lib/export/pdf";

// A 1x1 transparent PNG.
const PNG_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

const book = {
  title: "Test Novel",
  author: "A. Writer",
  chapters: [
    { title: "One", content: "First paragraph.\n\nSecond paragraph." },
    { title: "Two", content: "Only paragraph." },
  ],
};

describe("markdown export", () => {
  it("includes the title, author and every chapter", () => {
    const md = buildMarkdown(book);
    expect(md).toContain("Test Novel");
    expect(md).toContain("A. Writer");
    expect(md).toContain("One");
    expect(md).toContain("Second paragraph.");
  });
});

describe("pdf export", () => {
  it("produces a real PDF", async () => {
    const buf = await buildPdf(book);
    expect(buf.length).toBeGreaterThan(500);
    expect(buf.subarray(0, 5).toString()).toBe("%PDF-");
  });
});

describe("epub export", () => {
  it("produces a real EPUB (zip) archive", async () => {
    const buf = await buildEpub(book);
    // EPUBs are zip files; "PK" is the zip local-file-header magic.
    expect(buf.subarray(0, 2).toString()).toBe("PK");
    expect(buf.length).toBeGreaterThan(1000);
  });

  it("actually embeds the cover image", async () => {
    // Regression test: epub-gen-memory silently drops the cover unless it can
    // fetch it over http(s) AND infer a media type from a file extension.
    const buf = await buildEpub({ ...book, coverImageDataUrl: PNG_DATA_URL });
    // Filenames are stored uncompressed in the zip's central directory.
    expect(buf.toString("latin1")).toContain("cover.png");
  });

  it("still builds when the cover data URL is unusable", async () => {
    const buf = await buildEpub({ ...book, coverImageDataUrl: "not-a-data-url" });
    expect(buf.subarray(0, 2).toString()).toBe("PK");
  });
});
