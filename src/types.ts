export interface CollatedFile {
  id: string;
  name: string;
  type: "pdf" | "docx" | "xlsx" | "image" | "text";
  size: number;
  rawFile: File;
  text: string; // Extracted text content for Gemini indexing & compilation
  html?: string; // Parsed HTML (e.g. from Mammoth for docx or SheetJS tables)
  imagePreviewUrl?: string; // Base64 or object-URL for image files
  pdfPagesCount?: number;
  pdfSelectedRange?: string; // "all", "1", "1,3", "2-5"
  xlsxSheets?: string[]; // Loaded tabs
  xlsxSelectedSheet?: string; 
  xlsxData?: Record<string, string[][]>; // raw row-cell data per sheet
  sectionTitle?: string; // Custom subtitle or section boundary label
  
  // Image Editing Options
  imageRotation?: number; // 0, 90, 180, 270 degrees
  imageFilter?: "none" | "grayscale" | "sepia" | "contrast" | "invert" | "blur" | "vintage";
  imageScaleMode?: "fit" | "fill" | "stretch";
  imageWatermark?: string;

  // PDF Editing Options
  pdfPageRotations?: Record<number, number>; // 1-based page index to rotation (0, 90, 180, 270)
  pdfWatermark?: string;
}

export interface CoverPageOptions {
  enabled: boolean;
  title: string;
  subtitle: string;
  author: string;
  organization: string;
  date: string;
  theme: "elegant" | "minimal" | "corporate" | "tech";
  accentColor: string;
}

export interface TableOfContentsOptions {
  enabled: boolean;
  title: string;
  includePageNumbers: boolean;
  style: "classic" | "bento" | "modern";
}

export interface OutputSettings {
  pageNumbering: "none" | "bottom-right" | "bottom-center" | "header-right";
  pageNumberPrefix: string;
  fileNameInHeader: boolean;
  pageSize: "a4" | "letter";
  margins: "none" | "slim" | "standard";
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}
