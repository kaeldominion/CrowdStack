import { Building2 } from "lucide-react";

interface WidgetHeaderProps {
  name: string;
  logoUrl: string | null;
  type: "venue" | "organizer";
}

// CrowdStack icon (3 chevrons - matches favicon)
function CrowdStackIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: 12, height: 12, marginRight: 3, verticalAlign: "middle" }}
    >
      <defs>
        <linearGradient id="widgetPurpleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#A855F7" />
          <stop offset="100%" stopColor="#C084FC" />
        </linearGradient>
        <linearGradient id="widgetBlueGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#60A5FA" />
        </linearGradient>
      </defs>
      {/* Top layer (adapts to theme) */}
      <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
      {/* Middle layer (purple) */}
      <path d="M2 12L12 17L22 12" stroke="url(#widgetPurpleGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Bottom layer (blue) */}
      <path d="M2 17L12 22L22 17" stroke="url(#widgetBlueGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export function WidgetHeader({ name, logoUrl, type }: WidgetHeaderProps) {
  return (
    <div className="widget-header">
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={name}
          className="widget-header-logo"
        />
      ) : (
        <div className="widget-header-logo" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Building2 style={{ width: 20, height: 20, opacity: 0.5 }} />
        </div>
      )}
      <div className="widget-header-info">
        <h2 className="widget-header-name">{name}</h2>
        <p className="widget-header-powered">
          Powered by{" "}
          <a href="https://crowdstack.app" target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center" }}>
            <CrowdStackIcon />
            CrowdStack.
          </a>
        </p>
      </div>
    </div>
  );
}
