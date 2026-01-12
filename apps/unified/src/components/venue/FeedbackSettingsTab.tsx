"use client";

import { useState, useEffect } from "react";
import { Card, Button, Input, Switch, LoadingSpinner, useToast } from "@crowdstack/ui";
import { Save, MessageSquare, Clock } from "lucide-react";

interface FeedbackSettings {
  enabled: boolean;
  delay_hours: number;
}

interface FeedbackSettingsTabProps {
  venueId?: string;
}

export function FeedbackSettingsTab({ venueId }: FeedbackSettingsTabProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<FeedbackSettings>({
    enabled: true,
    delay_hours: 24,
  });
  const { toast } = useToast();

  useEffect(() => {
    if (venueId) {
      loadSettings();
    } else {
      setLoading(false);
    }
  }, [venueId]);

  const loadSettings = async () => {
    if (!venueId) return;

    try {
      const response = await fetch(`/api/venue/feedback/settings`);
      if (response.ok) {
        const data = await response.json();
        if (data.settings) {
          setSettings({
            enabled: data.settings.enabled ?? true,
            delay_hours: data.settings.delay_hours ?? 24,
          });
        }
      }
    } catch (error) {
      console.error("Error loading feedback settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!venueId) {
      toast({
        title: "Error",
        description: "Venue ID is required",
        variant: "error",
      });
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/venue/feedback/settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        throw new Error("Failed to save settings");
      }

      toast({
        title: "Settings saved",
        description: "Feedback settings have been updated successfully.",
        variant: "success",
      });
    } catch (error: any) {
      console.error("Error saving feedback settings:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save settings",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="p-6 space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-primary mb-2 flex items-center gap-2">
              <MessageSquare className="h-6 w-6" />
              Venue Pulse Settings
            </h2>
            <p className="text-sm text-secondary">
              Configure how and when feedback requests are sent to attendees after events.
            </p>
          </div>

          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between p-4 border border-border-subtle rounded-lg">
            <div className="flex-1">
              <h3 className="text-lg font-medium text-primary mb-1">
                Enable Feedback Collection
              </h3>
              <p className="text-sm text-secondary">
                When enabled, attendees who checked in will receive feedback requests after events close.
              </p>
            </div>
            <Switch
              checked={settings.enabled}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, enabled: checked })
              }
            />
          </div>

          {/* Delay Hours */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-primary flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Delay After Event Close
            </label>
            <p className="text-sm text-secondary">
              How many hours after an event closes should feedback requests be sent? (Default: 24 hours)
            </p>
            <Input
              type="number"
              min="0"
              max="168"
              value={settings.delay_hours}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  delay_hours: parseInt(e.target.value) || 24,
                })
              }
              disabled={!settings.enabled}
              className="max-w-xs"
            />
            <p className="text-xs text-secondary">
              Recommended: 24-48 hours. This gives attendees time to reflect on their experience.
            </p>
          </div>

          {/* Info Box */}
          <div className="p-4 bg-secondary/10 border border-border-subtle rounded-lg">
            <h4 className="text-sm font-medium text-primary mb-2">
              How Venue Pulse Works
            </h4>
            <ul className="text-sm text-secondary space-y-1 list-disc list-inside">
              <li>Feedback requests are sent automatically when events close</li>
              <li>Only verified attendees (those who checked in) receive requests</li>
              <li>All feedback is private and visible only to your venue</li>
              <li>Feedback helps you identify areas for improvement</li>
            </ul>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4 border-t border-border-subtle">
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={saving}
              loading={saving}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Settings
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
