'use client';

import React, { useState } from 'react';
import { useRenewalDesk } from '@/lib/store';
import { AppShell } from '@/components/AppShell';
import { interpolateTemplate } from '@/lib/whatsapp';
import { WhatsAppTemplate } from '@/lib/types';
import { Save, Check, Smartphone } from 'lucide-react';
import { IPhone17ProMockup } from '@/components/IPhone17ProMockup';

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

          {/* iPhone 17 Pro Realistic Hardware Mockup */}
          <IPhone17ProMockup
            businessName={business.name}
            messageText={livePreview}
            customerName="Arun Kumar"
            timeString="10:14 AM"
            onlineStatus="Online"
          />

          <p className="text-[11px] text-center text-gray-400">
            Preview uses sample customer: <strong>Arun Kumar</strong>
          </p>
        </div>
      </div>
    </AppShell>
  );
}
