export interface ExportChapter {
  title: string;
  content: string;
}

export interface ExportBook {
  title: string;
  author?: string;
  /** data: URL, e.g. "data:image/png;base64,..." */
  coverImageDataUrl?: string;
  chapters: ExportChapter[];
}
