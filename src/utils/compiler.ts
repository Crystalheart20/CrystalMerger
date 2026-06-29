import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib";
import { jsPDF } from "jspdf";
import { CollatedFile, CoverPageOptions, TableOfContentsOptions, OutputSettings } from "../types";

// Helper to parse page range strings (e.g. "1,3,5-8")
function parsePageRanges(rangeStr: string, maxPages: number): number[] {
  if (!rangeStr || rangeStr.toLowerCase() === "all" || rangeStr.trim() === "") {
    return Array.from({ length: maxPages }, (_, i) => i);
  }

  const selectedPages = new Set<number>();
  const segments = rangeStr.split(",");

  for (const segment of segments) {
    const trimmed = segment.trim();
    if (trimmed.includes("-")) {
      const parts = trimmed.split("-");
      const start = parseInt(parts[0], 10);
      const end = parseInt(parts[1], 10);
      if (!isNaN(start) && !isNaN(end)) {
        // pdf-lib and our inputs are 1-indexed for users, but 0-indexed internally
        const s = Math.max(1, Math.min(start, maxPages));
        const e = Math.max(1, Math.min(end, maxPages));
        const low = Math.min(s, e);
        const high = Math.max(s, e);
        for (let i = low; i <= high; i++) {
          selectedPages.add(i - 1);
        }
      }
    } else {
      const p = parseInt(trimmed, 10);
      if (!isNaN(p) && p >= 1 && p <= maxPages) {
        selectedPages.add(p - 1);
      }
    }
  }

  return Array.from(selectedPages).sort((a, b) => a - b);
}

