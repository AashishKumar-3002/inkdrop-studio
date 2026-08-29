import PDFDocument from "pdfkit";
import { ExportBook } from "./types";

export function buildPdf(book: ExportBook): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 64, size: "A5", bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Title page
    doc.font("Times-Bold").fontSize(28).text(book.title, { align: "center" });
    if (book.author) {
      doc.moveDown(1);
      doc.font("Times-Italic").fontSize(14).text(book.author, { align: "center" });
    }

    for (const chapter of book.chapters) {
      doc.addPage();
      doc.font("Times-Bold").fontSize(18).text(chapter.title, { align: "left" });
      doc.moveDown(1);
      doc.font("Times-Roman").fontSize(11).text(chapter.content.trim(), {
        align: "left",
        lineGap: 4,
      });
    }

    doc.end();
  });
}
