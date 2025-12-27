"use client";

import { Modal } from "@crowdstack/ui";
import { User, Mail, Phone, Shield, Bell, X } from "lucide-react";
import { Button } from "@crowdstack/ui";

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
  userRoles?: string[];
}

export function UserProfileModal({ isOpen, onClose, userEmail, userRoles = [] }: UserProfileModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Profile & Settings"
      size="lg"
    >
      <div className="space-y-6">
        {/* Profile Section */}
        <div>
          <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-secondary">Email</label>
              <div className="mt-1 flex items-center gap-2">
                <Mail className="h-4 w-4 text-secondary" />
                <span className="text-primary">{userEmail || "—"}</span>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-secondary">Roles</label>
              <div className="mt-1 flex items-center gap-2 flex-wrap">
                {userRoles.length > 0 ? (
                  userRoles.map((role) => (
                    <span
                      key={role}
                      className="px-2 py-1 text-xs font-medium rounded-md bg-accent-secondary/10 text-primary"
                    >
                      {role}
                    </span>
                  ))
                ) : (
                  <span className="text-secondary">No roles assigned</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Account Settings Section */}
        <div className="border-t border-border pt-6">
          <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Account Settings
          </h3>
          <div className="space-y-3">
            <p className="text-sm text-secondary">
              Account settings and password management coming soon.
            </p>
          </div>
        </div>

        {/* Notifications Section */}
        <div className="border-t border-border pt-6">
          <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </h3>
          <div className="space-y-3">
            <p className="text-sm text-secondary">
              Notification preferences coming soon.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t border-border">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}

