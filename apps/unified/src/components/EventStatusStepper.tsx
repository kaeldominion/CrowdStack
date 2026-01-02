"use client";

import {
  FileEdit,
  Globe,
  Clock,
  Lock,
  CheckCircle2,
  DollarSign,
  Check,
} from "lucide-react";
import { cn } from "@crowdstack/ui";

export type EventStatus = "draft" | "published" | "ended" | "closed";
export type PayoutStatus = "none" | "pending_payment" | "paid" | "confirmed";

interface EventStatusStepperProps {
  status: EventStatus;
  payoutStatus?: PayoutStatus;
  closedAt?: string | null;
  className?: string;
  size?: "sm" | "md" | "lg";
  showLabels?: boolean;
}

interface Step {
  id: EventStatus | "paid" | "confirmed";
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}

const EVENT_STEPS: Step[] = [
  { id: "draft", label: "Draft", shortLabel: "Draft", icon: FileEdit },
  { id: "published", label: "Published", shortLabel: "Live", icon: Globe },
  { id: "ended", label: "Event Ended", shortLabel: "Ended", icon: Clock },
  { id: "closed", label: "Numbers Confirmed", shortLabel: "Closed", icon: Lock },
  { id: "paid", label: "Paid Out", shortLabel: "Paid", icon: DollarSign },
  { id: "confirmed", label: "Confirmed", shortLabel: "Done", icon: Check },
];

function getStepIndex(status: EventStatus, payoutStatus?: PayoutStatus): number {
  // Map statuses to step indices
  const statusMap: Record<string, number> = {
    draft: 0,
    published: 1,
    ended: 2,
    closed: 3,
  };

  let currentIndex = statusMap[status] ?? 0;

  // If closed, check payout status for progression
  if (status === "closed" && payoutStatus) {
    if (payoutStatus === "paid") currentIndex = 4;
    if (payoutStatus === "confirmed") currentIndex = 5;
  }

  return currentIndex;
}

export function EventStatusStepper({
  status,
  payoutStatus = "none",
  closedAt,
  className,
  size = "md",
  showLabels = true,
}: EventStatusStepperProps) {
  const currentStepIndex = getStepIndex(status, payoutStatus);

  const sizeClasses = {
    sm: {
      container: "gap-1",
      step: "h-6 w-6",
      icon: "h-3 w-3",
      connector: "h-0.5",
      label: "text-[9px]",
    },
    md: {
      container: "gap-2",
      step: "h-10 w-10",
      icon: "h-4 w-4",
      connector: "h-0.5",
      label: "text-[10px]",
    },
    lg: {
      container: "gap-3",
      step: "h-12 w-12",
      icon: "h-5 w-5",
      connector: "h-1",
      label: "text-xs",
    },
  };

  const sizes = sizeClasses[size];

  return (
    <div className={cn("flex items-center", sizes.container, className)}>
      {EVENT_STEPS.map((step, index) => {
        const StepIcon = step.icon;
        const isCompleted = index < currentStepIndex;
        const isCurrent = index === currentStepIndex;
        const isPending = index > currentStepIndex;

        return (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center">
              {/* Step Circle */}
              <div
                className={cn(
                  "rounded-full flex items-center justify-center transition-all border-2",
                  sizes.step,
                  isCompleted && "bg-accent-success border-accent-success text-white",
                  isCurrent && "bg-accent-primary border-accent-primary text-white animate-pulse",
                  isPending && "bg-active border-border-subtle text-muted"
                )}
              >
                {isCompleted ? (
                  <CheckCircle2 className={sizes.icon} />
                ) : (
                  <StepIcon className={sizes.icon} />
                )}
              </div>
              
              {/* Label */}
              {showLabels && (
                <span
                  className={cn(
                    "mt-1.5 font-mono font-bold uppercase tracking-widest whitespace-nowrap",
                    sizes.label,
                    isCompleted && "text-accent-success",
                    isCurrent && "text-accent-primary",
                    isPending && "text-muted"
                  )}
                >
                  {size === "sm" ? step.shortLabel : step.label}
                </span>
              )}
            </div>

            {/* Connector Line */}
            {index < EVENT_STEPS.length - 1 && (
              <div
                className={cn(
                  "flex-shrink-0 transition-colors mx-1",
                  sizes.connector,
                  size === "sm" ? "w-4" : size === "md" ? "w-6" : "w-10",
                  index < currentStepIndex
                    ? "bg-accent-success"
                    : "bg-border-subtle"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Compact inline badge version for tables/lists
 */
interface EventStatusBadgeProps {
  status: EventStatus;
  payoutStatus?: PayoutStatus;
  className?: string;
}

export function EventStatusBadge({
  status,
  payoutStatus = "none",
  className,
}: EventStatusBadgeProps) {
  const getConfig = () => {
    if (status === "closed") {
      if (payoutStatus === "confirmed") {
        return {
          label: "Complete",
          bg: "bg-accent-success/20",
          text: "text-accent-success",
          border: "border-accent-success/30",
        };
      }
      if (payoutStatus === "paid") {
        return {
          label: "Paid Out",
          bg: "bg-accent-primary/20",
          text: "text-accent-primary",
          border: "border-accent-primary/30",
        };
      }
      return {
        label: "Closed",
        bg: "bg-warning/20",
        text: "text-warning",
        border: "border-warning/30",
      };
    }

    switch (status) {
      case "draft":
        return {
          label: "Draft",
          bg: "bg-muted/20",
          text: "text-muted",
          border: "border-muted/30",
        };
      case "published":
        return {
          label: "Live",
          bg: "bg-accent-primary/20",
          text: "text-accent-primary",
          border: "border-accent-primary/30",
        };
      case "ended":
        return {
          label: "Ended",
          bg: "bg-secondary/20",
          text: "text-secondary",
          border: "border-secondary/30",
        };
      default:
        return {
          label: status,
          bg: "bg-muted/20",
          text: "text-muted",
          border: "border-muted/30",
        };
    }
  };

  const config = getConfig();

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest border",
        config.bg,
        config.text,
        config.border,
        className
      )}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full",
          status === "published" ? "animate-pulse bg-current" : "bg-current opacity-60"
        )}
      />
      {config.label}
    </span>
  );
}

/**
 * Mini version for event cards (just shows current state with color)
 */
interface EventStatusDotProps {
  status: EventStatus;
  payoutStatus?: PayoutStatus;
  className?: string;
}

export function EventStatusDot({
  status,
  payoutStatus = "none",
  className,
}: EventStatusDotProps) {
  const getColor = () => {
    if (status === "closed") {
      if (payoutStatus === "confirmed") return "bg-accent-success";
      if (payoutStatus === "paid") return "bg-accent-primary";
      return "bg-warning";
    }
    switch (status) {
      case "draft":
        return "bg-muted";
      case "published":
        return "bg-accent-primary animate-pulse";
      case "ended":
        return "bg-secondary";
      default:
        return "bg-muted";
    }
  };

  return (
    <span
      className={cn("w-2 h-2 rounded-full inline-block", getColor(), className)}
      title={status === "closed" && payoutStatus !== "none" ? `Closed (${payoutStatus})` : status}
    />
  );
}

