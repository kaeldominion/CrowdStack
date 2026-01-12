import { Metadata } from "next";
import { notFound } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { PromoterProfileClient } from "./PromoterProfileClient";

// Force dynamic to ensure fresh data when promoter profiles are updated
export const dynamic = 'force-dynamic';

interface Props {
  params: { slug: string };
}

async function getPromoter(slug: string) {
  // Opt out of ALL caching - Next.js Data Cache, Full Route Cache, etc.
  noStore();
  
  const supabase = createServiceRoleClient();

  // Get promoter by slug
  const { data: promoter, error } = await supabase
    .from("promoters")
    .select(`
      id,
      name,
      slug,
      bio,
      profile_image_url,
      instagram_handle,
      is_public
    `)
    .eq("slug", slug)
    .single();

  if (error || !promoter || !promoter.is_public) {
    return null;
  }

  return promoter;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const promoter = await getPromoter(params.slug);

  if (!promoter) {
    return {
      title: "Promoter Not Found | CrowdStack",
    };
  }

  const description = promoter.bio || `Check out events promoted by ${promoter.name} on CrowdStack`;

  return {
    title: `${promoter.name} | CrowdStack`,
    description,
    openGraph: {
      title: promoter.name,
      description,
      type: "profile",
      images: promoter.profile_image_url ? [promoter.profile_image_url] : [],
    },
    twitter: {
      card: "summary",
      title: promoter.name,
      description,
    },
  };
}

export default async function PromoterProfilePage({ params }: Props) {
  const promoter = await getPromoter(params.slug);

  if (!promoter) {
    notFound();
  }

  return <PromoterProfileClient slug={params.slug} promoterId={promoter.id} />;
}
