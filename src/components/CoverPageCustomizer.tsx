import React from "react";
import { BookOpen, Palette, ChevronDown, Check } from "lucide-react";
import { CoverPageOptions } from "../types";

interface CoverPageCustomizerProps {
  options: CoverPageOptions;
  onChange: (options: CoverPageOptions) => void;
}

const PALETTES = [
  { name: "Ocean Slate", value: "#3b82f6" },
  { name: "Emerald Forest", value: "#10b981" },
  { name: "Royal Purple", value: "#8b5cf6" },
  { name: "Crimson Brick", value: "#ef4444" },
  { name: "Charcoal Steel", value: "#4b5563" },
  { name: "Elegant Gold", value: "#b4966e" },
];

export function CoverPageCustomizer({ options, onChange }: CoverPageCustomizerProps) {
  const updateOption = <K extends keyof CoverPageOptions>(key: K, value: CoverPageOptions[K]) => {
    onChange({
      ...options,
      [key]: value,
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-xs border border-slate-100 p-6">
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-50">
        <div className="flex items-center gap-2.5">
          <BookOpen className="w-5 h-5 text-slate-500" />
          <div>
            <h3 className="font-semibold text-slate-800 text-sm">Cover Page Customizer</h3>
            <p className="text-xs text-slate-400">Add a stunning front page to your collated PDF</p>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={options.enabled}
            onChange={(e) => updateOption("enabled", e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-slate-250 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>

      {options.enabled && (
        <div className="space-y-4 animate-fadeIn">
          {/* Layout Themes */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-2">PAGE THEME DESIGN</label>
            <div className="grid grid-cols-2 gap-2">
              {(["corporate", "elegant", "minimal", "tech"] as const).map((theme) => (
                <button
                  key={theme}
                  type="button"
                  id={`theme-btn-${theme}`}
                  onClick={() => updateOption("theme", theme)}
                  className={`capitalize px-3 py-2 text-xs font-medium rounded-lg border text-left transition-all flex items-center justify-between ${
                    options.theme === theme
                      ? "border-blue-600 bg-blue-50/50 text-blue-700"
                      : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
                  }`}
                >
                  <span>{theme} Layout</span>
                  {options.theme === theme && <Check className="w-3.5 h-3.5 text-blue-600" />}
                </button>
              ))}
            </div>
          </div>

          {/* Color Palettes */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-2">ACCENT PALETTE</label>
            <div className="flex flex-wrap gap-2">
              {PALETTES.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  id={`color-btn-${color.name.replace(/\s+/g, '-')}`}
                  title={color.name}
                  onClick={() => updateOption("accentColor", color.value)}
                  className={`w-7 h-7 rounded-full border transition-all flex items-center justify-center ${
                    options.accentColor === color.value 
                      ? "ring-2 ring-offset-2 ring-blue-500 border-transparent scale-105" 
                      : "border-slate-200 hover:scale-105"
                  }`}
                  style={{ backgroundColor: color.value }}
                >
                  {options.accentColor === color.value && (
                    <Check className="w-3.5 h-3.5 text-white" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Entry Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Doc Title</label>
              <input
                type="text"
                id="cover-title-input"
                value={options.title}
                onChange={(e) => updateOption("title", e.target.value)}
                placeholder="Enterprise Quarterly Dossier"
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none text-slate-700"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Subtitle</label>
              <input
                type="text"
                id="cover-subtitle-input"
                value={options.subtitle}
                onChange={(e) => updateOption("subtitle", e.target.value)}
                placeholder="Consolidated Materials & Reports"
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none text-slate-700"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Prepared By (Author)</label>
              <input
                type="text"
                id="cover-author-input"
                value={options.author}
                onChange={(e) => updateOption("author", e.target.value)}
                placeholder="Hammed Olaoye"
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none text-slate-700"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Organization / Department</label>
              <input
                type="text"
                id="cover-org-input"
                value={options.organization}
                onChange={(e) => updateOption("organization", e.target.value)}
                placeholder="Global Products division"
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none text-slate-700"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-500 mb-1">Date Stamp</label>
              <input
                type="text"
                id="cover-date-input"
                value={options.date}
                onChange={(e) => updateOption("date", e.target.value)}
                placeholder="June 23, 2026"
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none text-slate-700"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
