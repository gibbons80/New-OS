import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Upload, FileText, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function ThirdPartyPhotographerCSVImport({ isOpen, onClose }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1); // 1: Upload, 2: Map Columns, 3: Map Services, 4: Preview & Import
  const [csvFile, setCsvFile] = useState(null);
  const [csvData, setCsvData] = useState(null);
  const [columnMappings, setColumnMappings] = useState({});
  const [serviceMappings, setServiceMappings] = useState({});
  const [importing, setImporting] = useState(false);

  const { data: serviceGroups = [] } = useQuery({
    queryKey: ['cs-service-groups'],
    queryFn: () => base44.entities.CSServiceGroup.list(),
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      toast.loading('Uploading CSV...');
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setCsvFile(file_url);
      
      // Parse CSV to get headers and preview
      const response = await fetch(file_url);
      const text = await response.text();
      const rows = text.split('\n').filter(row => row.trim());
      const headers = rows[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const previewRows = rows.slice(1, 6).map(row => 
        row.split(',').map(cell => cell.trim().replace(/"/g, ''))
      );

      setCsvData({ headers, rows: previewRows, totalRows: rows.length - 1 });
      setStep(2);
      toast.dismiss();
      toast.success('CSV uploaded successfully');
    } catch (error) {
      toast.dismiss();
      toast.error('Failed to upload CSV: ' + error.message);
    }
  };

  const fieldOptions = [
    { value: 'skip', label: 'Skip this column' },
    { value: 'company_name', label: 'Company Name' },
    { value: 'contact_person', label: 'Contact Person' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Phone' },
    { value: 'website', label: 'Website' },
    { value: 'full_address', label: 'Full Address' },
    { value: 'city', label: 'City' },
    { value: 'notes', label: 'Notes' },
    { value: 'pricing_details', label: 'Pricing Details' },
    { value: 'services_offered', label: 'Services (comma-separated)' },
  ];

  const handleColumnMapping = (csvColumn, field) => {
    setColumnMappings(prev => {
      const updated = { ...prev };
      if (field === 'skip' || field === null) {
        delete updated[csvColumn];
      } else {
        updated[csvColumn] = field;
      }
      return updated;
    });
  };

  const handleNextToServiceMapping = () => {
    // Check if services column is mapped
    const servicesColumn = Object.keys(columnMappings).find(
      key => columnMappings[key] === 'services_offered'
    );

    if (servicesColumn) {
      // Extract unique service names from CSV
      const serviceColumnIndex = csvData.headers.indexOf(servicesColumn);
      const uniqueServices = new Set();
      
      csvData.rows.forEach(row => {
        const servicesCell = row[serviceColumnIndex] || '';
        const services = servicesCell.split(',').map(s => s.trim()).filter(Boolean);
        services.forEach(s => uniqueServices.add(s));
      });

      // Initialize service mappings
      const initialMappings = {};
      uniqueServices.forEach(service => {
        initialMappings[service] = [];
      });
      setServiceMappings(initialMappings);
      setStep(3);
    } else {
      setStep(4);
    }
  };

  const handleServiceMapping = (csvService, serviceGroupName, checked) => {
    setServiceMappings(prev => {
      const current = prev[csvService] || [];
      if (checked) {
        return { ...prev, [csvService]: [...current, serviceGroupName] };
      } else {
        return { ...prev, [csvService]: current.filter(s => s !== serviceGroupName) };
      }
    });
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const result = await base44.functions.invoke('importThirdPartyPhotographers', {
        csv_file_url: csvFile,
        column_mappings: columnMappings,
        service_mappings: serviceMappings,
      });

      toast.success(`Successfully imported ${result.data.imported_count} photographers`);
      queryClient.invalidateQueries(['third-party-photographers']);
      handleReset();
      onClose();
    } catch (error) {
      toast.error('Import failed: ' + (error.response?.data?.error || error.message));
    } finally {
      setImporting(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setCsvFile(null);
    setCsvData(null);
    setColumnMappings({});
    setServiceMappings({});
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl">Import Third-Party Photographers from CSV</DialogTitle>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-6 px-4">
          {[
            { num: 1, label: 'Upload CSV' },
            { num: 2, label: 'Map Columns' },
            { num: 3, label: 'Map Services' },
            { num: 4, label: 'Import' },
          ].map((s, idx) => (
            <React.Fragment key={s.num}>
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm",
                  step >= s.num 
                    ? "bg-cyan-600 text-white" 
                    : "bg-slate-200 text-slate-500"
                )}>
                  {step > s.num ? <CheckCircle2 className="w-5 h-5" /> : s.num}
                </div>
                <span className={cn(
                  "text-sm font-medium hidden sm:block",
                  step >= s.num ? "text-slate-900" : "text-slate-500"
                )}>
                  {s.label}
                </span>
              </div>
              {idx < 3 && (
                <div className={cn(
                  "flex-1 h-0.5 mx-2",
                  step > s.num ? "bg-cyan-600" : "bg-slate-200"
                )} />
              )}
            </React.Fragment>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-1">
          {/* Step 1: Upload CSV */}
          {step === 1 && (
            <div className="space-y-6">
              <Card className="border-2 border-dashed border-slate-300 bg-slate-50">
                <CardContent className="p-12">
                  <div className="text-center">
                    <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">
                      Upload CSV File
                    </h3>
                    <p className="text-sm text-slate-600 mb-6">
                      Select a CSV file containing third-party photographer data
                    </p>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="csv-upload"
                    />
                    <label htmlFor="csv-upload">
                      <Button className="bg-cyan-600 hover:bg-cyan-700" type="button" asChild>
                        <span className="cursor-pointer">
                          <Upload className="w-4 h-4 mr-2" />
                          Choose CSV File
                        </span>
                      </Button>
                    </label>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <div className="space-y-2 text-sm text-blue-900">
                      <p className="font-semibold">CSV Format Guidelines:</p>
                      <ul className="list-disc list-inside space-y-1 ml-2">
                        <li>First row should contain column headers</li>
                        <li>Services can be comma-separated in a single column</li>
                        <li>Example: "Company Name,Contact,Email,Phone,Services"</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 2: Map Columns */}
          {step === 2 && csvData && (
            <div className="space-y-6">
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-slate-900 mb-4">
                    Map CSV Columns to Fields
                  </h3>
                  <p className="text-sm text-slate-600 mb-6">
                    Found {csvData.totalRows} rows. Match each CSV column to the corresponding field.
                  </p>

                  <div className="space-y-4">
                    {csvData.headers.map((header, idx) => (
                      <div key={`${header}-${idx}`} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start p-4 bg-slate-50 rounded-lg">
                        <div>
                          <Label className="text-sm font-semibold text-slate-900 mb-2 block">
                            CSV Column: {header}
                          </Label>
                          <div className="text-xs text-slate-600 space-y-1">
                            <p className="font-medium">Sample values:</p>
                            {csvData.rows.slice(0, 3).map((row, rowIdx) => (
                              <p key={rowIdx} className="truncate">{row[idx] || '(empty)'}</p>
                            ))}
                          </div>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-slate-700 mb-2 block">
                            Maps to Field:
                          </Label>
                          <Select
                            key={`select-mapping-${header}-${idx}`}
                            value={columnMappings[header] || 'skip'}
                            onValueChange={(value) => handleColumnMapping(header, value)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select field..." />
                            </SelectTrigger>
                            <SelectContent>
                              {fieldOptions.map(opt => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-3">
                <Button variant="outline" onClick={handleReset}>
                  Back
                </Button>
                <Button
                  className="bg-cyan-600 hover:bg-cyan-700"
                  onClick={handleNextToServiceMapping}
                  disabled={!columnMappings['company_name'] && !Object.values(columnMappings).includes('company_name')}
                >
                  Next: Map Services
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Map Services */}
          {step === 3 && (
            <div className="space-y-6">
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-slate-900 mb-4">
                    Map CSV Services to Service Groups
                  </h3>
                  <p className="text-sm text-slate-600 mb-6">
                    Match service names from your CSV to existing service groups in the app.
                  </p>

                  <div className="space-y-6">
                    {Object.keys(serviceMappings).map((csvService) => (
                      <div key={csvService} className="p-4 bg-slate-50 rounded-lg">
                        <Label className="text-sm font-semibold text-slate-900 mb-3 block">
                          CSV Service: "{csvService}"
                        </Label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {serviceGroups.map(group => (
                            <label
                              key={group.id}
                              className={cn(
                                "flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors",
                                serviceMappings[csvService]?.includes(group.group_name)
                                  ? "bg-cyan-50 border-cyan-300"
                                  : "bg-white border-slate-200 hover:border-slate-300"
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={serviceMappings[csvService]?.includes(group.group_name)}
                                onChange={(e) => handleServiceMapping(csvService, group.group_name, e.target.checked)}
                                className="w-4 h-4 text-cyan-600 rounded border-slate-300"
                              />
                              <span className="text-sm">{group.group_name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button
                  className="bg-cyan-600 hover:bg-cyan-700"
                  onClick={() => setStep(4)}
                >
                  Next: Review & Import
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Preview & Import */}
          {step === 4 && (
            <div className="space-y-6">
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-slate-900 mb-4">
                    Review Import Settings
                  </h3>

                  <div className="space-y-4">
                    <div className="p-4 bg-slate-50 rounded-lg">
                      <p className="text-sm font-semibold text-slate-900 mb-2">
                        Total Records: {csvData?.totalRows}
                      </p>
                      <p className="text-sm text-slate-600">
                        Column Mappings: {Object.values(columnMappings).filter(Boolean).length} fields mapped
                      </p>
                      {Object.keys(serviceMappings).length > 0 && (
                        <p className="text-sm text-slate-600 mt-1">
                          Service Mappings: {Object.keys(serviceMappings).length} CSV services mapped
                        </p>
                      )}
                    </div>

                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                        <div className="text-sm text-amber-900">
                          <p className="font-semibold mb-1">Ready to import</p>
                          <p>This will create new third-party photographer records. Make sure your mappings are correct.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(Object.keys(serviceMappings).length > 0 ? 3 : 2)}>
                  Back
                </Button>
                <Button
                  className="bg-cyan-600 hover:bg-cyan-700"
                  onClick={handleImport}
                  disabled={importing}
                >
                  {importing ? 'Importing...' : 'Import Photographers'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}