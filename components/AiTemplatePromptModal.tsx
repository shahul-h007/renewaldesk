'use client';

import React, { useState, useMemo } from 'react';
import { useRenewalDesk } from '@/lib/store';
import { TemplateType } from '@/lib/types';
import {
  generateAiTemplatePrompt,
  PROMPT_TONE_OPTIONS,
  PROMPT_LANGUAGE_OPTIONS,
  TEMPLATE_TYPE_LABELS,
  PromptTone,
  PromptLanguage,
} from '@/lib/ai-prompt-generator';
import {
  Sparkles,
  X,
  Copy,
  Check,
  ExternalLink,
  Info,
  CheckSquare,
  Square,
  FileText,
  AlertCircle,
} from 'lucide-react';

interface AiTemplatePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AiTemplatePromptModal({ isOpen, onClose }: AiTemplatePromptModalProps) {
  const { business, catalog } = useRenewalDesk();

  const [tone, setTone] = useState<PromptTone>('friendly');
  const [language, setLanguage] = useState<PromptLanguage>('english');
  const [selectedTypes, setSelectedTypes] = useState<TemplateType[]>([
    'DUE_SOON',
    'DUE_TODAY',
    'OVERDUE',
    'BOOKING_CONFIRMATION',
    'SERVICE_COMPLETED',
  ]);
  const [customInstructions, setCustomInstructions] = useState('');
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  // Generate live prompt
  const generatedPrompt = useMemo(() => {
    return generateAiTemplatePrompt({
      businessName: business.name,
      businessType: business.industry,
      catalog: catalog,
      tone,
      language,
      templateTypes: selectedTypes,
      customInstructions,
    });
  }, [business.name, business.industry, catalog, tone, language, selectedTypes, customInstructions]);

  if (!isOpen) return null;

  const toggleType = (t: TemplateType) => {
    if (selectedTypes.includes(t)) {
      if (selectedTypes.length > 1) {
        setSelectedTypes(selectedTypes.filter((item) => item !== t));
      }
    } else {
      setSelectedTypes([...selectedTypes, t]);
    }
  };

