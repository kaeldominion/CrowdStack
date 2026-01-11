"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  Button,
  Badge,
  LoadingSpinner,
  Input,
} from "@crowdstack/ui";
import {
  Upload,
  FileSpreadsheet,
  Check,
  X,
  AlertTriangle,
  Lock,
  Calculator,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Download,
  HelpCircle,
} from "lucide-react";

interface CloseoutPanelProps {
  eventId: string;
  onRefresh?: () => void;
}

interface CloseoutSummary {
  status: {
    is_locked: boolean;
    locked_at: string | null;
    locked_by: string | null;
  };
  summary: {
    total_bookings: number;
    bookings_with_actual_spend: number;
    bookings_with_minimum_spend_only: number;
    bookings_without_spend: number;
    total_spend: number;
    total_actual_spend: number;
    total_minimum_spend: number;
    total_promoter_commission: number;
    total_venue_commission: number;
    venue_commission_rate: number;
  };
  currency: string;
  bookings: Array<{
    id: string;
    guest_name: string;
    table_name: string | null;
    actual_spend: number | null;
    minimum_spend: number | null;
    effective_spend: number;
    spend_source: string;
    promoter_commission: number;
    venue_commission: number;
    has_commission: boolean;
    locked: boolean;
  }>;
  promoter_breakdown: Array<{
    promoter_id: string;
    promoter_name: string;
    booking_count: number;
    total_spend: number;
    total_commission: number;
  }>;
  imports: Array<{
    id: string;
    filename: string;
    import_type: string;
    row_count: number;
    matched_count: number;
    status: string;
    created_at: string;
  }>;
}

interface PreviewMatch {
  row_index: number;
  csv_table_name: string;
  csv_spend: number;
  matched: boolean;
  booking_id?: string;
  booking_guest_name?: string;
  booking_table_name?: string;
  current_spend?: number | null;
}

interface CSVPreview {
  preview: {
    total_csv_rows: number;
    matched_count: number;
    unmatched_csv_rows: number;
    unmatched_bookings: number;
  };
  column_mapping: {
    table_name_column: string;
    spend_column: string;
  };
  matches: PreviewMatch[];
  unmatched_csv_rows: Array<{
    row_index: number;
    csv_table_name: string;
    csv_spend: number;
  }>;
  unmatched_bookings: Array<{
    booking_id: string;
    guest_name: string;
    table_name: string;
    current_spend: number | null;
    minimum_spend: number | null;
  }>;
}