// Draw Cover Page onto a PDFDocument or generate via jsPDF
function drawCoverPage(options: CoverPageOptions): Uint8Array {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();

  // Color Swatches
  const accent = options.accentColor || "#3b82f6";

  // Different Theme Layouts
  switch (options.theme) {
    case "tech": {
      // Tech-grid styling
      doc.setFillColor(15, 23, 42); // slate-900 background
      doc.rect(0, 0, width, height, "F");

      // Tech grid lines or decor
      doc.setDrawColor(51, 65, 85);
      doc.setLineWidth(0.3);
      for (let i = 20; i < width; i += 20) {
        doc.line(i, 0, i, height);
      }
      for (let j = 20; j < height; j += 20) {
        doc.line(0, j, width, j);
      }

      // Tech details
      doc.setDrawColor(accent);
      doc.setLineWidth(1.5);
      doc.line(15, 30, 45, 30);
      doc.line(15, 30, 15, 60);

      // Metadata
      doc.setFont("courier", "bold");
      doc.setFontSize(10);
      doc.setTextColor(accent);
      doc.text("DOCUMENT CLASS // METAPACK", 20, 45);

      // Title
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(28);
      doc.setTextColor(255, 255, 255);
      const titleLines = doc.splitTextToSize(options.title || "UNTITLED ARCHIVE", width - 40);
      doc.text(titleLines, 20, 65);

      // Subtitle
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(14);
      doc.setTextColor(148, 163, 184); // slate-400
      const subLines = doc.splitTextToSize(options.subtitle || "Automated Document Assembly", width - 40);
      doc.text(subLines, 20, 110);

      // Footer divider
      doc.setFillColor(accent);
      doc.rect(20, height - 60, 40, 2, "F");

      // Metadata Footer
      doc.setFont("courier", "normal");
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184);
      doc.text(`AUTHOR: ${options.author || "ANONYMOUS"}`, 20, height - 45);
      doc.text(`ORG: ${options.organization || "SYSTEM LOCAL"}`, 20, height - 38);
      doc.text(`COMPILED ON: ${options.date || new Date().toLocaleDateString()}`, 20, height - 31);
      
      break;
    }

    case "elegant": {
      // Warm elegant cream styling
      doc.setFillColor(253, 251, 247); // soft wheat-ivory border
      doc.rect(0, 0, width, height, "F");

      // Inner elegant fine line border
      doc.setDrawColor(180, 150, 110);
      doc.setLineWidth(0.4);
      doc.rect(10, 10, width - 20, height - 20, "D");
      doc.rect(11.5, 11.5, width - 23, height - 23, "D");

      // Title
      doc.setFont("times", "italic");
      doc.setFontSize(36);
      doc.setTextColor(60, 45, 30);
      const titleLines = doc.splitTextToSize(options.title || "Selected Dossier", width - 50);
      doc.text(titleLines, 25, 75, { align: "left" });

      // Fine line separator
      doc.setDrawColor(180, 150, 110);
      doc.setLineWidth(0.5);
      doc.line(25, 120, width - 50, 120);

      // Subtitle
      doc.setFont("times", "normal");
      doc.setFontSize(14);
      doc.setTextColor(90, 80, 70);
      const subLines = doc.splitTextToSize(options.subtitle || "A compilation of diverse records and resources", width - 50);
      doc.text(subLines, 25, 132);

      // Metadata at center bottom
      doc.setFont("times", "bold");
      doc.setFontSize(12);
      doc.setTextColor(60, 45, 30);
      doc.text(options.author || "COMPILED AUTHOR", width / 2, height - 55, { align: "center" });

      doc.setFont("times", "normal");
      doc.setFontSize(10);
      doc.setTextColor(120, 110, 100);
      doc.text(options.organization || "CORPORATE ARCHIVE", width / 2, height - 47, { align: "center" });
      doc.text(options.date || new Date().toLocaleDateString(), width / 2, height - 40, { align: "center" });

      break;
    }

    case "minimal": {
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, width, height, "F");

      // Minimal left-bar accent
      doc.setFillColor(accent);
      doc.rect(0, 0, 6, height, "F");

      // Title
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(32);
      doc.setTextColor(17, 24, 39); // gray-900
      const titleLines = doc.splitTextToSize(options.title || "Project Dossier", width - 50);
      doc.text(titleLines, 25, 80);

      // Subtitle
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(14);
      doc.setTextColor(107, 114, 128); // gray-500
      const subLines = doc.splitTextToSize(options.subtitle || "Integrated document set", width - 50);
      doc.text(subLines, 25, 115);

      // Metadata
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(75, 85, 99); // gray-600
      doc.text(`Prepared by ${options.author || "Author"}`, 25, height - 55);
      doc.text(options.organization || "Department Reference", 25, height - 48);
      doc.text(options.date || new Date().toLocaleDateString(), 25, height - 41);

      break;
    }

    case "corporate":
    default: {
      // Classic deep blue ribbon corporate
      doc.setFillColor(248, 250, 252); // slate-50
      doc.rect(0, 0, width, height, "F");

      // Deep blue header block
      doc.setFillColor(15, 32, 67); // deep dark blue
      doc.rect(0, 0, width, 100, "F");

      // White/Color ribbon separator
      doc.setFillColor(accent);
      doc.rect(0, 98, width, 4, "F");

      // Title in White block
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(26);
      doc.setTextColor(255, 255, 255);
      const titleLines = doc.splitTextToSize(options.title || "EXECUTIVE PORTFOLIO", width - 40);
      doc.text(titleLines, 20, 50);

      // Subtitle in slate text
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(14);
      doc.setTextColor(51, 65, 85); // slate-700
      const subLines = doc.splitTextToSize(options.subtitle || "Consolidated business materials", width - 40);
      doc.text(subLines, 20, 125);

      // Metadata bottom block
      doc.setFillColor(241, 245, 249); // slate-100
      doc.rect(15, height - 65, width - 30, 45, "F");
      doc.setDrawColor(226, 232, 240);
      doc.rect(15, height - 65, width - 30, 45, "D");

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(15, 32, 67);
      doc.text("METADATA PROFILE", 22, height - 55);

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(`PREPARED BY: ${options.author || "Executive Analyst"}`, 22, height - 45);
      doc.text(`ORGANIZATION: ${options.organization || "Enterprise Solutions"}`, 22, height - 38);
      doc.text(`DATE ISSUED: ${options.date || new Date().toLocaleDateString()}`, 22, height - 31);

      break;
    }
  }

  return new Uint8Array(doc.output("arraybuffer"));
}

