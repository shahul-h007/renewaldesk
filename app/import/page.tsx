'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRenewalDesk } from '@/lib/store';
import { AppShell } from '@/components/AppShell';
import { parseCSVText, guessMapping, validateAndMapRows, CSVMapping, ParsedCSVRow } from '@/lib/csv-import';
import { UploadCloud, CheckCircle2, AlertTriangle, ArrowRight, Download, FileSpreadsheet, RefreshCw } from 'lucide-react';

const SAMPLE_CSV = `Customer Name,Mobile,Appliance Model,Last Service,Next Due Date,Fee,Locality
Suresh Menon,9846055441,Daikin 1.5T Inverter,2026-04-05,2026-10-05,1200,Palarivattom
Vipin Das,9745123490,LG Dual Inverter,2026-03-20,2026-09-20,1500,Vyttila
Latha Nair,9847098112,Samsung WindFree 2T,2026-04-12,2026-10-12,1800,Kakkanad
Robin Mathew,9946011998,Voltas 1 Ton Window,2026-04-01,2026-10-01,900,Aluva
Deepa Thomas,9846111222,Panasonic Smart AC,2026-04-08,2026-10-08,1200,Edappally`;

export default function ImportPage() {
  const router = useRouter();
  const { importCustomersFromCSV } = useRenewalDesk();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [csvText, setCsvText] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<CSVMapping>({
    nameCol: '',
    phoneCol: '',
    assetCol: '',
    lastDateCol: '',
    nextDateCol: '',
    amountCol: '',
    addressCol: '',
  });

  const [validRows, setValidRows] = useState<ParsedCSVRow[]>([]);
  const [invalidRows, setInvalidRows] = useState<ParsedCSVRow[]>([]);
  const [importedCount, setImportedCount] = useState<number | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      processCSVContent(content);
    };
    reader.readAsText(file);
  };

  const processCSVContent = (content: string) => {
    setCsvText(content);
    const { headers: parsedHeaders, rows: parsedRows } = parseCSVText(content);
    if (parsedHeaders.length === 0) {
      alert('Could not read any headers from CSV. Please check the file format.');
      return;
    }
    setHeaders(parsedHeaders);
    setRawRows(parsedRows);

    const guessed = guessMapping(parsedHeaders);
    setMapping(guessed);
    setStep(2);
  };

  const handleUseSample = () => {
    processCSVContent(SAMPLE_CSV);
  };

  const handleProceedToValidation = () => {
    if (!mapping.nameCol || !mapping.phoneCol) {
      alert('Please select columns for at least Customer Name and Mobile Number.');
      return;
    }

    const { validRows: v, invalidRows: inv } = validateAndMapRows(rawRows, mapping);
    setValidRows(v);
    setInvalidRows(inv);
    setStep(3);
  };

  const handleConfirmImport = () => {
    const count = importCustomersFromCSV(validRows);
    setImportedCount(count);
    setTimeout(() => {
      router.push('/dashboard');
    }, 1800);
  };

  return (
    <AppShell
      title="Import Customer Records"
      subtitle="Bring your existing Excel or CSV customer sheet into RenewalDesk."
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Step Indicator */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
              step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'
            }`}>
              1
            </div>
            <span className={`text-xs font-semibold ${step >= 1 ? 'text-gray-900' : 'text-gray-400'}`}>
              Upload CSV
            </span>
          </div>
          <ArrowRight className="w-4 h-4 text-gray-300" />
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
              step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'
            }`}>
              2
            </div>
            <span className={`text-xs font-semibold ${step >= 2 ? 'text-gray-900' : 'text-gray-400'}`}>
              Map Columns
            </span>
          </div>
          <ArrowRight className="w-4 h-4 text-gray-300" />
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
              step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'
            }`}>
              3
            </div>
            <span className={`text-xs font-semibold ${step >= 3 ? 'text-gray-900' : 'text-gray-400'}`}>
              Validate & Import
            </span>
          </div>
        </div>

        {/* STEP 1: Upload File */}
        {step === 1 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center space-y-6 shadow-xs">
            <div className="max-w-md mx-auto space-y-2">
              <h2 className="text-lg font-bold text-gray-900">Upload your customer spreadsheet</h2>
              <p className="text-xs text-gray-500">
                Supports .csv files exported from Excel, Google Sheets, or billing software.
              </p>
            </div>

            {/* Dropzone */}
            <label className="block max-w-xl mx-auto border-2 border-dashed border-gray-300 hover:border-blue-500 rounded-2xl p-8 cursor-pointer transition-colors bg-gray-50/50 hover:bg-blue-50/20">
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-blue-600 hover:text-blue-700">Click to upload file</span>
                  <span className="text-xs text-gray-500"> or drag and drop</span>
                </div>
                <p className="text-[11px] text-gray-400">CSV file with name, mobile, and service dates</p>
              </div>
            </label>

            {/* Test with Sample Data shortcut */}
            <div className="pt-4 border-t border-gray-100 max-w-md mx-auto flex items-center justify-between text-xs">
              <span className="text-gray-500">Don&apos;t have a file ready right now?</span>
              <button
                onClick={handleUseSample}
                className="font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Use Sample Kochi AC Sheet
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Map Columns */}
        {step === 2 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900">Map Columns to RenewalDesk</h2>
                <p className="text-xs text-gray-500">
                  Found {rawRows.length} rows in your file. Match your sheet columns below:
                </p>
              </div>
              <button
                onClick={() => setStep(1)}
                className="text-xs text-gray-500 hover:text-gray-700 font-medium"
              >
                Change File
              </button>
            </div>

            <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden text-xs">
              {/* Name */}
              <div className="p-4 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center bg-gray-50/50">
                <div className="sm:col-span-4 font-semibold text-gray-700">Customer Full Name *</div>
                <div className="sm:col-span-4">
                  <select
                    value={mapping.nameCol}
                    onChange={(e) => setMapping({ ...mapping, nameCol: e.target.value })}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg bg-white"
                  >
                    <option value="">Select column...</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-4 text-gray-400 truncate">
                  Sample: {rawRows[0]?.[mapping.nameCol] || '—'}
                </div>
              </div>

              {/* Phone */}
              <div className="p-4 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                <div className="sm:col-span-4 font-semibold text-gray-700">Mobile / WhatsApp *</div>
                <div className="sm:col-span-4">
                  <select
                    value={mapping.phoneCol}
                    onChange={(e) => setMapping({ ...mapping, phoneCol: e.target.value })}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg bg-white"
                  >
                    <option value="">Select column...</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-4 text-gray-400 truncate">
                  Sample: {rawRows[0]?.[mapping.phoneCol] || '—'}
                </div>
              </div>

              {/* Asset */}
              <div className="p-4 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center bg-gray-50/50">
                <div className="sm:col-span-4 font-semibold text-gray-700">Appliance / Model</div>
                <div className="sm:col-span-4">
                  <select
                    value={mapping.assetCol}
                    onChange={(e) => setMapping({ ...mapping, assetCol: e.target.value })}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg bg-white"
                  >
                    <option value="">Select column...</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-4 text-gray-400 truncate">
                  Sample: {rawRows[0]?.[mapping.assetCol] || '—'}
                </div>
              </div>

              {/* Last Service Date */}
              <div className="p-4 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                <div className="sm:col-span-4 font-semibold text-gray-700">Last Service Date</div>
                <div className="sm:col-span-4">
                  <select
                    value={mapping.lastDateCol}
                    onChange={(e) => setMapping({ ...mapping, lastDateCol: e.target.value })}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg bg-white"
                  >
                    <option value="">Select column...</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-4 text-gray-400 truncate">
                  Sample: {rawRows[0]?.[mapping.lastDateCol] || '—'}
                </div>
              </div>

              {/* Next Due Date */}
              <div className="p-4 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center bg-gray-50/50">
                <div className="sm:col-span-4 font-semibold text-gray-700">Next Service Due Date</div>
                <div className="sm:col-span-4">
                  <select
                    value={mapping.nextDateCol}
                    onChange={(e) => setMapping({ ...mapping, nextDateCol: e.target.value })}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg bg-white"
                  >
                    <option value="">Select column (or auto-calculate)...</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-4 text-gray-400 truncate">
                  Sample: {rawRows[0]?.[mapping.nextDateCol] || '—'}
                </div>
              </div>

              {/* Locality */}
              <div className="p-4 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                <div className="sm:col-span-4 font-semibold text-gray-700">Locality / Address</div>
                <div className="sm:col-span-4">
                  <select
                    value={mapping.addressCol}
                    onChange={(e) => setMapping({ ...mapping, addressCol: e.target.value })}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg bg-white"
                  >
                    <option value="">Select column...</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-4 text-gray-400 truncate">
                  Sample: {rawRows[0]?.[mapping.addressCol] || '—'}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2 text-xs font-medium text-gray-600 hover:text-gray-900"
              >
                Back
              </button>
              <button
                onClick={handleProceedToValidation}
                className="px-5 py-2.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 flex items-center gap-2 shadow-sm"
              >
                Validate Records <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Validate & Import */}
        {step === 3 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 space-y-6 shadow-xs">
            {importedCount !== null ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto animate-bounce">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">
                  Successfully imported {importedCount} customers!
                </h2>
                <p className="text-xs text-gray-500">
                  Redirecting you to the follow-up queue now...
                </p>
              </div>
            ) : (
              <>
                <div>
                  <h2 className="text-base font-bold text-gray-900">Validation Summary</h2>
                  <p className="text-xs text-gray-500">
                    Review your records before adding them to your live follow-up queue.
                  </p>
                </div>

                {/* Validation Status Cards */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                    <div>
                      <span className="text-lg font-bold text-emerald-900 block">{validRows.length}</span>
                      <span className="text-xs text-emerald-700 font-medium">Ready to Import</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-3">
                    <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
                    <div>
                      <span className="text-lg font-bold text-amber-900 block">{invalidRows.length}</span>
                      <span className="text-xs text-amber-700 font-medium">Rows with Errors (Skipped)</span>
                    </div>
                  </div>
                </div>

                {/* Preview Table */}
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 font-bold text-xs text-gray-700">
                    Preview of Valid Customers ({validRows.slice(0, 5).length} of {validRows.length})
                  </div>
                  <div className="divide-y divide-gray-100 text-xs">
                    {validRows.slice(0, 5).map((row, idx) => (
                      <div key={idx} className="p-3 grid grid-cols-1 sm:grid-cols-4 gap-2 items-center">
                        <div className="font-semibold text-gray-900">{row.normalized?.name}</div>
                        <div className="text-gray-500">{row.normalized?.phone}</div>
                        <div className="text-gray-600">{row.normalized?.assetName}</div>
                        <div className="text-blue-600 font-medium">Due: {row.normalized?.nextDueDate}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <button
                    onClick={() => setStep(2)}
                    className="text-xs text-gray-600 hover:text-gray-900 font-medium"
                  >
                    Adjust Mapping
                  </button>
                  <button
                    onClick={handleConfirmImport}
                    disabled={validRows.length === 0}
                    className="px-6 py-2.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2 shadow-sm"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Import {validRows.length} Customers to RenewalDesk
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
