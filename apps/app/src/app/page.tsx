import Link from "next/link";
import { HealthCheck } from "@crowdstack/ui";

export default function DashboardHomePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
          CrowdStack Dashboard
        </h1>
        <p className="mt-6 text-lg leading-8 text-gray-600">
          Manage your events, venues, and attendees
        </p>
        <p className="mt-2 text-sm text-gray-500">
          Deployed via Vercel with preview deployments • Updated {new Date().toLocaleDateString()}
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Link
            href="/dashboard"
            className="rounded-md bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/scanner"
            className="text-sm font-semibold leading-6 text-gray-900"
          >
            Door Scanner <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>

      <div className="mt-16">
        <HealthCheck />
      </div>
    </div>
  );
}

