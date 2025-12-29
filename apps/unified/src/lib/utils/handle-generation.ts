import "server-only";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";

/**
 * Generate a URL-friendly handle from a name
 * Converts to lowercase, replaces spaces with hyphens, removes special chars
 */
export function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single
    .replace(/^-|-$/g, ""); // Remove leading/trailing hyphens
}

/**
 * Generate a unique handle from a name for DJ profiles
 * Checks database for uniqueness and appends random suffix if needed
 */
export async function generateUniqueDJHandle(name: string): Promise<string> {
  const baseHandle = `dj-${slugifyName(name)}`;
  
  // Check if base handle is available
  const supabase = createServiceRoleClient();
  const { data: existing } = await supabase
    .from("djs")
    .select("handle")
    .eq("handle", baseHandle)
    .single();

  if (!existing) {
    return baseHandle;
  }

  // If exists, append random suffix
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const handleWithSuffix = `${baseHandle}-${randomSuffix}`;

  // Check if suffix version exists (unlikely but possible)
  const { data: existingSuffix } = await supabase
    .from("djs")
    .select("handle")
    .eq("handle", handleWithSuffix)
    .single();

  if (!existingSuffix) {
    return handleWithSuffix;
  }

  // If still exists (very unlikely), try again with longer suffix
  const longerSuffix = Math.random().toString(36).substring(2, 10);
  return `${baseHandle}-${longerSuffix}`;
}



