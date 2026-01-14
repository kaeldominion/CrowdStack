import { Building2 } from "lucide-react";

interface WidgetHeaderProps {
  name: string;
  logoUrl: string | null;
  type: "venue" | "organizer";
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
          <a href="https://crowdstack.app" target="_blank" rel="noopener noreferrer">
            CrowdStack
          </a>
        </p>
      </div>
    </div>
  );
}
