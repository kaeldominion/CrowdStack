import crypto from "crypto";

/**
 * DOKU Payment Gateway Service
 * Handles API communication with DOKU for Indonesian payment processing
 *
 * Documentation: https://dashboard.doku.com/docs/docs/jokul-checkout/
 */

// =============================================================================
// TYPES
// =============================================================================

export interface DokuCredentials {
  clientId: string;
  secretKey: string;
  environment: "sandbox" | "production";
}

export interface DokuOrderDetails {
  amount: number; // In IDR, no decimals
  invoiceNumber: string; // Max 64 chars (30 for credit card)
  callbackUrl?: string; // Return URL after payment
  callbackUrlCancel?: string; // Return URL if cancelled
  lineItems?: DokuLineItem[];
}

export interface DokuLineItem {
  name: string;
  price: number;
  quantity: number;
}

export interface DokuCustomer {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  country?: string;
}

export interface DokuPaymentConfig {
  paymentDueDate: number; // Minutes until expiry (e.g., 1440 = 24 hours)
}

export interface DokuCheckoutRequest {
  order: DokuOrderDetails;
  customer: DokuCustomer;
  payment: DokuPaymentConfig;
}

export interface DokuCheckoutResponse {
  message: string[];
  response: {
    order: {
      invoice_number: string;
      amount: number;
    };
    payment: {
      url: string;
      token_id: string;
      expired_date: string; // ISO timestamp in UTC+7
    };
  };
}

export interface DokuWebhookPayload {
  order: {
    invoice_number: string;
    amount: number;
  };
  transaction: {
    status: "SUCCESS" | "PENDING" | "FAILED";
    date: string;
    original_request_id: string;
  };
  channel?: {
    id: string; // Payment method used
  };
  virtual_account_info?: {
    virtual_account_number: string;
  };
  qris_info?: {
    qr_content: string;
  };
}

export interface DokuApiError {
  error: {
    message: string;
    code?: string;
  };
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DOKU_ENDPOINTS = {
  sandbox: "https://api-sandbox.doku.com",
  production: "https://api.doku.com",
} as const;

const CHECKOUT_PATH = "/checkout/v1/payment";

// Demo mode - set to true to simulate DOKU responses without real API calls
// Useful for testing before having DOKU credentials
const DEMO_MODE = process.env.DOKU_DEMO_MODE === "true";

// =============================================================================
// SIGNATURE GENERATION
// =============================================================================

/**
 * Generate SHA-256 digest of request body
 */
function generateDigest(body: string): string {
  const hash = crypto.createHash("sha256").update(body).digest("base64");
  return hash;
}

/**
 * Generate HMAC-SHA256 signature for DOKU API authentication
 *
 * Signature Components (joined by newline):
 * - Client-Id: {clientId}
 * - Request-Id: {requestId}
 * - Request-Timestamp: {timestamp}
 * - Request-Target: {path}
 * - Digest: {digest}
 */
export function generateDokuSignature(params: {
  clientId: string;
  secretKey: string;
  requestId: string;
  timestamp: string;
  requestTarget: string;
  digest: string;
}): string {
  const { clientId, secretKey, requestId, timestamp, requestTarget, digest } = params;

  const signatureComponents = [
    `Client-Id:${clientId}`,
    `Request-Id:${requestId}`,
    `Request-Timestamp:${timestamp}`,
    `Request-Target:${requestTarget}`,
    `Digest:${digest}`,
  ].join("\n");

  const signature = crypto
    .createHmac("sha256", secretKey)
    .update(signatureComponents)
    .digest("base64");

  return `HMACSHA256=${signature}`;
}

/**
 * Generate ISO8601 timestamp in UTC
 */
function generateTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return crypto.randomUUID();
}

// =============================================================================
// API CLIENT
// =============================================================================

export class DokuService {
  private credentials: DokuCredentials;
  private baseUrl: string;

  constructor(credentials: DokuCredentials) {
    this.credentials = credentials;
    this.baseUrl = DOKU_ENDPOINTS[credentials.environment];
  }

