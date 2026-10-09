'use client';

import React, { useState } from 'react';
import { useRenewalDesk } from '@/lib/store';
import { AppShell } from '@/components/AppShell';
import { interpolateTemplate } from '@/lib/whatsapp';
import { WhatsAppTemplate } from '@/lib/types';
import { MessageSquare, Save, Check, Sparkles, Smartphone } from 'lucide-react';

export default function TemplatesPage() {
  const { templates, updateTemplate, business } = useRenewalDesk();
  const [activeTemplateId, setActiveTemplateId] = useState<string>(templates[0]?.id || 'tpl-overdue');
  const [editedText, setEditedText] = useState<string>(templates[0]?.templateText || '');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const activeTemplate = templates.find(t => t.id === activeTemplateId) || templates[0];

  const handleSelectTemplate = (tpl: WhatsAppTemplate) => {
    setActiveTemplateId(tpl.id);
    setEditedText(tpl.templateText);
    setSavedSuccess(false);
  };

  const handleInsertTag = (tag: string) => {
    setEditedText(prev => prev + ` ${tag} `);
  };

  const handleSave = () => {
    if (!activeTemplate) return;
    updateTemplate({
      ...activeTemplate,
      templateText: editedText,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const livePreview = interpolateTemplate(editedText, {
    customer_name: 'Arun Kumar',
    service_name: 'AC Periodic General Service',
    asset_name: 'Samsung Split AC (1.5 Ton)',
    due_date: '10 Oct 2026',
    business_name: business.name,
    phone: business.phone,
  });

  return (
    <AppShell
      title="WhatsApp Message Templates"
      subtitle="Customize pre-filled WhatsApp messages sent to customers at each stage of their service cycle."
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Template Selector & Editor (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-200 p-6 space-y-6 shadow-xs">
          {/* Tabs */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Select Template Trigger
            </label>
            <div className="flex flex-wrap gap-2">
              {templates.map(tpl => (
                <button
                  key={tpl.id}
                  onClick={() => handleSelectTemplate(tpl)}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                    activeTemplateId === tpl.id
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {tpl.name}
                </button>
              ))}
            </div>
          </div>

          {/* Variables Pills */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Insert Dynamic Placeholders
              </label>
              <span className="text-[11px] text-gray-400">Click to insert into message</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                '{{customer_name}}',
                '{{service_name}}',
                '{{asset_name}}',
                '{{due_date}}',
                '{{business_name}}',
                '{{phone}}',
              ].map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleInsertTag(tag)}
                  className="px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Message Textarea */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Template Message Body
            </label>
            <textarea
              rows={8}
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              className="w-full p-3.5 text-xs sm:text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none leading-relaxed font-sans"
            />
          </div>

          {/* Save Button */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <span className="text-xs text-gray-400">
              {savedSuccess ? 'Changes saved to system!' : 'Modifications immediately apply to all new WhatsApp links.'}
            </span>
            <button
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all"
            >
              {savedSuccess ? <Check className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
              {savedSuccess ? 'Saved!' : 'Save Template'}
            </button>
          </div>
        </div>

        {/* Right Column: Simulated WhatsApp Device Preview (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-gray-200 p-6 space-y-4 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider">
            <Smartphone className="w-4 h-4 text-emerald-600" />
            <span>Simulated WhatsApp Screen</span>
          </div>

          {/* Smartphone Frame */}
          <div className="w-full max-w-sm mx-auto bg-gray-900 rounded-[2.5rem] p-3 shadow-2xl border-4 border-gray-800">
            {/* Phone Screen */}
            <div className="bg-[#EFEAE2] rounded-[2rem] overflow-hidden flex flex-col h-[460px] relative">
              {/* WhatsApp App Header */}
              <div className="bg-[#075E54] text-white p-3 flex items-center gap-2 shadow-sm">
                <div className="w-7 h-7 rounded-full bg-emerald-700 flex items-center justify-center text-xs font-bold">
                  {business.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold truncate">{business.name}</p>
                  <p className="text-[10px] text-emerald-200">Online</p>
                </div>
              </div>

              {/* Chat Canvas */}
              <div className="flex-1 p-3 overflow-y-auto space-y-3">
                {/* Chat Bubble */}
                <div className="bg-white rounded-lg rounded-tl-none p-3 shadow-sm space-y-1.5 border border-black/5 text-xs text-gray-800 leading-relaxed whitespace-pre-wrap">
                  {livePreview}
                  <div className="text-[10px] text-gray-400 text-right font-mono flex items-center justify-end gap-1 pt-1">
                    <span>10:14 AM</span>
                    <span className="text-blue-500 font-bold">✓✓</span>
                  </div>
                </div>
              </div>

              {/* WhatsApp Input Bar */}
              <div className="bg-[#F0F0F0] p-2 flex items-center gap-2 border-t border-gray-200">
                <div className="flex-1 bg-white rounded-full px-3 py-1.5 text-[11px] text-gray-400">
                  Message...
                </div>
                <div className="w-7 h-7 rounded-full bg-[#128C7E] flex items-center justify-center text-white">
                  <MessageSquare className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-center text-gray-400">
            Preview uses sample customer: <strong>Arun Kumar</strong>
          </p>
        </div>
      </div>
    </AppShell>
  );
}
