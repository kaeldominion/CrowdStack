"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@crowdstack/ui";
import { CheckCircle, ArrowRight, Calendar, PartyPopper } from "lucide-react";

export default function PaymentCompletePage() {
  const params = useParams();
  const bookingId = params.id as string;

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* Success Animation */}
        <div className="relative mx-auto w-24 h-24 mb-6">
          <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping" />
          <div className="relative w-full h-full bg-green-500/20 rounded-full flex items-center justify-center">
            <CheckCircle className="h-12 w-12 text-green-400" />
          </div>
        </div>

        <div className="mb-2">
          <PartyPopper className="inline h-6 w-6 text-yellow-400 mr-2" />
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">Payment Successful!</h1>
        <p className="text-gray-400 mb-8">
          Your deposit has been received and your table booking is now confirmed.
          A confirmation email has been sent to your inbox.
        </p>

        <div className="flex flex-col gap-3">
          <Link href={`/booking/${bookingId}`} className="block">
            <Button className="w-full">
              <Calendar className="h-4 w-4 mr-2" />
              View Booking Details
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>

          <Link href="/" className="block">
            <Button variant="secondary" className="w-full">
              Return Home
            </Button>
          </Link>
        </div>

        <p className="mt-8 text-xs text-gray-500">
          Booking reference: {bookingId.split("-")[0].toUpperCase()}
        </p>
      </div>
    </div>
  );
}
