"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button, InlineSpinner } from "@crowdstack/ui";
import {
  CreditCard,
  Wallet,
  Building2,
  QrCode,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from "lucide-react";

/**
 * Demo Payment Page
 *
 * This page simulates the DOKU payment experience for testing purposes.
 * Enable demo mode by setting DOKU_DEMO_MODE=true in your .env.local
 *
 * It allows you to:
 * - See what the payment flow looks like
 * - Simulate successful payments (triggers webhook)
 * - Simulate failed/cancelled payments
 */
export default function DemoPaymentPage() {
  return (
    <Suspense fallback={<DemoPaymentLoading />}>
      <DemoPaymentContent />
    </Suspense>
  );
}

function DemoPaymentLoading() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <InlineSpinner className="h-8 w-8" />
    </div>
  );
}

function DemoPaymentContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const invoiceNumber = searchParams.get("invoice") || "DEMO-001";
  const amount = parseInt(searchParams.get("amount") || "100000", 10);

  // Convert absolute callback URL to relative (for demo mode on localhost)
  const rawCallback = searchParams.get("callback") || "/";
  const callback = rawCallback.replace(/^https?:\/\/[^\/]+/, "");

  const [processing, setProcessing] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const simulatePayment = async (status: "success" | "failed" | "cancelled") => {
    setProcessing(true);

    // Simulate payment processing delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    if (status === "success") {
      // Call internal API to simulate webhook
      try {
        await fetch("/api/demo/simulate-doku-webhook", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            invoice_number: invoiceNumber,
            status: "SUCCESS",
            payment_method: selectedMethod || "DEMO",
          }),
        });
      } catch (error) {
        console.error("Failed to simulate webhook:", error);
      }

      // Redirect to success callback
      if (callback) {
        router.push(callback);
      }
    } else if (status === "cancelled") {
      // Redirect to cancel URL (replace -complete with -cancelled)
      const cancelUrl = callback.replace("payment-complete", "payment-cancelled");
      router.push(cancelUrl);
    } else {
      // Show failure state
      setProcessing(false);
    }
  };

  const paymentMethods = [
    { id: "va_bca", name: "BCA Virtual Account", icon: Building2 },
    { id: "va_mandiri", name: "Mandiri Virtual Account", icon: Building2 },
    { id: "ovo", name: "OVO", icon: Wallet },
    { id: "gopay", name: "GoPay", icon: Wallet },
    { id: "qris", name: "QRIS", icon: QrCode },
    { id: "card", name: "Credit/Debit Card", icon: CreditCard },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Demo Banner */}
      <div className="bg-yellow-500 text-yellow-900 py-2 px-4 text-center text-sm font-medium">
        <AlertTriangle className="inline h-4 w-4 mr-1" />
        DEMO MODE - This is a simulated payment page for testing. No real payments will be processed.
      </div>

      <div className="max-w-lg mx-auto py-8 px-4">
        {/* Header - Simulated DOKU branding */}
        <div className="bg-white rounded-t-xl p-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-sm">
                D
              </div>
              <span className="font-semibold text-gray-800">DOKU Checkout</span>
              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">DEMO</span>
            </div>
            <span className="text-sm text-gray-500">#{invoiceNumber}</span>
          </div>
        </div>

        {/* Payment Amount */}
        <div className="bg-white p-6 border-b">
          <p className="text-sm text-gray-500 mb-1">Total Payment</p>
          <p className="text-3xl font-bold text-gray-900">{formatCurrency(amount)}</p>
        </div>

        {/* Payment Methods */}
        <div className="bg-white p-4">
          <p className="text-sm font-medium text-gray-700 mb-3">Select Payment Method</p>
          <div className="grid grid-cols-2 gap-2">
            {paymentMethods.map((method) => {
              const Icon = method.icon;
              const isSelected = selectedMethod === method.id;
              return (
                <button
                  key={method.id}
                  onClick={() => setSelectedMethod(method.id)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    isSelected
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 mb-1 ${
                      isSelected ? "text-blue-600" : "text-gray-400"
                    }`}
                  />
                  <p
                    className={`text-sm font-medium ${
                      isSelected ? "text-blue-900" : "text-gray-700"
                    }`}
                  >
                    {method.name}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-white rounded-b-xl p-4 space-y-3">
          <Button
            onClick={() => simulatePayment("success")}
            disabled={!selectedMethod || processing}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            {processing ? (
              <>
                <InlineSpinner className="h-4 w-4 mr-2" />
                Processing Payment...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Simulate Successful Payment
              </>
            )}
          </Button>

          <Button
            onClick={() => simulatePayment("cancelled")}
            disabled={processing}
            variant="secondary"
            className="w-full"
          >
            <XCircle className="h-4 w-4 mr-2" />
            Cancel Payment
          </Button>
        </div>

        {/* Info Box */}
        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800">
            <strong>Testing Tips:</strong>
          </p>
          <ul className="text-sm text-blue-700 mt-2 space-y-1 list-disc list-inside">
            <li>Click "Simulate Successful Payment" to test the happy path</li>
            <li>This will trigger a simulated webhook to update the booking</li>
            <li>The booking will be marked as paid and confirmed</li>
            <li>A confirmation email will be sent to the guest</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
