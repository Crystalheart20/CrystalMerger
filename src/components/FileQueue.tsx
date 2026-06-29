import React, { useRef, useState } from "react";
import { UploadCloud, ArrowUp, ArrowDown, Trash2, FileCode, Landmark, FileImage, Layers, HelpCircle, CheckCircle, Camera } from "lucide-react";
import { CollatedFile } from "../types";
import { parseFileToCollated } from "../utils/parsers";
import { DocumentScanner } from "./DocumentScanner";

interface FileQueueProps {
  files: CollatedFile[];
  activeId: string | null;
  onSelectFile: (id: string) => void;
  onFilesChanged: (files: CollatedFile[]) => void;
}

export function FileQueue({ files, activeId, onSelectFile, onFilesChanged }: FileQueueProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Handle manual upload or Drag/Drop uploads
  const handleFilesAdded = async (eventFiles: FileList | null) => {
    if (!eventFiles) return;

    const parsedArray: CollatedFile[] = [];

    for (let i = 0; i < eventFiles.length; i++) {
      const f = eventFiles[i];
      const parsedData = await parseFileToCollated(f);

      const simpleType = getSimpleFileType(f);

      const safeId = typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2, 11) + "_" + Date.now().toString(36);

      parsedArray.push({
        id: safeId,
        name: f.name,
        type: simpleType,
        size: f.size,
        rawFile: f,
        pdfSelectedRange: "all",
        xlsxSelectedSheet: parsedData.xlsxSheets?.[0] || "",
        ...parsedData,
      });
    }

    onFilesChanged([...files, ...parsedArray]);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFilesAdded(e.dataTransfer.files);
  };

  const handleSaveScan = async (scannedFile: File, previewUrl: string) => {
    const parsedData = await parseFileToCollated(scannedFile);

    const safeId = typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2, 11) + "_" + Date.now().toString(36);

    const newCollated: CollatedFile = {
      id: safeId,
      name: scannedFile.name,
      type: "image",
      size: scannedFile.size,
      rawFile: scannedFile,
      text: parsedData.text || `[Scanned Document: ${scannedFile.name}]`,
      imagePreviewUrl: previewUrl,
      pdfSelectedRange: "all",
      xlsxSelectedSheet: "",
    };

    onFilesChanged([...files, newCollated]);
    onSelectFile(safeId);
  };

  // Reorder commands: Up/Down arrow list sorting
  const moveFile = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === files.length - 1) return;

    const targetIdx = direction === "up" ? index - 1 : index + 1;
    const shuffled = [...files];
    const [moved] = shuffled.splice(index, 1);
    shuffled.splice(targetIdx, 0, moved);
    onFilesChanged(shuffled);
  };

  // Delete file from list
  const deleteFile = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = files.filter((f) => f.id !== id);
    onFilesChanged(updated);
  };

  // Rename a file directly in the list
  const renameFile = (id: string, newName: string) => {
    onFilesChanged(
      files.map((f) => (f.id === id ? { ...f, name: newName } : f))
    );
  };

  // Get matching icons for file types
  const getFileIcon = (type: string) => {
    switch (type) {
      case "pdf":
        return <div className="p-2 bg-red-100 text-red-650 rounded-lg shrink-0 font-bold text-xs">PDF</div>;
      case "docx":
        return <div className="p-2 bg-blue-100 text-blue-650 rounded-lg shrink-0 font-bold text-xs">DOC</div>;
      case "xlsx":
        return <div className="p-2 bg-emerald-100 text-emerald-650 rounded-lg shrink-0 font-bold text-xs">XLS</div>;
      case "image":
        return <div className="p-2 bg-purple-100 text-purple-650 rounded-lg shrink-0 font-bold text-xs">IMG</div>;
      case "text":
      default:
        return <div className="p-2 bg-slate-100 text-slate-650 rounded-lg shrink-0 font-bold text-xs">TXT</div>;
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-xs border border-slate-100 overflow-hidden">
      {/* Upload Zone */}
      <div
        id="file-drop-zone"
        onDragOver={onDragOver}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className="m-4 p-6 border-2 border-dashed border-slate-200 hover:border-blue-500 hover:bg-blue-50/10 rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-all shrink-0"
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => handleFilesAdded(e.target.files)}
          multiple
          className="hidden"
          accept=".pdf,.docx,.xlsx,.xls,.png,.jpg,.jpeg,.webp,.txt,.csv,.md"
        />
        <UploadCloud className="w-8 h-8 text-slate-400 mb-2 stroke-[1.5]" />
        <h4 className="font-semibold text-slate-705 text-xs">Upload or Drag Files Here</h4>
        <p className="text-[10px] text-slate-400 mt-1 max-w-xs">
          Supports PDFs, Word docs, Excel sheets, text data, and diagrams (PNG, JPG, csv)
        </p>
      </div>

      {/* Camera Scanning shortcut bar */}
      <div className="px-4 pb-4">
        <button
          type="button"
          onClick={() => setIsScannerOpen(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-50/50 hover:bg-blue-50 border border-blue-200 hover:border-blue-300 text-blue-750 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
        >
          <Camera className="w-4 h-4 text-blue-500 shrink-0" />
          <span>Scan Document with Camera</span>
        </button>
      </div>

      {/* Queue Header info */}
      <div className="px-5 py-2.5 bg-slate-50 border-y border-slate-100 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">COLLATE WORKSPACE ({files.length})</span>
        {files.length > 1 && (
          <span className="text-[10px] text-slate-400">Drag/reorder priority</span>
        )}
      </div>

      {/* Dynamic File Item List */}
      <div className="flex-1 overflow-y-auto max-h-[360px] divide-y divide-slate-100">
        {files.length === 0 ? (
          <div className="p-8 text-center text-slate-405 text-xs">
            No files queued in project yet. Upload or scan a few document assets above to start.
          </div>
        ) : (
          files.map((file, idx) => {
            const isActive = file.id === activeId;
            return (
              <div
                key={file.id}
                id={`queue-item-${file.id}`}
                onClick={() => onSelectFile(file.id)}
                className={`p-3.5 flex items-center justify-between gap-3 cursor-pointer transition-all group ${
                  isActive 
                    ? "bg-blue-50/50 border-l-4 border-blue-500 pl-2.5" 
                    : "hover:bg-slate-50"
                }`}
              >
                {/* Left Details block */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {getFileIcon(file.type)}
                  
                  <div className="min-w-0 flex-1">
                    <input
                      type="text"
                      id={`rename-input-${file.id}`}
                      value={file.name}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => renameFile(file.id, e.target.value)}
                      className="text-xs font-semibold text-slate-700 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-slate-400 focus:bg-white px-1 py-0.5 outline-none rounded truncate w-full"
                    />
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400 pl-1">
                      <span>{(file.size / 1024).toFixed(0)} KB</span>
                      <span>•</span>
                      {file.type === "pdf" && (
                        <span>Range: {file.pdfSelectedRange || "All"}</span>
                      )}
                      {file.type === "xlsx" && (
                        <span>Tab: {file.xlsxSelectedSheet || "First"}</span>
                      )}
                      {file.type !== "pdf" && file.type !== "xlsx" && (
                        <span className="capitalize">{file.type} raw document</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Re-ordering Operations */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    id={`btn-move-up-${file.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      moveFile(idx, "up");
                    }}
                    disabled={idx === 0}
                    className="p-1 rounded hover:bg-slate-200 text-slate-400 disabled:opacity-30 disabled:pointer-events-none"
                    title="Move section up"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    id={`btn-move-down-${file.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      moveFile(idx, "down");
                    }}
                    disabled={idx === files.length - 1}
                    className="p-1 rounded hover:bg-slate-200 text-slate-400 disabled:opacity-30 disabled:pointer-events-none"
                    title="Move section down"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    id={`btn-delete-item-${file.id}`}
                    onClick={(e) => deleteFile(file.id, e)}
                    className="p-1 rounded hover:bg-red-50 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <DocumentScanner
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onSaveScan={handleSaveScan}
      />
    </div>
  );
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