export function CloseoutPanel({ eventId, onRefresh }: CloseoutPanelProps) {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<CloseoutSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  // CSV upload state
  const [csvPreview, setCsvPreview] = useState<CSVPreview | null>(null);
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [locking, setLocking] = useState(false);

  // UI state
  const [showDetails, setShowDetails] = useState(false);
  const [editingSpend, setEditingSpend] = useState<string | null>(null);
  const [editSpendValue, setEditSpendValue] = useState("");
  const [showInstructions, setShowInstructions] = useState(false);

  const loadSummary = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/venue/events/${eventId}/closeout/summary`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load closeout summary");
      }

      setSummary(data);
    } catch (err: any) {
      console.error("Error loading closeout summary:", err);
      setError(err.message || "Failed to load closeout summary");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const parseCSV = (text: string): Array<Record<string, string>> => {
    const lines = text.split(/\r?\n/).filter((line) => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/"/g, ""));
    const rows: Array<Record<string, string>> = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim().replace(/"/g, ""));
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] || "";
      });
      rows.push(row);
    }

    return rows;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setError(null);
      setCsvPreview(null);

      const text = await file.text();
      const csvData = parseCSV(text);

      if (csvData.length === 0) {
        throw new Error("CSV file is empty or invalid");
      }

      const response = await fetch(`/api/venue/events/${eventId}/closeout/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv_data: csvData }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to preview CSV");
      }

      setCsvPreview(data);
    } catch (err: any) {
      console.error("Error uploading CSV:", err);
      setError(err.message || "Failed to upload CSV");
    } finally {
      setUploading(false);
      // Reset file input
      e.target.value = "";
    }
  };

  const handleImport = async () => {
    if (!csvPreview) return;

    const matchesToImport = csvPreview.matches
      .filter((m) => m.matched && m.booking_id)
      .map((m) => ({
        booking_id: m.booking_id!,
        spend_amount: m.csv_spend,
      }));

    if (matchesToImport.length === 0) {
      setError("No matched rows to import");
      return;
    }

    try {
      setImporting(true);
      setError(null);

      const response = await fetch(`/api/venue/events/${eventId}/closeout/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matches: matchesToImport }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to import data");
      }

      // Clear preview and reload summary
      setCsvPreview(null);
      await loadSummary();
      onRefresh?.();
    } catch (err: any) {
      console.error("Error importing:", err);
      setError(err.message || "Failed to import data");
    } finally {
      setImporting(false);
    }
  };

  const handleCalculate = async () => {
    try {
      setCalculating(true);
      setError(null);

      const response = await fetch(`/api/venue/events/${eventId}/closeout/calculate`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to calculate commissions");
      }

      await loadSummary();
    } catch (err: any) {
      console.error("Error calculating:", err);
      setError(err.message || "Failed to calculate commissions");
    } finally {
      setCalculating(false);
    }
  };

  const handleLock = async () => {
    if (!confirm("Are you sure you want to lock the closeout? This cannot be undone.")) {
      return;
    }

    try {
      setLocking(true);
      setError(null);

      const response = await fetch(`/api/venue/events/${eventId}/closeout/lock`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to lock closeout");
      }

      await loadSummary();
      onRefresh?.();
    } catch (err: any) {
      console.error("Error locking:", err);
      setError(err.message || "Failed to lock closeout");
    } finally {
      setLocking(false);
    }
  };

  const handleManualSpendUpdate = async (bookingId: string) => {
    const spend = parseFloat(editSpendValue);
    if (isNaN(spend) || spend < 0) {
      setError("Invalid spend amount");
      return;
    }

    try {
      const response = await fetch(`/api/venue/events/${eventId}/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actual_spend: spend }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update spend");
      }

      setEditingSpend(null);
      setEditSpendValue("");
      await loadSummary();
      onRefresh?.();
    } catch (err: any) {
      console.error("Error updating spend:", err);
      setError(err.message || "Failed to update spend");
    }
  };

  const formatCurrency = (amount: number) => {
    const symbol = summary?.currency === "IDR" ? "Rp" : "$";
    return `${symbol}${amount.toLocaleString()}`;
  };

  const downloadTemplate = () => {
    // Generate sample CSV with table names from current bookings
    const sampleRows = summary?.bookings?.slice(0, 3).map((b) => ({
      table_name: b.table_name || "Table Name",
      spend_amount: b.minimum_spend || 1000,
    })) || [
      { table_name: "VIP Table 1", spend_amount: 5000 },
      { table_name: "Table A", spend_amount: 2500 },
      { table_name: "Booth 3", spend_amount: 3500 },
    ];

    const csvContent = [
      "table_name,spend_amount",
      ...sampleRows.map((row) => `"${row.table_name}",${row.spend_amount}`),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "closeout_template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner size="lg" />
        </div>
      </Card>
    );
  }

  if (!summary) {
    return (
      <Card className="p-6">
        <div className="text-center text-secondary">
          {error || "Failed to load closeout data"}
        </div>
      </Card>
    );
  }

  const isLocked = summary.status.is_locked;

  return (
    <div className="space-y-6">
      {/* Status Header */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              isLocked ? "bg-accent-success/20" : "bg-accent-warning/20"
            }`}>
              {isLocked ? (
                <Lock className="h-6 w-6 text-accent-success" />
              ) : (
                <Calculator className="h-6 w-6 text-accent-warning" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-primary">Table Closeout</h3>
              <p className="text-sm text-secondary">
                {isLocked
                  ? `Locked on ${new Date(summary.status.locked_at!).toLocaleString()}`
                  : "Import spend data and calculate commissions"
                }
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={loadSummary}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-surface-secondary rounded-lg p-4">
            <p className="text-sm text-muted">Total Bookings</p>
            <p className="text-2xl font-bold text-primary">{summary.summary.total_bookings}</p>
          </div>
          <div className="bg-surface-secondary rounded-lg p-4">
            <p className="text-sm text-muted">Total Spend</p>
            <p className="text-2xl font-bold text-primary">
              {formatCurrency(summary.summary.total_spend)}
            </p>
          </div>
          <div className="bg-surface-secondary rounded-lg p-4">
            <p className="text-sm text-muted">Promoter Commission</p>
            <p className="text-2xl font-bold text-accent-primary">
              {formatCurrency(summary.summary.total_promoter_commission)}
            </p>
          </div>
          <div className="bg-surface-secondary rounded-lg p-4">
            <p className="text-sm text-muted">Venue Commission ({summary.summary.venue_commission_rate}%)</p>
            <p className="text-2xl font-bold text-accent-success">
              {formatCurrency(summary.summary.total_venue_commission)}
            </p>
          </div>
        </div>

        {/* Spend Coverage */}
        <div className="mt-4 flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-accent-success" />
            <span className="text-secondary">
              {summary.summary.bookings_with_actual_spend} with actual spend
            </span>
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-accent-warning" />
            <span className="text-secondary">
              {summary.summary.bookings_with_minimum_spend_only} using minimum
            </span>
          </div>
          {summary.summary.bookings_without_spend > 0 && (
            <div className="flex items-center gap-2">
              <X className="h-4 w-4 text-accent-error" />
              <span className="text-secondary">
                {summary.summary.bookings_without_spend} without spend
              </span>
            </div>
          )}
        </div>
      </Card>

      {/* Error Display */}
      {error && (
        <div className="p-4 rounded-lg bg-accent-error/10 border border-accent-error/30 text-accent-error">
          {error}
        </div>
      )}

      {/* CSV Upload (only if not locked) */}
      {!isLocked && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-primary flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Import Spend Data from CSV
            </h4>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowInstructions(!showInstructions)}
                className="p-2 rounded-lg hover:bg-surface-secondary text-muted hover:text-secondary transition-colors"
                title="View instructions"
              >
                <HelpCircle className="h-5 w-5" />
              </button>
              <Button
                variant="secondary"
                size="sm"
                onClick={downloadTemplate}
              >
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
            </div>
          </div>

          {/* Instructions Panel */}
          {showInstructions && (
            <div className="mb-4 p-4 bg-surface-secondary rounded-lg border border-border-subtle">
              <h5 className="font-medium text-primary mb-2">CSV Format Instructions</h5>
              <div className="text-sm text-secondary space-y-2">
                <p>Export your POS data as a CSV file with the following columns:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li><strong>table_name</strong> or <strong>table</strong> - The table name (must match exactly)</li>
                  <li><strong>spend_amount</strong>, <strong>spend</strong>, <strong>amount</strong>, or <strong>total</strong> - The spend amount</li>
                </ul>
                <p className="mt-3">Example CSV content:</p>
                <pre className="bg-surface-primary p-2 rounded text-xs mt-1 overflow-x-auto">
{`table_name,spend_amount
"VIP Table 1",5000
"Table A",2500
"Booth 3",3500`}
                </pre>
                <p className="mt-3 text-muted">
                  <strong>Note:</strong> Table names are matched case-insensitively. The system will try to match
                  your CSV table names to existing bookings.
                </p>
              </div>
            </div>
          )}

          {!csvPreview ? (
            <div className="border-2 border-dashed border-border-subtle rounded-lg p-8 text-center">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
                id="csv-upload"
              />
              <label
                htmlFor="csv-upload"
                className="cursor-pointer flex flex-col items-center gap-3"
              >
                {uploading ? (
                  <LoadingSpinner size="lg" />
                ) : (
                  <Upload className="h-10 w-10 text-muted" />
                )}
                <p className="text-secondary">
                  {uploading ? "Processing..." : "Click to upload CSV file"}
                </p>
                <p className="text-xs text-muted">
                  Accepts: table_name, spend_amount columns (or similar names)
                </p>
              </label>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Preview Summary */}
              <div className="flex items-center justify-between p-4 bg-surface-secondary rounded-lg">
                <div className="flex items-center gap-4">
                  <Badge variant="success">
                    {csvPreview.preview.matched_count} Matched
                  </Badge>
                  {csvPreview.preview.unmatched_csv_rows > 0 && (
                    <Badge variant="warning">
                      {csvPreview.preview.unmatched_csv_rows} Unmatched
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setCsvPreview(null)}
                    disabled={importing}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleImport}
                    disabled={importing || csvPreview.preview.matched_count === 0}
                  >
                    {importing ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Import {csvPreview.preview.matched_count} Matches
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Matched Rows Preview */}
              <div className="max-h-64 overflow-y-auto space-y-2">
                {csvPreview.matches.filter((m) => m.matched).map((match) => (
                  <div
                    key={match.row_index}
                    className="flex items-center justify-between p-3 bg-accent-success/5 border border-accent-success/20 rounded-lg text-sm"
                  >
                    <div>
                      <span className="text-primary font-medium">{match.csv_table_name}</span>
                      <span className="text-muted mx-2">→</span>
                      <span className="text-secondary">{match.booking_guest_name}</span>
                    </div>
                    <Badge variant="success">{formatCurrency(match.csv_spend)}</Badge>
                  </div>
                ))}
              </div>

              {/* Unmatched Rows */}
              {csvPreview.unmatched_csv_rows.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-accent-warning mb-2">
                    Unmatched CSV Rows
                  </p>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {csvPreview.unmatched_csv_rows.map((row) => (
                      <div
                        key={row.row_index}
                        className="flex items-center justify-between p-2 bg-accent-warning/5 border border-accent-warning/20 rounded text-sm"
                      >
                        <span className="text-secondary">{row.csv_table_name}</span>
                        <span className="text-muted">{formatCurrency(row.csv_spend)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Actions (only if not locked) */}
      {!isLocked && (
        <div className="flex items-center gap-4">
          <Button
            onClick={handleCalculate}
            disabled={calculating}
            className="flex-1"
          >
            {calculating ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Calculating...
              </>
            ) : (
              <>
                <Calculator className="h-4 w-4 mr-2" />
                Calculate Commissions
              </>
            )}
          </Button>
          <Button
            variant="secondary"
            onClick={handleLock}
            disabled={locking || summary.summary.total_bookings === 0}
          >
            {locking ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Locking...
              </>
            ) : (
              <>
                <Lock className="h-4 w-4 mr-2" />
                Lock Closeout
              </>
            )}
          </Button>
        </div>
      )}

      {/* Booking Details Toggle */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="flex items-center gap-2 text-sm text-secondary hover:text-primary transition-colors"
      >
        {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        {showDetails ? "Hide" : "Show"} Booking Details
      </button>

      {/* Booking Details Table */}
      {showDetails && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-secondary">
                  <th className="text-left p-3 font-medium text-secondary">Table</th>
                  <th className="text-left p-3 font-medium text-secondary">Guest</th>
                  <th className="text-right p-3 font-medium text-secondary">Actual Spend</th>
                  <th className="text-right p-3 font-medium text-secondary">Min Spend</th>
                  <th className="text-right p-3 font-medium text-secondary">Promoter</th>
                  <th className="text-right p-3 font-medium text-secondary">Venue</th>
                  {!isLocked && <th className="p-3"></th>}
                </tr>
              </thead>
              <tbody>
                {summary.bookings.map((booking) => (
                  <tr key={booking.id} className="border-t border-border-subtle">
                    <td className="p-3 text-primary">{booking.table_name || "-"}</td>
                    <td className="p-3 text-secondary">{booking.guest_name}</td>
                    <td className="p-3 text-right">
                      {editingSpend === booking.id ? (
                        <div className="flex items-center gap-2 justify-end">
                          <Input
                            type="number"
                            value={editSpendValue}
                            onChange={(e) => setEditSpendValue(e.target.value)}
                            className="w-24 text-right"
                            autoFocus
                          />
                          <Button
                            size="sm"
                            onClick={() => handleManualSpendUpdate(booking.id)}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setEditingSpend(null);
                              setEditSpendValue("");
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <span className={booking.actual_spend !== null ? "text-primary" : "text-muted"}>
                          {booking.actual_spend !== null
                            ? formatCurrency(booking.actual_spend)
                            : "-"
                          }
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right text-muted">
                      {booking.minimum_spend !== null
                        ? formatCurrency(booking.minimum_spend)
                        : "-"
                      }
                    </td>
                    <td className="p-3 text-right text-accent-primary">
                      {booking.promoter_commission > 0
                        ? formatCurrency(booking.promoter_commission)
                        : "-"
                      }
                    </td>
                    <td className="p-3 text-right text-accent-success">
                      {booking.venue_commission > 0
                        ? formatCurrency(booking.venue_commission)
                        : "-"
                      }
                    </td>
                    {!isLocked && (
                      <td className="p-3">
                        {!booking.locked && editingSpend !== booking.id && (
                          <button
                            onClick={() => {
                              setEditingSpend(booking.id);
                              setEditSpendValue(booking.actual_spend?.toString() || "");
                            }}
                            className="text-xs text-accent-primary hover:underline"
                          >
                            Edit
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Promoter Breakdown */}
      {summary.promoter_breakdown.length > 0 && (
        <Card className="p-6">
          <h4 className="font-semibold text-primary mb-4">Promoter Commission Breakdown</h4>
          <div className="space-y-3">
            {summary.promoter_breakdown.map((promoter) => (
              <div
                key={promoter.promoter_id}
                className="flex items-center justify-between p-3 bg-surface-secondary rounded-lg"
              >
                <div>
                  <p className="font-medium text-primary">{promoter.promoter_name}</p>
                  <p className="text-sm text-muted">
                    {promoter.booking_count} booking{promoter.booking_count !== 1 ? "s" : ""} •{" "}
                    {formatCurrency(promoter.total_spend)} total spend
                  </p>
                </div>
                <Badge variant="secondary" className="text-lg">
                  {formatCurrency(promoter.total_commission)}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
