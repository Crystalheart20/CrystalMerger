import React, { useState } from "react";
import { FileQueue } from "./components/FileQueue";
import { DocumentPreview } from "./components/DocumentPreview";
import { CoverPageCustomizer } from "./components/CoverPageCustomizer";
import { AIAssistant } from "./components/AIAssistant";
import { CollatedFile, CoverPageOptions, TableOfContentsOptions, OutputSettings } from "./types";
import { compileMasterDocument } from "./utils/compiler";
import { Layers, FileText, Download, Play, Check, AlertTriangle, Eye, RefreshCw, FileCode, Landmark, LandmarkIcon } from "lucide-react";

export default function App() {
  const [files, setFiles] = useState<CollatedFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  
  // Custom cover options state
  const [coverPage, setCoverPage] = useState<CoverPageOptions>({
    enabled: true,
    title: "Consolidated Materials Report",
    subtitle: "Compilation of corporate sheets, documents and reports",
    author: "Hammed Olaoye",
    organization: "Global division",
    date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
    theme: "corporate",
    accentColor: "#3b82f6",
  });

  // Table of Contents options state
  const [tocOptions, setTocOptions] = useState<TableOfContentsOptions>({
    enabled: true,
    title: "Table of Contents",
    includePageNumbers: true,
    style: "modern",
  });

  // General merging page options state
  const [settings, setSettings] = useState<OutputSettings>({
    pageNumbering: "bottom-right",
    pageNumberPrefix: "Page",
    fileNameInHeader: true,
    pageSize: "a4",
    margins: "standard",
  });

  // AI Summary generated text block and metadata logs
  const [autoSummary, setAutoSummary] = useState("");
  const [compiling, setCompiling] = useState(false);
  const [compilationSuccess, setCompilationSuccess] = useState(false);
  const [compiledPdfUrl, setCompiledPdfUrl] = useState<string | null>(null);
  const [buildLogs, setBuildLogs] = useState<string[]>([]);

  const activeFile = files.find((f) => f.id === activeFileId) || null;

  const handleUpdateFile = (updated: CollatedFile) => {
    setFiles(files.map((f) => (f.id === updated.id ? updated : f)));
  };

  const handleRemoveFile = (id: string) => {
    const updated = files.filter((f) => f.id !== id);
    setFiles(updated);
    if (activeFileId === id) {
      setActiveFileId(updated[0]?.id || null);
    }
  };

  // Re-order mapping suggested by AI
  const handleApplySuggestedOrder = (mapping: { originalIndex: number; newIndex: number }[]) => {
    const orderedFiles: CollatedFile[] = [];
    
    // Sort mapping by newIndex to place sequentially
    const sortedMapping = [...mapping].sort((a, b) => a.newIndex - b.newIndex);
    
    sortedMapping.forEach((mapItem) => {
      if (files[mapItem.originalIndex]) {
        orderedFiles.push(files[mapItem.originalIndex]);
      }
    });

    setFiles(orderedFiles);
    setBuildLogs((prev) => [
      ...prev,
      `[AI Sequencing] Automatically rearranged ${orderedFiles.length} documents into optimal logical order.`,
    ]);
  };

  // Master Collate and Compile pipeline
  const handleCompileDocument = async () => {
    if (files.length === 0) {
      alert("Please upload at least 1 document into your workspace queue to compile.");
      return;
    }

    setCompiling(true);
    setCompilationSuccess(false);
    setCompiledPdfUrl(null);
    setBuildLogs(["Initializing master compiler environment..."]);

    try {
      setBuildLogs((prev) => [...prev, "Compiling Cover Page structure..."]);
      if (coverPage.enabled) {
        setBuildLogs((prev) => [...prev, `-> Theme Selected: [${coverPage.theme}] style`]);
      }

      if (autoSummary) {
        setBuildLogs((prev) => [...prev, "Structuring AI Executive summary into Page Section 2..."]);
      }

      if (tocOptions.enabled) {
        setBuildLogs((prev) => [...prev, "Formatting Table of Contents indexes..."]);
      }

      setBuildLogs((prev) => [...prev, `Parsing and rendering ${files.length} sequence divisions...`]);
      files.forEach((file, index) => {
        setBuildLogs((prev) => [
          ...prev,
          `-> Appending Section ${index + 1}: ${file.name} (Format: ${file.type})`,
        ]);
      });

      // Execute pdf-lib assembly
      const masterBytes = await compileMasterDocument(
        files,
        coverPage,
        tocOptions,
        settings,
        autoSummary
      );

      setBuildLogs((prev) => [...prev, "Finalizing page coordinates and headers/footers..."]);
      
      const blob = new Blob([masterBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      
      setCompiledPdfUrl(url);
      setCompilationSuccess(true);
      setBuildLogs((prev) => [
        ...prev,
        `Success! Unified dossier compiled with ${files.length} sections. Ready to view.`,
      ]);
    } catch (err: any) {
      console.error(err);
      setBuildLogs((prev) => [...prev, `Compilation failed! Error details: ${err.message}`]);
    } finally {
      setCompiling(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafbfc] text-slate-800 font-sans leading-relaxed pb-12">
      {/* Upper Navigation bar */}
      <header className="sticky top-0 z-10 bg-slate-900 border-b border-slate-800 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 rounded-xl flex items-center justify-center text-white">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold tracking-tight text-base flex items-center gap-1.5">
                <span>Universal Document Collator</span>
                <span className="text-[10px] bg-blue-500/30 border border-blue-500/20 px-1.5 py-0.5 rounded text-blue-300 font-medium">
                  PRO
                </span>
              </h1>
              <p className="text-xs text-slate-400">Merge PDF, Word, Excel, Images & Text files into 1</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Server Core Status: </span>
            <span className="flex items-center gap-1.5 font-semibold text-emerald-400 bg-emerald-950 px-2.5 py-1 rounded">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>LIVE</span>
            </span>
          </div>
        </div>
      </header>

      {/* Main Workspace Frame Container */}
      <main className="max-w-7xl mx-auto px-6 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT SECTION (Col 1-4) File manager queue & output parameters */}
          <section className="lg:col-span-4 space-y-6">
            
            {/* File lists */}
            <FileQueue
              files={files}
              activeId={activeFileId}
              onSelectFile={setActiveFileId}
              onFilesChanged={(newFiles) => {
                setFiles(newFiles);
                if (newFiles.length > 0 && !activeFileId) {
                  setActiveFileId(newFiles[0].id);
                }
              }}
            />

            {/* General formatting settings panel */}
            <div className="bg-white rounded-xl border border-slate-100 p-6 shadow-xs">
              <div className="flex items-center gap-2.5 mb-4 pb-4 border-b border-slate-50">
                <FileText className="w-5 h-5 text-slate-500" />
                <div>
                  <h3 className="font-semibold text-slate-800 text-sm">Design & Print Settings</h3>
                  <p className="text-xs text-slate-400">Page numbers, margins, headers</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* TOC Toggle */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-50">
                  <div className="text-xs">
                    <p className="font-semibold text-slate-700">Table of Contents</p>
                    <p className="text-slate-400 text-[11px]">Generate automatic TOC page</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={tocOptions.enabled}
                    onChange={(e) => setTocOptions({ ...tocOptions, enabled: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500 rounded"
                  />
                </div>

                {/* Page setup inputs */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">PAGE SIZE</label>
                    <select
                      id="select-page-size"
                      value={settings.pageSize}
                      onChange={(e: any) => setSettings({ ...settings, pageSize: e.target.value })}
                      className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 outline-none text-slate-700 bg-white"
                    >
                      <option value="a4">A4 (Standard)</option>
                      <option value="letter">Letter</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">MARGIN WIDTH</label>
                    <select
                      id="select-margins"
                      value={settings.margins}
                      onChange={(e: any) => setSettings({ ...settings, margins: e.target.value })}
                      className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 outline-none text-slate-700 bg-white"
                    >
                      <option value="standard">Standard (20mm)</option>
                      <option value="slim">Slim (12mm)</option>
                      <option value="none">Borderless</option>
                    </select>
                  </div>
                </div>

                {/* Numbering options inputs */}
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">PAGE NUMBER LAYOUT</label>
                    <select
                      id="select-numbering-layout"
                      value={settings.pageNumbering}
                      onChange={(e: any) => setSettings({ ...settings, pageNumbering: e.target.value })}
                      className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 outline-none text-slate-700 bg-white"
                    >
                      <option value="none">No numbering</option>
                      <option value="bottom-right">Bottom Right footer</option>
                      <option value="bottom-center">Bottom Center footer</option>
                      <option value="header-right">Top Right header</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="checkbox-filename-header"
                      checked={settings.fileNameInHeader}
                      onChange={(e) => setSettings({ ...settings, fileNameInHeader: e.target.checked })}
                      className="w-3.5 h-3.5 text-blue-600 border-slate-300 focus:ring-blue-500 rounded"
                    />
                    <label htmlFor="checkbox-filename-header" className="text-xs text-slate-600">
                      Print file summary header band on pages
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* MAIN COLUMN (Cols 5-9) Document Customizer, Editing list and Previews */}
          <section className="lg:col-span-5 space-y-6">
            
            {/* Cover Page */}
            <CoverPageCustomizer options={coverPage} onChange={setCoverPage} />

            {/* Document Editor/Preview */}
            <DocumentPreview
              file={activeFile}
              onUpdateFile={handleUpdateFile}
              onRemoveFile={handleRemoveFile}
            />

            {/* Master collate submit dashboard */}
            <div className="bg-white rounded-xl border border-slate-100 p-6 shadow-md space-y-5">
              <div className="text-center md:text-left">
                <h3 className="font-bold text-slate-800 text-sm">Compile & Export Dossier</h3>
                <p className="text-xs text-slate-400">Assemble cover and sequenced files into a single master document</p>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  id="btn-trigger-compile"
                  onClick={handleCompileDocument}
                  disabled={files.length === 0 || compiling}
                  className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl text-sm font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-750 hover:to-indigo-750 text-white shadow-md select-none disabled:opacity-40 transition-all cursor-pointer"
                >
                  {compiling ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Compiling sequence segments...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-white" />
                      <span>Merge & Collate Files ({files.length})</span>
                    </>
                  )}
                </button>

                {/* Compilation results block */}
                {compilationSuccess && compiledPdfUrl && (
                  <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-150 animate-fadeIn">
                    <div className="flex items-center gap-3 text-emerald-800 text-xs font-semibold">
                      <div className="bg-emerald-500 text-white p-1 rounded-full">
                        <Check className="w-4 h-4" />
                      </div>
                      <div>
                        <p>Composition complete successfully!</p>
                        <p className="text-[10px] text-emerald-600 font-normal">Ready to download</p>
                      </div>
                    </div>
                    <div className="mt-3.5 flex gap-2">
                      <a
                        href={compiledPdfUrl}
                        download={coverPage.title ? `${coverPage.title.replace(/\s+/g, "_")}.pdf` : "collated_archive.pdf"}
                        id="btn-download-pdf"
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all text-center"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download compiled PDF</span>
                      </a>
                      <a
                        href={compiledPdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Open Preview</span>
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* Live Build log outputs */}
              {buildLogs.length > 0 && (
                <div className="p-4 bg-slate-900 rounded-xl font-mono text-[10px] leading-relaxed select-text shadow-inner">
                  <span className="text-slate-400 block border-b border-slate-800 pb-1.5 mb-2 font-bold select-none uppercase tracking-wider">
                    COMPILER CONSOLE LOGS
                  </span>
                  <div className="max-h-28 overflow-y-auto space-y-1.5 text-slate-350 pr-2">
                    {buildLogs.map((log, idx) => (
                      <div key={idx} className="flex gap-2.5">
                        <span className="text-slate-600 select-none">{idx + 1}</span>
                        <p className="break-all whitespace-pre-wrap">{log}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* AI SLIDE OUTDRAWER / PANEL (Col 10-12) */}
          <section className="lg:col-span-3">
            <AIAssistant
              files={files}
              activeSummary={autoSummary}
              onSetAutoSummary={setAutoSummary}
              onApplySuggestedOrder={handleApplySuggestedOrder}
            />
          </section>

        </div>
      </main>
    </div>
  );
}
