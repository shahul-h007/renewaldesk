'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRenewalDesk } from '@/lib/store';
import { useAuth } from '@/lib/auth-context';
import { AppShell } from '@/components/AppShell';
import {
  parseCSVText,
  guessMapping,
  validateAndMapRows,
  normalizePhoneNumber,
  CSVMapping,
  ParsedCSVRow,
  ExistingCustomerMatch,
} from '@/lib/csv-import';
import { fetchArchivedCustomersInDb } from '@/lib/db/operations';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { HelpTip } from '@/components/ui/HelpTip';
import { useToast } from '@/components/ui/Toast';
import {
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Download,
  FileSpreadsheet,
  RefreshCw,
  Users,
  Check,
  Calendar,
  Sparkles,
  ChevronRight,
  Info,
  Trash2,
  Copy,
} from 'lucide-react';

const SAMPLE_CSV = `Customer Name,Mobile,Appliance Model,Last Service,Next Due Date,Fee,Address,Locality,City,PIN Code,Landmark
Suresh Menon,9846055441,Daikin 1.5T Inverter,2026-04-05,2026-10-05,1200,Flat 2A SkyCity,Palarivattom,Kochi,682025,Near Metro Pillar 500
Vipin Das,9745123490,LG Dual Inverter,2026-03-20,2026-09-20,1500,Door 12/90,Vyttila,Kochi,682019,Near Mobility Hub
Latha Nair,9847098112,Samsung WindFree 2T,2026-04-12,2026-10-12,1800,Villa 8 InfoPark,Kakkanad,Kochi,682030,Opposite Rajagiri
Robin Mathew,9946011998,Voltas 1 Ton Window,2026-04-01,2026-10-01,900,Station Road,Aluva,Kochi,683101,Near Railway Station
Deepa Thomas,9846111222,Panasonic Smart AC,2026-04-08,2026-10-08,1200,BayView Apt 401,Edappally,Kochi,682024,Near Lulu Mall`;

type WizardStep = 1 | 2 | 3 | 4;

