import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { cookies } from "next/headers";

// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: emailId } = await params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let userId = user?.id;

    // If no user from Supabase client, try reading from localhost cookie
    if (!userId) {
      const cookieStore = await cookies();
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
      const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase/)?.[1] || "supabase";
      const authCookieName = `sb-${projectRef}-auth-token`;
      const authCookie = cookieStore.get(authCookieName);

      if (authCookie) {
        try {
          const cookieValue = decodeURIComponent(authCookie.value);
          const parsed = JSON.parse(cookieValue);
          if (parsed.user?.id) {
            userId = parsed.user.id;
          }
        } catch (e) {
          // Cookie parse error
        }
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check role using service role to bypass RLS
    const serviceSupabase = createServiceRoleClient();
    const { data: userRoles } = await serviceSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    
    const roles = userRoles?.map((r) => r.role) || [];
    const isSuperadmin = roles.includes("superadmin");

    if (!isSuperadmin) {
      return NextResponse.json({ 
        error: "Forbidden - Superadmin role required",
        yourRoles: roles 
      }, { status: 403 });
    }

    // Get email log details
    const { data: emailLog, error } = await serviceSupabase
      .from("email_send_logs")
      .select(`
        *,
        email_templates (
          id,
          slug,
          subject,
          html_body,
          text_body,
          variables
        )
      `)
      .eq("id", emailId)
      .single();

    if (error || !emailLog) {
      return NextResponse.json(
        { error: "Email log not found" },
        { status: 404 }
      );
    }

    // If this is a template email, we need to render it with the variables from metadata
    let renderedHtml: string | null = null;
    let renderedText: string | null = null;
    
    if (emailLog.template_id && emailLog.email_templates) {
      const template = emailLog.email_templates as any;
      const variables = emailLog.metadata?.variables || {};
      
      // Simple variable substitution (basic implementation)
      // In production, you might want to use a proper templating engine
      renderedHtml = template.html_body || null;
      renderedText = template.text_body || null;
      
      // Replace variables in HTML
      if (renderedHtml) {
        Object.entries(variables).forEach(([key, value]) => {
          const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
          renderedHtml = renderedHtml!.replace(regex, String(value || ''));
        });
      }
      
      // Replace variables in text
      if (renderedText) {
        Object.entries(variables).forEach(([key, value]) => {
          const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
          renderedText = renderedText!.replace(regex, String(value || ''));
        });
      }
    }

    return NextResponse.json({
      email: emailLog,
      rendered: {
        html: renderedHtml,
        text: renderedText,
      },
    });
  } catch (error: any) {
    console.error("[Admin Email Detail API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch email details" },
      { status: 500 }
    );
  }
}