// Convert extracted DOCX text/HTML, plain text, or Excel tables into nice formatting via jsPDF
function convertDocxToPdf(file: CollatedFile, settings: OutputSettings): Uint8Array {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: settings.pageSize === "letter" ? "letter" : "a4",
  });

  const width = doc.internal.pageSize.getWidth();
  const margin = settings.margins === "none" ? 5 : settings.margins === "slim" ? 12 : 20;
  const contentWidth = width - margin * 2;

  // Add Section Banner Title
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, 12, contentWidth, 14, "F");
  
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.5);
  doc.line(margin, 12, margin + contentWidth, 12);
  doc.line(margin, 26, margin + contentWidth, 26);

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(51, 65, 85);
  doc.text(`SECTION RECORD: ${file.name.toUpperCase()}`, margin + 4, 21);

  // Parse paragraphs from parsed plain text or extract raw paragraphs
  const rawText = file.text || "Empty Word Document Body.";
  const paragraphs = rawText.split("\n").filter(p => p.trim() !== "");

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);

  let currentY = 38;
  const bottomMargin = 20;
  const height = doc.internal.pageSize.getHeight();

  for (const paragraph of paragraphs) {
    const lines = doc.splitTextToSize(paragraph, contentWidth);
    const textHeight = lines.length * 5; // roughly 5mm per line

    // Page overflow safety
    if (currentY + textHeight > height - bottomMargin) {
      doc.addPage();
      currentY = 20; // reset margin on new pages
    }

    doc.text(lines, margin, currentY);
    currentY += textHeight + 4; // textHeight plus paragraph spacing
  }

  return new Uint8Array(doc.output("arraybuffer"));
}

// Draw Excel sheet cells to a nice, structured data grid PDF
function convertXlsxToPdf(file: CollatedFile, settings: OutputSettings): Uint8Array {
  const doc = new jsPDF({
    orientation: "landscape", // Excel is default landscape to fit grid
    unit: "mm",
    format: settings.pageSize === "letter" ? "letter" : "a4",
  });

  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = width - margin * 2;

  const sheetsData = file.xlsxData || {};
  const sheetNames = file.xlsxSheets || Object.keys(sheetsData);

  if (sheetNames.length === 0) {
    doc.setFont("Helvetica", "normal");
    doc.text("Empty Excel Spreadsheet", margin, 30);
    return new Uint8Array(doc.output("arraybuffer"));
  }

  let isFirstSheet = true;

  sheetNames.forEach((sheetName) => {
    const rows = sheetsData[sheetName] || [];
    if (rows.length === 0) return;

    if (!isFirstSheet) {
      doc.addPage();
    }
    isFirstSheet = false;

    // Header banner per sheet
    doc.setFillColor(239, 246, 255);
    doc.rect(margin, 12, contentWidth, 12, "F");
    doc.setDrawColor(191, 219, 254);
    doc.rect(margin, 12, contentWidth, 12, "D");

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text(`SPREADSHEET TAB: ${sheetName} (Source: ${file.name})`, margin + 4, 20);

    // Render cells in a strict landscape grid
    let currentY = 32;
    const cellHeight = 7;
    const colCount = Math.min(10, Math.max(...rows.map(r => r.length))); // limit to 10 cols max, fit gracefully
    const cellWidth = contentWidth / colCount;

    // Font setup
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);

    rows.forEach((row, rIdx) => {
      // Manage page overflow
      if (currentY + cellHeight > height - 15) {
        doc.addPage();
        currentY = 15;
      }

      // Format header rows
      const isHeader = rIdx === 0;
      if (isHeader) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, currentY, contentWidth, cellHeight, "F");
        doc.setFont("Helvetica", "bold");
      } else {
        doc.setFont("Helvetica", "normal");
      }

      for (let cIdx = 0; cIdx < colCount; cIdx++) {
        const x = margin + cIdx * cellWidth;
        const cellValue = String(row[cIdx] !== undefined ? row[cIdx] : "");

        // Trim cell value to avoid spilling to next column
        const limitLength = Math.floor(cellWidth / 1.8);
        const truncatedValue = cellValue.length > limitLength
          ? cellValue.slice(0, limitLength - 2) + ".."
          : cellValue;

        doc.setDrawColor(226, 232, 240);
        doc.rect(x, currentY, cellWidth, cellHeight, "D");
        doc.setTextColor(51, 65, 85);
        doc.text(truncatedValue, x + 2, currentY + 5);
      }

      currentY += cellHeight;
    });
  });

  return new Uint8Array(doc.output("arraybuffer"));
}

