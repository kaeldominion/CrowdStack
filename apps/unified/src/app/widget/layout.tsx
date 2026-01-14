import "./widget.css";

export const metadata = {
  title: "CrowdStack Events Widget",
  description: "Upcoming events powered by CrowdStack",
  robots: "noindex, nofollow", // Widgets shouldn't be indexed
};

export default function WidgetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="widget-container">
      {children}
    </div>
  );
}
