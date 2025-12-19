import Link from "next/link";

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          Pricing
        </h1>
        <p className="mt-4 text-lg text-gray-600">
          Simple, transparent pricing for event management
        </p>
      </div>

      <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
        <div className="rounded-lg border border-gray-200 p-8">
          <h3 className="text-xl font-semibold text-gray-900">Starter</h3>
          <p className="mt-4 text-3xl font-bold text-gray-900">$99<span className="text-lg text-gray-600">/month</span></p>
          <ul className="mt-6 space-y-3 text-sm text-gray-600">
            <li>Up to 10 events/month</li>
            <li>Basic analytics</li>
            <li>Email support</li>
          </ul>
          <Link
            href="/contact"
            className="mt-8 block w-full rounded-md bg-blue-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-blue-500"
          >
            Contact Sales
          </Link>
        </div>

        <div className="rounded-lg border-2 border-blue-600 bg-blue-50 p-8">
          <h3 className="text-xl font-semibold text-gray-900">Professional</h3>
          <p className="mt-4 text-3xl font-bold text-gray-900">$299<span className="text-lg text-gray-600">/month</span></p>
          <ul className="mt-6 space-y-3 text-sm text-gray-600">
            <li>Unlimited events</li>
            <li>Advanced analytics</li>
            <li>Priority support</li>
            <li>Custom integrations</li>
          </ul>
          <Link
            href="/contact"
            className="mt-8 block w-full rounded-md bg-blue-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-blue-500"
          >
            Contact Sales
          </Link>
        </div>

        <div className="rounded-lg border border-gray-200 p-8">
          <h3 className="text-xl font-semibold text-gray-900">Enterprise</h3>
          <p className="mt-4 text-3xl font-bold text-gray-900">Custom</p>
          <ul className="mt-6 space-y-3 text-sm text-gray-600">
            <li>Everything in Professional</li>
            <li>Dedicated account manager</li>
            <li>Custom features</li>
            <li>SLA guarantee</li>
          </ul>
          <Link
            href="/contact"
            className="mt-8 block w-full rounded-md bg-blue-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-blue-500"
          >
            Contact Sales
          </Link>
        </div>
      </div>
    </div>
  );
}

