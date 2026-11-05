'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useRenewalDesk } from '@/lib/store';
import { useAuth } from '@/lib/auth-context';
import { AppShell } from '@/components/AppShell';
import {
  interpolateTemplate,
  validateTemplate,
  PLACEHOLDER_INFO,
  getCategorySampleData,
  SupportedPlaceholder,
} from '@/lib/whatsapp';
import { WhatsAppTemplate, TemplateType } from '@/lib/types';
import { getCategoryMetadata } from '@/lib/catalog-presets';
import {
  Save,
  Check,
  Smartphone,
  Plus,
  Trash2,
  RotateCcw,
  AlertTriangle,
  Info,
  X,
  Sparkles,
} from 'lucide-react';
import { IPhone17ProMockup } from '@/components/IPhone17ProMockup';
import { AiTemplatePromptModal } from '@/components/AiTemplatePromptModal';

export default function TemplatesPage() {
  const {
    templates,
    updateTemplate,
    addTemplate,
    deleteTemplate,
    restoreDefaultTemplates,
    business,
    customers,
    assets,
    services,
    isLoadingDb,
    isLoaded,
  } = useRenewalDesk();

  const { isConfigured, isLoading: isAuthLoading } = useAuth();
  const isCloudLoading = isConfigured && (isAuthLoading || !isLoaded);

  const [activeTemplateId, setActiveTemplateId] = useState<string>(templates[0]?.id || '');
  const [editedText, setEditedText] = useState<string>(templates[0]?.templateText || '');
  const [editedName, setEditedName] = useState<string>(templates[0]?.name || '');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('sample');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTplName, setNewTplName] = useState('');
  const [newTplType, setNewTplType] = useState<TemplateType>('CUSTOM');
  const [newTplText, setNewTplText] = useState('');
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);

  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastActiveIdRef = useRef<string | null>(null);

  // Sync active template selection
  useEffect(() => {
    if (templates.length === 0) {
      setActiveTemplateId('');
      setEditedText('');
      setEditedName('');
      lastActiveIdRef.current = null;
      return;
    }

    const selected = templates.find((t) => t.id === activeTemplateId) || templates[0];
    if (selected && selected.id !== lastActiveIdRef.current) {
      setActiveTemplateId(selected.id);
      setEditedText(selected.templateText);
      setEditedName(selected.name);
      lastActiveIdRef.current = selected.id;
    }
  }, [templates, activeTemplateId]);

  const activeTemplate = useMemo(
    () => templates.find((t) => t.id === activeTemplateId) || templates[0],
    [templates, activeTemplateId]
  );

  const handleSelectTemplate = (tpl: WhatsAppTemplate) => {
    setActiveTemplateId(tpl.id);
    setEditedText(tpl.templateText);
    setEditedName(tpl.name);
    setSavedSuccess(false);
    setActionError(null);
  };

  const handleInsertTag = (tag: SupportedPlaceholder) => {
    const el = textareaRef.current;
    if (el) {
      const start = el.selectionStart ?? editedText.length;
      const end = el.selectionEnd ?? editedText.length;
      const updated = editedText.substring(0, start) + ` ${tag} ` + editedText.substring(end);
      setEditedText(updated);
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(start + tag.length + 2, start + tag.length + 2);
      }, 0);
    } else {
      setEditedText((prev) => `${prev} ${tag} `);
    }
  };

  const handleSave = () => {
    if (!activeTemplate) return;
    try {
      updateTemplate({
        ...activeTemplate,
        name: editedName.trim() || activeTemplate.name,
        templateText: editedText,
      });
      setSavedSuccess(true);
      setActionError(null);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err: any) {
      setActionError(err?.message || 'Failed to save template changes.');
    }
  };

  const handleCreateCustomTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTplName.trim() || !newTplText.trim()) return;

    setIsSubmittingNew(true);
    setActionError(null);
    try {
      const created = await addTemplate({
        name: newTplName.trim(),
        type: newTplType,
        templateText: newTplText.trim(),
      });
      setIsAddModalOpen(false);
      setNewTplName('');
      setNewTplText('');
      setNewTplType('CUSTOM');
      setActiveTemplateId(created.id);
      setEditedName(created.name);
      setEditedText(created.templateText);
    } catch (err: any) {
      setActionError(err?.message || 'Failed to create new template.');
    } finally {
      setIsSubmittingNew(false);
    }
  };

  const handleDeleteActiveTemplate = async () => {
    if (!activeTemplate) return;
    setIsDeleting(true);
    setActionError(null);
    try {
      await deleteTemplate(activeTemplate.id);
      setIsDeleteModalOpen(false);
      const remaining = templates.filter((t) => t.id !== activeTemplate.id);
      if (remaining.length > 0) {
        setActiveTemplateId(remaining[0].id);
        setEditedName(remaining[0].name);
        setEditedText(remaining[0].templateText);
      }
    } catch (err: any) {
      setActionError(err?.message || 'Failed to delete template.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRestoreDefaults = async () => {
    setIsRestoring(true);
    setActionError(null);
    try {
      await restoreDefaultTemplates();
      setIsRestoreModalOpen(false);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err: any) {
      setActionError(err?.message || 'Failed to restore default templates.');
    } finally {
      setIsRestoring(false);
    }
  };

  // Category & dynamic preview data
  const categoryMeta = getCategoryMetadata(business.industry);
  const sampleData = getCategorySampleData(business.industry);

  const isSample = selectedCustomerId === 'sample';
  const isEmptyState = selectedCustomerId === 'none';

  const selectedCustomer = !isSample && !isEmptyState
    ? customers.find((c) => c.id === selectedCustomerId)
    : null;

  const activeCustomerName = isSample
    ? sampleData.customer_name
    : selectedCustomer
    ? selectedCustomer.name
    : null;

  const activeCustomerPhone = isSample
    ? sampleData.phone
    : selectedCustomer
    ? selectedCustomer.phone
    : null;

  const customerAsset = selectedCustomer
    ? assets.find((a) => a.customerId === selectedCustomer.id)
    : null;

  const customerService = selectedCustomer
    ? services.find((s) => s.customerId === selectedCustomer.id)
    : null;

  // Real-time syntax & placeholder validation
  const validation = useMemo(() => validateTemplate(editedText), [editedText]);

  // Interpolated preview
  const livePreview = activeCustomerName
    ? interpolateTemplate(
        editedText,
        {
          customer_name: activeCustomerName,
          service_name: customerService?.serviceName || sampleData.service_name,
          asset_name: customerAsset
            ? `${customerAsset.name}${customerAsset.capacity ? ` (${customerAsset.capacity})` : ''}`
            : sampleData.asset_name,
          due_date: customerService?.nextDueDate || sampleData.due_date,
          booking_date: customerService?.bookingDate || sampleData.booking_date,
          next_due_date: customerService?.nextDueDate || sampleData.next_due_date,
          days_overdue: sampleData.days_overdue,
          business_name: business.name,
          business_phone: business.phone,
          phone: business.phone,
        },
        { category: business.industry, stripUnresolvedTags: false }
      )
    : '';

  if (isCloudLoading) {
    return (
      <AppShell
        title="WhatsApp Message Templates"
        subtitle="Customise 1-click WhatsApp renewal messages with customer and service tags."
      >
        <div className="space-y-6 animate-pulse">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 h-96 bg-white border border-gray-200 rounded-2xl p-6" />
            <div className="lg:col-span-5 h-96 bg-white border border-gray-200 rounded-2xl p-6" />
          </div>
        </div>
      </AppShell>
    );
  }

  const isCustomTemplate = activeTemplate?.type === 'CUSTOM' || templates.length > 5;

  return (
    <AppShell
      title="WhatsApp Message Templates"
      subtitle={`Configure industry-specific message templates for ${categoryMeta.label}. All outreach is manually initiated by you via official 1-click WhatsApp links.`}
      headerActions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsAiModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-all shadow-xs"
            title="Generate custom prompts to copy into ChatGPT, Claude, or Gemini"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Generate templates with AI</span>
          </button>
          <button
            type="button"
            onClick={() => setIsRestoreModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-all shadow-xs"
            title="Reset standard templates to recommended industry defaults"
          >
            <RotateCcw className="w-3.5 h-3.5 text-gray-500" />
            <span>Restore Defaults</span>
          </button>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>New Template</span>
          </button>
        </div>
      }
    >
      {actionError && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            onClick={() => setActionError(null)}
            className="text-red-400 hover:text-red-600 p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Template Selector & Editor (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-200 p-6 space-y-6 shadow-xs">
          {/* Template Selector Bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Select Template
              </label>
              <span className="text-[11px] text-gray-400">
                Industry: <strong className="text-gray-700">{categoryMeta.label}</strong>
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {templates.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => handleSelectTemplate(tpl)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    activeTemplateId === tpl.id
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <span>{tpl.name}</span>
                  {tpl.type === 'CUSTOM' && (
                    <span
                      className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-mono ${
                        activeTemplateId === tpl.id
                          ? 'bg-blue-700 text-blue-100'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      Custom
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Template Title & Purpose Banner */}
          {activeTemplate && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl">
              <div className="flex-1">
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Template Name
                </label>
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="w-full text-xs font-semibold text-slate-900 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Template Title"
                />
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <span className="text-[11px] font-mono px-2 py-1 bg-slate-200/70 text-slate-700 rounded-md">
                  Type: {activeTemplate.type}
                </span>

                {isCustomTemplate && (
                  <button
                    type="button"
                    onClick={() => setIsDeleteModalOpen(true)}
                    className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete this template"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Validation Feedback Banner */}
          {!validation.isValid && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>Placeholder Validation Issues</span>
              </div>
              <ul className="text-[11px] text-amber-700 list-disc list-inside space-y-0.5">
                {validation.warnings.map((warn, i) => (
                  <li key={i}>{warn}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Dynamic Placeholders Pills */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Insert Dynamic Placeholders
              </label>
              <span className="text-[11px] text-gray-400">Click to insert at cursor</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PLACEHOLDER_INFO.map((item) => {
                const isUsed = validation.usedTags.includes(item.tag.toLowerCase());
                return (
                  <button
                    key={item.tag}
                    type="button"
                    onClick={() => handleInsertTag(item.tag)}
                    title={`${item.label}: ${item.description}`}
                    className={`px-2.5 py-1 rounded-md text-xs font-mono font-medium border transition-colors ${
                      isUsed
                        ? 'bg-blue-50 text-blue-800 border-blue-300 font-bold'
                        : 'bg-gray-50 text-gray-700 hover:bg-blue-50 hover:text-blue-700 border-gray-200'
                    }`}
                  >
                    {item.tag}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-gray-400 mt-1.5">
              Hover over a tag to inspect its description. Tags are replaced with real customer data when generating WhatsApp click-to-chat links.
            </p>
          </div>

          {/* Message Textarea */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="template-body-input" className="block text-xs font-semibold text-gray-700">
                Message Body
              </label>
              <span className="text-[11px] text-gray-400">
                {editedText.length} characters • Unicode / Malayalam supported
              </span>
            </div>
            <textarea
              id="template-body-input"
              ref={textareaRef}
              rows={9}
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              className="w-full p-3.5 text-xs sm:text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none leading-relaxed font-sans"
              placeholder="Write your WhatsApp message template here..."
            />
          </div>

          {/* Save / Feedback Bar */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <span className="text-xs text-gray-500 flex items-center gap-1.5">
              {savedSuccess ? (
                <span className="text-emerald-600 font-medium flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Changes saved to workspace!
                </span>
              ) : (
                <span>Applies immediately to all new WhatsApp outreach links.</span>
              )}
            </span>
            <button
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-all"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Template</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Simulated WhatsApp Device Preview (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-gray-200 p-6 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider">
              <Smartphone className="w-4 h-4 text-emerald-600" />
              <span>Interactive Device Preview</span>
            </div>

            {/* Customer Preview Selector */}
            <div className="flex items-center gap-1.5">
              <label htmlFor="preview-customer-select" className="text-[11px] text-gray-500 font-medium">
                Preview:
              </label>
              <select
                id="preview-customer-select"
                aria-label="Select preview customer"
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-gray-700 font-medium hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer max-w-[150px] truncate"
              >
                <option value="sample">Sample: {sampleData.customer_name}</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
                <option value="none">None (Empty preview)</option>
              </select>
            </div>
          </div>

          {/* iPhone 17 Pro Realistic Hardware Mockup */}
          <IPhone17ProMockup
            customerName={activeCustomerName}
            customerPhone={activeCustomerPhone}
            businessName={business.name}
            messageText={livePreview}
            timeString="10:14 AM"
            onlineStatus="Online"
          />

          <div className="text-[11px] text-center text-gray-500 space-y-1">
            <p>
              {isSample ? (
                <>
                  Previewing industry sample for <strong className="text-gray-700">{categoryMeta.label}</strong> (
                  {sampleData.asset_name})
                </>
              ) : selectedCustomer ? (
                <>
                  Previewing live customer record: <strong className="text-gray-700">{selectedCustomer.name}</strong>
                </>
              ) : (
                <span>No customer selected</span>
              )}
            </p>
            <p className="text-[10px] text-gray-400">
              Messages are generated as standard <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-700">wa.me</code> links that open in your device&apos;s WhatsApp app upon clicking.
            </p>
          </div>
        </div>
      </div>

      {/* Modal: Add New Custom Template */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-gray-100">
            <div className="px-6 py-4 bg-slate-50 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-gray-900">Create New Message Template</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomTemplate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Template Name *
                </label>
                <input
                  type="text"
                  required
                  value={newTplName}
                  onChange={(e) => setNewTplName(e.target.value)}
                  placeholder="e.g. Quarterly Filter Upgrade Offer"
                  className="w-full text-xs border border-gray-300 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Template Trigger / Purpose
                </label>
                <select
                  value={newTplType}
                  onChange={(e) => setNewTplType(e.target.value as TemplateType)}
                  className="w-full text-xs border border-gray-300 rounded-xl p-2.5 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="CUSTOM">Custom / General Announcement</option>
                  <option value="DUE_SOON">Upcoming Service Reminder (DUE_SOON)</option>
                  <option value="DUE_TODAY">Service Due Today Notice (DUE_TODAY)</option>
                  <option value="OVERDUE">Overdue Service Notice (OVERDUE)</option>
                  <option value="BOOKING_CONFIRMATION">Booking Confirmation (BOOKING_CONFIRMATION)</option>
                  <option value="SERVICE_COMPLETED">Service Completed & Next Cycle (SERVICE_COMPLETED)</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-gray-700">
                    Message Body *
                  </label>
                  <span className="text-[10px] text-gray-400">Click tag to insert</span>
                </div>

                <div className="flex flex-wrap gap-1 mb-2">
                  {['{{customer_name}}', '{{service_name}}', '{{asset_name}}', '{{due_date}}', '{{business_phone}}'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setNewTplText((prev) => `${prev} ${t} `)}
                      className="px-2 py-0.5 text-[10px] font-mono bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100"
                    >
                      {t}
                    </button>
                  ))}
                </div>

                <textarea
                  required
                  rows={6}
                  value={newTplText}
                  onChange={(e) => setNewTplText(e.target.value)}
                  placeholder="Hi {{customer_name}}, this is {{business_name}}..."
                  className="w-full text-xs border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none leading-relaxed font-sans"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-600 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingNew}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-all disabled:opacity-50"
                >
                  {isSubmittingNew ? 'Saving...' : 'Create Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirm Restore Defaults */}
      {isRestoreModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100">
            <div className="p-6 space-y-4">
              <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                <RotateCcw className="w-5 h-5" />
              </div>

              <div>
                <h3 className="text-sm font-bold text-gray-900">Restore Recommended Defaults?</h3>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                  This will reset the 5 standard lifecycle templates to their recommended default wording for{' '}
                  <strong className="text-gray-800">{categoryMeta.label}</strong>. Any custom templates you have created will be safely preserved.
                </p>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <span>Custom edits to the 5 default templates will be replaced with the latest category presets.</span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRestoreModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-600 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isRestoring}
                  onClick={handleRestoreDefaults}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-all disabled:opacity-50"
                >
                  {isRestoring ? 'Restoring...' : 'Yes, Restore Defaults'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirm Delete Template */}
      {isDeleteModalOpen && activeTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100">
            <div className="p-6 space-y-4">
              <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>

              <div>
                <h3 className="text-sm font-bold text-gray-900">Delete Template?</h3>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                  Are you sure you want to delete <strong className="text-gray-800">{activeTemplate.name}</strong>? This action cannot be undone.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-600 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleDeleteActiveTemplate}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-700 shadow-xs transition-all disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Delete Template'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: AI Template Prompt Generator */}
      <AiTemplatePromptModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
      />
    </AppShell>
  );
}
