/**
 * Crisp Chat SDK utilities
 * 
 * These functions allow you to interact with Crisp from anywhere in the app.
 * The Crisp SDK ($crisp) is loaded by the CrispChat component.
 * 
 * @see https://docs.crisp.chat/guides/chatbox-sdks/web-sdk/dollar-crisp/
 */

declare global {
  interface Window {
    $crisp: unknown[];
    CRISP_WEBSITE_ID: string;
  }
}

/**
 * Check if Crisp is ready
 */
export function isCrispReady(): boolean {
  return typeof window !== "undefined" && 
         window.$crisp && 
         typeof window.$crisp.push === "function";
}

/**
 * Open the Crisp chatbox
 */
export function openChat(): void {
  if (isCrispReady()) {
    window.$crisp.push(["do", "chat:open"]);
  }
}

/**
 * Close the Crisp chatbox
 */
export function closeChat(): void {
  if (isCrispReady()) {
    window.$crisp.push(["do", "chat:close"]);
  }
}

/**
 * Toggle the Crisp chatbox
 */
export function toggleChat(): void {
  if (isCrispReady()) {
    window.$crisp.push(["do", "chat:toggle"]);
  }
}

/**
 * Send a session event to Crisp
 * These appear in the conversation sidebar for support context
 * 
 * @param text - Event description
 * @param data - Optional data object
 * @param color - Optional color (red, orange, yellow, green, blue, purple, pink, brown, grey, black)
 * 
 * @example
 * trackEvent("Registered for event", { eventName: "Summer Party", eventId: "123" }, "green");
 */
export function trackEvent(
  text: string,
  data?: Record<string, string | number | boolean>,
  color?: "red" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "brown" | "grey" | "black"
): void {
  if (isCrispReady()) {
    window.$crisp.push(["set", "session:event", [[[text, data, color]]]]);
  }
}

/**
 * Set a pre-filled message in the chatbox
 * Useful for contextual help buttons
 * 
 * @example
 * setMessage("I need help with my registration for [Event Name]");
 */
export function setMessage(message: string): void {
  if (isCrispReady()) {
    window.$crisp.push(["set", "message:text", [message]]);
  }
}

/**
 * Open chat with a pre-filled message
 * Combines setMessage and openChat for a better UX
 * 
 * @example
 * openChatWithMessage("I have a question about the Summer Party event");
 */
export function openChatWithMessage(message: string): void {
  if (isCrispReady()) {
    setMessage(message);
    openChat();
  }
}

/**
 * Update session data
 * Adds or updates key-value pairs in the Crisp session
 * 
 * @example
 * updateSessionData([
 *   ["current_page", "event-details"],
 *   ["event_id", "abc123"],
 * ]);
 */
export function updateSessionData(data: [string, string | number][]): void {
  if (isCrispReady()) {
    window.$crisp.push(["set", "session:data", [data]]);
  }
}

/**
 * Add segments to the session
 * Useful for routing conversations to the right support team
 * 
 * @example
 * addSegments(["needs-refund", "high-priority"]);
 */
export function addSegments(segments: string[]): void {
  if (isCrispReady()) {
    window.$crisp.push(["set", "session:segments", [segments]]);
  }
}

// ============================================
// Pre-built tracking functions for CrowdStack
// ============================================

/**
 * Track when a user views an event page
 */
export function trackEventView(eventName: string, eventId: string): void {
  trackEvent("Viewed event", { event: eventName, event_id: eventId }, "blue");
  updateSessionData([
    ["last_viewed_event", eventName],
    ["last_viewed_event_id", eventId],
  ]);
}

/**
 * Track when a user registers for an event
 */
export function trackEventRegistration(eventName: string, eventId: string): void {
  trackEvent("Registered for event", { event: eventName, event_id: eventId }, "green");
}

/**
 * Track when a user checks in to an event
 */
export function trackEventCheckin(eventName: string, eventId: string): void {
  trackEvent("Checked in to event", { event: eventName, event_id: eventId }, "green");
}

/**
 * Track page navigation
 */
export function trackPageView(pageName: string, path: string): void {
  updateSessionData([
    ["current_page", pageName],
    ["current_path", path],
  ]);
}

/**
 * Track when a user encounters an error
 * Helps support understand what went wrong
 */
export function trackError(errorType: string, details?: string): void {
  trackEvent("Encountered error", { 
    type: errorType, 
    details: details || "No details" 
  }, "red");
}