  /**
   * Make authenticated request to DOKU API
   */
  private async makeRequest<T>(
    path: string,
    method: "GET" | "POST",
    body?: object
  ): Promise<{ success: true; data: T } | { success: false; error: string; details?: unknown }> {
    const requestId = generateRequestId();
    const timestamp = generateTimestamp();
    const bodyString = body ? JSON.stringify(body) : "";
    const digest = generateDigest(bodyString);

    const signature = generateDokuSignature({
      clientId: this.credentials.clientId,
      secretKey: this.credentials.secretKey,
      requestId,
      timestamp,
      requestTarget: path,
      digest,
    });

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Client-Id": this.credentials.clientId,
      "Request-Id": requestId,
      "Request-Timestamp": timestamp,
      Signature: signature,
    };

    try {
      console.log(`[DOKU] Request to ${this.baseUrl}${path}`);
      console.log(`[DOKU] Client-Id being sent:`, JSON.stringify(this.credentials.clientId));
      console.log(`[DOKU] Client-Id length:`, this.credentials.clientId.length);
      console.log(`[DOKU] Client-Id char codes:`, [...this.credentials.clientId].map(c => c.charCodeAt(0)).join(','));
      console.log(`[DOKU] Body:`, bodyString);

      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers,
        body: method === "POST" ? bodyString : undefined,
      });

      const responseText = await response.text();
      console.log(`[DOKU] Response status:`, response.status);
      console.log(`[DOKU] Response:`, responseText);

      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = { raw: responseText };
      }

      if (!response.ok) {
        const errorMessage = responseData?.error?.message
          || responseData?.message?.[0]
          || responseData?.message
          || `DOKU API error: ${response.status}`;
        return {
          success: false,
          error: errorMessage,
          details: responseData,
        };
      }

      return { success: true, data: responseData as T };
    } catch (error) {
      console.error("DOKU API request failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to connect to DOKU",
      };
    }
  }

  /**
   * Create a checkout session for payment
   *
   * Returns a payment URL that the customer should be redirected to
   */
  async createCheckout(request: DokuCheckoutRequest): Promise<
    | { success: true; paymentUrl: string; tokenId: string; expiresAt: string; invoiceNumber: string }
    | { success: false; error: string; details?: unknown }
  > {
    // Demo mode - return simulated response
    if (DEMO_MODE) {
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + request.payment.paymentDueDate);

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      // In demo mode, redirect to a demo payment page that simulates payment
      const demoPaymentUrl = `${baseUrl}/demo/payment?invoice=${request.order.invoiceNumber}&amount=${request.order.amount}&callback=${encodeURIComponent(request.order.callbackUrl || "")}`;

      return {
        success: true,
        paymentUrl: demoPaymentUrl,
        tokenId: `demo-token-${Date.now()}`,
        expiresAt: expiresAt.toISOString(),
        invoiceNumber: request.order.invoiceNumber,
      };
    }

    // Format request body for DOKU API
    const dokuBody = {
      order: {
        amount: request.order.amount,
        invoice_number: request.order.invoiceNumber,
        ...(request.order.callbackUrl && { callback_url: request.order.callbackUrl }),
        ...(request.order.callbackUrlCancel && { callback_url_cancel: request.order.callbackUrlCancel }),
        ...(request.order.lineItems && {
          line_items: request.order.lineItems.map((item) => ({
            name: item.name,
            price: item.price,
            quantity: item.quantity,
          })),
        }),
      },
      payment: {
        payment_due_date: request.payment.paymentDueDate,
      },
      customer: {
        name: request.customer.name,
        email: request.customer.email,
        ...(request.customer.phone && { phone: request.customer.phone }),
        ...(request.customer.address && { address: request.customer.address }),
        ...(request.customer.country && { country: request.customer.country }),
      },
    };

    const result = await this.makeRequest<DokuCheckoutResponse>(CHECKOUT_PATH, "POST", dokuBody);

    if (!result.success) {
      return result;
    }

    return {
      success: true,
      paymentUrl: result.data.response.payment.url,
      tokenId: result.data.response.payment.token_id,
      expiresAt: result.data.response.payment.expired_date,
      invoiceNumber: result.data.response.order.invoice_number,
    };
  }

  /**
   * Test connection to DOKU API
   *
   * Creates a minimal checkout request to verify credentials work
   */
  async testConnection(): Promise<{ success: true; message: string } | { success: false; error: string }> {
    // Demo mode - always succeed
    if (DEMO_MODE) {
      return {
        success: true,
        message: `DEMO MODE: Connected to simulated DOKU ${this.credentials.environment} environment. Real payments are disabled.`,
      };
    }

    // DOKU doesn't have a dedicated health endpoint, so we verify credentials
    // by checking if we can generate a valid signature structure.
    // In sandbox, we could optionally make a test checkout call.

    try {
      // Validate credential format
      const clientId = this.credentials.clientId;
      const secretKey = this.credentials.secretKey;

      if (!clientId || clientId.length < 5) {
        return { success: false, error: "Invalid Client ID format" };
      }

      if (!secretKey || secretKey.length < 10) {
        return { success: false, error: "Invalid Secret Key format" };
      }

      // Test signature generation works (validates secret key format)
      const testSignature = generateDokuSignature({
        clientId,
        secretKey,
        requestId: generateRequestId(),
        timestamp: generateTimestamp(),
        requestTarget: CHECKOUT_PATH,
        digest: generateDigest("{}"),
      });

      if (!testSignature.startsWith("HMACSHA256=")) {
        return { success: false, error: "Failed to generate valid signature" };
      }

      // For sandbox environment, optionally make a real API call
      // This creates a minimal test checkout that expires immediately
      if (this.credentials.environment === "sandbox") {
        const testResult = await this.createCheckout({
          order: {
            amount: 10000, // Minimum amount (IDR 10,000)
            invoiceNumber: `TEST-${Date.now()}`,
          },
          customer: {
            name: "Test Customer",
            email: "test@crowdstack.app",
          },
          payment: {
            paymentDueDate: 5, // 5 minutes - will expire quickly
          },
        });

        if (!testResult.success) {
          return {
            success: false,
            error: `DOKU API test failed: ${testResult.error}`,
          };
        }

        return {
          success: true,
          message: `Connected to DOKU ${this.credentials.environment} environment. Test checkout created successfully.`,
        };
      }

      // For production, also make a real API call to verify credentials
      // We use a minimal test checkout that expires quickly
      const testResult = await this.createCheckout({
        order: {
          amount: 10000, // Minimum amount (IDR 10,000)
          invoiceNumber: `TEST-${Date.now()}`,
        },
        customer: {
          name: "Test Customer",
          email: "test@crowdstack.app",
        },
        payment: {
          paymentDueDate: 5, // 5 minutes - will expire quickly
        },
      });

      if (!testResult.success) {
        return {
          success: false,
          error: `DOKU API test failed: ${testResult.error}`,
        };
      }

      return {
        success: true,
        message: `Connected to DOKU ${this.credentials.environment} environment. Test checkout created successfully.`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Connection test failed",
      };
    }
  }
}

