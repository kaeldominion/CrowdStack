"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Card, LoadingSpinner, Input } from "@crowdstack/ui";
import { ArrowLeft, Save, Mail, Eye } from "lucide-react";
import Link from "next/link";

interface EmailTemplate {
  id: string;
  slug: string;
  trigger: string;
  category: string;
  target_roles: string[];
  subject: string;
  html_body: string;
  text_body: string | null;
  variables: Record<string, any>;
  enabled: boolean;
}

export default function EmailTemplateEditorPage() {
  const params = useParams();
  const router = useRouter();
  const templateId = params.templateId as string;
  const isNew = templateId === "new";

  const [template, setTemplate] = useState<EmailTemplate | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [sampleData, setSampleData] = useState<Record<string, any>>({});

  // Form state
  const [slug, setSlug] = useState("");
  const [trigger, setTrigger] = useState("");
  const [category, setCategory] = useState("auth_onboarding");
  const [targetRoles, setTargetRoles] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [htmlBody, setHtmlBody] = useState("");
  const [textBody, setTextBody] = useState("");
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (!isNew) {
      loadTemplate();
    }
  }, [templateId]);

  useEffect(() => {
    // Extract variables from HTML body
    const variableRegex = /\{\{(\w+)\}\}/g;
    const variables: Record<string, any> = {};
    let match;
    while ((match = variableRegex.exec(htmlBody + subject + (textBody || ""))) !== null) {
      const varName = match[1];
      if (!variables[varName]) {
        variables[varName] = `Sample ${varName}`;
      }
    }
    setSampleData(variables);
  }, [htmlBody, subject, textBody]);

  const loadTemplate = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/email-templates/${templateId}`);
      if (response.ok) {
        const data = await response.json();
        const t = data.template;
        setTemplate(t);
        setSlug(t.slug);
        setTrigger(t.trigger);
        setCategory(t.category);
        setTargetRoles(t.target_roles || []);
        setSubject(t.subject);
        setHtmlBody(t.html_body);
        setTextBody(t.text_body || "");
        setEnabled(t.enabled);
      }
    } catch (error) {
      console.error("Failed to load template:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderTemplate = (template: string, data: Record<string, any>): string => {
    let rendered = template;
    Object.keys(data).forEach((key) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
      const value = data[key] !== null && data[key] !== undefined ? String(data[key]) : "";
      rendered = rendered.replace(regex, value);
    });
    return rendered;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        trigger,
        category,
        target_roles: targetRoles,
        subject,
        html_body: htmlBody,
        text_body: textBody || null,
        variables: sampleData,
        enabled,
      };

      const url = isNew
        ? "/api/admin/email-templates"
        : `/api/admin/email-templates/${templateId}`;
      const method = isNew ? "POST" : "PATCH";

      const body = isNew ? { ...payload, slug } : payload;

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        router.push("/admin/communications");
      } else {
        const data = await response.json();
        alert(data.error || "Failed to save template");
      }
    } catch (error) {
      console.error("Failed to save template:", error);
      alert("Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  const handleTestSend = async () => {
    const email = prompt("Enter email address to send test to:");
    if (!email) return;

    try {
      const response = await fetch(`/api/admin/email-templates/${templateId}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: email,
          sample_data: sampleData,
        }),
      });

      if (response.ok) {
        alert("Test email sent successfully!");
      } else {
        const data = await response.json();
        alert(data.error || "Failed to send test email");
      }
    } catch (error) {
      console.error("Failed to send test email:", error);
      alert("Failed to send test email");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner text="Loading template..." />
      </div>
    );
  }

  const previewHtml = renderTemplate(htmlBody, sampleData);
  const previewSubject = renderTemplate(subject, sampleData);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/communications">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-primary">
              {isNew ? "New Email Template" : `Edit: ${template?.slug}`}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!isNew && (
            <Button variant="secondary" onClick={handleTestSend}>
              <Mail className="h-4 w-4 mr-2" />
              Test Send
            </Button>
          )}
          <Button variant="ghost" onClick={() => setShowPreview(!showPreview)}>
            <Eye className="h-4 w-4 mr-2" />
            {showPreview ? "Hide" : "Show"} Preview
          </Button>
          <Button variant="primary" onClick={handleSave} loading={saving}>
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Editor Panel */}
        <div className="space-y-4">
          <Card>
            <div className="space-y-4">
              {isNew && (
                <Input
                  label="Template Slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="promoter_welcome"
                  helperText="Unique identifier (e.g., promoter_welcome)"
                />
              )}

              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Trigger
                </label>
                <input
                  type="text"
                  value={trigger}
                  onChange={(e) => setTrigger(e.target.value)}
                  placeholder="promoter.created"
                  className="w-full rounded-xl bg-raised border border-border-subtle px-4 py-3 font-mono text-sm text-primary"
                />
                <p className="mt-1.5 text-xs text-secondary">
                  Event that triggers this email (e.g., promoter.created)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl bg-raised border border-border-subtle px-4 py-3 text-sm text-primary"
                >
                  <option value="auth_onboarding">Auth & Onboarding</option>
                  <option value="event_lifecycle">Event Lifecycle</option>
                  <option value="payout">Payout</option>
                  <option value="bonus">Bonus</option>
                  <option value="guest">Guest</option>
                  <option value="venue">Venue</option>
                  <option value="system">System</option>
                </select>
              </div>

              <Input
                label="Subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Welcome to CrowdStack, {{promoter_name}}!"
                helperText={"Use {{variable}} for dynamic content"}
              />

              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  HTML Body
                </label>
                <textarea
                  value={htmlBody}
                  onChange={(e) => setHtmlBody(e.target.value)}
                  placeholder="<html>...</html>"
                  className="w-full rounded-xl bg-raised border border-border-subtle px-4 py-3 font-mono text-sm text-primary min-h-[400px]"
                />
                <p className="mt-1.5 text-xs text-secondary">
                  Paste HTML code here. Use {'{{variable}}'} for dynamic content.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Plain Text Body (Optional)
                </label>
                <textarea
                  value={textBody}
                  onChange={(e) => setTextBody(e.target.value)}
                  placeholder="Plain text version..."
                  className="w-full rounded-xl bg-raised border border-border-subtle px-4 py-3 font-mono text-sm text-primary min-h-[200px]"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="enabled"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="enabled" className="text-sm text-primary">
                  Enabled
                </label>
              </div>
            </div>
          </Card>

          {/* Sample Data Editor */}
          <Card>
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-primary">
                Sample Data (for preview)
              </h3>
              {Object.keys(sampleData).length === 0 ? (
                <p className="text-xs text-secondary">
                  Variables will appear here as you use them in the template
                </p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(sampleData).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2">
                      <span className="text-xs font-mono text-secondary w-32">
                        {key}:
                      </span>
                      <input
                        type="text"
                        value={value as string}
                        onChange={(e) =>
                          setSampleData({ ...sampleData, [key]: e.target.value })
                        }
                        className="flex-1 rounded-lg bg-raised border border-border-subtle px-3 py-1.5 text-xs text-primary"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Preview Panel */}
        {showPreview && (
          <div className="space-y-4">
            <Card>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-primary mb-2">
                    Preview
                  </h3>
                  <div className="p-2 rounded-lg bg-active/50 border border-border-subtle">
                    <div className="text-xs font-mono text-secondary mb-1">
                      Subject: {previewSubject}
                    </div>
                  </div>
                </div>
                <div className="border border-border-subtle rounded-lg overflow-hidden">
                  <iframe
                    srcDoc={previewHtml}
                    className="w-full h-[600px] bg-white"
                    title="Email Preview"
                  />
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

