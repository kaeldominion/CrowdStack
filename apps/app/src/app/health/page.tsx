import { HealthCheck } from "@crowdstack/ui";

export default function HealthPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="mb-8 text-3xl font-bold text-gray-900">System Health</h1>
      <HealthCheck />
    </div>
  );
}

