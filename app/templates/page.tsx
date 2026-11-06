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
} from '@/lib/whatsapp';
import { WhatsAppTemplate, TemplateType } from '@/lib/types';
import { getCategoryMetadata } from '@/lib/catalog-presets';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { DropdownPortal } from '@/components/ui/DropdownPortal';
import { HelpTip } from '@/components/ui/HelpTip';
import { useToast } from '@/components/ui/Toast';
import { useTutorial } from '@/components/TutorialContext';
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
  MoreVertical,
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
    isLoaded,
  } = useRenewalDesk();

  const { isConfigured, isLoading: isAuthLoading } = useAuth();
  const toast = useToast();
  const { state: tutorialState, advance: advanceTutorial } = useTutorial();
  const isLesson5 = tutorialState.isActive && tutorialState.currentLesson === 5;
  const tutorialStep = isLesson5 ? tutorialState.currentStep : -1;
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
  const [isMobileActionsOpen, setIsMobileActionsOpen] = useState(false);
  const [actionsAnchorEl, setActionsAnchorEl] = useState<HTMLElement | null>(null);

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

  const handleInsertTag = (tag: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setEditedText((prev) => `${prev} ${tag} `);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = editedText;

    const newText = currentText.substring(0, start) + tag + currentText.substring(end);
    setEditedText(newText);
    setSavedSuccess(false);

    // Restore focus and cursor position after insertion
    setTimeout(() => {
      textarea.focus();
      const nextPos = start + tag.length;
      textarea.setSelectionRange(nextPos, nextPos);
    }, 0);
  };

  const handleSave = () => {
    if (!activeTemplate) return;
    if (!editedText.trim()) {
      setActionError('Template body cannot be empty.');
      return;
    }
    if (editedText.length > 2000) {
      setActionError('Template body cannot exceed 2,000 characters.');
      toast.error('Template body cannot exceed 2,000 characters.');
      return;
    }
    if (!editedName.trim()) {
      setActionError('Template name cannot be empty.');
      return;
    }

    try {
      updateTemplate({
        ...activeTemplate,
        name: editedName.trim(),
        templateText: editedText.trim(),
      });
      setSavedSuccess(true);
      setActionError(null);
      toast.success('Template saved successfully!');
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      setActionError(err?.message || 'Failed to save template changes.');
      toast.error('Failed to save template changes.');
    }
  };

  const handleCreateCustomTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTplName.trim() || !newTplText.trim()) return;
    if (newTplText.length > 2000) {
      setActionError('Template body cannot exceed 2,000 characters.');
      toast.error('Template body cannot exceed 2,000 characters.');
      return;
    }

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
      toast.success(`Template "${created?.name || 'New Template'}" created!`);
      if (isLesson5 && tutorialStep === 4) {
        advanceTutorial();
      }
      if (created?.id) {
        setActiveTemplateId(created.id);
        setEditedText(created.templateText);
        setEditedName(created.name);
      }
    } catch (err: any) {
      setActionError(err?.message || 'Could not create new template.');
      toast.error('Could not create new template.');
    } finally {
      setIsSubmittingNew(false);
    }
  };

  const handleRestoreDefaults = async () => {
    setIsRestoring(true);
    setActionError(null);
    try {
      await restoreDefaultTemplates();
      setIsRestoreModalOpen(false);
      toast.success('Default templates restored successfully.');
    } catch (err: any) {
      setActionError(err?.message || 'Could not restore standard templates.');
      toast.error('Could not restore standard templates.');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleDeleteActiveTemplate = async () => {
    if (!activeTemplate) return;
    setIsDeleting(true);
    setActionError(null);
    try {
      await deleteTemplate(activeTemplate.id);
      setIsDeleteModalOpen(false);
      toast.success('Template deleted.');
      // Select first remaining template
      const remaining = templates.filter((t) => t.id !== activeTemplate.id);
      if (remaining.length > 0) {
        setActiveTemplateId(remaining[0].id);
        setEditedText(remaining[0].templateText);
        setEditedName(remaining[0].name);
      }
    } catch (err: any) {
      setActionError(err?.message || 'Could not delete template.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Category metadata & sample data for live preview
  const categoryMeta = getCategoryMetadata(business.industry);
  const sampleData = useMemo(() => getCategorySampleData(business.industry), [business.industry]);

  // Selected customer for preview
  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === selectedCustomerId),
    [customers, selectedCustomerId]
  );

  const customerAsset = useMemo(
    () => (selectedCustomer ? assets.find((a) => a.customerId === selectedCustomer.id) : undefined),
    [assets, selectedCustomer]
  );

  const customerService = useMemo(
    () => (selectedCustomer ? services.find((s) => s.customerId === selectedCustomer.id) : undefined),
    [services, selectedCustomer]
  );

  const isSample = selectedCustomerId === 'sample' || !selectedCustomer;
  const activeCustomerName = isSample ? sampleData.customer_name : selectedCustomer?.name || '';
  const activeCustomerPhone = isSample ? sampleData.phone : selectedCustomer?.phone || '';

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
        <div className="space-y-6 animate-pulse max-w-7xl mx-auto">
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
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* Desktop full buttons (sm and up) */}
          <div className="hidden sm:flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAiModalOpen(true)}
              leftIcon={<Sparkles className="w-3.5 h-3.5 text-indigo-600" />}
            >
              Generate with AI
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRestoreModalOpen(true)}
              leftIcon={<RotateCcw className="w-3.5 h-3.5 text-gray-500" />}
            >
              Restore Defaults
            </Button>
            <Button
              variant="primary"
              size="sm"
              data-tutorial="new-template-btn"
              onClick={() => {
                setIsAddModalOpen(true);
                if (isLesson5 && tutorialStep === 0) {
                  advanceTutorial();
                }
              }}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              New Template
            </Button>
          </div>

          {/* Mobile responsive buttons (< sm) */}
          <div className="flex sm:hidden items-center gap-1.5 relative">
            <Button
              variant="primary"
              size="sm"
              data-tutorial="new-template-btn"
              onClick={() => {
                setIsAddModalOpen(true);
                if (isLesson5 && tutorialStep === 0) {
                  advanceTutorial();
                }
              }}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              New
            </Button>

            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsMobileActionsOpen((prev) => !prev)}
                aria-label="More template actions"
                className="px-2 min-w-[36px]"
              >
                <MoreVertical className="w-4 h-4 text-gray-600" />
              </Button>

              <DropdownPortal
                  isOpen={isMobileActionsOpen}
                  onClose={() => setIsMobileActionsOpen(false)}
                  triggerRef={actionsAnchorEl}
                  minWidth={192}
                >
                  <button
                      type="button"
                      onClick={() => {
                        setIsMobileActionsOpen(false);
                        setIsAiModalOpen(true);
                      }}
                      className="w-full px-3 py-2 text-left flex items-center gap-2 text-gray-700 hover:bg-gray-50 font-medium"
                    >
                      <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span>Generate with AI</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileActionsOpen(false);
                        setIsRestoreModalOpen(true);
                      }}
                      className="w-full px-3 py-2 text-left flex items-center gap-2 text-gray-700 hover:bg-gray-50 font-medium border-t border-gray-100"
                    >
                      <RotateCcw className="w-4 h-4 text-gray-500 shrink-0" />
                      <span>Restore Defaults</span>
                    </button>
                </DropdownPortal>
            </div>
          </div>
        </div>
      }
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {actionError && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{actionError}</span>
            </div>
            <button
              type="button"
              onClick={() => setActionError(null)}
              className="text-red-400 hover:text-red-600 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Clean 2-column layout without nested scrollbars */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Template Selector & Editor (7 cols) */}
          <div className="lg:col-span-7 space-y-6 min-w-0">
            <Card>
              <CardContent className="p-4 sm:p-6 space-y-6">
                {/* Template Selector Bar */}
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Select Template
                    </label>
                    <Badge variant="neutral" className="max-w-full truncate">{categoryMeta.label}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {templates.map((tpl) => {
                      const isSelected = activeTemplateId === tpl.id;
                      return (
                        <button
                          key={tpl.id}
                          type="button"
                          data-tutorial={tpl.id === templates[0]?.id ? "template-item" : undefined}
                          onClick={() => handleSelectTemplate(tpl)}
                          className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 min-h-[38px] max-w-full ${
                            isSelected
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          <span className="truncate max-w-[180px] sm:max-w-none">{tpl.name}</span>
                          {tpl.type === 'CUSTOM' && (
                            <span
                              className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-mono shrink-0 ${
                                isSelected
                                  ? 'bg-blue-700 text-blue-100'
                                  : 'bg-gray-200 text-gray-600'
                              }`}
                            >
                              Custom
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Template Title & Purpose Banner */}
                {activeTemplate && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl">
                    <div className="flex-1 min-w-0 w-full">
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

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <Badge variant="neutral">
                        Type: {activeTemplate.type}
                      </Badge>

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
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
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
                  <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Insert Dynamic Placeholders
                    </label>
                    <span className="text-[11px] text-gray-400">Tap to insert at cursor</span>
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
                          className={`px-2.5 py-1 rounded-md text-xs font-mono font-medium border transition-colors min-h-[30px] max-w-full ${
                            isUsed
                              ? 'bg-blue-50 text-blue-800 border-blue-300 font-bold'
                              : 'bg-gray-50 text-gray-700 hover:bg-blue-50 hover:text-blue-700 border-gray-200'
                          }`}
                        >
                          <span className="truncate">{item.tag}</span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1.5">
                    Tags are replaced with real customer data when generating WhatsApp click-to-chat links.
                  </p>
                </div>

                {/* Message Textarea */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="template-body-input" className="block text-xs font-semibold text-gray-700">
                      Message Body
                    </label>
                    <span className={`text-[11px] font-mono ${editedText.length > 2000 ? 'text-red-600 font-bold' : editedText.length > 1800 ? 'text-amber-600' : 'text-gray-400'}`}>
                      {editedText.length}/2,000 characters
                    </span>
                  </div>
                  <textarea
                    id="template-body-input"
                    data-tutorial="template-body"
                    ref={textareaRef}
                    rows={8}
                    maxLength={2000}
                    value={editedText}
                    onChange={(e) => setEditedText(e.target.value)}
                    className="w-full max-w-full p-3.5 text-xs sm:text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none leading-relaxed font-sans min-h-[180px] box-border"
                    placeholder="Write your WhatsApp message template here..."
                  />
                </div>

                {/* Save / Feedback Bar */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-gray-100">
                  <span className="text-xs text-gray-500 flex items-center gap-1.5">
                    {savedSuccess ? (
                      <span className="text-emerald-600 font-semibold flex items-center gap-1">
                        <Check className="w-4 h-4" /> Changes saved to workspace!
                      </span>
                    ) : (
                      <span>Applies immediately to all new WhatsApp outreach links.</span>
                    )}
                  </span>
                  <Button
                    variant="primary"
                    data-tutorial="save-template-btn"
                    onClick={handleSave}
                    className="w-full sm:w-auto"
                    leftIcon={savedSuccess ? <Check className="w-4 h-4 text-emerald-200" /> : <Save className="w-4 h-4" />}
                  >
                    {savedSuccess ? 'Saved!' : 'Save Template'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Simulated WhatsApp Device Preview (5 cols, sticky on desktop) */}
          <div className="lg:col-span-5 lg:sticky lg:top-6 space-y-4 min-w-0">
            <Card>
              <CardContent className="p-4 sm:p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider">
                    <Smartphone className="w-4 h-4 text-emerald-600" />
                    <span>Interactive Device Preview</span>
                  </div>

                  {/* Customer Preview Selector */}
                  <div className="flex items-center gap-1.5 max-w-full min-w-0">
                    <label htmlFor="preview-customer-select" className="text-[11px] text-gray-500 font-medium shrink-0">
                      Preview:
                    </label>
                    <select
                      id="preview-customer-select"
                      aria-label="Select preview customer"
                      value={selectedCustomerId}
                      onChange={(e) => setSelectedCustomerId(e.target.value)}
                      className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-gray-700 font-medium hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer max-w-[140px] truncate"
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

                {/* iPhone 17 Pro Hardware Mockup */}
                <div className="w-full max-w-[290px] mx-auto overflow-hidden">
                  <IPhone17ProMockup
                    customerName={activeCustomerName}
                    customerPhone={activeCustomerPhone}
                    businessName={business.name}
                    messageText={livePreview}
                    timeString="10:14 AM"
                    onlineStatus="Online"
                  />
                </div>

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
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Modal: Add New Custom Template */}
      <Modal
        isOpen={isAddModalOpen}
        dataModal="custom-template"
        onClose={() => setIsAddModalOpen(false)}
        title="Create New Message Template"
        icon={<Sparkles className="w-5 h-5 text-blue-600" />}
        maxWidth="lg"
      >
        <form onSubmit={handleCreateCustomTemplate} className="space-y-4 py-2">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Template Name *
            </label>
            <input
              type="text"
              required
              data-tutorial="template-name"
              value={newTplName}
              onChange={(e) => setNewTplName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && isLesson5 && tutorialStep === 1 && newTplName.trim().length >= 2) {
                  e.preventDefault();
                  advanceTutorial();
                }
              }}
              placeholder="e.g. Quarterly Filter Upgrade Offer"
              className="w-full text-xs border border-gray-300 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Template Trigger / Purpose
            </label>
            <select
              data-tutorial="template-type"
              value={newTplType}
              onChange={(e) => {
                setNewTplType(e.target.value as TemplateType);
                if (isLesson5 && tutorialStep === 2) {
                  advanceTutorial();
                }
              }}
              className="w-full text-xs border border-gray-300 rounded-xl p-2.5 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
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
              <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700">
                <span>Message Body *</span>
                <HelpTip
                  title="Template Placeholders"
                  content="Placeholders like {{customer_name}}, {{service_name}}, and {{due_date}} are automatically filled with customer and vehicle/appliance details when generating the WhatsApp message."
                />
              </label>
              <span className="text-[10px] text-gray-400">Click tag to insert</span>
            </div>

            <div data-tutorial="placeholder-chips" className="flex flex-wrap gap-1 mb-2">
              {['{{customer_name}}', '{{service_name}}', '{{asset_name}}', '{{due_date}}', '{{business_phone}}'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setNewTplText((prev) => `${prev} ${t} `);
                    if (isLesson5 && tutorialStep === 3) {
                      advanceTutorial();
                    }
                  }}
                  className="px-2 py-0.5 text-[10px] font-mono bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100"
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-gray-700">Message Body *</span>
              <span className={`text-[10px] font-mono ${newTplText.length > 2000 ? 'text-red-600 font-bold' : newTplText.length > 1800 ? 'text-amber-600' : 'text-gray-400'}`}>
                {newTplText.length}/2,000 characters
              </span>
            </div>

            <textarea
              required
              rows={6}
              maxLength={2000}
              data-tutorial="template-body"
              value={newTplText}
              onChange={(e) => setNewTplText(e.target.value)}
              placeholder="Hi {{customer_name}}, this is {{business_name}}..."
              className="w-full text-xs border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none leading-relaxed font-sans"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <Button
              variant="outline"
              type="button"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              data-tutorial="save-custom-template-btn"
              disabled={isSubmittingNew}
            >
              {isSubmittingNew ? 'Saving...' : 'Create Template'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Confirm Restore Defaults */}
      <Modal
        isOpen={isRestoreModalOpen}
        onClose={() => setIsRestoreModalOpen(false)}
        title="Restore Recommended Defaults?"
        icon={<RotateCcw className="w-5 h-5 text-blue-600" />}
        maxWidth="md"
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <Button
              variant="outline"
              onClick={() => setIsRestoreModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={isRestoring}
              onClick={handleRestoreDefaults}
            >
              {isRestoring ? 'Restoring...' : 'Yes, Restore Defaults'}
            </Button>
          </div>
        }
      >
        <div className="space-y-3 py-2 text-xs text-gray-600 leading-relaxed">
          <p>
            This will reset the 5 standard lifecycle templates to their recommended default wording for{' '}
            <strong className="text-gray-800">{categoryMeta.label}</strong>. Any custom templates you have created will be safely preserved.
          </p>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>Custom edits to the 5 default templates will be replaced with the latest category presets.</span>
          </div>
        </div>
      </Modal>

      {/* Modal: Confirm Delete Template */}
      <Modal
        isOpen={isDeleteModalOpen && Boolean(activeTemplate)}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Template?"
        icon={<Trash2 className="w-5 h-5 text-red-600" />}
        maxWidth="md"
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={isDeleting}
              onClick={handleDeleteActiveTemplate}
            >
              {isDeleting ? 'Deleting...' : 'Delete Template'}
            </Button>
          </div>
        }
      >
        <div className="space-y-2 py-2 text-xs text-gray-600 leading-relaxed">
          <p>
            Are you sure you want to delete <strong className="text-gray-900">{activeTemplate?.name}</strong>? This action cannot be undone.
          </p>
        </div>
      </Modal>

      {/* Modal: AI Template Prompt Generator */}
      <AiTemplatePromptModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
      />
    </AppShell>
  );
}
