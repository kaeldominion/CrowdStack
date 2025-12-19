import Link from "next/link";

export default function CheckinPage({
  params,
}: {
  params: { eventId: string };
}) {
  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6 lg:px-8">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-gray-900">Quick Check-in</h1>
        <p className="mt-4 text-gray-600">
          This is a fallback quick-add link for event {params.eventId}
        </p>
        <p className="mt-2 text-sm text-gray-500">
          Door staff can use this to manually add attendees
        </p>
      </div>
    </div>
  );
}