// Convert plain text markdown or reports to nice structured pages
function convertTextToPdf(file: CollatedFile, settings: OutputSettings): Uint8Array {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: settings.pageSize === "letter" ? "letter" : "a4",
  });

  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const margin = settings.margins === "none" ? 5 : settings.margins === "slim" ? 12 : 20;
  const contentWidth = width - margin * 2;

  // Header stamp
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, 12, contentWidth, 10, "F");
  doc.setDrawColor(226, 232, 240);
  doc.rect(margin, 12, contentWidth, 10, "D");

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`TEXT DATA: ${file.name}`, margin + 4, 18.5);

  const rawText = file.text || "Empty dataset.";
  const paragraphs = rawText.split("\n");

  doc.setFont("courier", "normal");
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);

  let currentY = 28;
  const lineSpacing = 4.5;

  paragraphs.forEach((line) => {
    const lines = doc.splitTextToSize(line, contentWidth);
    const totalLinesHeight = lines.length * lineSpacing;

    if (currentY + totalLinesHeight > height - 15) {
      doc.addPage();
      currentY = 15;
    }

    doc.text(lines, margin, currentY);
    currentY += totalLinesHeight;
  });

  return new Uint8Array(doc.output("arraybuffer"));
}

function applyImageEdits(
  imgUrl: string,
  rotation: number, // 0, 90, 180, 270
  filter: string,   // "none", "grayscale", "sepia", etc.
  scaleMode?: string,
  watermark?: string
): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      // Compute rotated size
      const isRotated90or270 = rotation === 90 || rotation === 270;
      const width = isRotated90or270 ? img.naturalHeight : img.naturalWidth;
      const height = isRotated90or270 ? img.naturalWidth : img.naturalHeight;

      canvas.width = width;
      canvas.height = height;

      // Apply Filter if supported
      if (filter && filter !== "none") {
        if (filter === "grayscale") ctx.filter = "grayscale(100%)";
        else if (filter === "sepia") ctx.filter = "sepia(100%)";
        else if (filter === "contrast") ctx.filter = "contrast(180%)";
        else if (filter === "invert") ctx.filter = "invert(100%)";
        else if (filter === "blur") ctx.filter = "blur(4px)";
        else if (filter === "vintage") ctx.filter = "sepia(50%) contrast(120%) hue-rotate(-15deg)";
      }

      // Rotate and draw
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

      // Apply Watermark Text if any
      if (watermark && watermark.trim() !== "") {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.font = `bold ${Math.max(20, Math.floor(canvas.width / 20))}px sans-serif`;
        ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        ctx.strokeStyle = "rgba(0, 0, 0, 0.15)";
        ctx.lineWidth = 2;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(-Math.PI / 6); // slight angle
        ctx.fillText(watermark, 0, 0);
        ctx.strokeText(watermark, 0, 0);
      }

      // Convert back to ArrayBuffer
      canvas.toBlob((blob) => {
        if (blob) {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve(reader.result as ArrayBuffer);
          };
          reader.onerror = reject;
          reader.readAsArrayBuffer(blob);
        } else {
          reject(new Error("Canvas conversion to Blob failed"));
        }
      }, "image/jpeg", 0.92);
    };
    img.onerror = () => reject(new Error("Failed to load image for editing"));
    img.src = imgUrl;
  });
}

