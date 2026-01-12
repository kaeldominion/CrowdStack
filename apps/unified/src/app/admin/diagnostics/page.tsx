"use client";

import { useState } from "react";
import { Card, Container, Section, Button, Input, Badge } from "@crowdstack/ui";
import { Search, Database, AlertCircle, CheckCircle } from "lucide-react";

export default function AdminDiagnosticsPage() {
  const [type, setType] = useState<"venue" | "promoter">("venue");
  const [slug, setSlug] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleQuery = async () => {
    if (!slug.trim()) {
      setError("Please enter a slug");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`/api/admin/diagnostics?type=${type}&slug=${encodeURIComponent(slug.trim())}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Query failed");
        return;
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || "Failed to query database");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <Section>
        <div className="flex items-center gap-3 mb-6">
          <Database className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Database Diagnostics</h1>
        </div>

        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Entity Type</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="venue"
                    checked={type === "venue"}
                    onChange={(e) => setType(e.target.value as "venue")}
                    className="w-4 h-4"
                  />
                  <span>Venue</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="promoter"
                    checked={type === "promoter"}
                    onChange={(e) => setType(e.target.value as "promoter")}
                    className="w-4 h-4"
                  />
                  <span>Promoter</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Slug</label>
              <div className="flex gap-2">
                <Input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="Enter slug (e.g., 'my-venue' or 'promoter-name')"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleQuery();
                    }
                  }}
                  className="flex-1"
                />
                <Button onClick={handleQuery} disabled={loading}>
                  <Search className="h-4 w-4 mr-2" />
                  Query
                </Button>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium text-red-500">Error</div>
                  <div className="text-sm text-red-400 mt-1">{error}</div>
                </div>
              </div>
            )}

            {result && (
              <div className="space-y-4">
                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    {result.found ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-yellow-500" />
                    )}
                    <div className="font-medium">
                      {result.found ? "Record Found" : "Record Not Found"}
                    </div>
                    {result.count > 1 && (
                      <Badge color="red" variant="outline">
                        WARNING: {result.count} records with this slug!
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-secondary space-y-1">
                    <div>Type: <strong>{result.type}</strong></div>
                    <div>Slug: <strong>{result.slug}</strong></div>
                    <div>Records found: <strong>{result.count}</strong></div>
                    {result.timestamp && (
                      <div>Query time: <strong>{new Date(result.timestamp).toLocaleString()}</strong></div>
                    )}
                  </div>
                </div>

                {result.allRecordsWithSlug && result.allRecordsWithSlug.length > 1 && (
                  <div>
                    <h3 className="font-medium mb-2 text-red-500">
                      ⚠️ Multiple Records with Same Slug:
                    </h3>
                    <div className="space-y-2">
                      {result.allRecordsWithSlug.map((record: any, idx: number) => (
                        <div key={record.id} className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded">
                          <div className="font-mono text-xs">
                            ID: {record.id} | Name: {record.name} | Updated: {record.updated_at ? new Date(record.updated_at).toLocaleString() : 'N/A'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {result.record && (
                  <div>
                    <h3 className="font-medium mb-2">Database Record:</h3>
                    <pre className="p-4 bg-gray-900 rounded-lg overflow-auto text-xs">
                      {JSON.stringify(result.record, null, 2)}
                    </pre>
                  </div>
                )}

                {result.records && result.records.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-2">All Records Found:</h3>
                    <div className="space-y-2">
                      {result.records.map((record: any, idx: number) => (
                        <div key={record.id || idx} className="p-3 bg-gray-900 rounded">
                          <pre className="text-xs overflow-auto">
                            {JSON.stringify(record, null, 2)}
                          </pre>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      </Section>
    </Container>
  );
}