// =============================================================================
// WEBHOOK VERIFICATION
// =============================================================================

/**
 * Verify webhook signature from DOKU
 *
 * DOKU sends a signature in the headers that we must verify
 * to ensure the webhook is authentic
 */
export function verifyDokuWebhookSignature(params: {
  signature: string;
  clientId: string;
  secretKey: string;
  requestId: string;
  timestamp: string;
  requestTarget: string;
  body: string;
}): boolean {
  const { signature, clientId, secretKey, requestId, timestamp, requestTarget, body } = params;

  const digest = generateDigest(body);
  const expectedSignature = generateDokuSignature({
    clientId,
    secretKey,
    requestId,
    timestamp,
    requestTarget,
    digest,
  });

  // Constant-time comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  } catch {
    return false;
  }
}

/**
 * Parse DOKU webhook notification
 */
export function parseDokuWebhook(body: string): DokuWebhookPayload | null {
  try {
    return JSON.parse(body) as DokuWebhookPayload;
  } catch {
    return null;
  }
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Format amount for DOKU (no decimals for IDR)
 */
export function formatDokuAmount(amount: number): number {
  return Math.round(amount);
}

/**
 * Generate invoice number for a booking
 */
export function generateBookingInvoiceNumber(bookingId: string): string {
  // Max 30 chars for credit card compatibility
  // Format: CS-{short-uuid}
  const shortId = bookingId.replace(/-/g, "").substring(0, 20);
  return `CS-${shortId}`;
}

/**
 * Calculate payment expiry date
 */
export function calculatePaymentExpiry(hoursFromNow: number): Date {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + hoursFromNow);
  return expiry;
}
