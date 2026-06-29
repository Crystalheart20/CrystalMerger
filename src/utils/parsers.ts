import * as XLSX from "xlsx";
import { PDFDocument } from "pdf-lib";

let mammothLoadingPromise: Promise<any> | null = null;

function loadMammothScript(): Promise<any> {
  const win = window as any;
  if (win.mammoth) {
    return Promise.resolve(win.mammoth);
  }

  if (mammothLoadingPromise) {
    return mammothLoadingPromise;
  }

  mammothLoadingPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js";
    script.crossOrigin = "anonymous";
    script.onload = () => {
      if (win.mammoth) {
        resolve(win.mammoth);
      } else {
        reject(new Error("Mammoth loaded but 'window.mammoth' is not defined."));
      }
    };
    script.onerror = () => {
      mammothLoadingPromise = null; // reset to allow retry
      reject(new Error("Failed to download Mammoth library from CDN. Please check your internet connection and try again."));
    };
    document.head.appendChild(script);
  });

  return mammothLoadingPromise;
}

export async function parseFileToCollated(
  file: File
): Promise<{
  text: string;
  html?: string;
  pdfPagesCount?: number;
  xlsxSheets?: string[];
  xlsxData?: Record<string, string[][]>;
  imagePreviewUrl?: string;
}> {
  const fileType = getSimpleFileType(file);
  const arrayBuffer = await file.arrayBuffer();

  switch (fileType) {
    case "docx": {
      try {
        const mammothObj = await loadMammothScript();
        const result = await mammothObj.convertToHtml({ arrayBuffer });
        const textResult = await mammothObj.extractRawText({ arrayBuffer });
        return {
          html: result.value || "<p>Empty document</p>",
          text: textResult.value || "",
        };
      } catch (err: any) {
        console.error("Error parsing Word file:", err);
        return {
          text: `[Unparsed Word Document: ${file.name}]`,
          html: `<div class="p-4 bg-red-50 text-red-500 rounded border border-red-100">Failed to parse Word document: ${err.message}</div>`,
        };
      }
    }

    case "xlsx": {
      try {
        const workbook = XLSX.read(arrayBuffer, { type: "array" });
        const sheetsList = workbook.SheetNames;
        const xlsxData: Record<string, string[][]> = {};
        let combinedText = "";
        let combinedHtml = "";

        sheetsList.forEach((sheetName) => {
          const sheet = workbook.Sheets[sheetName];
          // Convert sheet to JSON array of arrays
          const sheetRows = XLSX.utils.sheet_to_json<string[]>(sheet, {
            header: 1,
            defval: "",
          });
          
          xlsxData[sheetName] = sheetRows as string[][];

          // Sub-text for Gemini
          combinedText += `\nSheet: ${sheetName}\n`;
          sheetRows.forEach((row: any) => {
            combinedText += row.join("\t") + "\n";
          });

          // Table HTML representation
          let tableHtml = `<div class="mb-6 overflow-x-auto"><h4 class="text-sm font-semibold text-slate-700 mb-2 border-b pb-1">Sheet: ${sheetName}</h4><table class="min-w-full divide-y divide-slate-200 border text-xs text-left">`;
          sheetRows.forEach((row: any, rIdx: number) => {
            const isHeader = rIdx === 0;
            tableHtml += `<tr class="${isHeader ? "bg-slate-50 font-semibold" : ""}">`;
            row.forEach((cell: any) => {
              tableHtml += `<td class="px-2 py-1.5 border border-slate-100 whitespace-nowrap">${cell !== undefined ? cell : ""}</td>`;
            });
            tableHtml += `</tr>`;
          });
          tableHtml += "</table></div>";
          combinedHtml += tableHtml;
        });

        return {
          text: combinedText,
          html: combinedHtml,
          xlsxSheets: sheetsList,
          xlsxData,
        };
      } catch (err: any) {
        console.error("Error parsing Excel file:", err);
        return {
          text: `[Unparsed Excel Spreadsheet: ${file.name}]`,
          html: `<div class="p-4 bg-red-50 text-red-500 rounded border border-red-100 font-sans">Failed to parse Excel sheet: ${err.message}</div>`,
        };
      }
    }

    case "pdf": {
      try {
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const pagesCount = pdfDoc.getPageCount();
        
        // Approximate text extraction securely client-side without heavy dependency
        // We'll read document keywords/titles or populate a structured label.
        const title = pdfDoc.getTitle() || "";
        const author = pdfDoc.getAuthor() || "";
        const subject = pdfDoc.getSubject() || "";
        
        const textInfo = `PDF Document Title: ${title || file.name}\nAuthor: ${author}\nSubject: ${subject}\nTotal Pages: ${pagesCount}`;
        
        return {
          text: textInfo,
          pdfPagesCount: pagesCount,
        };
      } catch (err: any) {
        console.error("Error loading PDF:", err);
        return {
          text: `[Error reading PDF File: ${file.name}]`,
          pdfPagesCount: 1,
        };
      }
    }

    case "image": {
      // Create local preview URL
      const previewUrl = URL.createObjectURL(file);
      return {
        text: `[Image Document: ${file.name} - Resolution/Aspect handled dynamically]`,
        imagePreviewUrl: previewUrl,
      };
    }

    case "text":
    default: {
      const decoder = new TextDecoder("utf-8");
      const text = decoder.decode(arrayBuffer);
      const isCsv = file.name.endsWith(".csv");
      
      let htmlRep = `<pre class="p-4 bg-slate-50 border rounded font-mono text-xs whitespace-pre-wrap">${text}</pre>`;
      
      if (isCsv) {
        try {
          const workbook = XLSX.read(arrayBuffer, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: "" }) as string[][];
          
          let tableHtml = `<div class="overflow-x-auto"><table class="min-w-full divide-y divide-slate-200 border text-xs text-left">`;
          rows.forEach((row, rIdx) => {
            const isHeader = rIdx === 0;
            tableHtml += `<tr class="${isHeader ? "bg-slate-50 font-semibold" : ""}">`;
            row.forEach((cell) => {
              tableHtml += `<td class="px-2 py-1.5 border border-slate-100 whitespace-nowrap">${cell}</td>`;
            });
            tableHtml += `</tr>`;
          });
          tableHtml += "</table></div>";
          htmlRep = tableHtml;
        } catch {
          // Fallback to pre
        }
      }

      return {
        text,
        html: htmlRep,
      };
    }
  }
}

function getSimpleFileType(file: File): "pdf" | "docx" | "xlsx" | "image" | "text" {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) return "pdf";
  if (name.endsWith(".docx")) return "docx";
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) return "xlsx";
  if (
    name.endsWith(".png") ||
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg") ||
    name.endsWith(".webp") ||
    name.endsWith(".gif")
  ) {
    return "image";
  }
  return "text";
}
