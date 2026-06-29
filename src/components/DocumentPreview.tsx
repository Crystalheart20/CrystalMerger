import React, { useState, useRef } from "react";
import { 
  Eye, 
  Edit2, 
  FileText, 
  AlertCircle, 
  Trash2, 
  RotateCw, 
  Sliders, 
  Type, 
  CheckSquare, 
  Square, 
  Image as ImageIcon,
  Bold,
  Italic,
  Heading1,
  Heading2,
  List,
  Search,
  Plus,
  Minus,
  FileSpreadsheet,
  Code,
  BookOpen,
  Table,
  Columns,
  Sparkles,
  Undo2
} from "lucide-react";
import { CollatedFile } from "../types";

interface DocumentPreviewProps {
  file: CollatedFile | null;
  onUpdateFile: (updated: CollatedFile) => void;
  onRemoveFile: (id: string) => void;
}

// Local range parser
function parsePageRangesLocal(rangeStr: string, maxPages: number): number[] {
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

function getCSSFilterString(filter?: string): string {
  if (!filter) return "none";
  switch (filter) {
    case "grayscale": return "grayscale(100%)";
    case "sepia": return "sepia(100%)";
    case "contrast": return "contrast(180%)";
    case "invert": return "invert(100%)";
    case "blur": return "blur(2px)";
    case "vintage": return "sepia(50%) contrast(120%) hue-rotate(-15deg)";
    default: return "none";
  }
}

// Generate Excel Column Labels (A, B, C ... Z, AA ...)
function getColumnLabel(index: number): string {
  let label = "";
  let temp = index;
  while (temp >= 0) {
    label = String.fromCharCode((temp % 26) + 65) + label;
    temp = Math.floor(temp / 26) - 1;
  }
  return label;
}

export function DocumentPreview({ file, onUpdateFile, onRemoveFile }: DocumentPreviewProps) {
  const [activeTab, setActiveTab] = useState<"preview" | "edit">("preview");
  const [excelEditMode, setExcelEditMode] = useState<"view" | "edit">("view");
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [searchFeedback, setSearchFeedback] = useState("");
  const [showFindReplace, setShowFindReplace] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  if (!file) {
    return (
      <div className="h-full min-h-[400px] flex flex-col items-center justify-center p-8 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center">
        <FileText className="w-12 h-12 text-slate-350 stroke-[1.2] mb-3" />
        <h4 className="font-semibold text-slate-700 text-sm">No Document Selected</h4>
        <p className="text-xs text-slate-400 max-w-sm mt-1">
          Click on any file in the workspace queue to view, live-edit, adjust settings, and inspect parsed details before merging.
        </p>
      </div>
    );
  }

  // Text changes handler (also regenerates HTML for rendering)
  const handleTextChange = (text: string) => {
    onUpdateFile({
      ...file,
      text,
      html: file.type === "docx" 
        ? `<div class="prose prose-sm prose-slate font-sans">${text.split("\n").map(p => p.trim() ? `<p>${p}</p>` : "<br/>").join("")}</div>`
        : `<pre class="p-4 bg-slate-50 border border-slate-100 rounded font-mono text-xs whitespace-pre-wrap">${text}</pre>`
    });
  };

  // Helper formatting injectors for textarea
  const injectTextFormat = (prefix: string, suffix: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentVal = file.text || "";
    const selected = currentVal.substring(start, end);

    const replacement = prefix + (selected || "text") + suffix;
    const newVal = currentVal.substring(0, start) + replacement + currentVal.substring(end);

    handleTextChange(newVal);

    // Re-focus and set selection
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + (selected || "text").length);
    }, 50);
  };

  // Search & Replace logic
  const handleReplaceAll = () => {
    if (!findText) {
      setSearchFeedback("Please enter a term to search for.");
      return;
    }
    const currentVal = file.text || "";
    const escapedSearch = findText.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(escapedSearch, "g");
    const matches = (currentVal.match(regex) || []).length;

    if (matches === 0) {
      setSearchFeedback("No occurrences found.");
      return;
    }

    const newVal = currentVal.replace(regex, replaceText);
    handleTextChange(newVal);
    setSearchFeedback(`Successfully replaced ${matches} occurrence(s)!`);
    setTimeout(() => setSearchFeedback(""), 3500);
  };

  // PDF Page calculations
  const pdfPagesCount = file.pdfPagesCount || 0;
  const range = file.pdfSelectedRange || "all";
  const includedIndices = parsePageRangesLocal(range, pdfPagesCount);

  const isPageSelected = (pageNum: number) => {
    return includedIndices.includes(pageNum - 1);
  };

  const handleTogglePage = (pageNum: number) => {
    const pageIdx = pageNum - 1;
    let newIndices = [...includedIndices];
    if (newIndices.includes(pageIdx)) {
      newIndices = newIndices.filter(idx => idx !== pageIdx);
    } else {
      newIndices = [...newIndices, pageIdx].sort((a, b) => a - b);
    }

    if (newIndices.length === pdfPagesCount) {
      onUpdateFile({ ...file, pdfSelectedRange: "all" });
    } else if (newIndices.length === 0) {
      onUpdateFile({ ...file, pdfSelectedRange: "" });
    } else {
      const rangeStr = newIndices.map(idx => idx + 1).join(",");
      onUpdateFile({ ...file, pdfSelectedRange: rangeStr });
    }
  };

  const handleRotatePage = (pageNum: number) => {
    const rotations = file.pdfPageRotations || {};
    const currentRotation = rotations[pageNum] || 0;
    const nextRotation = (currentRotation + 90) % 360;
    onUpdateFile({
      ...file,
      pdfPageRotations: {
        ...rotations,
        [pageNum]: nextRotation
      }
    });
  };

  const handleRotateImage = () => {
    const currentRotation = file.imageRotation || 0;
    const nextRotation = (currentRotation + 90) % 360;
    onUpdateFile({ ...file, imageRotation: nextRotation });
  };

  // spreadsheet grid cell editors
  const currentSheet = file.xlsxSelectedSheet || (file.xlsxSheets && file.xlsxSheets[0]) || "";
  const spreadsheetData = file.xlsxData || {};
  const sheetRows = spreadsheetData[currentSheet] || [];

  // Re-generate both Excel HTML visual representation and CSV-type text
  const updateExcelState = (updatedData: Record<string, string[][]>) => {
    const sheetsList = file.xlsxSheets || Object.keys(updatedData);
    let combinedText = "";
    let combinedHtml = "";

    sheetsList.forEach((sheetName) => {
      const sRows = updatedData[sheetName] || [];
      combinedText += `\nSheet: ${sheetName}\n`;
      sRows.forEach((row) => {
        combinedText += row.join("\t") + "\n";
      });

      let tableHtml = `<div class="mb-6 overflow-x-auto"><h4 class="text-sm font-semibold text-slate-700 mb-2 border-b pb-1">Sheet: ${sheetName}</h4><table class="min-w-full divide-y divide-slate-200 border text-xs text-left">`;
      sRows.forEach((row, rIdx) => {
        const isHeader = rIdx === 0;
        tableHtml += `<tr class="${isHeader ? "bg-slate-50 font-semibold" : ""}">`;
        row.forEach((cell) => {
          tableHtml += `<td class="px-2 py-1.5 border border-slate-100 whitespace-nowrap">${cell !== undefined ? cell : ""}</td>`;
        });
        tableHtml += `</tr>`;
      });
      tableHtml += "</table></div>";
      combinedHtml += tableHtml;
    });

    onUpdateFile({
      ...file,
      xlsxData: updatedData,
      text: combinedText,
      html: combinedHtml,
    });
  };

  const handleExcelCellChange = (rIdx: number, cIdx: number, val: string) => {
    const nextData = JSON.parse(JSON.stringify(spreadsheetData));
    if (!nextData[currentSheet]) {
      nextData[currentSheet] = [];
    }
    // expand rows if needed
    while (nextData[currentSheet].length <= rIdx) {
      nextData[currentSheet].push([]);
    }
    // expand cells if needed
    while (nextData[currentSheet][rIdx].length <= cIdx) {
      nextData[currentSheet][rIdx].push("");
    }

    nextData[currentSheet][rIdx][cIdx] = val;
    updateExcelState(nextData);
  };

  const handleAddExcelRow = () => {
    const nextData = JSON.parse(JSON.stringify(spreadsheetData));
    const rows = nextData[currentSheet] || [];
    const colCount = rows.length > 0 ? rows[0].length : 5;
    const newRow = Array(colCount).fill("");
    
    if (!nextData[currentSheet]) {
      nextData[currentSheet] = [];
    }
    nextData[currentSheet].push(newRow);
    updateExcelState(nextData);
  };

  const handleRemoveExcelRow = () => {
    const nextData = JSON.parse(JSON.stringify(spreadsheetData));
    const rows = nextData[currentSheet] || [];
    if (rows.length <= 1) return; // keep at least 1 header/row
    nextData[currentSheet].pop();
    updateExcelState(nextData);
  };

  const handleAddExcelColumn = () => {
    const nextData = JSON.parse(JSON.stringify(spreadsheetData));
    const rows = nextData[currentSheet] || [];
    if (rows.length === 0) {
      nextData[currentSheet] = [["Column A", "", "", "", ""]];
    } else {
      rows.forEach((row: string[]) => {
        row.push("");
      });
    }
    updateExcelState(nextData);
  };

  const handleRemoveExcelColumn = () => {
    const nextData = JSON.parse(JSON.stringify(spreadsheetData));
    const rows = nextData[currentSheet] || [];
    if (rows.length === 0 || rows[0].length <= 1) return;
    rows.forEach((row: string[]) => {
      row.pop();
    });
    updateExcelState(nextData);
  };

  // Raw Word/Text word stats
  const wordCount = (file.text || "").split(/\s+/).filter(Boolean).length;
  const charCount = (file.text || "").length;
  const readTime = Math.max(1, Math.round(wordCount / 200));

  return (
    <div className="bg-white rounded-xl shadow-xs border border-slate-100 flex flex-col h-full overflow-hidden min-h-[460px]">
      {/* File Header Details */}
      <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex flex-wrap gap-3 items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="bg-blue-50 text-blue-600 px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold uppercase shrink-0 tracking-wider">
            {file.type}
          </div>
          <div className="min-w-0">
            <h4 className="font-semibold text-slate-800 text-sm truncate" title={file.name}>
              {file.name}
            </h4>
            <p className="text-xs text-slate-400">
              {(file.size / 1024).toFixed(1)} KB • Type: <span className="capitalize">{file.type}</span>
            </p>
          </div>
        </div>

        {/* Global tab Switchers */}
        <div className="flex items-center gap-2">
          {(file.type === "docx" || file.type === "text") && (
            <div className="flex bg-slate-200/60 p-0.5 rounded-lg border border-slate-200/20">
              <button
                type="button"
                id="btn-tab-preview"
                onClick={() => setActiveTab("preview")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  activeTab === "preview" 
                    ? "bg-white text-slate-700 shadow-xs" 
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Doc View</span>
              </button>
              <button
                type="button"
                id="btn-tab-edit"
                onClick={() => setActiveTab("edit")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  activeTab === "edit" 
                    ? "bg-white text-slate-700 shadow-xs" 
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Text Editor</span>
              </button>
            </div>
          )}

          {file.type === "xlsx" && (
            <div className="flex bg-slate-200/60 p-0.5 rounded-lg border border-slate-200/20">
              <button
                type="button"
                onClick={() => setExcelEditMode("view")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  excelEditMode === "view" 
                    ? "bg-white text-slate-700 shadow-xs" 
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>View Sheet</span>
              </button>
              <button
                type="button"
                onClick={() => setExcelEditMode("edit")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  excelEditMode === "edit" 
                    ? "bg-white text-slate-700 shadow-xs" 
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Interactive Grid</span>
              </button>
            </div>
          )}

          <button
            type="button"
            id="btn-delete-preview"
            onClick={() => onRemoveFile(file.id)}
            title="Remove from project"
            className="p-1.5 rounded-lg border border-red-100 bg-red-50 hover:bg-red-100 text-red-650 transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Primary Preview Canvas */}
      <div className="flex-1 p-5 overflow-y-auto max-h-[600px]">
        {/* TEXT & DOCX ACTIVE WYSIWYG TEXT EDITOR */}
        {activeTab === "edit" && (file.type === "docx" || file.type === "text") ? (
          <div className="flex flex-col h-full gap-3">
            
            {/* Rich Format Toolbar & Utilities */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  title="Make Bold"
                  onClick={() => injectTextFormat("**", "**")}
                  className="p-1.5 rounded hover:bg-slate-200 text-slate-600 transition-colors"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Make Italic"
                  onClick={() => injectTextFormat("*", "*")}
                  className="p-1.5 rounded hover:bg-slate-200 text-slate-600 transition-colors"
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>
                <div className="w-px h-5 bg-slate-200 mx-1"></div>
                <button
                  type="button"
                  title="Heading 1"
                  onClick={() => injectTextFormat("# ", "")}
                  className="p-1.5 rounded hover:bg-slate-200 text-slate-600 transition-colors"
                >
                  <Heading1 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Heading 2"
                  onClick={() => injectTextFormat("## ", "")}
                  className="p-1.5 rounded hover:bg-slate-200 text-slate-600 transition-colors"
                >
                  <Heading2 className="w-3.5 h-3.5" />
                </button>
                <div className="w-px h-5 bg-slate-200 mx-1"></div>
                <button
                  type="button"
                  title="Bulleted List Item"
                  onClick={() => injectTextFormat("- ", "")}
                  className="p-1.5 rounded hover:bg-slate-200 text-slate-600 transition-colors"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Insert Quote block"
                  onClick={() => injectTextFormat("> ", "")}
                  className="p-1.5 rounded hover:bg-slate-200 text-slate-600 transition-colors"
                >
                  <Code className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Insert Table blueprint"
                  onClick={() => injectTextFormat("\n| Header A | Header B |\n| --- | --- |\n| Cell 1 | Cell 2 |\n", "")}
                  className="p-1.5 rounded hover:bg-slate-200 text-slate-600 transition-colors"
                >
                  <Table className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Find and replace toggle button */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowFindReplace(!showFindReplace)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-colors font-medium ${
                    showFindReplace ? "bg-blue-100 text-blue-700" : "hover:bg-slate-200 text-slate-600"
                  }`}
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Find & Replace</span>
                </button>
              </div>
            </div>

            {/* Expandable Find and Replace Drawer */}
            {showFindReplace && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2 animate-fadeIn">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 mb-1 uppercase">Search For</label>
                    <input
                      type="text"
                      placeholder="Find term..."
                      value={findText}
                      onChange={(e) => setFindText(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-200 outline-none focus:border-blue-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 mb-1 uppercase">Replace With</label>
                    <input
                      type="text"
                      placeholder="Replace term..."
                      value={replaceText}
                      onChange={(e) => setReplaceText(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-200 outline-none focus:border-blue-500 bg-white"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-blue-600 font-medium font-mono">{searchFeedback}</span>
                  <button
                    type="button"
                    onClick={handleReplaceAll}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded text-xs font-semibold transition-all"
                  >
                    Replace All
                  </button>
                </div>
              </div>
            )}

            {/* Textarea text field */}
            <div className="relative">
              <textarea
                ref={textareaRef}
                id="raw-text-preview-editor"
                className="w-full min-h-[320px] p-4 font-mono text-xs rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none resize-y text-slate-700 leading-relaxed shadow-inner"
                value={file.text || ""}
                onChange={(e) => handleTextChange(e.target.value)}
                placeholder="Write, paste or format custom content to merge..."
              />
            </div>

            {/* Live Stats display footer */}
            <div className="flex justify-between items-center text-[10px] text-slate-400 px-1">
              <div className="flex gap-4">
                <span>Words: <strong className="text-slate-600">{wordCount}</strong></span>
                <span>Characters: <strong className="text-slate-600">{charCount}</strong></span>
              </div>
              <span>Estimated Reading Time: <strong className="text-slate-600">{readTime} min</strong></span>
            </div>
          </div>
        ) : (
          /* DISPLAY VIEWS */
          <div className="h-full space-y-6">
            
            {/* PDF PAGE MANAGEMENT BOARD */}
            {file.type === "pdf" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Page ranges extract */}
                  <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 space-y-3">
                    <div className="flex items-center gap-1.5 text-blue-900 font-semibold text-xs">
                      <Sliders className="w-4 h-4" />
                      <span className="uppercase tracking-wider">Collate Preferences</span>
                    </div>
                    <p className="text-[11px] text-blue-700 leading-normal">
                      Specify page range or click pages in the visual layout below to include/exclude them.
                    </p>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">EXTRACT RANGE</label>
                      <input
                        type="text"
                        id="pdf-range-input"
                        value={file.pdfSelectedRange || "all"}
                        onChange={(e) => onUpdateFile({ ...file, pdfSelectedRange: e.target.value })}
                        className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 outline-none focus:border-blue-500 bg-white"
                        placeholder="e.g. 1, 3, 5-8"
                      />
                    </div>
                  </div>

                  {/* PDF Watermarks */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-center gap-1.5 text-slate-800 font-semibold text-xs">
                      <Type className="w-4 h-4" />
                      <span className="uppercase tracking-wider">PDF Watermark</span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-normal">
                      Stamps a transparent overlay text diagonally across all compiled pages in this PDF.
                    </p>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">WATERMARK TEXT</label>
                      <input
                        type="text"
                        id="pdf-watermark-input"
                        value={file.pdfWatermark || ""}
                        onChange={(e) => onUpdateFile({ ...file, pdfWatermark: e.target.value })}
                        className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 outline-none focus:border-blue-500 bg-white"
                        placeholder="e.g. CONFIDENTIAL, DRAFT, INTERNAL USE"
                      />
                    </div>
                  </div>
                </div>

                {/* Visual grid checklist */}
                {pdfPagesCount > 0 && (
                  <div className="border border-slate-150 rounded-xl p-5 bg-white space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="font-semibold text-slate-800 text-xs uppercase tracking-wider">Visual Page Editor ({pdfPagesCount} Pages)</h5>
                        <p className="text-[11px] text-slate-400">Toggle checkboxes to exclude pages. Click rotate buttons to turn individual pages.</p>
                      </div>
                      <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
                        {includedIndices.length} of {pdfPagesCount} Active
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[340px] overflow-y-auto p-1 bg-slate-50/50 border border-dashed rounded-lg">
                      {Array.from({ length: pdfPagesCount }, (_, i) => i + 1).map((pageNum) => {
                        const selected = isPageSelected(pageNum);
                        const rotation = (file.pdfPageRotations || {})[pageNum] || 0;

                        return (
                          <div 
                            key={pageNum}
                            className={`p-3 rounded-lg border bg-white transition-all duration-200 flex flex-col justify-between h-36 ${
                              selected 
                                ? "border-blue-200 shadow-xs ring-2 ring-blue-500/5" 
                                : "opacity-50 border-slate-200"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <button
                                type="button"
                                onClick={() => handleTogglePage(pageNum)}
                                className="flex items-center gap-1.5 focus:outline-none"
                              >
                                {selected ? (
                                  <CheckSquare className="w-4 h-4 text-blue-600" />
                                ) : (
                                  <Square className="w-4 h-4 text-slate-350" />
                                )}
                                <span className="font-semibold text-xs text-slate-700">Page {pageNum}</span>
                              </button>
                            </div>

                            {/* Rotating Thumbnail */}
                            <div className="flex-1 flex items-center justify-center py-2">
                              <div 
                                className="w-10 h-14 bg-slate-100 rounded border border-slate-300 relative shadow-2xs transition-transform duration-300 flex flex-col justify-between p-1 overflow-hidden"
                                style={{ transform: `rotate(${rotation}deg)` }}
                              >
                                <div className="w-5 h-1.5 bg-slate-300 rounded-xs"></div>
                                <div className="w-full space-y-1">
                                  <div className="w-full h-0.5 bg-slate-200"></div>
                                  <div className="w-full h-0.5 bg-slate-200"></div>
                                </div>
                                <span className="text-[7px] text-slate-400 font-mono self-end block mt-auto">{pageNum}</span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between border-t border-slate-100 pt-2 mt-1">
                              <span className="text-[9px] text-slate-400 font-mono">{rotation}°</span>
                              <button
                                type="button"
                                title="Rotate 90 degrees clockwise"
                                onClick={() => handleRotatePage(pageNum)}
                                className="p-1 rounded bg-slate-50 hover:bg-slate-100 border text-slate-600 transition-all cursor-pointer"
                              >
                                <RotateCw className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* IMAGES INTERACTIVE CANVASES */}
            {file.type === "image" && file.imagePreviewUrl && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                  
                  {/* Left Controls column */}
                  <div className="md:col-span-5 space-y-4">
                    
                    {/* Live formatting tools */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                      
                      {/* Orientations */}
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Orientation</label>
                        <button
                          type="button"
                          onClick={handleRotateImage}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white hover:bg-slate-100 border text-slate-700 rounded-lg text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                        >
                          <RotateCw className="w-4 h-4 text-blue-600" />
                          <span>Rotate 90° Clockwise ({file.imageRotation || 0}°)</span>
                        </button>
                      </div>

                      {/* Scales */}
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Page Fit / Margins</label>
                        <div className="grid grid-cols-3 gap-1.5">
                          {(["fit", "fill", "stretch"] as const).map((mode) => (
                            <button
                              key={mode}
                              type="button"
                              onClick={() => onUpdateFile({ ...file, imageScaleMode: mode })}
                              className={`py-1.5 px-2 text-[10px] font-semibold border rounded-lg transition-all capitalize ${
                                (file.imageScaleMode || "fit") === mode
                                  ? "bg-slate-800 text-white border-transparent"
                                  : "bg-white hover:bg-slate-100 text-slate-600 border-slate-200"
                              }`}
                            >
                              {mode}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Image watermarking text */}
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Watermark Text</label>
                        <input
                          type="text"
                          value={file.imageWatermark || ""}
                          onChange={(e) => onUpdateFile({ ...file, imageWatermark: e.target.value })}
                          className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 outline-none focus:border-blue-500 bg-white"
                          placeholder="e.g. © 2026 Olaoye"
                        />
                      </div>
                    </div>

                    {/* Creative Visual filter cards */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                      <div className="flex items-center gap-1.5 text-slate-800 font-semibold text-xs uppercase tracking-wider">
                        <Sliders className="w-4 h-4 text-blue-600" />
                        <span>Visual Filters</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-1.5">
                        {([
                          { key: "none", label: "Original" },
                          { key: "grayscale", label: "Grayscale" },
                          { key: "sepia", label: "Retro Sepia" },
                          { key: "contrast", label: "Vibrant" },
                          { key: "invert", label: "Inverted" },
                          { key: "blur", label: "Soft Blur" },
                          { key: "vintage", label: "Vintage" }
                        ]).map((filter) => (
                          <button
                            key={filter.key}
                            type="button"
                            onClick={() => onUpdateFile({ ...file, imageFilter: filter.key as any })}
                            className={`px-2.5 py-1.5 text-[10px] font-medium border rounded-lg text-left transition-all truncate ${
                              (file.imageFilter || "none") === filter.key
                                ? "bg-blue-600 text-white border-transparent shadow-xs"
                                : "bg-white hover:bg-slate-100 text-slate-600 border-slate-200"
                            }`}
                          >
                            {filter.label}
                          </button>
                        ))}
                      </div>
                    </div>

                  </div>

                  {/* Image live display view */}
                  <div className="md:col-span-7 space-y-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Interactive Screen Canvas</label>
                    <div className="relative h-72 md:h-80 w-full bg-slate-900 border border-slate-950 rounded-xl flex items-center justify-center p-6 overflow-hidden shadow-inner group">
                      
                      <div 
                        className="transition-all duration-300 ease-out max-h-full max-w-full flex items-center justify-center"
                        style={{
                          transform: `rotate(${file.imageRotation || 0}deg)`,
                          filter: getCSSFilterString(file.imageFilter)
                        }}
                      >
                        <img
                          src={file.imagePreviewUrl}
                          alt={file.name}
                          referrerPolicy="no-referrer"
                          className={`max-h-56 md:max-h-64 rounded shadow-md border border-slate-700/50 transition-all ${
                            file.imageScaleMode === "fill" ? "object-cover w-full h-full" : 
                            file.imageScaleMode === "stretch" ? "w-full h-full" : "object-contain"
                          }`}
                        />
                      </div>

                      {/* Badges overlay */}
                      <div className="absolute top-3 left-3 bg-slate-950/85 backdrop-blur-xs px-2 py-1 rounded text-[9px] text-slate-300 font-mono border border-slate-800 select-none flex items-center gap-1.5">
                        <ImageIcon className="w-3 h-3 text-blue-400" />
                        <span>Filter: {file.imageFilter || "original"}</span>
                      </div>
                      
                      <div className="absolute bottom-3 right-3 bg-slate-950/85 backdrop-blur-xs px-2.5 py-1 rounded text-[9px] text-slate-300 font-mono border border-slate-800 select-none">
                        Fit: <span className="capitalize">{file.imageScaleMode || "fit"}</span>
                      </div>

                      {/* Simulated transparent watermark overlay */}
                      {file.imageWatermark && (
                        <div className="absolute pointer-events-none inset-0 flex items-center justify-center select-none overflow-hidden">
                          <div className="text-white/30 text-xl font-black font-sans uppercase tracking-widest -rotate-30 select-none border-2 border-white/10 px-4 py-2 rounded">
                            {file.imageWatermark}
                          </div>
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 text-center leading-normal">
                      The above filters, rotations and watermark will be rendered into the compiled final PDF dossier.
                    </p>
                  </div>

                </div>
              </div>
            )}

            {/* EXCEL SHEET SECTION */}
            {file.type === "xlsx" && (
              <div className="space-y-4">
                
                {/* Sheets selection tab bar */}
                {file.xlsxSheets && file.xlsxSheets.length > 0 && (
                  <div className="flex flex-col gap-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Spreadsheet active Focus Tab</label>
                    <div className="flex flex-wrap gap-2">
                      {file.xlsxSheets.map((sheet) => (
                        <button
                          key={sheet}
                          type="button"
                          id={`sheet-tab-${sheet.replace(/\s+/g, '-')}`}
                          onClick={() => onUpdateFile({ ...file, xlsxSelectedSheet: sheet })}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                            currentSheet === sheet
                              ? "bg-slate-800 text-white border-transparent shadow-2xs"
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {sheet}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* SPREADSHEET CELL EDITOR VIEW (Grid Mode) */}
                {excelEditMode === "edit" ? (
                  <div className="space-y-4">
                    {/* Grid Manipulation utility buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <Table className="w-4 h-4 text-emerald-600" />
                          <span>Rows</span>
                        </span>
                        <button
                          type="button"
                          onClick={handleAddExcelRow}
                          className="flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-all shadow-2xs"
                        >
                          <Plus className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Add Row</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveExcelRow}
                          disabled={sheetRows.length <= 1}
                          className="flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-all shadow-2xs disabled:opacity-40"
                        >
                          <Minus className="w-3.5 h-3.5 text-red-500" />
                          <span>Delete Last Row</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <Columns className="w-4 h-4 text-blue-600" />
                          <span>Columns</span>
                        </span>
                        <button
                          type="button"
                          onClick={handleAddExcelColumn}
                          className="flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-all shadow-2xs"
                        >
                          <Plus className="w-3.5 h-3.5 text-blue-500" />
                          <span>Add Column</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveExcelColumn}
                          disabled={sheetRows.length === 0 || sheetRows[0].length <= 1}
                          className="flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-all shadow-2xs disabled:opacity-40"
                        >
                          <Minus className="w-3.5 h-3.5 text-red-500" />
                          <span>Delete Last Col</span>
                        </button>
                      </div>
                    </div>

                    {/* Matrix cells inputs */}
                    <div className="overflow-auto border border-slate-200 rounded-xl bg-slate-50/50 max-h-[380px]">
                      <table className="min-w-full divide-y divide-slate-200 text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-100 text-slate-500 font-mono text-[10px] uppercase font-bold select-none sticky top-0 z-10">
                            <th className="px-3 py-1.5 border border-slate-200 w-10 text-center">#</th>
                            {sheetRows.length > 0 && sheetRows[0].map((_, cIdx) => (
                              <th key={cIdx} className="px-3 py-1.5 border border-slate-200 text-center min-w-[120px]">
                                {getColumnLabel(cIdx)}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white text-xs">
                          {sheetRows.map((row, rIdx) => (
                            <tr key={rIdx} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-3 py-1 border border-slate-200 font-mono text-[10px] text-slate-400 font-bold bg-slate-50 text-center select-none">
                                {rIdx + 1}
                              </td>
                              {row.map((cell, cIdx) => (
                                <td key={cIdx} className="p-0 border border-slate-200 min-w-[120px]">
                                  <input
                                    type="text"
                                    value={cell !== undefined ? cell : ""}
                                    onChange={(e) => handleExcelCellChange(rIdx, cIdx, e.target.value)}
                                    className="w-full h-8 px-2.5 py-1 outline-none text-slate-700 bg-transparent focus:bg-blue-50/40 focus:ring-1 focus:ring-blue-500/40 border-none transition-all font-sans text-xs"
                                  />
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  /* Standard preview view */
                  <div 
                    className="prose prose-sm max-w-none border border-slate-100 rounded-xl p-5 overflow-auto shadow-xs bg-slate-50/30"
                    dangerouslySetInnerHTML={{ __html: file.html || "" }}
                  />
                )}
              </div>
            )}

            {/* WORD DOCUMENTS DISPLAY VIEWS */}
            {file.type === "docx" && (
              <div className="font-sans text-sm text-slate-700 leading-relaxed space-y-4">
                <div 
                  className="prose prose-sm prose-slate max-w-none border border-slate-100 p-6 rounded-xl shadow-xs bg-slate-50/20"
                  dangerouslySetInnerHTML={{ __html: file.html || "" }}
                />
              </div>
            )}

            {/* TEXT/MARKDOWN DISPLAY VIEWS */}
            {file.type === "text" && (
              <div className="space-y-4">
                <div 
                  className="prose prose-sm max-w-none border border-slate-100 rounded-xl p-5 overflow-auto shadow-xs bg-slate-50/40"
                  dangerouslySetInnerHTML={{ __html: file.html || "" }}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
