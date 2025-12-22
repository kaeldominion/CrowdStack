import { NextRequest, NextResponse } from "next/server";
import { sendContactFormEmail } from "@crowdstack/shared/email/postmark";

interface ContactFormData {
  name: string;
  email: string;
  phone?: string;
  venueName?: string;
  interestType: "venue" | "organizer" | "other";
  message: string;
}

export async function POST(request: NextRequest) {
  try {
    const data: ContactFormData = await request.json();

    // Validate required fields
    if (!data.name || !data.email || !data.message || !data.interestType) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    // Validate interest type
    if (!["venue", "organizer", "other"].includes(data.interestType)) {
      return NextResponse.json(
        { error: "Invalid interest type" },
        { status: 400 }
      );
    }

    // Send the email
    await sendContactFormEmail({
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      phone: data.phone?.trim() || undefined,
      venueName: data.venueName?.trim() || undefined,
      interestType: data.interestType,
      message: data.message.trim(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Contact Form] Error:", error);
    return NextResponse.json(
      { error: "Failed to send message. Please try again." },
      { status: 500 }
    );
  }
}

