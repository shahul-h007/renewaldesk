'use client';

import React, { useState, useEffect } from 'react';
import { Customer, Asset, ServiceRecord } from '@/lib/types';
import { useRenewalDesk } from '@/lib/store';
import { interpolateTemplate, generateWhatsAppLink } from '@/lib/whatsapp';
import { formatReadableDate } from '@/lib/due-date-engine';
import { X, Send, Copy, Check, MessageSquare } from 'lucide-react';

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer?: Customer;
  asset?: Asset;
  service?: ServiceRecord;
}

export function WhatsAppModal({ isOpen, onClose, customer, asset, service }: WhatsAppModalProps) {
  const { templates, business, updateFollowUpStatus } = useRenewalDesk();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [messageText, setMessageText] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!service || !templates.length) return;

    // Pick best default template based on service urgency
    let defaultTpl = templates.find(t => {
      if (service.urgency === 'OVERDUE') return t.type === 'OVERDUE';
      if (service.urgency === 'DUE_TODAY') return t.type === 'DUE_TODAY';
      return t.type === 'DUE_SOON';
    }) || templates[0];

    setSelectedTemplateId(defaultTpl.id);
  }, [service, templates]);

  useEffect(() => {
    if (!customer || !service || !selectedTemplateId) return;
    const tpl = templates.find(t => t.id === selectedTemplateId);
    if (!tpl) return;

    const populated = interpolateTemplate(tpl.templateText, {
      customer_name: customer.name,
      service_name: service.serviceName,
      asset_name: asset ? `${asset.name} (${asset.capacity || ''})` : 'Appliance',
      due_date: formatReadableDate(service.nextDueDate),
      business_name: business.name,
      phone: business.phone,
    });

    setMessageText(populated);
  }, [selectedTemplateId, customer, asset, service, templates, business]);

  if (!isOpen || !customer || !service) return null;

  const handleOpenWhatsApp = () => {
    const link = generateWhatsAppLink(customer.phone, messageText);
    window.open(link, '_blank');
    // Auto mark as CONTACTED if currently NOT_CONTACTED
    if (service.followUpStatus === 'NOT_CONTACTED') {
      updateFollowUpStatus(service.id, 'CONTACTED');
    }
    onClose();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
              <MessageSquare className="w-5 h-5 text-[#25D366]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">WhatsApp Follow-up</h2>
              <p className="text-xs text-gray-500">
                To: <span className="font-semibold text-gray-700">{customer.name}</span> ({customer.phone})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Template Selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
              Choose Reminder Template
            </label>
            <div className="flex flex-wrap gap-2">
              {templates.map(tpl => (
                <button
                  key={tpl.id}
                  onClick={() => setSelectedTemplateId(tpl.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    selectedTemplateId === tpl.id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {tpl.name}
                </button>
              ))}
            </div>
          </div>

          {/* WhatsApp Preview Box */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
              Live WhatsApp Chat Preview
            </label>
            <div className="bg-[#EFEAE2] p-4 rounded-xl border border-gray-200 relative">
              <div className="max-w-[85%] bg-white rounded-lg rounded-tl-none p-3.5 shadow-sm space-y-2 border border-black/5">
                <p className="text-xs font-semibold text-emerald-800">
                  {business.name}
                </p>
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  rows={6}
                  className="w-full text-sm text-gray-800 bg-transparent border-0 focus:ring-0 resize-none p-0 outline-none leading-relaxed font-sans"
                />
                <div className="text-[10px] text-gray-400 text-right font-mono flex items-center justify-end gap-1">
                  <span>09:41 AM</span>
                  <span className="text-blue-500">✓✓</span>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-gray-500 mt-1.5">
              Tip: You can edit the text directly above before sending.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5 text-gray-500" />}
            {copied ? 'Copied!' : 'Copy Text'}
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-gray-600 hover:text-gray-900"
            >
              Cancel
            </button>
            <button
              onClick={handleOpenWhatsApp}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold text-white bg-[#25D366] hover:bg-[#128C7E] shadow-sm transition-all"
            >
              <Send className="w-4 h-4" />
              Open WhatsApp (wa.me) & Mark Contacted
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
