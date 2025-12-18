"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

export default function QRPassPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [qrCode, setQrCode] = useState("");

  useEffect(() => {
    if (token) {
      // TODO: Generate QR code from token using a QR library
      // For now, just display the token
      setQrCode(token);
    }
  }, [token]);

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6 lg:px-8">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-gray-900">Your Event Pass</h1>
        <div className="mt-8 rounded-lg border border-gray-200 bg-white p-8">
          {qrCode ? (
            <div>
              <div className="mx-auto h-64 w-64 bg-gray-100 flex items-center justify-center">
                <p className="text-xs text-gray-500">QR Code: {qrCode.substring(0, 20)}...</p>
              </div>
              <p className="mt-4 text-sm text-gray-600">
                Show this QR code at the event entrance
              </p>
            </div>
          ) : (
            <p className="text-gray-600">Loading QR code...</p>
          )}
        </div>
      </div>
    </div>
  );
}