// Top level compiler executing collation
export async function compileMasterDocument(
  files: CollatedFile[],
  coverPage: CoverPageOptions,
  tocOptions: TableOfContentsOptions,
  settings: OutputSettings,
  autoSummaryText?: string // Optional executive summary drafted by Gemini
): Promise<Uint8Array> {
  const masterDoc = await PDFDocument.create();

  // 1. Cover Page
  if (coverPage.enabled) {
    const coverBytes = drawCoverPage(coverPage);
    const coverPdf = await PDFDocument.load(coverBytes);
    const [importedPage] = await masterDoc.copyPages(coverPdf, [0]);
    masterDoc.addPage(importedPage);
  }

  // 2. Automated Executive Summary Section (If requested)
  if (autoSummaryText && autoSummaryText.trim() !== "") {
    const summaryDoc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: settings.pageSize === "letter" ? "letter" : "a4",
    });

    const w = summaryDoc.internal.pageSize.getWidth();
    const h = summaryDoc.internal.pageSize.getHeight();
    const m = settings.margins === "none" ? 5 : settings.margins === "slim" ? 12 : 20;
    const cWidth = w - m * 2;

    // Header visual band
    summaryDoc.setFillColor(59, 130, 246); // Blue brand color
    summaryDoc.rect(m, 15, cWidth, 16, "F");

    summaryDoc.setFont("Helvetica", "bold");
    summaryDoc.setFontSize(14);
    summaryDoc.setTextColor(255, 255, 255);
    summaryDoc.text("EXECUTIVE SYNTHESIS (AI-ASSISTED)", m + 6, 25);

    // Text splitting
    summaryDoc.setFont("Helvetica", "normal");
    summaryDoc.setFontSize(10);
    summaryDoc.setTextColor(30, 41, 59);

    const paragraphs = autoSummaryText.split("\n\n");
    let cy = 40;

    paragraphs.forEach((p) => {
      const lines = summaryDoc.splitTextToSize(p, cWidth);
      const textH = lines.length * 5;

      if (cy + textH > h - 20) {
        summaryDoc.addPage();
        cy = 20;
      }

      summaryDoc.text(lines, m, cy);
      cy += textH + 6;
    });

    const execSummaryPdf = await PDFDocument.load(new Uint8Array(summaryDoc.output("arraybuffer")));
    const pagestoCopy = Array.from({ length: execSummaryPdf.getPageCount() }, (_, i) => i);
    const copiedPages = await masterDoc.copyPages(execSummaryPdf, pagestoCopy);
    copiedPages.forEach((p) => masterDoc.addPage(p));
  }

  // 3. Document Collation List
  const registryItems: { name: string; pageStart: number }[] = [];

  for (const file of files) {
    // Check start index tracker
    const startingPageNum = masterDoc.getPageCount() + 1;
    registryItems.push({ name: file.name, pageStart: startingPageNum });

    switch (file.type) {
      case "pdf": {
        try {
          const pdfBytes = await file.rawFile.arrayBuffer();
          const parsedPdf = await PDFDocument.load(pdfBytes);
          const maxPages = parsedPdf.getPageCount();

          // Determine selected ranges
          const pagesToInclude = parsePageRanges(file.pdfSelectedRange || "all", maxPages);
          
          if (pagesToInclude.length > 0) {
            const copiedPages = await masterDoc.copyPages(parsedPdf, pagesToInclude);
            
            const helveticaObliqueFont = await masterDoc.embedFont(StandardFonts.HelveticaBoldOblique);
            const rotations = file.pdfPageRotations || {};

            copiedPages.forEach((page, index) => {
              // 1-based index in original PDF page range
              const originalPageNum = pagesToInclude[index] + 1;
              const pageRotation = rotations[originalPageNum];
              
              if (pageRotation !== undefined && pageRotation !== 0) {
                const currentRot = page.getRotation().angle;
                page.setRotation(degrees((currentRot + pageRotation) % 360));
              }

              if (file.pdfWatermark && file.pdfWatermark.trim() !== "") {
                const { width, height } = page.getSize();
                page.drawText(file.pdfWatermark, {
                  x: width / 2 - 120,
                  y: height / 2,
                  size: 32,
                  font: helveticaObliqueFont,
                  color: rgb(0.8, 0.8, 0.8),
                  opacity: 0.35,
                  rotate: degrees(45),
                });
              }

              masterDoc.addPage(page);
            });
          }
        } catch (err) {
          console.error(`Failed to load PDF sub-page: ${file.name}`, err);
        }
        break;
      }

      case "docx": {
        const docxBytes = convertDocxToPdf(file, settings);
        const subPdf = await PDFDocument.load(docxBytes);
        const pages = Array.from({ length: subPdf.getPageCount() }, (_, i) => i);
        const copied = await masterDoc.copyPages(subPdf, pages);
        copied.forEach((p) => masterDoc.addPage(p));
        break;
      }

      case "xlsx": {
        const xlsxBytes = convertXlsxToPdf(file, settings);
        const subPdf = await PDFDocument.load(xlsxBytes);
        const pages = Array.from({ length: subPdf.getPageCount() }, (_, i) => i);
        const copied = await masterDoc.copyPages(subPdf, pages);
        copied.forEach((p) => masterDoc.addPage(p));
        break;
      }

      case "text": {
        const textBytes = convertTextToPdf(file, settings);
        const subPdf = await PDFDocument.load(textBytes);
        const pages = Array.from({ length: subPdf.getPageCount() }, (_, i) => i);
        const copied = await masterDoc.copyPages(subPdf, pages);
        copied.forEach((p) => masterDoc.addPage(p));
        break;
      }

      case "image": {
        // High quality raw scaling image layout onto fit-to-page PDF
        const page = masterDoc.addPage([595.28, 841.89]); // A4 in standard PDF points
        const { width: pWidth, height: pHeight } = page.getSize();

        try {
          let imgUrl = file.imagePreviewUrl;
          if (!imgUrl) {
            imgUrl = await new Promise<string>((resolve, reject) => {
              const r = new FileReader();
              r.onload = () => resolve(r.result as string);
              r.onerror = reject;
              r.readAsDataURL(file.rawFile);
            });
          }

          const processedBytes = await applyImageEdits(
            imgUrl,
            file.imageRotation || 0,
            file.imageFilter || "none",
            file.imageScaleMode || "fit",
            file.imageWatermark
          );

          const embeddedImage = await masterDoc.embedJpg(processedBytes);
          const { width: iWidth, height: iHeight } = embeddedImage.size();
          
          let scaledW = iWidth;
          let scaledH = iHeight;
          let dx = 0;
          let dy = 0;

          const scaleMode = file.imageScaleMode || "fit";

          if (scaleMode === "stretch") {
            scaledW = pWidth;
            scaledH = pHeight;
            dx = 0;
            dy = 0;
          } else if (scaleMode === "fill") {
            const ratio = Math.max(pWidth / iWidth, pHeight / iHeight);
            scaledW = iWidth * ratio;
            scaledH = iHeight * ratio;
            dx = (pWidth - scaledW) / 2;
            dy = (pHeight - scaledH) / 2;
          } else {
            const maxW = pWidth - 40;
            const maxH = pHeight - 80;
            const ratio = Math.min(maxW / iWidth, maxH / iHeight);
            scaledW = iWidth * ratio;
            scaledH = iHeight * ratio;
            dx = (pWidth - scaledW) / 2;
            dy = (pHeight - scaledH) / 2;
          }

          page.drawImage(embeddedImage, {
            x: dx,
            y: dy,
            width: scaledW,
            height: scaledH,
          });

          if (scaleMode === "fit") {
            const helveticaFont = await masterDoc.embedFont(StandardFonts.HelveticaBold);
            page.drawText(`Image Section: ${file.name}`, {
              x: 20,
              y: pHeight - 30,
              size: 10,
              font: helveticaFont,
              color: rgb(0.2, 0.27, 0.35),
            });

            page.drawLine({
              start: { x: 20, y: pHeight - 40 },
              end: { x: pWidth - 20, y: pHeight - 40 },
              thickness: 0.5,
              color: rgb(0.8, 0.82, 0.85),
            });
          }

        } catch (err) {
          console.error("Failed to embed image in PDF:", err);
        }
        break;
      }
    }
  }

  // 4. Custom Table of Contents insert optionally (Right after cover/summary)
  if (tocOptions.enabled && registryItems.length > 0) {
    const tocDoc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: settings.pageSize === "letter" ? "letter" : "a4",
    });

    const w = tocDoc.internal.pageSize.getWidth();
    const h = tocDoc.internal.pageSize.getHeight();
    const m = settings.margins === "none" ? 5 : settings.margins === "slim" ? 12 : 20;
    const cWidth = w - m * 2;

    // Table of contents banner
    tocDoc.setFillColor(30, 41, 59); // deep slate slate-800
    tocDoc.rect(m, 15, cWidth, 14, "F");

    tocDoc.setFont("Helvetica", "bold");
    tocDoc.setFontSize(12);
    tocDoc.setTextColor(255, 255, 255);
    tocDoc.text(tocOptions.title.toUpperCase() || "TABLE OF CONTENTS", m + 6, 24);

    tocDoc.setFont("Helvetica", "normal");
    tocDoc.setFontSize(10);
    tocDoc.setTextColor(51, 65, 85);

    let ty = 42;
    registryItems.forEach((item, idx) => {
      tocDoc.setFont("Helvetica", "bold");
      tocDoc.text(`${idx + 1}.`, m + 4, ty);
      
      tocDoc.setFont("Helvetica", "normal");
      tocDoc.text(item.name, m + 12, ty);

      if (tocOptions.includePageNumbers) {
        // Draw dotted ledger lines
        tocDoc.setFont("courier", "normal");
        tocDoc.setTextColor(203, 213, 225);
        tocDoc.text(".......................................................................", m + 85, ty);

        tocDoc.setFont("Helvetica", "bold");
        tocDoc.setTextColor(51, 65, 85);
        tocDoc.text(`Page ${item.pageStart}`, w - m - 18, ty);
      }

      ty += 10;
    });

    const tocPdf = await PDFDocument.load(new Uint8Array(tocDoc.output("arraybuffer")));
    const [importedToc] = await masterDoc.copyPages(tocPdf, [0]);
    
    // Insert TOC right after cover/summary cleanly or at page 1/2
    const targetTocIndex = coverPage.enabled ? 1 : 0;
    masterDoc.insertPage(targetTocIndex, importedToc);
  }

  // 5. Post-process Page Numbering & Footer stamping
  if (settings.pageNumbering !== "none") {
    const pageCount = masterDoc.getPageCount();
    const font = await masterDoc.embedFont(StandardFonts.HelveticaOblique);
    const boldFont = await masterDoc.embedFont(StandardFonts.HelveticaBold);

    // Loop through and stamps
    for (let i = 0; i < pageCount; i++) {
      // Avoid stamping the cover page if enabled
      if (coverPage.enabled && i === 0) continue;

      const page = masterDoc.getPage(i);
      const { width, height } = page.getSize();
      const pageText = `${settings.pageNumberPrefix || "Page"} ${i + 1} of ${pageCount}`;

      // Footer numbering options
      if (settings.pageNumbering === "bottom-right") {
        page.drawText(pageText, {
          x: width - 85,
          y: 20,
          size: 8,
          font,
          color: rgb(0.4, 0.45, 0.5),
        });
      } else if (settings.pageNumbering === "bottom-center") {
        page.drawText(pageText, {
          x: width / 2 - 25,
          y: 20,
          size: 8,
          font,
          color: rgb(0.4, 0.45, 0.5),
        });
      } else if (settings.pageNumbering === "header-right") {
        page.drawText(pageText, {
          x: width - 85,
          y: height - 25,
          size: 8,
          font,
          color: rgb(0.4, 0.45, 0.5),
        });
      }

      // File name in header option
      if (settings.fileNameInHeader) {
        page.drawText("Collated Master Portfolio", {
          x: 25,
          y: height - 25,
          size: 8,
          font: boldFont,
          color: rgb(0.5, 0.55, 0.6),
        });
        page.drawLine({
          start: { x: 25, y: height - 30 },
          end: { x: width - 25, y: height - 30 },
          thickness: 0.3,
          color: rgb(0.85, 0.87, 0.9),
        });
      }
    }
  }

  return await masterDoc.save();
}