  const handleCopy = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(generatedPrompt);
        setCopied(true);
        setCopyError(false);
        setTimeout(() => setCopied(false), 2500);
      } else {
        throw new Error('Clipboard API unavailable');
      }
    } catch {
      // Fallback
      try {
        const textArea = document.createElement('textarea');
        textArea.value = generatedPrompt;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopied(true);
        setCopyError(false);
        setTimeout(() => setCopied(false), 2500);
      } catch {
        setCopyError(true);
        setTimeout(() => setCopyError(false), 3000);
      }
    }
  };

  const allAvailableTypes: TemplateType[] = [
    'DUE_SOON',
    'DUE_TODAY',
    'OVERDUE',
    'BOOKING_CONFIRMATION',
    'SERVICE_COMPLETED',
    'CUSTOM',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/40 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh] border border-gray-200">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
              <Sparkles className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white">
                  AI WhatsApp Template Prompt Generator
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Zero API Cost
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Generate a ready-to-use prompt for ChatGPT, Claude, or Gemini tailored to {business.name}.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Split */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-gray-200">
          {/* Controls Column (5 cols) */}
          <div className="lg:col-span-5 p-5 space-y-5 bg-slate-50/50 overflow-y-auto">
            {/* Business Info Banner */}
            <div className="p-3 bg-white border border-gray-200 rounded-xl space-y-1">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                Workspace Context
              </span>
              <div className="text-xs font-semibold text-gray-800">{business.name}</div>
              <div className="text-[11px] text-gray-500">
                Industry: <strong className="text-gray-700">{business.industry}</strong>
              </div>
              <div className="text-[10px] text-gray-400">
                Services included in prompt: {catalog.filter((c) => c.isActive).length} active services
              </div>
            </div>

            {/* Tone Selector */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">
                Desired Tone
              </label>
              <div className="grid grid-cols-1 gap-1.5">
                {PROMPT_TONE_OPTIONS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTone(t.id)}
                    className={`p-2.5 rounded-xl text-left border transition-all text-xs flex flex-col ${
                      tone === t.id
                        ? 'bg-blue-50 border-blue-400 text-blue-900 shadow-xs'
                        : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <span className="font-semibold">{t.label}</span>
                    <span className="text-[10px] text-gray-500 mt-0.5">{t.description}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Language Selector */}
            <div>
              <label htmlFor="prompt-language-select" className="block text-xs font-semibold text-gray-700 mb-1.5">
                Target Language
              </label>
              <select
                id="prompt-language-select"
                aria-label="Target Language"
                value={language}
                onChange={(e) => setLanguage(e.target.value as PromptLanguage)}
                className="w-full text-xs bg-white border border-gray-300 rounded-xl p-2.5 font-medium text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                {PROMPT_LANGUAGE_OPTIONS.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label} — {l.note}
                  </option>
                ))}
              </select>
            </div>

            {/* Template Types to Generate */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Templates to Request ({selectedTypes.length})
              </label>
              <div className="space-y-1.5">
                {allAvailableTypes.map((typeKey) => {
                  const isChecked = selectedTypes.includes(typeKey);
                  const info = TEMPLATE_TYPE_LABELS[typeKey];
                  return (
                    <button
                      key={typeKey}
                      type="button"
                      onClick={() => toggleType(typeKey)}
                      className={`w-full p-2 rounded-lg text-left text-xs border flex items-center gap-2 transition-colors ${
                        isChecked
                          ? 'bg-white border-blue-300 text-blue-950 font-medium'
                          : 'bg-white/60 border-gray-200 text-gray-500'
                      }`}
                    >
                      {isChecked ? (
                        <CheckSquare className="w-4 h-4 text-blue-600 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-gray-400 shrink-0" />
                      )}
                      <div className="truncate">
                        <span className="font-semibold">{info.title}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Optional Specific Requirements */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Custom Requirements (Optional)
              </label>
              <textarea
                rows={3}
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder="e.g. Focus on post-monsoon inspection, keep messages under 25 words, emphasize quick response time."
                className="w-full text-xs p-2.5 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none leading-relaxed"
              />
            </div>
          </div>

          {/* Prompt Preview Column (7 cols) */}
          <div className="lg:col-span-7 p-5 flex flex-col justify-between space-y-4 bg-white overflow-y-auto">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-600" />
                  <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                    Generated AI Prompt
                  </span>
                </div>
                <span className="text-[11px] font-mono text-gray-400">
                  {generatedPrompt.split('\n').length} lines • {generatedPrompt.length} chars
                </span>
              </div>

              {/* Instructions banner */}
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-blue-800">
                  <Info className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>How to use this prompt:</span>
                </div>
                <ol className="list-decimal list-inside text-[11px] text-blue-800/90 space-y-0.5">
                  <li>Click <strong>Copy Prompt</strong> below.</li>
                  <li>Paste into <strong>ChatGPT</strong>, <strong>Claude</strong>, or <strong>Gemini</strong>.</li>
                  <li>Copy the AI&apos;s generated message for each template.</li>
                  <li>Paste into RenewalDesk&apos;s template editor or click <strong>New Template</strong> to save.</li>
                </ol>
              </div>

              {/* Readonly Prompt Area */}
              <div className="relative">
                <textarea
                  readOnly
                  rows={15}
                  value={generatedPrompt}
                  className="w-full p-3.5 text-xs font-mono text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:ring-1 focus:ring-blue-500 outline-none leading-relaxed select-all"
                />
              </div>

              {/* Privacy Guarantee Note */}
              <div className="text-[10px] text-gray-400 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>
                  <strong>Privacy Protected:</strong> Contains zero customer personal data (no names, phone numbers, addresses, or history).
                </span>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="pt-3 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <a
                  href="https://chatgpt.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline"
                >
                  <span>Open ChatGPT</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <span>•</span>
                <a
                  href="https://claude.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline"
                >
                  <span>Claude</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-gray-600 hover:text-gray-900"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md transition-all active:scale-95"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-300" />
                      <span>Copied to Clipboard!</span>
                    </>
                  ) : copyError ? (
                    <>
                      <AlertCircle className="w-4 h-4 text-amber-300" />
                      <span>Select All & Copy</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy Prompt</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
