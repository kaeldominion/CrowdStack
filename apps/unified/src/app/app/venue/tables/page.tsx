"use client";

import { useState, useEffect } from "react";
import {
  Card,
  Button,
  Input,
  Badge,
  LoadingSpinner,
} from "@crowdstack/ui";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  Users,
  Layers,
  X,
  DollarSign,
} from "lucide-react";
import { getCurrencySymbol } from "@/lib/constants/currencies";

interface TableZone {
  id: string;
  venue_id: string;
  name: string;
  description: string | null;
  display_order: number;
}

interface VenueTable {
  id: string;
  venue_id: string;
  zone_id: string;
  name: string;
  capacity: number;
  notes: string | null;
  minimum_spend: number | null;
  deposit_amount: number | null;
  is_active: boolean;
  display_order: number;
  zone?: { id: string; name: string };
}

export default function VenueTablesPage() {
  const [zones, setZones] = useState<TableZone[]>([]);
  const [tables, setTables] = useState<VenueTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedZones, setExpandedZones] = useState<Set<string>>(new Set());
  const [venueCurrency, setVenueCurrency] = useState<string>("USD");

  // Zone form state
  const [showZoneForm, setShowZoneForm] = useState(false);
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);
  const [zoneFormData, setZoneFormData] = useState({ name: "", description: "" });
  const [savingZone, setSavingZone] = useState(false);

  // Table form state
  const [showTableForm, setShowTableForm] = useState<string | null>(null); // zone_id
  const [editingTableId, setEditingTableId] = useState<string | null>(null);
  const [tableFormData, setTableFormData] = useState({
    name: "",
    capacity: 4,
    notes: "",
    minimum_spend: "",
    deposit_amount: "",
  });
  const [savingTable, setSavingTable] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [zonesRes, tablesRes, settingsRes] = await Promise.all([
        fetch("/api/venue/zones"),
        fetch("/api/venue/tables"),
        fetch("/api/venue/settings"),
      ]);

      if (zonesRes.ok) {
        const zonesData = await zonesRes.json();
        setZones(zonesData.zones || []);
        // Expand all zones by default
        setExpandedZones(new Set((zonesData.zones || []).map((z: TableZone) => z.id)));
      }

      if (tablesRes.ok) {
        const tablesData = await tablesRes.json();
        setTables(tablesData.tables || []);
      }

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        const venue = settingsData.venue || settingsData;
        if (venue?.currency) {
          setVenueCurrency(venue.currency);
        }
      }
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleZoneExpanded = (zoneId: string) => {
    setExpandedZones((prev) => {
      const next = new Set(prev);
      if (next.has(zoneId)) {
        next.delete(zoneId);
      } else {
        next.add(zoneId);
      }
      return next;
    });
  };

  const getTablesForZone = (zoneId: string) => {
    return tables.filter((t) => t.zone_id === zoneId);
  };

  // Zone CRUD
  const startEditZone = (zone: TableZone) => {
    setEditingZoneId(zone.id);
    setZoneFormData({ name: zone.name, description: zone.description || "" });
    setShowZoneForm(true);
  };

  const resetZoneForm = () => {
    setShowZoneForm(false);
    setEditingZoneId(null);
    setZoneFormData({ name: "", description: "" });
  };

  const handleSaveZone = async () => {
    if (!zoneFormData.name.trim()) return;

    setSavingZone(true);
    try {
      const url = editingZoneId
        ? `/api/venue/zones/${editingZoneId}`
        : "/api/venue/zones";
      const method = editingZoneId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(zoneFormData),
      });

      if (res.ok) {
        await loadData();
        resetZoneForm();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to save zone");
      }
    } catch (error) {
      console.error("Failed to save zone:", error);
      alert("Failed to save zone");
    } finally {
      setSavingZone(false);
    }
  };

  const handleDeleteZone = async (zoneId: string) => {
    const zoneTables = getTablesForZone(zoneId);
    const confirmMsg = zoneTables.length > 0
      ? `This zone contains ${zoneTables.length} table(s). Deleting it will also delete all tables. Continue?`
      : "Delete this zone?";

    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/venue/zones/${zoneId}`, { method: "DELETE" });
      if (res.ok) {
        await loadData();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to delete zone");
      }
    } catch (error) {
      console.error("Failed to delete zone:", error);
      alert("Failed to delete zone");
    }
  };

  // Table CRUD
  const startAddTable = (zoneId: string) => {
    setShowTableForm(zoneId);
    setEditingTableId(null);
    setTableFormData({
      name: "",
      capacity: 4,
      notes: "",
      minimum_spend: "",
      deposit_amount: "",
    });
  };

  const startEditTable = (table: VenueTable) => {
    setShowTableForm(table.zone_id);
    setEditingTableId(table.id);
    setTableFormData({
      name: table.name,
      capacity: table.capacity,
      notes: table.notes || "",
      minimum_spend: table.minimum_spend?.toString() || "",
      deposit_amount: table.deposit_amount?.toString() || "",
    });
  };

  const resetTableForm = () => {
    setShowTableForm(null);
    setEditingTableId(null);
    setTableFormData({
      name: "",
      capacity: 4,
      notes: "",
      minimum_spend: "",
      deposit_amount: "",
    });
  };

  const handleSaveTable = async () => {
    if (!tableFormData.name.trim() || !showTableForm) return;

    setSavingTable(true);
    try {
      const url = editingTableId
        ? `/api/venue/tables/${editingTableId}`
        : "/api/venue/tables";
      const method = editingTableId ? "PATCH" : "POST";

      const payload: any = {
        name: tableFormData.name,
        capacity: tableFormData.capacity,
        notes: tableFormData.notes || null,
        minimum_spend: tableFormData.minimum_spend
          ? parseFloat(tableFormData.minimum_spend)
          : null,
        deposit_amount: tableFormData.deposit_amount
          ? parseFloat(tableFormData.deposit_amount)
          : null,
      };

      if (!editingTableId) {
        payload.zone_id = showTableForm;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        await loadData();
        resetTableForm();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to save table");
      }
    } catch (error) {
      console.error("Failed to save table:", error);
      alert("Failed to save table");
    } finally {
      setSavingTable(false);
    }
  };

  const handleDeleteTable = async (tableId: string) => {
    if (!confirm("Delete this table?")) return;

    try {
      const res = await fetch(`/api/venue/tables/${tableId}`, { method: "DELETE" });
      if (res.ok) {
        await loadData();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to delete table");
      }
    } catch (error) {
      console.error("Failed to delete table:", error);
      alert("Failed to delete table");
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return "—";
    const symbol = getCurrencySymbol(venueCurrency);
    return `${symbol}${amount.toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter text-primary">Table Management</h1>
          <p className="mt-2 text-sm text-secondary">
            Define zones and tables for your venue
            <span className="ml-2 text-xs text-muted">
              (Currency: {venueCurrency})
            </span>
          </p>
        </div>
        <Button
          onClick={() => {
            resetZoneForm();
            setShowZoneForm(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Zone
        </Button>
      </div>

      {/* Zone Form */}
      {showZoneForm && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-primary">
              {editingZoneId ? "Edit Zone" : "New Zone"}
            </h3>
            <Button variant="ghost" size="sm" onClick={resetZoneForm}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                Zone Name *
              </label>
              <Input
                placeholder="e.g., VIP Section, Dinner Area"
                value={zoneFormData.name}
                onChange={(e) =>
                  setZoneFormData({ ...zoneFormData, name: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                Description
              </label>
              <Input
                placeholder="Optional description"
                value={zoneFormData.description}
                onChange={(e) =>
                  setZoneFormData({ ...zoneFormData, description: e.target.value })
                }
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSaveZone} disabled={savingZone || !zoneFormData.name.trim()}>
                {savingZone ? "Saving..." : editingZoneId ? "Update Zone" : "Create Zone"}
              </Button>
              <Button variant="secondary" onClick={resetZoneForm}>
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Zones List */}
      {zones.length === 0 ? (
        <Card className="p-8 text-center">
          <Layers className="h-12 w-12 mx-auto text-secondary mb-4" />
          <h3 className="text-lg font-medium text-primary mb-2">No zones yet</h3>
          <p className="text-secondary mb-4">
            Create zones to organize your tables (e.g., VIP, Dinner, Club area)
          </p>
          <Button
            onClick={() => {
              resetZoneForm();
              setShowZoneForm(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add First Zone
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {zones.map((zone) => {
            const zoneTables = getTablesForZone(zone.id);
            const isExpanded = expandedZones.has(zone.id);

            return (
              <Card key={zone.id} className="overflow-hidden">
                {/* Zone Header */}
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-active/30"
                  onClick={() => toggleZoneExpanded(zone.id)}
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="h-5 w-5 text-secondary" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-secondary" />
                    )}
                    <div>
                      <h3 className="font-semibold text-primary">{zone.name}</h3>
                      {zone.description && (
                        <p className="text-sm text-secondary">{zone.description}</p>
                      )}
                    </div>
                    <Badge variant="secondary">{zoneTables.length} tables</Badge>
                  </div>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startEditZone(zone)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteZone(zone.id)}
                    >
                      <Trash2 className="h-4 w-4 text-error" />
                    </Button>
                  </div>
                </div>

                {/* Zone Content (Tables) */}
                {isExpanded && (
                  <div className="border-t border-border-subtle">
                    {/* Table Form */}
                    {showTableForm === zone.id && (
                      <div className="p-4 bg-active/20 border-b border-border-subtle">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-medium text-primary">
                            {editingTableId ? "Edit Table" : "New Table"}
                          </h4>
                          <Button variant="ghost" size="sm" onClick={resetTableForm}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-secondary mb-1">
                              Table Name *
                            </label>
                            <Input
                              placeholder="e.g., VIP 1, Table A"
                              value={tableFormData.name}
                              onChange={(e) =>
                                setTableFormData({ ...tableFormData, name: e.target.value })
                              }
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-secondary mb-1">
                              Capacity *
                            </label>
                            <Input
                              type="number"
                              min={1}
                              value={tableFormData.capacity}
                              onChange={(e) =>
                                setTableFormData({
                                  ...tableFormData,
                                  capacity: parseInt(e.target.value) || 1,
                                })
                              }
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-secondary mb-1">
                              Minimum Spend
                            </label>
                            <Input
                              type="number"
                              min={0}
                              step={0.01}
                              placeholder="0.00"
                              value={tableFormData.minimum_spend}
                              onChange={(e) =>
                                setTableFormData({
                                  ...tableFormData,
                                  minimum_spend: e.target.value,
                                })
                              }
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-secondary mb-1">
                              Deposit
                            </label>
                            <Input
                              type="number"
                              min={0}
                              step={0.01}
                              placeholder="0.00"
                              value={tableFormData.deposit_amount}
                              onChange={(e) =>
                                setTableFormData({
                                  ...tableFormData,
                                  deposit_amount: e.target.value,
                                })
                              }
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-secondary mb-1">
                              Notes
                            </label>
                            <Input
                              placeholder="Optional notes"
                              value={tableFormData.notes}
                              onChange={(e) =>
                                setTableFormData({ ...tableFormData, notes: e.target.value })
                              }
                            />
                          </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                          <Button
                            onClick={handleSaveTable}
                            disabled={savingTable || !tableFormData.name.trim()}
                          >
                            {savingTable
                              ? "Saving..."
                              : editingTableId
                              ? "Update Table"
                              : "Create Table"}
                          </Button>
                          <Button variant="secondary" onClick={resetTableForm}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Tables List */}
                    {zoneTables.length === 0 ? (
                      <div className="p-4 text-center">
                        <p className="text-secondary text-sm mb-3">No tables in this zone</p>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => startAddTable(zone.id)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Table
                        </Button>
                      </div>
                    ) : (
                      <>
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-border-subtle bg-active/10">
                              <th className="text-left p-3 text-sm font-medium text-secondary">
                                Table
                              </th>
                              <th className="text-left p-3 text-sm font-medium text-secondary">
                                <Users className="h-4 w-4 inline mr-1" />
                                Capacity
                              </th>
                              <th className="text-left p-3 text-sm font-medium text-secondary">
                                <DollarSign className="h-4 w-4 inline mr-1" />
                                Min Spend
                              </th>
                              <th className="text-left p-3 text-sm font-medium text-secondary">
                                Deposit
                              </th>
                              <th className="text-left p-3 text-sm font-medium text-secondary">
                                Notes
                              </th>
                              <th className="text-right p-3 text-sm font-medium text-secondary">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {zoneTables.map((table) => (
                              <tr
                                key={table.id}
                                className="border-b border-border-subtle last:border-0 hover:bg-active/20"
                              >
                                <td className="p-3">
                                  <span className="font-medium text-primary">{table.name}</span>
                                  {!table.is_active && (
                                    <Badge variant="secondary" className="ml-2">
                                      Inactive
                                    </Badge>
                                  )}
                                </td>
                                <td className="p-3 text-secondary">{table.capacity}</td>
                                <td className="p-3 text-secondary">
                                  {formatCurrency(table.minimum_spend)}
                                </td>
                                <td className="p-3 text-secondary">
                                  {formatCurrency(table.deposit_amount)}
                                </td>
                                <td className="p-3 text-secondary text-sm">
                                  {table.notes || "—"}
                                </td>
                                <td className="p-3 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => startEditTable(table)}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteTable(table.id)}
                                    >
                                      <Trash2 className="h-4 w-4 text-error" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div className="p-3 border-t border-border-subtle">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => startAddTable(zone.id)}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add Table
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