export default function ImportPage() {
  const router = useRouter();
  const { customers, deleteCustomer, hardDeleteCustomer, importCustomersFromCSV, business, isDatabaseMode } = useRenewalDesk();
  const { business: authBiz } = useAuth();
  const toast = useToast();

  const [step, setStep] = useState<WizardStep>(1);
  const [csvText, setCsvText] = useState('');
  const [fileName, setFileName] = useState<string>('');
  const [fileSize, setFileSize] = useState<string>('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [isSampleImport, setIsSampleImport] = useState(false);
  const [sampleRemoved, setSampleRemoved] = useState(false);

  const [mapping, setMapping] = useState<CSVMapping>({
    nameCol: '',
    phoneCol: '',
    assetCol: '',
    lastDateCol: '',
    nextDateCol: '',
    amountCol: '',
    addressCol: '',
    localityCol: '',
    cityCol: '',
    pincodeCol: '',
    landmarkCol: '',
  });

  const [validRows, setValidRows] = useState<ParsedCSVRow[]>([]);
  const [invalidRows, setInvalidRows] = useState<ParsedCSVRow[]>([]);
  const [duplicateCSVRows, setDuplicateCSVRows] = useState<ParsedCSVRow[]>([]);
  const [existingCustomerRows, setExistingCustomerRows] = useState<ParsedCSVRow[]>([]);
  const [skipDuplicates, setSkipDuplicates] = useState(true);

  // Archived customer phone numbers cache
  const [archivedCustomers, setArchivedCustomers] = useState<ExistingCustomerMatch[]>([]);

  useEffect(() => {
    if (isDatabaseMode && authBiz?.id) {
      fetchArchivedCustomersInDb(authBiz.id)
        .then((archived) => {
          setArchivedCustomers(
            archived.map((c) => ({
              name: c.name,
              phone: c.phone,
              isArchived: true,
            }))
          );
        })
        .catch(() => {});
    }
  }, [isDatabaseMode, authBiz?.id]);

  const [importedCount, setImportedCount] = useState<number | null>(null);
  const [importFailedCount, setImportFailedCount] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importWarning, setImportWarning] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size exceeds 5MB limit. Please upload a smaller CSV file.');
      return;
    }

    setIsSampleImport(false);
    setFileName(file.name);
    setFileSize(`${(file.size / 1024).toFixed(1)} KB`);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      processCSVContent(content, file.name);
    };
    reader.readAsText(file);
  };

  const processCSVContent = (content: string, name = 'customer_data.csv') => {
    setCsvText(content);
    if (!fileName) setFileName(name);
    const { headers: parsedHeaders, rows: parsedRows } = parseCSVText(content);
    if (parsedHeaders.length === 0) {
      toast.error('Could not read any column headers from CSV. Please check the file format.');
      return;
    }
    setHeaders(parsedHeaders);
    setRawRows(parsedRows);

    const guessed = guessMapping(parsedHeaders);
    setMapping(guessed);
    setStep(2);
  };

  const handleUseSample = () => {
    setIsSampleImport(true);
    setSampleRemoved(false);
    setFileName('sample_kochi_ac_customers.csv');
    setFileSize('1.8 KB');
    processCSVContent(SAMPLE_CSV, 'sample_kochi_ac_customers.csv');
  };

  const handleDownloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'renewaldesk_sample_customers.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleProceedToValidation = () => {
    if (!mapping.nameCol || !mapping.phoneCol) {
      toast.error('Please select columns for at least Customer Name and Mobile Number.');
      return;
    }

    const existingMatches: ExistingCustomerMatch[] = [
      ...customers.map((c) => ({ name: c.name, phone: c.phone, isArchived: false })),
      ...archivedCustomers,
    ];

    const result = validateAndMapRows(rawRows, mapping, {
      defaultIntervalMonths: business?.defaultIntervalMonths || 6,
      existingCustomers: existingMatches,
      category: business?.industry,
    });

    setValidRows(result.validRows);
    setInvalidRows(result.invalidRows);
    setDuplicateCSVRows(result.duplicateCSVRows);
    setExistingCustomerRows(result.existingCustomerRows);
    setStep(3);
  };

  // Determine which rows will be imported based on skipDuplicates toggle
  const rowsToImport = skipDuplicates
    ? validRows.filter((r) => !r.isDuplicateInCSV && !r.isExistingCustomer)
    : validRows;

  const totalDuplicatesCount = validRows.filter(
    (r) => r.isDuplicateInCSV || r.isExistingCustomer
  ).length;

  const handleConfirmImport = async () => {
    if (isImporting || rowsToImport.length === 0) return;
    setIsImporting(true);
    setImportError(null);
    setImportWarning(null);
    setStep(4);

    try {
      // If sample import, tag records cleanly with [Sample Data] notes
      const payload = isSampleImport
        ? rowsToImport.map((r) => {
            if (!r.normalized) return r;
            return {
              ...r,
              normalized: {
                ...r.normalized,
                isSample: true,
                address: r.normalized.address
                  ? `${r.normalized.address} [Sample Data]`
                  : '[Sample Data]',
              },
            };
          })
        : rowsToImport;

      const result = await importCustomersFromCSV(payload);
      if (!result.success) {
        setImportError(result.error || 'The import did not complete. No success has been reported.');
        return;
      }

      setImportedCount(result.count);
      setImportFailedCount(result.failedCount || 0);
      setImportWarning(result.warning || null);
      if (result.error && result.failedCount) {
        setImportWarning(result.error);
      }
    } catch (err: any) {
      setImportError(err?.message || 'Unexpected import error. Refresh the customer list before retrying.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleRemoveSampleData = () => {
    // Find all customers created from sample import (matching the 5 sample phone numbers or names)
    const samplePhones = new Set(['9846055441', '9745123490', '9847098112', '9946011998', '9846111222']);
    const sampleCusts = customers.filter(
      (c) =>
        samplePhones.has(normalizePhoneNumber(c.phone)) ||
        c.address?.includes('[Sample Data]') ||
        c.name === 'Suresh Menon' ||
        c.name === 'Vipin Das' ||
        c.name === 'Latha Nair' ||
        c.name === 'Robin Mathew' ||
        c.name === 'Deepa Thomas'
    );

    sampleCusts.forEach((c) => {
      if (hardDeleteCustomer) {
        void hardDeleteCustomer(c.id);
      } else {
        deleteCustomer(c.id);
      }
    });

    setSampleRemoved(true);
    toast.success('Sample customers removed cleanly.');
  };

  const resetWizard = () => {
    setStep(1);
    setCsvText('');
    setFileName('');
    setFileSize('');
    setHeaders([]);
    setRawRows([]);
    setValidRows([]);
    setInvalidRows([]);
    setDuplicateCSVRows([]);
    setExistingCustomerRows([]);
    setImportedCount(null);
    setImportFailedCount(0);
    setImportError(null);
    setImportWarning(null);
    setIsSampleImport(false);
    setSampleRemoved(false);
  };

  const stepsList = [
    { num: 1, label: 'Upload CSV' },
    { num: 2, label: 'Match Columns' },
    { num: 3, label: 'Review Records' },
    { num: 4, label: 'Import Complete' },
  ];

  return (
    <AppShell
      title="Import Customer Records"
      subtitle="Bring your existing Excel or CSV customer sheet into RenewalDesk."
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Wizard Progress Bar */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-200/90 shadow-xs">
          <div className="grid grid-cols-4 gap-2 sm:gap-4 relative">
            {stepsList.map((s) => {
              const isPassed = step > s.num;
              const isCurrent = step === s.num;
              return (
                <div key={s.num} className="flex flex-col sm:flex-row items-center sm:gap-3 text-center sm:text-left">
                  <div
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                      isPassed
                        ? 'bg-emerald-600 text-white'
                        : isCurrent
                        ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {isPassed ? <Check className="w-4 h-4 stroke-[3]" /> : s.num}
                  </div>
                  <div className="mt-1 sm:mt-0 min-w-0">
                    <span
                      className={`text-[10px] sm:text-xs font-semibold block truncate ${
                        isCurrent
                          ? 'text-blue-700'
                          : isPassed
                          ? 'text-gray-900'
                          : 'text-gray-400'
                      }`}
                    >
                      {s.label}
                    </span>
                    <span className="hidden sm:block text-[10px] text-gray-400">
                      {s.num === 1 && 'Upload file'}
                      {s.num === 2 && 'Map fields'}
                      {s.num === 3 && 'Check errors'}
                      {s.num === 4 && 'Sync to queue'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sample Mode Banner */}
        {isSampleImport && (
          <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>
                <strong>Sample Test Mode:</strong> You are testing with 5 sample Kochi AC customer records. No real customers are affected, and you can remove them with one tap at any time.
              </span>
            </div>
            <button
              type="button"
              onClick={resetWizard}
              className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 underline shrink-0 ml-2"
            >
              Cancel Sample
            </button>
          </div>
        )}

        {/* STEP 1: Upload File */}
        {step === 1 && (
          <Card>
            <CardContent className="p-6 sm:p-10 text-center space-y-6">
              <div className="max-w-md mx-auto space-y-1.5">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">
                  Upload your customer spreadsheet
                </h2>
                <p className="text-xs text-gray-500">
                  Export your existing customer list from Excel, Google Sheets, or billing software as a <code className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-700 font-mono">.csv</code> file.
                </p>
              </div>

              {/* Dropzone */}
              <label className="block max-w-xl mx-auto border-2 border-dashed border-gray-300 hover:border-blue-500 rounded-2xl p-6 sm:p-10 cursor-pointer transition-all bg-gray-50/50 hover:bg-blue-50/30 group">
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto group-hover:scale-105 transition-transform">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-blue-600 group-hover:text-blue-700 underline">
                      Click to choose CSV file
                    </span>
                    <span className="text-xs text-gray-500"> or drag and drop here</span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Supports files up to 5MB with Name, Mobile, and Service Dates
                  </p>
                </div>
              </label>

              {/* Sample Actions Bar */}
              <div className="pt-4 border-t border-gray-100 max-w-xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <button
                  type="button"
                  onClick={handleDownloadSample}
                  className="text-gray-600 hover:text-gray-900 font-medium inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 min-h-[36px]"
                >
                  <Download className="w-3.5 h-3.5 text-gray-500" />
                  <span>Download Sample CSV template</span>
                </button>

                <button
                  type="button"
                  onClick={handleUseSample}
                  className="font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-blue-50 hover:bg-blue-100 min-h-[36px]"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
                  <span>Try with 5 sample Kochi AC clients</span>
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 2: Match Columns */}
        {step === 2 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="inline-flex items-center gap-2">
                  <span>Match Columns to RenewalDesk</span>
                  <HelpTip
                    title="CSV Column Matching"
                    content="Match the headers in your spreadsheet with RenewalDesk fields. Only Customer Name and Mobile Phone are required; appliance, dates, and amounts are optional."
                  />
                </CardTitle>
                <CardDescription>
                  Found <strong className="text-gray-900">{rawRows.length}</strong> rows in {fileName || 'your file'}. Verify which column corresponds to each field:
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep(1)}
              >
                Change File
              </Button>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Mapping Table */}
              <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden text-xs">
                {/* Name (Required) */}
                <div className="p-3.5 sm:p-4 grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 items-center bg-blue-50/30">
                  <div className="sm:col-span-4 font-bold text-gray-900 flex items-center gap-1">
                    <span>Customer Name</span>
                    <span className="text-red-500">*</span>
                  </div>
                  <div className="sm:col-span-4">
                    <select
                      value={mapping.nameCol}
                      onChange={(e) => setMapping({ ...mapping, nameCol: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl bg-white text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="">Select column...</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-4 text-gray-500 truncate">
                    Sample: <strong className="text-gray-800">{rawRows[0]?.[mapping.nameCol] || '—'}</strong>
                  </div>
                </div>

                {/* Mobile (Required) */}
                <div className="p-3.5 sm:p-4 grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 items-center bg-blue-50/30">
                  <div className="sm:col-span-4 font-bold text-gray-900 flex items-center gap-1">
                    <span>Mobile / WhatsApp</span>
                    <span className="text-red-500">*</span>
                  </div>
                  <div className="sm:col-span-4">
                    <select
                      value={mapping.phoneCol}
                      onChange={(e) => setMapping({ ...mapping, phoneCol: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl bg-white text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="">Select column...</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-4 text-gray-500 truncate">
                    Sample: <strong className="text-gray-800">{rawRows[0]?.[mapping.phoneCol] || '—'}</strong>
                  </div>
                </div>

                {/* Appliance */}
                <div className="p-3.5 sm:p-4 grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 items-center">
                  <div className="sm:col-span-4 font-semibold text-gray-700">Appliance / Model</div>
                  <div className="sm:col-span-4">
                    <select
                      value={mapping.assetCol}
                      onChange={(e) => setMapping({ ...mapping, assetCol: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl bg-white text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="">Select column (optional)...</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-4 text-gray-500 truncate">
                    Sample: {rawRows[0]?.[mapping.assetCol] || '—'}
                  </div>
                </div>

                {/* Last Service Date */}
                <div className="p-3.5 sm:p-4 grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 items-center">
                  <div className="sm:col-span-4 font-semibold text-gray-700">Last Service Date</div>
                  <div className="sm:col-span-4">
                    <select
                      value={mapping.lastDateCol}
                      onChange={(e) => setMapping({ ...mapping, lastDateCol: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl bg-white text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="">Select column (optional)...</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-4 text-gray-500 truncate">
                    Sample: {rawRows[0]?.[mapping.lastDateCol] || '—'}
                  </div>
                </div>

                {/* Next Due Date */}
                <div className="p-3.5 sm:p-4 grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 items-center">
                  <div className="sm:col-span-4 font-semibold text-gray-700">Next Service Due Date</div>
                  <div className="sm:col-span-4">
                    <select
                      value={mapping.nextDateCol}
                      onChange={(e) => setMapping({ ...mapping, nextDateCol: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl bg-white text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="">Select column (or auto-calculate)...</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-4 text-gray-500 truncate">
                    Sample: {rawRows[0]?.[mapping.nextDateCol] || '—'}
                  </div>
                </div>

                {/* Service Fee */}
                <div className="p-3.5 sm:p-4 grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 items-center">
                  <div className="sm:col-span-4 font-semibold text-gray-700">Service Fee / Amount</div>
                  <div className="sm:col-span-4">
                    <select
                      value={mapping.amountCol}
                      onChange={(e) => setMapping({ ...mapping, amountCol: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl bg-white text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="">Select column (optional)...</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-4 text-gray-500 truncate">
                    Sample: {rawRows[0]?.[mapping.amountCol] || '—'}
                  </div>
                </div>

                {/* Address */}
                <div className="p-3.5 sm:p-4 grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 items-center">
                  <div className="sm:col-span-4 font-semibold text-gray-700">Address / Flat / Street</div>
                  <div className="sm:col-span-4">
                    <select
                      value={mapping.addressCol}
                      onChange={(e) => setMapping({ ...mapping, addressCol: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl bg-white text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="">Select column (optional)...</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-4 text-gray-500 truncate">
                    Sample: {rawRows[0]?.[mapping.addressCol] || '—'}
                  </div>
                </div>

                {/* Locality */}
                <div className="p-3.5 sm:p-4 grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 items-center">
                  <div className="sm:col-span-4 font-semibold text-gray-700">Locality / Area</div>
                  <div className="sm:col-span-4">
                    <select
                      value={mapping.localityCol}
                      onChange={(e) => setMapping({ ...mapping, localityCol: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl bg-white text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="">Select column (optional)...</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-4 text-gray-500 truncate">
                    Sample: {mapping.localityCol ? rawRows[0]?.[mapping.localityCol] : '—'}
                  </div>
                </div>

                {/* City */}
                <div className="p-3.5 sm:p-4 grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 items-center">
                  <div className="sm:col-span-4 font-semibold text-gray-700">City / Town</div>
                  <div className="sm:col-span-4">
                    <select
                      value={mapping.cityCol}
                      onChange={(e) => setMapping({ ...mapping, cityCol: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl bg-white text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="">Select column (optional)...</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-4 text-gray-500 truncate">
                    Sample: {mapping.cityCol ? rawRows[0]?.[mapping.cityCol] : '—'}
                  </div>
                </div>

                {/* PIN Code */}
                <div className="p-3.5 sm:p-4 grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 items-center">
                  <div className="sm:col-span-4 font-semibold text-gray-700">PIN Code</div>
                  <div className="sm:col-span-4">
                    <select
                      value={mapping.pincodeCol}
                      onChange={(e) => setMapping({ ...mapping, pincodeCol: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl bg-white text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="">Select column (optional)...</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-4 text-gray-500 truncate">
                    Sample: {mapping.pincodeCol ? rawRows[0]?.[mapping.pincodeCol] : '—'}
                  </div>
                </div>

                {/* Landmark */}
                <div className="p-3.5 sm:p-4 grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 items-center">
                  <div className="sm:col-span-4 font-semibold text-gray-700">Landmark</div>
                  <div className="sm:col-span-4">
                    <select
                      value={mapping.landmarkCol}
                      onChange={(e) => setMapping({ ...mapping, landmarkCol: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl bg-white text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="">Select column (optional)...</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-4 text-gray-500 truncate">
                    Sample: {mapping.landmarkCol ? rawRows[0]?.[mapping.landmarkCol] : '—'}
                  </div>
                </div>
              </div>

              {/* Actions Bar */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  leftIcon={<ArrowLeft className="w-4 h-4" />}
                >
                  Back
                </Button>
                <Button
                  variant="primary"
                  onClick={handleProceedToValidation}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Review Records ({rawRows.length})
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 3: Review Records */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Validation Summary</CardTitle>
              <CardDescription>
                Review your parsed records, inspect duplicates, and confirm before adding them to your live follow-up queue.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Validation Status Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xl font-extrabold text-emerald-950 font-mono block">
                      {rowsToImport.length}
                    </span>
                    <span className="text-xs text-emerald-700 font-semibold">
                      Ready to Import
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xl font-extrabold text-amber-950 font-mono block">
                      {totalDuplicatesCount}
                    </span>
                    <span className="text-xs text-amber-700 font-semibold">
                      Duplicates Detected
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-red-50/70 border border-red-200 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xl font-extrabold text-red-950 font-mono block">
                      {invalidRows.length}
                    </span>
                    <span className="text-xs text-red-700 font-semibold">
                      Rows with Errors
                    </span>
                  </div>
                </div>
              </div>

              {/* Duplicate Handling Section */}
              {totalDuplicatesCount > 0 && (
                <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span className="text-xs font-bold text-amber-900">
                        Duplicate Phone Numbers Detected ({totalDuplicatesCount})
                      </span>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-amber-950">
                      <input
                        type="checkbox"
                        checked={skipDuplicates}
                        onChange={(e) => setSkipDuplicates(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <span>Skip duplicates during import (Recommended)</span>
                    </label>
                  </div>

                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    {skipDuplicates
                      ? `Duplicate rows (${totalDuplicatesCount}) will be skipped to protect your existing customer records.`
                      : 'You chose not to skip duplicates. All valid rows will be imported.'}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-amber-900 pt-1 border-t border-amber-200/60">
                    {duplicateCSVRows.length > 0 && (
                      <div>
                        • <strong>{duplicateCSVRows.length}</strong> duplicate within this CSV
                      </div>
                    )}
                    {existingCustomerRows.length > 0 && (
                      <div>
                        • <strong>{existingCustomerRows.length}</strong> already in shop (active/archived)
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Invalid Rows Warning Box */}
              {invalidRows.length > 0 && (
                <div className="p-4 bg-red-50/60 border border-red-200 rounded-xl space-y-2 text-xs">
                  <div className="font-bold text-red-900 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <span>{invalidRows.length} rows have missing or invalid data (Skipped):</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-red-800 text-[11px] max-h-36 overflow-y-auto">
                    {invalidRows.slice(0, 10).map((row, i) => (
                      <li key={i}>
                        Row {row.rowIndex}: {row.errors.join(', ')} ({row.raw[mapping.nameCol] || 'Unnamed'})
                      </li>
                    ))}
                    {invalidRows.length > 10 && (
                      <li className="font-semibold italic">...and {invalidRows.length - 10} more rows</li>
                    )}
                  </ul>
                </div>
              )}

              {/* Preview Table of Rows */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                  <span className="font-bold text-xs text-gray-800">
                    Preview of Customer Records ({Math.min(6, validRows.length)} of {validRows.length})
                  </span>
                  <Badge variant="neutral">Normalized</Badge>
                </div>

                <div className="divide-y divide-gray-100 text-xs">
                  {validRows.slice(0, 6).map((row, idx) => {
                    const isDup = row.isDuplicateInCSV || row.isExistingCustomer;
                    return (
                      <div
                        key={idx}
                        className={`p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-4 gap-2 items-center hover:bg-gray-50/50 ${
                          isDup && skipDuplicates ? 'opacity-60 bg-amber-50/20' : ''
                        }`}
                      >
                        <div>
                          <div className="font-bold text-gray-900 flex items-center gap-1.5">
                            <span>{row.normalized?.name}</span>
                            {isDup && (
                              <Badge variant="warning">
                                {row.isExistingCustomer ? 'Already in Shop' : 'Duplicate'}
                              </Badge>
                            )}
                          </div>
                          <div className="text-[11px] text-gray-500 font-mono">
                            {row.normalized?.phone}
                          </div>
                        </div>
                        <div className="text-gray-700">
                          {row.normalized?.assetName}
                        </div>
                        <div className="text-gray-500 truncate">
                          {row.normalized?.address || row.normalized?.locality || '—'}
                        </div>
                        <div className="text-left sm:text-right">
                          <span className="font-bold text-blue-700 font-mono block">
                            Due: {row.normalized?.nextDueDate}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            ₹{row.normalized?.serviceAmount || 1200}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Actions Bar */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <Button
                  variant="outline"
                  onClick={() => setStep(2)}
                  leftIcon={<ArrowLeft className="w-4 h-4" />}
                >
                  Adjust Mapping
                </Button>
                <Button
                  variant="success"
                  onClick={handleConfirmImport}
                  disabled={rowsToImport.length === 0}
                  rightIcon={<CheckCircle2 className="w-4 h-4" />}
                >
                  Import {rowsToImport.length} Customers Now
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 4: Import Success / Result Screen */}
        {step === 4 && (
          <Card>
            <CardContent className="py-12 sm:py-16 px-6 text-center space-y-6">
              {isImporting ? (
                <div className="space-y-4 max-w-sm mx-auto">
                  <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto animate-pulse">
                    <RefreshCw className="w-8 h-8 animate-spin" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Importing Customer Records...
                  </h3>
                  <p className="text-xs text-gray-500">
                    Creating customer profiles, service recurrence schedules, and setting initial reminder dates.
                  </p>
                </div>
              ) : importError ? (
                <div className="space-y-4 max-w-md mx-auto">
                  <div className="w-16 h-16 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                    <AlertTriangle className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-red-950">
                    Import Could Not Complete
                  </h3>
                  <p className="text-xs text-red-800 bg-red-50 p-3 rounded-xl border border-red-200">
                    {importError}
                  </p>
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <Button variant="outline" onClick={() => setStep(3)}>
                      Back to Review
                    </Button>
                    {(importError.toLowerCase().includes('capacity') ||
                      importError.toLowerCase().includes('limit')) && (
                      <Link href="/pricing">
                        <Button variant="primary">Upgrade Capacity</Button>
                      </Link>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-5 max-w-md mx-auto">
                  <div
                    className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto ${
                      importFailedCount > 0 || importWarning
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {importFailedCount > 0 || importWarning ? (
                      <AlertTriangle className="w-8 h-8" />
                    ) : (
                      <CheckCircle2 className="w-8 h-8" />
                    )}
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-gray-900 tracking-tight">
                      {importFailedCount > 0
                        ? `Imported ${importedCount}; ${importFailedCount} failed`
                        : `Successfully imported ${importedCount} customers!`}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      All new service schedules and next due dates have been registered into your workspace.
                    </p>
                  </div>

                  {/* Sample Data Protection Banner & One-Tap Clean */}
                  {isSampleImport && (
                    <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-900 text-left space-y-3">
                      <div className="flex items-start gap-2">
                        <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold">Sample Demonstration Data Loaded</p>
                          <p className="text-indigo-800 mt-0.5">
                            These 5 Kochi AC records were imported for testing. You can explore them in your Today queue, or remove them with one tap below.
                          </p>
                        </div>
                      </div>

                      {sampleRemoved ? (
                        <div className="p-2.5 rounded-lg bg-emerald-100 border border-emerald-300 text-emerald-800 text-[11px] font-semibold flex items-center gap-1.5">
                          <Check className="w-4 h-4 text-emerald-600" />
                          <span>All sample customer records have been completely removed from your shop.</span>
                        </div>
                      ) : (
                        <div className="pt-1 flex items-center justify-between">
                          <span className="text-[11px] text-indigo-700">Done exploring sample data?</span>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={handleRemoveSampleData}
                            leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                          >
                            Remove Sample Data
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {importWarning && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-left text-xs text-amber-900 space-y-2">
                      <p>{importWarning}</p>
                      {(importWarning.toLowerCase().includes('capacity') ||
                        importWarning.toLowerCase().includes('limit')) && (
                        <Link href="/pricing">
                          <Button variant="primary" size="sm" className="w-full">
                            Upgrade Plan Capacity
                          </Button>
                        </Link>
                      )}
                    </div>
                  )}

                  {/* Primary & Secondary Action Buttons */}
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                    <Link href="/dashboard" className="w-full sm:w-auto">
                      <Button
                        variant="primary"
                        className="w-full"
                        rightIcon={<ArrowRight className="w-4 h-4" />}
                      >
                        View Today&apos;s Queue
                      </Button>
                    </Link>
                    <Link href="/customers" className="w-full sm:w-auto">
                      <Button variant="outline" className="w-full">
                        Customer Directory
                      </Button>
                    </Link>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={resetWizard}
                      className="text-xs text-gray-400 hover:text-gray-700 font-medium"
                    >
                      Import another spreadsheet
                    </button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
