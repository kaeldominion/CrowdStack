"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { Card, Container, Section, Button, Input, Badge, useToast } from "@crowdstack/ui";
import { ArrowLeft, Copy, Check, Mail, Download, Eye, Code } from "lucide-react";

// Hosted logo URLs - using the public folder assets
// LOGO_URL_DARK = logo for dark backgrounds (white/light text)
// LOGO_URL_LIGHT = logo for light backgrounds (black/dark text)
const LOGO_URL_DARK = "https://crowdstack.app/logos/crowdstack-wordmark-dark-standard-transparent.png";
const LOGO_URL_LIGHT = "https://crowdstack.app/logos/crowdstack-wordmark-light-standard-transparent.png";
const WEBSITE_URL = "https://crowdstack.app";
const SLOGAN = "Run events with data, not guesswork.";

interface SignatureData {
  name: string;
  title: string;
  email: string;
  phone: string;
  whatsapp: string;
  instagram: string;
  theme: "light" | "dark";
}

export default function EmailSignaturePage() {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<SignatureData>({
    name: "",
    title: "",
    email: "",
    phone: "",
    whatsapp: "",
    instagram: "",
    theme: "dark", // Default to light email background (most common)
  });

  const updateField = (field: keyof SignatureData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Generate the HTML signature
  const generateSignatureHTML = () => {
    // "dark" theme = signature for LIGHT email backgrounds (dark text)
    // "light" theme = signature for DARK email backgrounds (light text)
    const isForLightBg = formData.theme === "dark";
    const logoUrl = isForLightBg ? LOGO_URL_LIGHT : LOGO_URL_DARK;
    const textColor = isForLightBg ? "#1a1a1a" : "#ffffff";
    const mutedColor = isForLightBg ? "#4b5563" : "#9ca3af";
    const accentColor = "#a855f7";

    // Format WhatsApp link
    const whatsappLink = formData.whatsapp
      ? `https://wa.me/${formData.whatsapp.replace(/[^0-9]/g, '')}`
      : null;

    // Format Instagram link
    const instagramHandle = formData.instagram.replace('@', '');
    const instagramLink = instagramHandle
      ? `https://instagram.com/${instagramHandle}`
      : null;

    // Build contact links
    const contactLinks: string[] = [];
    if (formData.email) {
      contactLinks.push(`<a href="mailto:${formData.email}" style="color: ${mutedColor}; text-decoration: none;">${formData.email}</a>`);
    }
    if (formData.phone) {
      contactLinks.push(`<a href="tel:${formData.phone.replace(/[^0-9+]/g, '')}" style="color: ${mutedColor}; text-decoration: none;">${formData.phone}</a>`);
    }
    if (whatsappLink) {
      contactLinks.push(`<a href="${whatsappLink}" target="_blank" style="color: #25D366; text-decoration: none;">WhatsApp</a>`);
    }
    if (instagramLink) {
      contactLinks.push(`<a href="${instagramLink}" target="_blank" style="color: #E4405F; text-decoration: none;">@${instagramHandle}</a>`);
    }

    return `
<table cellpadding="0" cellspacing="0" border="0" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <tr>
    <td style="padding: 16px 0;">
      <!-- Top accent line -->
      <div style="width: 60px; height: 3px; background: linear-gradient(90deg, #3b82f6, #a855f7); margin-bottom: 16px; border-radius: 2px;"></div>

      <!-- Name and Title -->
      <table cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td>
            ${formData.name ? `<p style="margin: 0 0 2px 0; font-size: 18px; font-weight: 700; color: ${textColor};">${formData.name}</p>` : ''}
            ${formData.title ? `<p style="margin: 0 0 12px 0; font-size: 14px; color: ${accentColor}; font-weight: 500;">${formData.title}</p>` : ''}
          </td>
        </tr>
      </table>

      <!-- Contact Info -->
      ${contactLinks.length > 0 ? `
      <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 16px;">
        <tr>
          <td style="font-size: 13px; line-height: 1.6;">
            ${contactLinks.join('<span style="color: ' + mutedColor + '; margin: 0 8px;">·</span>')}
          </td>
        </tr>
      </table>
      ` : ''}

      <!-- Logo and Slogan -->
      <table cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="vertical-align: middle; padding-right: 12px;">
            <a href="${WEBSITE_URL}" target="_blank" style="text-decoration: none;">
              <img src="${logoUrl}" alt="CrowdStack" width="180" height="36" style="display: block; border: 0;" />
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding-top: 6px;">
            <p style="margin: 0; font-size: 11px; color: ${mutedColor}; font-style: italic;">${SLOGAN}</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
    `.trim();
  };

  const copyToClipboard = async () => {
    const html = generateSignatureHTML();
    try {
      await navigator.clipboard.writeText(html);
      setCopied(true);
      toast.success("HTML copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const downloadHTML = () => {
    const html = generateSignatureHTML();
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `crowdstack-signature-${formData.name.toLowerCase().replace(/\s+/g, '-') || 'template'}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("HTML file downloaded!");
  };

  return (
    <Section spacing="lg">
      <Container>
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-sm text-secondary hover:text-primary mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Admin
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-500/20 rounded-lg border border-purple-500/30">
              <Mail className="w-6 h-6 text-purple-400" />
            </div>
            <h1 className="text-2xl font-bold text-primary">Email Signature Generator</h1>
          </div>
          <p className="text-sm text-secondary max-w-lg">
            Create professional email signatures for your team. Fill in the details below,
            preview your signature, and copy the HTML to add to your email client.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form */}
          <div className="space-y-6">
            <Card className="!p-6">
              <h2 className="text-lg font-semibold text-primary mb-4">Your Details</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1.5">
                    Full Name *
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary mb-1.5">
                    Job Title
                  </label>
                  <Input
                    value={formData.title}
                    onChange={(e) => updateField("title", e.target.value)}
                    placeholder="Event Manager"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary mb-1.5">
                    Email Address *
                  </label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    placeholder="john@crowdstack.app"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary mb-1.5">
                    Phone Number
                  </label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    placeholder="+1 234 567 8900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary mb-1.5">
                    WhatsApp Number
                  </label>
                  <Input
                    value={formData.whatsapp}
                    onChange={(e) => updateField("whatsapp", e.target.value)}
                    placeholder="+1 234 567 8900"
                  />
                  <p className="text-xs text-muted mt-1">Include country code for international messaging</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary mb-1.5">
                    Instagram Handle
                  </label>
                  <Input
                    value={formData.instagram}
                    onChange={(e) => updateField("instagram", e.target.value)}
                    placeholder="@crowdstack"
                  />
                </div>
              </div>
            </Card>

            <Card className="!p-6">
              <h2 className="text-lg font-semibold text-primary mb-4">Email Background</h2>
              <p className="text-sm text-secondary mb-4">Choose based on your email client's compose background color</p>
              <div className="flex gap-3">
                <button
                  onClick={() => updateField("theme", "dark")}
                  className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                    formData.theme === "dark"
                      ? "border-purple-500 bg-purple-500/10"
                      : "border-border hover:border-primary/30"
                  }`}
                >
                  <div className="w-full h-12 bg-white rounded-md mb-2 border border-gray-200 flex items-center justify-center">
                    <span className="text-xs text-gray-800 font-medium">Aa</span>
                  </div>
                  <p className="text-sm font-medium text-primary">Light Background</p>
                  <p className="text-xs text-secondary">Gmail, Outlook, etc.</p>
                </button>
                <button
                  onClick={() => updateField("theme", "light")}
                  className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                    formData.theme === "light"
                      ? "border-purple-500 bg-purple-500/10"
                      : "border-border hover:border-primary/30"
                  }`}
                >
                  <div className="w-full h-12 bg-[#1a1a1a] rounded-md mb-2 border border-gray-700 flex items-center justify-center">
                    <span className="text-xs text-gray-200 font-medium">Aa</span>
                  </div>
                  <p className="text-sm font-medium text-primary">Dark Background</p>
                  <p className="text-xs text-secondary">Dark mode email clients</p>
                </button>
              </div>
            </Card>
          </div>

          {/* Preview & Export */}
          <div className="space-y-6">
            <Card className="!p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-primary flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Preview
                </h2>
                <button
                  onClick={() => setShowCode(!showCode)}
                  className="text-sm text-secondary hover:text-primary flex items-center gap-1"
                >
                  <Code className="h-4 w-4" />
                  {showCode ? "Hide Code" : "Show Code"}
                </button>
              </div>

              {/* Live Preview */}
              <div
                className={`rounded-lg p-6 border ${
                  formData.theme === "dark"
                    ? "bg-white"
                    : "bg-[#1a1a1a]"
                }`}
              >
                <div
                  ref={previewRef}
                  dangerouslySetInnerHTML={{ __html: generateSignatureHTML() }}
                />
              </div>

              {/* Code View */}
              {showCode && (
                <div className="mt-4">
                  <pre className="bg-void p-4 rounded-lg overflow-x-auto text-xs text-secondary border border-border">
                    <code>{generateSignatureHTML()}</code>
                  </pre>
                </div>
              )}
            </Card>

            <Card className="!p-6">
              <h2 className="text-lg font-semibold text-primary mb-4">Export Signature</h2>

              <div className="space-y-4">
                <Button
                  className="w-full"
                  onClick={copyToClipboard}
                  disabled={!formData.name || !formData.email}
                >
                  {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                  {copied ? "Copied!" : "Copy HTML to Clipboard"}
                </Button>

                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={downloadHTML}
                  disabled={!formData.name || !formData.email}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download HTML File
                </Button>

                {(!formData.name || !formData.email) && (
                  <p className="text-xs text-amber-500 text-center">
                    Please fill in at least your name and email to export
                  </p>
                )}
              </div>
            </Card>

            <Card className="!p-6">
              <h2 className="text-lg font-semibold text-primary mb-4">How to Add to Your Email</h2>
              <div className="space-y-4 text-sm text-secondary">
                <div>
                  <h3 className="font-medium text-primary mb-1">Gmail</h3>
                  <p>Settings &rarr; See all settings &rarr; General &rarr; Signature &rarr; Create new &rarr; Paste HTML</p>
                </div>
                <div>
                  <h3 className="font-medium text-primary mb-1">Outlook</h3>
                  <p>Settings &rarr; View all Outlook settings &rarr; Mail &rarr; Compose and reply &rarr; Email signature &rarr; Paste HTML</p>
                </div>
                <div>
                  <h3 className="font-medium text-primary mb-1">Apple Mail</h3>
                  <p>Mail &rarr; Preferences &rarr; Signatures &rarr; Create new &rarr; Paste HTML in the editor</p>
                </div>
                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted">
                    Note: Some email clients may require you to paste the signature in "HTML mode" or use a signature management tool.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </Container>
    </Section>
  );
}
