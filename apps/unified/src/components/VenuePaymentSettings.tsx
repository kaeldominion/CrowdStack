"use client";

import { useState, useEffect } from "react";
import { Button, Input, Textarea, Badge, InlineSpinner } from "@crowdstack/ui";
import {
  CreditCard,
  Check,
  X,
  AlertCircle,
  ExternalLink,
  Eye,
  EyeOff,
  RefreshCw,
  Wallet,
  Settings,
  TestTube,
} from "lucide-react";

interface PaymentSettings {
  id?: string;
  venue_id?: string;
  doku_enabled: boolean;
  doku_client_id: string;
  doku_secret_key: string;
  doku_environment: "sandbox" | "production";
  manual_payment_enabled: boolean;
  manual_payment_instructions: string;
  auto_confirm_on_payment: boolean;
  payment_expiry_hours: number;
  last_tested_at?: string;
  last_test_status?: string;
  has_secret_key?: boolean;
}

const defaultSettings: PaymentSettings = {
  doku_enabled: false,
  doku_client_id: "",
  doku_secret_key: "",
  doku_environment: "sandbox",
  manual_payment_enabled: true,
  manual_payment_instructions: "",
  auto_confirm_on_payment: true,
  payment_expiry_hours: 24,
};

export function VenuePaymentSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [settings, setSettings] = useState<PaymentSettings>(defaultSettings);
  const [originalSettings, setOriginalSettings] = useState<PaymentSettings>(defaultSettings);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showSecretKey, setShowSecretKey] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/venue/settings/payments");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load payment settings");
      }

      if (data.settings) {
        setSettings({
          ...defaultSettings,
          ...data.settings,
          doku_secret_key: data.settings.has_secret_key ? "••••••••••••••••" : "",
        });
        setOriginalSettings({
          ...defaultSettings,
          ...data.settings,
          doku_secret_key: data.settings.has_secret_key ? "••••••••••••••••" : "",
        });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const response = await fetch("/api/venue/settings/payments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save payment settings");
      }

      setSuccess("Payment settings saved successfully");
      if (data.settings) {
        setSettings({
          ...defaultSettings,
          ...data.settings,
          doku_secret_key: data.settings.has_secret_key ? "••••••••••••••••" : "",
        });
        setOriginalSettings({
          ...defaultSettings,
          ...data.settings,
          doku_secret_key: data.settings.has_secret_key ? "••••••••••••••••" : "",
        });
      }

      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    try {
      setTesting(true);
      setTestResult(null);
      setError(null);

      const response = await fetch("/api/venue/settings/payments/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doku_client_id: settings.doku_client_id,
          doku_secret_key: settings.doku_secret_key,
          doku_environment: settings.doku_environment,
        }),
      });

      const data = await response.json();

      setTestResult({
        success: data.success,
        message: data.message,
      });

      // Update last tested info
      if (data.success) {
        setSettings((prev) => ({
          ...prev,
          last_tested_at: data.tested_at,
          last_test_status: "success",
        }));
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || "Connection test failed",
      });
    } finally {
      setTesting(false);
    }
  };

  const hasChanges =
    JSON.stringify(settings) !== JSON.stringify(originalSettings);

  if (loading) {
    return (
      <div className="py-12 text-center">
        <InlineSpinner className="mx-auto" />
        <p className="mt-2 text-sm text-gray-400">Loading payment settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Messages */}
      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 flex items-start gap-3">
          <Check className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <p>{success}</p>
        </div>
      )}

      {/* DOKU Configuration */}
      <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Wallet className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">DOKU Payment Gateway</h3>
              <p className="text-sm text-gray-400">Accept payments via Indonesia's leading payment gateway</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.doku_enabled}
              onChange={(e) =>
                setSettings({ ...settings, doku_enabled: e.target.checked })
              }
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
            <span className="ml-3 text-sm font-medium text-gray-300">
              {settings.doku_enabled ? "Enabled" : "Disabled"}
            </span>
          </label>
        </div>

        <div className="space-y-4">
          {/* Client ID */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Client ID
            </label>
            <Input
              value={settings.doku_client_id}
              onChange={(e) =>
                setSettings({ ...settings, doku_client_id: e.target.value })
              }
              placeholder="BRN-0123-1234567890"
              className="w-full"
            />
            <p className="mt-1 text-xs text-gray-500">
              Your DOKU merchant Client ID
            </p>
          </div>

          {/* Secret Key */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Secret Key
            </label>
            <div className="relative">
              <Input
                type={showSecretKey ? "text" : "password"}
                value={settings.doku_secret_key}
                onChange={(e) =>
                  setSettings({ ...settings, doku_secret_key: e.target.value })
                }
                placeholder="SK_xxxxxxxxxxxxxxxxxxxxx"
                className="w-full pr-10"
              />
              <button
                type="button"
                onClick={() => setShowSecretKey(!showSecretKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showSecretKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Your DOKU Secret Key (stored securely)
            </p>
          </div>

          {/* Environment */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Environment
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="environment"
                  value="sandbox"
                  checked={settings.doku_environment === "sandbox"}
                  onChange={() =>
                    setSettings({ ...settings, doku_environment: "sandbox" })
                  }
                  className="text-blue-500 focus:ring-blue-500 bg-gray-700 border-gray-600"
                />
                <span className="text-sm text-gray-300">Sandbox (Testing)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="environment"
                  value="production"
                  checked={settings.doku_environment === "production"}
                  onChange={() =>
                    setSettings({ ...settings, doku_environment: "production" })
                  }
                  className="text-blue-500 focus:ring-blue-500 bg-gray-700 border-gray-600"
                />
                <span className="text-sm text-gray-300">Production (Live)</span>
              </label>
            </div>
          </div>

          {/* Test Connection */}
          <div className="flex items-center gap-4 pt-4 border-t border-gray-700">
            <Button
              onClick={testConnection}
              disabled={testing || !settings.doku_client_id}
              variant="secondary"
            >
              {testing ? (
                <>
                  <InlineSpinner />
                  <span className="ml-2">Testing...</span>
                </>
              ) : (
                <>
                  <TestTube className="h-4 w-4 mr-2" />
                  Test Connection
                </>
              )}
            </Button>

            {testResult && (
              <div
                className={`flex items-center gap-2 text-sm ${
                  testResult.success ? "text-green-400" : "text-red-400"
                }`}
              >
                {testResult.success ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <X className="h-4 w-4" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}

            {settings.last_tested_at && !testResult && (
              <span className="text-xs text-gray-500">
                Last tested:{" "}
                {new Date(settings.last_tested_at).toLocaleString()} -{" "}
                <span
                  className={
                    settings.last_test_status === "success"
                      ? "text-green-400"
                      : "text-red-400"
                  }
                >
                  {settings.last_test_status === "success"
                    ? "Success"
                    : settings.last_test_status}
                </span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Payment Settings */}
      <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-purple-500/20">
            <Settings className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Payment Settings</h3>
            <p className="text-sm text-gray-400">Configure payment behavior</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Auto-confirm */}
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="text-sm font-medium text-white">
                Auto-confirm bookings on payment
              </p>
              <p className="text-xs text-gray-500">
                Automatically confirm table bookings when payment is received
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.auto_confirm_on_payment}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  auto_confirm_on_payment: e.target.checked,
                })
              }
              className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-purple-500 focus:ring-purple-500"
            />
          </label>

          {/* Payment Expiry */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Payment link expires after
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={settings.payment_expiry_hours}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    payment_expiry_hours: parseInt(e.target.value) || 24,
                  })
                }
                min={1}
                max={168}
                className="w-24"
              />
              <span className="text-sm text-gray-400">hours</span>
            </div>
          </div>
        </div>
      </div>

      {/* Manual Payment Fallback */}
      <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20">
              <CreditCard className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">
                Manual Payment Fallback
              </h3>
              <p className="text-sm text-gray-400">
                Show bank transfer instructions when DOKU is unavailable
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.manual_payment_enabled}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  manual_payment_enabled: e.target.checked,
                })
              }
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
            <span className="ml-3 text-sm font-medium text-gray-300">
              {settings.manual_payment_enabled ? "Enabled" : "Disabled"}
            </span>
          </label>
        </div>

        {settings.manual_payment_enabled && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Payment Instructions
            </label>
            <Textarea
              value={settings.manual_payment_instructions}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  manual_payment_instructions: e.target.value,
                })
              }
              placeholder={`Transfer deposit to:\nBank BCA - 1234567890\nAccount Name: PT Your Club\n\nInclude your booking reference in the transfer description.`}
              rows={5}
              className="w-full"
            />
            <p className="mt-1 text-xs text-gray-500">
              These instructions will be shown to guests when making manual payments
            </p>
          </div>
        )}
      </div>

      {/* DOKU Info */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-300">
            <p className="font-medium mb-1">Need a DOKU merchant account?</p>
            <p className="text-blue-400">
              Contact DOKU to set up your merchant account and obtain API credentials.
              Visit{" "}
              <a
                href="https://www.doku.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-blue-300 inline-flex items-center gap-1"
              >
                doku.com
                <ExternalLink className="h-3 w-3" />
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-700">
        {hasChanges && (
          <span className="text-sm text-amber-400">You have unsaved changes</span>
        )}
        <Button onClick={saveSettings} disabled={saving || !hasChanges}>
          {saving ? (
            <>
              <InlineSpinner />
              <span className="ml-2">Saving...</span>
            </>
          ) : (
            <>
              <Check className="h-4 w-4 mr-2" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
