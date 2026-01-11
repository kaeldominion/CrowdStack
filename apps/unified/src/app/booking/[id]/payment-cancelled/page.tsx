"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@crowdstack/ui";
import { XCircle, ArrowRight, RefreshCw } from "lucide-react";

export default function PaymentCancelledPage() {
  const params = useParams();
  const bookingId = params.id as string;

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* Cancelled Icon */}
        <div className="mx-auto w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mb-6">
          <XCircle className="h-10 w-10 text-yellow-400" />
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">Payment Cancelled</h1>
        <p className="text-gray-400 mb-8">
          Your payment was cancelled. Don't worry - your booking request is still saved.
          You can try again anytime before the payment link expires.
        </p>

        <div className="space-y-3">
          <Link href={`/booking/${bookingId}`}>
            <Button className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>

          <Link href="/">
            <Button variant="secondary" className="w-full">
              Return Home
            </Button>
          </Link>
        </div>

        <p className="mt-8 text-xs text-gray-500">
          Need help? Contact the venue directly or reply to your booking confirmation email.
        </p>
      </div>
    </div>
  );
}
