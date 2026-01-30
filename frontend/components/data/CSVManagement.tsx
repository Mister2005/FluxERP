'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import {Card} from '@/components/ui/Card';

interface CSVExportButtonProps {
  endpoint: string;
  filename: string;
  label: string;
  icon?: React.ReactNode;
}

export function CSVExportButton({ endpoint, filename, label, icon }: CSVExportButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}${endpoint}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="inline-flex flex-col items-start">
      <Button onClick={handleExport} disabled={loading} variant="secondary">
        {loading ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Exporting...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            {icon || (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            )}
            {label}
          </span>
        )}
      </Button>
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
}

interface ImportResult {
  success: boolean;
  totalRows: number;
  successfulRows: number;
  failedRows: number;
  errors: Array<{
    row: number;
    field?: string;
    message: string;
  }>;
  createdIds: string[];
  updatedIds: string[];
  message: string;
}

interface CSVImportProps {
  endpoint: string;
  templateEndpoint: string;
  title: string;
  description: string;
  onSuccess?: () => void;
}

export function CSVImport({ endpoint, templateEndpoint, title, description, onSuccess }: CSVImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [updateExisting, setUpdateExisting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith('.csv')) {
        setFile(droppedFile);
        setResult(null);
      }
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}${templateEndpoint}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to download template');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = templateEndpoint.split('/').pop() + '.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      console.error('Template download failed:', err);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setLoading(true);
    setResult(null);

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('updateExisting', String(updateExisting));

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}${endpoint}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();
      setResult(data);

      if (data.success && onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setResult({
        success: false,
        totalRows: 0,
        successfulRows: 0,
        failedRows: 0,
        errors: [{ row: 0, message: err instanceof Error ? err.message : 'Import failed' }],
        createdIds: [],
        updatedIds: [],
        message: 'Import failed',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">{title}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{description}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={handleDownloadTemplate}>
            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download Template
          </Button>
        </div>

        {/* Drag and Drop Zone */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
            id={`csv-upload-${endpoint.replace(/\//g, '-')}`}
          />
          <label
            htmlFor={`csv-upload-${endpoint.replace(/\//g, '-')}`}
            className="cursor-pointer"
          >
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              <span className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500">
                Click to upload
              </span>{' '}
              or drag and drop
            </p>
            <p className="mt-1 text-xs text-gray-500">CSV files only</p>
          </label>
        </div>

        {file && (
          <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
            <div className="flex items-center gap-3">
              <svg className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{file.name}</p>
                <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            </div>
            <button
              onClick={() => {
                setFile(null);
                setResult(null);
              }}
              className="text-gray-400 hover:text-gray-500"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Options */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="updateExisting"
            checked={updateExisting}
            onChange={(e) => setUpdateExisting(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="updateExisting" className="text-sm text-gray-700 dark:text-gray-300">
            Update existing records (matching SKU)
          </label>
        </div>

        {/* Import Button */}
        <Button onClick={handleImport} disabled={!file || loading} className="w-full">
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Importing...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Import CSV
            </span>
          )}
        </Button>

        {/* Results */}
        {result && (
          <div
            className={`rounded-lg p-4 ${
              result.success
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
            }`}
          >
            <div className="flex items-start gap-3">
              {result.success ? (
                <svg className="h-5 w-5 text-green-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="h-5 w-5 text-yellow-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
              <div className="flex-1">
                <h4 className={`text-sm font-medium ${result.success ? 'text-green-800 dark:text-green-200' : 'text-yellow-800 dark:text-yellow-200'}`}>
                  {result.message}
                </h4>
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  <p>Total rows: {result.totalRows}</p>
                  <p className="text-green-600 dark:text-green-400">Successful: {result.successfulRows}</p>
                  {result.createdIds.length > 0 && (
                    <p className="text-blue-600 dark:text-blue-400">Created: {result.createdIds.length}</p>
                  )}
                  {result.updatedIds.length > 0 && (
                    <p className="text-purple-600 dark:text-purple-400">Updated: {result.updatedIds.length}</p>
                  )}
                  {result.failedRows > 0 && (
                    <p className="text-red-600 dark:text-red-400">Failed: {result.failedRows}</p>
                  )}
                </div>

                {result.errors.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Errors:</p>
                    <div className="max-h-40 overflow-y-auto">
                      <ul className="text-xs space-y-1">
                        {result.errors.slice(0, 10).map((error, i) => (
                          <li key={i} className="text-red-600 dark:text-red-400">
                            Row {error.row}: {error.field ? `[${error.field}] ` : ''}{error.message}
                          </li>
                        ))}
                        {result.errors.length > 10 && (
                          <li className="text-gray-500">...and {result.errors.length - 10} more errors</li>
                        )}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

interface DataManagementPanelProps {
  type: 'products' | 'boms' | 'ecos' | 'work-orders';
  onImportSuccess?: () => void;
}

export default function DataManagementPanel({ type, onImportSuccess }: DataManagementPanelProps) {
  const config = {
    products: {
      exportEndpoint: '/api/csv/export/products',
      importEndpoint: '/api/csv/import/products',
      templateEndpoint: '/api/csv/template/products',
      exportFilename: `products_export_${new Date().toISOString().split('T')[0]}.csv`,
      title: 'Product Data',
      description: 'Import or export product data in CSV format',
    },
    boms: {
      exportEndpoint: '/api/csv/export/boms',
      importEndpoint: '/api/csv/import/boms',
      templateEndpoint: '/api/csv/template/boms',
      exportFilename: `boms_export_${new Date().toISOString().split('T')[0]}.csv`,
      title: 'BOM Data',
      description: 'Import or export Bill of Materials data in CSV format',
    },
    ecos: {
      exportEndpoint: '/api/csv/export/ecos',
      importEndpoint: '', // ECOs require complex workflow, no direct import
      templateEndpoint: '',
      exportFilename: `ecos_export_${new Date().toISOString().split('T')[0]}.csv`,
      title: 'ECO Data',
      description: 'Export Engineering Change Order data in CSV format',
    },
    'work-orders': {
      exportEndpoint: '/api/csv/export/work-orders',
      importEndpoint: '', // Work orders require complex workflow, no direct import
      templateEndpoint: '',
      exportFilename: `work_orders_export_${new Date().toISOString().split('T')[0]}.csv`,
      title: 'Work Order Data',
      description: 'Export work order data in CSV format',
    },
  };

  const cfg = config[type];

  return (
    <div className="space-y-6">
      {/* Export Section */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Export {cfg.title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Download all {type.replace('-', ' ')} as a CSV file
            </p>
          </div>
          <CSVExportButton
            endpoint={cfg.exportEndpoint}
            filename={cfg.exportFilename}
            label={`Export ${cfg.title}`}
          />
        </div>
      </Card>

      {/* Import Section (only for products and BOMs) */}
      {cfg.importEndpoint && (
        <CSVImport
          endpoint={cfg.importEndpoint}
          templateEndpoint={cfg.templateEndpoint}
          title={`Import ${cfg.title}`}
          description={cfg.description}
          onSuccess={onImportSuccess}
        />
      )}
    </div>
  );
}
